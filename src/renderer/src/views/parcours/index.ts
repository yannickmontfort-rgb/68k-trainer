import type { ProgressState } from '../../../../shared/ipc'
import type { Chapitre, Contenu, ContenuExercice, Parcours } from '../../../../shared/parcours'
import {
  contenuTermine,
  detailChapitre,
  detailParcours,
  etapesDuParcours,
  etatNotion,
  premiereEtapeAFaire,
  qcmReussi,
  type Etape
} from '../../../../shared/progression'
import { getContent } from '../../content'
import { chargerProgression, machineActive, memoriserPosition } from '../../progressionStore'
import { echapper } from './markdown'
import { htmlCertificat } from '../../../../shared/certificat'
import { profilActif } from '../../profilActif'
import { traducteur } from '../../langue'
import {
  ecranChapitre,
  ecranCours,
  ecranExemple,
  ecranExercice,
  ecranPrediction,
  ecranQcm,
  type ContexteEcran
} from './ecrans'

const t = traducteur({
  fr: {
    chargement: 'Chargement du parcours…',
    aucunParcours: 'Aucun parcours trouvé dans content/parcours/.',
    qcmReprise: 'QCM — {titre}',
    duParcours: 'du parcours',
    chapitresTermines: '{faits}/{total} chapitres terminés',
    bonusTitre: 'Les défis bonus ne comptent pas dans le pourcentage',
    defisBonus: '★ Défis bonus : {faits}/{total}',
    certificatTitre: 'Un PDF à imprimer : nom, date, chapitres validés',
    monCertificat: 'Mon certificat',
    attestation: 'Attestation de progression',
    commencer: 'Commencer',
    reprendre: 'Reprendre',
    continuer: 'Continuer',
    repriseBouton: '{action} : {titre}',
    parcoursTermine: 'Parcours terminé, bravo ! 🎉',
    finAmiga: 'Tu sais maintenant programmer l’Amiga en assembleur : système, Copper, Blitter, sprites, Paula, et de vrais exécutables.',
    finAtari: 'Tu sais maintenant programmer le ST en assembleur : écran, animation, clavier, joystick, son, et de vrais .PRG.',
    resteBonus1: 'Il reste {n} défi bonus à relever, et le bac à sable t\'attend pour tes propres démos.',
    resteBonusN: 'Il reste {n} défis bonus à relever, et le bac à sable t\'attend pour tes propres démos.',
    apprenant: 'Apprenant',
    nomPdf: 'Certificat 68k Trainer - {nom}',
    bientot: '(bientôt)',
    qcmFin: 'QCM de fin de chapitre',
    cours: 'Cours',
    exemples: 'Exemples',
    predictions: 'Prédictions',
    exercices: 'Exercices',
    qcm: 'QCM'
  },
  en: {
    chargement: 'Loading the course…',
    aucunParcours: 'No course found in content/parcours/.',
    qcmReprise: 'Quiz — {titre}',
    duParcours: 'of the course',
    chapitresTermines: '{faits}/{total} chapters completed',
    bonusTitre: 'Bonus challenges do not count towards the percentage',
    defisBonus: '★ Bonus challenges: {faits}/{total}',
    certificatTitre: 'A PDF to print: name, date, completed chapters',
    monCertificat: 'My certificate',
    attestation: 'Progress report',
    commencer: 'Start',
    reprendre: 'Resume',
    continuer: 'Continue',
    repriseBouton: '{action}: {titre}',
    parcoursTermine: 'Course completed, well done 🎉',
    finAmiga: 'You can now program the Amiga in assembly: the system, Copper, Blitter, sprites, Paula, and real executables.',
    finAtari: 'You can now program the ST in assembly: screen, animation, keyboard, joystick, sound, and real .PRG files.',
    resteBonus1: '{n} bonus challenge is still waiting for you, and the sandbox is there for your own demos.',
    resteBonusN: '{n} bonus challenges are still waiting for you, and the sandbox is there for your own demos.',
    apprenant: 'Learner',
    nomPdf: '68k Trainer certificate - {nom}',
    bientot: '(coming soon)',
    qcmFin: 'End-of-chapter quiz',
    cours: 'Lessons',
    exemples: 'Examples',
    predictions: 'Predictions',
    exercices: 'Exercises',
    qcm: 'Quiz'
  }
})

const ICONES: Record<string, string> = {
  cours: '📖',
  exemple: '🧪',
  exercice: '✏️',
  prediction: '🔮',
  qcm: '❓',
  bonus: '★'
}

function barre(pourcentage: number, classe = ''): string {
  return `<div class="barre ${classe}" role="progressbar" aria-valuenow="${pourcentage}" aria-valuemin="0" aria-valuemax="100"><div class="barre-remplie" style="width:${pourcentage}%"></div></div>`
}

