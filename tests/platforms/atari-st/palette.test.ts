import { describe, expect, it } from 'vitest'
import { assemble } from '../../helpers/assemble'
import { Cpu } from '../../../src/cpu/cpu'
import { createAtariStPalette } from '../../../src/platforms/atari-st/palette'

function run(source: string, maxSteps: number) {
  const asm = assemble(source)
  if (!asm.success) throw new Error('assemble failed: ' + JSON.stringify(asm.errors))
  const cpu = new Cpu(createAtariStPalette())
  cpu.reset(asm.baseAddress)
  cpu.loadProgram(asm.baseAddress, asm.binary)
  for (let i = 0; i < maxSteps; i++) {
    const effects = cpu.step()
    if (effects.halted) break
  }
  return cpu
}

describe('AST-1 — palette Atari ST', () => {
  it('une valeur déjà dans le masque matériel ($0777) traverse inchangée', () => {
    const cpu = run('    ORG $1000\nSTART:\n    MOVE.W #$0700,$FF8240\n', 3)
    expect(cpu.memory.readU16(0xff8240)).toBe(0x0700)
  })

  it('une valeur hors masque est corrigée pour ne garder que les bits matériels réels', () => {
    const cpu = run('    ORG $1000\nSTART:\n    MOVE.W #$0FFF,$FF8242\n', 3)
    expect(cpu.memory.readU16(0xff8242)).toBe(0x0777)
  })

  it('les 16 registres de couleur sont indépendants (couleur 0 et couleur 2)', () => {
    const cpu = run(
      '    ORG $1000\nSTART:\n    MOVE.W #$0700,$FF8240\n    MOVE.W #$0007,$FF8244\n',
      5
    )
    expect(cpu.memory.readU16(0xff8240)).toBe(0x0700)
    expect(cpu.memory.readU16(0xff8244)).toBe(0x0007)
  })

  it('une écriture hors de la plage palette ne subit aucun masquage', () => {
    const cpu = run('    ORG $1000\nSTART:\n    MOVE.W #$0FFF,$3000\n', 3)
    expect(cpu.memory.readU16(0x3000)).toBe(0x0fff)
  })

  it('sans la plateforme (Cpu nu), aucun masquage — comportement générique préservé', () => {
    const asm = assemble('    ORG $1000\nSTART:\n    MOVE.W #$0FFF,$FF8240\n')
    if (!asm.success) throw new Error('assemble failed')
    const cpu = new Cpu() // pas de Platform
    cpu.reset(asm.baseAddress)
    cpu.loadProgram(asm.baseAddress, asm.binary)
    cpu.step()
    expect(cpu.memory.readU16(0xff8240)).toBe(0x0fff) // pas masqué : mémoire générique brute
  })
})
