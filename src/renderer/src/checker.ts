import { Cpu } from '../../cpu/cpu'
import type { CpuSnapshot } from '../../cpu/types'
import type { Exercise } from '../../shared/ipc'

export interface CheckResult {
  success: boolean
  message: string
}

function readRegister(snap: CpuSnapshot, key: string): number {
  if (key === 'PC') return snap.pc
  const index = parseInt(key.slice(1), 10)
  if (key[0] === 'D') return snap.d[index]
  if (key[0] === 'A') return snap.a[index]
  throw new Error(`Registre inconnu dans le corrigé : ${key}`)
}

/** Assemble le programme de l'utilisateur, l'exécute jusqu'à maxSteps ou HALT, puis compare les registres attendus. */
export async function checkExercise(source: string, exercise: Exercise): Promise<CheckResult> {
  const asm = await window.api.assemble(source)
  if (!asm.success) {
    return {
      success: false,
      message: "Erreur d'assemblage : " + asm.errors.map((e) => `ligne ${e.line} : ${e.message}`).join(' ; ')
    }
  }

  const cpu = new Cpu()
  cpu.reset(asm.baseAddress ?? 0)
  cpu.loadProgram(asm.baseAddress ?? 0, asm.binary!)
  for (let i = 0; i < exercise.check.maxSteps; i++) {
    const effects = cpu.step()
    if (effects.halted) break
  }
  const snap = cpu.getSnapshot()

  const mismatches: string[] = []
  for (const [key, expectedHex] of Object.entries(exercise.check.expected)) {
    const expected = parseInt(expectedHex.replace('$', ''), 16) >>> 0
    const actual = readRegister(snap, key)
    if (actual !== expected) {
      mismatches.push(`${key} attendu ${expectedHex}, obtenu $${actual.toString(16).padStart(8, '0').toUpperCase()}`)
    }
  }
  if (mismatches.length > 0) {
    return { success: false, message: mismatches.join('\n') }
  }
  return { success: true, message: 'Bravo, tous les registres correspondent !' }
}
