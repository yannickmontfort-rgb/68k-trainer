import type { ProgressState } from '../../shared/ipc'
import { normaliserProgression } from '../../shared/progression'

/** Progression en mémoire, chargée une fois et réenregistrée à chaque changement. */
let state: ProgressState | null = null
let loading: Promise<ProgressState> | null = null

export function chargerProgression(): Promise<ProgressState> {
  if (state) return Promise.resolve(state)
  if (!loading) {
    loading = window.api.loadProgress().then((raw) => {
      state = normaliserProgression(raw)
      return state
    })
  }
  return loading
}

function enregistrer(): void {
  if (state) void window.api.saveProgress(state)
}

export function marquerVu(id: string): boolean {
  if (!state || state.contenusVus!.includes(id)) return false
  state.contenusVus!.push(id)
  enregistrer()
  return true
}

export function marquerExerciceReussi(id: string): boolean {
  if (!state || state.completedExerciseIds.includes(id)) return false
  state.completedExerciseIds.push(id)
  enregistrer()
  return true
}

export function enregistrerQcm(id: string, score: number, total: number, reussi: boolean): void {
  if (!state) return
  const prev = state.qcm![id]
  state.qcm![id] = {
    meilleurScore: Math.max(score, prev?.meilleurScore ?? 0),
    total,
    reussi: reussi || (prev?.reussi ?? false),
    date: new Date().toISOString()
  }
  enregistrer()
}

export function memoriserPosition(parcoursId: string, chapitreId: string, etapeId: string): void {
  if (!state) return
  state.derniere = { parcoursId, chapitreId, etapeId }
  enregistrer()
}

/** Remet la progression à zéro (bouton dans « À propos »). */
export function reinitialiserProgression(): void {
  state = normaliserProgression(null)
  enregistrer()
}
