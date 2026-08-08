import type { Platform } from '../../cpu/platform'

/**
 * Résout la Platform (voir src/cpu/platform.ts) à utiliser pour vérifier un exercice d'un parcours
 * donné. Vide pour l'instant — chaque bloc machine (AST-1, AST-2, ..., AMI-1, ...) viendra
 * composer ici sa propre Platform au fur et à mesure de son implémentation, sans avoir à toucher
 * au reste du checker.
 */
export function getPlatformForTrack(_trackId: string): Platform | undefined {
  return undefined
}
