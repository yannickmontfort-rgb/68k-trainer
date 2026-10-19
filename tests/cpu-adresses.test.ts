import { describe, expect, it } from 'vitest'
import { assemble } from './helpers/assemble'
import { Cpu } from '../src/cpu/cpu'

function run(source: string): Cpu {
  const asm = assemble(`    ORG $1000\n${source}\n`)
  const cpu = new Cpu()
  cpu.reset(0x1000)
  cpu.loadProgram(0x1000, asm.binary)
  for (let i = 0; i < 100 && !cpu.halted; i++) cpu.step()
  return cpu
}

describe('adresses effectives sur 32 bits', () => {
  it('LEA -1.W donne $FFFFFFFF, PEA -1.W empile -1', () => {
    const cpu = run('    LEA -1.W,A0\n    PEA -1.W\n    MOVE.L (SP)+,D1\n    LEA 2(A0),A1')
    expect(cpu.a[0]).toBe(0xffffffff)
    expect(cpu.d[1]).toBe(0xffffffff)
    expect(cpu.a[1]).toBe(0x00000001)
  })

  it('un accès mémoire n’utilise que 24 bits d’adresse', () => {
    const cpu = run('    MOVE.L #$12345678,$2000\n    MOVEA.L #$FF002000,A0\n    MOVE.L (A0)+,D2')
    expect(cpu.d[2]).toBe(0x12345678)
    expect(cpu.a[0]).toBe(0xff002004)
  })
})
