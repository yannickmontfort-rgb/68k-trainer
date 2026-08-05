import './style.css'
import './monaco/workers'
import { registerM68kLanguage } from './monaco/m68kLanguage'
import { renderTrainer } from './views/trainer'
import { renderCours } from './views/cours'
import { renderExercices } from './views/exercices'
import { renderApropos } from './views/apropos'

registerM68kLanguage()

type ViewId = 'trainer' | 'cours' | 'exercices' | 'apropos'

const VIEWS: { id: ViewId; label: string; render: (el: HTMLElement) => () => void }[] = [
  { id: 'trainer', label: 'Bac à sable', render: renderTrainer },
  { id: 'cours', label: 'Cours', render: renderCours },
  { id: 'exercices', label: 'Exercices', render: renderExercices },
  { id: 'apropos', label: 'À propos', render: renderApropos }
]

const app = document.getElementById('app')!
app.innerHTML = `
  <nav class="app-nav">
    <span class="app-title">68k-trainer</span>
    ${VIEWS.map((v) => `<button class="nav-tab" data-view="${v.id}">${v.label}</button>`).join('')}
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

switchTo('trainer')
