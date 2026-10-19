import { app } from 'electron'
import { readdir, readFile } from 'fs/promises'
import { join } from 'path'
import type { ContentBundle, CourseFile, Exercise, ExerciseLevel, Track } from '../shared/ipc'
import type { Chapitre, ContenuExercice, Parcours, Plateforme } from '../shared/parcours'

function getContentRoot(): string {
  // En dehors d'Electron (tests), on lit le dossier content/ du dépôt
  const base = app ? (app.isPackaged ? process.resourcesPath : app.getAppPath()) : process.cwd()
  return join(base, 'content')
}

function parseFrontmatter(raw: string): { attrs: Record<string, string | string[]>; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!match) return { attrs: {}, body: raw }
  const [, frontmatter, body] = match
  const attrs: Record<string, string | string[]> = {}
  for (const line of frontmatter.split(/\r?\n/)) {
    const fieldMatch = line.match(/^(\w+):\s*(.*)$/)
    if (!fieldMatch) continue
    const [, key, rawValue] = fieldMatch
    attrs[key] = rawValue.startsWith('[') ? JSON.parse(rawValue) : rawValue.replace(/^"|"$/g, '')
  }
  return { attrs, body }
}

async function listMarkdownFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => [])
  return entries
    .filter((e) => e.isFile() && e.name.endsWith('.md') && e.name.toUpperCase() !== 'README.MD')
    .map((e) => e.name)
}

async function listJsonFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => [])
  return entries.filter((e) => e.isFile() && e.name.endsWith('.json')).map((e) => e.name)
}

async function loadCourseFile(root: string, trackId: string, filename: string): Promise<CourseFile> {
  const raw = await readFile(join(root, 'courses', trackId, filename), 'utf-8')
  const { attrs, body } = parseFrontmatter(raw)
  return {
    slug: filename.replace(/\.md$/, ''),
    title: typeof attrs.title === 'string' ? attrs.title : filename,
    source: typeof attrs.source === 'string' ? attrs.source : '',
    themes: Array.isArray(attrs.themes) ? attrs.themes : [],
    markdown: body.trim()
  }
}

async function loadExerciseLevel(root: string, trackId: string, filename: string): Promise<ExerciseLevel> {
  const raw = await readFile(join(root, 'exercises', trackId, filename), 'utf-8')
  const parsed = JSON.parse(raw) as { level: number; title: string; exercises: Exercise[] }
  return parsed
}

interface ParcoursFile {
  id: string
  titre: string
  plateforme?: Plateforme
  description: string
  statut?: 'actif' | 'bientot'
  /** Dossiers de chapitres, dans l'ordre. */
  chapitres: string[]
}

/** Remplace un exercice `ref` par l'exercice de l'ancienne version qu'il désigne. */
function resolveRef(ex: ContenuExercice, legacy: Map<string, Exercise>): ContenuExercice {
  if (!ex.ref) return ex
  const old = legacy.get(ex.ref)
  if (!old) throw new Error(`Exercice de référence introuvable : ${ex.ref}`)
  return {
    ...ex,
    id: old.id,
    titre: ex.titre || old.title,
    enonce: ex.enonce ?? old.statement,
    indices: ex.indices ?? old.hints,
    codeDepart: ex.codeDepart ?? old.starterCode,
    solution: ex.solution ?? '',
    check: ex.check ?? old.check
  }
}

const CHAMPS_CODE = ['code', 'solution', 'codeDepart', 'entete', 'pied'] as const

/**
 * Un champ de code peut désigner un fichier du dossier du chapitre : "@code/premier.s".
 * Le code 68000 reste ainsi lisible (et assemblable tel quel) hors du JSON.
 */
async function resoudreFichiers(dir: string, objet: Record<string, unknown>): Promise<void> {
  for (const champ of CHAMPS_CODE) {
    const v = objet[champ]
    if (typeof v === 'string' && v.startsWith('@')) {
      objet[champ] = (await readFile(join(dir, v.slice(1)), 'utf-8')).replace(/\r\n/g, '\n').replace(/\n+$/, '')
    }
  }
  if (Array.isArray(objet.questions)) {
    for (const q of objet.questions) await resoudreFichiers(dir, q as Record<string, unknown>)
  }
}

async function loadChapitre(dir: string, legacy: Map<string, Exercise>): Promise<Chapitre> {
  const chapitre = JSON.parse(await readFile(join(dir, 'chapitre.json'), 'utf-8')) as Chapitre
  chapitre.plateforme ??= 'atari'
  for (const b of chapitre.bonus ?? []) await resoudreFichiers(dir, b as unknown as Record<string, unknown>)
  if (chapitre.qcm) await resoudreFichiers(dir, chapitre.qcm as unknown as Record<string, unknown>)
  for (const notion of chapitre.notions) {
    for (let i = 0; i < notion.contenus.length; i++) {
      const c = notion.contenus[i]
      await resoudreFichiers(dir, c as unknown as Record<string, unknown>)
      if (c.type === 'cours' && c.fichier && !c.markdown) {
        const raw = await readFile(join(dir, c.fichier), 'utf-8')
        c.markdown = parseFrontmatter(raw).body.trim()
      }
      if (c.type === 'exercice') notion.contenus[i] = resolveRef(c, legacy)
    }
  }
  chapitre.bonus = (chapitre.bonus ?? []).map((b) => ({ ...resolveRef(b, legacy), bonus: true }))
  return chapitre
}

async function loadAllParcours(root: string, legacy: Map<string, Exercise>): Promise<Parcours[]> {
  const parcoursRoot = join(root, 'parcours')
  const dirs = await readdir(parcoursRoot, { withFileTypes: true }).catch(() => [])
  const result: Parcours[] = []
  for (const d of dirs.filter((e) => e.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
    const base = join(parcoursRoot, d.name)
    const file = JSON.parse(await readFile(join(base, 'parcours.json'), 'utf-8')) as ParcoursFile
    const chapitres = await Promise.all(file.chapitres.map((c) => loadChapitre(join(base, c), legacy)))
    result.push({
      id: file.id,
      titre: file.titre,
      plateforme: file.plateforme ?? 'atari',
      description: file.description,
      statut: file.statut ?? 'actif',
      chapitres
    })
  }
  return result
}

export async function loadContent(root = getContentRoot()): Promise<ContentBundle> {
  const tracksRaw = await readFile(join(root, 'tracks.json'), 'utf-8')
  const tracks: Track[] = JSON.parse(tracksRaw).tracks

  const courses: Record<string, CourseFile[]> = {}
  const exercises: Record<string, ExerciseLevel[]> = {}

  for (const track of tracks) {
    const courseFiles = await listMarkdownFiles(join(root, 'courses', track.id))
    courses[track.id] = await Promise.all(courseFiles.map((f) => loadCourseFile(root, track.id, f)))

    const exerciseFiles = await listJsonFiles(join(root, 'exercises', track.id))
    const levels = await Promise.all(exerciseFiles.map((f) => loadExerciseLevel(root, track.id, f)))
    exercises[track.id] = levels.sort((a, b) => a.level - b.level)
  }

  const legacy = new Map<string, Exercise>()
  for (const levels of Object.values(exercises)) {
    for (const level of levels) for (const ex of level.exercises) legacy.set(ex.id, ex)
  }
  const parcours = await loadAllParcours(root, legacy)

  return { parcours, tracks, courses, exercises }
}
