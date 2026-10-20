import { describe, expect, it } from 'vitest'
import { Memory } from '../../../src/cpu/memory'
import { blit, minterm, registresBlitterVides } from '../../../src/platforms/amiga/blitter'
import { CYCLES_PAR_IMAGE } from '../../../src/platforms/amiga/machine'
import { lancer } from '../../helpers/amiga'

/** Prend la main (système coupé), exécute `corps`, attend `images` images, puis s'arrête sans rendre la main. */
const prendre = (corps: string, donnees = '', images = 2) => `
CUSTOM EQU $DFF000
    LEA CUSTOM,A5
    MOVE.W #$7FFF,$9A(A5)
    MOVE.W #$7FFF,$96(A5)
${corps}
    MOVEQ #${images - 1},D7
.image:
    CMP.B #$FF,$06(A5)
    BNE.S .image
.att:
    CMP.B #$FF,$06(A5)
    BEQ.S .att
    DBF D7,.image
    RTS
${donnees}`

describe('Amiga — affichage', () => {
  it('un plan basse résolution 320 × 256 : pixels, palette, défilement fin (BPLCON1)', () => {
    const copper = (scroll: number) => `
    SECTION chip,DATA_C
copper:
    DC.W $008E,$2C81,$0090,$2CC1,$0092,$0038,$0094,$00D0
    DC.W $0100,$1200,$0102,${scroll},$0108,0,$010A,0
    DC.W $0180,$0000,$0182,$0FF0
    DC.W $00E0
pth: DC.W 0,$00E2
ptl: DC.W 0
    DC.W $FFFF,$FFFE
plan: DS.B 40*256`
    const corps = `
    LEA plan,A0
    MOVE.B #$80,(A0)          ; pixel (0,0)
    MOVE.B #$01,40*10+5(A0)   ; pixel (47,10)
    MOVE.L A0,D0
    MOVE.W D0,ptl
    SWAP D0
    MOVE.W D0,pth
    MOVE.L #copper,$80(A5)
    MOVE.W D0,$88(A5)
    MOVE.W #$8380,$96(A5)`
    const r = lancer(prendre(corps, copper(0)), { captures: [1] })
    expect(r.error).toBeUndefined()
    expect(r.m.pixel(0, 0, 1)).toBe(0xff0)
    expect(r.m.pixel(1, 0, 1)).toBe(0x000)
    expect(r.m.pixel(47, 10, 1)).toBe(0xff0)
    // Hors de la fenêtre (DIW) : bordure = COLOR00
    expect(r.m.pixel(-5, 10, 1)).toBe(0x000)
    const d = lancer(prendre(corps, copper(3)), { captures: [1] })
    expect(d.m.pixel(3, 0, 1)).toBe(0xff0)
    expect(d.m.pixel(50, 10, 1)).toBe(0xff0)
  })

  it('sprite posé par le programme : visible en (x, y), transparent ailleurs', () => {
    const r = lancer(
      prendre(
        `
    LEA copper_spr,A0
    MOVE.L #sprite,D0
    MOVE.W D0,6(A0)
    SWAP D0
    MOVE.W D0,2(A0)
    MOVE.L #copper,$80(A5)
    MOVE.W D0,$88(A5)
    MOVE.W #$83A0,$96(A5)`,
        `
    SECTION chip,DATA_C
copper:
    DC.W $0100,$0200,$0180,$0000,$01A2,$0F00,$01A4,$000F,$01A6,$0FFF
copper_spr:
    DC.W $0120,0,$0122,0
    DC.W $FFFF,$FFFE
; VSTART = $40, HSTART = $90 (x = $90 - $81 + 1 = 16... à 1 pixel près), 2 lignes
sprite:
    DC.W $4048,$4200
    DC.W $8000,$0000          ; ligne 1 : un pixel couleur 1 (17)
    DC.W $0000,$C000          ; ligne 2 : deux pixels couleur 2 (18)
    DC.W 0,0`
      ),
      { captures: [1] }
    )
    expect(r.error).toBeUndefined()
    const x = 0x90 - 0x81
    expect(r.m.pixel(x, 0x40 - 0x2c, 1)).toBe(0xf00)
    expect(r.m.pixel(x + 1, 0x40 - 0x2c, 1)).toBe(0x000)
    expect(r.m.pixel(x + 1, 0x41 - 0x2c, 1)).toBe(0x00f)
    expect(r.m.pixel(x, 0x42 - 0x2c, 1)).toBe(0x000)
  })
})

