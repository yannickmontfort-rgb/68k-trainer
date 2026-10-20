import type { Memory } from '../../cpu/memory'
import { DMA, ECRAN_LARGEUR, ECRAN_LIGNES, ECRAN_PREMIERE_LIGNE, ECRAN_X_DEBUT, MASQUE_DMA, R } from './machine'

/**
 * Denise et la partie affichage d'Agnus : lecture des plans de bits (DMA), fenêtre d'affichage
 * (DIW), fenêtre de lecture (DDF), modulos, défilement fin (BPLCON1), double playfield, Extra
 * Half-Brite, HAM, et les 8 sprites matériels. L'image est construite ligne par ligne, avec l'état
 * des registres au moment où le faisceau balaie la ligne (ce que fait le Copper est donc visible).
 */

/** Un sprite : état du DMA et dernière ligne de données. */
export interface Sprite {
  pt: number
  pos: number
  ctl: number
  data: number
  datb: number
  /** Le sprite est affiché sur les lignes où il est « armé ». */
  arme: boolean
  etat: 'controle' | 'attente' | 'donnees' | 'fini'
  vstart: number
  vstop: number
}

export function spriteVide(): Sprite {
  return { pt: 0, pos: 0, ctl: 0, data: 0, datb: 0, arme: false, etat: 'controle', vstart: 0, vstop: 0 }
}

export const vstartSprite = (pos: number, ctl: number): number => (pos >> 8) | ((ctl & 4) << 6)
export const vstopSprite = (ctl: number): number => (ctl >> 8) | ((ctl & 2) << 7)
export const hstartSprite = (pos: number, ctl: number): number => ((pos & 0xff) << 1) | (ctl & 1)

/** Changement de couleur pendant la ligne : position (en pixels haute résolution du faisceau) et registre. */
export interface ChangementCouleur {
  h: number
  index: number
  valeur: number
}

/** Première ligne où Agnus lit les sprites (fin du retour vertical). */
const PREMIERE_LIGNE_SPRITES = 0x19

/** DMA des sprites pour la ligne `ligne` (lecture des mots de contrôle puis des données). */
export function dmaSprites(sprites: Sprite[], ligne: number, mem: Memory): void {
  if (ligne < PREMIERE_LIGNE_SPRITES) return
  const lire = (a: number): number => mem.readU16(a & MASQUE_DMA)
  for (const s of sprites) {
    if (s.etat === 'controle' || (s.etat === 'donnees' && ligne === s.vstop)) {
      s.pos = lire(s.pt)
      s.ctl = lire(s.pt + 2)
      s.pt = (s.pt + 4) >>> 0
      s.arme = false
      if (s.pos === 0 && s.ctl === 0) {
        s.etat = 'fini'
        continue
      }
      s.vstart = vstartSprite(s.pos, s.ctl)
      s.vstop = vstopSprite(s.ctl)
      s.etat = 'attente'
    }
    if (s.etat === 'attente' && ligne === s.vstart) s.etat = 'donnees'
    if (s.etat === 'donnees') {
      s.data = lire(s.pt)
      s.datb = lire(s.pt + 2)
      s.pt = (s.pt + 4) >>> 0
      s.arme = true
    }
  }
}

/** Composante ½ (Extra Half-Brite). */
const demi = (c: number): number => (c >> 1) & 0x777

/** Lignes de bits lues pour une ligne d'écran. */
interface Lecture {
  plans: number
  hires: boolean
  mots: number
  premierX: number
}

/**
 * Lit les plans de la ligne (si le DMA des plans est actif sur cette ligne) et fait avancer les
 * pointeurs BPLxPT (fin de ligne + modulo), comme Agnus.
 */
