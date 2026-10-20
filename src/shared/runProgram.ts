import { Cpu } from '../cpu/cpu'
import type { Platform } from '../cpu/platform'
import type { StepEffects } from '../cpu/types'
import { createAtariSt } from '../platforms/atari-st'
import { createAmiga } from '../platforms/amiga'
import type { ExerciseCheck } from './ipc'
import type { MachineOptions, Plateforme } from './parcours'

/**
 * Machine simulée pour un contenu du parcours. `check` : la vérification à faire ensuite (une
 * vérification d'écran Amiga demande de garder l'image indiquée).
 */
export function platformFor(plateforme: Plateforme, machine?: MachineOptions, check?: ExerciseCheck): Platform | undefined {
  if (plateforme === 'amiga') {
    return createAmiga({
      saisie: machine?.saisie,
      arguments: machine?.arguments,
      clavierInteractif: machine?.interactif,
      evenements: machine?.evenements,
      captures: check?.image !== undefined ? [check.image] : []
    })
  }
  if (plateforme === 'atari' || plateforme === 'commun') {
    return createAtariSt({
      userMode: machine?.modeUtilisateur ?? false,
      keys: machine?.touches,
      clavierInteractif: machine?.interactif,
      evenements: machine?.evenements
    })
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
