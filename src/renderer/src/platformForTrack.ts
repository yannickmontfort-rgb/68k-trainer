import type { Platform } from '../../cpu/platform'
import { createAtariSt, type AtariStOptions } from '../../platforms/atari-st'

/**
 * Résout la Platform (voir src/cpu/platform.ts) à utiliser pour un parcours ou une plateforme
 * donnée. Chaque bloc machine (AST-1, AST-2, ..., AMI-1, ...) vient compléter cette fonction au fur
 * et à mesure de son implémentation, sans avoir à toucher au reste du checker.
 */
export function getPlatformForTrack(trackId: string, options: AtariStOptions = {}): Platform | undefined {
  if (trackId === 'atari-st' || trackId === 'atari') return createAtariSt(options)
  return undefined
}
