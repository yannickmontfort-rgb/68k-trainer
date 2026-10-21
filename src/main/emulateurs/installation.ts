/**
 * Installation, configuration et lancement des émulateurs d'étude (Windows d'abord).
 *
 * - Les paquets viennent de resources/emulateurs/ (version complète de 68k Trainer) ou sont
 *   téléchargés (version légère), puis vérifiés par leur SHA-256 avant d'être extraits.
 * - Tout est installé dans le dossier de l'utilisateur, sans droits administrateur :
 *   %LOCALAPPDATA%\68k Trainer\emulateurs\<id>\
 * - Les dossiers de partage sont dans les Documents : 68k Trainer\Atari (disque C: de Hatari)
 *   et 68k Trainer\Amiga (disque PARTAGE: de l'Amiga).
 * - Les réglages de 68k Trainer sont privés : on ne touche jamais aux réglages personnels de
 *   l'utilisateur pour ces émulateurs (Hatari : --configfile ; WinUAE : mode portable).
 */
import { app, net } from 'electron'
import { spawn, spawnSync, type ChildProcess } from 'child_process'
import { createHash } from 'crypto'
import { createReadStream, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { EMULATEURS, type Emulateur, type IdEmulateur, type Paquet } from './catalogue'

export interface EtatEmulateur {
  id: IdEmulateur
  nom: string
  machine: 'atari' | 'amiga'
  version: string
  licence: string
  description: string
  installe: boolean
  versionInstallee?: string
  /** Le paquet est livré avec l'application (version complète) : pas besoin d'Internet. */
  embarque: boolean
  taille: number
  dossierPartage: string
  /** Installation en cours (lancée depuis l'interface ou demandée par l'installateur). */
  enCours: boolean
  /** Les paquets sont des versions Windows : ailleurs, l'utilisateur installe lui-même son émulateur. */
  disponible: boolean
}

export type Progression = (fait: number, total: number, etape: string) => void

const windows = process.platform === 'win32'

export function dossierEmulateurs(): string {
  const base = windows && process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, '68k Trainer') : app.getPath('userData')
  return join(base, 'emulateurs')
}

export function dossierPartage(machine: 'atari' | 'amiga'): string {
  return join(app.getPath('documents'), '68k Trainer', machine === 'atari' ? 'Atari' : 'Amiga')
}

function dossierEmulateur(id: IdEmulateur): string {
  return join(dossierEmulateurs(), id)
}

function dossierPaquetsEmbarques(): string {
  return join(app.isPackaged ? process.resourcesPath : app.getAppPath(), app.isPackaged ? 'emulateurs' : join('build', 'emulateurs'))
}

const enCours = new Set<IdEmulateur>()

const fichierEtat = (): string => join(dossierEmulateurs(), 'installes.json')

function lireEtat(): Record<string, string> {
  try {
    return JSON.parse(readFileSync(fichierEtat(), 'utf-8')) as Record<string, string>
  } catch {
    return {}
  }
}

function ecrireEtat(etat: Record<string, string>): void {
  mkdirSync(dossierEmulateurs(), { recursive: true })
  writeFileSync(fichierEtat(), JSON.stringify(etat, null, 2))
}

export function etatEmulateurs(): EtatEmulateur[] {
  const etat = lireEtat()
  return Object.values(EMULATEURS).map((e) => ({
    id: e.id,
    nom: e.nom,
    machine: e.machine,
    version: e.version,
    licence: e.licence,
    description: e.description,
    installe: !!etat[e.id] && existsSync(join(dossierEmulateur(e.id), e.executable)),
    versionInstallee: etat[e.id],
    embarque: e.paquets.every((p) => existsSync(join(dossierPaquetsEmbarques(), p.fichier))),
    taille: e.paquets.reduce((s, p) => s + p.taille, 0),
    dossierPartage: dossierPartage(e.machine),
    enCours: enCours.has(e.id),
    disponible: windows
  }))
}

/**
 * Émulateurs cochés dans l'installateur de 68k Trainer (fichier a-installer.txt, écrit par
 * resources/installer.nsh) : le fichier est effacé, ils sont installés au premier lancement.
 */
export function installationsDemandees(): IdEmulateur[] {
  const fichier = join(dossierEmulateurs(), 'a-installer.txt')
  if (!existsSync(fichier)) return []
  const ids = readFileSync(fichier, 'utf-8').split(/\s+/).filter((id): id is IdEmulateur => id in EMULATEURS)
  rmSync(fichier, { force: true })
  return ids
}

// --- Paquets ---------------------------------------------------------------------

