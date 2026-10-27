import './style.css'
import './parcours.css'
import './monaco/workers'
import type { ProfilPublic } from '../../shared/ipc'
import { registerM68kLanguage } from './monaco/m68kLanguage'
import { definirProfilActif } from './profilActif'
import { chargerProgression, choisirLangue, choisirMachine, machineActive, oublierProgression } from './progressionStore'
import { langueCourante, surChangementLangue, traducteur } from './langue'
import { renderParcours } from './views/parcours'
import { renderTrainer } from './views/trainer'
import { renderCours } from './views/cours'
import { renderApropos } from './views/apropos'
import { renderEmulateurs } from './views/emulateurs'
import { renderChoixProfil } from './views/profils'
import { echapper } from './views/parcours/markdown'

registerM68kLanguage()

type ViewId = 'parcours' | 'trainer' | 'cours' | 'emulateurs' | 'apropos'

const t = traducteur({
  fr: {
    parcours: 'Parcours',
    parcoursTitre: 'Le parcours guidé, chapitre par chapitre',
    trainer: 'Bac à sable',
    trainerTitre: 'Écris et exécute librement ton propre code',
    cours: 'Fiches',
    coursTitre: 'Tous les cours du parcours, et les fiches de référence',
    emulateurs: 'Émulateurs',
    emulateursTitre: 'Installer et lancer Hatari (Atari ST) et WinUAE (Amiga)',
    apropos: 'À propos',
    aproposTitre: 'Version, crédits et gestion de ton profil',
    machineTitre: 'La machine simulée : chaque machine a son parcours (les chapitres du 68000 sont communs)',
    profilTitre: 'Profil ouvert',
    changerProfil: 'Changer de profil',
    changerProfilTitre: 'Revenir à l’écran « Qui es-tu ? »',
    langueTitre: 'Langue de l’interface et des cours'
  },
  en: {
    parcours: 'Course',
    parcoursTitre: 'The guided course, chapter by chapter',
    trainer: 'Sandbox',
    trainerTitre: 'Write and run your own code freely',
    cours: 'Sheets',
    coursTitre: 'All the lessons of the course, and the reference sheets',
    emulateurs: 'Emulators',
    emulateursTitre: 'Install and run Hatari (Atari ST) and WinUAE (Amiga)',
    apropos: 'About',
    aproposTitre: 'Version, credits and your profile settings',
    machineTitre: 'The simulated machine: each machine has its own course (the 68000 chapters are shared)',
    profilTitre: 'Open profile',
    changerProfil: 'Switch profile',
    changerProfilTitre: 'Back to the “Who are you?” screen',
    langueTitre: 'Language of the interface and the lessons'
  }
})

// « Fiches » : les cours du parcours de la machine, plus les fiches de référence.
const VIEWS: { id: ViewId; render: (el: HTMLElement) => () => void }[] = [
  { id: 'parcours', render: renderParcours },
  { id: 'trainer', render: renderTrainer },
  { id: 'cours', render: renderCours },
  { id: 'emulateurs', render: renderEmulateurs },
  { id: 'apropos', render: renderApropos }
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
  // L'écran d'accueil se redessine dans la nouvelle langue
  oublierLangue?.()
  oublierLangue = surChangementLangue(() => {
    app.innerHTML = ''
    renderChoixProfil(app, demarrer, auLancement)
  })
}

let oublierLangue: (() => void) | null = null

/** Interface principale pour le profil ouvert. */
function demarrer(profil: ProfilPublic): void {
  definirProfilActif(profil)
  oublierProgression()
  oublierLangue?.()
  oublierLangue = null
  app.innerHTML = `<nav class="app-nav" id="app-nav"></nav><div class="view-container" id="view-container"></div>`
  const viewContainer = document.getElementById('view-container') as HTMLDivElement

  let vueCourante: ViewId = 'parcours'

  function rendreNav(): void {
    document.getElementById('app-nav')!.innerHTML = `
      <span class="app-title">68k Trainer 2</span>
      ${VIEWS.map((v) => `<button class="nav-tab" data-view="${v.id}" title="${t(`${v.id}Titre`)}">${t(v.id)}</button>`).join('')}
      <span class="nav-espace"></span>
      <span class="nav-machine" id="nav-langue" title="${t('langueTitre')}">
        <button data-langue="fr">FR</button><button data-langue="en">EN</button>
      </span>
      <span class="nav-machine" id="nav-machine" title="${t('machineTitre')}">
        <button data-machine="atari">Atari ST</button><button data-machine="amiga">Amiga 500</button>
      </span>
      <span class="nav-profil" id="nav-profil" title="${t('profilTitre')}">👤 ${echapper(profil.nom)}${profil.protege ? ' 🔒' : ''}</span>
      <button class="nav-tab" id="btn-changer-profil" title="${t('changerProfilTitre')}">${t('changerProfil')}</button>
    `
    brancherNav()
  }

  function switchTo(viewId: ViewId): void {
    vueCourante = viewId
    const view = VIEWS.find((v) => v.id === viewId)!
    cleanupCurrentView?.()
    document.querySelectorAll<HTMLButtonElement>('.nav-tab[data-view]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.view === viewId)
    })
    cleanupCurrentView = view.render(viewContainer)
  }

  function marquerMachine(): void {
    document.querySelectorAll<HTMLButtonElement>('#nav-machine button').forEach((b) => b.classList.toggle('active', b.dataset.machine === machineActive()))
    document.querySelectorAll<HTMLButtonElement>('#nav-langue button').forEach((b) => b.classList.toggle('active', b.dataset.langue === langueCourante()))
  }

  function brancherNav(): void {
    document.querySelectorAll<HTMLButtonElement>('.nav-tab[data-view]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.view === vueCourante)
      btn.addEventListener('click', () => switchTo(btn.dataset.view as ViewId))
    })
    document.getElementById('btn-changer-profil')!.addEventListener('click', () => {
      void window.api.fermerProfil().then(() => choisirProfil(false))
    })
    // Machine du profil : boutons de la barre, et changement à tout moment
    document.querySelectorAll<HTMLButtonElement>('#nav-machine button').forEach((b) =>
      b.addEventListener('click', () => {
        if (b.dataset.machine === machineActive()) return
        choisirMachine(b.dataset.machine === 'amiga' ? 'amiga' : 'atari')
        marquerMachine()
        switchTo(vueCourante)
      })
    )
    // Langue du profil : la barre et la vue se redessinent
    document.querySelectorAll<HTMLButtonElement>('#nav-langue button').forEach((b) =>
      b.addEventListener('click', () => choisirLangue(b.dataset.langue === 'en' ? 'en' : 'fr'))
    )
    marquerMachine()
  }

  oublierLangue = surChangementLangue(() => {
    rendreNav()
    switchTo(vueCourante)
  })
  void chargerProgression().then(() => {
    rendreNav()
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
