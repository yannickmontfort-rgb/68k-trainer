import { Cpu } from '../../cpu/cpu'
import type { Exercise } from '../../shared/ipc'
import { evaluateCheck, type CheckResult } from '../../shared/checkResult'
import { getPlatformForTrack } from './platformForTrack'

export type { CheckResult }

/** Assemble le programme de l'utilisateur, l'exécute jusqu'à maxSteps ou HALT, puis vérifie le résultat attendu. */
export async function checkExercise(source: string, exercise: Exercise, trackId: string): Promise<CheckResult> {
  const asm = await window.api.assemble(source)
  if (!asm.success) {
    return {
      success: false,
      message: "Erreur d'assemblage : " + asm.errors.map((e) => `ligne ${e.line} : ${e.message}`).join(' ; ')
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
