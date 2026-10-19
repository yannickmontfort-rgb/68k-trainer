/**
 * Expressions de l'assembleur, avec les règles de Devpac (vérifiées contre vasm -devpac) :
 * nombres décimaux, $hexa, %binaire, @octal, caractères 'AB', `*` (adresse courante), symboles.
 *
 * Priorités, de la plus forte à la plus faible :
 *   unaires (- + ~ !) > << >> > & > | ! ^ > * / // % > + - > comparaisons (= == <> != < > <= >=)
 * Les calculs se font sur 32 bits ; la division tronque vers zéro ; « vrai » vaut -1.
 */
import { AsmErreur } from './erreurs'

export interface Valeur {
  /** Valeur sur 32 bits (entier signé JavaScript). */
  v: number
  /**
   * Nombre d'adresses relogeables dans le calcul : 0 = constante, 1 = adresse du programme (à
   * corriger au chargement d'un .PRG). `etiquette - etiquette` donne 0.
   */
  reloc: number
  /** Un symbole n'est pas (encore) défini : en première passe, la valeur vaut 0. */
  inconnu: boolean
}

export interface ContexteExpression {
  /** Adresse courante (pour `*`). */
  pc: number
  pcReloc: number
  /** Résout un symbole déjà normalisé (étiquettes locales préfixées). `undefined` = inconnu. */
  symbole(nom: string, colonne: number): { v: number; reloc: number } | undefined
  /** Normalise un nom (étiquette locale `.x` ou `1$` → nom complet). */
  normaliser(nom: string): string
}

const i32 = (n: number): number => n | 0

type Jeton =
  | { t: 'nombre'; v: number; col: number }
  | { t: 'symbole'; nom: string; col: number }
  | { t: 'op'; op: string; col: number }
  | { t: 'etoile'; col: number }

const OPERATEURS = ['<<', '>>', '//', '<=', '>=', '<>', '!=', '==', '+', '-', '*', '/', '%', '&', '|', '!', '^', '~', '(', ')', '=', '<', '>']

export function estCaractereSymbole(c: string): boolean {
  return /[A-Za-z0-9_.$@?]/.test(c)
}

function analyserJetons(texte: string, base: number): Jeton[] {
  const jetons: Jeton[] = []
  let i = 0
  while (i < texte.length) {
    const c = texte[i]
    const col = base + i
    if (c === ' ' || c === '\t') {
      i++
      continue
    }
    if (c === '$' && /[0-9A-Fa-f]/.test(texte[i + 1] ?? '')) {
      let j = i + 1
      while (j < texte.length && /[0-9A-Fa-f]/.test(texte[j])) j++
      jetons.push({ t: 'nombre', v: i32(parseInt(texte.slice(i + 1, j), 16)), col })
      i = j
      continue
    }
    if (c === '%' && /[01]/.test(texte[i + 1] ?? '') && !finDeTerme(jetons)) {
      let j = i + 1
      while (j < texte.length && /[01]/.test(texte[j])) j++
      jetons.push({ t: 'nombre', v: i32(parseInt(texte.slice(i + 1, j), 2)), col })
      i = j
      continue
    }
    if (c === '@' && /[0-7]/.test(texte[i + 1] ?? '') && !finDeTerme(jetons)) {
      let j = i + 1
      while (j < texte.length && /[0-7]/.test(texte[j])) j++
      jetons.push({ t: 'nombre', v: i32(parseInt(texte.slice(i + 1, j), 8)), col })
      i = j
      continue
    }
    if (/[0-9]/.test(c)) {
      let j = i
      while (j < texte.length && /[0-9]/.test(texte[j])) j++
      // « 1$ » : étiquette locale numérique à la Devpac
      if (texte[j] === '$') {
        jetons.push({ t: 'symbole', nom: texte.slice(i, j + 1), col })
        i = j + 1
        continue
      }
      jetons.push({ t: 'nombre', v: i32(parseInt(texte.slice(i, j), 10)), col })
      i = j
      continue
    }
    if (c === "'" || c === '"') {
      const { valeur, fin } = lireCaracteres(texte, i, base)
      jetons.push({ t: 'nombre', v: valeur, col })
      i = fin
      continue
    }
    if (/[A-Za-z_.]/.test(c)) {
      let j = i
      while (j < texte.length && estCaractereSymbole(texte[j])) j++
      jetons.push({ t: 'symbole', nom: texte.slice(i, j), col })
      i = j
      continue
    }
    if (c === '*' && !finDeTerme(jetons)) {
      jetons.push({ t: 'etoile', col })
      i++
      continue
    }
    const op = OPERATEURS.find((o) => texte.startsWith(o, i))
    if (op) {
      jetons.push({ t: 'op', op, col })
      i += op.length
      continue
    }
    throw new AsmErreur(`Caractère inattendu « ${c} » dans l'expression.`, col, 1)
  }
  return jetons
}

/** Le dernier jeton termine-t-il un terme (alors `*`, `%`, `@` sont des opérateurs) ? */
function finDeTerme(jetons: Jeton[]): boolean {
  const d = jetons[jetons.length - 1]
  if (!d) return false
  return d.t === 'nombre' || d.t === 'symbole' || d.t === 'etoile' || (d.t === 'op' && d.op === ')')
}

