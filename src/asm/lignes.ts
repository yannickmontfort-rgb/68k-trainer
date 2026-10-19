/**
 * Découpage d'une ligne de source Devpac en champs : étiquette, mnémonique (+ taille), opérandes.
 * Règles : une étiquette commence en première colonne (ou se termine par « : ») ; une ligne qui
 * commence par `*` ou `;` est un commentaire ; le champ des opérandes s'arrête au premier espace
 * hors guillemets ; tout ce qui suit est un commentaire.
 */
import { AsmErreur } from './erreurs'
import { estCaractereSymbole } from './expressions'

export type Taille = 'B' | 'W' | 'L' | 'S'

export interface Champ {
  texte: string
  /** Colonne de début (à partir de 0). */
  col: number
}

export interface LigneDecoupee {
  etiquette?: Champ
  /** Mnémonique ou directive, sans la taille, en majuscules. */
  mnemo?: Champ
  /** Suffixe de taille éventuel, en majuscules. */
  taille?: Taille
  /** Texte brut de la taille (pour les macros : `\0`). */
  tailleBrute?: string
  operandes?: Champ
}

function lireMot(ligne: string, i: number): { mot: string; fin: number } {
  let j = i
  while (j < ligne.length && ligne[j] !== ' ' && ligne[j] !== '\t' && ligne[j] !== ';') j++
  return { mot: ligne.slice(i, j), fin: j }
}

function sauterBlancs(ligne: string, i: number): number {
  while (i < ligne.length && (ligne[i] === ' ' || ligne[i] === '\t')) i++
  return i
}

/** Lit le champ des opérandes : jusqu'au premier blanc ou « ; » hors guillemets. */
function lireOperandes(ligne: string, i: number): Champ | undefined {
  let j = i
  let guillemet: string | null = null
  while (j < ligne.length) {
    const c = ligne[j]
    if (guillemet) {
      if (c === guillemet) {
        if (ligne[j + 1] === guillemet) j++
        else guillemet = null
      }
    } else if (c === "'" || c === '"') guillemet = c
    else if (c === ' ' || c === '\t' || c === ';') break
    j++
  }
  if (guillemet) throw new AsmErreur('Guillemet fermant manquant.', i, j - i)
  return j > i ? { texte: ligne.slice(i, j), col: i } : undefined
}

export function decouperLigne(ligne: string): LigneDecoupee {
  const res: LigneDecoupee = {}
  if (ligne.length === 0) return res
  if (ligne[0] === '*' || ligne[0] === ';') return res
  let i = 0
  if (ligne[0] !== ' ' && ligne[0] !== '\t') {
    // Étiquette en première colonne (le « : » est facultatif)
    let j = 0
    while (j < ligne.length && estCaractereSymbole(ligne[j]) || ligne[j] === '\\') j++
    if (j === 0) throw new AsmErreur(`Caractère inattendu « ${ligne[0]} » en début de ligne.`, 0, 1)
    res.etiquette = { texte: ligne.slice(0, j), col: 0 }
    i = ligne[j] === ':' ? j + 1 : j
    // « X=5 » collé
    if (ligne[i] === '=' ) {
      res.mnemo = { texte: '=', col: i }
      i = sauterBlancs(ligne, i + 1)
      res.operandes = lireOperandes(ligne, i)
      return res
    }
  }
  i = sauterBlancs(ligne, i)
  if (i >= ligne.length || ligne[i] === ';') return res
  let { mot, fin } = lireMot(ligne, i)
  // Étiquette indentée, terminée par « : »
  if (!res.etiquette && mot.endsWith(':') && mot.length > 1) {
    res.etiquette = { texte: mot.slice(0, -1), col: i }
    i = sauterBlancs(ligne, fin)
    if (i >= ligne.length || ligne[i] === ';') return res
    ;({ mot, fin } = lireMot(ligne, i))
  }
  if (mot === '*' || mot.startsWith(';')) return res
  const point = mot.lastIndexOf('.')
  if (point > 0 && /^[BWLS]$/i.test(mot.slice(point + 1))) {
    res.mnemo = { texte: mot.slice(0, point).toUpperCase(), col: i }
    res.taille = mot.slice(point + 1).toUpperCase() as Taille
    res.tailleBrute = mot.slice(point + 1)
  } else if (point > 0 && /^\\0$/.test(mot.slice(point + 1))) {
    res.mnemo = { texte: mot.slice(0, point).toUpperCase(), col: i }
  } else {
    res.mnemo = { texte: mot.toUpperCase(), col: i }
  }
  i = sauterBlancs(ligne, fin)
  if (i < ligne.length && ligne[i] !== ';') res.operandes = lireOperandes(ligne, i)
  return res
}

/** Sépare les opérandes aux virgules de premier niveau (hors parenthèses et guillemets). */
export function separerOperandes(champ: Champ): Champ[] {
  const resultat: Champ[] = []
  const t = champ.texte
  let profondeur = 0
  let guillemet: string | null = null
  let debut = 0
  for (let i = 0; i < t.length; i++) {
    const c = t[i]
    if (guillemet) {
      if (c === guillemet) {
        if (t[i + 1] === guillemet) i++
        else guillemet = null
      }
      continue
    }
    if (c === "'" || c === '"') guillemet = c
    else if (c === '(') profondeur++
    else if (c === ')') profondeur--
    else if (c === ',' && profondeur === 0) {
      resultat.push({ texte: t.slice(debut, i), col: champ.col + debut })
      debut = i + 1
    }
  }
  resultat.push({ texte: t.slice(debut), col: champ.col + debut })
  return resultat
}
