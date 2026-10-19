import { describe, expect, it } from 'vitest'
import { assemble } from '../../helpers/assemble'
import { Cpu } from '../../../src/cpu/cpu'
import { createAtariSt, type AtariStOptions } from '../../../src/platforms/atari-st'
import { CYCLES_PER_VBL, SYSVAR } from '../../../src/platforms/atari-st/machine'
import { screenAddress } from '../../../src/platforms/atari-st/screen'

function run(body: string, options: AtariStOptions = { userMode: true }, maxSteps = 200000) {
  const asm = assemble(`    ORG $1000\nSTART:\n${body}\n`)
  if (!asm.success) throw new Error('assemble failed: ' + JSON.stringify(asm.errors))
  const cpu = new Cpu(createAtariSt(options))
  cpu.reset(asm.baseAddress)
  cpu.loadProgram(asm.baseAddress, asm.binary)
  let error: string | undefined
  for (let i = 0; i < maxSteps && !cpu.halted; i++) error = cpu.step().error ?? error
  return { cpu, error }
}

const VSYNC = '    MOVE.W #37,-(SP)\n    TRAP #14\n    ADDQ.L #2,SP'
const PTERM0 = '    CLR.W -(SP)\n    TRAP #1'

describe('Atari ST — VBL', () => {
  it('compte les cycles : MOVEQ = 4, MOVE.L abs = 20', () => {
    const asm = assemble('    ORG $1000\n    MOVEQ #1,D0\n    MOVE.L $2000,D1\n')
    const cpu = new Cpu(createAtariSt())
    cpu.reset(0x1000)
    cpu.loadProgram(0x1000, asm.binary)
    cpu.step()
    expect(cpu.cycles).toBe(4)
    cpu.step()
    expect(cpu.cycles).toBe(24)
  })

  it('Vsync attend vraiment la VBL : _frclock et _vbclock avancent de 1 par Vsync', () => {
    const { cpu, error } = run(`    MOVEQ #9,D7\n.boucle:\n${VSYNC}\n    DBF D7,.boucle\n${PTERM0}`)
    expect(error).toBeUndefined()
    expect(cpu.memory.readU32(SYSVAR.frclock)).toBe(10)
    expect(cpu.memory.readU32(SYSVAR.vbclock)).toBe(10)
    expect(cpu.cycles).toBeGreaterThanOrEqual(10 * CYCLES_PER_VBL)
  })

  it('la VBL tombe toute seule, même sans Vsync', () => {
    const { cpu } = run(`    MOVE.L #100000,D0\n.attente:\n    SUBQ.L #1,D0\n    BNE.S .attente\n${PTERM0}`)
    // 100 000 tours de 12 cycles environ : plusieurs trames
    expect(cpu.memory.readU32(SYSVAR.frclock)).toBe(Math.floor(cpu.cycles / CYCLES_PER_VBL))
    expect(cpu.memory.readU32(SYSVAR.frclock)).toBeGreaterThan(4)
  })

  it('une routine posée dans _vblqueue est appelée à chaque VBL', () => {
    const { cpu, error } = run(
      `    PEA INSTALLE(PC)\n    MOVE.W #38,-(SP)\n    TRAP #14\n    ADDQ.L #6,SP
    MOVEQ #4,D7
.boucle:
${VSYNC}
    DBF D7,.boucle
    MOVE.W COMPTEUR,D6
${PTERM0}
INSTALLE:
    MOVEA.L $456.W,A0
    MOVE.L #MAROUTINE,(A0)
    RTS
MAROUTINE:
    ADDQ.W #1,COMPTEUR
    RTS
COMPTEUR: DC.W 0`
    )
    expect(error).toBeUndefined()
    expect(cpu.d[6]).toBe(5)
  })

  it('remplacer le vecteur $70 détourne la VBL', () => {
    const { cpu, error } = run(
      `    PEA INSTALLE(PC)\n    MOVE.W #38,-(SP)\n    TRAP #14\n    ADDQ.L #6,SP
    MOVEQ #2,D7
.boucle:
${VSYNC}
    DBF D7,.boucle
    MOVE.W COMPTEUR,D6
${PTERM0}
INSTALLE:
    MOVE.L #MAVBL,$70.W
    RTS
MAVBL:
    ADDQ.W #1,COMPTEUR
    RTE
COMPTEUR: DC.W 0`
    )
    expect(error).toBeUndefined()
    expect(cpu.memory.readU32(SYSVAR.frclock)).toBe(0)
    expect(cpu.d[6]).toBe(3)
  })

  it('le masque d’interruption à 7 retient la VBL', () => {
    const { cpu } = run(
      `    MOVE.W #$2700,SR\n    MOVE.L #100000,D0\n.attente:\n    SUBQ.L #1,D0\n    BNE.S .attente\n${PTERM0}`,
      { userMode: false }
    )
    expect(cpu.memory.readU32(SYSVAR.frclock)).toBe(0)
  })

  it('screenpt et colorptr sont pris en compte à la VBL', () => {
    const { cpu, error } = run(
      `    MOVE.L #$70000,$45E.W\n    MOVE.L #PALETTE,$45A.W\n${VSYNC}\n${PTERM0}\nPALETTE: DC.W $123,$456,0,0,0,0,0,0,0,0,0,0,0,0,0,$777`,
      { userMode: false }
    )
    expect(error).toBeUndefined()
    expect(screenAddress(cpu.memory)).toBe(0x70000)
    expect(cpu.memory.readU16(0xff8242)).toBe(0x456)
    expect(cpu.memory.readU32(0x45e)).toBe(0)
  })

  it('STOP attend la première interruption : le timer C (200 Hz) arrive avant la VBL', () => {
    const { cpu, error } = run(`    STOP #$2300\n    MOVE.L $4BA.W,D5\n    MOVE.L $466.W,D6\n${PTERM0}`, { userMode: false })
    expect(error).toBeUndefined()
    expect(cpu.d[5]).toBe(1)
    expect(cpu.d[6]).toBe(0)
  })

  it('masque à 5 : la VBL (niveau 4) est retenue, le MFP (niveau 6) passe toujours', () => {
    const { cpu } = run(
      `    MOVE.W #$2500,SR\n    MOVE.L #100000,D0\n.attente:\n    SUBQ.L #1,D0\n    BNE.S .attente\n${PTERM0}`,
      { userMode: false }
    )
    expect(cpu.memory.readU32(SYSVAR.frclock)).toBe(0)
    expect(cpu.memory.readU32(SYSVAR.hz_200)).toBe(Math.floor(cpu.cycles / ((192 * 64 * 8010612) / 2457600)))
  })
})
