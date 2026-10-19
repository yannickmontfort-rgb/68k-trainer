import { describe, expect, it } from 'vitest'
import { assemble } from './helpers/assemble'
import { Cpu } from '../src/cpu/cpu'
import type { Platform } from '../src/cpu/platform'
import type { StepEffects } from '../src/cpu/types'

function load(body: string, platform?: Platform): Cpu {
  const asm = assemble(`    ORG $1000\nSTART:\n${body}\n`)
  if (!asm.success) throw new Error('assemble failed: ' + JSON.stringify(asm.errors))
  const cpu = new Cpu(platform)
  cpu.reset(asm.baseAddress)
  cpu.loadProgram(asm.baseAddress, asm.binary)
  return cpu
}

/** Exécute jusqu'à l'arrêt ; renvoie le dernier effet (celui qui a arrêté le programme). */
function runUntilHalt(cpu: Cpu, maxSteps = 500): StepEffects {
  let last: StepEffects = { writes: [], halted: false }
  for (let i = 0; i < maxSteps && !cpu.halted; i++) last = cpu.step()
  return last
}

const HALT = '    MOVE.B #9,D0\n    TRAP #15'

describe('registre d’état et modes', () => {
  it('démarre en superviseur, masque 7 (SR = $2700)', () => {
    const cpu = load(HALT)
    expect(cpu.sr).toBe(0x2700)
    expect(cpu.supervisor).toBe(true)
  })

  it('passer en mode utilisateur échange A7 avec la pile utilisateur', () => {
    const cpu = load(`    LEA $8000,A0\n    MOVE.L A0,USP\n    ANDI.W #$DFFF,SR\n${HALT}`)
    runUntilHalt(cpu)
    expect(cpu.supervisor).toBe(false)
    expect(cpu.a[7]).toBe(0x8000)
    expect(cpu.ssp).toBe(0xfffffc)
  })

  it('MOVE vers SR en mode utilisateur → violation de privilège (vecteur 8)', () => {
    const cpu = load(`    ANDI.W #$DFFF,SR\n    MOVE.W #$2700,SR\n${HALT}`)
    const effects = runUntilHalt(cpu)
    expect(effects.exception?.vector).toBe(8)
    expect(effects.exception?.handled).toBe(false)
    expect(effects.error).toContain('8 bombes')
  })

  it('MOVE SR,Dn est autorisé en mode utilisateur sur 68000', () => {
    const cpu = load(`    ANDI.W #$DFFF,SR\n    MOVEQ #0,D1\n    MOVE.W SR,D1\n${HALT}`)
    runUntilHalt(cpu)
    expect(cpu.d[1]).toBe(0x0704) // Z=1 après MOVEQ #0
  })

  it('MOVE vers CCR et ORI/ANDI/EORI vers CCR', () => {
    const cpu = load(`    MOVE.W #$1F,CCR\n    ANDI.B #$FE,CCR\n    EORI.B #$04,CCR\n    MOVE.W SR,D1\n${HALT}`)
    runUntilHalt(cpu)
    expect(cpu.d[1] & 0x1f).toBe(0x1a) // X N V (Z et C effacés)
  })
})

describe('erreur d’adresse (accès impair)', () => {
  it('non traitée : arrêt sur l’instruction fautive, 3 bombes', () => {
    const cpu = load(`    MOVEQ #1,D0\n    MOVE.W D0,$3001\n${HALT}`)
    const effects = runUntilHalt(cpu)
    expect(effects.exception?.vector).toBe(3)
    expect(effects.exception?.accessAddress).toBe(0x3001)
    expect(effects.error).toContain('3 bombes')
    expect(cpu.pc).toBe(0x1002)
  })

  it('un accès octet à une adresse impaire est permis', () => {
    const cpu = load(`    MOVE.B #$42,$3001\n${HALT}`)
    runUntilHalt(cpu)
    expect(cpu.memory.readU8(0x3001)).toBe(0x42)
  })

  it('traitée : cadre de pile de 14 octets avec l’adresse fautive', () => {
    const cpu = load(`    LEA HANDLER(PC),A0\n    MOVE.L A0,$C\n    MOVE.L $3001,D1\n${HALT}
HANDLER:
    MOVE.L 2(SP),D2
    MOVE.W 6(SP),D3
    MOVE.B #9,D0
    TRAP #15`)
    runUntilHalt(cpu)
    expect(cpu.d[2]).toBe(0x3001)
    expect(cpu.d[3]).toBe(0x2239) // code de MOVE.L abs.L,D1 (mode Devpac : adresse longue) = registre d'instruction empilé
    expect(cpu.memory.readU16(cpu.a[7]) & 0x10).toBe(0x10) // bit R/W = lecture
  })
})