/** Vue « Parcours » : barre de progression, sommaire latéral et écrans pédagogiques. */
export function renderParcours(container: HTMLElement): () => void {
  container.innerHTML = `<div class="parcours-view"><p class="loading">${t('chargement')}</p></div>`
  const root = container.querySelector<HTMLDivElement>('.parcours-view')!
  let disposed = false
  let nettoyerEcran: (() => void) | null = null

  Promise.all([getContent(), chargerProgression()]).then(([content, progression]) => {
    if (disposed) return
    // Le parcours de la machine choisie dans le profil
    const actifs = content.parcours.filter((x) => x.statut === 'actif')
    const parcours: Parcours | undefined = actifs.find((x) => x.plateforme === machineActive()) ?? actifs[0] ?? content.parcours[0]
    if (!parcours) {
      root.innerHTML = `<p class="loading">${t('aucunParcours')}</p>`
      return
    }
    const p: ProgressState = progression
    const etapes = etapesDuParcours(parcours)
    let chapitreOuvert = parcours.chapitres[0]?.id
    let etapeCourante: string | null = null // null = accueil du chapitre ouvert
    const chapitresDeplies = new Set<string>()

    root.innerHTML = `
      <header class="parcours-entete" id="entete"></header>
      <div class="parcours-corps">
        <aside class="sommaire" id="sommaire"></aside>
        <main class="parcours-contenu">
          <div class="chapitre-bandeau" id="bandeau"></div>
          <div id="ecran"></div>
          <nav class="parcours-nav" id="nav"></nav>
        </main>
      </div>`
    const enteteEl = root.querySelector<HTMLElement>('#entete')!
    const sommaireEl = root.querySelector<HTMLElement>('#sommaire')!
    const bandeauEl = root.querySelector<HTMLElement>('#bandeau')!
    const ecranEl = root.querySelector<HTMLElement>('#ecran')!
    const navEl = root.querySelector<HTMLElement>('#nav')!

    const chapitre = (id: string | undefined): Chapitre | undefined => parcours.chapitres.find((c) => c.id === id)

    function trouver(id: string): { chapitre: Chapitre; contenu?: Contenu; genre: Etape['genre'] } | undefined {
      for (const ch of parcours!.chapitres) {
        for (const n of ch.notions) {
          const c = n.contenus.find((x) => x.id === id)
          if (c) return { chapitre: ch, contenu: c, genre: c.type }
        }
        if (ch.qcm?.id === id) return { chapitre: ch, genre: 'qcm' }
        const b = ch.bonus?.find((x) => x.id === id)
        if (b) return { chapitre: ch, contenu: b, genre: 'bonus' }
      }
      return undefined
    }

    function etapeFaite(id: string): boolean {
      const t = trouver(id)
      if (!t) return false
      if (t.genre === 'qcm') return qcmReussi(t.chapitre, p)
      return t.contenu ? contenuTermine(t.contenu, p) : false
    }

    /** Dernière étape visitée ; si elle est déjà faite, la prochaine étape obligatoire non faite. */
    function etapeDeReprise(): string | undefined {
      const derniere = p.positions?.[parcours!.id]?.etapeId
      if (derniere && trouver(derniere) && !etapeFaite(derniere)) return derniere
      if (derniere) {
        const index = etapes.findIndex((e) => e.id === derniere)
        const suivante = etapes.slice(index + 1).find((e) => e.genre !== 'bonus' && !etapeFaite(e.id))
        if (suivante) return suivante.id
      }
      return premiereEtapeAFaire(parcours!, p)?.id
    }

    function renderEntete(): void {
      const d = detailParcours(parcours!, p)
      const reprise = etapeDeReprise()
      const position = p.positions?.[parcours!.id]
      const repriseInfo = reprise ? trouver(reprise) : undefined
      const titreReprise =
        repriseInfo?.contenu?.titre ?? (repriseInfo?.genre === 'qcm' ? t('qcmReprise', { titre: repriseInfo.chapitre.titre }) : '')
      enteteEl.innerHTML = `
        <div class="entete-titre">
          <h1>${echapper(parcours!.titre)}</h1>
          <p>${echapper(parcours!.description)}</p>
        </div>
        <div class="entete-progression">
          <div class="entete-chiffres"><strong>${d.pourcentage} %</strong> ${t('duParcours')} · ${t('chapitresTermines', { faits: d.chapitresTermines, total: d.chapitresTotal })}</div>
          ${barre(d.pourcentage, 'barre-globale')}
          <div class="entete-bonus" title="${t('bonusTitre')}">${t('defisBonus', { faits: d.bonusFaits, total: d.bonusTotal })}</div>
          ${d.chapitresTermines > 0 ? `<button class="btn-certificat" id="btn-certificat" title="${t('certificatTitre')}">📜 ${d.chapitresTermines === d.chapitresTotal ? t('monCertificat') : t('attestation')}</button>` : ''}
        </div>
        ${
          reprise
            ? `<button class="btn-principal btn-reprendre" id="btn-reprendre" title="${echapper(titreReprise)}">${t('repriseBouton', {
                action: !position ? t('commencer') : reprise === position.etapeId ? t('reprendre') : t('continuer'),
                titre: echapper(titreReprise)
              })}</button>`
            : `<div class="parcours-fini"><strong>${t('parcoursTermine')}</strong><br>${
              parcours!.plateforme === 'amiga' ? t('finAmiga') : t('finAtari')
            } ${t(d.bonusTotal - d.bonusFaits > 1 ? 'resteBonusN' : 'resteBonus1', { n: d.bonusTotal - d.bonusFaits })}</div>`
        }
      `
      enteteEl.querySelector('#btn-reprendre')?.addEventListener('click', () => reprise && ouvrir(reprise))
      enteteEl.querySelector('#btn-certificat')?.addEventListener('click', () => {
        void window.api.getBuildInfo().then((info) => {
          const nom = profilActif()?.nom ?? t('apprenant')
          const html = htmlCertificat(parcours!, p, { nom, version: info.version })
          return window.api.exporterPdf(html, t('nomPdf', { nom }))
        })
      })
    }

    function ligneContenu(c: Contenu | ContenuExercice, genre: string): string {
      const fait = contenuTermine(c, p)
      const actif = c.id === etapeCourante
      return `<button class="sommaire-etape${actif ? ' actif' : ''}${fait ? ' fait' : ''}${genre === 'bonus' ? ' bonus' : ''}" data-etape="${c.id}">
        <span class="icone">${ICONES[genre]}</span><span class="titre">${echapper(c.titre)}</span><span class="coche">${fait ? '✓' : ''}</span></button>`
    }

    function renderSommaire(): void {
      const icone = { 'non-commencee': '○', 'en-cours': '◐', terminee: '●' }
      sommaireEl.innerHTML = parcours!.chapitres
        .map((ch, i) => {
          const d = detailChapitre(ch, p)
          const deplie = chapitresDeplies.has(ch.id) || ch.id === chapitreOuvert
          return `
          <div class="sommaire-chapitre${ch.id === chapitreOuvert ? ' ouvert' : ''}${d.termine ? ' termine' : ''}">
            <button class="sommaire-chapitre-titre${ch.id === chapitreOuvert && etapeCourante === null ? ' actif' : ''}" data-chapitre="${ch.id}">
              <span class="num">${i + 1}</span>
              <span class="titre">${echapper(ch.titre)}${ch.esquisse ? ` <small>${t('bientot')}</small>` : ''}</span>
              <span class="pct">${d.total ? d.pourcentage + ' %' : ''}</span>
            </button>
            ${d.total ? barre(d.pourcentage, 'barre-mini') : ''}
            ${
              deplie
                ? `<div class="sommaire-notions">
                ${ch.notions
                  .map(
                    (n) => `<div class="sommaire-notion"><div class="notion-titre"><span class="etat-notion">${icone[etatNotion(n, p)]}</span>${echapper(n.titre)}</div>
                      ${n.contenus.map((c) => ligneContenu(c, c.type)).join('')}</div>`
                  )
                  .join('')}
                ${
                  ch.qcm
                    ? `<button class="sommaire-etape${ch.qcm.id === etapeCourante ? ' actif' : ''}${qcmReussi(ch, p) ? ' fait' : ''}" data-etape="${ch.qcm.id}"><span class="icone">❓</span><span class="titre">${t('qcmFin')}</span><span class="coche">${qcmReussi(ch, p) ? '✓' : ''}</span></button>`
                    : ''
                }
                ${(ch.bonus ?? []).map((b) => ligneContenu(b, 'bonus')).join('')}
              </div>`
                : ''
            }
          </div>`
        })
        .join('')
      sommaireEl.querySelectorAll<HTMLButtonElement>('[data-chapitre]').forEach((btn) =>
        btn.addEventListener('click', () => {
          const id = btn.dataset.chapitre!
          if (id === chapitreOuvert && etapeCourante === null) {
            chapitresDeplies.has(id) ? chapitresDeplies.delete(id) : chapitresDeplies.add(id)
            renderSommaire()
            return
          }
          ouvrirChapitre(id)
        })
      )
      sommaireEl.querySelectorAll<HTMLButtonElement>('[data-etape]').forEach((btn) =>
        btn.addEventListener('click', () => ouvrir(btn.dataset.etape!))
      )
      sommaireEl.querySelector('.actif')?.scrollIntoView({ block: 'nearest' })
    }

    function renderBandeau(): void {
      const ch = chapitre(chapitreOuvert)
      if (!ch) return
      const d = detailChapitre(ch, p)
      const morceau = (label: string, v: { faits: number; total: number }): string =>
        v.total ? `<span class="${v.faits === v.total ? 'ok' : ''}">${label} ${v.faits === v.total ? '✓' : `${v.faits}/${v.total}`}</span>` : ''
      bandeauEl.innerHTML = `
        <div class="bandeau-titre">${echapper(ch.titre)}</div>
        <div class="bandeau-detail">
          ${morceau(t('cours'), d.cours)}
          ${morceau(t('exemples'), d.exemples)}
          ${morceau(t('predictions'), d.predictions)}
          ${morceau(t('exercices'), d.exercices)}
          ${d.qcm.present ? `<span class="${d.qcm.reussi ? 'ok' : ''}">${t('qcm')} ${d.qcm.reussi ? '✓' : d.qcm.meilleurScore !== undefined ? `${d.qcm.meilleurScore}/${ch.qcm!.questions.length}` : '—'}</span>` : ''}
          ${d.bonus.total ? `<span class="bonus">★ ${d.bonus.faits}/${d.bonus.total}</span>` : ''}
        </div>
        ${d.total ? barre(d.pourcentage, 'barre-chapitre') : ''}`
    }

    function rafraichirProgression(): void {
      renderEntete()
      renderSommaire()
      renderBandeau()
    }

    function renderNav(): void {
      const index = etapeCourante ? etapes.findIndex((e) => e.id === etapeCourante) : -1
      const prev = index > 0 ? etapes[index - 1] : undefined
      const next = etapeCourante === null ? etapes.find((e) => e.chapitreId === chapitreOuvert) : etapes[index + 1]
      const libelle = (e: Etape): string => {
        const info = trouver(e.id)
        return info?.contenu?.titre ?? (info?.genre === 'qcm' ? t('qcm') : '')

      }
      navEl.innerHTML = `
        ${prev ? `<button id="nav-prev">← ${echapper(libelle(prev))}</button>` : '<span></span>'}
        ${next ? `<button id="nav-next">${echapper(libelle(next))} →</button>` : ''}`
      navEl.querySelector('#nav-prev')?.addEventListener('click', () => prev && ouvrir(prev.id))
      navEl.querySelector('#nav-next')?.addEventListener('click', () => next && ouvrir(next.id))
    }

    function suivant(): void {
      const index = etapeCourante ? etapes.findIndex((e) => e.id === etapeCourante) : -1
      const next = etapeCourante === null ? etapes.find((e) => e.chapitreId === chapitreOuvert) : etapes[index + 1]
      if (next) {
        // En changeant de chapitre, passer par son accueil
        if (next.chapitreId !== chapitreOuvert) ouvrirChapitre(next.chapitreId)
        else ouvrir(next.id)
      }
    }

    const ctx: ContexteEcran = {
      plateforme: parcours.plateforme,
      progression: p,
      progressionChangee: rafraichirProgression,
      suivant,
      ouvrir: (id) => ouvrir(id)
    }

    function monter(render: (el: HTMLElement) => () => void): void {
      nettoyerEcran?.()
      ecranEl.innerHTML = ''
      const el = document.createElement('div')
      ecranEl.appendChild(el)
      nettoyerEcran = render(el)
      root.querySelector('.parcours-contenu')?.scrollTo({ top: 0 })
    }

    function ouvrirChapitre(id: string): void {
      const ch = chapitre(id)
      if (!ch) return
      chapitreOuvert = id
      etapeCourante = null
      monter((el) => ecranChapitre(el, ch, ctx))
      rafraichirProgression()
      renderNav()
    }

    function ouvrir(id: string): void {
      const t = trouver(id)
      if (!t) return
      chapitreOuvert = t.chapitre.id
      etapeCourante = id
      memoriserPosition(parcours!.id, t.chapitre.id, id)
      const c = t.contenu
      monter((el) => {
        if (t.genre === 'qcm') return ecranQcm(el, t.chapitre, ctx)
        if (!c) return () => {}
        switch (c.type) {
          case 'cours':
            return ecranCours(el, c, ctx)
          case 'exemple':
            return ecranExemple(el, c, ctx)
          case 'prediction':
            return ecranPrediction(el, c, ctx)
          case 'exercice':
            return ecranExercice(el, c, ctx)
        }
      })
      rafraichirProgression()
      renderNav()
    }

    // À l'ouverture : reprendre là où on s'était arrêté
    const reprise = p.positions?.[parcours.id]?.etapeId
    if (reprise && trouver(reprise)) ouvrir(reprise)
    else ouvrirChapitre(chapitreOuvert!)
  })

  return () => {
    disposed = true
    nettoyerEcran?.()
  }
}
