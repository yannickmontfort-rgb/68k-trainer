import { describe, expect, it } from 'vitest'
import { assemble } from '../../helpers/assemble'
import { Cpu } from '../../../src/cpu/cpu'
import { createAtariSt } from '../../../src/platforms/atari-st'
import { CPU_HZ, CYCLES_PER_VBL } from '../../../src/platforms/atari-st/machine'
import { materielAtari } from '../../../src/platforms/atari-st/materiel'
import { PsgSt, Ym2149 } from '../../../src/platforms/atari-st/ym2149'

function run(body: string, maxSteps = 400000) {
  const asm = assemble(`    ORG $1000\nSTART:\n${body}\n`)
  if (!asm.success) throw new Error('assemble failed: ' + JSON.stringify(asm.errors))
  const cpu = new Cpu(createAtariSt({ userMode: false }))
  cpu.reset(asm.baseAddress)
  cpu.loadProgram(asm.baseAddress, asm.binary)
  let error: string | undefined
  for (let i = 0; i < maxSteps && !cpu.halted; i++) error = cpu.step().error ?? error
  return { cpu, error, psg: materielAtari(cpu)!.psg }
}

const PTERM0 = '    CLR.W -(SP)\n    TRAP #1'
const VSYNC = '    MOVE.W #37,-(SP)\n    TRAP #14\n    ADDQ.L #2,SP'

/** Nombre de passages par zéro (montants) d'un signal. */
function passages(s: Float32Array): number {
  let n = 0
  for (let i = 1; i < s.length; i++) if (s[i - 1] <= 0 && s[i] > 0) n++
  return n
}

describe('YM2149', () => {
  it('écrire un registre : choix en $FF8800, valeur en $FF8802 ; relecture en $FF8800', () => {
    const { psg, cpu, error } = run(`    MOVE.B #0,$FFFF8800.W
    MOVE.B #$1C,$FFFF8802.W
    MOVE.B #1,$FFFF8800.W
    MOVE.B #$01,$FFFF8802.W
    MOVE.L #$08000F00,$FFFF8800.W
    MOVE.B #7,$FFFF8800.W
    MOVE.B #$FE,$FFFF8802.W
    MOVE.B #0,$FFFF8800.W
    MOVE.B $FFFF8800.W,D5
${PTERM0}`)
    expect(error).toBeUndefined()
    expect(psg.etat.registres[0]).toBe(0x1c)
    expect(psg.etat.registres[1]).toBe(0x01)
    expect(psg.etat.registres[8]).toBe(0x0f)
    expect(psg.etat.registres[7]).toBe(0xfe)
    expect(cpu.d[5] & 0xff).toBe(0x1c)
    // Période $11C = 284 → 2 MHz / (16 × 284) ≈ 440 Hz : le la
    expect(Math.round(psg.etat.frequence(0))).toBe(440)
  })

  it('la voie A produit bien un son carré à 440 Hz', () => {
    const ym = new Ym2149()
    ym.reset()
    ym.ecrire(0, 0x1c)
    ym.ecrire(1, 0x01)
    ym.ecrire(7, 0xfe)
    ym.ecrire(8, 15)
    const s = ym.generer(44100, 44100)
    expect(passages(s)).toBeGreaterThanOrEqual(438)
    expect(passages(s)).toBeLessThanOrEqual(442)
  })

  it('voie coupée par le mixeur ou volume 0 : silence', () => {
    const ym = new Ym2149()
    ym.reset()
    ym.ecrire(0, 0x1c)
    ym.ecrire(8, 15) // mixeur à $FF après reset : tout coupé... mais une voie coupée sort un niveau constant
    const s = ym.generer(4410, 44100)
    expect(passages(s.subarray(2000))).toBe(0)
  })

  it('enveloppe en décroissance (forme 0) : le son s’éteint', () => {
    const ym = new Ym2149()
    ym.reset()
    ym.ecrire(0, 0x1c)
    ym.ecrire(7, 0xfe)
    ym.ecrire(8, 0x10)
    ym.ecrire(11, 0x00)
    ym.ecrire(12, 0x08) // 2048 × 256 / 2 MHz ≈ 0,26 s
    ym.ecrire(13, 0)
    const s = ym.generer(44100, 44100)
    const amplitude = (a: Float32Array): number => a.reduce((m, v) => Math.max(m, Math.abs(v)), 0)
    expect(amplitude(s.subarray(0, 2000))).toBeGreaterThan(0.1)
    expect(amplitude(s.subarray(30000))).toBeLessThan(0.01)
  })

  it('le journal rejoue les écritures au bon moment', () => {
    const psg = new PsgSt()
    psg.reset(0)
    psg.ecrire(0xfe, 0, 7)
    psg.ecrire(0x1c, 0, 0)
    psg.ecrire(0x01, 0, 1)
    // Volume monté à la moitié de la seconde
    psg.ecrire(15, CPU_HZ / 2, 8)
    const s = psg.echantillons(CPU_HZ, 44100)
    expect(s.length).toBe(44100)
    expect(passages(s.subarray(0, 21000))).toBe(0)
    expect(passages(s.subarray(23000))).toBeGreaterThan(180)
  })
})

describe('XBIOS : Giaccess et Dosound', () => {
  it('Giaccess écrit (registre + $80) et lit', () => {
    const { psg, cpu, error } = run(`    MOVE.W #$88,-(SP)
    MOVE.W #12,-(SP)
    MOVE.W #28,-(SP)
    TRAP #14
    ADDQ.L #6,SP
    MOVE.W #8,-(SP)
    CLR.W -(SP)
    MOVE.W #28,-(SP)
    TRAP #14
    ADDQ.L #6,SP
    MOVE.L D0,D5
${PTERM0}`)
    expect(error).toBeUndefined()
    expect(psg.etat.registres[8]).toBe(12)
    expect(cpu.d[5] & 0xff).toBe(12)
  })

  it('Dosound joue la liste : registres, attente, rampe $81, fin', () => {
    const { psg, cpu, error } = run(`    PEA SON
    MOVE.W #32,-(SP)
    TRAP #14
    ADDQ.L #6,SP
    MOVEQ #19,D7
.vbl:
${VSYNC}
    DBF D7,.vbl
    PEA -1.W
    MOVE.W #32,-(SP)
    TRAP #14
    ADDQ.L #6,SP
    MOVE.L D0,D5
${PTERM0}
SON:
    DC.B 0,$1C,1,$01,7,$FE,8,15
    DC.B $FF,5
    DC.B $80,15,$81,8,-1,0
    DC.B $FF,0`)
    expect(error).toBeUndefined()
    // Au bout de 20 trames : attente de 5 pas puis rampe de 15 → 0, terminée
    expect(psg.etat.registres[0]).toBe(0x1c)
    expect(psg.etat.registres[8]).toBe(1)
    expect(cpu.d[5]).toBe(0)
  })

  it('Ctrl+G fait sonner la cloche au lieu d’afficher un caractère', () => {
    const { psg, cpu } = run(`    MOVE.W #7,-(SP)\n    MOVE.W #2,-(SP)\n    TRAP #1\n    ADDQ.L #4,SP\n${VSYNC}\n${VSYNC}\n${PTERM0}`)
    expect(cpu.output).toBe('')
    expect(psg.etat.registres[0]).toBe(0x34)
    expect(psg.etat.registres[13]).toBe(9)
    expect(cpu.cycles).toBeGreaterThan(CYCLES_PER_VBL)
  })
})