async function sha256(chemin: string): Promise<string> {
  const h = createHash('sha256')
  await new Promise<void>((ok, ko) => {
    createReadStream(chemin)
      .on('data', (d) => h.update(d))
      .on('end', ok)
      .on('error', ko)
  })
  return h.digest('hex')
}

async function telecharger(p: Paquet, cible: string, progression: Progression, deja: number, total: number): Promise<void> {
  const reponse = await net.fetch(p.url)
  if (!reponse.ok || !reponse.body) throw new Error(`Téléchargement impossible (${reponse.status}) : ${p.url}`)
  const morceaux: Uint8Array[] = []
  let recu = 0
  const lecteur = reponse.body.getReader()
  for (;;) {
    const { done, value } = await lecteur.read()
    if (done) break
    morceaux.push(value)
    recu += value.length
    progression(deja + recu, total, `Téléchargement de ${p.fichier}`)
  }
  writeFileSync(cible, Buffer.concat(morceaux))
}

/** Le paquet, vérifié : embarqué si possible, sinon téléchargé dans un dossier temporaire. */
async function obtenir(p: Paquet, temp: string, progression: Progression, deja: number, total: number): Promise<string> {
  const embarque = join(dossierPaquetsEmbarques(), p.fichier)
  const chemin = existsSync(embarque) ? embarque : join(temp, p.fichier)
  if (chemin !== embarque) await telecharger(p, chemin, progression, deja, total)
  progression(deja + p.taille, total, `Vérification de ${p.fichier}`)
  const somme = await sha256(chemin)
  if (somme !== p.sha256) throw new Error(`${p.fichier} n'est pas le fichier attendu (somme SHA-256 différente) : installation annulée.`)
  return chemin
}

/** Extrait un zip avec tar.exe (fourni par Windows 10 et 11). */
function extraire(zip: string, vers: string): void {
  mkdirSync(vers, { recursive: true })
  const tar = windows ? join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'tar.exe') : 'unzip'
  const r = windows ? spawnSync(tar, ['-xf', zip, '-C', vers]) : spawnSync(tar, ['-q', '-o', zip, '-d', vers])
  if (r.status !== 0) throw new Error(`Extraction impossible de ${zip} : ${r.stderr?.toString() ?? ''}`)
}

/** Déplace le contenu de `source` dans `cible` (sans les fichiers exclus). */
function deplacer(source: string, cible: string, exclure: string[]): void {
  mkdirSync(cible, { recursive: true })
  for (const nom of readdirSync(source)) {
    if (exclure.includes(nom)) continue
    const de = join(source, nom)
    const vers = join(cible, nom)
    rmSync(vers, { recursive: true, force: true })
    renameSync(de, vers)
  }
}

// --- Installation ------------------------------------------------------------------

export async function installer(id: IdEmulateur, progression: Progression = () => {}): Promise<void> {
  const e = EMULATEURS[id]
  if (!windows) throw new Error(`L'installation automatique de ${e.nom} n'existe que sous Windows pour l'instant.`)
  if (enCours.has(id)) throw new Error(`${e.nom} est déjà en cours d'installation.`)
  const dest = dossierEmulateur(id)
  const temp = join(tmpdir(), `68k-trainer-${id}-${Date.now()}`)
  const total = e.paquets.reduce((s, p) => s + p.taille, 0)
  enCours.add(id)
  mkdirSync(temp, { recursive: true })
  try {
    rmSync(dest, { recursive: true, force: true })
    let deja = 0
    for (const p of e.paquets) {
      const zip = await obtenir(p, temp, progression, deja, total)
      progression(deja + p.taille, total, `Installation de ${p.fichier}`)
      const extrait = join(temp, 'x-' + p.fichier)
      extraire(zip, extrait)
      deplacer(p.racine ? join(extrait, p.racine) : extrait, dest, p.exclure)
      deja += p.taille
    }
    configurer(e)
    const etat = lireEtat()
    etat[id] = e.version
    ecrireEtat(etat)
    progression(total, total, 'Terminé')
  } finally {
    enCours.delete(id)
    rmSync(temp, { recursive: true, force: true })
  }
}

export function desinstaller(id: IdEmulateur): void {
  rmSync(dossierEmulateur(id), { recursive: true, force: true })
  const etat = lireEtat()
  delete etat[id]
  ecrireEtat(etat)
}