describe('TRAP et RTE', () => {
  it('TRAP #0 avec routine installée, retour par RTE', () => {
    const cpu = load(`    LEA HANDLER(PC),A0\n    MOVE.L A0,$80\n    ANDI.W #$DFFF,SR\n    TRAP #0\n    MOVE.L #$BEEF,D2\n${HALT}
HANDLER:
    MOVE.W SR,D1
    RTE`)
    runUntilHalt(cpu)
    expect(cpu.d[1] & 0x2000).toBe(0x2000) // la routine tourne en superviseur
    expect(cpu.d[2]).toBe(0xbeef) // le programme a repris après TRAP
    expect(cpu.supervisor).toBe(false) // RTE a restauré le mode utilisateur
  })

  it('TRAP #1 sans routine ni plateforme : arrêt propre', () => {
    const cpu = load('    TRAP #1')
    const effects = runUntilHalt(cpu)
    expect(effects.exception?.vector).toBe(33)
    expect(cpu.halted).toBe(true)
  })
})

describe('autres exceptions', () => {
  it('division par zéro → vecteur 5', () => {
    const cpu = load(`    MOVEQ #10,D0\n    MOVEQ #0,D1\n    DIVU D1,D0\n${HALT}`)
    const effects = runUntilHalt(cpu)
    expect(effects.exception?.vector).toBe(5)
  })

  it('ILLEGAL → vecteur 4', () => {
    const cpu = load('    ILLEGAL')
    expect(runUntilHalt(cpu).exception?.vector).toBe(4)
  })

  it('CHK hors limites → vecteur 6', () => {
    const cpu = load(`    MOVEQ #20,D0\n    CHK #10,D0\n${HALT}`)
    expect(runUntilHalt(cpu).exception?.vector).toBe(6)
  })

  it('erreur de bus signalée par la plateforme → vecteur 2', () => {
    const platform: Platform = { isBusError: (_cpu, address) => address >= 0xff8000 }
    const cpu = load(`    MOVE.W #$700,$FF8240\n${HALT}`, platform)
    const effects = runUntilHalt(cpu)
    expect(effects.exception?.vector).toBe(2)
    expect(effects.error).toContain('2 bombes')
  })
})

describe('interruptions', () => {
  const program = `    LEA HANDLER(PC),A0\n    MOVE.L A0,$68\n    MOVE.W #$2100,SR\nLOOP:\n    TST.L D7\n    BEQ.S LOOP\n${HALT}
HANDLER:
    MOVEQ #1,D7
    RTE`

  it('une interruption de niveau 2 passe quand le masque vaut 1', () => {
    const cpu = load(program)
    for (let i = 0; i < 5; i++) cpu.step()
    cpu.requestInterrupt(2)
    runUntilHalt(cpu)
    expect(cpu.d[7]).toBe(1)
  })

  it('elle est retenue tant que le masque est supérieur ou égal', () => {
    const cpu = load(`    MOVE.W #$2700,SR\n    MOVEQ #5,D1\n    MOVEQ #6,D2\n${HALT}`)
    cpu.requestInterrupt(2)
    const effects = runUntilHalt(cpu)
    expect(effects.exception).toBeUndefined()
    expect(cpu.d[2]).toBe(6)
  })

  it('STOP attend l’interruption', () => {
    const cpu = load(`    LEA HANDLER(PC),A0\n    MOVE.L A0,$68\n    STOP #$2100\n    MOVEQ #2,D6\n${HALT}
HANDLER:
    MOVEQ #1,D7
    RTE`)
    for (let i = 0; i < 10; i++) cpu.step()
    expect(cpu.stopped).toBe(true)
    expect(cpu.d[6]).toBe(0)
    cpu.requestInterrupt(2)
    runUntilHalt(cpu)
    expect(cpu.d[7]).toBe(1)
    expect(cpu.d[6]).toBe(2)
  })
})

