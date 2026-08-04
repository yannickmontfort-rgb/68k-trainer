import { describe, expect, it } from 'vitest'
import { assemble } from './helpers/assemble'
import { Cpu } from '../src/cpu/cpu'

function run(source: string, maxSteps: number) {
  const asm = assemble(source)
  if (!asm.success) throw new Error('assemble failed: ' + JSON.stringify(asm.errors))
  const cpu = new Cpu()
  cpu.reset(asm.baseAddress)
  cpu.loadProgram(asm.baseAddress, asm.binary)
  for (let i = 0; i < maxSteps; i++) {
    const eff = cpu.step()
    if (eff.halted) break
  }
  return cpu.getSnapshot()
}

const hex = (n: number) => '$' + (n >>> 0).toString(16).toUpperCase().padStart(8, '0')

describe('niveau-2 exercises', () => {
  it('l2-e1', () => {
    const snap = run(
      `    ORG $1000\nSTART:\n    MOVE.W  #$1234,$2000\n    MOVE.W  #$0111,$2002\n    MOVE.W  $2000,D0\n    ADD.W   $2002,D0\n    MOVE.W  D0,$2004\n`,
      8
    )
    expect(hex(snap.d[0])).toBe('$00001345')
  })

  it('l2-e2', () => {
    const snap = run(`    ORG $1000\nSTART:\n    MOVE.W  #9,D2\n    MULU.W  #6,D2\n`, 4)
    expect(hex(snap.d[2])).toBe('$00000036')
  })

  it('l2-e3', () => {
    const snap = run(
      `    ORG $1000\nSTART:\n    MOVE.W  #$F0F0,D0\n    AND.W   #$0FF0,D0\n    OR.W    #$000F,D0\n    EOR.W   #$FFFF,D0\n`,
      6
    )
    expect(hex(snap.d[0])).toBe('$0000FF00')
  })

  it('l2-e4', () => {
    const snap = run(`    ORG $1000\nSTART:\n    MOVE.W  #3,D0\n    ASL.W   #4,D0\n    LSR.W   #1,D0\n`, 5)
    expect(hex(snap.d[0])).toBe('$00000018')
  })

  it('l2-e5', () => {
    const snap = run(`    ORG $1000\nSTART:\n    MOVE.L  #5,D0\n    NEG.L   D0\n    NOT.L   D0\n`, 5)
    expect(hex(snap.d[0])).toBe('$00000004')
  })
})
