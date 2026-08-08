import { describe, expect, it } from 'vitest'
import { assemble } from './helpers/assemble'
import { Cpu } from '../src/cpu/cpu'
import { evaluateCheck } from '../src/shared/checkResult'
import type { ExerciseCheck } from '../src/shared/ipc'

function run(source: string, check: ExerciseCheck) {
  const asm = assemble(source)
  if (!asm.success) throw new Error('assemble failed: ' + JSON.stringify(asm.errors))
  const cpu = new Cpu()
  cpu.reset(asm.baseAddress)
  cpu.loadProgram(asm.baseAddress, asm.binary)
  for (let i = 0; i < check.maxSteps; i++) {
    const effects = cpu.step()
    if (effects.halted) break
  }
  return evaluateCheck(cpu, check)
}

describe('evaluateCheck', () => {
  it('type "registers" : succès et échec', () => {
    const check: ExerciseCheck = { type: 'registers', maxSteps: 5, expected: { D0: '$0000002A' } }
    expect(run('    ORG $1000\nSTART:\n    MOVE.B #$2A,D0\n', check).success).toBe(true)
    expect(run('    ORG $1000\nSTART:\n    MOVE.B #$2B,D0\n', check).success).toBe(false)
  })

  it('type "memory" : succès et échec, avec une vraie adresse matérielle Atari ST', () => {
    const check: ExerciseCheck = { type: 'memory', maxSteps: 5, expected: { $FF8240: '$0700' } }
    expect(run('    ORG $1000\nSTART:\n    MOVE.W #$0700,$FF8240\n', check).success).toBe(true)
    expect(run('    ORG $1000\nSTART:\n    MOVE.W #$0070,$FF8240\n', check).success).toBe(false)
  })

  it('type "memory" avec suffixe de taille explicite (.B, .L)', () => {
    const checkByte: ExerciseCheck = { type: 'memory', maxSteps: 5, expected: { '$2000.B': '$AA' } }
    expect(run('    ORG $1000\nSTART:\n    MOVE.B #$AA,$2000\n', checkByte).success).toBe(true)

    const checkLong: ExerciseCheck = { type: 'memory', maxSteps: 5, expected: { '$2000.L': '$12345678' } }
    expect(run('    ORG $1000\nSTART:\n    MOVE.L #$12345678,$2000\n', checkLong).success).toBe(true)
  })

  it('type "output" : succès et échec', () => {
    const source = `    ORG $1000\nSTART:\n    LEA MSG,A1\n    MOVE.B #13,D0\n    TRAP #15\n    MOVE.B #9,D0\n    TRAP #15\nMSG:\n    DC.B "HELLO",0\n`
    const okCheck: ExerciseCheck = { type: 'output', maxSteps: 10, expected: { output: 'HELLO' } }
    expect(run(source, okCheck).success).toBe(true)

    const badCheck: ExerciseCheck = { type: 'output', maxSteps: 10, expected: { output: 'AUTRE CHOSE' } }
    expect(run(source, badCheck).success).toBe(false)
  })
})
