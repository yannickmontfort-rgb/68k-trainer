import type { ContentBundle } from '../../shared/ipc'

import { langueCourante } from './langue'

/** Le contenu dans chaque langue déjà demandée. */
const cache = new Map<string, Promise<ContentBundle>>()

export function getContent(): Promise<ContentBundle> {
  const langue = langueCourante()
  let contenu = cache.get(langue)
  if (!contenu) {
    contenu = window.api.loadContent(langue)
    cache.set(langue, contenu)
  }
  return contenu
}
