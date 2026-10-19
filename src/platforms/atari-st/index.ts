import type { Platform } from '../../cpu/platform'
import { combinePlatforms } from '../combine'
import { createMateriel, type MaterielOptions } from './materiel'
import { createAtariStPalette } from './palette'
import { createTos, type TosOptions } from './tos'
import { createVbl, type VblOptions } from './vbl'

export type AtariStOptions = TosOptions & VblOptions & MaterielOptions

/**
 * Atari ST complet tel que simulé aujourd'hui : VBL à 50 Hz (avec Vsync), TOS (GEMDOS/BIOS/XBIOS),
 * palette 3 bits, MFP 68901 (timers, interruptions) et clavier IKBD (touches, joysticks).
 */
export function createAtariSt(options: AtariStOptions = {}): Platform {
  return combinePlatforms(createVbl(options), createTos(options), createAtariStPalette(), createMateriel(options))
}
