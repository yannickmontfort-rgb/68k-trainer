import type { Memory } from '../../cpu/memory'
import { MASQUE_DMA } from './machine'

/**
 * Blitter de l'Amiga (Agnus OCS) : copie de blocs avec trois sources A, B, C combinées par une
 * fonction logique (minterm) vers la destination D, décalages, masques de premier/dernier mot,
 * mode descendant, remplissage, et mode ligne. Comportement du Hardware Reference Manual,
 * chapitre 6.
 *
 * Le travail est fait d'un coup quand on écrit BLTSIZE ; le Blitter reste ensuite « occupé »
 * (BBUSY) pendant la durée qu'il mettrait vraiment, d'où l'importance d'attendre sa fin.
 */
export interface RegistresBlitter {
  con0: number
  con1: number
  afwm: number
  alwm: number
  apt: number
  bpt: number
  cpt: number
  dpt: number
  /** Modulos : octets ajoutés en fin de ligne (valeurs signées). */
  amod: number
  bmod: number
  cmod: number
  dmod: number
  adat: number
  bdat: number
  cdat: number
}

export function registresBlitterVides(): RegistresBlitter {
  return { con0: 0, con1: 0, afwm: 0xffff, alwm: 0xffff, apt: 0, bpt: 0, cpt: 0, dpt: 0, amod: 0, bmod: 0, cmod: 0, dmod: 0, adat: 0, bdat: 0, cdat: 0 }
}

export interface ResultatBlit {
  /** Durée du travail en cycles du 68000. */
  cycles: number
  /** Toutes les données produites valaient 0 (bit BZERO de DMACONR). */
  zero: boolean
  /** Adresses écrites (pour le débogueur). */
  ecritures: number[]
}

/** Fonction logique du Blitter : bit i de `lf` = résultat pour la combinaison (A,B,C) = i en binaire. */
export function minterm(lf: number, a: number, b: number, c: number): number {
  let d = 0
  if (lf & 0x80) d |= a & b & c
  if (lf & 0x40) d |= a & b & ~c
  if (lf & 0x20) d |= a & ~b & c
  if (lf & 0x10) d |= a & ~b & ~c
  if (lf & 0x08) d |= ~a & b & c
  if (lf & 0x04) d |= ~a & b & ~c
  if (lf & 0x02) d |= ~a & ~b & c
  if (lf & 0x01) d |= ~a & ~b & ~c
  return d & 0xffff
}

const lire = (mem: Memory, adresse: number): number => mem.readU16(adresse & MASQUE_DMA)
const ecrire = (mem: Memory, adresse: number, valeur: number): void => mem.writeU16(adresse & MASQUE_DMA, valeur)
const signe16 = (v: number): number => (v << 16) >> 16

/** Lance le blit décrit par les registres et BLTSIZE ; met à jour pointeurs et registres de données. */
export function blit(r: RegistresBlitter, bltsize: number, mem: Memory): ResultatBlit {
  return r.con1 & 1 ? blitLigne(r, bltsize, mem) : blitZone(r, bltsize, mem)
}

