import { Cpu } from '../../cpu/cpu'
import type { Exercise } from '../../shared/ipc'
import { evaluateCheck, type CheckResult } from '../../shared/checkResult'
import { getPlatformForTrack } from './platformForTrack'
import { traducteur } from './langue'

const t = traducteur({
  fr: { erreur: "Erreur d'assemblage : {lignes}", ligne: 'ligne {ligne} : {message}' },
  en: { erreur: 'Assembly error: {lignes}', ligne: 'line {ligne}: {message}' }
})

export type { CheckResult }

/** Assemble le programme de l'utilisateur, l'exécute jusqu'à maxSteps ou HALT, puis vérifie le résultat attendu. */
export async function checkExercise(source: string, exercise: Exercise, trackId: string): Promise<CheckResult> {
  const asm = await window.api.assemble(source)
  if (!asm.success) {
    return {
      success: false,
      message: t('erreur', { lignes: asm.errors.map((e) => t('ligne', { ligne: e.line, message: e.message })).join(' ; ') })
    }
  }

  const cpu = new Cpu(getPlatformForTrack(trackId))
  cpu.reset(asm.baseAddress ?? 0)
  cpu.loadProgram(asm.baseAddress ?? 0, asm.binary!)
  for (let i = 0; i < exercise.check.maxSteps; i++) {
    const effects = cpu.step()
    if (effects.halted) break
  }

  return evaluateCheck(cpu, exercise.check)
}
