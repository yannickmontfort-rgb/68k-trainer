import type { ProfilPublic } from '../../../shared/ipc'
import { brouillonsDuProfil, effacerBrouillons, profilActif } from '../profilActif'
import { chargerProgression, choisirLangue, reinitialiserProgression } from '../progressionStore'
import { echapper } from './parcours/markdown'
import { confirmer } from '../components/dialogue'
import { langueCourante, traducteur } from '../langue'
import { renderPresentation } from './presentation'

const t = traducteur({
  fr: {
    chargement: 'Chargement…',
    version: 'Version {version} — {annee}',
    auteurs: 'Développé par Yannick Montfort avec Claude (Anthropic)',
    licence: 'Logiciel libre sous licence GNU GPL v3 ou ultérieure.',
    soutien: '68k Trainer est gratuit. Pour encourager son développement :',
    soutenir: '☕ Soutenir le projet (PayPal)',
    locale: 'fr-FR',
    compile: 'Compilé le {date}',
    developpement: 'Version de développement',
    presentation: 'Revoir la présentation du logiciel',
    capot: 'Sous le capot',
    capotTexte:
      'Assembleur et désassembleur 68000 écrits pour 68k Trainer, compatibles Devpac (vérifiés octet par octet contre vasm, de Volker Barthelmann et Frank Wille). ' +
      'Émulateur 68000, TOS simulé et Amiga 500 simulé (puces custom, Kickstart 1.3) écrits pour 68k Trainer.',
    sources: 'Sources des cours',
    sourcesTexte:
      "Cours reformulés à partir du cours d'assembleur 68000 sur Atari ST du Féroce Lapin, du cours " +
      "d'initiation à l'assembleur 68000 de David Bouchet (EPITA), du polycopié de Philippe Meyne (IUT d'Évry), " +
      "du manuel Motorola M68000PRM et d'un manuel de synthèse Atari ST (vérifié et corrigé). Parcours Amiga rédigé " +
      "d'après Amiga Intern (Abacus), La Bible de l'Amiga (Micro Application), le Hardware Reference Manual et les sources " +
      "d'AROS, et un manuel de synthèse Amiga (vérifié et corrigé).",
    monProfil: 'Mon profil :',
    stockage: 'Ta progression et tes brouillons sont enregistrés sur cet ordinateur uniquement, dans ton profil.',
    langue: 'Langue de l’interface et des cours :',
    nouveauNom: 'Nouveau nom',
    renommer: 'Renommer',
    mdpActuel: 'Mot de passe actuel',
    nouveauMdp: 'Nouveau mot de passe <small>(vide = supprimer le mot de passe)</small>',
    mdp: 'Mot de passe',
    confirmer: 'Confirmer',
    changerMdp: 'Changer le mot de passe',
    proteger: 'Protéger mon profil',
    exporterTitre: 'Pour passer sur un autre ordinateur (maison, lycée…)',
    exporter: 'Exporter mon profil…',
    remiseAZero: 'Remettre ma progression à zéro',
    mdpSuppr: 'Mot de passe, pour supprimer',
    supprimer: 'Supprimer mon profil',
    renommageImpossible: 'Renommage impossible.',
    renomme: 'Profil renommé.',
    mdpDifferents: 'Les deux mots de passe ne sont pas identiques.',
    choisisMdp: 'Choisis un mot de passe.',
    changementImpossible: 'Changement impossible.',
    exporte: 'Profil exporté : {chemin}',
    effacerConfirmer: 'Effacer toute ta progression (cours lus, exercices réussis, QCM) ? Cette action est définitive.',
    effacer: 'Effacer',
    efface: 'Progression effacée.',
    supprimerConfirmer: 'Supprimer définitivement le profil « {nom} », sa progression et ses brouillons ?',
    supprimerBouton: 'Supprimer',
    suppressionImpossible: 'Suppression impossible.'
  },
  en: {
    chargement: 'Loading…',
    version: 'Version {version} — {annee}',
    auteurs: 'Developed by Yannick Montfort with Claude (Anthropic)',
    licence: 'Free software under the GNU GPL v3 or later.',
    soutien: '68k Trainer is free. To support its development:',
    soutenir: '☕ Support the project (PayPal)',
    locale: 'en-US',
    compile: 'Built on {date}',
    developpement: 'Development version',
    presentation: 'See the introduction to the software again',
    capot: 'Under the hood',
    capotTexte:
      'The 68000 assembler and disassembler were written for 68k Trainer and are compatible with Devpac (checked byte for byte against vasm, by Volker Barthelmann and Frank Wille). ' +
      'The 68000 emulator, the simulated TOS and the simulated Amiga 500 (custom chips, Kickstart 1.3) were also written for 68k Trainer.',
    sources: 'Sources of the lessons',
    sourcesTexte:
      "The lessons were rewritten from Féroce Lapin's 68000 assembly course on the Atari ST, David Bouchet's " +
      "introduction to 68000 assembly (EPITA), Philippe Meyne's course notes (IUT d'Évry), the Motorola M68000PRM manual " +
      'and an Atari ST summary manual (checked and corrected). The Amiga course was written from Amiga Intern (Abacus), ' +
      "La Bible de l'Amiga (Micro Application), the Hardware Reference Manual, the AROS sources and an Amiga summary " +
      'manual (checked and corrected).',
    monProfil: 'My profile:',
    stockage: 'Your progress and your drafts are saved on this computer only, in your profile.',
    langue: 'Language of the interface and the lessons:',
    nouveauNom: 'New name',
    renommer: 'Rename',
    mdpActuel: 'Current password',
    nouveauMdp: 'New password <small>(empty = remove the password)</small>',
    mdp: 'Password',
    confirmer: 'Confirm',
    changerMdp: 'Change the password',
    proteger: 'Protect my profile',
    exporterTitre: 'To move to another computer (home, school…)',
    exporter: 'Export my profile…',
    remiseAZero: 'Reset my progress',
    mdpSuppr: 'Password, to delete',
    supprimer: 'Delete my profile',
    renommageImpossible: 'Could not rename the profile.',
    renomme: 'Profile renamed.',
    mdpDifferents: 'The two passwords do not match.',
    choisisMdp: 'Choose a password.',
    changementImpossible: 'Could not change the password.',
    exporte: 'Profile exported: {chemin}',
    effacerConfirmer: 'Erase all your progress (lessons read, exercises passed, quizzes)? This cannot be undone.',
    effacer: 'Erase',
    efface: 'Progress erased.',
    supprimerConfirmer: 'Permanently delete the profile “{nom}”, its progress and its drafts?',
    supprimerBouton: 'Delete',
    suppressionImpossible: 'Could not delete the profile.'
  }
})

