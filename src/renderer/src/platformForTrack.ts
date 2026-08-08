import type { Platform } from '../../cpu/platform'
import { createAtariStPalette } from '../../platforms/atari-st/palette'

/**
 * Résout la Platform (voir src/cpu/platform.ts) à utiliser pour vérifier un exercice d'un parcours
 * donné. Chaque bloc machine (AST-1, AST-2, ..., AMI-1, ...) vient compléter cette fonction au fur
 * et à mesure de son implémentation, sans avoir à toucher au reste du checker.
 */
export function getPlatformForTrack(trackId: string): Platform | undefined {
  if (trackId === 'atari-st') return createAtariStPalette()
  return undefined
}
