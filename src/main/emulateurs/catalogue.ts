/**
 * Les émulateurs « d'étude » que 68k Trainer sait installer : versions, adresses officielles et
 * sommes SHA-256 figées (un fichier modifié ou corrompu est refusé). Uniquement des logiciels
 * libres : aucune ROM sous droits (TOS, Kickstart) n'est jamais fournie ni téléchargée.
 */
export type IdEmulateur = 'hatari' | 'winuae'

export interface Paquet {
  /** Nom du fichier (dans resources/emulateurs/ pour la version complète). */
  fichier: string
  /** Adresse de téléchargement (version légère). */
  url: string
  sha256: string
  /** Taille en octets (pour la barre de progression). */
  taille: number
  /** Dossier de premier niveau du zip à retirer à l'extraction ('' : aucun). */
  racine: string
  /** Fichiers à ne pas installer (inutiles pour l'étude, licence non libre…). */
  exclure: string[]
}

export interface Emulateur {
  id: IdEmulateur
  nom: string
  machine: 'atari' | 'amiga'
  version: string
  licence: string
  description: string
  /** Paquets à installer (l'émulateur, puis son système libre). */
  paquets: Paquet[]
  /** Exécutable, relatif au dossier de l'émulateur. */
  executable: string
}

export const EMULATEURS: Record<IdEmulateur, Emulateur> = {
  hatari: {
    id: 'hatari',
    nom: 'Hatari',
    machine: 'atari',
    version: '2.6.1',
    licence: 'GPL v2 ; EmuTOS (système libre qui remplace le TOS d’Atari) : GPL v2',
    description: 'Atari ST 1 Mo avec EmuTOS. Le dossier de partage est son disque C:.',
    paquets: [
      {
        fichier: 'hatari-2.6.1_windows64.zip',
        url: 'https://framagit.org/hatari/releases/-/raw/main/v2.6.1/hatari-2.6.1_windows64.zip',
        sha256: '996ff8df1fd6bd909ded90d5460d5639f3d8dee2c74921f3983a4cd10ff02812',
        taille: 6257006,
        racine: 'hatari-2.6.1_windows64',
        // capsimg.dll (images de disquettes protégées) est liée au lancement de hatari.exe : on la garde
        exclure: []
      }
    ],
    executable: 'hatari.exe'
  },
  winuae: {
    id: 'winuae',
    nom: 'WinUAE',
    machine: 'amiga',
    version: '6.0.3',
    licence: 'GPL v2 ; AROS (système libre compatible Kickstart) : licence publique AROS',
    description: 'Amiga AGA 68020 avec le Kickstart libre AROS (AROS demande un 68020). Le dossier de partage est le disque PARTAGE:.',
    paquets: [
      {
        fichier: 'WinUAE6030_x64.zip',
        url: 'https://download.abime.net/winuae/releases/WinUAE6030_x64.zip',
        sha256: 'f8b7c44e8ab2f68db49b4205793848b4496464dbee3c036921840d82627f4fc3',
        taille: 11374798,
        racine: '',
        exclure: []
      },
      {
        // ROM et système AROS 68k (nightly du 20/10/2026), sans les outils de développement :
        // fabriqué par scripts/paquet-aros.py, publié avec les releases de 68k Trainer
        fichier: 'aros-amiga-m68k-20261020.zip',
        url: 'https://github.com/yannickmontfort-rgb/68k-trainer/releases/download/emulateurs-20261020/aros-amiga-m68k-20261020.zip',
        sha256: '1b18e9930fdc873fa662097df08e4b877f405b6a0785f779d90382ad26994e66',
        taille: 36332499,
        racine: '',
        exclure: []
      }
    ],
    executable: 'winuae64.exe'
  }
}
