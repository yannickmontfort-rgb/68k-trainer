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

export const IPC = {
  assemble: '68k:assemble',
  loadProgress: '68k:loadProgress',
  saveProgress: '68k:saveProgress'
} as const
