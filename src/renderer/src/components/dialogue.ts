/**
 * Petites boîtes de dialogue dans la page, à la place de confirm() et alert() : sous Electron
 * (Windows), après une boîte native, les zones de saisie (dont l'éditeur Monaco) peuvent ne plus
 * recevoir le clavier tant que la fenêtre n'a pas perdu puis repris le focus.
 */

function boite(message: string, boutons: { texte: string; valeur: boolean; principal?: boolean }[]): Promise<boolean> {
  const avant = document.activeElement as HTMLElement | null
  return new Promise((resoudre) => {
    const fond = document.createElement('div')
    fond.className = 'dialogue-fond'
    fond.innerHTML = '<div class="dialogue" role="dialog" aria-modal="true"><p></p><div class="dialogue-boutons"></div></div>'
    fond.querySelector('p')!.textContent = message
    const zone = fond.querySelector('.dialogue-boutons')!
    const fermer = (valeur: boolean): void => {
      fond.remove()
      document.removeEventListener('keydown', clavier, true)
      avant?.focus()
      resoudre(valeur)
    }
    const clavier = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault()
        fermer(false)
      }
    }
    for (const b of boutons) {
      const bouton = document.createElement('button')
      bouton.textContent = b.texte
      if (b.principal) bouton.className = 'btn-principal'
      bouton.addEventListener('click', () => fermer(b.valeur))
      zone.appendChild(bouton)
    }
    document.addEventListener('keydown', clavier, true)
    document.body.appendChild(fond)
    ;(zone.querySelector('.btn-principal') as HTMLElement | null)?.focus()
  })
}

/** Question oui/non ; Échap = non. */
export function confirmer(message: string, oui = 'Oui', non = 'Annuler'): Promise<boolean> {
  return boite(message, [
    { texte: non, valeur: false },
    { texte: oui, valeur: true, principal: true }
  ])
}

/** Simple message, avec un bouton OK. */
export function informer(message: string): Promise<void> {
  return boite(message, [{ texte: 'OK', valeur: true, principal: true }]).then(() => undefined)
}
