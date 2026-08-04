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

describe('niveau-3 exercises', () => {
  it('l3-e1', () => {
    const snap = run(
      `    ORG $1000\nSTART:\n    MOVE.L  #$FFFFFFF6,D1\n    TST.L   D1\n    BMI     NEGATIF\n    MOVEQ   #0,D0\n    BRA     FIN\nNEGATIF:\n    MOVEQ   #1,D0\nFIN:\n`,
      8
    )
    expect(hex(snap.d[0])).toBe('$00000001')
  })

  it('l3-e2', () => {
    const snap = run(
      `    ORG $1000\nSTART:\n    MOVE.L  #21,D1\n    MOVE.L  #30,D2\n    CMP.L   D1,D2\n    BGT     D2GRAND\n    MOVE.L  D1,D0\n    BRA     FIN\nD2GRAND:\n    MOVE.L  D2,D0\nFIN:\n`,
      8
    )
    expect(hex(snap.d[0])).toBe('$0000001E')
  })

  it('l3-e3', () => {
    const snap = run(
      `    ORG $1000\nSTART:\n    MOVE.L  #5,D3\n    BTST    #0,D3\n    BEQ     BITZERO\n    MOVE.L  #$FF,D0\n    BRA     FIN\nBITZERO:\n    MOVE.L  #0,D0\nFIN:\n`,
      8
    )
    expect(hex(snap.d[0])).toBe('$000000FF')
  })
})
