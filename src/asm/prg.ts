/**
 * Exécutable TOS (.PRG) à partir d'un résultat d'assemblage relogeable (programme sans ORG).
 * Même fichier que vasm -Ftos -devpac (vérifié octet par octet dans tests/asm/prg.test.ts) :
 *
 *   en-tête (28 octets) : $601A, tailles TEXT, DATA, BSS, table des symboles, 4 octets réservés,
 *                         drapeaux du programme (long), mot « absolu » à 0
 *   TEXT, DATA          : chacune arrondie à une taille paire
 *   symboles (option)   : format DRI, 14 octets par symbole, valeurs relatives au début de TEXT
 *                         (comme Devpac/MONST et vasm -monst)
 *   relocation          : position du premier mot long à reloger (long, 0 s'il n'y en a pas),
 *                         puis l'écart jusqu'au suivant sur un octet (1 = avancer de 254), puis 0
 *
 * Code pur, sans dépendance : réutilisable hors de 68k Trainer.
 */
import type { ResultatAssemblage, Symbole } from './assembleur'

export interface OptionsPrg {
  /** Table de symboles DRI (par défaut : seulement si le source contient OPT D+). */
  symboles?: boolean
  /** Drapeaux du programme (chargement rapide, TT-RAM…), 0 par défaut. */
  drapeaux?: number
}

const ENTETE = 28
const pair = (n: number): number => (n + 1) & ~1

/** Types DRI : symbole défini ($8000), constante ($4000), et section. */
const TYPE_SECTION = { TEXT: 0x8200, DATA: 0x8400, BSS: 0x8100 } as const
const TYPE_CONSTANTE = 0xc000

/** Raison pour laquelle on ne peut pas faire de .PRG, ou null si c'est possible. */
export function empechementPrg(r: ResultatAssemblage): string | null {
  if (!r.ok) return 'Le programme contient des erreurs : corrige-les avant de l’exporter.'
  if (!r.relogeable) return 'Un .PRG doit pouvoir être chargé n’importe où en mémoire : retire le ORG du programme.'
  return null
}

export function creerPrg(r: ResultatAssemblage, options: OptionsPrg = {}): Uint8Array {
  const raison = empechementPrg(r)
  if (raison) throw new Error(raison)

  const tText = pair(r.sections.text.length)
  const tData = pair(r.sections.data.length)
  const tBss = pair(r.sections.bss)
  const symboles = (options.symboles ?? r.debogage) ? tableSymboles(r.symboles, r.base) : new Uint8Array(0)
  const relocs = tableRelocation(r.relocs)

  const prg = new Uint8Array(ENTETE + tText + tData + symboles.length + relocs.length)
  const vue = new DataView(prg.buffer)
  vue.setUint16(0, 0x601a)
  vue.setUint32(2, tText)
  vue.setUint32(6, tData)
  vue.setUint32(10, tBss)
  vue.setUint32(14, symboles.length)
  vue.setUint32(22, (options.drapeaux ?? 0) >>> 0)

  prg.set(r.sections.text, ENTETE)
  prg.set(r.sections.data, ENTETE + tText)
  // Dans le fichier, les adresses à reloger sont comptées depuis le début de TEXT, pas depuis `base`
  for (const p of r.relocs) {
    const o = ENTETE + p
    vue.setUint32(o, (vue.getUint32(o) - r.base) >>> 0)
  }
  prg.set(symboles, ENTETE + tText + tData)
  prg.set(relocs, ENTETE + tText + tData + symboles.length)
  return prg
}

function tableRelocation(positions: number[]): Uint8Array {
  if (positions.length === 0) return new Uint8Array(4)
  const octets: number[] = []
  const premier = positions[0]
  octets.push(premier >>> 24, (premier >>> 16) & 0xff, (premier >>> 8) & 0xff, premier & 0xff)
  for (let i = 1; i < positions.length; i++) {
    let ecart = positions[i] - positions[i - 1]
    while (ecart > 254) {
      octets.push(1)
      ecart -= 254
    }
    octets.push(ecart)
  }
  octets.push(0)
  return new Uint8Array(octets)
}

