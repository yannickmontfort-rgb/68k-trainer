/**
 * Langue des textes du processus principal (boîtes de dialogue, erreurs renvoyées à l'interface,
 * étapes d'installation) : celle de l'interface, qui la donne au démarrage et à chaque changement
 * (canal IPC.definirLangue). Le français reste la langue par défaut, celle des tests.
 *
 * Pas d'import d'Electron ici : les modules testés (profils, ROM) s'en servent hors de l'appli.
 */
import type { Langue } from '../shared/traduction'
import { traduireMessage } from '../shared/messagesEn'

let courante: Langue = 'fr'

export function langueMain(): Langue {
  return courante
}

export function definirLangueMain(langue: unknown): void {
  if (langue === 'fr' || langue === 'en') courante = langue
}

/** Les textes d'un module, dans les deux langues ; `{nom}` est remplacé par sa valeur. */
export function traducteurMain<K extends string>(textes: { fr: Record<K, string>; en: Record<K, string> }) {
  return (cle: K, valeurs?: Record<string, string | number>): string => {
    let texte = textes[courante][cle] ?? textes.fr[cle]
    for (const [nom, valeur] of Object.entries(valeurs ?? {})) texte = texte.split(`{${nom}}`).join(String(valeur))
    return texte
  }
}

/** Un message de l'assembleur ou du simulateur dans la langue courante. */
export const messageMain = (message: string): string => traduireMessage(message, courante)
