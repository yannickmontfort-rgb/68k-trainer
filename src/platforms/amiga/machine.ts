/**
 * Carte mémoire et constantes d'un Amiga 500 PAL (OCS, Kickstart 1.3) tel que simulé par 68k
 * Trainer. Références : Amiga Hardware Reference Manual (3e éd.), Amiga Intern (Abacus, 1992),
 * La Bible de l'Amiga (Micro Application, 1989).
 */

/** Horloge du 68000 d'un Amiga PAL : 7,09379 MHz. */
export const CPU_HZ = 7093790
/** Une ligne PAL = 227 cycles « couleur » (horloge des puces, 3,55 MHz) = 454 cycles du 68000. */
export const CYCLES_COULEUR_PAR_LIGNE = 227
export const CYCLES_PAR_LIGNE = CYCLES_COULEUR_PAR_LIGNE * 2
/** Image PAL non entrelacée : 313 lignes (« long frame »), 50 images par seconde. */
export const LIGNES_PAR_IMAGE = 313
export const CYCLES_PAR_IMAGE = CYCLES_PAR_LIGNE * LIGNES_PAR_IMAGE
/** Horloge de Paula (périodes du son) : la moitié de celle du 68000. */
export const PAULA_HZ = CPU_HZ / 2
/** Horloge E des CIA (timers) : un dixième de celle du 68000. */
export const E_HZ = CPU_HZ / 10

/** Mémoire. */
export const CHIP_TAILLE = 0x80000 // 512 Ko de Chip RAM
/** Les puces (Agnus) n'adressent que 512 Ko : leurs pointeurs sont pris modulo cette taille. */
export const MASQUE_DMA = CHIP_TAILLE - 2
export const SLOW_DEBUT = 0xc00000 // 512 Ko de « Slow RAM » (extension A501 sous la trappe)
export const SLOW_FIN = 0xc80000
export const ROM_DEBUT = 0xfc0000 // Kickstart 256 Ko
export const ROM_FIN = 0x1000000

/** Puces custom (Agnus, Denise, Paula) et CIA. */
export const CUSTOM = 0xdff000
export const CUSTOM_FIN = 0xdff200
/** CIA-A : octets impairs, un registre tous les $100 (PRA = $BFE001, ICR = $BFED01...). */
export const CIAA = 0xbfe001
/** CIA-B : octets pairs (PRA = $BFD000...). */
export const CIAB = 0xbfd000

/** Fenêtre de l'écran simulé (en coordonnées du faisceau) : un peu de bordure autour de l'image standard. */
export const ECRAN_PREMIERE_LIGNE = 0x1c
export const ECRAN_LIGNES = 288
/** Abscisses en pixels basse résolution (unités de DIWSTRT) : $71 à $1D1 = 352 pixels. */
export const ECRAN_X_DEBUT = 0x71
export const ECRAN_LARGEUR_BASSE = 352
/** Le tampon d'image est en haute résolution (2 colonnes par pixel basse résolution). */
export const ECRAN_LARGEUR = ECRAN_LARGEUR_BASSE * 2
/** Coin haut gauche de l'image standard (DIWSTRT = $2C81) : origine des coordonnées des exercices. */
export const ORIGINE_X = 0x81
export const ORIGINE_Y = 0x2c

/** Registres custom ($DFF000 + décalage). Noms du Hardware Reference Manual. */
export const R = {
  BLTDDAT: 0x000,
  DMACONR: 0x002,
  VPOSR: 0x004,
  VHPOSR: 0x006,
  DSKDATR: 0x008,
  JOY0DAT: 0x00a,
  JOY1DAT: 0x00c,
  CLXDAT: 0x00e,
  ADKCONR: 0x010,
  POT0DAT: 0x012,
  POT1DAT: 0x014,
  POTGOR: 0x016,
  SERDATR: 0x018,
  DSKBYTR: 0x01a,
  INTENAR: 0x01c,
  INTREQR: 0x01e,
  VPOSW: 0x02a,
  VHPOSW: 0x02c,
  COPCON: 0x02e,
  POTGO: 0x034,
  JOYTEST: 0x036,
  BLTCON0: 0x040,
  BLTCON1: 0x042,
  BLTAFWM: 0x044,
  BLTALWM: 0x046,
  BLTCPTH: 0x048,
  BLTCPTL: 0x04a,
  BLTBPTH: 0x04c,
  BLTBPTL: 0x04e,
  BLTAPTH: 0x050,
  BLTAPTL: 0x052,
  BLTDPTH: 0x054,
  BLTDPTL: 0x056,
  BLTSIZE: 0x058,
  BLTCMOD: 0x060,
  BLTBMOD: 0x062,
  BLTAMOD: 0x064,
  BLTDMOD: 0x066,
  BLTCDAT: 0x070,
  BLTBDAT: 0x072,
  BLTADAT: 0x074,
  COP1LCH: 0x080,
  COP1LCL: 0x082,
  COP2LCH: 0x084,
  COP2LCL: 0x086,
  COPJMP1: 0x088,
  COPJMP2: 0x08a,
  DIWSTRT: 0x08e,
  DIWSTOP: 0x090,
  DDFSTRT: 0x092,
  DDFSTOP: 0x094,
  DMACON: 0x096,
  CLXCON: 0x098,
  INTENA: 0x09a,
  INTREQ: 0x09c,
  ADKCON: 0x09e,
  AUD0LCH: 0x0a0,
  BPL1PTH: 0x0e0,
  BPLCON0: 0x100,
  BPLCON1: 0x102,
  BPLCON2: 0x104,
  BPL1MOD: 0x108,
  BPL2MOD: 0x10a,
  BPL1DAT: 0x110,
  SPR0PTH: 0x120,
  SPR0POS: 0x140,
  COLOR00: 0x180
} as const

