import './style.css'
import './parcours.css'
import './monaco/workers'
import type { ProfilPublic } from '../../shared/ipc'
import { registerM68kLanguage } from './monaco/m68kLanguage'
import { definirProfilActif } from './profilActif'
import { oublierProgression } from './progressionStore'
import { renderParcours } from './views/parcours'
import { renderTrainer } from './views/trainer'
import { renderCours } from './views/cours'
import { renderExercices } from './views/exercices'
import { renderApropos } from './views/apropos'
import { renderChoixProfil } from './views/profils'
import { echapper } from './views/parcours/markdown'

registerM68kLanguage()

type ViewId = 'parcours' | 'trainer' | 'cours' | 'exercices' | 'apropos'

// « Fiches » et « Exercices libres » sont les écrans de la version 0.1, conservés tels quels.
const VIEWS: { id: ViewId; label: string; title: string; render: (el: HTMLElement) => () => void }[] = [
  { id: 'parcours', label: 'Parcours', title: 'Le parcours guidé, chapitre par chapitre', render: renderParcours },
  { id: 'trainer', label: 'Bac à sable', title: 'Écris et exécute librement ton propre code', render: renderTrainer },
  { id: 'cours', label: 'Fiches', title: 'Fiches de référence (version 0.1)', render: renderCours },
  { id: 'exercices', label: 'Exercices libres', title: 'Exercices de la version 0.1', render: renderExercices },
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
      <span class="nav-profil" id="nav-profil" title="Profil ouvert">👤 ${echapper(profil.nom)}${profil.protege ? ' 🔒' : ''}</span>
      <button class="nav-tab" id="btn-changer-profil" title="Revenir à l'écran « Qui es-tu ? »">Changer de profil</button>
    </nav>
    <div class="view-container" id="view-container"></div>
  `
  const viewContainer = document.getElementById('view-container') as HTMLDivElement

  function switchTo(viewId: ViewId): void {
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
  switchTo('parcours')
}

// La page À propos peut renommer ou supprimer le profil ouvert
window.addEventListener('profil-modifie', ((e: CustomEvent<ProfilPublic | null>) => {
  if (!e.detail) return choisirProfil(false)
  definirProfilActif(e.detail)
  const nav = document.getElementById('nav-profil')
  if (nav) nav.textContent = `👤 ${e.detail.nom}${e.detail.protege ? ' 🔒' : ''}`
}) as EventListener)

choisirProfil(true)
