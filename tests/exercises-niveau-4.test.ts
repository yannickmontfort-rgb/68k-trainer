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

describe('niveau-4 exercises', () => {
  it('l4-e1', () => {
    const snap = run(
      `    ORG $1000\nSTART:\n    MOVEQ   #0,D0\n    MOVEQ   #1,D2\n    MOVE.W  #4,D1\nBOUCLE:\n    ADD.W   D2,D0\n    ADDQ.W  #1,D2\n    DBRA    D1,BOUCLE\n`,
      20
    )
    expect(hex(snap.d[0])).toBe('$0000000F')
  })

  it('l4-e2', () => {
    const snap = run(
      `    ORG $1000\nSTART:\n    MOVE.W  #5,$5000\n    MOVE.W  #-3,$5002\n    MOVE.W  #0,$5004\n    MOVE.W  #7,$5006\n    LEA     $5000,A0\n    MOVEQ   #0,D0\n    MOVE.W  #3,D1\nBOUCLE:\n    MOVE.W  (A0)+,D2\n    TST.W   D2\n    BLE     PASPOSITIF\n    ADDQ.W  #1,D0\nPASPOSITIF:\n    DBRA    D1,BOUCLE\n`,
      30
    )
    expect(hex(snap.d[0])).toBe('$00000002')
  })
})