const LISEZMOI = {
  atari: `Dossier partagé avec l'Atari ST émulé (Hatari + EmuTOS)
=====================================================

Dans l'Atari, ce dossier est le disque C:.
Les programmes .PRG exportés par 68k Trainer peuvent être rangés ici : double-clique dessus sur
le bureau d'EmuTOS. Le bouton « Essayer dans Hatari » de 68k Trainer les range ici et les lance.
`,
  amiga: `Dossier partagé avec l'Amiga émulé (WinUAE + Kickstart AROS)
===========================================================

Dans l'Amiga, ce dossier est le disque PARTAGE:.
Les programmes exportés par 68k Trainer peuvent être rangés ici : ouvre un Shell et tape
PARTAGE:nom-du-programme, ou double-clique sur leur icône dans le bureau d'AROS.
Le dossier essai sert au bouton « Essayer dans WinUAE » de 68k Trainer.
`
}

function preparerPartage(machine: 'atari' | 'amiga'): string {
  const d = dossierPartage(machine)
  mkdirSync(machine === 'atari' ? d : join(d, 'essai'), { recursive: true })
  writeFileSync(join(d, 'LISEZMOI.txt'), LISEZMOI[machine].replace(/\n/g, '\r\n'))
  return d
}

/** Réglages « d'étude » propres à 68k Trainer (jamais ceux de l'utilisateur). */
function configurer(e: Emulateur): void {
  const dest = dossierEmulateur(e.id)
  const partage = preparerPartage(e.machine)
  if (e.id === 'hatari') {
    // Un fichier de réglages privé : Hatari n'écrit que dans celui-ci
    writeFileSync(join(dest, '68k-trainer.cfg'), '[Log]\r\nbConfirmQuit = FALSE\r\n')
    return
  }
  // WinUAE en mode portable : ses réglages restent dans son dossier (winuae.ini), pas dans le registre
  writeFileSync(join(dest, 'winuae.ini'), '')
  const aros = join(dest, 'aros')
  // Le Shell d'AROS exécute PARTAGE:essai/lancer s'il existe (bouton « Essayer dans WinUAE »)
  writeFileSync(
    join(aros, 'S', 'User-Startup'),
    '; 68k Trainer : lancement d\'un programme a essayer\nIf EXISTS "PARTAGE:essai/lancer"\n    Execute "PARTAGE:essai/lancer"\nEndIf\n'
  )
  writeFileSync(join(dest, '68k-trainer.uae'), configUae(aros, partage), 'utf-8')
}

export function configUae(aros: string, partage: string): string {
  return [
    'config_description=68k Trainer : Amiga AGA 68020 avec le Kickstart libre AROS (étude, pas de jeux)',
    'use_gui=no',
    'cpu_type=68020',
    'cpu_model=68020',
    'cpu_speed=real',
    'cpu_compatible=true',
    'chipset=aga',
    'chipmem_size=4',
    'fastmem_size=8',
    'bogomem_size=0',
    `kickstart_rom_file=${join(aros, 'boot', 'amiga', 'aros-rom.bin')}`,
    `kickstart_ext_rom_file=${join(aros, 'boot', 'amiga', 'aros-ext.bin')}`,
    `filesystem2=rw,DH0:AROS:${aros},0`,
    `filesystem2=rw,DH1:PARTAGE:${partage},-128`,
    'nr_floppies=1',
    'floppy0=',
    'gfx_width_windowed=720',
    'gfx_height_windowed=568',
    'gfx_linemode=double',
    'sound_output=normal',
    ''
  ].join('\r\n')
}

// --- Lancement ----------------------------------------------------------------------

/** L'émulateur lancé par 68k Trainer, s'il tourne encore : une seule fenêtre par émulateur. */
const processus = new Map<IdEmulateur, ChildProcess>()

/** Arrête l'émulateur lancé par 68k Trainer (s'il tourne), puis le (re)lance : c'est son « reset ». */
async function lancerProcessus(e: Emulateur, args: string[]): Promise<void> {
  const exe = join(dossierEmulateur(e.id), e.executable)
  if (!existsSync(exe)) throw new Error(`${e.nom} n'est pas installé.`)
  const ancien = processus.get(e.id)
  if (ancien && ancien.exitCode === null && ancien.signalCode === null) {
    await new Promise<void>((fini) => {
      ancien.once('exit', () => fini())
      ancien.kill()
      setTimeout(fini, 3000)
    })
  }
  const p = spawn(exe, args, { cwd: dossierEmulateur(e.id), detached: true, stdio: 'ignore' })
  p.unref()
  processus.set(e.id, p)
  p.once('exit', () => {
    if (processus.get(e.id) === p) processus.delete(e.id)
  })
}

