import type { ProfilPublic } from '../../../shared/ipc'
import { brouillonsDuProfil, effacerBrouillons, profilActif } from '../profilActif'
import { chargerProgression, reinitialiserProgression } from '../progressionStore'
import { echapper } from './parcours/markdown'

function signalerProfil(profil: ProfilPublic | null): void {
  window.dispatchEvent(new CustomEvent('profil-modifie', { detail: profil }))
}

export function renderApropos(container: HTMLElement): () => void {
  container.innerHTML = `<div class="apropos-view"><p class="loading">Chargement…</p></div>`
  const root = container.querySelector('.apropos-view') as HTMLDivElement
  let disposed = false

  Promise.all([window.api.getBuildInfo(), chargerProgression()]).then(([info]) => {
    if (disposed) return
    const profil = profilActif()!
    root.innerHTML = `
      <div class="apropos-card">
        <h2>68k Trainer</h2>
        <p class="apropos-version">Version ${info.version} — ${info.year}</p>
        <p class="apropos-authors">Développé par Yannick Montfort avec Claude (Anthropic)</p>
        <p class="apropos-texte">Logiciel libre sous licence GNU GPL v3 ou ultérieure.</p>
        ${info.builtAt ? `<p class="apropos-built">Compilé le ${new Date(info.builtAt).toLocaleString('fr-FR')}</p>` : '<p class="apropos-built">Version de développement</p>'}
        <h3>Sous le capot</h3>
        <p class="apropos-texte">Assembleur et désassembleur 68000 écrits pour 68k Trainer, compatibles Devpac (vérifiés octet par octet contre vasm, de Volker Barthelmann et Frank Wille).
        Émulateur 68000 et TOS simulé écrits pour 68k Trainer.</p>
        <h3>Sources des cours</h3>
        <p class="apropos-texte">Cours reformulés à partir du cours d'assembleur 68000 sur Atari ST du Féroce Lapin, du cours
        d'initiation à l'assembleur 68000 de David Bouchet (EPITA), du polycopié de Philippe Meyne (IUT d'Évry),
        du manuel Motorola M68000PRM et d'un manuel de synthèse Atari ST (vérifié et corrigé).</p>
      </div>
      <div class="apropos-card profil-gestion">
        <h3>Mon profil : <span id="profil-nom">${echapper(profil.nom)}</span> ${profil.protege ? '🔒' : ''}</h3>
        <p class="apropos-texte">Ta progression et tes brouillons sont enregistrés sur cet ordinateur uniquement, dans ton profil.</p>

        <form class="profils-form" id="form-renommer">
          <label>Nouveau nom<input type="text" id="nouveau-nom" maxlength="40" value="${echapper(profil.nom)}" /></label>
          <div class="profils-form-boutons"><button type="submit">Renommer</button></div>
        </form>

        <form class="profils-form" id="form-mdp">
          ${profil.protege ? '<label>Mot de passe actuel<input type="password" id="mdp-actuel" autocomplete="current-password" /></label>' : ''}
          <label>${profil.protege ? 'Nouveau mot de passe <small>(vide = supprimer le mot de passe)</small>' : 'Mot de passe'}<input type="password" id="mdp1" autocomplete="new-password" /></label>
          <label>Confirmer<input type="password" id="mdp2" autocomplete="new-password" /></label>
          <div class="profils-form-boutons"><button type="submit">${profil.protege ? 'Changer le mot de passe' : 'Protéger mon profil'}</button></div>
        </form>

        <div class="profils-form-boutons">
          <button id="btn-exporter" title="Pour passer sur un autre ordinateur (maison, lycée…)">Exporter mon profil…</button>
          <button id="btn-reset-progression" class="btn-danger">Remettre ma progression à zéro</button>
          ${profil.protege ? '<input type="password" id="mdp-suppr" placeholder="Mot de passe, pour supprimer" autocomplete="current-password" />' : ''}
          <button id="btn-supprimer" class="btn-danger">Supprimer mon profil</button>
        </div>
        <p class="profils-message" id="profil-message"></p>
      </div>
    `
    const message = (texte: string, erreur = false): void => {
      const el = root.querySelector<HTMLParagraphElement>('#profil-message')!
      el.textContent = texte
      el.classList.toggle('profils-erreur', erreur)
    }

    root.querySelector('#form-renommer')!.addEventListener('submit', (e) => {
      e.preventDefault()
      void (async () => {
        const res = await window.api.renommerProfil(root.querySelector<HTMLInputElement>('#nouveau-nom')!.value)
        if (!res.ok || !res.profil) return message(res.erreur ?? 'Renommage impossible.', true)
        root.querySelector('#profil-nom')!.textContent = res.profil.nom
        signalerProfil(res.profil)
        message('Profil renommé.')
      })()
    })

    root.querySelector('#form-mdp')!.addEventListener('submit', (e) => {
      e.preventDefault()
      void (async () => {
        const actuel = root.querySelector<HTMLInputElement>('#mdp-actuel')?.value
        const a = root.querySelector<HTMLInputElement>('#mdp1')!.value
        const b = root.querySelector<HTMLInputElement>('#mdp2')!.value
        if (a !== b) return message('Les deux mots de passe ne sont pas identiques.', true)
        if (!a && !profil.protege) return message('Choisis un mot de passe.', true)
        const res = await window.api.motDePasseProfil(actuel, a || undefined)
        if (!res.ok || !res.profil) return message(res.erreur ?? 'Changement impossible.', true)
        signalerProfil(res.profil)
        renderApropos(container) // rafraîchit le formulaire (protégé ou non)
      })()
    })

    root.querySelector('#btn-exporter')!.addEventListener('click', () => {
      void window.api.exporterProfil(brouillonsDuProfil()).then((res) => {
        if (res.ok) message(`Profil exporté : ${res.chemin}`)
      })
    })

    root.querySelector('#btn-reset-progression')!.addEventListener('click', () => {
      if (!confirm('Effacer toute ta progression (cours lus, exercices réussis, QCM) ? Cette action est définitive.')) return
      reinitialiserProgression()
      message('Progression effacée.')
    })

    root.querySelector('#btn-supprimer')!.addEventListener('click', () => {
      void (async () => {
        if (!confirm(`Supprimer définitivement le profil « ${profil.nom} », sa progression et ses brouillons ?`)) return
        const mdp = root.querySelector<HTMLInputElement>('#mdp-suppr')?.value
        const res = await window.api.supprimerProfil(mdp)
        if (!res.ok) return message(res.erreur ?? 'Suppression impossible.', true)
        effacerBrouillons(profil.id)
        signalerProfil(null)
      })()
    })
  })

  return () => {
    disposed = true
  }
}
