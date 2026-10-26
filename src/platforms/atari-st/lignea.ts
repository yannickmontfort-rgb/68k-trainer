/**
 * Ligne A du TOS simulé : les fonctions de base des primitives graphiques ($A000 initialisation,
 * $A001 allumer un pixel, $A002 lire un pixel, $A003 tracer une ligne, $A009/$A00A montrer et
 * cacher la souris). Le tracé suit celui d'EmuTOS (vdi/vdi_line.c : abline, draw_line,
 * vertical_line), vérifié contre le vrai EmuTOS dans Hatari (tests/asm/lignea-emutos.test.ts).
 */
import type { Cpu } from '../../cpu/cpu'
import { SYSVAR } from './machine'

/** Les variables de la Ligne A (adresse rendue par $A000), entre les tampons du TOS et le programme. */
export const LIGNEA_VARS = 0x0e80
const CONTRL = 0x0ed0
const INTIN = 0x0ef0
const PTSIN = 0x0f30
const INTOUT = 0x0fb0
const PTSOUT = 0x0fd0
/** Table des polices (A1) et des routines (A2) : non simulées, trois pointeurs nuls. */
const TABLES = 0x0ff0

/** Décalages des variables (lineavars.S d'EmuTOS). */
export const LA = {
  PLANES: 0,
  WIDTH: 2,
  CONTRL: 4,
  INTIN: 8,
  PTSIN: 12,
  INTOUT: 16,
  PTSOUT: 20,
  COLBIT0: 24,
  LSTLIN: 32,
  LN_MASK: 34,
  WRT_MODE: 36,
  X1: 38,
  Y1: 40,
  X2: 42,
  Y2: 44,
  /** Négatifs : résolution et octets par ligne. */
  V_REZ_HZ: -12,
  V_REZ_VT: -4,
  BYTES_LIN: -2
} as const

const PLANS = 4
const OCTETS_LIGNE = 160

type Mode = 0 | 1 | 2 | 3

/** Applique la règle d'un mode d'écriture à un bit d'un plan (draw_line d'EmuTOS). */
function appliquer(mot: number, bit: number, mode: Mode, couleur: number, motif: number): number {
  switch (mode) {
    case 0: // remplacement : la couleur là où le motif vaut 1, le fond (0) ailleurs
      return couleur && motif ? mot | bit : mot & ~bit
    case 1: // transparent : seulement là où le motif vaut 1
      return motif ? (couleur ? mot | bit : mot & ~bit) : mot
    case 2: // OU exclusif : inverse le pixel là où le motif vaut 1, quelle que soit la couleur
      return motif ? mot ^ bit : mot
    default: // transparent inversé : seulement là où le motif vaut 0
      return motif ? mot : couleur ? mot | bit : mot & ~bit
  }
}

