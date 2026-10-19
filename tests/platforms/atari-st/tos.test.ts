import { describe, expect, it } from 'vitest'
import { assemble } from '../../helpers/assemble'
import { Cpu } from '../../../src/cpu/cpu'
import { createAtariSt, type AtariStOptions } from '../../../src/platforms/atari-st'
import { readPixel, screenAddress } from '../../../src/platforms/atari-st/screen'
import type { StepEffects } from '../../../src/cpu/types'

function run(body: string, options: AtariStOptions = { userMode: true }, maxSteps = 20000) {
  const asm = assemble(`    ORG $1000\nSTART:\n${body}\n`)
  if (!asm.success) throw new Error('assemble failed: ' + JSON.stringify(asm.errors))
  const cpu = new Cpu(createAtariSt(options))
  cpu.reset(asm.baseAddress)
  cpu.loadProgram(asm.baseAddress, asm.binary)
  let last: StepEffects = { writes: [], halted: false }
  for (let i = 0; i < maxSteps && !cpu.halted; i++) last = cpu.step()
  return { cpu, last }
}

const PTERM0 = '    CLR.W -(SP)\n    TRAP #1'

describe('TOS simulé — GEMDOS', () => {
  it('Cconws affiche une chaîne, Pterm0 termine', () => {
    const { cpu, last } = run(`    PEA MSG(PC)\n    MOVE.W #9,-(SP)\n    TRAP #1\n    ADDQ.L #6,SP\n${PTERM0}\nMSG: DC.B 'BONJOUR',13,10,0`)
    expect(cpu.output).toBe('BONJOUR\r\n')
    expect(cpu.halted).toBe(true)
    expect(last.error).toBeUndefined()
  })

  it('Cconout affiche un caractère', () => {
    const { cpu } = run(`    MOVE.W #'A',-(SP)\n    MOVE.W #2,-(SP)\n    TRAP #1\n    ADDQ.L #4,SP\n${PTERM0}`)
    expect(cpu.output).toBe('A')
  })

  it('un RTS final rend la main au TOS proprement', () => {
    const { cpu, last } = run('    MOVEQ #7,D3\n    RTS')
    expect(cpu.halted).toBe(true)
    expect(last.error).toBeUndefined()
    expect(cpu.d[3]).toBe(7)
  })

  it('Cnecin : ASCII en poids faible, code clavier dans le mot fort', () => {
    const { cpu } = run(`    MOVE.W #8,-(SP)\n    TRAP #1\n    ADDQ.L #2,SP\n    MOVE.L D0,D3\n    SWAP D0\n    MOVE.B D0,D4\n${PTERM0}`, {
      userMode: true,
      keys: [{ ascii: 0x1b, scancode: 0x01 }]
    })
    expect(cpu.d[3]).toBe(0x0001001b)
    expect(cpu.d[4] & 0xff).toBe(0x01)
  })

  it('attendre une touche non prévue arrête le programme avec un message clair', () => {
    const { last } = run(`    MOVE.W #8,-(SP)\n    TRAP #1\n${PTERM0}`)
    expect(last.error).toContain('touche')
  })
})

describe('TOS simulé — protection et superviseur', () => {
  it('écrire la palette en mode utilisateur → erreur de bus, 2 bombes', () => {
    const { last } = run(`    MOVE.W #$700,$FF8240\n${PTERM0}`)
    expect(last.exception?.vector).toBe(2)
    expect(last.error).toContain('2 bombes')
  })

  it('lire une variable système en mode utilisateur → erreur de bus', () => {
    const { last } = run(`    MOVE.B $484,D0\n${PTERM0}`)
    expect(last.exception?.vector).toBe(2)
  })

  it('Supexec exécute une routine en superviseur puis revient en utilisateur', () => {
    const { cpu, last } = run(`    PEA ROUGE(PC)\n    MOVE.W #38,-(SP)\n    TRAP #14\n    ADDQ.L #6,SP\n    MOVE.W SR,D3\n${PTERM0}
ROUGE:
    MOVE.W #$700,$FF8240
    BCLR #0,$484
    RTS`)
    expect(last.error).toBeUndefined()
    expect(cpu.memory.readU16(0xff8240)).toBe(0x700)
    expect(cpu.memory.readU8(0x484)).toBe(0x06)
    expect(cpu.d[3] & 0x2000).toBe(0) // revenu en mode utilisateur
  })

  it('Super(0) puis Super(ancienne pile)', () => {
    const { cpu, last } = run(`    CLR.L -(SP)\n    MOVE.W #32,-(SP)\n    TRAP #1\n    ADDQ.L #6,SP\n    MOVE.L D0,OLDSSP
    MOVE.W #$070,$FF8242
    MOVE.L OLDSSP,-(SP)\n    MOVE.W #32,-(SP)\n    TRAP #1\n    ADDQ.L #6,SP
    MOVE.W SR,D3
${PTERM0}
OLDSSP: DC.L 0`)
    expect(last.error).toBeUndefined()
    expect(cpu.memory.readU16(0xff8242)).toBe(0x070)
    expect(cpu.d[3] & 0x2000).toBe(0)
  })

  it('Setexec installe une routine de TRAP', () => {
    const { cpu, last } = run(`    PEA HANDLER(PC)\n    MOVE.W #32+3,-(SP)\n    MOVE.W #5,-(SP)\n    TRAP #13\n    ADDQ.L #8,SP\n    TRAP #3\n${PTERM0}
HANDLER:
    MOVEQ #42,D5
    RTE`)
    expect(last.error).toBeUndefined()
    expect(cpu.d[5]).toBe(42)
  })
})

