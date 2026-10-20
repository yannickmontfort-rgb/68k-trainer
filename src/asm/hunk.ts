/**
 * Exécutable AmigaDOS (format « hunk ») à partir d'un résultat d'assemblage relogeable :
 *
 *   HUNK_HEADER ($3F3) : 0 (pas de bibliothèque résidente), nombre de hunks, premier, dernier,
 *                        puis la taille de chaque hunk en mots longs (bit 30 = Chip RAM)
 *   pour chaque hunk   : HUNK_CODE ($3E9) / HUNK_DATA ($3EA) + taille + contenu, ou HUNK_BSS ($3EB) + taille
 *                        HUNK_RELOC32 ($3EC) : par hunk visé, nombre de positions, numéro du hunk,
 *                        positions (mots longs à corriger), puis 0
 *                        HUNK_SYMBOL ($3F0) si OPT D+ (débogueur), puis HUNK_END ($3F2)
 *
 * Code pur, sans dépendance : réutilisable hors de 68k Trainer.
 */
import type { ResultatAssemblage } from './assembleur'

export const HUNK = { HEADER: 0x3f3, CODE: 0x3e9, DATA: 0x3ea, BSS: 0x3eb, RELOC32: 0x3ec, SYMBOL: 0x3f0, END: 0x3f2, DREL32: 0x3f7, RELOC32SHORT: 0x3fc } as const
const MEMF_CHIP = 1 << 30

const longs = (n: number): number => (n + 3) >>> 2

/** Raison pour laquelle on ne peut pas faire d'exécutable, ou null si c'est possible. */
export function empechementHunk(r: ResultatAssemblage): string | null {
  if (!r.ok) return 'Le programme contient des erreurs : corrige-les avant de l’exporter.'
  if (!r.relogeable) return 'AmigaDOS charge un programme où il veut en mémoire : retire le ORG du programme.'
  return null
}

export interface OptionsHunk {
  /** Table de symboles (par défaut : seulement si le source contient OPT D+). */
  symboles?: boolean
}

/**
 * Un seul hunk de code contient l'image du programme telle que 68k Trainer l'exécute (TEXT, DATA,
 * puis BSS remplie de zéros) : les adressages relatifs au PC entre sections restent justes, et le
 * programme se comporte comme dans le simulateur. Il est chargé en Chip RAM si une section l'a
 * demandé (`SECTION nom,DATA_C`) : les puces pourront lire ses données.
 */
export function creerHunk(r: ResultatAssemblage, options: OptionsHunk = {}): Uint8Array {
  const raison = empechementHunk(r)
  if (raison) throw new Error(raison)
  const taille = longs(r.binaire.length)
  const contenu = new Uint8Array(taille * 4)
  contenu.set(r.binaire)
  // Comme vasm : le dernier mot long d'un hunk de code est complété par un NOP
  if (r.binaire.length & 2) new DataView(contenu.buffer).setUint16(r.binaire.length & ~1, 0x4e71)
  const vueContenu = new DataView(contenu.buffer)
  // Dans le fichier, les adresses à reloger sont comptées depuis le début du hunk
  for (const p of r.relocs) vueContenu.setUint32(p, (vueContenu.getUint32(p) - r.base) >>> 0)
  const chip = r.chip.TEXT || r.chip.DATA || r.chip.BSS

  const mots: number[] = [HUNK.HEADER, 0, 1, 0, 0, (taille | (chip ? MEMF_CHIP : 0)) >>> 0, HUNK.CODE, taille]
  for (let o = 0; o < contenu.length; o += 4) mots.push(vueContenu.getUint32(o))
  if (r.relocs.length) mots.push(HUNK.RELOC32, r.relocs.length, 0, ...[...r.relocs].sort((a, b) => a - b), 0)
  if (options.symboles ?? r.debogage) {
    const symboles = r.symboles.filter((s) => s.section && !s.nom.includes('.') && !s.nom.includes('$'))
    if (symboles.length) {
      mots.push(HUNK.SYMBOL)
      for (const s of symboles) {
        const nom = new Uint8Array(longs(s.nom.length) * 4)
        for (let k = 0; k < s.nom.length; k++) nom[k] = s.nom.charCodeAt(k) & 0xff
        const vue = new DataView(nom.buffer)
        mots.push(nom.length / 4)
        for (let o = 0; o < nom.length; o += 4) mots.push(vue.getUint32(o))
        mots.push((s.valeur - r.base) >>> 0)
      }
      mots.push(0)
    }
  }
  mots.push(HUNK.END)
  const fichier = new Uint8Array(mots.length * 4)
  const vue = new DataView(fichier.buffer)
  mots.forEach((m, i) => vue.setUint32(i * 4, m >>> 0))
  return fichier
}

