export type Size = 1 | 2 | 4

export interface Flags {
  x: boolean
  n: boolean
  z: boolean
  v: boolean
  c: boolean
}

export interface CpuSnapshot {
  d: number[]
  a: number[]
  pc: number
  flags: Flags
  halted: boolean
  output: string
  /** Registre d'état complet (T, S, masque d'interruption, CCR). */
  sr: number
  supervisor: boolean
  /** Pile utilisateur et pile superviseur (A7 est l'une des deux selon le bit S). */
  usp: number
  ssp: number
  /** Vrai après STOP, en attente d'une interruption. */
  stopped: boolean
}

export interface ExceptionInfo {
  vector: number
  name: string
  /** Vrai si une routine de traitement a pris la main ; faux si le programme s'arrête dessus. */
  handled: boolean
  /** Adresse de l'instruction en cause. */
  pc: number
  /** Erreur de bus / d'adresse : adresse fautive. */
  accessAddress?: number
}

export interface MemoryWrite {
  address: number
  size: Size
}

export interface StepEffects {
  writes: MemoryWrite[]
  readAddress?: number
  halted: boolean
  error?: string
  /** Exception survenue pendant ce pas (traitée ou non). */
  exception?: ExceptionInfo
}
