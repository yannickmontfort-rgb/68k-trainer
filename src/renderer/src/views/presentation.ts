import icone from '../assets/icone-presentation.png'
import { definirLangue, langueCourante, traducteur } from '../langue'

/**
 * Page de présentation du logiciel : au lancement (avant le choix du profil), sauf si on a coché
 * « Ne plus afficher au démarrage », et à tout moment depuis la page À propos. Le choix vaut pour
 * ce poste (aucun profil n'est encore ouvert au lancement), comme la langue.
 */

const CLE = '68k-presentation-masquee'

export function presentationMasquee(): boolean {
  try {
    return localStorage.getItem(CLE) === '1'
  } catch {
    return false
  }
}

function masquerPresentation(masquee: boolean): void {
  try {
    if (masquee) localStorage.setItem(CLE, '1')
    else localStorage.removeItem(CLE)
  } catch {
    // stockage local indisponible : la page s'affichera au prochain lancement
  }
}

const t = traducteur({
  fr: {
    sousTitre: 'Apprendre l’assembleur 68000 sur Atari ST et Amiga 500',
    langueTitre: 'Langue de l’interface',
    quoiTitre: 'Ce que tu vas apprendre',
    quoi:
      'À programmer le Motorola 68000, le processeur de l’Atari ST et de l’Amiga, directement en assembleur. ' +
      'Les trois premiers chapitres, sur le 68000 lui-même, sont communs aux deux machines. Tu continues ensuite ' +
      'avec le parcours <strong>Atari ST</strong> (9 chapitres : TOS, écran, animation, clavier, joystick, son, ' +
      'Devpac, Line-A et GEM) ou le parcours <strong>Amiga</strong> (10 chapitres : Exec, puces custom, Copper, ' +
      'Blitter, sprites, Paula, exécutable AmigaDOS). Tu peux changer de machine à tout moment.',
    commentTitre: 'Comment ça se passe',
    comment:
      'Pour chaque notion : un cours, un exemple corrigé exécuté pas à pas avec l’explication de chaque ligne, ' +
      'une question de prédiction, puis des exercices de difficulté croissante. Chaque chapitre se termine par ' +
      'un QCM et des défis bonus facultatifs. Ton code tourne sur une machine simulée : tu vois les registres, ' +
      'la mémoire et l’écran changer à chaque instruction.',
    ongletsTitre: 'Les onglets',
    ongletParcours: '<strong>Parcours</strong> : le cours guidé, chapitre par chapitre, avec ta progression.',
    ongletBac: '<strong>Bac à sable</strong> : un éditeur pour écrire et exécuter librement ton propre code.',
    ongletFiches: '<strong>Fiches</strong> : tous les cours du parcours et les fiches de référence (68000, TOS, puces de l’Amiga…).',
    ongletEmulateurs:
      '<strong>Émulateurs</strong> : installer Hatari (Atari ST) et WinUAE (Amiga) pour essayer ton programme dans un émulateur complet.',
    ongletApropos: '<strong>À propos</strong> : la version, les crédits et la gestion de ton profil.',
    commencerTitre: 'Pour commencer',
    commencerTexte:
      'Crée ton profil : un prénom ou un pseudo, et ta machine. Le parcours s’ouvre au premier chapitre. ' +
      'Ta progression est enregistrée sur cet ordinateur ; tu peux exporter ton profil pour la reprendre ailleurs.',
    nePlusAfficher: 'Ne plus afficher cette page au démarrage',
    revoir: 'Tu pourras la revoir depuis l’onglet À propos.',
    commencer: 'Commencer',
    fermer: 'Fermer'
  },
  en: {
    sousTitre: 'Learn 68000 assembly on the Atari ST and the Amiga 500',
    langueTitre: 'Interface language',
    quoiTitre: 'What you will learn',
    quoi:
      'How to program the Motorola 68000, the processor of the Atari ST and the Amiga, directly in assembly. ' +
      'The first three chapters, on the 68000 itself, are shared by both machines. You then carry on with the ' +
      '<strong>Atari ST</strong> course (9 chapters: TOS, screen, animation, keyboard, joystick, sound, Devpac, ' +
      'Line-A and GEM) or the <strong>Amiga</strong> course (10 chapters: Exec, custom chips, Copper, Blitter, ' +
      'sprites, Paula, AmigaDOS executable). You can switch machines at any time.',
    commentTitre: 'How it works',
    comment:
      'For each topic: a lesson, a worked example run step by step with an explanation of every line, a ' +
      'prediction question, then exercises of increasing difficulty. Each chapter ends with a quiz and optional ' +
      'bonus challenges. Your code runs on a simulated machine: you see the registers, the memory and the screen ' +
      'change with every instruction.',
    ongletsTitre: 'The tabs',
    ongletParcours: '<strong>Course</strong>: the guided course, chapter by chapter, with your progress.',
    ongletBac: '<strong>Sandbox</strong>: an editor to write and run your own code freely.',
    ongletFiches: '<strong>Sheets</strong>: all the lessons of the course and the reference sheets (68000, TOS, Amiga chips…).',
    ongletEmulateurs:
      '<strong>Emulators</strong>: install Hatari (Atari ST) and WinUAE (Amiga) to try your program in a full emulator.',
    ongletApropos: '<strong>About</strong>: the version, the credits and your profile settings.',
    commencerTitre: 'Getting started',
    commencerTexte:
      'Create your profile: a first name or nickname, and your machine. The course opens at the first chapter. ' +
      'Your progress is saved on this computer; you can export your profile to carry on elsewhere.',
    nePlusAfficher: 'Do not show this page at startup',
    revoir: 'You can see it again from the About tab.',
    commencer: 'Start',
    fermer: 'Close'
  }
})

