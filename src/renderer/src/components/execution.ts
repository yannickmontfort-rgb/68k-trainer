import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'
import { Cpu } from '../../../cpu/cpu'
import type { Platform } from '../../../cpu/platform'
import type { StepEffects } from '../../../cpu/types'
import type { AssembleError, AssembleResult } from '../../../shared/ipc'
import { MACHINES, type Machine } from '../../../shared/machines'
import type { Debogueur } from './debogueur'
import { SortieSon } from './son'

export type FinTempsReel = 'fin' | 'erreur' | 'arret' | 'point'

/**
 * Lie un éditeur Monaco, un processeur et un débogueur : assemblage, pas à pas avec surlignage de
 * la ligne courante, exécution complète.
 */
export class Execution {
  cpu: Cpu | null = null
  assemblage: AssembleResult | null = null
  private decorations: string[] = []
  private tempsReelActif = false
  /** Lignes portant un point d'arrêt (clic dans la marge de l'éditeur). */
  private readonly pointsArret = new Set<number>()
  private readonly decorationsArret: monaco.editor.IEditorDecorationsCollection
  /** Vrai si la dernière exécution s'est arrêtée sur un point d'arrêt. */
  arreteSurPoint = false
  private readonly son = new SortieSon()

  constructor(
    private readonly editor: monaco.editor.IStandaloneCodeEditor,
    private readonly debogueur: Debogueur,
    private readonly creerPlateforme: () => Platform | undefined,
    /** Adresse affichée dans la vue mémoire (sinon : début du programme). */
    private readonly adresseMemoire?: number,
    /** Machine simulée : horloge, durée d'une image, ROM du système. */
    private readonly machine: Machine = 'atari'
  ) {
    editor.updateOptions({ glyphMargin: true })
    this.decorationsArret = editor.createDecorationsCollection()
    editor.onMouseDown((e) => {
      if (e.target.type !== monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) return
      const ligne = e.target.position?.lineNumber
      if (!ligne) return
      if (this.pointsArret.has(ligne)) this.pointsArret.delete(ligne)
      else this.pointsArret.add(ligne)
      this.decorationsArret.set(
        [...this.pointsArret].map((l) => ({
          range: new monaco.Range(l, 1, l, 1),
          options: { glyphMarginClassName: 'point-arret', glyphMarginHoverMessage: { value: "Point d'arrêt : l'exécution s'arrêtera avant cette ligne" } }
        }))
      )
    })
  }

  /** Adresses des instructions qui portent un point d'arrêt. */
  private adressesArret(): Set<number> {
    const r = new Set<number>()
    if (!this.pointsArret.size) return r
    for (const [adresse, ligne] of Object.entries(this.assemblage?.addressToLine ?? {})) {
      if (this.pointsArret.has(ligne)) r.add(Number(adresse))
    }
    return r
  }

  /** Assemble le source ; renvoie le résultat (erreurs reformulées comprises). */
  async assembler(source: string): Promise<AssembleResult> {
    const result = await window.api.assemble(source)
    this.assemblage = result
    const model = this.editor.getModel()
    if (model) {
      // Erreurs en rouge, avertissements en jaune, soulignés précisément quand la colonne est connue
      const marque = (e: AssembleError, severity: monaco.MarkerSeverity): monaco.editor.IMarkerData => ({
        severity,
        message: e.message,
        startLineNumber: Math.max(1, e.line),
        endLineNumber: Math.max(1, e.line),
        startColumn: e.column ?? 1,
        endColumn: e.column ? e.column + (e.length ?? 1) : 1000
      })
      monaco.editor.setModelMarkers(model, 'assembleur', [
        ...result.errors.map((e) => marque(e, monaco.MarkerSeverity.Error)),
        ...(result.warnings ?? []).map((e) => marque(e, monaco.MarkerSeverity.Warning))
      ])
    }
    if (result.success) this.reinitialiser()
    else {
      this.cpu = null
      this.surligner(undefined)
    }
    return result
  }

  reinitialiser(): void {
    this.tempsReelActif = false
    const asm = this.assemblage
    if (!asm?.success) return
    const cpu = new Cpu(this.creerPlateforme())
    cpu.reset(asm.baseAddress ?? 0)
    cpu.loadProgram(asm.baseAddress ?? 0, asm.binary!)
    this.cpu = cpu
    this.debogueur.setAdresseMemoire(this.adresseMemoire ?? asm.baseAddress ?? 0)
    this.debogueur.attacher(cpu)
    this.surligner(this.ligneCourante())
  }

