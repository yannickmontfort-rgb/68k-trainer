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
import { chargerProgression, memoriserPosition } from '../../progressionStore'
import { echapper } from './markdown'
import {
  ecranChapitre,
  ecranCours,
  ecranExemple,
  ecranExercice,
  ecranPrediction,
  ecranQcm,
  type ContexteEcran
} from './ecrans'

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
  container.innerHTML = '<div class="parcours-view"><p class="loading">Chargement du parcours…</p></div>'
  const root = container.querySelector<HTMLDivElement>('.parcours-view')!
  let disposed = false
  let nettoyerEcran: (() => void) | null = null

  Promise.all([getContent(), chargerProgression()]).then(([content, progression]) => {
    if (disposed) return
    const parcours: Parcours | undefined = content.parcours.find((p) => p.statut === 'actif') ?? content.parcours[0]
    if (!parcours) {
      root.innerHTML = '<p class="loading">Aucun parcours trouvé dans content/parcours/.</p>'
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

    function etapeDeReprise(): string | undefined {
      if (p.derniere?.parcoursId === parcours!.id && trouver(p.derniere.etapeId)) return p.derniere.etapeId
      return premiereEtapeAFaire(parcours!, p)?.id
    }

    function renderEntete(): void {
      const d = detailParcours(parcours!, p)
      const reprise = etapeDeReprise()
      const repriseInfo = reprise ? trouver(reprise) : undefined
      const titreReprise =
        repriseInfo?.contenu?.titre ?? (repriseInfo?.genre === 'qcm' ? `QCM — ${repriseInfo.chapitre.titre}` : '')
      enteteEl.innerHTML = `
        <div class="entete-titre">
          <h1>${echapper(parcours!.titre)}</h1>
          <p>${echapper(parcours!.description)}</p>
        </div>
        <div class="entete-progression">
          <div class="entete-chiffres"><strong>${d.pourcentage} %</strong> du parcours · ${d.chapitresTermines}/${d.chapitresTotal} chapitres terminés</div>
          ${barre(d.pourcentage, 'barre-globale')}
          <div class="entete-bonus" title="Les défis bonus ne comptent pas dans le pourcentage">★ Défis bonus : ${d.bonusFaits}/${d.bonusTotal}</div>
        </div>
        ${reprise ? `<button class="btn-principal btn-reprendre" id="btn-reprendre" title="${echapper(titreReprise)}">${p.derniere ? 'Reprendre' : 'Commencer'} : ${echapper(titreReprise)}</button>` : '<div class="parcours-fini">Parcours terminé, bravo ! 🎉</div>'}
      `
      enteteEl.querySelector('#btn-reprendre')?.addEventListener('click', () => reprise && ouvrir(reprise))
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
              <span class="titre">${echapper(ch.titre)}${ch.esquisse ? ' <small>(bientôt)</small>' : ''}</span>
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
                    ? `<button class="sommaire-etape${ch.qcm.id === etapeCourante ? ' actif' : ''}${qcmReussi(ch, p) ? ' fait' : ''}" data-etape="${ch.qcm.id}"><span class="icone">❓</span><span class="titre">QCM de fin de chapitre</span><span class="coche">${qcmReussi(ch, p) ? '✓' : ''}</span></button>`
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
          ${morceau('Cours', d.cours)}
          ${morceau('Exemples', d.exemples)}
          ${morceau('Prédictions', d.predictions)}
          ${morceau('Exercices', d.exercices)}
          ${d.qcm.present ? `<span class="${d.qcm.reussi ? 'ok' : ''}">QCM ${d.qcm.reussi ? '✓' : d.qcm.meilleurScore !== undefined ? `${d.qcm.meilleurScore}/${ch.qcm!.questions.length}` : '—'}</span>` : ''}
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
        const t = trouver(e.id)
        return t?.contenu?.titre ?? (t?.genre === 'qcm' ? 'QCM' : '')
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
    const reprise = p.derniere?.parcoursId === parcours.id ? p.derniere.etapeId : undefined
    if (reprise && trouver(reprise)) ouvrir(reprise)
    else ouvrirChapitre(chapitreOuvert!)
  })

  return () => {
    disposed = true
    nettoyerEcran?.()
  }
}
