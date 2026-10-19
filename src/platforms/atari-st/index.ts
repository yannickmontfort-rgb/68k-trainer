import type { Platform } from '../../cpu/platform'
import { combinePlatforms } from '../combine'
import { createAtariStPalette } from './palette'
import { createTos, type TosOptions } from './tos'
import { createVbl, type VblOptions } from './vbl'

export type AtariStOptions = TosOptions & VblOptions

/**
 * Atari ST complet tel que simulé aujourd'hui : VBL à 50 Hz (avec Vsync), TOS (GEMDOS/BIOS/XBIOS)
 * et palette 3 bits.
 */
export function createAtariSt(options: AtariStOptions = {}): Platform {
  return combinePlatforms(createVbl(options), createTos(options), createAtariStPalette())
}
