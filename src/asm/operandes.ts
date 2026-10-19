/**
 * Analyse d'un opérande en mode d'adressage 68000 (syntaxe Motorola / Devpac).
 * Les expressions ne sont pas évaluées ici : on garde leur texte et leur colonne.
 */
import { AsmErreur } from './erreurs'
import type { Champ } from './lignes'

export type Operande =
  | { m: 'Dn'; r: number }
  | { m: 'An'; r: number }
  | { m: 'ind'; r: number }
  | { m: 'postinc'; r: number }
  | { m: 'predec'; r: number }
  | { m: 'd16An'; r: number; d: Champ }
  | { m: 'd8AnXn'; r: number; d: Champ | null; x: Index }
  | { m: 'abs'; adr: Champ; taille: 'W' | 'L' | null }
  | { m: 'd16PC'; d: Champ }
  | { m: 'd8PCXn'; d: Champ | null; x: Index }
  | { m: 'imm'; val: Champ }
  | { m: 'SR' }
  | { m: 'CCR' }
  | { m: 'USP' }
  | { m: 'liste'; masque: number }

export interface Index {
  /** true = registre d'adresse */
  a: boolean
  r: number
  long: boolean
}

export function registre(texte: string): { a: boolean; r: number } | null {
  const t = texte.toUpperCase()
  if (t === 'SP') return { a: true, r: 7 }
  const m = /^([DA])([0-7])$/.exec(t)
  return m ? { a: m[1] === 'A', r: +m[2] } : null
}

function index(texte: string, col: number): Index {
  const m = /^([DA][0-7]|SP)(?:\.([WL]))?$/i.exec(texte.trim())
  if (!m) throw new AsmErreur(`Registre d'index « ${texte} » invalide (attendu : D0-D7 ou A0-A7, avec .W ou .L).`, col, texte.length)
  const reg = registre(m[1])!
  return { ...reg, long: (m[2] ?? 'W').toUpperCase() === 'L' }
}

/** Liste de registres de MOVEM : « D0-D3/A0/A6 ». Bit 0 = D0 … bit 15 = A7. */
function liste(texte: string): number | null {
  if (!/^(?:[DA][0-7]|SP)(?:-(?:[DA][0-7]|SP))?(?:\/(?:[DA][0-7]|SP)(?:-(?:[DA][0-7]|SP))?)*$/i.test(texte)) return null
  let masque = 0
  for (const groupe of texte.split('/')) {
    const [debut, fin] = groupe.split('-').map((g) => registre(g)!)
    const a = (debut.a ? 8 : 0) + debut.r
    const b = fin ? (fin.a ? 8 : 0) + fin.r : a
    for (let i = Math.min(a, b); i <= Math.max(a, b); i++) masque |= 1 << i
  }
  return masque
}

export function analyserOperande(champ: Champ): Operande {
  const brut = champ.texte
  const t = brut.trim()
  const col = champ.col + (brut.length - brut.trimStart().length)
  const sous = (debut: number, fin: number): Champ => ({ texte: t.slice(debut, fin), col: col + debut })
  if (t === '') throw new AsmErreur('Opérande manquant.', champ.col, 1)
  const T = t.toUpperCase()

  const reg = registre(t)
  if (reg) return reg.a ? { m: 'An', r: reg.r } : { m: 'Dn', r: reg.r }
  if (T === 'SR') return { m: 'SR' }
  if (T === 'CCR') return { m: 'CCR' }
  if (T === 'USP') return { m: 'USP' }
  if (t.includes('/') || /^[DA][0-7]-[DA][0-7]$/i.test(t)) {
    const l = liste(t)
    if (l !== null) return { m: 'liste', masque: l }
  }
  if (t.startsWith('#')) return { m: 'imm', val: sous(1, t.length) }

  // -(An)
  let m = /^-\(\s*([AS][0-7P])\s*\)$/i.exec(t)
  if (m) {
    const r = registre(m[1])
    if (!r || !r.a) throw new AsmErreur('Le mode -(…) demande un registre d’adresse.', col, t.length)
    return { m: 'predec', r: r.r }
  }
  // (An)+
  m = /^\(\s*([AS][0-7P])\s*\)\+$/i.exec(t)
  if (m) {
    const r = registre(m[1])
    if (!r || !r.a) throw new AsmErreur('Le mode (…)+ demande un registre d’adresse.', col, t.length)
    return { m: 'postinc', r: r.r }
  }

  // Forme avec parenthèses finales : d(…) ou (…)
  if (t.endsWith(')')) {
    // Trouver la parenthèse ouvrante correspondante
    let p = t.length - 1
    let profondeur = 0
    for (; p >= 0; p--) {
      if (t[p] === ')') profondeur++
      else if (t[p] === '(') {
        profondeur--
        if (profondeur === 0) break
      }
    }
    const dedans = t.slice(p + 1, t.length - 1)
    const avant = t.slice(0, p).trim()
    const colDedans = col + p + 1
    // Découpage de l'intérieur aux virgules, en gardant les colonnes
    const parties: Champ[] = []
    let debut = 0
    for (let k = 0; k <= dedans.length; k++) {
      if (k === dedans.length || dedans[k] === ',') {
        const brutPartie = dedans.slice(debut, k)
        parties.push({ texte: brutPartie.trim(), col: colDedans + debut + (brutPartie.length - brutPartie.trimStart().length) })
        debut = k + 1
      }
    }
    const estBase = (x: Champ | undefined): boolean => {
      if (!x) return false
      if (x.texte.toUpperCase() === 'PC') return true
      const r = registre(x.texte)
      return !!r && r.a
    }
    let deplacement: Champ | null = avant ? sous(0, p) : null
    let baseChamp: Champ | undefined
    let indexes: Champ[] = []
    if (estBase(parties[0])) {
      baseChamp = parties[0] // ancienne syntaxe : d(An,Xn)
      indexes = parties.slice(1)
    } else if (parties.length >= 2 && estBase(parties[1]) && !avant) {
      deplacement = parties[0] // nouvelle syntaxe : (d,An,Xn)
      baseChamp = parties[1]
      indexes = parties.slice(2)
    }
    if (baseChamp) {
      const estPC = baseChamp.texte.toUpperCase() === 'PC'
      const r = estPC ? 0 : registre(baseChamp.texte)!.r
      if (indexes.length === 0) {
        if (estPC) return { m: 'd16PC', d: deplacement ?? { texte: '0', col } }
        if (!deplacement) return { m: 'ind', r }
        return { m: 'd16An', r, d: deplacement }
      }
      if (indexes.length === 1) {
        const x = index(indexes[0].texte, indexes[0].col)
        if (estPC) return { m: 'd8PCXn', d: deplacement, x }
        return { m: 'd8AnXn', r, d: deplacement, x }
      }
      throw new AsmErreur('Trop de registres entre parenthèses.', col, t.length)
    }
    const premier = registre(parties[0]?.texte ?? '')
    if (premier && !premier.a) {
      throw new AsmErreur('Entre parenthèses, il faut un registre d’adresse (A0-A7) ou PC, pas un registre de données.', parties[0].col, parties[0].texte.length)
    }
    // Sinon : expression entre parenthèses, par exemple ($2000) ou (TABLE+2) → adresse absolue
  }

  // Adresse absolue, avec taille facultative .W / .L
  m = /^(.*)\.([WL])$/i.exec(t)
  if (m && m[1] !== '') return { m: 'abs', adr: sous(0, m[1].length), taille: m[2].toUpperCase() as 'W' | 'L' }
  return { m: 'abs', adr: sous(0, t.length), taille: null }
}