/**
 * Dessine la page dans `container`. `auLancement` : bouton « Commencer » et choix de la langue ;
 * sinon (depuis À propos) bouton « Fermer ». `fermer` est appelé quand on quitte la page.
 */
export function renderPresentation(container: HTMLElement, fermer: () => void, auLancement: boolean): void {
  container.innerHTML = `
    <div class="presentation-view">
      <div class="presentation-carte">
        <img class="presentation-icone" src="${icone}" alt="" width="96" height="96" />
        <h1>68k Trainer</h1>
        <p class="presentation-sous-titre">${t('sousTitre')}</p>
        ${
          auLancement
            ? `<p class="presentation-langue"><span class="nav-machine" id="presentation-langue" title="${t('langueTitre')}">
          <button data-langue="fr" class="${langueCourante() === 'fr' ? 'active' : ''}">FR</button><button data-langue="en" class="${langueCourante() === 'en' ? 'active' : ''}">EN</button>
        </span></p>`
            : ''
        }
        <h2>${t('quoiTitre')}</h2>
        <p>${t('quoi')}</p>
        <h2>${t('commentTitre')}</h2>
        <p>${t('comment')}</p>
        <h2>${t('ongletsTitre')}</h2>
        <ul>
          <li>${t('ongletParcours')}</li>
          <li>${t('ongletBac')}</li>
          <li>${t('ongletFiches')}</li>
          <li>${t('ongletEmulateurs')}</li>
          <li>${t('ongletApropos')}</li>
        </ul>
        <h2>${t('commencerTitre')}</h2>
        <p>${t('commencerTexte')}</p>
        <div class="presentation-pied">
          <label><input type="checkbox" id="presentation-masquer" ${presentationMasquee() ? 'checked' : ''} /> ${t('nePlusAfficher')}</label>
          <small>${t('revoir')}</small>
          <button class="btn-principal" id="presentation-fermer">${auLancement ? t('commencer') : t('fermer')}</button>
        </div>
      </div>
    </div>`

  const root = container.querySelector<HTMLDivElement>('.presentation-view')!
  root.querySelectorAll<HTMLButtonElement>('#presentation-langue button').forEach((b) =>
    b.addEventListener('click', () => definirLangue(b.dataset.langue === 'en' ? 'en' : 'fr'))
  )
  // La case s'enregistre tout de suite : elle survit à un changement de langue qui redessine la page
  root.querySelector<HTMLInputElement>('#presentation-masquer')!.addEventListener('change', (e) => {
    masquerPresentation((e.target as HTMLInputElement).checked)
  })
  const bouton = root.querySelector<HTMLButtonElement>('#presentation-fermer')!
  bouton.addEventListener('click', fermer)
  // Entrée lance l'appli, sans faire défiler la page jusqu'au bouton
  bouton.focus({ preventScroll: true })
  root.scrollTop = 0
}
