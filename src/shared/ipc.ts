import type { Parcours } from './parcours'

export interface AssembleRequest {
  source: string
}

export interface AssembleError {
  /** 0 si vasm n'a pas pu situer l'erreur */
  line: number
  /** Message reformulé pour débutant */
  message: string
  /** Message d'origine de vasm */
  original?: string
}

export interface AssembleResult {
  success: boolean
  binary?: Uint8Array
  baseAddress?: number
  /** Adresse (relative à baseAddress) -> numéro de ligne source, pour le pas-à-pas */
  addressToLine?: Record<number, number>
  errors: AssembleError[]
}

/**
 * Progression de l'apprenant, stockée en local (progress.json dans le dossier userData).
 * Version 2 : ajoute les contenus vus, les QCM et la dernière position. Un fichier de la version 1
 * (seulement `completedExerciseIds`) reste lisible tel quel.
 */
export interface ProgressState {
  version?: 2
  /** Exercices réussis (ancienne et nouvelle version, bonus compris). */
  completedExerciseIds: string[]
  /** Cours lus, exemples parcourus jusqu'au bout, prédictions répondues. */
  contenusVus?: string[]
  /** Résultats des QCM de fin de chapitre, par id de QCM. */
  qcm?: Record<string, { meilleurScore: number; total: number; reussi: boolean; date: string }>
  /** Pour « Reprendre là où je me suis arrêté ». */
  derniere?: { parcoursId: string; chapitreId: string; etapeId: string }
}

export interface Track {
  id: string
  title: string
  description: string
  status: string
}

export interface CourseFile {
  /** Nom de fichier sans extension, sert d'identifiant dans le parcours */
  slug: string
  title: string
  source: string
  themes: string[]
  markdown: string
}

export type ExerciseCheckType = 'registers' | 'memory' | 'output' | 'pixels'

export interface ExerciseCheck {
  type: ExerciseCheckType
  maxSteps: number
  /**
   * Forme de `expected` selon `type` :
   * - "registers" : clé = "D0".."D7" | "A0".."A7" | "PC" | "SR", valeur = mot de 32 bits en hexa ("$0000002A") ;
   *                 ou clé = flag "X" | "N" | "Z" | "V" | "C", valeur "$1" ou "$0"
   * - "memory"    : clé = adresse hexa avec suffixe de taille optionnel ("$FF8240", "$FF8240.B", "$FF8240.L"
   *                 — défaut ".W" si omis), valeur = contenu attendu à cette adresse, en hexa
   * - "output"    : une seule clé "output", valeur = chaîne exacte attendue dans cpu.output (pas de l'hexa ;
   *                 les retours chariot (CR, code 13) sont ignorés des deux côtés)
   * - "pixels"    : clé = "x,y" sur l'écran Atari basse résolution, valeur = numéro de couleur 0-15 en décimal
   */
  expected: Record<string, string>
  /**
   * Le programme doit s'être terminé (Pterm0, RTS final, TRAP #15) avant `maxSteps` : sinon il
   * « tourne dans le vide » (pile déséquilibrée, fin oubliée) et la vérification échoue.
   */
  terminer?: boolean
}

export interface Exercise {
  id: string
  title: string
  statement: string
  hints: string[]
  courseRef: string
  starterCode: string
  check: ExerciseCheck
}

export interface ExerciseLevel {
  level: number
  title: string
  exercises: Exercise[]
}

export interface ContentBundle {
  /** Nouveau parcours guidé (chapitres, notions, progression). */
  parcours: Parcours[]
  tracks: Track[]
  courses: Record<string, CourseFile[]>
  exercises: Record<string, ExerciseLevel[]>
}

export interface BuildInfo {
  version: string
  year: number
  /** null en mode développement (pas encore buildé via dist:win) */
  builtAt: string | null
}

/** Profil tel que vu par l'interface : jamais le mot de passe ni son hachage. */
export interface ProfilPublic {
  id: string
  nom: string
  protege: boolean
  creeLe: string
}

export interface ResultatProfil {
  ok: boolean
  erreur?: string
  profil?: ProfilPublic
}

/** Fichier d'export d'un profil (.68kprofil). */
export interface ExportProfil {
  format: '68k-trainer-profil'
  version: 1
  nom: string
  exporteLe: string
  progression: ProgressState
  /** Brouillons de code (exercices, bac à sable). */
  brouillons: Record<string, string>
}

export const IPC = {
  listerProfils: '68k:listerProfils',
  creerProfil: '68k:creerProfil',
  ouvrirProfil: '68k:ouvrirProfil',
  fermerProfil: '68k:fermerProfil',
  renommerProfil: '68k:renommerProfil',
  motDePasseProfil: '68k:motDePasseProfil',
  supprimerProfil: '68k:supprimerProfil',
  exporterProfil: '68k:exporterProfil',
  importerProfil: '68k:importerProfil',
  tableauProfils: '68k:tableauProfils',
  assemble: '68k:assemble',
  loadProgress: '68k:loadProgress',
  saveProgress: '68k:saveProgress',
  loadContent: '68k:loadContent',
  getBuildInfo: '68k:getBuildInfo'
} as const
