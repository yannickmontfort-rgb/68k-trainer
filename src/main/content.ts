import { app } from 'electron'
import { access, readdir, readFile } from 'fs/promises'
import { join } from 'path'
import type { ContentBundle, CourseFile, Exercise, ExerciseLevel, Track } from '../shared/ipc'
import type { Chapitre, ContenuExercice, Parcours, Plateforme } from '../shared/parcours'
import { adapterEnLigne, adapterTexte, appliquerVariantes, type MachineContenu } from '../shared/adaptation'
import { fichierTraduit, traduireChapitre, type Langue, type TraductionChapitre } from '../shared/traduction'

const existe = (chemin: string): Promise<boolean> => access(chemin).then(() => true, () => false)

/** Le fichier dans la langue demandée s'il existe, sinon le français. */
async function versionTraduite(dir: string, fichier: string, langue: Langue): Promise<string> {
  const traduit = fichierTraduit(fichier, langue)
  return traduit !== fichier && (await existe(join(dir, traduit))) ? traduit : fichier
}

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
    .filter((e) => e.isFile() && e.name.endsWith('.md') && !/\.[a-z]{2}\.md$/.test(e.name) && e.name.toUpperCase() !== 'README.MD')
    .map((e) => e.name)
}

async function listJsonFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => [])
  // Les traductions (niveau-1.en.json) ne sont pas des niveaux à part
  return entries.filter((e) => e.isFile() && e.name.endsWith('.json') && !/\.[a-z]{2}\.json$/.test(e.name)).map((e) => e.name)
}

async function loadCourseFile(root: string, trackId: string, filename: string, langue: Langue = 'fr'): Promise<CourseFile> {
  const dir = join(root, 'courses', trackId)
  const raw = await readFile(join(dir, await versionTraduite(dir, filename, langue)), 'utf-8')
  const { attrs, body } = parseFrontmatter(raw)
  return {
    slug: filename.replace(/\.md$/, ''),
    title: typeof attrs.title === 'string' ? attrs.title : filename,
    source: typeof attrs.source === 'string' ? attrs.source : '',
    themes: Array.isArray(attrs.themes) ? attrs.themes : [],
    markdown: body.trim()
  }
}

async function loadExerciseLevel(root: string, trackId: string, filename: string, langue: Langue = 'fr'): Promise<ExerciseLevel> {
  const dir = join(root, 'exercises', trackId)
  const raw = await readFile(join(dir, await versionTraduite(dir, filename, langue)), 'utf-8')
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
 * "fichier.s" : tout le fichier ; "fichier.s#nom" : le bloc qui suit la ligne `;=== nom` dans ce
 * fichier, jusqu'au marqueur suivant (un seul fichier regroupe ainsi tous les codes d'un chapitre).
 * Un bloc `;=== nom@amiga` remplace `;=== nom` pour l'Amiga (tronc commun).
 */
async function lireCode(dir: string, ref: string, machine: MachineContenu, langue: Langue = 'fr'): Promise<string> {
  const [fichierFr, nom] = ref.split('#')
  let fichier = await versionTraduite(dir, fichierFr, langue)
  if (fichier !== fichierFr && nom) {
    // Un bloc absent de la traduction se lit en français
    const traduit = await readFile(join(dir, fichier), 'utf-8')
    if (!traduit.split(/\r?\n/).some((l) => l.trim() === `;=== ${nom}` || l.trim() === `;=== ${nom}@${machine}`)) fichier = fichierFr
  }
  const texte = adapterTexte((await readFile(join(dir, fichier), 'utf-8')).replace(/\r\n/g, '\n'), machine)
  if (!nom) return texte.replace(/\n+$/, '')
  const lignes = texte.split('\n')
  const variante = lignes.findIndex((l) => l.trim() === `;=== ${nom}@${machine}`)
  const debut = variante >= 0 ? variante : lignes.findIndex((l) => l.trim() === `;=== ${nom}`)
  if (debut < 0) throw new Error(`Bloc de code « ${nom} » introuvable dans ${fichier}`)
  let fin = lignes.findIndex((l, i) => i > debut && l.startsWith(';=== '))
  if (fin < 0) fin = lignes.length
  return lignes.slice(debut + 1, fin).join('\n').replace(/\n+$/, '')
}

/**
 * Un champ de code peut désigner un fichier du dossier du chapitre : "@code/premier.s".
 * Le code 68000 reste ainsi lisible (et assemblable tel quel) hors du JSON.
 */
async function resoudreFichiers(dir: string, objet: Record<string, unknown>, machine: MachineContenu, langue: Langue): Promise<void> {
  for (const champ of CHAMPS_CODE) {
    const v = objet[champ]
    if (typeof v === 'string' && v.startsWith('@')) objet[champ] = await lireCode(dir, v.slice(1), machine, langue)
  }
  if (Array.isArray(objet.questions)) {
    for (const q of objet.questions) await resoudreFichiers(dir, q as Record<string, unknown>, machine, langue)
  }
}

