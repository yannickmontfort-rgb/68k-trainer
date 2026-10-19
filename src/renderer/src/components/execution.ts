import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'
import { Cpu } from '../../../cpu/cpu'
import type { Platform } from '../../../cpu/platform'
import type { StepEffects } from '../../../cpu/types'
import type { AssembleError, AssembleResult } from '../../../shared/ipc'
import { CPU_HZ, ROM_END, ROM_START } from '../../../platforms/atari-st/machine'
import type { Debogueur } from './debogueur'

/** Code système en ROM (routine VBL, retour de Supexec...) : le pas à pas le traverse d'un coup. */
const enRom = (pc: number): boolean => pc >= ROM_START && pc < ROM_END

export type FinTempsReel = 'fin' | 'erreur' | 'arret'

/**
 * Lie un éditeur Monaco, un processeur et un débogueur : assemblage, pas à pas avec surlignage de
 * la ligne courante, exécution complète.
 */
export class Execution {
  cpu: Cpu | null = null
  assemblage: AssembleResult | null = null
  private decorations: string[] = []
  private tempsReelActif = false

  constructor(
    private readonly editor: monaco.editor.IStandaloneCodeEditor,
    private readonly debogueur: Debogueur,
    private readonly creerPlateforme: () => Platform | undefined,
    /** Adresse affichée dans la vue mémoire (sinon : début du programme). */
    private readonly adresseMemoire?: number
  ) {}

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
    let last: StepEffects | null = null
    for (let i = 0; i < maxSteps && !cpu.halted; i++) {
      last = cpu.step()
      if (last.error) break
    }
    this.debogueur.rafraichir(last?.writes ?? [])
    this.surligner(this.ligneCourante())
    return last
  }

  get enTempsReel(): boolean {
    return this.tempsReelActif
  }

  /**
   * Exécute à la vitesse d'un vrai ST (8 MHz, 50 trames par seconde) : l'écran et les registres
   * sont redessinés à chaque image, jusqu'à la fin du programme, une exception ou `arreter()`.
   */
  tempsReel(fin: (raison: FinTempsReel, effects: StepEffects | null) => void): void {
    const cpu = this.cpu
    if (!cpu || cpu.halted || this.tempsReelActif) return
    this.tempsReelActif = true
    this.surligner(undefined)
    let precedent = performance.now()
    // Cible cumulée : un Vsync qui fait sauter le temps jusqu'à la VBL est « rendu » ensuite
    let cible = cpu.cycles
    let last: StepEffects | null = null
    const image = (maintenant: number): void => {
      if (!this.tempsReelActif) return fin('arret', last)
      // Au plus 3 trames de retard (onglet en arrière-plan, machine lente)
      const ecoule = Math.max(0, Math.min(maintenant - precedent, 60))
      precedent = maintenant
      cible = Math.max(cible + (ecoule * CPU_HZ) / 1000, cpu.cycles - 3 * 160256)
      while (cpu.cycles < cible && !cpu.halted) {
        last = cpu.step()
        if (last.error) break
      }
      this.debogueur.rafraichir([])
      if (last?.error || cpu.halted) {
        this.tempsReelActif = false
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
