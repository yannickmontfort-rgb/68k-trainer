import type { ContentBundle } from '../../shared/ipc'

let cached: Promise<ContentBundle> | null = null

export function getContent(): Promise<ContentBundle> {
  if (!cached) cached = window.api.loadContent()
  return cached
}
