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

describe('niveau-1 exercises', () => {
  it('l1-e1', () => {
    const snap = run(`    ORG $1000\nSTART:\n    MOVE.B #$2A,D0\n`, 5)
    expect(hex(snap.d[0])).toBe('$0000002A')
  })

  it('l1-e2', () => {
    const snap = run(`    ORG $1000\nSTART:\n    MOVE.W #$1234,D1\n    MOVE.W D1,D2\n`, 5)
    expect(hex(snap.d[1])).toBe('$00001234')
    expect(hex(snap.d[2])).toBe('$00001234')
  })

  it('l1-e3', () => {
    const snap = run(`    ORG $1000\nSTART:\n    MOVEQ #-5,D3\n`, 5)
    expect(hex(snap.d[3])).toBe('$FFFFFFFB')
  })

  it('l1-e4', () => {
    const snap = run(`    ORG $1000\nSTART:\n    MOVE.W #$1234,$2000\n    MOVE.W $2000,D4\n`, 6)
    expect(hex(snap.d[4])).toBe('$00001234')
  })

  it('l1-e5', () => {
    const snap = run(`    ORG $1000\nSTART:\n    LEA $3000,A0\n    MOVE.W #$ABCD,(A0)\n    MOVE.W (A0),D5\n`, 8)
    expect(hex(snap.a[0])).toBe('$00003000')
    expect(hex(snap.d[5])).toBe('$0000ABCD')
  })

  it('l1-e6', () => {
    const snap = run(
      `    ORG $1000\nSTART:\n    LEA $4000,A0\n    MOVE.W #$000A,(A0)+\n    MOVE.W #$0014,(A0)+\n    LEA $4000,A0\n    MOVE.W (A0)+,D6\n    ADD.W (A0),D6\n`,
      12
    )
    expect(hex(snap.d[6])).toBe('$0000001E')
  })
})