export function ligneA(cpu: Cpu, opcode: number): boolean {
  const mem = cpu.memory
  const v = (decalage: number): number => (LIGNEA_VARS + decalage) & 0xffffff
  const motS = (decalage: number): number => (mem.readU16(v(decalage)) << 16) >> 16
  const ecran = (): number => mem.readU32(SYSVAR.v_bas_ad) & 0xffffff

  /** Écrit la couleur d'un pixel plan par plan, avec le mode et le bit de motif donnés. */
  const pixel = (x: number, y: number, couleur: number, mode: Mode, motif: number): void => {
    if (x < 0 || x >= 320 || y < 0 || y >= 200) return
    const adresse = ecran() + y * OCTETS_LIGNE + (x >> 4) * 2 * PLANS
    const bit = 0x8000 >> (x & 15)
    for (let p = 0; p < PLANS; p++) {
      const a = adresse + 2 * p
      mem.writeU16(a, appliquer(mem.readU16(a), bit, mode, (couleur >> p) & 1, motif) & 0xffff)
    }
  }

  switch (opcode) {
    case 0xa000: {
      mem.writeU16(v(LA.PLANES), PLANS)
      mem.writeU16(v(LA.WIDTH), OCTETS_LIGNE)
      mem.writeU32(v(LA.CONTRL), CONTRL)
      mem.writeU32(v(LA.INTIN), INTIN)
      mem.writeU32(v(LA.PTSIN), PTSIN)
      mem.writeU32(v(LA.INTOUT), INTOUT)
      mem.writeU32(v(LA.PTSOUT), PTSOUT)
      mem.writeU16(v(LA.V_REZ_HZ), 320)
      mem.writeU16(v(LA.V_REZ_VT), 200)
      mem.writeU16(v(LA.BYTES_LIN), OCTETS_LIGNE)
      for (let i = 0; i < 12; i += 4) mem.writeU32(TABLES + i, 0)
      cpu.d[0] = LIGNEA_VARS
      cpu.a[0] = LIGNEA_VARS
      cpu.a[1] = TABLES
      cpu.a[2] = TABLES
      return true
    }
    case 0xa001: {
      const ptsin = mem.readU32(v(LA.PTSIN)) & 0xffffff
      const intin = mem.readU32(v(LA.INTIN)) & 0xffffff
      const x = (mem.readU16(ptsin) << 16) >> 16
      const y = (mem.readU16(ptsin + 2) << 16) >> 16
      pixel(x, y, mem.readU16(intin) & 15, 0, 1)
      return true
    }
    case 0xa002: {
      const ptsin = mem.readU32(v(LA.PTSIN)) & 0xffffff
      const x = (mem.readU16(ptsin) << 16) >> 16
      const y = (mem.readU16(ptsin + 2) << 16) >> 16
      let couleur = 0
      if (x >= 0 && x < 320 && y >= 0 && y < 200) {
        const adresse = ecran() + y * OCTETS_LIGNE + (x >> 4) * 2 * PLANS
        const bit = 0x8000 >> (x & 15)
        for (let p = 0; p < PLANS; p++) if (mem.readU16(adresse + 2 * p) & bit) couleur |= 1 << p
      }
      cpu.d[0] = couleur
      return true
    }
    case 0xa003:
      tracerLigne()
      return true
    case 0xa009: // montrer la souris
    case 0xa00a: // cacher la souris : l'écran simulé n'a pas de pointeur
      return true
    default:
      throw new Error(
        `La fonction Ligne A $${opcode.toString(16).toUpperCase()} n'est pas simulée par 68k Trainer (seulement $A000 à $A003, $A009 et $A00A) : essaie ton programme dans Hatari.`
      )
  }

  /** $A003 : abline d'EmuTOS. */
  function tracerLigne(): void {
    const mode = (mem.readU16(v(LA.WRT_MODE)) & 3) as Mode
    let couleur = 0
    for (let p = 0; p < PLANS; p++) if (mem.readU16(v(LA.COLBIT0 + 2 * p))) couleur |= 1 << p
    let motif = mem.readU16(v(LA.LN_MASK))
    const rol = (m: number): number => ((m << 1) | (m >> 15)) & 0xffff
    let x1 = motS(LA.X1)
    let y1 = motS(LA.Y1)
    let x2 = motS(LA.X2)
    let y2 = motS(LA.Y2)

    // Ligne verticale : tracée dans l'ordre donné, sans le raccourci du OU exclusif
    if (x1 === x2) {
      const pas = y2 >= y1 ? 1 : -1
      for (let y = y1; ; y += pas) {
        motif = rol(motif)
        pixel(x1, y, couleur, mode, motif & 1)
        if (y === y2) break
      }
      mem.writeU16(v(LA.LN_MASK), motif)
      return
    }
    // Toujours de gauche à droite
    if (x2 < x1) {
      ;[x1, x2] = [x2, x1]
      ;[y1, y2] = [y2, y1]
    }
    // En OU exclusif, LSTLIN = 0 : le dernier point n'est pas tracé (pour ne pas inverser deux fois
    // le sommet commun de deux segments d'une ligne brisée)
    if (mode === 2 && mem.readU16(v(LA.LSTLIN)) === 0) x2--
    // Ligne horizontale : le motif est aligné sur les colonnes de 16 pixels de l'écran
    if (y1 === y2) {
      for (let x = x1; x <= x2; x++) pixel(x, y1, couleur, mode, (motif >> (15 - (x & 15))) & 1)
      return
    }
    const dx = x2 - x1
    let dy = y2 - y1
    const pasY = dy < 0 ? -1 : 1
    dy = Math.abs(dy)
    let x = x1
    let y = y1
    if (dx >= dy) {
      let eps = -dx
      for (let n = dx; n >= 0; n--) {
        motif = rol(motif)
        pixel(x, y, couleur, mode, motif & 1)
        x++
        eps += 2 * dy
        if (eps >= 0) {
          eps -= 2 * dx
          y += pasY
        }
      }
    } else {
      let eps = -dy
      for (let n = dy; n >= 0; n--) {
        motif = rol(motif)
        pixel(x, y, couleur, mode, motif & 1)
        y += pasY
        eps += 2 * dx
        if (eps >= 0) {
          eps -= 2 * dy
          x++
        }
      }
    }
    mem.writeU16(v(LA.LN_MASK), motif)
  }
}