/** Lit 'ABCD' ou "ABCD" (guillemet doublé = guillemet) ; renvoie la valeur gros-boutiste. */
function lireCaracteres(texte: string, debut: number, base: number): { valeur: number; fin: number } {
  const q = texte[debut]
  let i = debut + 1
  const octets: number[] = []
  for (;;) {
    if (i >= texte.length) throw new AsmErreur('Guillemet fermant manquant.', base + debut, texte.length - debut)
    if (texte[i] === q) {
      if (texte[i + 1] === q) {
        octets.push(q.charCodeAt(0))
        i += 2
        continue
      }
      i++
      break
    }
    octets.push(texte.charCodeAt(i) & 0xff)
    i++
  }
  if (octets.length > 4) throw new AsmErreur('Une constante caractère contient au plus 4 caractères.', base + debut, i - debut)
  let valeur = 0
  for (const o of octets) valeur = (valeur << 8) | o
  return { valeur: i32(valeur), fin: i }
}

const NIVEAUX: string[][] = [
  ['=', '==', '<>', '!=', '<', '>', '<=', '>='],
  ['+', '-'],
  ['*', '/', '//', '%'],
  ['|', '!', '^'],
  ['&'],
  ['<<', '>>']
]

/** Évalue une expression complète. `base` = colonne de début dans la ligne (pour les erreurs). */
export function evaluer(texte: string, ctx: ContexteExpression, base = 0): Valeur {
  const jetons = analyserJetons(texte, base)
  if (jetons.length === 0) throw new AsmErreur('Valeur manquante.', base, 1)
  let pos = 0

  const voir = (): Jeton | undefined => jetons[pos]

  function niveau(n: number): Valeur {
    if (n >= NIVEAUX.length) return unaire()
    let gauche = niveau(n + 1)
    for (;;) {
      const j = voir()
      if (!j || j.t !== 'op' || !NIVEAUX[n].includes(j.op)) return gauche
      pos++
      const droite = niveau(n + 1)
      gauche = appliquer(j.op, gauche, droite, j.col)
    }
  }

  function unaire(): Valeur {
    const j = voir()
    if (j && j.t === 'op' && ['-', '+', '~', '!'].includes(j.op)) {
      pos++
      const x = unaire()
      if (j.op === '-') return { v: i32(-x.v), reloc: -x.reloc, inconnu: x.inconnu }
      if (j.op === '+') return x
      if (j.op === '~') return { v: ~x.v, reloc: 0, inconnu: x.inconnu }
      return { v: x.v === 0 ? -1 : 0, reloc: 0, inconnu: x.inconnu }
    }
    return primaire()
  }

  function primaire(): Valeur {
    const j = voir()
    if (!j) throw new AsmErreur('Expression incomplète.', base + texte.length, 1)
    pos++
    if (j.t === 'nombre') return { v: j.v, reloc: 0, inconnu: false }
    if (j.t === 'etoile') return { v: ctx.pc, reloc: ctx.pcReloc, inconnu: false }
    if (j.t === 'symbole') {
      const s = ctx.symbole(ctx.normaliser(j.nom), j.col)
      if (!s) return { v: 0, reloc: 0, inconnu: true }
      return { v: i32(s.v), reloc: s.reloc, inconnu: false }
    }
    if (j.op === '(') {
      const x = niveau(0)
      const f = voir()
      if (!f || f.t !== 'op' || f.op !== ')') throw new AsmErreur('Parenthèse fermante « ) » manquante.', j.col, 1)
      pos++
      return x
    }
    throw new AsmErreur(`« ${j.op} » inattendu : il manque une valeur.`, j.col, j.op.length)
  }

  const resultat = niveau(0)
  if (pos < jetons.length) {
    const j = jetons[pos]
    throw new AsmErreur('Texte inattendu dans l’expression.', j.col, 1)
  }
  return resultat
}

function appliquer(op: string, a: Valeur, b: Valeur, col: number): Valeur {
  const inconnu = a.inconnu || b.inconnu
  const constant = (v: number): Valeur => ({ v: i32(v), reloc: 0, inconnu })
  switch (op) {
    case '+':
      return { v: i32(a.v + b.v), reloc: a.reloc + b.reloc, inconnu }
    case '-':
      return { v: i32(a.v - b.v), reloc: a.reloc - b.reloc, inconnu }
    case '*':
      return constant(Math.imul(a.v, b.v))
    case '/':
    case '//':
    case '%':
      if (b.v === 0) {
        if (inconnu) return constant(0)
        throw new AsmErreur('Division par zéro dans une expression.', col, op.length)
      }
      return constant(op === '/' ? Math.trunc(a.v / b.v) : a.v % b.v)
    case '<<':
      return constant(a.v << (b.v & 31))
    case '>>':
      return constant(a.v >>> (b.v & 31))
    case '&':
      return constant(a.v & b.v)
    case '|':
    case '!':
      return constant(a.v | b.v)
    case '^':
      return constant(a.v ^ b.v)
    case '=':
    case '==':
      return constant(a.v === b.v ? -1 : 0)
    case '<>':
    case '!=':
      return constant(a.v !== b.v ? -1 : 0)
    case '<':
      return constant(a.v < b.v ? -1 : 0)
    case '>':
      return constant(a.v > b.v ? -1 : 0)
    case '<=':
      return constant(a.v <= b.v ? -1 : 0)
    case '>=':
      return constant(a.v >= b.v ? -1 : 0)
  }
  throw new AsmErreur(`Opérateur « ${op} » inconnu.`, col, op.length)
}
