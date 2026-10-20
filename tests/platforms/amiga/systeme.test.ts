import { describe, expect, it } from 'vitest'
import { lancer } from '../../helpers/amiga'
import { materielAmiga } from '../../../src/platforms/amiga/chipset'
import { CHIP_LIBRE_DEBUT, COPINIT, EXEC_BASE } from '../../../src/platforms/amiga/kickstart'
import { CYCLES_PAR_IMAGE } from '../../../src/platforms/amiga/machine'

const HELLO = `
    MOVEA.L 4.W,A6
    LEA dosname(PC),A1
    MOVEQ #0,D0
    JSR -552(A6)        ; OpenLibrary
    TST.L D0
    BEQ.S .fin
    MOVEA.L D0,A6
    JSR -60(A6)         ; Output
    MOVE.L D0,D1
    LEA texte(PC),A0
    MOVE.L A0,D2
    MOVEQ #fin_texte-texte,D3
    JSR -48(A6)         ; Write
    MOVEA.L A6,A1
    MOVEA.L 4.W,A6
    JSR -414(A6)        ; CloseLibrary
.fin:
    MOVEQ #0,D0
    RTS
dosname: DC.B 'dos.library',0
texte:   DC.B 'Bonjour Amiga !',10
fin_texte:
    EVEN
`