export function lirePlans(regs: Uint16Array, bplpt: Uint32Array, ligne: number, dmacon: number, mem: Memory, donnees: Uint16Array[]): Lecture | null {
  const bplcon0 = regs[R.BPLCON0 >> 1]
  const hires = (bplcon0 & 0x8000) !== 0
  let plans = (bplcon0 >> 12) & 7
  if (plans > 6) plans = 4
  if (hires && plans > 4) plans = 4
  const diwstrt = regs[R.DIWSTRT >> 1]
  const diwstop = regs[R.DIWSTOP >> 1]
  const vstart = diwstrt >> 8
  const vstop = (diwstop >> 8) | (diwstop & 0x8000 ? 0 : 0x100)
  if (!plans || (dmacon & (DMA.DMAEN | DMA.BPL)) !== (DMA.DMAEN | DMA.BPL) || ligne < vstart || ligne >= vstop) return null
  const ddfstrt = regs[R.DDFSTRT >> 1] & 0xfc
  const ddfstop = regs[R.DDFSTOP >> 1] & 0xfc
  if (ddfstop < ddfstrt) return null
  const mots = Math.min(hires ? 80 : 40, hires ? ((ddfstop - ddfstrt) >> 2) + 2 : ((ddfstop - ddfstrt) >> 3) + 1)
  const mod1 = (regs[R.BPL1MOD >> 1] << 16) >> 16
  const mod2 = (regs[R.BPL2MOD >> 1] << 16) >> 16
  for (let p = 0; p < plans; p++) {
    const ligneDonnees = donnees[p]
    for (let m = 0; m < mots; m++) ligneDonnees[m] = mem.readU16((bplpt[p] + m * 2) & MASQUE_DMA)
    bplpt[p] = (bplpt[p] + mots * 2 + (p & 1 ? mod2 : mod1)) >>> 0
  }
  return { plans, hires, mots, premierX: ddfstrt * 2 + (hires ? 9 : 17) }
}

/**
 * Dessine la ligne `ligne` du faisceau dans `image` (couleurs $0RGB, en pixels haute résolution).
 * `palette` = les 32 couleurs au début de la ligne ; `changements` = couleurs changées pendant la ligne.
 */
