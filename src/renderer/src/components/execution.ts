import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'
import { Cpu } from '../../../cpu/cpu'
import type { Platform } from '../../../cpu/platform'
import type { StepEffects } from '../../../cpu/types'
import type { AssembleResult } from '../../../shared/ipc'
import type { Debogueur } from './debogueur'

/**
 * Lie un éditeur Monaco, un processeur et un débogueur : assemblage, pas à pas avec surlignage de
 * la ligne courante, exécution complète.
 */
export class Execution {
  cpu: Cpu | null = null
  assemblage: AssembleResult | null = null
  private decorations: string[] = []

  constructor(
    private readonly editor: monaco.editor.IStandaloneCodeEditor,
    private readonly debogueur: Debogueur,
    private readonly creerPlateforme: () => Platform | undefined
  ) {}

  /** Assemble le source ; renvoie le résultat (erreurs reformulées comprises). */
  async assembler(source: string): Promise<AssembleResult> {
    const result = await window.api.assemble(source)
    this.assemblage = result
    const model = this.editor.getModel()
    if (model) {
      monaco.editor.setModelMarkers(
        model,
        'vasm',
        result.errors.map((e) => ({
          severity: monaco.MarkerSeverity.Error,
          message: e.original ? `${e.message}\n(vasm : ${e.original})` : e.message,
          startLineNumber: Math.max(1, e.line),
          endLineNumber: Math.max(1, e.line),
          startColumn: 1,
          endColumn: 1000
        }))
      )
    }
    if (result.success) this.reinitialiser()
    else {
      this.cpu = null
      this.surligner(undefined)
    }
    return result
  }

  reinitialiser(): void {
    const asm = this.assemblage
    if (!asm?.success) return
    const cpu = new Cpu(this.creerPlateforme())
    cpu.reset(asm.baseAddress ?? 0)
    cpu.loadProgram(asm.baseAddress ?? 0, asm.binary!)
    this.cpu = cpu
    this.debogueur.setAdresseMemoire(asm.baseAddress ?? 0)
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
    const effects = cpu.step()
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
