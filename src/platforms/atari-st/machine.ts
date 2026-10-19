/**
 * Carte mémoire simplifiée d'un Atari 1040 STF (1 Mo de RAM, TOS en ROM, basse résolution).
 * Références vérifiées : ST Internals (Abacus), Atari ST Hardware Register Listing.
 */

/** Adresse de l'écran au démarrage d'un 1040 ST : 1 Mo − 32 Ko. */
export const SCREEN_BASE = 0xf8000
export const SCREEN_BYTES = 32000
export const SCREEN_WIDTH = 320
export const SCREEN_HEIGHT = 200
export const BYTES_PER_LINE = 160

/** Registres du Shifter vidéo. */
export const VIDEO_BASE_HIGH = 0xff8201
export const VIDEO_BASE_MID = 0xff8203
export const SHIFTER_RESOLUTION = 0xff8260
export const PALETTE_BASE = 0xff8240

/** Variables système du TOS (en RAM, accessibles en superviseur seulement). */
export const SYSVAR = {
  vblsem: 0x452, // sémaphore de la VBL : ≤ 0 = routine VBL désactivée
  nvbls: 0x454, // nombre d'emplacements de la file _vblqueue
  vblqueue: 0x456, // pointeur vers la file des routines appelées à chaque VBL
  colorptr: 0x45a, // palette à charger à la prochaine VBL (0 = aucune)
  screenpt: 0x45e, // écran physique à installer à la prochaine VBL (0 = aucun)
  vblclock: 0x462, // compteur de VBL (_vbclock)
  vbclock: 0x462, // même variable, nom du TOS
  frclock: 0x466, // compteur de trames
  conterm: 0x484, // bits : 0 = clic clavier, 1 = répétition, 2 = sonnerie Ctrl+G
  v_bas_ad: 0x44e, // adresse de l'écran logique
  hz_200: 0x4ba // compteur 200 Hz
} as const

/** Fin de la zone protégée en mode utilisateur (vecteurs + variables système). */
export const PROTECTED_LOW_END = 0x800
/** Début des registres matériels (accès superviseur uniquement). */
export const HARDWARE_START = 0xff8000
/** Plage sans matériel : erreur de bus même en superviseur. */
export const UNMAPPED_START = 0x400000
export const UNMAPPED_END = 0xfa0000
/** ROM du TOS (lecture seule). */
export const ROM_START = 0xfc0000
export const ROM_END = 0xff0000

/** Piles au démarrage d'un programme. */
export const USER_STACK = SCREEN_BASE - 0x100
export const SUPERVISOR_STACK = 0xe0000

/**
 * Zone privée du TOS simulé, en RAM au-dessus de la zone protégée : structures que le programme a
 * le droit de lire en mode utilisateur (table Kbdvbase, page de base).
 */
export const KBDVBASE = 0x0c00
export const BASEPAGE = 0x0d00
/** File des routines VBL (8 pointeurs, pointée par _vblqueue). */
export const VBLQUEUE_TABLE = 0x0e00
export const VBLQUEUE_SLOTS = 8

/**
 * Durée d'une trame en cycles : un ST PAL tourne à 8,0106 MHz et affiche 50,05 images par
 * seconde (313 lignes × 512 cycles).
 */
export const CYCLES_PER_VBL = 160256
/** Fréquence de l'horloge du 68000 d'un ST PAL. */
export const CPU_HZ = 8010612

/**
 * Petits morceaux de code « en ROM » utilisés par le TOS simulé. Les opcodes $A0Fx ne sont pas des
 * fonctions Ligne A réelles (qui vont de $A000 à $A00F) : la plateforme les intercepte.
 */
export const ROM_RTS = ROM_START // un simple RTS : vecteurs clavier par défaut
export const ROM_PROGRAM_EXIT = ROM_START + 0x10 // retour du programme principal par RTS
export const ROM_SUPEXEC_RETURN = ROM_START + 0x20 // fin d'une routine appelée par Supexec
export const ROM_VBL = ROM_START + 0x100 // routine VBL du TOS (vecteur $70)
export const OP_PROGRAM_EXIT = 0xa0fd
export const OP_SUPEXEC_RETURN = 0xa0fe

/**
 * Palette par défaut du TOS en basse résolution (couleur 0 = blanc, 15 = noir), valeurs $0RGB sur
 * 3 bits par composante.
 */
export const DEFAULT_PALETTE = [
  0x777, 0x700, 0x070, 0x770, 0x007, 0x707, 0x077, 0x555, 0x333, 0x733, 0x373, 0x773, 0x337, 0x737, 0x377, 0x000
]
