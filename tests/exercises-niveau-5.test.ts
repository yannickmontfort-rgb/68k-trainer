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

describe('niveau-5 exercises', () => {
  it('l5-e1', () => {
    const snap = run(
      `    ORG $1000\nSTART:\n    MOVEQ   #7,D0\n    BSR     DOUBLE\n    BRA     FIN\nDOUBLE:\n    ADD.W   D0,D0\n    RTS\nFIN:\n`,
      8
    )
    expect(hex(snap.d[0])).toBe('$0000000E')
  })

  it('l5-e2', () => {
    const snap = run(
      `    ORG $1000\nSTART:\n    MOVE.L  #$12345678,D1\n    BSR     MODIFIE\n    BRA     FIN\nMODIFIE:\n    MOVE.L  D1,-(SP)\n    MOVEQ   #0,D1\n    MOVE.L  (SP)+,D1\n    RTS\nFIN:\n`,
      10
    )
    expect(hex(snap.d[1])).toBe('$12345678')
  })

  it('l5-e3', () => {
    const snap = run(
      `    ORG $1000\nSTART:\n    MOVE.W  #10,-(SP)\n    MOVE.W  #20,-(SP)\n    BSR     ADDITIONNE\n    ADDA.L  #4,SP\n    BRA     FIN\nADDITIONNE:\n    MOVE.W  4(A7),D0\n    ADD.W   6(A7),D0\n    RTS\nFIN:\n`,
      10
    )
    expect(hex(snap.d[0])).toBe('$0000001E')
  })
})
