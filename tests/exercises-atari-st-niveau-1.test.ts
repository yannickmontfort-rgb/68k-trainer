import { describe, expect, it } from 'vitest'
import { assemble } from './helpers/assemble'
import { Cpu } from '../src/cpu/cpu'
import { createAtariStPalette } from '../src/platforms/atari-st/palette'
import { evaluateCheck } from '../src/shared/checkResult'
import type { ExerciseCheck } from '../src/shared/ipc'

function run(source: string, check: ExerciseCheck) {
  const asm = assemble(source)
  if (!asm.success) throw new Error('assemble failed: ' + JSON.stringify(asm.errors))
  const cpu = new Cpu(createAtariStPalette())
  cpu.reset(asm.baseAddress)
  cpu.loadProgram(asm.baseAddress, asm.binary)
  for (let i = 0; i < check.maxSteps; i++) {
    const effects = cpu.step()
    if (effects.halted) break
  }
  return evaluateCheck(cpu, check)
}

describe('atari-st niveau-1 (palette) exercises', () => {
  it('atari-st-l1-e1', () => {
    const check: ExerciseCheck = { type: 'memory', maxSteps: 3, expected: { $FF8240: '$0700' } }
    expect(run('    ORG $1000\nSTART:\n    MOVE.W #$0700,$FF8240\n', check).success).toBe(true)
  })

  it('atari-st-l1-e2', () => {
    const check: ExerciseCheck = { type: 'memory', maxSteps: 3, expected: { $FF8242: '$0777' } }
    expect(run('    ORG $1000\nSTART:\n    MOVE.W #$0FFF,$FF8242\n', check).success).toBe(true)
  })

  it('atari-st-l1-e3', () => {
    const check: ExerciseCheck = {
      type: 'memory',
      maxSteps: 5,
      expected: { $FF8240: '$0700', $FF8244: '$0007' }
    }
    expect(
      run('    ORG $1000\nSTART:\n    MOVE.W #$0700,$FF8240\n    MOVE.W #$0007,$FF8244\n', check).success
    ).toBe(true)
  })
})
