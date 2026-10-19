import { describe, expect, it } from 'vitest'
import { assemble } from '../../helpers/assemble'
import { Cpu } from '../../../src/cpu/cpu'
import { createAtariSt, type AtariStOptions } from '../../../src/platforms/atari-st'
import { CYCLES_PER_VBL } from '../../../src/platforms/atari-st/machine'
import { materielAtari } from '../../../src/platforms/atari-st/materiel'
import { CODE, toucheSt } from '../../../src/platforms/atari-st/clavier'
import { JOY } from '../../../src/platforms/atari-st/ikbd'

/** Lance le programme ; `pendant` est appelé une fois, au cycle `quand`. */
function run(body: string, options: AtariStOptions = {}, pendant?: { quand: number; faire: (cpu: Cpu) => void }, maxSteps = 400000) {
  const asm = assemble(`    ORG $1000\nSTART:\n${body}\n`)
  if (!asm.success) throw new Error('assemble failed: ' + JSON.stringify(asm.errors))
  const cpu = new Cpu(createAtariSt(options))
  cpu.reset(asm.baseAddress)
  cpu.loadProgram(asm.baseAddress, asm.binary)
  let error: string | undefined
  let fait = false
  for (let i = 0; i < maxSteps && !cpu.halted; i++) {
    if (pendant && !fait && cpu.cycles >= pendant.quand) {
      pendant.faire(cpu)
      fait = true
    }
    error = cpu.step().error ?? error
  }
  return { cpu, error }
}

const VSYNC = '    MOVE.W #37,-(SP)\n    TRAP #14\n    ADDQ.L #2,SP'
const PTERM0 = '    CLR.W -(SP)\n    TRAP #1'
const ATTENDRE_10_VBL = `    MOVEQ #9,D7\n.vbl:\n${VSYNC}\n    DBF D7,.vbl`

describe('MFP 68901', () => {
  it('le timer C du TOS fait avancer _hz_200 à 200 Hz', () => {
    const { cpu, error } = run(`${ATTENDRE_10_VBL}\n    MOVE.L $4BA.W,D5\n${PTERM0}`)
    expect(error).toBeUndefined()
    // 10 trames = 0,2 s ≈ 40 ticks
    expect(cpu.d[5]).toBeGreaterThanOrEqual(39)
    expect(cpu.d[5]).toBeLessThanOrEqual(41)
  })

  it('timer A en mode délai : sa routine en $134 est appelée à la bonne fréquence', () => {
    // ÷200, donnée 123 : 2 457 600 / 200 / 123 ≈ 99,9 Hz → ≈ 20 fois en 0,2 s
    const { cpu, error } = run(`    MOVE.L #TIMERA,$134.W
    CLR.B $FFFFFA19.W
    MOVE.B #123,$FFFFFA1F.W
    MOVE.B #7,$FFFFFA19.W
    BSET #5,$FFFFFA07.W
    BSET #5,$FFFFFA13.W
${ATTENDRE_10_VBL}
    CLR.B $FFFFFA19.W
    MOVE.W COMPTE,D5
${PTERM0}
TIMERA:
    ADDQ.W #1,COMPTE
    BCLR #5,$FFFFFA0F.W
    RTE
COMPTE: DC.W 0`)
    expect(error).toBeUndefined()
    expect(cpu.d[5]).toBeGreaterThanOrEqual(19)
    expect(cpu.d[5]).toBeLessThanOrEqual(21)
  })

  it('le compteur d’un timer se lit en direct', () => {
    const { cpu } = run(`    CLR.B $FFFFFA19.W
    MOVE.B #200,$FFFFFA1F.W
    MOVE.B #7,$FFFFFA19.W
    MOVE.B $FFFFFA1F.W,D1
    NOP
    NOP
    MOVE.B $FFFFFA1F.W,D2
${PTERM0}`, { userMode: false })
    expect(cpu.d[1] & 0xff).toBe(200)
    expect(cpu.d[2] & 0xff).toBe(200) // ÷200 : un décrément toutes les 652 cycles
  })

  it('timer B en comptage de lignes : des rasters, une couleur différente par ligne', () => {
    const { cpu, error } = run(`    MOVE.L #TIMERB,$120.W
    CLR.B $FFFFFA1B.W
    MOVE.B #1,$FFFFFA21.W
    MOVE.B #8,$FFFFFA1B.W
    BSET #0,$FFFFFA07.W
    BSET #0,$FFFFFA13.W
    MOVE.L #VBL,$70.W
${VSYNC}
${VSYNC}
${VSYNC}
    CLR.B $FFFFFA1B.W
${PTERM0}
VBL:
    CLR.W $FFFF8240.W
    RTE
TIMERB:
    ADDQ.W #1,$FFFF8240.W
    BCLR #0,$FFFFFA0F.W
    RTE`, { userMode: false })
    expect(error).toBeUndefined()
    const palettes = materielAtari(cpu)!.palettesParLigne()!
    expect(palettes).not.toBeNull()
    // Couleur 0 de la ligne n = n (masquée sur 3 bits par composante)
    expect(palettes[0 * 16]).toBe(0)
    expect(palettes[1 * 16]).toBe(1)
    expect(palettes[5 * 16]).toBe(5)
  })
})

