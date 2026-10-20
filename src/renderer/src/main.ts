import './style.css'
import './parcours.css'
import './monaco/workers'
import type { ProfilPublic } from '../../shared/ipc'
import { registerM68kLanguage } from './monaco/m68kLanguage'
import { definirProfilActif } from './profilActif'
import { chargerProgression, choisirMachine, machineActive, oublierProgression } from './progressionStore'
import { renderParcours } from './views/parcours'
import { renderTrainer } from './views/trainer'
import { renderCours } from './views/cours'
import { renderExercices } from './views/exercices'
import { renderApropos } from './views/apropos'
import { renderEmulateurs } from './views/emulateurs'
import { renderChoixProfil } from './views/profils'
import { echapper } from './views/parcours/markdown'

registerM68kLanguage()

type ViewId = 'parcours' | 'trainer' | 'cours' | 'exercices' | 'emulateurs' | 'apropos'

// « Fiches » et « Exercices libres » : les cours et exercices du parcours de la machine, plus ceux de la version 0.1.
const VIEWS: { id: ViewId; label: string; title: string; render: (el: HTMLElement) => () => void }[] = [
  { id: 'parcours', label: 'Parcours', title: 'Le parcours guidé, chapitre par chapitre', render: renderParcours },
  { id: 'trainer', label: 'Bac à sable', title: 'Écris et exécute librement ton propre code', render: renderTrainer },
  { id: 'cours', label: 'Fiches', title: 'Tous les cours du parcours, et les fiches de référence', render: renderCours },
  { id: 'exercices', label: 'Exercices libres', title: 'Tous les exercices du parcours, dans l’ordre que tu veux', render: renderExercices },
  { id: 'emulateurs', label: 'Émulateurs', title: 'Installer et lancer Hatari (Atari ST) et WinUAE (Amiga)', render: renderEmulateurs },
  { id: 'apropos', label: 'À propos', title: 'Version, crédits et gestion de ton profil', render: renderApropos }
]

const app = document.getElementById('app')!
let cleanupCurrentView: (() => void) | null = null

/** Écran de choix du profil (au lancement, ou via « Changer de profil »). */
function choisirProfil(auLancement: boolean): void {
  cleanupCurrentView?.()
  cleanupCurrentView = null
  definirProfilActif(null)
  oublierProgression()
  app.innerHTML = ''
  renderChoixProfil(app, demarrer, auLancement)
}

/** Interface principale pour le profil ouvert. */
function demarrer(profil: ProfilPublic): void {
  definirProfilActif(profil)
  oublierProgression()
  app.innerHTML = `
    <nav class="app-nav">
      <span class="app-title">68k Trainer</span>
      ${VIEWS.map((v) => `<button class="nav-tab" data-view="${v.id}" title="${v.title}">${v.label}</button>`).join('')}
      <span class="nav-espace"></span>
      <span class="nav-machine" id="nav-machine" title="La machine simulée : chaque machine a son parcours (les chapitres du 68000 sont communs)">
        <button data-machine="atari">Atari ST</button><button data-machine="amiga">Amiga 500</button>
      </span>
      <span class="nav-profil" id="nav-profil" title="Profil ouvert">👤 ${echapper(profil.nom)}${profil.protege ? ' 🔒' : ''}</span>
      <button class="nav-tab" id="btn-changer-profil" title="Revenir à l'écran « Qui es-tu ? »">Changer de profil</button>
    </nav>
    <div class="view-container" id="view-container"></div>
  `
  const viewContainer = document.getElementById('view-container') as HTMLDivElement

  let vueCourante: ViewId = 'parcours'

  function switchTo(viewId: ViewId): void {
    vueCourante = viewId
    const view = VIEWS.find((v) => v.id === viewId)!
    cleanupCurrentView?.()
    document.querySelectorAll<HTMLButtonElement>('.nav-tab[data-view]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.view === viewId)
    })
    cleanupCurrentView = view.render(viewContainer)
  }

  document.querySelectorAll<HTMLButtonElement>('.nav-tab[data-view]').forEach((btn) => {
    btn.addEventListener('click', () => switchTo(btn.dataset.view as ViewId))
  })
  document.getElementById('btn-changer-profil')!.addEventListener('click', () => {
    void window.api.fermerProfil().then(() => choisirProfil(false))
  })
  // Machine du profil : boutons de la barre, et changement à tout moment
  const boutonsMachine = document.querySelectorAll<HTMLButtonElement>('#nav-machine button')
  const marquerMachine = (): void => boutonsMachine.forEach((b) => b.classList.toggle('active', b.dataset.machine === machineActive()))
  boutonsMachine.forEach((b) =>
    b.addEventListener('click', () => {
      if (b.dataset.machine === machineActive()) return
      choisirMachine(b.dataset.machine === 'amiga' ? 'amiga' : 'atari')
      marquerMachine()
      switchTo(vueCourante)
    })
  )
  void chargerProgression().then(() => {
    marquerMachine()
    switchTo('parcours')
  })
}

// La page À propos peut renommer ou supprimer le profil ouvert
window.addEventListener('profil-modifie', ((e: CustomEvent<ProfilPublic | null>) => {
  if (!e.detail) return choisirProfil(false)
  definirProfilActif(e.detail)
  const nav = document.getElementById('nav-profil')
  if (nav) nav.textContent = `👤 ${e.detail.nom}${e.detail.protege ? ' 🔒' : ''}`
}) as EventListener)

choisirProfil(true)