  ligneCourante(): number | undefined {
    if (!this.cpu) return undefined
    return this.assemblage?.addressToLine?.[this.cpu.pc]
  }

  pas(): StepEffects | null {
    const cpu = this.cpu
    if (!cpu || cpu.halted) return null
    let effects = cpu.step()
    const writes = [...effects.writes]
    // Interruption prise, retour vers le système ou appel qui attend (Vsync) : on va d'un coup
    // jusqu'à la prochaine instruction du programme
    const enRom = MACHINES[this.machine].enRom
    for (let i = 0; i < 200000 && (enRom(cpu.pc) || cpu.waiting) && !cpu.halted && !effects.error; i++) {
      effects = cpu.step()
      writes.push(...effects.writes)
    }
    effects = { ...effects, writes }
    this.debogueur.rafraichir(effects.writes)
    this.surligner(this.ligneCourante())
    return effects
  }

  /** Exécute jusqu'à l'arrêt (ou `maxSteps`) ; renvoie les effets du dernier pas. */
  toutExecuter(maxSteps = 200000): StepEffects | null {
    const cpu = this.cpu
    if (!cpu) return null
    const points = this.adressesArret()
    this.arreteSurPoint = false
    let last: StepEffects | null = null
    for (let i = 0; i < maxSteps && !cpu.halted; i++) {
      last = cpu.step()
      if (last.error) break
      if (points.has(cpu.pc) && !cpu.waiting) {
        this.arreteSurPoint = true
        break
      }
    }
    this.debogueur.rafraichir(last?.writes ?? [])
    this.surligner(this.ligneCourante())
    return last
  }

  get enTempsReel(): boolean {
    return this.tempsReelActif
  }

  /**
   * Exécute à la vitesse de la vraie machine (8 MHz pour le ST, 7,09 MHz pour l'Amiga, 50 images par seconde) : l'écran et les registres
   * sont redessinés à chaque image, jusqu'à la fin du programme, une exception ou `arreter()`.
   */
  tempsReel(fin: (raison: FinTempsReel, effects: StepEffects | null) => void): void {
    const cpu = this.cpu
    if (!cpu || cpu.halted || this.tempsReelActif) return
    this.tempsReelActif = true
    this.surligner(undefined)
    this.son.demarrer(cpu)
    let precedent = performance.now()
    // Cible cumulée : un Vsync qui fait sauter le temps jusqu'à la VBL est « rendu » ensuite
    let cible = cpu.cycles
    let last: StepEffects | null = null
    const points = this.adressesArret()
    this.arreteSurPoint = false
    const image = (maintenant: number): void => {
      if (!this.tempsReelActif) {
        this.son.arreter()
        return fin('arret', last)
      }
      // Au plus 3 trames de retard (onglet en arrière-plan, machine lente)
      const ecoule = Math.max(0, Math.min(maintenant - precedent, 60))
      precedent = maintenant
      const m = MACHINES[this.machine]
      cible = Math.max(cible + (ecoule * m.cpuHz) / 1000, cpu.cycles - 3 * m.cyclesParImage)
      while (cpu.cycles < cible && !cpu.halted) {
        last = cpu.step()
        if (last.error) break
        if (points.has(cpu.pc) && !cpu.waiting) {
          this.arreteSurPoint = true
          break
        }
      }
      this.son.alimenter(cpu)
      this.debogueur.rafraichir([])
      if (this.arreteSurPoint) {
        this.tempsReelActif = false
        this.son.arreter()
        this.surligner(this.ligneCourante())
        return fin('point', last)
      }
      if (last?.error || cpu.halted) {
        this.tempsReelActif = false
        // Laisser finir le son déjà prévu (quelques dizaines de ms)
        this.surligner(this.ligneCourante())
        return fin(last?.error ? 'erreur' : 'fin', last)
      }
      requestAnimationFrame(image)
    }
    requestAnimationFrame(image)
  }

  /** Interrompt le temps réel (le programme reste où il en est : on peut continuer pas à pas). */
  arreter(): void {
    if (!this.tempsReelActif) return
    this.tempsReelActif = false
    this.surligner(this.ligneCourante())
  }

  surligner(line: number | undefined): void {
    this.decorations = this.editor.deltaDecorations(
      this.decorations,
      line === undefined
        ? []
        : [{ range: new monaco.Range(line, 1, line, 1), options: { isWholeLine: true, className: 'current-line-highlight' } }]
    )
    if (line !== undefined) this.editor.revealLineInCenterIfOutsideViewport(line)
  }
}
