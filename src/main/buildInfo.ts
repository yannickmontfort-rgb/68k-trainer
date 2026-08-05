import { app } from 'electron'
import { readFile } from 'fs/promises'
import { join } from 'path'
import type { BuildInfo } from '../shared/ipc'

function getBuildMetaPath(): string {
  const base = app.isPackaged ? process.resourcesPath : app.getAppPath()
  return join(base, 'build-meta.json')
}

/** build-meta.json est généré par `npm run version:bump` (voir dist:win) — absent en dev normal. */
export async function getBuildInfo(): Promise<BuildInfo> {
  try {
    const raw = await readFile(getBuildMetaPath(), 'utf-8')
    return JSON.parse(raw) as BuildInfo
  } catch {
    const pkgRaw = await readFile(join(app.getAppPath(), 'package.json'), 'utf-8')
    const pkg = JSON.parse(pkgRaw) as { version: string }
    return { version: pkg.version, year: new Date().getFullYear(), builtAt: null }
  }
}
