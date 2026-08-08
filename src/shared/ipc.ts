export interface AssembleRequest {
  source: string
}

export interface AssembleError {
  line: number
  message: string
}

export interface AssembleResult {
  success: boolean
  binary?: Uint8Array
  baseAddress?: number
  /** Adresse (relative à baseAddress) -> numéro de ligne source, pour le pas-à-pas */
  addressToLine?: Record<number, number>
  errors: AssembleError[]
}

export interface ProgressState {
  completedExerciseIds: string[]
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

export type ExerciseCheckType = 'registers' | 'memory' | 'output'

export interface ExerciseCheck {
  type: ExerciseCheckType
  maxSteps: number
  /**
   * Forme de `expected` selon `type` :
   * - "registers" : clé = "D0".."D7" | "A0".."A7" | "PC", valeur = mot de 32 bits en hexa ("$0000002A")
   * - "memory"    : clé = adresse hexa avec suffixe de taille optionnel ("$FF8240", "$FF8240.B", "$FF8240.L"
   *                 — défaut ".W" si omis), valeur = contenu attendu à cette adresse, en hexa
   * - "output"    : une seule clé "output", valeur = chaîne exacte attendue dans cpu.output (pas de l'hexa)
   */
  expected: Record<string, string>
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

export const IPC = {
  assemble: '68k:assemble',
  loadProgress: '68k:loadProgress',
  saveProgress: '68k:saveProgress',
  loadContent: '68k:loadContent',
  getBuildInfo: '68k:getBuildInfo'
} as const