export function dessinerLigne(
  image: Uint16Array,
  ligne: number,
  regs: Uint16Array,
  lecture: Lecture | null,
  donnees: Uint16Array[],
  sprites: Sprite[],
  palette: Uint16Array,
  changements: ChangementCouleur[]
): void {
  const y = ligne - ECRAN_PREMIERE_LIGNE
  if (y < 0 || y >= ECRAN_LIGNES) return
  const bplcon0 = regs[R.BPLCON0 >> 1]
  const bplcon1 = regs[R.BPLCON1 >> 1]
  const bplcon2 = regs[R.BPLCON2 >> 1]
  const diwstrt = regs[R.DIWSTRT >> 1]
  const diwstop = regs[R.DIWSTOP >> 1]
  const vstart = diwstrt >> 8
  const vstop = (diwstop >> 8) | (diwstop & 0x8000 ? 0 : 0x100)
  const dansDiwV = ligne >= vstart && ligne < vstop
  // Abscisses de la fenêtre en pixels haute résolution
  const hDebut = (diwstrt & 0xff) * 2
  const hFin = ((diwstop & 0xff) | 0x100) * 2
  const dpf = (bplcon0 & 0x400) !== 0
  const ham = (bplcon0 & 0x800) !== 0
  const pf2pri = (bplcon2 & 0x40) !== 0
  const pf1p = bplcon2 & 7
  const pf2p = (bplcon2 >> 3) & 7
  const retard1 = (bplcon1 & 15) * 2
  const retard2 = ((bplcon1 >> 4) & 15) * 2

  const pal = Uint16Array.from(palette)
  let c = 0 // prochain changement de couleur à appliquer
  let hamCouleur = pal[0]

  // Sprites armés sur cette ligne : abscisse de début (pixels haute résolution)
  const actifs = sprites.map((s, i) => ({ i, s, h: s.arme ? hstartSprite(s.pos, s.ctl) * 2 : -1 }))
  const attache = (i: number): boolean => (i & 1) === 1 && (sprites[i].ctl & 0x80) !== 0

  const ligneImage = y * ECRAN_LARGEUR
  for (let col = 0; col < ECRAN_LARGEUR; col++) {
    const h = ECRAN_X_DEBUT * 2 + col
    while (c < changements.length && changements[c].h <= h) {
      pal[changements[c].index] = changements[c].valeur
      c++
    }
    if (!dansDiwV || h < hDebut || h >= hFin) {
      image[ligneImage + col] = pal[0]
      continue
    }
    // Plans de bits
    let pf1 = 0
    let pf2 = 0
    let index = 0
    if (lecture) {
      for (let p = 0; p < lecture.plans; p++) {
        const decal = h - lecture.premierX * 2 - (p & 1 ? retard2 : retard1)
        const pos = lecture.hires ? decal : decal >> 1
        if (decal < 0 || pos >= lecture.mots * 16) continue
        const bit = (donnees[p][pos >> 4] >> (15 - (pos & 15))) & 1
        index |= bit << p
      }
      if (dpf) {
        pf1 = (index & 1) | ((index >> 1) & 2) | ((index >> 2) & 4)
        pf2 = ((index >> 1) & 1) | ((index >> 2) & 2) | ((index >> 3) & 4)
      }
    }
    let couleur: number
    let opaque1 = false
    let opaque2 = false
    if (dpf) {
      opaque1 = pf1 !== 0
      opaque2 = pf2 !== 0
      const devant2 = pf2pri ? opaque2 : opaque2 && !opaque1
      couleur = devant2 ? pal[8 + pf2] : opaque1 ? pal[pf1] : pal[0]
    } else if (ham && lecture && lecture.plans >= 5) {
      const v = index & 15
      switch ((index >> 4) & 3) {
        case 0:
          hamCouleur = pal[v]
          break
        case 1:
          hamCouleur = (hamCouleur & 0xff0) | v
          break
        case 2:
          hamCouleur = (hamCouleur & 0x0ff) | (v << 8)
          break
        default:
          hamCouleur = (hamCouleur & 0xf0f) | (v << 4)
      }
      couleur = hamCouleur
      opaque1 = index !== 0
    } else if (index >= 32) {
      couleur = demi(pal[index - 32])
      opaque1 = true
    } else {
      couleur = pal[index]
      opaque1 = index !== 0
    }
    // Sprites : le plus petit numéro devant ; une paire k passe devant un playfield si k < son code
    for (let i = 0; i < 8; i++) {
      const a = actifs[i]
      if (a.h < 0 || h < a.h || h >= a.h + 32) continue
      const bit = 15 - ((h - a.h) >> 1)
      const paire = i >> 1
      let valeur: number
      let indexCouleur: number
      if (attache(i | 1) && actifs[i | 1].h >= 0) {
        // Sprites attachés : 4 bits, couleurs 16 à 31 (le sprite pair donne les bits 0-1)
        const pair = sprites[i & ~1]
        const impair = sprites[i | 1]
        valeur = ((pair.data >> bit) & 1) | (((pair.datb >> bit) & 1) << 1) | (((impair.data >> bit) & 1) << 2) | (((impair.datb >> bit) & 1) << 3)
        indexCouleur = 16 + valeur
      } else {
        valeur = ((a.s.data >> bit) & 1) | (((a.s.datb >> bit) & 1) << 1)
        indexCouleur = 16 + paire * 4 + valeur
      }
      if (!valeur) continue
      const derriere1 = opaque1 && paire >= pf1p
      const derriere2 = opaque2 && paire >= pf2p
      if (!derriere1 && !derriere2) couleur = pal[indexCouleur]
      break
    }
    image[ligneImage + col] = couleur
  }
}

export { ECRAN_LARGEUR, ECRAN_LIGNES }