describe('TOS simulé — XBIOS et écran', () => {
  it('Physbase renvoie l’écran d’un 1040 ST ($F8000)', () => {
    const { cpu } = run(`    MOVE.W #2,-(SP)\n    TRAP #14\n    ADDQ.L #2,SP\n    MOVE.L D0,D3\n${PTERM0}`)
    expect(cpu.d[3]).toBe(0xf8000)
    expect(screenAddress(cpu.memory)).toBe(0xf8000)
  })

  it('Setcolor renvoie l’ancienne couleur et masque la nouvelle', () => {
    const { cpu } = run(`    MOVE.W #$0FFF,-(SP)\n    MOVE.W #1,-(SP)\n    MOVE.W #7,-(SP)\n    TRAP #14\n    ADDQ.L #6,SP\n    MOVE.W D0,D3\n${PTERM0}`)
    expect(cpu.d[3] & 0xffff).toBe(0x700) // couleur 1 par défaut = rouge
    expect(cpu.memory.readU16(0xff8242)).toBe(0x777)
  })

  it('PSET corrigé (masque $FFF8, ADDA.W) allume le bon pixel sur les 4 plans', () => {
    // Routine du manuel v2 (module 7.2) avec deux corrections : ANDI.W #$FFF8 (au lieu de #$FFFE)
    // et ADDA.W D0,A0 (au lieu de ADDA.L : le mot fort de D0 n'est jamais remis à zéro)
    const { cpu, last } = run(`    MOVE.W #2,-(SP)\n    TRAP #14\n    ADDQ.L #2,SP\n    MOVE.L D0,SCREEN_BASE
    MOVE.W #37,D1\n    MOVE.W #10,D4\n    MOVE.W #5,D2\n    BSR PSET
${PTERM0}
PSET:
    MOVEM.L D0-D6/A0-A1,-(SP)
    LEA SCREEN_BASE,A0
    MOVE.L (A0),A0
    MULU.W #160,D4
    ADDA.L D4,A0
    MOVE.W D1,D0
    LSR.W #1,D0
    ANDI.W #$FFF8,D0
    ADDA.W D0,A0
    ANDI.W #15,D1
    MOVE.W #15,D3
    SUB.W D1,D3
    MOVE.W #1,D5
    LSL.W D3,D5
    MOVE.W D5,D6
    NOT.W D6
    AND.W D6,(A0)
    LSR.W #1,D2
    BCC.S .BP1
    OR.W D5,(A0)
.BP1: AND.W D6,2(A0)
    LSR.W #1,D2
    BCC.S .BP2
    OR.W D5,2(A0)
.BP2: AND.W D6,4(A0)
    LSR.W #1,D2
    BCC.S .BP3
    OR.W D5,4(A0)
.BP3: AND.W D6,6(A0)
    LSR.W #1,D2
    BCC.S .DONE
    OR.W D5,6(A0)
.DONE: MOVEM.L (SP)+,D0-D6/A0-A1
    RTS
    EVEN
SCREEN_BASE: DC.L 0`)
    expect(last.error).toBeUndefined()
    expect(readPixel(cpu.memory, 0xf8000, 37, 10)).toBe(5)
    expect(readPixel(cpu.memory, 0xf8000, 36, 10)).toBe(0)
    expect(readPixel(cpu.memory, 0xf8000, 38, 10)).toBe(0)
  })

  it('PSET d’origine (masque $FFFE) se trompe de groupe pour X = 37', () => {
    const { cpu } = run(`    MOVE.W #37,D1\n    MOVE.W #10,D4\n    MOVE.L #$F8000,A0\n    MULU.W #160,D4\n    ADDA.L D4,A0\n    MOVE.W D1,D0\n    LSR.W #1,D0\n    ANDI.W #$FFFE,D0\n    MOVE.W D0,D3\n${PTERM0}`)
    expect(cpu.d[3] & 0xffff).toBe(18) // au lieu de 16 : on tombe au milieu d'un groupe de 4 plans
  })
})