/** Nom d'un registre custom (pour le débogueur et les messages). */
export function nomRegistre(decalage: number): string {
  const d = decalage & 0x1fe
  for (const [nom, v] of Object.entries(R)) if (v === d) return nom
  if (d >= 0x0a0 && d < 0x0e0) {
    const voie = (d - 0x0a0) >> 4
    const r = ['LCH', 'LCL', 'LEN', 'PER', 'VOL', 'DAT', '?', '?'][(d & 0xf) >> 1]
    return `AUD${voie}${r}`
  }
  if (d >= 0x0e0 && d < 0x0f8) return `BPL${((d - 0x0e0) >> 2) + 1}PT${d & 2 ? 'L' : 'H'}`
  if (d >= 0x110 && d < 0x11c) return `BPL${((d - 0x110) >> 1) + 1}DAT`
  if (d >= 0x120 && d < 0x140) return `SPR${(d - 0x120) >> 2}PT${d & 2 ? 'L' : 'H'}`
  if (d >= 0x140 && d < 0x180) return `SPR${(d - 0x140) >> 3}${['POS', 'CTL', 'DATA', 'DATB'][(d & 7) >> 1]}`
  if (d >= 0x180 && d < 0x1c0) return `COLOR${String((d - 0x180) >> 1).padStart(2, '0')}`
  return `$${(0xdff000 + d).toString(16).toUpperCase()}`
}

/** Décalage d'un registre à partir de son nom (« COLOR00 », « AUD0PER », « BPL1PTH »…), ou undefined. */
export function decalageRegistre(nom: string): number | undefined {
  const n = nom.toUpperCase()
  for (let d = 0; d < 0x200; d += 2) if (nomRegistre(d) === n) return d
  return undefined
}

/** Bits de DMACON. */
export const DMA = {
  AUD0: 0x0001,
  AUD1: 0x0002,
  AUD2: 0x0004,
  AUD3: 0x0008,
  DSK: 0x0010,
  SPR: 0x0020,
  BLT: 0x0040,
  COP: 0x0080,
  BPL: 0x0100,
  DMAEN: 0x0200,
  BLTPRI: 0x0400,
  BZERO: 0x2000,
  BBUSY: 0x4000,
  SETCLR: 0x8000
} as const

/** Bits de INTENA / INTREQ, et niveau d'interruption du 68000 correspondant. */
export const INT = {
  TBE: 0x0001,
  DSKBLK: 0x0002,
  SOFT: 0x0004,
  PORTS: 0x0008,
  COPER: 0x0010,
  VERTB: 0x0020,
  BLIT: 0x0040,
  AUD0: 0x0080,
  AUD1: 0x0100,
  AUD2: 0x0200,
  AUD3: 0x0400,
  RBF: 0x0800,
  DSKSYN: 0x1000,
  EXTER: 0x2000,
  INTEN: 0x4000
} as const

/** Niveau 68000 de chaque bit de INTREQ (bits 0 à 13). */
export const NIVEAU_INT = [1, 1, 1, 2, 3, 3, 3, 4, 4, 4, 4, 5, 5, 6]

/** Couleur Amiga $0RGB (4 bits par composante) → [r, g, b] 0-255. */
export function rgb12(c: number): [number, number, number] {
  return [((c >> 8) & 15) * 17, ((c >> 4) & 15) * 17, (c & 15) * 17]
}

/** Vecteurs d'interruption du 68000 utilisés par l'Amiga (auto-vecteurs). */
export const VECTEUR_NIVEAU = [0, 0x64, 0x68, 0x6c, 0x70, 0x74, 0x78, 0x7c]
