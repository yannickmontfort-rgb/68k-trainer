/**
 * Exceptions du 68000 : numéros de vecteur, noms lisibles et nombre de « bombes » affichées par le
 * TOS de l'Atari ST (le TOS dessine autant de bombes que le numéro du vecteur : 2 = erreur de bus,
 * 3 = erreur d'adresse, 4 = instruction illégale...).
 */

export const VECTOR = {
  busError: 2,
  addressError: 3,
  illegal: 4,
  zeroDivide: 5,
  chk: 6,
  trapv: 7,
  privilege: 8,
  trace: 9,
  lineA: 10,
  lineF: 11,
  spurious: 24,
  autovector1: 25,
  trap0: 32
} as const

const NAMES: Record<number, string> = {
  2: 'Erreur de bus',
  3: "Erreur d'adresse",
  4: 'Instruction illégale',
  5: 'Division par zéro',
  6: 'Instruction CHK (valeur hors limites)',
  7: 'TRAPV (débordement)',
  8: 'Violation de privilège',
  9: 'Trace',
  10: 'Ligne A ($Axxx)',
  11: 'Ligne F ($Fxxx)',
  24: 'Interruption parasite'
}

export function exceptionName(vector: number): string {
  if (NAMES[vector]) return NAMES[vector]
  if (vector >= 25 && vector <= 31) return `Interruption de niveau ${vector - 24}`
  if (vector >= 32 && vector <= 47) return `TRAP #${vector - 32}`
  return `Exception (vecteur ${vector})`
}

/** Explication pour débutant, affichée quand l'exception n'a pas de routine de traitement. */
export function exceptionAdvice(vector: number): string {
  switch (vector) {
    case 2:
      return "Le programme a accédé à une adresse interdite (en mode utilisateur, le matériel et le bas de la mémoire sont protégés : passe en superviseur, par exemple avec Supexec)."
    case 3:
      return "Un accès en .W ou en .L s'est fait à une adresse IMPAIRE. Sur 68000, les mots et les longs doivent être à une adresse paire (pense à EVEN après des DC.B)."
    case 4:
      return "Le processeur est tombé sur un code qui n'est pas une instruction : le PC est sans doute parti dans des données (RTS oublié, pile mal nettoyée ?)."
    case 5:
      return 'Le diviseur de DIVU/DIVS vaut 0. Teste-le avant de diviser.'
    case 8:
      return "Cette instruction est réservée au mode superviseur (bit S de SR à 1). En mode utilisateur, elle déclenche une violation de privilège."
    default:
      return ''
  }
}

/** Nombre de bombes affichées par le TOS pour une exception non traitée (0 si non pertinent). */
export function bombCount(vector: number): number {
  return vector >= 2 && vector <= 31 ? vector : 0
}

/**
 * Lancée depuis le cœur d'une instruction pour signaler une exception 68000. `Cpu.step()` la
 * rattrape et la traite (empilement, lecture du vecteur).
 * - `kind: 'fault'` : le PC empilé est celui de l'instruction fautive (illégal, privilège...).
 * - `kind: 'trap'`  : le PC empilé est celui de l'instruction suivante (TRAP, division par zéro...).
 */
export class M68kException extends Error {
  constructor(
    readonly vector: number,
    readonly kind: 'fault' | 'trap',
    /** Erreurs de bus et d'adresse (groupe 0) : adresse fautive et type d'accès. */
    readonly access?: { address: number; read: boolean; instruction: boolean }
  ) {
    super(exceptionName(vector))
  }
}
