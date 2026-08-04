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

export interface ExerciseCheck {
  type: string
  maxSteps: number
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

export const IPC = {
  assemble: '68k:assemble',
  loadProgress: '68k:loadProgress',
  saveProgress: '68k:saveProgress',
  loadContent: '68k:loadContent'
} as const