describe('Amiga — Kickstart simulé', () => {
  it('ExecBase en $4, programme lancé en mode utilisateur', () => {
    const { cpu, error } = lancer('    MOVE.L 4.W,D7\n    MOVE.W SR,D6\n    RTS')
    expect(error).toBeUndefined()
    expect(cpu.d[7]).toBe(EXEC_BASE)
    expect(cpu.d[6] & 0x2000).toBe(0)
    expect(cpu.halted).toBe(true)
  })

  it('Bonjour par dos.library (OpenLibrary, Output, Write, CloseLibrary)', () => {
    const { cpu, error, bilan } = lancer(HELLO)
    expect(error).toBeUndefined()
    expect(cpu.output).toBe('Bonjour Amiga !\n')
    expect(bilan?.problemes).toEqual([])
  })

  it('OpenLibrary refuse une version trop récente pour le Kickstart 1.3 (v36 = Kickstart 2.0)', () => {
    const { cpu } = lancer(`
    MOVEA.L 4.W,A6
    LEA nom(PC),A1
    MOVEQ #36,D0
    JSR -552(A6)
    MOVE.L D0,D7
    LEA nom(PC),A1
    MOVEQ #34,D0
    JSR -552(A6)
    MOVE.L D0,D6
    RTS
nom: DC.B 'graphics.library',0
    EVEN`)
    expect(cpu.d[7]).toBe(0)
    expect(cpu.d[6]).not.toBe(0)
  })

  it('AllocMem MEMF_CHIP|MEMF_CLEAR puis FreeMem : bilan propre ; oubli de FreeMem signalé', () => {
    const corps = (liberer: boolean) => `
    MOVEA.L 4.W,A6
    MOVE.L #10240,D0
    MOVE.L #$10002,D1
    JSR -198(A6)
    MOVE.L D0,D7
    ${liberer ? 'MOVEA.L D0,A1\n    MOVE.L #10240,D0\n    JSR -210(A6)' : ''}
    RTS`
    const ok = lancer(corps(true))
    expect(ok.cpu.d[7]).toBe(CHIP_LIBRE_DEBUT)
    expect(ok.bilan?.problemes).toEqual([])
    const fuite = lancer(corps(false))
    expect(fuite.bilan?.problemes.join(' ')).toMatch(/10240 octets/)
  })

  it('AllocMem sans MEMF_CHIP donne de la Slow RAM ($C00000) : invisible pour les puces', () => {
    const { cpu } = lancer('    MOVEA.L 4.W,A6\n    MOVE.L #100,D0\n    MOVEQ #0,D1\n    JSR -198(A6)\n    MOVE.L D0,D7\n    RTS')
    expect(cpu.d[7]).toBe(0xc00000)
  })

  it('Forbid sans Permit et appel inconnu', () => {
    const { bilan } = lancer('    MOVEA.L 4.W,A6\n    JSR -132(A6)\n    RTS')
    expect(bilan?.problemes.join(' ')).toMatch(/Forbid/)
    const { error } = lancer('    MOVEA.L 4.W,A6\n    JSR -342(A6)\n    RTS')
    expect(error).toMatch(/exec\.library, fonction -342/)
  })

  it('RawDoFmt formate des nombres (%d, %ld, %04lx, %s)', () => {
    const { cpu, error } = lancer(`
    MOVEA.L 4.W,A6
    LEA format(PC),A0
    LEA donnees(PC),A1
    LEA ecrire(PC),A2
    LEA tampon,A3
    JSR -522(A6)
    LEA tampon,A0
    MOVEQ #0,D7
.compte:
    TST.B (A0)+
    BEQ.S .fin
    ADDQ.L #1,D7
    BRA.S .compte
.fin:
    RTS
ecrire: MOVE.B D0,(A3)+
    RTS
format: DC.B 'n=%d L=%ld h=%04lx %s',0
    EVEN
donnees: DC.W -12
    DC.L 100000
    DC.L $BEEF
    DC.L chaine
chaine: DC.B 'ok',0
    EVEN
tampon: DS.B 64`)
    expect(error).toBeUndefined()
    const texte = cpu.memory.readCString(cpu.a[0] - cpu.d[7] - 1)
    expect(texte).toBe('n=-12 L=100000 h=beef ok')
  })

  it('Delay(50) dure une seconde de temps simulé ; la VBL du système tourne', () => {
    const { cpu, error } = lancer(`
    MOVEA.L 4.W,A6
    LEA dos(PC),A1
    JSR -408(A6)
    MOVEA.L D0,A6
    MOVEQ #50,D1
    JSR -198(A6)
    RTS
dos: DC.B 'dos.library',0
    EVEN`)
    expect(error).toBeUndefined()
    expect(cpu.cycles).toBeGreaterThanOrEqual(50 * CYCLES_PAR_IMAGE)
    expect(materielAmiga(cpu)!.numeroImage()).toBeGreaterThanOrEqual(50)
  })

  it('Read(Input()) lit une ligne tapée', () => {
    const { cpu, error } = lancer(
      `
    MOVEA.L 4.W,A6
    LEA dos(PC),A1
    JSR -408(A6)
    MOVEA.L D0,A6
    JSR -54(A6)
    MOVE.L D0,D1
    LEA tampon,A0
    MOVE.L A0,D2
    MOVEQ #40,D3
    JSR -42(A6)
    MOVE.L D0,D7
    RTS
dos: DC.B 'dos.library',0
    EVEN
tampon: DS.B 40`,
      { saisie: 'Yannick\n' }
    )
    expect(error).toBeUndefined()
    expect(cpu.d[7]).toBe(8)
  })

  it('Exception non traitée = Guru Meditation', () => {
    const { error } = lancer('    MOVE.W $1001,D0\n    RTS')
    expect(error).toMatch(/Guru Meditation #00000003/)
  })
})

describe('Amiga — puces custom', () => {
  it("L'écran du système : fond bleu $05A, barre blanche", () => {
    const { m } = lancer('    MOVE.L #200000,D0\n.b: SUBQ.L #1,D0\n    BNE.S .b\n    RTS', {}, 400000)
    expect(m.pixel(100, 100)).toBe(0x05a)
    expect(m.pixel(100, 2)).toBe(0xfff)
  })

  it('Liste Copper : dégradé sur COLOR00, bitplanes coupés', () => {
    const { m, error, bilan } = lancer(`
CUSTOM EQU $DFF000
    LEA CUSTOM,A5
    MOVE.W $1C(A5),D6       ; INTENAR
    MOVE.W $02(A5),D5       ; DMACONR
    MOVE.W #$7FFF,$9A(A5)
    MOVE.W #$7FFF,$96(A5)
    MOVE.L #copper,$80(A5)
    MOVE.W D0,$88(A5)        ; COPJMP1
    MOVE.W #$8280,$96(A5)    ; DMAEN + COPEN
    MOVEQ #2,D7
.image:
    CMP.B #$FF,$06(A5)
    BNE.S .image
.attente:
    CMP.B #$FF,$06(A5)
    BEQ.S .attente
    DBF D7,.image
    ; rendre la main
    MOVEA.L 4.W,A6
    LEA gfx(PC),A1
    JSR -408(A6)
    MOVEA.L D0,A0
    MOVE.L 38(A0),$80(A5)
    MOVE.W #$7FFF,$96(A5)
    OR.W #$8000,D5
    MOVE.W D5,$96(A5)
    OR.W #$C000,D6
    MOVE.W D6,$9A(A5)
    RTS
gfx: DC.B 'graphics.library',0
    EVEN
copper:
    DC.W $0100,$0200
    DC.W $0180,$0000
    DC.W $4007,$FFFE
    DC.W $0180,$0F00
    DC.W $8007,$FFFE
    DC.W $0180,$00F0
    DC.W $FFFF,$FFFE`, { captures: [1] })
    expect(error).toBeUndefined()
    expect(bilan?.problemes).toEqual([])
    // Ligne $30 (y = 4) : noir ; $50 (y = $24) : rouge ; $90 (y = $64) : vert
    expect(m.pixel(10, 4, 1)).toBe(0x000)
    expect(m.pixel(10, 0x24, 1)).toBe(0xf00)
    expect(m.pixel(300, 0x64, 1)).toBe(0x0f0)
    // Après la sortie, le système a retrouvé son écran
    expect(m.regs[(0x80 >> 1) + 1]).toBe(COPINIT & 0xffff)
  })
})