/** Symboles DRI : nom sur 8 caractères, type, valeur. Les étiquettes locales (.x, 1$) sont omises. */
function tableSymboles(symboles: Symbole[], base: number): Uint8Array {
  const retenus = symboles.filter((s) => !s.nom.includes('.') && !s.nom.includes('$'))
  const table = new Uint8Array(retenus.length * 14)
  const vue = new DataView(table.buffer)
  retenus.forEach((s, i) => {
    const o = i * 14
    for (let k = 0; k < 8 && k < s.nom.length; k++) table[o + k] = s.nom.charCodeAt(k) & 0xff
    vue.setUint16(o + 8, s.section ? TYPE_SECTION[s.section] : TYPE_CONSTANTE)
    vue.setUint32(o + 10, (s.section ? s.valeur - base : s.valeur) >>> 0)
  })
  return table
}

export interface PrgLu {
  text: Uint8Array
  data: Uint8Array
  bss: number
  /** Positions (depuis le début de TEXT) des mots longs à reloger. */
  relocs: number[]
  /** Symboles DRI : valeur relative au début de TEXT pour les étiquettes. */
  symboles: { nom: string; valeur: number; section?: 'TEXT' | 'DATA' | 'BSS' }[]
  drapeaux: number
}

/** Lit un exécutable TOS (.PRG, .TOS, .TTP, .APP). Lève une erreur si le fichier n'en est pas un. */
export function lirePrg(octets: Uint8Array): PrgLu {
  if (octets.length < ENTETE) throw new Error('Fichier trop court pour être un programme TOS.')
  const vue = new DataView(octets.buffer, octets.byteOffset, octets.byteLength)
  if (vue.getUint16(0) !== 0x601a) throw new Error("Ce n'est pas un programme TOS (l'en-tête doit commencer par $601A).")
  const tText = vue.getUint32(2)
  const tData = vue.getUint32(6)
  const bss = vue.getUint32(10)
  const tSym = vue.getUint32(14)
  const drapeaux = vue.getUint32(22)
  const debutSym = ENTETE + tText + tData
  if (debutSym + tSym > octets.length) throw new Error('Programme TOS tronqué : les tailles de l’en-tête dépassent le fichier.')
  const text = octets.slice(ENTETE, ENTETE + tText)
  const data = octets.slice(ENTETE + tText, debutSym)

  const symboles: PrgLu['symboles'] = []
  for (let o = debutSym; o + 14 <= debutSym + tSym; o += 14) {
    let nom = ''
    for (let k = 0; k < 8 && octets[o + k]; k++) nom += String.fromCharCode(octets[o + k])
    const type = vue.getUint16(o + 8)
    const valeur = vue.getUint32(o + 10)
    // Nom long façon HiSoft : l'entrée suivante contient 14 caractères de plus
    if ((type & 0x0048) === 0x0048 && o + 28 <= debutSym + tSym) {
      o += 14
      for (let k = 0; k < 14 && octets[o + k]; k++) nom += String.fromCharCode(octets[o + k])
    }
    const section = type & 0x0200 ? 'TEXT' : type & 0x0400 ? 'DATA' : type & 0x0100 ? 'BSS' : undefined
    symboles.push({ nom, valeur, section })
  }

  const relocs: number[] = []
  let p = debutSym + tSym
  if (p + 4 <= octets.length && !(vue.getUint16(26) !== 0)) {
    let position = vue.getUint32(p)
    p += 4
    if (position !== 0) {
      relocs.push(position)
      while (p < octets.length) {
        const ecart = octets[p++]
        if (ecart === 0) break
        if (ecart === 1) position += 254
        else {
          position += ecart
          relocs.push(position)
        }
      }
    }
  }
  return { text, data, bss, relocs, symboles, drapeaux }
}