function argumentsHatari(): string[] {
  const d = dossierEmulateur('hatari')
  // Hatari démarre sur le dernier disque donné : ici C:, le dossier de partage. Basse résolution,
  // celle des programmes du parcours
  return [
    '--configfile', join(d, '68k-trainer.cfg'), '--tos', join(d, 'tos.img'), '--tos-res', 'low',
    '--machine', 'st', '--memsize', '1024', '--harddrive', preparerPartage('atari')
  ]
}

/** Lance l'émulateur tel quel (bureau d'EmuTOS ou d'AROS). */
export async function lancer(id: IdEmulateur): Promise<void> {
  const e = EMULATEURS[id]
  if (id === 'hatari') {
    await lancerProcessus(e, argumentsHatari())
  } else {
    rmSync(join(dossierPartage('amiga'), 'essai', 'lancer'), { force: true })
    await lancerProcessus(e, ['-f', join(dossierEmulateur(id), '68k-trainer.uae')])
  }
}

/**
 * Lanceur Atari (C:\ESSAI68K.PRG) : exécute le programme par Pexec, puis attend une touche avant
 * de rendre la main au bureau d'EmuTOS (sinon son affichage disparaît aussitôt). Le processus
 * principal l'assemble en .PRG.
 */
export function sourceLanceurAtari(fichier: string): string {
  return [
    '    MOVEA.L 4(SP),A5            ; page de base du lanceur',
    '    LEA     pile,SP',
    '    MOVE.L  $C(A5),D0           ; rendre au TOS la mémoire inutile (Mshrink)',
    '    ADD.L   $14(A5),D0',
    '    ADD.L   $1C(A5),D0',
    '    ADD.L   #$100,D0',
    '    MOVE.L  D0,-(SP)',
    '    MOVE.L  A5,-(SP)',
    '    CLR.W   -(SP)',
    '    MOVE.W  #$4A,-(SP)',
    '    TRAP    #1',
    '    LEA     12(SP),SP',
    '    CLR.L   -(SP)               ; Pexec(0, programme, ligne de commande vide, environnement)',
    '    PEA     vide(PC)',
    '    PEA     nom(PC)',
    '    CLR.W   -(SP)',
    '    MOVE.W  #$4B,-(SP)',
    '    TRAP    #1',
    '    LEA     16(SP),SP',
    '    PEA     message(PC)',
    '    MOVE.W  #9,-(SP)            ; Cconws',
    '    TRAP    #1',
    '    ADDQ.L  #6,SP',
    '    MOVE.W  #7,-(SP)            ; Crawcin : attendre une touche',
    '    TRAP    #1',
    '    ADDQ.L  #2,SP',
    '    CLR.W   -(SP)               ; Pterm0',
    '    TRAP    #1',
    `nom:     DC.B    'C:\\${fichier}',0`,
    'vide:    DC.B    0,0',
    "message: DC.B    13,10,'(Appuie sur une touche pour revenir au bureau)',0",
    '    EVEN',
    '    SECTION BSS',
    '    DS.L    256',
    'pile:',
    ''
  ].join('\n')
}

/**
 * Essaie un programme : il est rangé dans le dossier de partage (sous son nom) et lancé
 * automatiquement au démarrage de la machine émulée.
 */
export async function essayer(id: IdEmulateur, octets: Uint8Array, nom: string, lanceurAtari?: Uint8Array): Promise<string> {
  const e = EMULATEURS[id]
  if (id === 'hatari') {
    const d = preparerPartage('atari')
    const fichier = `${nom}.PRG`
    writeFileSync(join(d, fichier), octets)
    // Lancé par le bureau d'EmuTOS dès qu'il est prêt (rien n'est laissé dans un dossier AUTO),
    // à travers le lanceur qui attend une touche à la fin
    let auto = fichier
    if (lanceurAtari) {
      writeFileSync(join(d, 'ESSAI68K.PRG'), lanceurAtari)
      auto = 'ESSAI68K.PRG'
    }
    await lancerProcessus(e, [...argumentsHatari(), '--auto', 'C:\\' + auto])
    return join(d, fichier)
  }
  const d = preparerPartage('amiga')
  writeFileSync(join(d, nom), octets)
  // Le programme s'ouvre dans une fenêtre console qui reste affichée à la fin ; le script s'efface
  writeFileSync(
    join(d, 'essai', 'lancer'),
    `Delete >NIL: PARTAGE:essai/lancer\nRun >"CON:20/20/600/220/68k Trainer : ${nom}/WAIT/CLOSE" PARTAGE:${nom}\n`
  )
  await lancerProcessus(e, ['-f', join(dossierEmulateur(id), '68k-trainer.uae')])
  return join(d, nom)
}