/** Le texte du chapitre adapté à la machine du parcours (tronc commun : `[[atari:…|amiga:…]]`, variantes). */
async function lireChapitre(dir: string, machine: MachineContenu): Promise<Chapitre> {
  const chapitre = JSON.parse(adapterEnLigne(await readFile(join(dir, 'chapitre.json'), 'utf-8'), machine)) as Chapitre
  appliquerVariantes(chapitre, machine)
  return chapitre
}

async function loadChapitre(dir: string, legacy: Map<string, Exercise>, machine: MachineContenu, langue: Langue): Promise<Chapitre> {
  const chapitre = await lireChapitre(dir, machine)
  chapitre.plateforme ??= 'atari'
  chapitre.notions ??= [] // chapitre esquissé : pas encore de contenu
  for (const b of chapitre.bonus ?? []) await resoudreFichiers(dir, b as unknown as Record<string, unknown>, machine, langue)
  if (chapitre.qcm) await resoudreFichiers(dir, chapitre.qcm as unknown as Record<string, unknown>, machine, langue)
  for (const notion of chapitre.notions) {
    for (let i = 0; i < notion.contenus.length; i++) {
      const c = notion.contenus[i]
      await resoudreFichiers(dir, c as unknown as Record<string, unknown>, machine, langue)
      if (c.type === 'cours' && c.fichier && !c.markdown) {
        const raw = await readFile(join(dir, await versionTraduite(dir, c.fichier, langue)), 'utf-8')
        c.markdown = adapterTexte(parseFrontmatter(raw).body.trim(), machine)
      }
      if (c.type === 'exercice') notion.contenus[i] = resolveRef(c, legacy)
    }
  }
  chapitre.bonus = (chapitre.bonus ?? []).map((b) => ({ ...resolveRef(b, legacy), bonus: true }))
  // Les textes traduits, par-dessus le français (après resolveRef : les anciens exercices aussi)
  const traduction = fichierTraduit('chapitre.json', langue)
  if (traduction !== 'chapitre.json' && (await existe(join(dir, traduction)))) {
    const t = JSON.parse(adapterEnLigne(await readFile(join(dir, traduction), 'utf-8'), machine)) as TraductionChapitre
    traduireChapitre(chapitre, t)
  }
  return chapitre
}

async function loadAllParcours(root: string, legacy: Map<string, Exercise>, langue: Langue): Promise<Parcours[]> {
  const parcoursRoot = join(root, 'parcours')
  const dirs = await readdir(parcoursRoot, { withFileTypes: true }).catch(() => [])
  const result: Parcours[] = []
  for (const d of dirs.filter((e) => e.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
    const base = join(parcoursRoot, d.name)
    // Le dossier « commun » (chapitres partagés) n'est pas un parcours
    const texte = await readFile(join(base, 'parcours.json'), 'utf-8').catch(() => null)
    if (texte === null) continue
    const file = JSON.parse(texte) as ParcoursFile
    const traduit = fichierTraduit('parcours.json', langue)
    if (traduit !== 'parcours.json' && (await existe(join(base, traduit)))) {
      const t = JSON.parse(await readFile(join(base, traduit), 'utf-8')) as { titre?: string; description?: string }
      file.titre = t.titre ?? file.titre
      file.description = t.description ?? file.description
    }
    const machine: MachineContenu = file.plateforme === 'amiga' ? 'amiga' : 'atari'
    const chapitres = await Promise.all(file.chapitres.map((c) => loadChapitre(join(base, c), legacy, machine, langue)))
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

export async function loadContent(root = getContentRoot(), langue: Langue = 'fr'): Promise<ContentBundle> {
  const tracksRaw = await readFile(join(root, await versionTraduite(root, 'tracks.json', langue)), 'utf-8')
  const tracks: Track[] = JSON.parse(tracksRaw).tracks

  const courses: Record<string, CourseFile[]> = {}
  const exercises: Record<string, ExerciseLevel[]> = {}

  for (const track of tracks) {
    const courseFiles = await listMarkdownFiles(join(root, 'courses', track.id))
    courses[track.id] = await Promise.all(courseFiles.map((f) => loadCourseFile(root, track.id, f, langue)))

    const exerciseFiles = await listJsonFiles(join(root, 'exercises', track.id))
    const levels = await Promise.all(exerciseFiles.map((f) => loadExerciseLevel(root, track.id, f, langue)))
    exercises[track.id] = levels.sort((a, b) => a.level - b.level)
  }

  const legacy = new Map<string, Exercise>()
  for (const levels of Object.values(exercises)) {
    for (const level of levels) for (const ex of level.exercises) legacy.set(ex.id, ex)
  }
  const parcours = await loadAllParcours(root, legacy, langue)

  return { parcours, tracks, courses, exercises }
}
