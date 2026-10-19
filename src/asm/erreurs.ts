/** Erreur d'assemblage, avec la position du mot fautif dans la ligne (colonnes à partir de 0). */
export class AsmErreur extends Error {
  constructor(
    message: string,
    readonly colonne?: number,
    readonly longueur?: number
  ) {
    super(message)
  }
}

export interface Diagnostic {
  /** Ligne dans le source principal (à partir de 1) ; 0 si inconnue. */
  ligne: number
  /** Colonne (à partir de 1) et longueur du passage fautif, si connues. */
  colonne?: number
  longueur?: number
  message: string
  /** Fichier inclus d'où vient l'erreur, s'il ne s'agit pas du source principal. */
  fichier?: string
}

/** Distance d'édition (pour « vouliez-vous dire… ? »). */
export function distance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
  }
  return d[a.length][b.length]
}

export function suggestion(mot: string, candidats: Iterable<string>): string | undefined {
  let meilleur: string | undefined
  let score = Infinity
  const m = mot.toUpperCase()
  for (const c of candidats) {
    const s = distance(m, c.toUpperCase())
    if (s < score) {
      score = s
      meilleur = c
    }
  }
  return score <= Math.max(1, Math.floor(m.length / 3)) ? meilleur : undefined
}
