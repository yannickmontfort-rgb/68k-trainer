/**
 * Langue de l'interface : celle du profil ouvert, sinon la dernière choisie sur ce poste, sinon
 * celle du système (français ou anglais). Chaque vue range ses textes à côté d'elle, dans les deux
 * langues, et les lit par `traducteur` : TypeScript vérifie qu'aucun texte anglais ne manque.
 */
import type { Langue } from '../../shared/traduction'

const CLE = '68k-langue'

function langueParDefaut(): Langue {
  try {
    const l = localStorage.getItem(CLE)
    if (l === 'fr' || l === 'en') return l
  } catch {
    // stockage local indisponible : on suit le système
  }
  return navigator.language?.toLowerCase().startsWith('fr') ? 'fr' : 'en'
}

let courante: Langue = langueParDefaut()
const ecouteurs = new Set<() => void>()

export function langueCourante(): Langue {
  return courante
}

/** Change la langue de l'interface ; les vues abonnées se redessinent. */
export function definirLangue(langue: Langue): void {
  if (langue === courante) return
  courante = langue
  try {
    localStorage.setItem(CLE, langue)
  } catch {
    // tant pis : la langue reste celle du profil
  }
  document.documentElement.lang = langue
  for (const f of ecouteurs) f()
}

export function surChangementLangue(f: () => void): () => void {
  ecouteurs.add(f)
  return () => ecouteurs.delete(f)
}

export type Textes<K extends string> = { fr: Record<K, string>; en: Record<K, string> }

/**
 * Les textes d'une vue, dans les deux langues. `t('cle', { nom: 'Ada' })` remplace `{nom}` dans le
 * texte de la langue courante.
 */
export function traducteur<K extends string>(textes: Textes<K>): (cle: K, valeurs?: Record<string, string | number>) => string {
  return (cle, valeurs) => {
    let texte = textes[courante][cle] ?? textes.fr[cle]
    for (const [nom, valeur] of Object.entries(valeurs ?? {})) texte = texte.split(`{${nom}}`).join(String(valeur))
    return texte
  }
}

document.documentElement.lang = courante
