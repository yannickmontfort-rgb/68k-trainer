import { Cpu } from '../cpu/cpu'
import type { Platform } from '../cpu/platform'
import type { StepEffects } from '../cpu/types'
import { createAtariSt } from '../platforms/atari-st'
import type { MachineOptions, Plateforme } from './parcours'

/** Plateforme simulée pour un contenu du parcours (Amiga : 68000 nu pour l'instant). */
export function platformFor(plateforme: Plateforme, machine?: MachineOptions): Platform | undefined {
  if (plateforme === 'atari' || plateforme === 'commun') {
    return createAtariSt({ userMode: machine?.modeUtilisateur ?? false, keys: machine?.touches })
  }
  return undefined
}

export interface RunResult {
  cpu: Cpu
  /** Effets du dernier pas exécuté (erreur, exception...). */
  last: StepEffects
  steps: number
}

/** Charge un binaire assemblé et l'exécute jusqu'à l'arrêt ou `maxSteps` pas. */
export function runBinary(binary: Uint8Array, baseAddress: number, platform: Platform | undefined, maxSteps: number): RunResult {
  const cpu = new Cpu(platform)
  cpu.reset(baseAddress)
  cpu.loadProgram(baseAddress, binary)
  let last: StepEffects = { writes: [], halted: false }
  let steps = 0
  while (steps < maxSteps && !cpu.halted) {
    last = cpu.step()
    steps++
  }
  return { cpu, last, steps }
}
