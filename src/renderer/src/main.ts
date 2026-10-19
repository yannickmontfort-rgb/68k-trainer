import './style.css'
import './parcours.css'
import './monaco/workers'
import { registerM68kLanguage } from './monaco/m68kLanguage'
import { renderParcours } from './views/parcours'
import { renderTrainer } from './views/trainer'
import { renderCours } from './views/cours'
import { renderExercices } from './views/exercices'
import { renderApropos } from './views/apropos'

registerM68kLanguage()

type ViewId = 'parcours' | 'trainer' | 'cours' | 'exercices' | 'apropos'

// « Fiches » et « Exercices libres » sont les écrans de la version 0.1, conservés tels quels.
const VIEWS: { id: ViewId; label: string; title: string; render: (el: HTMLElement) => () => void }[] = [
  { id: 'parcours', label: 'Parcours', title: 'Le parcours guidé, chapitre par chapitre', render: renderParcours },
  { id: 'trainer', label: 'Bac à sable', title: 'Écris et exécute librement ton propre code', render: renderTrainer },
  { id: 'cours', label: 'Fiches', title: 'Fiches de référence (version 0.1)', render: renderCours },
  { id: 'exercices', label: 'Exercices libres', title: 'Exercices de la version 0.1', render: renderExercices },
  { id: 'apropos', label: 'À propos', title: 'Version et crédits', render: renderApropos }
]

const app = document.getElementById('app')!
app.innerHTML = `
  <nav class="app-nav">
    <span class="app-title">68k Trainer</span>
    ${VIEWS.map((v) => `<button class="nav-tab" data-view="${v.id}" title="${v.title}">${v.label}</button>`).join('')}
  </nav>
  <div class="view-container" id="view-container"></div>
`

const viewContainer = document.getElementById('view-container') as HTMLDivElement
let cleanupCurrentView: (() => void) | null = null

function switchTo(viewId: ViewId): void {
  const view = VIEWS.find((v) => v.id === viewId)!
  cleanupCurrentView?.()
  document.querySelectorAll<HTMLButtonElement>('.nav-tab').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.view === viewId)
  })
  cleanupCurrentView = view.render(viewContainer)
}

document.querySelectorAll<HTMLButtonElement>('.nav-tab').forEach((btn) => {
  btn.addEventListener('click', () => switchTo(btn.dataset.view as ViewId))
})

switchTo('parcours')