function blitZone(r: RegistresBlitter, bltsize: number, mem: Memory): ResultatBlit {
  const largeur = bltsize & 0x3f || 64
  const hauteur = bltsize >> 6 || 1024
  const ash = r.con0 >>> 12
  const bsh = r.con1 >>> 12
  const useA = (r.con0 & 0x800) !== 0
  const useB = (r.con0 & 0x400) !== 0
  const useC = (r.con0 & 0x200) !== 0
  const useD = (r.con0 & 0x100) !== 0
  const lf = r.con0 & 0xff
  const desc = (r.con1 & 2) !== 0
  const remplissage = r.con1 & 0x18
  const exclusif = (r.con1 & 0x10) !== 0
  const pas = desc ? -2 : 2
  const sens = desc ? -1 : 1
  let aAncien = 0
  let bAncien = 0
  let zero = true
  const ecritures: number[] = []

  for (let y = 0; y < hauteur; y++) {
    let fc = (r.con1 & 4) !== 0 ? 1 : 0
    for (let x = 0; x < largeur; x++) {
      if (useA) {
        r.adat = lire(mem, r.apt)
        r.apt = (r.apt + pas) >>> 0
      }
      if (useB) {
        r.bdat = lire(mem, r.bpt)
        r.bpt = (r.bpt + pas) >>> 0
      }
      if (useC) {
        r.cdat = lire(mem, r.cpt)
        r.cpt = (r.cpt + pas) >>> 0
      }
      let a = r.adat
      if (x === 0) a &= r.afwm
      if (x === largeur - 1) a &= r.alwm
      // Mode montant : décalage vers la droite (les bits entrent par la gauche depuis le mot
      // précédent) ; mode descendant : vers la gauche.
      const aDecale = desc
        ? ((a << ash) | (aAncien >>> (16 - ash))) & 0xffff
        : ((((aAncien << 16) | a) >>> ash) & 0xffff)
      const bDecale = desc
        ? ((r.bdat << bsh) | (bAncien >>> (16 - bsh))) & 0xffff
        : ((((bAncien << 16) | r.bdat) >>> bsh) & 0xffff)
      aAncien = a
      bAncien = r.bdat
      let d = minterm(lf, aDecale, bDecale, r.cdat)
      if (remplissage) {
        // Remplissage de droite à gauche (mode descendant) : la retenue change à chaque bit à 1
        let sortie = 0
        for (let bit = 0; bit < 16; bit++) {
          const v = (d >> bit) & 1
          if (exclusif) {
            fc ^= v
            sortie |= fc << bit
          } else {
            sortie |= (fc | v) << bit
            fc ^= v
          }
        }
        d = sortie
      }
      if (d !== 0) zero = false
      if (useD) {
        ecrire(mem, r.dpt, d)
        ecritures.push(r.dpt & MASQUE_DMA)
        r.dpt = (r.dpt + pas) >>> 0
      }
    }
    if (useA) r.apt = (r.apt + sens * signe16(r.amod)) >>> 0
    if (useB) r.bpt = (r.bpt + sens * signe16(r.bmod)) >>> 0
    if (useC) r.cpt = (r.cpt + sens * signe16(r.cmod)) >>> 0
    if (useD) r.dpt = (r.dpt + sens * signe16(r.dmod)) >>> 0
  }
  const canaux = [useA, useB, useC, useD].filter(Boolean).length
  return { cycles: largeur * hauteur * Math.max(2, canaux) * 2 + 8, zero, ecritures }
}

/**
 * Mode ligne : tracé de Bresenham fait par le Blitter. Octant dans BLTCON1 : SUD (bit 4, le pas
 * « parfois » est vertical), SUL (bit 3, ce pas va vers le haut ou la gauche), AUL (bit 2, le
 * pas « toujours » va vers le haut ou la gauche). BLTAPTL = 4·dmin − 2·dmax (accumulateur),
 * BLTAMOD = 4·(dmin − dmax), BLTBMOD = 4·dmin, BLTCMOD = BLTDMOD = largeur de l'écran en octets,
 * BLTCPT = BLTDPT = mot du premier point, ASH = son bit (x & 15), BLTSIZE = (longueur) << 6 | 2.
 */
function blitLigne(r: RegistresBlitter, bltsize: number, mem: Memory): ResultatBlit {
  const longueur = bltsize >> 6 || 1024
  const lf = r.con0 & 0xff
  const sud = (r.con1 & 0x10) !== 0
  const sul = (r.con1 & 0x08) !== 0
  const aul = (r.con1 & 0x04) !== 0
  const sing = (r.con1 & 0x02) !== 0
  let signe = (r.con1 & 0x40) !== 0
  let acc = signe16(r.apt & 0xffff)
  let bit = r.con0 >>> 12
  let bsh = r.con1 >>> 12
  let adresse = r.cpt >>> 0
  const largeur = signe16(r.cmod)
  let dejaSurLaLigne = false
  let zero = true
  const ecritures: number[] = []

  const vertical = (haut: boolean): void => {
    adresse = (adresse + (haut ? -largeur : largeur)) >>> 0
    dejaSurLaLigne = false
  }
  const horizontal = (gauche: boolean): void => {
    bit += gauche ? -1 : 1
    if (bit > 15) {
      bit = 0
      adresse = (adresse + 2) >>> 0
    } else if (bit < 0) {
      bit = 15
      adresse = (adresse - 2) >>> 0
    }
  }

  for (let i = 0; i < longueur; i++) {
    if (!sing || !dejaSurLaLigne) {
      const motif = (r.bdat >>> (15 - bsh)) & 1 ? 0xffff : 0
      const a = (r.adat >>> bit) & r.afwm
      const c = lire(mem, adresse)
      const d = minterm(lf, a, motif, c)
      if (d !== 0) zero = false
      ecrire(mem, adresse, d)
      ecritures.push(adresse & MASQUE_DMA)
      dejaSurLaLigne = true
    }
    bsh = (bsh + 1) & 15
    if (!signe) {
      acc += signe16(r.amod)
      if (sud) vertical(sul)
      else horizontal(sul)
    } else acc += signe16(r.bmod)
    signe = acc < 0
    if (sud) horizontal(aul)
    else vertical(aul)
  }
  r.apt = (r.apt & 0xffff0000) | (acc & 0xffff)
  r.cpt = r.dpt = adresse
  return { cycles: longueur * 8 + 8, zero, ecritures }
}
