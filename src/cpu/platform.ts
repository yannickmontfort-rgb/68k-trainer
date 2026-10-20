import type { Cpu } from './cpu'
import type { Size } from './types'

/**
 * Point d'extension optionnel du Cpu générique. Permet à un module spécifique à une machine
 * (Atari ST, Amiga, ...) de brancher son propre comportement matériel/système sans que le coeur
 * du 68000 (`cpu.ts`) ait à connaître quoi que ce soit de cette machine.
 *
 * Sans `Platform` fournie au constructeur du `Cpu`, le comportement est strictement identique à
 * celui d'un 68000 nu (TRAP #15 façon EASy68K uniquement, opcodes Ligne A non supportés).
 */
export interface Platform {
  /**
   * Intercepte un `TRAP #n` avant le fallback EASy68K (`TRAP #15`) du Cpu.
   * Renvoyer `true` si géré (le Cpu n'exécute alors rien d'autre pour ce TRAP).
   */
  onTrap?(cpu: Cpu, number: number): boolean

  /**
   * Intercepte un opcode Ligne A (`$Axxx`), normalement non reconnu par un 68000 nu.
   * Renvoyer `true` si géré.
   */
  onLineA?(cpu: Cpu, opcode: number): boolean

  /**
   * Intercepte un `JSR` vers une adresse "magique" (appel de bibliothèque système plutôt que du
   * vrai code assemblé en mémoire — ex. `JSR -offset(A6)` sur Amiga). Renvoyer `true` si géré :
   * le Cpu n'empile alors pas d'adresse de retour et ne saute pas réellement à cette adresse.
   */
  onJsr?(cpu: Cpu, targetAddress: number): boolean

  /**
   * Notifié après toute écriture mémoire réussie, pour les registres mappés en mémoire
   * (palette Atari `$FF8240+`, puces custom Amiga `$DFFxxx`, ...). Ne peut pas annuler l'écriture
   * elle-même (déjà faite en mémoire) — sert uniquement à réagir à l'effet de bord.
   */
  onMemoryWrite?(cpu: Cpu, address: number, size: Size, value: number): void

  /**
   * Appelé à la fin de `Cpu.reset()`, avant le chargement du programme : sert à préparer la
   * mémoire de la machine (variables système, ExecBase Amiga...) ou à démarrer en mode
   * utilisateur comme le ferait le système d'exploitation.
   */
  onReset?(cpu: Cpu): void

  /**
   * Appelé avant chaque accès mémoire de données. Renvoyer `true` déclenche une erreur de bus
   * (vecteur 2, « 2 bombes » sur ST) : zones protégées en mode utilisateur, adresses sans
   * matériel...
   */
  isBusError?(cpu: Cpu, address: number, write: boolean): boolean

  /**
   * Appelé après chaque pas du processeur (instruction, prise d'interruption ou attente après
   * STOP) : le matériel de la machine regarde `cpu.cycles` et demande ses interruptions (VBL,
   * timers...).
   */
  afterStep?(cpu: Cpu): void

  /**
   * Lecture d'un registre matériel qui a un effet de bord ou une valeur calculée (registre de
   * données de l'ACIA, compteur d'un timer...). Appelé seulement pour les adresses ≥ `ioStart`.
   * Renvoyer `undefined` : lecture normale de la mémoire.
   */
  readIo?(cpu: Cpu, address: number, size: Size): number | undefined
  /** Première adresse confiée à `readIo` (par défaut 0). */
  ioStart?: number

  /**
   * Cycle d'acquittement d'une interruption de niveau `level` acceptée par le processeur : le
   * périphérique renvoie son numéro de vecteur (MFP du ST), ou `undefined` pour l'auto-vecteur.
   */
  acknowledgeInterrupt?(cpu: Cpu, level: number): number | undefined

  /**
   * Ce que la machine affiche pour une exception non traitée (bombes du TOS, Guru Meditation de
   * l'Amiga) : texte ajouté au message d'erreur. Sans ce hook : les bombes de l'Atari ST.
   */
  describeException?(vector: number): string
}