describe('Amiga — Blitter', () => {
  const mem = () => new Memory(0x1000000)

  it('minterms : $F0 = A, $CA = A·B + ¬A·C, $0F = ¬A', () => {
    expect(minterm(0xf0, 0x1234, 0, 0)).toBe(0x1234)
    expect(minterm(0xca, 0xff00, 0x1234, 0xabcd)).toBe(0x12cd)
    expect(minterm(0x0f, 0x00ff, 0, 0)).toBe(0xff00)
  })

  it('copie A → D avec décalage de 4 bits et masque du dernier mot', () => {
    const m = mem()
    m.writeU16(0x1000, 0xf00f)
    m.writeU16(0x1002, 0x0000)
    const r = registresBlitterVides()
    r.con0 = 0x49f0 // ASH = 4, A et D, D = A
    r.apt = 0x1000
    r.dpt = 0x2000
    r.alwm = 0x0000
    blit(r, (1 << 6) | 2, m)
    expect(m.readU16(0x2000)).toBe(0x0f00)
    expect(m.readU16(0x2002)).toBe(0xf000)
  })

  it('remplissage inclusif et exclusif (mode descendant)', () => {
    for (const [con1, attendu] of [
      [0x000a, 0x0ff0],
      [0x0012, 0x07f0]
    ] as const) {
      const m = mem()
      m.writeU16(0x1000, 0x0810)
      const r = registresBlitterVides()
      r.con0 = 0x09f0
      r.con1 = con1
      r.apt = 0x1000
      r.dpt = 0x2000
      blit(r, (1 << 6) | 1, m)
      expect(m.readU16(0x2000)).toBe(attendu)
    }
  })

  it('BZERO : le blit n’a produit que des zéros', () => {
    const r = registresBlitterVides()
    r.con0 = 0x0900
    expect(blit(r, (4 << 6) | 4, mem()).zero).toBe(true)
  })

  // Routine de tracé de ligne (celle du cours), comparée à Bresenham dans les 8 octants
  const LIGNE = `
; D0,D1 = x1,y1 ; D2,D3 = x2,y2 ; A0 = plan de 40 octets par ligne
ligne:
    MOVEQ #0,D4
    SUB.W D0,D2
    BPL.S .dx
    NEG.W D2
    MOVEQ #1,D5
    BRA.S .y
.dx:
    MOVEQ #0,D5
.y:
    SUB.W D1,D3
    BPL.S .dy
    NEG.W D3
    MOVEQ #1,D6
    BRA.S .oct
.dy:
    MOVEQ #0,D6
.oct:
    CMP.W D3,D2
    BLT.S .vertical
    BSET #4,D4
    TST.W D6
    BEQ.S .h1
    BSET #3,D4
.h1:
    TST.W D5
    BEQ.S .calcul
    BSET #2,D4
    BRA.S .calcul
.vertical:
    TST.W D5
    BEQ.S .v1
    BSET #3,D4
.v1:
    TST.W D6
    BEQ.S .v2
    BSET #2,D4
.v2:
    EXG D2,D3
.calcul:
    MULU #40,D1
    ADDA.L D1,A0
    MOVE.W D0,D1
    LSR.W #3,D1
    AND.W #$FFFE,D1
    ADDA.W D1,A0
    AND.W #15,D0
    ROR.W #4,D0
    OR.W #$0BCA,D0
    LSL.W #2,D3
    ADD.W D2,D2
    MOVE.W D3,D5
    SUB.W D2,D5
    BPL.S .signe
    BSET #6,D4
.signe:
    MOVE.W D3,D6
    SUB.W D2,D6
    SUB.W D2,D6
    BSET #0,D4
    LSR.W #1,D2
    ADDQ.W #1,D2
    LSL.W #6,D2
    ADDQ.W #2,D2
.attente:
    BTST #6,2(A5)
    BNE.S .attente
    MOVE.W D0,$40(A5)
    MOVE.W D4,$42(A5)
    MOVE.L #-1,$44(A5)
    MOVE.W #$8000,$74(A5)
    MOVE.W #$FFFF,$72(A5)
    MOVE.W D3,$62(A5)
    MOVE.W D6,$64(A5)
    MOVE.W D5,$52(A5)
    MOVE.W #40,$60(A5)
    MOVE.W #40,$66(A5)
    MOVE.L A0,$48(A5)
    MOVE.L A0,$54(A5)
    MOVE.W D2,$58(A5)
    RTS`

  function bresenham(x1: number, y1: number, x2: number, y2: number): Set<string> {
    const points = new Set<string>()
    const dx = Math.abs(x2 - x1)
    const dy = Math.abs(y2 - y1)
    const sx = x2 >= x1 ? 1 : -1
    const sy = y2 >= y1 ? 1 : -1
    const xMajeur = dx >= dy
    const dmax = xMajeur ? dx : dy
    const dmin = xMajeur ? dy : dx
    let d = 4 * dmin - 2 * dmax
    let x = x1
    let y = y1
    for (let i = 0; i <= dmax; i++) {
      points.add(`${x},${y}`)
      if (d >= 0) {
        d += 4 * (dmin - dmax)
        if (xMajeur) y += sy
        else x += sx
      } else d += 4 * dmin
      if (xMajeur) x += sx
      else y += sy
    }
    return points
  }

  for (const [x2, y2] of [
    [150, 60], [120, 10], [80, 10], [30, 40], [20, 90], [70, 140], [110, 150], [160, 110], [100, 75]
  ]) {
    it(`ligne de (100,75) à (${x2},${y2}) = Bresenham`, () => {
      const r = lancer(
        `
    LEA $DFF000,A5
    MOVE.W #$8240,$96(A5)
    MOVE.W #100,D0
    MOVE.W #75,D1
    MOVE.W #${x2},D2
    MOVE.W #${y2},D3
    LEA $30000,A0
    BSR ligne
.fin:
    BTST #6,2(A5)
    BNE.S .fin
    RTS
${LIGNE}`
      )
      expect(r.error).toBeUndefined()
      const attendus = bresenham(100, 75, x2, y2)
      const trouves = new Set<string>()
      const debut = 0x30000
      for (let y = 0; y < 200; y++) {
        for (let x = 0; x < 320; x++) {
          if (r.cpu.memory.readU8(debut + y * 40 + (x >> 3)) & (0x80 >> (x & 7))) trouves.add(`${x},${y}`)
        }
      }
      expect([...trouves].sort()).toEqual([...attendus].sort())
    })
  }
})

