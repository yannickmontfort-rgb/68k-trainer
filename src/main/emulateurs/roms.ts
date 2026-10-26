/**
 * « Ma propre ROM » : un TOS ou un Kickstart d'origine, fourni par l'utilisateur, remplace le
 * système libre (EmuTOS, AROS). 68k Trainer ne fournit ni ne télécharge jamais de ROM : il copie
 * seulement celle que l'utilisateur possède dans son propre dossier d'émulateurs.
 *
 * Code pur (sans Electron) : reconnaissance d'une ROM et réglages de WinUAE, testés à part.
 */
import { join } from 'path'

export type MachineRom = 'atari' | 'amiga'

export interface RomReconnue {
  ok: true
  machine: MachineRom
  /** Ce qu'on affiche : « TOS 1.04 », « Kickstart 1.3 (34.5) »… */
  nom: string
  taille: number
  /** Atari : la machine que Hatari doit simuler. Amiga : le modèle à simuler. */
  modele: 'st' | 'ste' | 'a500' | 'a1200'
  /** Amiga : le Shell de la ROM contient Execute, If, Echo, Run… (Kickstart 2.0 et plus). */
  shellEnRom?: boolean
  /** Le contenu à garder : une ROM de 256 Ko copiée deux fois dans un fichier de 512 Ko est ramenée à 256 Ko. */
  contenu: Uint8Array
}

export interface RomRefusee {
  ok: false
  raison: string
}

const Ko = 1024

/** Nom courant d'un Kickstart d'après la version d'exec. */
function versionKickstart(version: number): string {
  if (version <= 33) return '1.2'
  if (version === 34) return '1.3'
  if (version <= 37) return '2.0'
  if (version === 39) return '3.0'
  if (version === 40) return '3.1'
  return '3.1.4 ou plus'
}

/** Reconnaît une ROM d'après sa taille et ses premiers octets. */
export function analyserRom(fichier: Uint8Array, machine: MachineRom): RomReconnue | RomRefusee {
  // Un Kickstart de 256 Ko copié deux fois (fichier de 512 Ko) : on garde une seule copie
  const moitie = fichier.length / 2
  const double =
    fichier.length === 512 * Ko && fichier.subarray(0, moitie).every((o, i) => o === fichier[moitie + i])
  const octets = double ? fichier.subarray(0, moitie) : fichier
  const taille = octets.length
  const mot = (i: number): number => (octets[i] << 8) | octets[i + 1]
  if (machine === 'amiga') {
    if (new TextDecoder('latin1').decode(octets.subarray(0, 11)) === 'AMIROMTYPE1') {
      return {
        ok: false,
        raison:
          "Cette ROM est chiffrée (Amiga Forever) : elle ne fonctionne qu'avec son fichier rom.key. Choisis plutôt une ROM non chiffrée, par exemple celle que copie le logiciel d'Amiga Forever pour WinUAE."
      }
    }
    if (taille !== 256 * Ko && taille !== 512 * Ko) {
      return { ok: false, raison: `Un Kickstart fait 256 ou 512 Ko ; ce fichier fait ${Math.round(taille / Ko)} Ko.` }
    }
    const debut = mot(0)
    if (debut !== 0x1111 && debut !== 0x1114) {
      return { ok: false, raison: "Ce fichier ne commence pas comme un Kickstart (mot $1111 ou $1114) : ce n'est sans doute pas une ROM d'Amiga." }
    }
    const version = mot(12)
    const revision = mot(14)
    return {
      ok: true,
      machine,
      nom: `Kickstart ${versionKickstart(version)} (${version}.${revision})`,
      taille,
      modele: taille === 512 * Ko ? 'a1200' : 'a500',
      shellEnRom: version >= 36,
      contenu: octets
    }
  }
  if (taille !== 192 * Ko && taille !== 256 * Ko && taille !== 512 * Ko) {
    return { ok: false, raison: `Une ROM du TOS fait 192 ou 256 Ko ; ce fichier fait ${Math.round(taille / Ko)} Ko.` }
  }
  if (octets[0] !== 0x60) {
    return { ok: false, raison: "Ce fichier ne commence pas comme un TOS (un saut BRA, octet $60) : ce n'est sans doute pas une ROM d'Atari." }
  }
  if (taille === 512 * Ko) {
    return { ok: false, raison: 'Les TOS de 512 Ko sont ceux du TT et du Falcon : 68k Trainer étudie le ST et le STE.' }
  }
  const version = mot(2)
  return {
    ok: true,
    machine,
    nom: `TOS ${version >> 8}.${(version & 0xff).toString(16).padStart(2, '0')}`,
    taille,
    // Les TOS de 256 Ko (1.06, 1.62, 2.06) sont ceux du STE
    modele: taille === 256 * Ko ? 'ste' : 'st',
    contenu: octets
  }
}

/** S:Startup-sequence du disque de démarrage généré pour un Kickstart 2.0 ou plus. */
export const STARTUP_KICKSTART = [
  '; 68k Trainer : lancement du programme à essayer, puis le Shell reste ouvert',
  'FailAt 21',
  'If EXISTS "PARTAGE:essai/lancer"',
  '    Execute "PARTAGE:essai/lancer"',
  'EndIf',
  ''
].join('\n')

/**
 * Réglages de WinUAE pour le Kickstart de l'utilisateur : un Amiga 500 (68000, OCS, 512 Ko de Chip
 * RAM et 512 Ko de Slow RAM) pour une ROM de 256 Ko, un Amiga 1200 (68020, AGA, 2 Mo de Chip RAM)
 * pour une ROM de 512 Ko. Avec un Kickstart 2.0 ou plus, l'Amiga démarre sur `demarrage` ;
 * avec un 1.3, sur la disquette Workbench de l'utilisateur, s'il en a donné une.
 */
export function configUaeKickstart(rom: RomReconnue, fichierRom: string, partage: string, demarrage: string, adf?: string): string {
  const a1200 = rom.modele === 'a1200'
  return [
    `config_description=68k Trainer : ${rom.nom}, fourni par l'utilisateur (étude, pas de jeux)`,
    'use_gui=no',
    `cpu_type=${a1200 ? '68020' : '68000'}`,
    `cpu_model=${a1200 ? '68020' : '68000'}`,
    'cpu_speed=real',
    'cpu_compatible=true',
    `chipset=${a1200 ? 'aga' : 'ocs'}`,
    `chipmem_size=${a1200 ? 4 : 1}`,
    'fastmem_size=0',
    `bogomem_size=${a1200 ? 0 : 2}`,
    `kickstart_rom_file=${fichierRom}`,
    'kickstart_ext_rom_file=',
    ...(rom.shellEnRom ? [`filesystem2=rw,DH0:DEMARRAGE:${demarrage},0`] : []),
    `filesystem2=rw,DH1:PARTAGE:${partage},-128`,
    'nr_floppies=1',
    `floppy0=${!rom.shellEnRom && adf ? adf : ''}`,
    'gfx_width_windowed=720',
    'gfx_height_windowed=568',
    'gfx_linemode=double',
    'sound_output=normal',
    ''
  ].join('\r\n')
}

/** Dossier où 68k Trainer garde les ROM de l'utilisateur (sous le dossier des émulateurs). */
export const dossierRoms = (dossierEmulateurs: string): string => join(dossierEmulateurs, 'roms')