describe('Clavier IKBD et ACIA', () => {
  it('une touche tapée pendant l’exécution arrive à Cnecin (code ASCII et code clavier)', () => {
    const { cpu, error } = run(
      `    MOVE.W #8,-(SP)\n    TRAP #1\n    ADDQ.L #2,SP\n    MOVE.L D0,D5\n${PTERM0}`,
      { clavierInteractif: true },
      { quand: 3 * CYCLES_PER_VBL, faire: (c) => toucheSt(c, 0x1e, true, 'q') }
    )
    expect(error).toBeUndefined()
    expect(cpu.d[5]).toBe((0x1e << 16) | 0x71)
    // Elle n'est arrivée qu'au bout de 3 trames : Cnecin a vraiment attendu
    expect(cpu.cycles).toBeGreaterThan(3 * CYCLES_PER_VBL)
  })

  it('Shift + touche, flèche (ASCII 0), Échap', () => {
    const { cpu, error } = run(
      `    BSR LIRE\n    MOVE.L D0,D3\n    BSR LIRE\n    MOVE.L D0,D4\n    BSR LIRE\n    MOVE.L D0,D5\n${PTERM0}
LIRE:
    MOVE.W #8,-(SP)\n    TRAP #1\n    ADDQ.L #2,SP\n    RTS`,
      { clavierInteractif: true },
      {
        quand: 1000,
        faire: (c) => {
          toucheSt(c, CODE.shiftGauche, true)
          toucheSt(c, 0x1e, true, 'Q', true)
          toucheSt(c, 0x1e, false)
          toucheSt(c, CODE.shiftGauche, false)
          toucheSt(c, CODE.bas, true)
          toucheSt(c, CODE.echap, true, 'Escape')
        }
      }
    )
    expect(error).toBeUndefined()
    expect(cpu.d[3]).toBe((0x1e << 16) | 0x51)
    expect(cpu.d[4]).toBe(CODE.bas << 16)
    expect(cpu.d[5]).toBe((CODE.echap << 16) | 0x1b)
  })

  it('joyvec reçoit le paquet joystick : état du joystick 1 en 2(A0)', () => {
    const { cpu, error } = run(
      `    MOVE.W #34,-(SP)\n    TRAP #14\n    ADDQ.L #2,SP
    MOVEA.L D0,A0
    MOVE.L #JOY,24(A0)
.attente:
    TST.B ETAT
    BEQ.S .attente
    MOVE.B ETAT,D5
    MOVE.B ENTETE,D6
${PTERM0}
JOY:
    MOVE.B (A0),ENTETE
    MOVE.B 2(A0),ETAT
    RTS
ETAT: DC.B 0
ENTETE: DC.B 0`,
      { userMode: false },
      { quand: 2000, faire: (c) => materielAtari(c)!.ikbd.joystick(1, JOY.haut | JOY.feu) }
    )
    expect(error).toBeUndefined()
    expect(cpu.d[5] & 0xff).toBe(0x81)
    expect(cpu.d[6] & 0xff).toBe(0xff)
  })

  it('un programme peut détourner $118 et lire lui-même l’ACIA en $FFFC02', () => {
    const { cpu, error } = run(
      `    MOVE.L #ACIA,$118.W
.attente:
    TST.B CODE
    BEQ.S .attente
    MOVE.B CODE,D5
${PTERM0}
ACIA:
    MOVE.B $FFFFFC02.W,CODE
    BCLR #6,$FFFFFA11.W
    RTE
CODE: DC.B 0`,
      { userMode: false },
      { quand: 2000, faire: (c) => toucheSt(c, CODE.espace, true, ' ') }
    )
    expect(error).toBeUndefined()
    expect(cpu.d[5] & 0xff).toBe(CODE.espace)
  })

  it('commande $16 envoyée à l’IKBD : réponse $FD, joy0 et joy1 dans les deux premiers octets', () => {
    const { cpu, error } = run(
      `    MOVE.W #34,-(SP)\n    TRAP #14\n    ADDQ.L #2,SP
    MOVEA.L D0,A0
    MOVE.L #JOY,24(A0)
    MOVE.B #$15,$FFFFFC02.W
    MOVE.L #20000,D0
.pause:
    SUBQ.L #1,D0
    BNE.S .pause
    MOVE.B #$16,$FFFFFC02.W
.attente:
    TST.B FAIT
    BEQ.S .attente
    MOVE.W PAQUET,D5
${PTERM0}
JOY:
    MOVE.B (A0),PAQUET
    MOVE.B 1(A0),PAQUET+1
    ST FAIT
    RTS
PAQUET: DC.W 0
FAIT: DC.B 0`,
      { userMode: false },
      { quand: 100000, faire: (c) => materielAtari(c)!.ikbd.joystick(1, JOY.droite) }
    )
    expect(error).toBeUndefined()
    expect(cpu.d[5] & 0xffff).toBe(0x0008)
  })

  it('événements programmés : touche à l’image 5, joystick à l’image 8', () => {
    const { cpu, error } = run(
      `    MOVE.W #8,-(SP)
    TRAP #1
    ADDQ.L #2,SP
    MOVE.L D0,D5
    MOVE.L $466.W,D6
${PTERM0}`,
      { clavierInteractif: true, evenements: [{ image: 5, touche: CODE.echap }] }
    )
    expect(error).toBeUndefined()
    expect(cpu.d[5]).toBe((CODE.echap << 16) | 0x1b)
    expect(cpu.d[6]).toBe(5)
  })
})