function signalerProfil(profil: ProfilPublic | null): void {
  window.dispatchEvent(new CustomEvent('profil-modifie', { detail: profil }))
}

export function renderApropos(container: HTMLElement): () => void {
  container.innerHTML = `<div class="apropos-view"><p class="loading">${t('chargement')}</p></div>`
  const root = container.querySelector('.apropos-view') as HTMLDivElement
  let disposed = false

  Promise.all([window.api.getBuildInfo(), chargerProgression()]).then(([info]) => {
    if (disposed) return
    const profil = profilActif()!
    root.innerHTML = `
      <div class="apropos-card">
        <h2>68k Trainer</h2>
        <p class="apropos-version">${t('version', { version: info.version, annee: info.year })}</p>
        <p class="apropos-authors">${t('auteurs')}</p>
        <p class="apropos-texte">${t('licence')}</p>
        <p class="apropos-soutien">${t('soutien')}
        <a href="https://paypal.me/YMONTFORT" target="_blank" rel="noopener">${t('soutenir')}</a></p>
        ${info.builtAt ? `<p class="apropos-built">${t('compile', { date: new Date(info.builtAt).toLocaleString(t('locale')) })}</p>` : `<p class="apropos-built">${t('developpement')}</p>`}
        <p class="apropos-presentation"><button id="btn-presentation">${t('presentation')}</button></p>
        <h3>${t('capot')}</h3>
        <p class="apropos-texte">${t('capotTexte')}</p>
        <h3>${t('sources')}</h3>
        <p class="apropos-texte">${t('sourcesTexte')}</p>
      </div>
      <div class="apropos-card profil-gestion">
        <h3>${t('monProfil')} <span id="profil-nom">${echapper(profil.nom)}</span> ${profil.protege ? '🔒' : ''}</h3>
        <p class="apropos-texte">${t('stockage')}</p>
        <p class="apropos-texte">${t('langue')}
          <span class="nav-machine" id="profil-langue">
            <button data-langue="fr" class="${langueCourante() === 'fr' ? 'active' : ''}">Français</button><button data-langue="en" class="${langueCourante() === 'en' ? 'active' : ''}">English</button>
          </span>
        </p>

        <form class="profils-form" id="form-renommer">
          <label>${t('nouveauNom')}<input type="text" id="nouveau-nom" maxlength="40" value="${echapper(profil.nom)}" /></label>
          <div class="profils-form-boutons"><button type="submit">${t('renommer')}</button></div>
        </form>

        <form class="profils-form" id="form-mdp">
          ${profil.protege ? `<label>${t('mdpActuel')}<input type="password" id="mdp-actuel" autocomplete="current-password" /></label>` : ''}
          <label>${profil.protege ? t('nouveauMdp') : t('mdp')}<input type="password" id="mdp1" autocomplete="new-password" /></label>
          <label>${t('confirmer')}<input type="password" id="mdp2" autocomplete="new-password" /></label>
          <div class="profils-form-boutons"><button type="submit">${profil.protege ? t('changerMdp') : t('proteger')}</button></div>
        </form>

        <div class="profils-form-boutons">
          <button id="btn-exporter" title="${t('exporterTitre')}">${t('exporter')}</button>
          <button id="btn-reset-progression" class="btn-danger">${t('remiseAZero')}</button>
          ${profil.protege ? `<input type="password" id="mdp-suppr" placeholder="${t('mdpSuppr')}" autocomplete="current-password" />` : ''}
          <button id="btn-supprimer" class="btn-danger">${t('supprimer')}</button>
        </div>
        <p class="profils-message" id="profil-message"></p>
      </div>
    `
    const message = (texte: string, erreur = false): void => {
      const el = root.querySelector<HTMLParagraphElement>('#profil-message')!
      el.textContent = texte
      el.classList.toggle('profils-erreur', erreur)
    }

    root.querySelector('#btn-presentation')!.addEventListener('click', () => renderPresentation(container, () => renderApropos(container), false))

    // Langue du profil : la barre et cette page se redessinent dans la langue choisie
    root.querySelectorAll<HTMLButtonElement>('#profil-langue button').forEach((b) =>
      b.addEventListener('click', () => choisirLangue(b.dataset.langue === 'en' ? 'en' : 'fr'))
    )

    root.querySelector('#form-renommer')!.addEventListener('submit', (e) => {
      e.preventDefault()
      void (async () => {
        const res = await window.api.renommerProfil(root.querySelector<HTMLInputElement>('#nouveau-nom')!.value)
        if (!res.ok || !res.profil) return message(res.erreur ?? t('renommageImpossible'), true)
        root.querySelector('#profil-nom')!.textContent = res.profil.nom
        signalerProfil(res.profil)
        message(t('renomme'))
      })()
    })

    root.querySelector('#form-mdp')!.addEventListener('submit', (e) => {
      e.preventDefault()
      void (async () => {
        const actuel = root.querySelector<HTMLInputElement>('#mdp-actuel')?.value
        const a = root.querySelector<HTMLInputElement>('#mdp1')!.value
        const b = root.querySelector<HTMLInputElement>('#mdp2')!.value
        if (a !== b) return message(t('mdpDifferents'), true)
        if (!a && !profil.protege) return message(t('choisisMdp'), true)
        const res = await window.api.motDePasseProfil(actuel, a || undefined)
        if (!res.ok || !res.profil) return message(res.erreur ?? t('changementImpossible'), true)
        signalerProfil(res.profil)
        renderApropos(container) // rafraîchit le formulaire (protégé ou non)
      })()
    })

    root.querySelector('#btn-exporter')!.addEventListener('click', () => {
      void window.api.exporterProfil(brouillonsDuProfil()).then((res) => {
        if (res.ok) message(t('exporte', { chemin: res.chemin ?? '' }))
      })
    })

    root.querySelector('#btn-reset-progression')!.addEventListener('click', () => {
      void confirmer(t('effacerConfirmer'), t('effacer')).then((oui) => {
        if (!oui) return
        reinitialiserProgression()
        message(t('efface'))
      })
    })

    root.querySelector('#btn-supprimer')!.addEventListener('click', () => {
      void (async () => {
        if (!(await confirmer(t('supprimerConfirmer', { nom: profil.nom }), t('supprimerBouton')))) return
        const mdp = root.querySelector<HTMLInputElement>('#mdp-suppr')?.value
        const res = await window.api.supprimerProfil(mdp)
        if (!res.ok) return message(res.erreur ?? t('suppressionImpossible'), true)
        effacerBrouillons(profil.id)
        signalerProfil(null)
      })()
    })
  })

  return () => {
    disposed = true
  }
}
