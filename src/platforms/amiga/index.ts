import type { Platform } from '../../cpu/platform'
import { combinePlatforms } from '../combine'
import { createChipset, type ChipsetOptions } from './chipset'
import { createKickstart, type KickstartOptions } from './kickstart'

export type AmigaOptions = ChipsetOptions & KickstartOptions

/**
 * Amiga 500 PAL simulé : puces custom (Copper, Blitter, plans de bits, sprites, Paula), CIA,
 * souris/joystick/clavier, et Kickstart 1.3 simulé (exec, dos, graphics). L'ordre compte : le
 * chipset est prêt avant que le Kickstart ne le règle.
 */
export function createAmiga(options: AmigaOptions = {}): Platform {
  return combinePlatforms(createChipset(options), createKickstart(options))
}
