import { app } from 'electron'
import { readdir, readFile } from 'fs/promises'
import { join } from 'path'
import type { ContentBundle, CourseFile, Exercise, ExerciseLevel, Track } from '../shared/ipc'

function getContentRoot(): string {
  const base = app.isPackaged ? process.resourcesPath : app.getAppPath()
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

export async function loadContent(): Promise<ContentBundle> {
  const root = getContentRoot()
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

  return { tracks, courses, exercises }
}