export interface HunkLu {
  type: 'CODE' | 'DATA' | 'BSS'
  /** Taille en octets (multiple de 4) et contenu (vide pour BSS). */
  taille: number
  octets: Uint8Array
  chip: boolean
  /** Hunk visé → positions des mots longs à reloger. */
  relocs: Map<number, number[]>
  symboles: { nom: string; valeur: number }[]
}

/** Lit un exécutable AmigaDOS. Lève une erreur si le fichier n'en est pas un. */
export function lireHunk(octets: Uint8Array): HunkLu[] {
  const vue = new DataView(octets.buffer, octets.byteOffset, octets.byteLength)
  let p = 0
  const lire = (): number => {
    if (p + 4 > octets.length) throw new Error('Exécutable AmigaDOS tronqué.')
    const v = vue.getUint32(p)
    p += 4
    return v
  }
  if (octets.length < 24 || lire() !== HUNK.HEADER) throw new Error("Ce n'est pas un exécutable AmigaDOS (il doit commencer par $000003F3).")
  while (lire() !== 0) {
    /* noms de bibliothèques résidentes : on les ignore */
  }
  const nombre = lire()
  const premier = lire()
  const dernier = lire()
  if (dernier - premier + 1 !== nombre) throw new Error('En-tête AmigaDOS incohérent.')
  const tailles = Array.from({ length: nombre }, () => lire())
  const hunks: HunkLu[] = []
  let courant: HunkLu | null = null
  while (p < octets.length && hunks.length <= nombre) {
    const t = lire() & 0x3fffffff
    if (t === HUNK.CODE || t === HUNK.DATA || t === HUNK.BSS) {
      const n = lire() & 0x3fffffff
      const i = hunks.length
      courant = {
        type: t === HUNK.CODE ? 'CODE' : t === HUNK.DATA ? 'DATA' : 'BSS',
        taille: n * 4,
        octets: t === HUNK.BSS ? new Uint8Array(0) : octets.slice(p, p + n * 4),
        chip: (tailles[i] & MEMF_CHIP) !== 0,
        relocs: new Map(),
        symboles: []
      }
      if (t !== HUNK.BSS) p += n * 4
    } else if (t === HUNK.RELOC32 && courant) {
      for (let n = lire(); n !== 0; n = lire()) {
        const cible = lire()
        const positions = Array.from({ length: n }, () => lire())
        courant.relocs.set(cible, [...(courant.relocs.get(cible) ?? []), ...positions])
      }
    } else if ((t === HUNK.RELOC32SHORT || t === HUNK.DREL32) && courant) {
      // Format court (Kickstart 2.0 et plus) : mots de 16 bits, puis alignement sur un mot long
      const debut = p
      const mot = (): number => {
        const v = vue.getUint16(p)
        p += 2
        return v
      }
      for (let n = mot(); n !== 0; n = mot()) {
        const cible = mot()
        const positions = Array.from({ length: n }, () => mot())
        courant.relocs.set(cible, [...(courant.relocs.get(cible) ?? []), ...positions])
      }
      if ((p - debut) & 2) p += 2
    } else if (t === HUNK.SYMBOL && courant) {
      for (let n = lire(); n !== 0; n = lire()) {
        let nom = ''
        for (let k = 0; k < n * 4; k++) if (octets[p + k]) nom += String.fromCharCode(octets[p + k])
        p += n * 4
        courant.symboles.push({ nom, valeur: lire() })
      }
    } else if (t === HUNK.END && courant) {
      hunks.push(courant)
      courant = null
    } else throw new Error(`Bloc AmigaDOS inconnu : $${t.toString(16).toUpperCase()}.`)
  }
  if (hunks.length !== nombre) throw new Error('Exécutable AmigaDOS : il manque des hunks.')
  return hunks
}

/**
 * Charge les hunks à partir de `adresse` (les uns derrière les autres, alignés sur 8 octets), comme
 * LoadSeg : renvoie l'image mémoire et l'adresse de chaque hunk. Utilisé par les tests.
 */
export function chargerHunks(hunks: HunkLu[], adresse: number): { image: Uint8Array; adresses: number[] } {
  const adresses: number[] = []
  let fin = adresse
  for (const h of hunks) {
    adresses.push(fin)
    fin = (fin + h.taille + 7) & ~7
  }
  const image = new Uint8Array(fin - adresse)
  const vue = new DataView(image.buffer)
  hunks.forEach((h, i) => {
    image.set(h.octets, adresses[i] - adresse)
    for (const [cible, positions] of h.relocs) {
      for (const pos of positions) {
        const o = adresses[i] - adresse + pos
        vue.setUint32(o, (vue.getUint32(o) + adresses[cible]) >>> 0)
      }
    }
  })
  return { image, adresses }
}