describe('instructions ajoutées', () => {
  it('EXT.W et EXT.L', () => {
    const cpu = load(`    MOVE.L #$123456F0,D3
    EXT.W D3
    MOVE.L #$00008001,D1
    EXT.L D1
${HALT}`)
    runUntilHalt(cpu)
    expect(cpu.d[3]).toBe(0x1234fff0)
    expect(cpu.d[1]).toBe(0xffff8001)
  })

  it('Scc', () => {
    const cpu = load(`    MOVEQ #0,D0\n    SEQ D1\n    SNE D2\n${HALT}`)
    runUntilHalt(cpu)
    expect(cpu.d[1] & 0xff).toBe(0xff)
    expect(cpu.d[2] & 0xff).toBe(0x00)
  })

  it('LINK / UNLK', () => {
    const cpu = load(`    MOVE.L SP,D3
    LINK A6,#-8
    MOVE.L SP,D1
    UNLK A6
    MOVE.L SP,D2
${HALT}`)
    runUntilHalt(cpu)
    expect(cpu.d[3] - cpu.d[1]).toBe(12)
    expect(cpu.d[2]).toBe(cpu.d[3])
  })

  it('ADDX : addition sur 64 bits', () => {
    const cpu = load(`    MOVE.L #$FFFFFFFF,D1
    MOVEQ #0,D4
    MOVEQ #1,D3
    MOVEQ #0,D2
    ADD.L D3,D1
    ADDX.L D2,D4
${HALT}`)
    runUntilHalt(cpu)
    expect(cpu.d[1]).toBe(0)
    expect(cpu.d[4]).toBe(1)
  })

  it('CMPM', () => {
    const cpu = load(`    LEA A(PC),A0\n    LEA B(PC),A1\n    CMPM.W (A0)+,(A1)+\n    SEQ D1\n${HALT}
A:  DC.W $1234
B:  DC.W $1234`)
    runUntilHalt(cpu)
    expect(cpu.d[1] & 0xff).toBe(0xff)
  })

  it('MOVEP.L écrit un octet sur deux', () => {
    const cpu = load(`    LEA $4000,A0\n    MOVE.L #$11223344,D0\n    MOVEP.L D0,1(A0)\n${HALT}`)
    runUntilHalt(cpu)
    expect([0x4001, 0x4003, 0x4005, 0x4007].map((a) => cpu.memory.readU8(a))).toEqual([0x11, 0x22, 0x33, 0x44])
    expect(cpu.memory.readU8(0x4002)).toBe(0)
  })

  it('ASL positionne V si le signe change', () => {
    const cpu = load(`    MOVE.W #$4000,D0\n    ASL.W #1,D0\n    SVS D1\n${HALT}`)
    runUntilHalt(cpu)
    expect(cpu.d[1] & 0xff).toBe(0xff)
  })

  it('décalage d’un mot en mémoire', () => {
    const cpu = load(`    MOVE.W #$8001,$4000
    LSR.W $4000
    SCS D1
${HALT}`)
    runUntilHalt(cpu)
    expect(cpu.memory.readU16(0x4000)).toBe(0x4000)
    expect(cpu.d[1] & 0xff).toBe(0xff)
  })

  it('DIVU en dépassement laisse le registre intact', () => {
    const cpu = load(`    MOVE.L #$00100000,D3
    DIVU #1,D3
    SVS D1
${HALT}`)
    runUntilHalt(cpu)
    expect(cpu.d[3]).toBe(0x00100000)
    expect(cpu.d[1] & 0xff).toBe(0xff)
  })

  it('TAS', () => {
    const cpu = load(`    TAS $4000
    SEQ D1
${HALT}`)
    runUntilHalt(cpu)
    expect(cpu.memory.readU8(0x4000)).toBe(0x80)
    expect(cpu.d[1] & 0xff).toBe(0xff)
  })

  it('RTR restaure le CCR', () => {
    const cpu = load(`    PEA SUITE(PC)\n    MOVE.W #$0004,-(SP)\n    MOVEQ #1,D0\n    RTR\nSUITE:\n    SEQ D1\n${HALT}`)
    runUntilHalt(cpu)
    expect(cpu.d[1] & 0xff).toBe(0xff)
  })
})
