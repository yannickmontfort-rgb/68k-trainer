/**
 * Traduction du contenu : à côté de `chapitre.json` (le français, référence), un fichier
 * `chapitre.en.json` ne contient que des textes, rangés par identifiant. Un texte absent garde le
 * français ; un identifiant inconnu est une erreur (une traduction ne doit pas viser un contenu qui
 * n'existe pas). Le code, les vérifications et la structure ne viennent jamais de la traduction.
 */
import type { Chapitre, Contenu, QuestionQcm } from './parcours'

export type Langue = 'fr' | 'en'
export const LANGUES: Langue[] = ['fr', 'en']

export interface TraductionQuestion {
  enonce?: string
  choix?: string[]
  explication?: string
}

export interface TraductionContenu {
  titre?: string
  introduction?: string
  conclusion?: string
  enonce?: string
  indices?: string[]
  /** Explications d'un exemple, par numéro de ligne. */
  explications?: Record<string, string>
  /** Questions d'une prédiction, par identifiant. */
  questions?: Record<string, TraductionQuestion>
  /** Exercice « ordonner » : les mêmes lignes, commentaires traduits (le code doit rester identique). */
  lignes?: string[]
  source?: string
}

export interface TraductionChapitre {
  titre?: string
  resume?: string
  notions?: Record<string, { titre?: string }>
  contenus?: Record<string, TraductionContenu>
  /** Questions du QCM, par identifiant. */
  qcm?: Record<string, TraductionQuestion>
}

function traduireQuestions(questions: QuestionQcm[], traduction: Record<string, TraductionQuestion>, ou: string): void {
  for (const [id, tq] of Object.entries(traduction)) {
    const q = questions.find((x) => x.id === id)
    if (!q) throw new Error(`Traduction : question « ${id} » inconnue dans ${ou}`)
    if (tq.choix && tq.choix.length !== q.choix.length) throw new Error(`Traduction : ${ou}, question ${id} : ${tq.choix.length} choix au lieu de ${q.choix.length}`)
    if (tq.enonce) q.enonce = tq.enonce
    if (tq.choix) q.choix = tq.choix
    if (tq.explication) q.explication = tq.explication
  }
}

/** Applique une traduction à un chapitre déjà chargé (modifie le chapitre). */
export function traduireChapitre(chapitre: Chapitre, t: TraductionChapitre): Chapitre {
  if (t.titre) chapitre.titre = t.titre
  if (t.resume) chapitre.resume = t.resume
  for (const [id, tn] of Object.entries(t.notions ?? {})) {
    const n = chapitre.notions.find((x) => x.id === id)
    if (!n) throw new Error(`Traduction : notion « ${id} » inconnue dans ${chapitre.id}`)
    if (tn.titre) n.titre = tn.titre
  }
  const contenus: Contenu[] = [...chapitre.notions.flatMap((n) => n.contenus), ...(chapitre.bonus ?? [])]
  for (const [id, tc] of Object.entries(t.contenus ?? {})) {
    const c = contenus.find((x) => x.id === id) as (Contenu & Record<string, unknown>) | undefined
    if (!c) throw new Error(`Traduction : contenu « ${id} » inconnu dans ${chapitre.id}`)
    for (const champ of ['titre', 'introduction', 'conclusion', 'enonce', 'source'] as const) {
      if (tc[champ]) c[champ] = tc[champ]
    }
    if (tc.indices) c.indices = tc.indices
    if (tc.lignes) {
      if (c.type !== 'exercice' || !c.lignes || c.lignes.length !== tc.lignes.length) {
        throw new Error(`Traduction : ${id} : les lignes à ordonner ne correspondent pas`)
      }
      c.lignes = tc.lignes
    }
    if (tc.explications) {
      if (c.type !== 'exemple') throw new Error(`Traduction : ${id} n'est pas un exemple`)
      for (const [ligne, texte] of Object.entries(tc.explications)) {
        const e = c.explications.find((x) => x.ligne === Number(ligne))
        if (!e) throw new Error(`Traduction : ${id} : pas d'explication à la ligne ${ligne}`)
        e.texte = texte
      }
    }
    if (tc.questions) {
      if (c.type !== 'prediction') throw new Error(`Traduction : ${id} n'est pas une prédiction`)
      traduireQuestions(c.questions, tc.questions, id)
    }
  }
  if (t.qcm) {
    if (!chapitre.qcm) throw new Error(`Traduction : ${chapitre.id} n'a pas de QCM`)
    traduireQuestions(chapitre.qcm.questions, t.qcm, `${chapitre.id} (QCM)`)
  }
  return chapitre
}

/** Nom du fichier traduit : `01-unites.md` → `01-unites.en.md`, `code.s` → `code.en.s`. */
export function fichierTraduit(fichier: string, langue: Langue): string {
  if (langue === 'fr') return fichier
  const point = fichier.lastIndexOf('.')
  return point < 0 ? `${fichier}.${langue}` : `${fichier.slice(0, point)}.${langue}${fichier.slice(point)}`
}

/**
 * Le code sans ses commentaires, pour vérifier qu'une traduction n'a changé que les commentaires :
 * on retire ce qui suit un `;` hors d'une chaîne, et les lignes de commentaire commençant par `*`.
 */
export function codeSansCommentaires(code: string): string {
  return code
    .replace(/\r/g, '')
    .split('\n')
    .map((ligne) => {
      if (/^\s*\*/.test(ligne)) return ''
      let dansChaine: string | null = null
      for (let i = 0; i < ligne.length; i++) {
        const c = ligne[i]
        if (dansChaine) {
          if (c === dansChaine) dansChaine = null
        } else if (c === "'" || c === '"') dansChaine = c
        else if (c === ';') return ligne.slice(0, i).trimEnd()
      }
      return ligne.trimEnd()
    })
    .filter((l) => l.trim() !== '')
    .join('\n')
}
