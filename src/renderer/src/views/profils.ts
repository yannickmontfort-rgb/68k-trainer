import type { ProfilPublic, ProgressState } from '../../../shared/ipc'
import type { Parcours } from '../../../shared/parcours'
import { detailChapitre, detailParcours } from '../../../shared/progression'
import { getContent } from '../content'
import { restaurerBrouillons } from '../profilActif'
import { echapper } from './parcours/markdown'
import { definirLangue, langueCourante, traducteur } from '../langue'

const t = traducteur({
  fr: {
    chargement: 'Chargement des profils…',
    quiEsTu: 'Qui es-tu ?',
    langueTitre: 'Langue de l’interface',
    protege: 'Protégé par un mot de passe',
    nouveauProfil: 'Nouveau profil',
    importer: 'Importer un profil…',
    tableau: 'Tableau de suivi',
    ouvertureImpossible: 'Impossible d’ouvrir ce profil.',
    mdpDe: 'Mot de passe de <strong>{nom}</strong>',
    ouvrir: 'Ouvrir',
    annuler: 'Annuler',
    mdpFacultatif: 'Mot de passe <small>(facultatif)</small>',
    confirmerMdp: 'Confirmer le mot de passe',
    mdpDifferents: 'Les deux mots de passe ne sont pas identiques.',
    prenom: 'Prénom ou pseudo',
    taMachine: 'Ta machine',
    machineAide: 'Les trois premiers chapitres (le 68000) sont communs ; tu pourras changer de machine à tout moment, en haut à droite.',
    mdpAide:
      "Sans mot de passe, n'importe qui sur cet ordinateur peut ouvrir ce profil. Avec, il est protégé dans l'application (mais pas chiffré sur le disque).",
    creer: 'Créer et commencer',
    choisisNom: 'Choisis un nom.',
    creationImpossible: 'Création impossible.',
    importAide:
      "Un profil exporté (fichier <code>.68kprofil</code>) devient un nouveau profil sur cet ordinateur, avec sa progression et ses brouillons. Choisis d'abord son mot de passe ici (facultatif), puis le fichier.",
    choisirFichier: 'Choisir le fichier…',
    importe: 'Profil « {nom} » importé.',
    tableauAide: 'Le tableau ne montre que la progression, jamais le code ni les mots de passe.',
    fermer: 'Fermer',
    chapitreCourt: 'Ch. {n}',
    qcm: 'QCM',
    tableauTitre: 'Tableau de suivi — {titre}',
    colProfil: 'Profil',
    colTotal: 'Total',
    colBonus: 'Bonus',
    colDerniere: 'Dernière étape',
    pourcentage: '{pct} %',
    bienvenue: 'Bienvenue ! Crée ton profil pour commencer.'
  },
  en: {
    chargement: 'Loading profiles…',
    quiEsTu: 'Who are you?',
    langueTitre: 'Interface language',
    protege: 'Protected by a password',
    nouveauProfil: 'New profile',
    importer: 'Import a profile…',
    tableau: 'Progress overview',
    ouvertureImpossible: 'Could not open this profile.',
    mdpDe: 'Password for <strong>{nom}</strong>',
    ouvrir: 'Open',
    annuler: 'Cancel',
    mdpFacultatif: 'Password <small>(optional)</small>',
    confirmerMdp: 'Confirm the password',
    mdpDifferents: 'The two passwords do not match.',
    prenom: 'First name or nickname',
    taMachine: 'Your machine',
    machineAide: 'The first three chapters (the 68000) are shared; you can switch machines at any time, at the top right.',
    mdpAide:
      'Without a password, anyone on this computer can open this profile. With one, it is protected in the application (but not encrypted on disk).',
    creer: 'Create and start',
    choisisNom: 'Choose a name.',
    creationImpossible: 'Could not create the profile.',
    importAide:
      'An exported profile (<code>.68kprofil</code> file) becomes a new profile on this computer, with its progress and its drafts. First choose its password here (optional), then the file.',
    choisirFichier: 'Choose the file…',
    importe: 'Profile “{nom}” imported.',
    tableauAide: 'The table only shows progress, never code or passwords.',
    fermer: 'Close',
    chapitreCourt: 'Ch. {n}',
    qcm: 'Quiz',
    tableauTitre: 'Progress overview — {titre}',
    colProfil: 'Profile',
    colTotal: 'Total',
    colBonus: 'Bonus',
    colDerniere: 'Last step',
    pourcentage: '{pct}%',
    bienvenue: 'Welcome. Create your profile to get started.'
  }
})

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
  container.innerHTML = `<div class="profils-view"><p class="loading">${t('chargement')}</p></div>`
  const root = container.querySelector<HTMLDivElement>('.profils-view')!

  async function afficher(message = ''): Promise<void> {
    const { profils, dernier } = await window.api.listerProfils()
    root.innerHTML = `
      <div class="profils-carte">
        <h1>68k Trainer</h1>
        <h2>${t('quiEsTu')}</h2>
        <span class="nav-machine" id="choix-langue" title="${t('langueTitre')}">
          <button data-langue="fr" class="${langueCourante() === 'fr' ? 'active' : ''}">FR</button><button data-langue="en" class="${langueCourante() === 'en' ? 'active' : ''}">EN</button>
        </span>
        ${message ? `<p class="profils-message">${echapper(message)}</p>` : ''}
        <div class="profils-liste">
          ${profils
            .map(
              (p) => `
            <button class="profil-tuile${p.id === dernier ? ' dernier' : ''}" data-id="${p.id}">
              <span class="profil-avatar">${echapper(p.nom.charAt(0).toUpperCase())}</span>
              <span class="profil-nom">${echapper(p.nom)}</span>
              ${p.protege ? `<span class="profil-cadenas" title="${t('protege')}">🔒</span>` : ''}
            </button>`
            )
            .join('')}
          <button class="profil-tuile profil-nouveau" id="btn-nouveau"><span class="profil-avatar">+</span><span class="profil-nom">${t('nouveauProfil')}</span></button>
        </div>
        <div class="profils-panneau" id="panneau"></div>
        <div class="profils-actions">
          <button id="btn-importer">${t('importer')}</button>
          ${profils.length > 1 ? `<button id="btn-tableau">${t('tableau')}</button>` : ''}
        </div>
      </div>`

    // Aucun profil n'est encore ouvert : la langue choisie ici vaut pour ce poste (l'écran se redessine)
    root.querySelectorAll<HTMLButtonElement>('#choix-langue button').forEach((b) =>
      b.addEventListener('click', () => definirLangue(b.dataset.langue === 'en' ? 'en' : 'fr'))
    )
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
    if (!res.ok || !res.profil) return res.erreur ?? t('ouvertureImpossible')
    ouvert(res.profil)
    return undefined
  }

  function demanderMotDePasse(profil: ProfilPublic): void {
    panneau().innerHTML = `
      <form class="profils-form" id="form-mdp">
        <label>${t('mdpDe', { nom: echapper(profil.nom) })}
          <input type="password" id="mdp" autocomplete="current-password" autofocus /></label>
        <div class="profils-form-boutons"><button class="btn-principal" type="submit">${t('ouvrir')}</button> <button type="button" id="annuler">${t('annuler')}</button></div>
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
  const champsMdp = (): string => `
    <label>${t('mdpFacultatif')}<input type="password" id="mdp1" autocomplete="new-password" /></label>
    <label>${t('confirmerMdp')}<input type="password" id="mdp2" autocomplete="new-password" /></label>`

  function lireMotDePasse(form: HTMLElement): { mdp?: string; erreur?: string } {
    const a = form.querySelector<HTMLInputElement>('#mdp1')!.value
    const b = form.querySelector<HTMLInputElement>('#mdp2')!.value
    if (a !== b) return { erreur: t('mdpDifferents') }
    return { mdp: a || undefined }
  }

  function formulaireNouveau(): void {
    panneau().innerHTML = `
      <form class="profils-form" id="form-nouveau">
        <label>${t('prenom')}<input type="text" id="nom" maxlength="40" autofocus /></label>
        <fieldset class="profils-machine"><legend>${t('taMachine')}</legend>
          <label><input type="radio" name="machine" value="atari" checked /> Atari ST</label>
          <label><input type="radio" name="machine" value="amiga" /> Amiga 500</label>
          <small>${t('machineAide')}</small>
        </fieldset>
        ${champsMdp()}
        <p class="profils-aide">${t('mdpAide')}</p>
        <div class="profils-form-boutons"><button class="btn-principal" type="submit">${t('creer')}</button> <button type="button" id="annuler">${t('annuler')}</button></div>
        <p class="profils-erreur" id="erreur"></p>
      </form>`
    const form = panneau().querySelector<HTMLFormElement>('#form-nouveau')!
    form.querySelector<HTMLInputElement>('#nom')!.focus()
    form.addEventListener('submit', (e) => {
      e.preventDefault()
      void (async () => {
        const erreurEl = form.querySelector('#erreur')!
        const nom = form.querySelector<HTMLInputElement>('#nom')!.value.trim()
        if (!nom) return void (erreurEl.textContent = t('choisisNom'))
        const { mdp, erreur } = lireMotDePasse(form)
        if (erreur) return void (erreurEl.textContent = erreur)
        const machine = form.querySelector<HTMLInputElement>('input[name="machine"]:checked')?.value === 'amiga' ? 'amiga' : 'atari'
        const res = await window.api.creerProfil(nom, mdp, { completedExerciseIds: [], machine })
        if (!res.ok || !res.profil) return void (erreurEl.textContent = res.erreur ?? t('creationImpossible'))
        const err = await ouvrir(res.profil.id, mdp)
        if (err) erreurEl.textContent = err
      })()
    })
    form.querySelector('#annuler')!.addEventListener('click', () => (panneau().innerHTML = ''))
  }

  function formulaireImport(): void {
    panneau().innerHTML = `
      <form class="profils-form" id="form-import">
        <p class="profils-aide">${t('importAide')}</p>
        ${champsMdp()}
        <div class="profils-form-boutons"><button class="btn-principal" type="submit">${t('choisirFichier')}</button> <button type="button" id="annuler">${t('annuler')}</button></div>
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
        await afficher(t('importe', { nom: res.profil?.nom ?? '' }))
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
        <p class="profils-aide">${t('tableauAide')}</p>
        <button id="fermer-tableau">${t('fermer')}</button>
      </div>`
    panneau().querySelector('#fermer-tableau')!.addEventListener('click', () => (panneau().innerHTML = ''))
  }

  function tableauParcours(parcours: Parcours, lignes: { profil: ProfilPublic; progression: ProgressState }[]): string {
    const chapitres = parcours.chapitres.filter((c) => !c.esquisse)
    // Titres lisibles des étapes, pour la colonne « Dernière étape »
    const titres = new Map<string, string>()
    parcours.chapitres.forEach((c, i) => {
      const ch = t('chapitreCourt', { n: i + 1 })
      for (const n of c.notions) for (const x of n.contenus) titres.set(x.id, `${ch} — ${x.titre}`)
      for (const b of c.bonus ?? []) titres.set(b.id, `${ch} — ★ ${b.titre}`)
      if (c.qcm) titres.set(c.qcm.id, `${ch} — ${t('qcm')}`)
    })
    const cellule = (pct: number): string =>
      `<td class="tab-pct" style="--pct:${pct}%"><span>${t('pourcentage', { pct })}</span></td>`
    return `
        <h3>${t('tableauTitre', { titre: echapper(parcours.titre) })}</h3>
        <table>
          <thead><tr><th>${t('colProfil')}</th><th>${t('colTotal')}</th>${chapitres.map((c) => `<th title="${echapper(c.titre)}">${t('chapitreCourt', { n: parcours.chapitres.indexOf(c) + 1 })}</th>`).join('')}<th>${t('colBonus')}</th><th>${t('colDerniere')}</th></tr></thead>
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
    await afficher(profils.length === 0 ? t('bienvenue') : '')
    if (profils.length === 0) formulaireNouveau()
  })()
}
