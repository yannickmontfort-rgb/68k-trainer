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
