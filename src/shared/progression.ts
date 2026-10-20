/**
 * Calcul de la progression (style OpenClassrooms) : logique pure, sans DOM ni IPC.
 * Le bonus n'entre jamais dans le pourcentage obligatoire.
 */
import type { ProgressState } from './ipc'
import type { Chapitre, Contenu, Notion, Parcours } from './parcours'
import { SEUIL_QCM_DEFAUT } from './parcours'

export type EtatNotion = 'non-commencee' | 'en-cours' | 'terminee'

export function normaliserProgression(state: Partial<ProgressState> | null | undefined): ProgressState {
  return {
    version: 2,
    completedExerciseIds: state?.completedExerciseIds ?? [],
    contenusVus: state?.contenusVus ?? [],
    qcm: state?.qcm ?? {},
    derniere: state?.derniere,
    positions: state?.positions ?? (state?.derniere ? { [state.derniere.parcoursId]: { chapitreId: state.derniere.chapitreId, etapeId: state.derniere.etapeId } } : {}),
    machine: state?.machine ?? 'atari'
  }
}

export function contenuTermine(contenu: Contenu, p: ProgressState): boolean {
  if (contenu.type === 'exercice') return p.completedExerciseIds.includes(contenu.id)
  return (p.contenusVus ?? []).includes(contenu.id)
}

export function qcmReussi(chapitre: Chapitre, p: ProgressState): boolean {
  return chapitre.qcm ? (p.qcm?.[chapitre.qcm.id]?.reussi ?? false) : true
}

export function etatNotion(notion: Notion, p: ProgressState): EtatNotion {
  const faits = notion.contenus.filter((c) => contenuTermine(c, p)).length
  if (faits === 0) return 'non-commencee'
  return faits === notion.contenus.length ? 'terminee' : 'en-cours'
}

export interface DetailChapitre {
  cours: { faits: number; total: number }
  exemples: { faits: number; total: number }
  exercices: { faits: number; total: number }
  predictions: { faits: number; total: number }
  qcm: { present: boolean; reussi: boolean; meilleurScore?: number }
  bonus: { faits: number; total: number }
  /** Éléments obligatoires (contenus + QCM). */
  faits: number
  total: number
  pourcentage: number
  termine: boolean
}

export function detailChapitre(chapitre: Chapitre, p: ProgressState): DetailChapitre {
  const compte = (type: Contenu['type']): { faits: number; total: number } => {
    const contenus = chapitre.notions.flatMap((n) => n.contenus).filter((c) => c.type === type)
    return { faits: contenus.filter((c) => contenuTermine(c, p)).length, total: contenus.length }
  }
  const cours = compte('cours')
  const exemples = compte('exemple')
  const exercices = compte('exercice')
  const predictions = compte('prediction')
  const qcmPresent = !!chapitre.qcm
  const reussi = qcmReussi(chapitre, p)
  const bonusListe = chapitre.bonus ?? []
  const faits = cours.faits + exemples.faits + exercices.faits + predictions.faits + (qcmPresent && reussi ? 1 : 0)
  const total = cours.total + exemples.total + exercices.total + predictions.total + (qcmPresent ? 1 : 0)
  return {
    cours,
    exemples,
    exercices,
    predictions,
    qcm: { present: qcmPresent, reussi, meilleurScore: chapitre.qcm ? p.qcm?.[chapitre.qcm.id]?.meilleurScore : undefined },
    bonus: { faits: bonusListe.filter((b) => contenuTermine(b, p)).length, total: bonusListe.length },
    faits,
    total,
    pourcentage: total === 0 ? 0 : Math.round((faits / total) * 100),
    termine: total > 0 && faits === total
  }
}

export interface DetailParcours {
  faits: number
  total: number
  pourcentage: number
  chapitresTermines: number
  chapitresTotal: number
  bonusFaits: number
  bonusTotal: number
}

export function detailParcours(parcours: Parcours, p: ProgressState): DetailParcours {
  let faits = 0
  let total = 0
  let chapitresTermines = 0
  let bonusFaits = 0
  let bonusTotal = 0
  for (const chapitre of parcours.chapitres) {
    const d = detailChapitre(chapitre, p)
    faits += d.faits
    total += d.total
    if (d.termine) chapitresTermines++
    bonusFaits += d.bonus.faits
    bonusTotal += d.bonus.total
  }
  return {
    faits,
    total,
    pourcentage: total === 0 ? 0 : Math.round((faits / total) * 100),
    chapitresTermines,
    chapitresTotal: parcours.chapitres.length,
    bonusFaits,
    bonusTotal
  }
}

/** Élément navigable du parcours, dans l'ordre de lecture. */
export interface Etape {
  chapitreId: string
  /** Identifiant du contenu, du QCM (`qcm.id`) ou du bonus. */
  id: string
  genre: Contenu['type'] | 'qcm' | 'bonus'
}

export function etapesDuParcours(parcours: Parcours): Etape[] {
  const etapes: Etape[] = []
  for (const chapitre of parcours.chapitres) {
    for (const notion of chapitre.notions) {
      for (const c of notion.contenus) etapes.push({ chapitreId: chapitre.id, id: c.id, genre: c.type })
    }
    if (chapitre.qcm) etapes.push({ chapitreId: chapitre.id, id: chapitre.qcm.id, genre: 'qcm' })
    for (const b of chapitre.bonus ?? []) etapes.push({ chapitreId: chapitre.id, id: b.id, genre: 'bonus' })
  }
  return etapes
}

/** Première étape obligatoire non terminée (pour « Commencer » quand rien n'est mémorisé). */
export function premiereEtapeAFaire(parcours: Parcours, p: ProgressState): Etape | undefined {
  for (const chapitre of parcours.chapitres) {
    for (const notion of chapitre.notions) {
      for (const c of notion.contenus) {
        if (!contenuTermine(c, p)) return { chapitreId: chapitre.id, id: c.id, genre: c.type }
      }
    }
    if (chapitre.qcm && !qcmReussi(chapitre, p)) return { chapitreId: chapitre.id, id: chapitre.qcm.id, genre: 'qcm' }
  }
  return undefined
}

/** Résultat d'un QCM : score, réussite selon le seuil. */
export function corrigerQcm(
  bonnes: number[],
  reponses: (number | undefined)[],
  seuil = SEUIL_QCM_DEFAUT
): { score: number; total: number; reussi: boolean } {
  const score = bonnes.filter((b, i) => reponses[i] === b).length
  const total = bonnes.length
  return { score, total, reussi: total > 0 && score / total >= seuil - 1e-9 }
}
