import { app } from 'electron'
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import type { ProgressState } from '../shared/ipc'
import { normaliserProgression } from '../shared/progression'

function getProgressPath(): string {
  return join(app.getPath('userData'), 'progress.json')
}

export async function loadProgress(): Promise<ProgressState> {
  try {
    const raw = await readFile(getProgressPath(), 'utf-8')
    return normaliserProgression(JSON.parse(raw) as Partial<ProgressState>)
  } catch {
    return normaliserProgression(null)
  }
}

export async function saveProgress(state: ProgressState): Promise<void> {
  await writeFile(getProgressPath(), JSON.stringify(state, null, 2), 'utf-8')
}
