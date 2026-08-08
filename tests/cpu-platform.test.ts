import { describe, expect, it, vi } from 'vitest'
import { assemble } from './helpers/assemble'
import { Cpu } from '../src/cpu/cpu'
import type { Platform } from '../src/cpu/platform'

function run(source: string, platform: Platform | undefined, maxSteps: number) {
  const asm = assemble(source)
  if (!asm.success) throw new Error('assemble failed: ' + JSON.stringify(asm.errors))
  const cpu = new Cpu(platform)
  cpu.reset(asm.baseAddress)
  cpu.loadProgram(asm.baseAddress, asm.binary)
  for (let i = 0; i < maxSteps; i++) {
    const effects = cpu.step()
    if (effects.halted) break
  }
  return cpu
}

describe('Platform hooks', () => {
  it('sans Platform, le comportement est inchangé (TRAP #15 seul, Ligne A non supportée)', () => {
    const cpu = run(`    ORG $1000\nSTART:\n    MOVEQ #9,D0\n    TRAP #15\n`, undefined, 5)
    expect(cpu.halted).toBe(true)
  })

  it('onTrap intercepte un TRAP non-15 avant le fallback EASy68K', () => {
    const onTrap = vi.fn().mockReturnValue(true)
    const cpu = run(`    ORG $1000\nSTART:\n    TRAP #1\n    MOVEQ #42,D0\n`, { onTrap }, 5)
    expect(onTrap).toHaveBeenCalledWith(cpu, 1)
    expect(cpu.halted).toBe(false) // pas d'erreur : le hook a bien intercepté avant le throw
    expect(cpu.d[0]).toBe(42) // l'instruction suivante a bien continué de s'exécuter
  })

  it('sans onTrap, TRAP non-15 lève toujours une erreur (comportement par défaut préservé)', () => {
    const cpu = run(`    ORG $1000\nSTART:\n    TRAP #1\n`, {}, 5)
    expect(cpu.halted).toBe(true)
  })

  it('onLineA intercepte un opcode $Axxx', () => {
    const onLineA = vi.fn().mockReturnValue(true)
    const cpu = run(`    ORG $1000\nSTART:\n    DC.W $A003\n    MOVEQ #7,D0\n`, { onLineA }, 5)
    expect(onLineA).toHaveBeenCalledWith(cpu, 0xa003)
    expect(cpu.halted).toBe(false)
    expect(cpu.d[0]).toBe(7)
  })

  it('sans onLineA, un opcode $Axxx lève toujours une erreur', () => {
    const cpu = run(`    ORG $1000\nSTART:\n    DC.W $A003\n`, {}, 5)
    expect(cpu.halted).toBe(true)
  })

  it('onJsr intercepte un JSR vers une adresse magique sans empiler ni sauter', () => {
    const onJsr = vi.fn().mockReturnValue(true)
    const cpu = run(`    ORG $1000\nSTART:\n    JSR $7FFFFE\n    MOVEQ #5,D0\n`, { onJsr }, 5)
    expect(onJsr).toHaveBeenCalledWith(cpu, 0x7ffffe)
    expect(cpu.d[0]).toBe(5) // l'exécution a repris juste après le JSR, pas sauté à $7FFFFE
  })

  it('sans onJsr, un JSR saute réellement (comportement par défaut préservé)', () => {
    const cpu = run(
      `    ORG $1000\nSTART:\n    JSR SUB\n    MOVEQ #99,D0\n    TRAP #15\nSUB:\n    MOVEQ #1,D0\n    RTS\n`,
      {},
      10
    )
    expect(cpu.d[0]).toBe(99) // JSR->SUB (D0=1)->RTS->retour->D0=99 : comportement normal
  })

  it('onMemoryWrite est notifié après une écriture mémoire', () => {
    const onMemoryWrite = vi.fn()
    const cpu = run(`    ORG $1000\nSTART:\n    MOVE.W #$0700,$FF8240\n`, { onMemoryWrite }, 3)
    expect(onMemoryWrite).toHaveBeenCalledWith(cpu, 0xff8240, 2, 0x0700)
  })
})