describe('Amiga — interruptions et entrées', () => {
  it('routine VBL personnelle en $6C : appelée 50 fois par seconde', () => {
    const r = lancer(
      `
    LEA $DFF000,A5
    MOVE.W #$7FFF,$9A(A5)
    MOVE.L $6C.W,ancien
    MOVE.L #vbl,$6C.W
    MOVE.W #$C020,$9A(A5)     ; INTEN + VERTB
.attente:
    CMP.W #10,compteur
    BNE.S .attente
    MOVE.W #$7FFF,$9A(A5)
    MOVE.L ancien,$6C.W
    MOVE.W #$E02C,$9A(A5)
    RTS
vbl:
    ADDQ.W #1,compteur
    MOVE.W #$0020,$DFF09C
    RTE
compteur: DC.W 0
ancien: DC.L 0`,
      {},
      2000000
    )
    expect(r.error).toBeUndefined()
    expect(r.cpu.halted).toBe(true)
    expect(r.cpu.cycles).toBeGreaterThan(9 * CYCLES_PAR_IMAGE)
    expect(r.bilan?.problemes).toEqual([])
  })

  it('serveur AddIntServer sur la VBL', () => {
    const r = lancer(
      `
    MOVEA.L 4.W,A6
    LEA serveur(PC),A1
    MOVEQ #5,D0
    JSR -168(A6)
.attente:
    CMP.W #5,compteur
    BLT.S .attente
    LEA serveur(PC),A1
    MOVEQ #5,D0
    JSR -174(A6)
    RTS
code:
    ADDQ.W #1,(A1)
    MOVEQ #0,D0
    RTS
serveur: DC.L 0,0
    DC.B 2,0
    DC.L 0
    DC.L compteur
    DC.L code
compteur: DC.W 0`,
      {},
      2000000
    )
    expect(r.error).toBeUndefined()
    expect(r.cpu.halted).toBe(true)
  })

  it('timer A de la CIA-B : interruption de niveau 6 (EXTER)', () => {
    const r = lancer(
      `
    LEA $DFF000,A5
    MOVE.L $78.W,ancien
    MOVE.L #niv6,$78.W
    MOVE.B #$7F,$BFDD00       ; ICR : tout masquer
    MOVE.B #$81,$BFDD00       ; ICR : timer A autorisé
    MOVE.B #$C4,$BFD400       ; TALO  (709379 / 50 = 14187 = $376B... ici $1BC4)
    MOVE.B #$1B,$BFD500       ; TAHI
    MOVE.B #$11,$BFDE00       ; CRA : START + LOAD, continu
    MOVE.W #$A000,$9A(A5)     ; INTEN + EXTER
.attente:
    CMP.W #20,compteur
    BLT.S .attente
    MOVE.B #$00,$BFDE00
    MOVE.L ancien,$78.W
    RTS
niv6:
    TST.B $BFDD00
    ADDQ.W #1,compteur
    MOVE.W #$2000,$DFF09C
    RTE
compteur: DC.W 0
ancien: DC.L 0`,
      {},
      3000000
    )
    expect(r.error).toBeUndefined()
    expect(r.cpu.halted).toBe(true)
    // 20 périodes de $1BC5 tops de 10 cycles
    expect(r.cpu.cycles).toBeGreaterThanOrEqual(20 * 0x1bc5 * 10)
  })

  it('clavier lu à la CIA-A (NOT puis ROR #1) et bouton gauche de la souris', () => {
    const r = lancer(
      `
    LEA $DFF000,A5
    MOVE.W #$7FFF,$9A(A5)     ; plus d'interruptions : on lit la CIA soi-même
.touche:
    BTST #3,$BFED01
    BEQ.S .touche
    MOVE.B $BFEC01,D0
    NOT.B D0
    ROR.B #1,D0
    MOVE.B D0,D7
.souris:
    BTST #6,$BFE001
    BNE.S .souris
    MOVE.W #$E02C,$9A(A5)
    RTS`,
      { evenements: [{ image: 2, touche: 0x45 }, { image: 4, boutonGauche: true }] },
      3000000
    )
    expect(r.error).toBeUndefined()
    expect(r.cpu.halted).toBe(true)
    expect(r.cpu.d[7] & 0xff).toBe(0x45) // Échap, touche enfoncée
  })

  it('joystick (port 2) : JOY1DAT et feu sur la CIA-A', () => {
    const r = lancer(
      `
.attente:
    BTST #7,$BFE001
    BNE.S .attente
    MOVE.W $DFF00C,D7
    RTS`,
      { evenements: [{ image: 1, joystick: 0x80 | 8 | 1 }] },
      2000000
    )
    // droite : bit 1 ; haut : bit 8 XOR bit 9 (gauche = 0) → bit 8 ; bas : bit 0 XOR bit 1 → 1
    expect(r.cpu.d[7] & 0xffff).toBe(0x0103)
  })

  it('Paula : un son en boucle déclenche l’interruption AUD0 à chaque bloc', () => {
    const r = lancer(
      `
    LEA $DFF000,A5
    MOVE.W #$7FFF,$9A(A5)
    MOVE.L #son,$A0(A5)
    MOVE.W #4,$A4(A5)         ; 4 mots = 8 octets
    MOVE.W #428,$A6(A5)
    MOVE.W #64,$A8(A5)
    MOVE.W #$8201,$96(A5)     ; DMAEN + AUD0EN
    MOVEQ #9,D7
.bloc:
    BTST #7,$1F(A5)           ; INTREQR, bit 7 = AUD0
    BEQ.S .bloc
    MOVE.W #$0080,$9C(A5)
    DBF D7,.bloc
    MOVE.W #$0001,$96(A5)
    MOVE.W #$E02C,$9A(A5)
    RTS
son: DC.B 0,64,127,64,0,-64,-128,-64`,
      {},
      2000000
    )
    expect(r.error).toBeUndefined()
    expect(r.cpu.halted).toBe(true)
    // 10 interruptions ≈ 9 blocs de 8 octets × 428 × 2 cycles
    expect(r.cpu.cycles).toBeGreaterThan(9 * 8 * 428 * 2)
  })

  it('alerte : blit lancé sans attendre la fin du précédent', () => {
    const r = lancer(`
    LEA $DFF000,A5
    MOVE.W #$8240,$96(A5)
    MOVE.W #$0100,$40(A5)
    MOVE.W #0,$42(A5)
    MOVE.L #$20000,$54(A5)
    MOVE.W #(100<<6)|20,$58(A5)
    MOVE.W #(100<<6)|20,$58(A5)
    RTS`)
    expect(r.m.alertes.join(' ')).toMatch(/WaitBlit/)
  })
})
