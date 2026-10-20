import type { ProfilPublic, ProgressState } from '../../../shared/ipc'
import type { Parcours } from '../../../shared/parcours'
import { detailChapitre, detailParcours } from '../../../shared/progression'
import { getContent } from '../content'
import { restaurerBrouillons } from '../profilActif'
import { echapper } from './parcours/markdown'

/**
 * Écran « Qui es-tu ? » : choisir, créer ou importer un profil, ou consulter le tableau de suivi.
 * `ouvert` est appelé une fois le profil ouvert.
 */
export function renderChoixProfil(
  container: HTMLElement,
  ouvert: (profil: ProfilPublic) => void,
  /** Au lancement : un profil unique sans mot de passe s'ouvre tout seul. */
  autoOuvrir = false
): void {
  container.innerHTML = '<div class="profils-view"><p class="loading">Chargement des profils…</p></div>'
  const root = container.querySelector<HTMLDivElement>('.profils-view')!

  async function afficher(message = ''): Promise<void> {
    const { profils, dernier } = await window.api.listerProfils()
    root.innerHTML = `
      <div class="profils-carte">
        <h1>68k Trainer</h1>
        <h2>Qui es-tu ?</h2>
        ${message ? `<p class="profils-message">${echapper(message)}</p>` : ''}
        <div class="profils-liste">
          ${profils
            .map(
              (p) => `
            <button class="profil-tuile${p.id === dernier ? ' dernier' : ''}" data-id="${p.id}">
              <span class="profil-avatar">${echapper(p.nom.charAt(0).toUpperCase())}</span>
              <span class="profil-nom">${echapper(p.nom)}</span>
              ${p.protege ? '<span class="profil-cadenas" title="Protégé par un mot de passe">🔒</span>' : ''}
            </button>`
            )
            .join('')}
          <button class="profil-tuile profil-nouveau" id="btn-nouveau"><span class="profil-avatar">+</span><span class="profil-nom">Nouveau profil</span></button>
        </div>
        <div class="profils-panneau" id="panneau"></div>
        <div class="profils-actions">
          <button id="btn-importer">Importer un profil…</button>
          ${profils.length > 1 ? '<button id="btn-tableau">Tableau de suivi</button>' : ''}
        </div>
      </div>`

    root.querySelectorAll<HTMLButtonElement>('.profil-tuile[data-id]').forEach((btn) =>
      btn.addEventListener('click', () => {
        const profil = profils.find((p) => p.id === btn.dataset.id)!
        if (!profil.protege) void ouvrir(profil.id)
        else demanderMotDePasse(profil)
      })
    )
    root.querySelector('#btn-nouveau')!.addEventListener('click', formulaireNouveau)
    root.querySelector('#btn-importer')!.addEventListener('click', formulaireImport)
    root.querySelector('#btn-tableau')?.addEventListener('click', () => void tableau())
  }

  const panneau = (): HTMLDivElement => root.querySelector<HTMLDivElement>('#panneau')!

  async function ouvrir(id: string, motDePasse?: string): Promise<string | undefined> {
    const res = await window.api.ouvrirProfil(id, motDePasse)
    if (!res.ok || !res.profil) return res.erreur ?? 'Impossible d’ouvrir ce profil.'
    ouvert(res.profil)
    return undefined
  }

  function demanderMotDePasse(profil: ProfilPublic): void {
    panneau().innerHTML = `
      <form class="profils-form" id="form-mdp">
        <label>Mot de passe de <strong>${echapper(profil.nom)}</strong>
          <input type="password" id="mdp" autocomplete="current-password" autofocus /></label>
        <div class="profils-form-boutons"><button class="btn-principal" type="submit">Ouvrir</button> <button type="button" id="annuler">Annuler</button></div>
        <p class="profils-erreur" id="erreur"></p>
      </form>`
    const form = panneau().querySelector<HTMLFormElement>('#form-mdp')!
    const champ = form.querySelector<HTMLInputElement>('#mdp')!
    champ.focus()
    form.addEventListener('submit', (e) => {
      e.preventDefault()
      void ouvrir(profil.id, champ.value).then((erreur) => {
        if (erreur) {
          form.querySelector('#erreur')!.textContent = erreur
          champ.select()
        }
      })
    })
    form.querySelector('#annuler')!.addEventListener('click', () => (panneau().innerHTML = ''))
  }

  /** Champs « mot de passe facultatif » + confirmation ; renvoie le mot de passe ou une erreur. */
  const CHAMPS_MDP = `
    <label>Mot de passe <small>(facultatif)</small><input type="password" id="mdp1" autocomplete="new-password" /></label>
    <label>Confirmer le mot de passe<input type="password" id="mdp2" autocomplete="new-password" /></label>`

  function lireMotDePasse(form: HTMLElement): { mdp?: string; erreur?: string } {
    const a = form.querySelector<HTMLInputElement>('#mdp1')!.value
    const b = form.querySelector<HTMLInputElement>('#mdp2')!.value
    if (a !== b) return { erreur: 'Les deux mots de passe ne sont pas identiques.' }
    return { mdp: a || undefined }
  }

  function formulaireNouveau(): void {
    panneau().innerHTML = `
      <form class="profils-form" id="form-nouveau">
        <label>Prénom ou pseudo<input type="text" id="nom" maxlength="40" autofocus /></label>
        <fieldset class="profils-machine"><legend>Ta machine</legend>
          <label><input type="radio" name="machine" value="atari" checked /> Atari ST</label>
          <label><input type="radio" name="machine" value="amiga" /> Amiga 500</label>
          <small>Les trois premiers chapitres (le 68000) sont communs ; tu pourras changer de machine à tout moment, en haut à droite.</small>
        </fieldset>
        ${CHAMPS_MDP}
        <p class="profils-aide">Sans mot de passe, n'importe qui sur cet ordinateur peut ouvrir ce profil. Avec, il est
        protégé dans l'application (mais pas chiffré sur le disque).</p>
        <div class="profils-form-boutons"><button class="btn-principal" type="submit">Créer et commencer</button> <button type="button" id="annuler">Annuler</button></div>
        <p class="profils-erreur" id="erreur"></p>
      </form>`
    const form = panneau().querySelector<HTMLFormElement>('#form-nouveau')!
    form.querySelector<HTMLInputElement>('#nom')!.focus()
    form.addEventListener('submit', (e) => {
      e.preventDefault()
      void (async () => {
        const erreurEl = form.querySelector('#erreur')!
        const nom = form.querySelector<HTMLInputElement>('#nom')!.value.trim()
        if (!nom) return void (erreurEl.textContent = 'Choisis un nom.')
        const { mdp, erreur } = lireMotDePasse(form)
        if (erreur) return void (erreurEl.textContent = erreur)
        const machine = form.querySelector<HTMLInputElement>('input[name="machine"]:checked')?.value === 'amiga' ? 'amiga' : 'atari'
        const res = await window.api.creerProfil(nom, mdp, { completedExerciseIds: [], machine })
        if (!res.ok || !res.profil) return void (erreurEl.textContent = res.erreur ?? 'Création impossible.')
        const err = await ouvrir(res.profil.id, mdp)
        if (err) erreurEl.textContent = err
      })()
    })
    form.querySelector('#annuler')!.addEventListener('click', () => (panneau().innerHTML = ''))
  }

  function formulaireImport(): void {
    panneau().innerHTML = `
      <form class="profils-form" id="form-import">
        <p class="profils-aide">Un profil exporté (fichier <code>.68kprofil</code>) devient un nouveau profil sur cet ordinateur,
        avec sa progression et ses brouillons. Choisis d'abord son mot de passe ici (facultatif), puis le fichier.</p>
        ${CHAMPS_MDP}
        <div class="profils-form-boutons"><button class="btn-principal" type="submit">Choisir le fichier…</button> <button type="button" id="annuler">Annuler</button></div>
        <p class="profils-erreur" id="erreur"></p>
      </form>`
    const form = panneau().querySelector<HTMLFormElement>('#form-import')!
    form.addEventListener('submit', (e) => {
      e.preventDefault()
      void (async () => {
        const erreurEl = form.querySelector('#erreur')!
        const { mdp, erreur } = lireMotDePasse(form)
        if (erreur) return void (erreurEl.textContent = erreur)
        const res = await window.api.importerProfil(mdp)
        if (!res.ok) {
          if (res.erreur) erreurEl.textContent = res.erreur
          return
        }
        if (res.profil) restaurerBrouillons(res.profil.id, res.brouillons ?? {})
        await afficher(`Profil « ${res.profil?.nom} » importé.`)
      })()
    })
    form.querySelector('#annuler')!.addEventListener('click', () => (panneau().innerHTML = ''))
  }

  async function tableau(): Promise<void> {
    const [lignes, content] = await Promise.all([window.api.tableauProfils(), getContent()])
    const tableaux = content.parcours.filter((p) => p.statut === 'actif').map((p) => tableauParcours(p, lignes))
    panneau().innerHTML = `
      <div class="profils-tableau">
        ${tableaux.join('')}
        <p class="profils-aide">Le tableau ne montre que la progression, jamais le code ni les mots de passe.</p>
        <button id="fermer-tableau">Fermer</button>
      </div>`
    panneau().querySelector('#fermer-tableau')!.addEventListener('click', () => (panneau().innerHTML = ''))
  }

  function tableauParcours(parcours: Parcours, lignes: { profil: ProfilPublic; progression: ProgressState }[]): string {
    const chapitres = parcours.chapitres.filter((c) => !c.esquisse)
    // Titres lisibles des étapes, pour la colonne « Dernière étape »
    const titres = new Map<string, string>()
    parcours.chapitres.forEach((c, i) => {
      for (const n of c.notions) for (const x of n.contenus) titres.set(x.id, `Ch. ${i + 1} — ${x.titre}`)
      for (const b of c.bonus ?? []) titres.set(b.id, `Ch. ${i + 1} — ★ ${b.titre}`)
      if (c.qcm) titres.set(c.qcm.id, `Ch. ${i + 1} — QCM`)
    })
    const cellule = (pct: number): string =>
      `<td class="tab-pct" style="--pct:${pct}%"><span>${pct} %</span></td>`
    return `
        <h3>Tableau de suivi — ${echapper(parcours.titre)}</h3>
        <table>
          <thead><tr><th>Profil</th><th>Total</th>${chapitres.map((c) => `<th title="${echapper(c.titre)}">Ch. ${parcours.chapitres.indexOf(c) + 1}</th>`).join('')}<th>Bonus</th><th>Dernière étape</th></tr></thead>
          <tbody>
            ${lignes
              .map(({ profil, progression }) => {
                const g = detailParcours(parcours, progression)
                const id = progression.positions?.[parcours.id]?.etapeId
                const derniere = id ? (titres.get(id) ?? id) : '—'
                return `<tr><td>${echapper(profil.nom)}${profil.protege ? ' 🔒' : ''}</td>${cellule(g.pourcentage)}${chapitres
                  .map((c) => cellule(detailChapitre(c, progression).pourcentage))
                  .join('')}<td>★ ${g.bonusFaits}/${g.bonusTotal}</td><td class="tab-etape">${echapper(derniere)}</td></tr>`
              })
              .join('')}
          </tbody>
        </table>`
  }

  void (async () => {
    const { profils } = await window.api.listerProfils()
    // Un seul profil, sans mot de passe : on l'ouvre directement
    if (autoOuvrir && profils.length === 1 && !profils[0].protege) {
      const erreur = await ouvrir(profils[0].id)
      if (!erreur) return
    }
    await afficher(profils.length === 0 ? 'Bienvenue ! Crée ton profil pour commencer.' : '')
    if (profils.length === 0) formulaireNouveau()
  })()
}
