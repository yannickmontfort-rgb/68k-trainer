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
}
