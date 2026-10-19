import type { Platform } from '../../cpu/platform'
import { combinePlatforms } from '../combine'
import { createAtariStPalette } from './palette'
import { createTos, type TosOptions } from './tos'

export type AtariStOptions = TosOptions

/** Atari ST complet tel que simulé aujourd'hui : TOS (GEMDOS/BIOS/XBIOS) + palette 3 bits. */
export function createAtariSt(options: AtariStOptions = {}): Platform {
  return combinePlatforms(createTos(options), createAtariStPalette())
}
