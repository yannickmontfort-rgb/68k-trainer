/**
 * Le contenu du parcours de la machine choisie, rangé par chapitre, pour l'onglet « Fiches » (les cours).
 */
import type { ContentBundle } from '../../shared/ipc'
import type { Chapitre, ContenuCours, Parcours } from '../../shared/parcours'
import { machineActive } from './progressionStore'

/** Le parcours actif de la machine du profil (comme l'onglet « Parcours »). */
export function parcoursDeLaMachine(content: ContentBundle): Parcours | undefined {
  const actifs = content.parcours.filter((p) => p.statut === 'actif')
  return actifs.find((p) => p.plateforme === machineActive()) ?? actifs[0]
}

/** Piste des fiches de référence propres à la machine du profil. */
export const pisteDeLaMachine = (): string => (machineActive() === 'amiga' ? 'amiga' : 'atari-st')

export interface Groupe<T> {
  chapitre: Chapitre
  elements: T[]
}

export function coursParChapitre(parcours: Parcours): Groupe<ContenuCours>[] {
  return parcours.chapitres
    .map((chapitre) => ({
      chapitre,
      elements: chapitre.notions.flatMap((n) => n.contenus.filter((c): c is ContenuCours => c.type === 'cours'))
    }))
    .filter((g) => g.elements.length > 0)
}
