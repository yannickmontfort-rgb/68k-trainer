import type { ProfilPublic } from '../../shared/ipc'

/**
 * Profil ouvert dans l'interface. Les brouillons de code sont rangés dans le stockage local du
 * navigateur intégré, sous des clés préfixées par l'identifiant du profil : chaque profil
 * retrouve les siens.
 */
let actif: ProfilPublic | null = null

export function profilActif(): ProfilPublic | null {
  return actif
}

export function definirProfilActif(profil: ProfilPublic | null): void {
  actif = profil
}

function prefixe(id: string): string {
  return `profil:${id}:`
}

/** Clé de stockage local propre au profil ouvert. */
export function cleProfil(cle: string): string {
  return prefixe(actif?.id ?? 'aucun') + cle
}

export function lireLocal(cle: string): string | null {
  try {
    return localStorage.getItem(cleProfil(cle))
  } catch {
    return null
  }
}

export function ecrireLocal(cle: string, valeur: string): void {
  try {
    localStorage.setItem(cleProfil(cle), valeur)
  } catch {
    /* stockage indisponible : on continue sans brouillon */
  }
}

/** Tous les brouillons du profil ouvert (pour l'export), clés sans préfixe. */
export function brouillonsDuProfil(): Record<string, string> {
  const resultat: Record<string, string> = {}
  if (!actif) return resultat
  const p = prefixe(actif.id)
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const cle = localStorage.key(i)
      if (cle?.startsWith(p)) resultat[cle.slice(p.length)] = localStorage.getItem(cle) ?? ''
    }
  } catch {
    /* stockage indisponible */
  }
  return resultat
}

/** Range des brouillons importés sous un profil donné. */
export function restaurerBrouillons(id: string, brouillons: Record<string, string>): void {
  try {
    for (const [cle, valeur] of Object.entries(brouillons)) localStorage.setItem(prefixe(id) + cle, valeur)
  } catch {
    /* stockage indisponible */
  }
}

/** Efface les brouillons d'un profil supprimé. */
export function effacerBrouillons(id: string): void {
  try {
    const p = prefixe(id)
    const cles: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const cle = localStorage.key(i)
      if (cle?.startsWith(p)) cles.push(cle)
    }
    for (const cle of cles) localStorage.removeItem(cle)
  } catch {
    /* stockage indisponible */
  }
}
