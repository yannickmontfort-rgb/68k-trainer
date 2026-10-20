/**
 * Ce qui distingue les deux machines simulées pour l'interface : horloge, durée d'une image,
 * zone de ROM (que le pas à pas traverse d'un coup), export, textes.
 */
import { CPU_HZ as HZ_ATARI, CYCLES_PER_VBL, ROM_END as FIN_ROM_ATARI, ROM_START as DEBUT_ROM_ATARI } from '../platforms/atari-st/machine'
import { CPU_HZ as HZ_AMIGA, CYCLES_PAR_IMAGE, ROM_DEBUT, ROM_FIN } from '../platforms/amiga/machine'
import type { Plateforme } from './parcours'

export type Machine = 'atari' | 'amiga'

export interface DescriptionMachine {
  id: Machine
  nom: string
  /** Nom long (« Atari 1040 STF », « Amiga 500 »). */
  modele: string
  cpuHz: number
  cyclesParImage: number
  enRom(pc: number): boolean
  /** Export d'un programme : format, libellé du bouton, explication. */
  export: { format: 'prg' | 'hunk'; bouton: string; titre: string }
}

export const MACHINES: Record<Machine, DescriptionMachine> = {
  atari: {
    id: 'atari',
    nom: 'Atari ST',
    modele: 'Atari 1040 STF',
    cpuHz: HZ_ATARI,
    cyclesParImage: CYCLES_PER_VBL,
    enRom: (pc) => pc >= DEBUT_ROM_ATARI && pc < FIN_ROM_ATARI,
    export: { format: 'prg', bouton: 'Exporter .PRG', titre: "Fabrique un programme .PRG à lancer dans l'émulateur Hatari ou sur un vrai Atari ST" }
  },
  amiga: {
    id: 'amiga',
    nom: 'Amiga',
    modele: 'Amiga 500',
    cpuHz: HZ_AMIGA,
    cyclesParImage: CYCLES_PAR_IMAGE,
    enRom: (pc) => pc >= ROM_DEBUT && pc < ROM_FIN,
    export: { format: 'hunk', bouton: 'Exporter pour l’Amiga', titre: 'Fabrique un exécutable AmigaDOS à lancer dans WinUAE, FS-UAE ou sur un vrai Amiga' }
  }
}

/** Machine qui exécute le code d'un contenu (le tronc commun tourne sur la machine du parcours). */
export function machineDe(plateforme: Plateforme): DescriptionMachine {
  return MACHINES[plateforme === 'amiga' ? 'amiga' : 'atari']
}
