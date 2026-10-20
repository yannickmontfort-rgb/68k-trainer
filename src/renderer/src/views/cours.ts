import { marked } from 'marked'
import { getContent } from '../content'
import type { CourseFile } from '../../../shared/ipc'
import type { ContenuCours } from '../../../shared/parcours'
import { coursParChapitre, parcoursDeLaMachine, pisteDeLaMachine } from '../contenuParcours'
import { echapper, renderMarkdown as afficherMarkdown } from './parcours/markdown'

/** Onglet des cours du parcours (avant les pistes de fiches de la version 0.1). */
const PARCOURS = 'parcours'

function resolveCourseLink(href: string, currentTrack: string): { track: string; slug: string } | null {
  const withoutAnchor = href.split('#')[0]
  if (!withoutAnchor.endsWith('.md')) return null
  const parts = withoutAnchor.split('/')
  let track = currentTrack
  const fileIdx = parts.length - 1
  if (parts[0] === '..') {
    // ../<track>/<file>.md
    track = parts[1] ?? currentTrack
  }
  const filename = parts[fileIdx]
  return { track, slug: filename.replace(/\.md$/, '') }
}

/**
 * Fiches : les cours du parcours de la machine choisie, rangés par chapitre, puis les fiches de
 * référence de la version 0.1 (communes au 68000 et propres à la machine).
 */
export function renderCours(container: HTMLElement): () => void {
  container.innerHTML = `<div class="cours-view"><p class="loading">Chargement du contenu…</p></div>`
  const root = container.querySelector('.cours-view') as HTMLDivElement

  let disposed = false
  let currentTrack = PARCOURS
  let currentSlug: string | null = null

  getContent().then((content) => {
    if (disposed) return
    const parcours = parcoursDeLaMachine(content)
    const groupes = parcours ? coursParChapitre(parcours) : []
    const tousLesCours = groupes.flatMap((g) => g.elements)
    const pistes = content.tracks.filter((t) => t.id === 'general' || t.id === pisteDeLaMachine())
    const premier = (track: string): string | null =>
      track === PARCOURS ? (tousLesCours[0]?.id ?? null) : (content.courses[track]?.[0]?.slug ?? null)
    currentSlug = premier(currentTrack)

    function renderLayout(): void {
      const track = pistes.find((t) => t.id === currentTrack)
      const description =
        currentTrack === PARCOURS
          ? `Tous les cours du parcours « ${parcours?.titre ?? ''} », chapitre par chapitre, à relire quand tu veux.`
          : (track?.description ?? '')
      const liste =
        currentTrack === PARCOURS
          ? groupes
              .map(
                (g) => `
                  <div class="exercice-level-group">
                    <div class="exercice-level-title">${echapper(g.chapitre.titre)}</div>
                    ${g.elements
                      .map(
                        (c) =>
                          `<button class="cours-item${c.id === currentSlug ? ' active' : ''}" data-slug="${c.id}">${echapper(c.titre)}</button>`
                      )
                      .join('')}
                  </div>`
              )
              .join('')
          : (content.courses[currentTrack] ?? [])
              .map(
                (c) =>
                  `<button class="cours-item${c.slug === currentSlug ? ' active' : ''}" data-slug="${c.slug}">${c.title}</button>`
              )
              .join('')
      root.innerHTML = `
        <div class="cours-tracks">
          <button class="track-tab${currentTrack === PARCOURS ? ' active' : ''}" data-track="${PARCOURS}">Cours du parcours</button>
          ${pistes
            .map(
              (t) =>
                `<button class="track-tab${t.id === currentTrack ? ' active' : ''}" data-track="${t.id}">Fiches : ${t.title}</button>`
            )
            .join('')}
        </div>
        <p class="track-description">${description}</p>
        <div class="cours-body">
          <div class="cours-list">${liste}</div>
          <div class="cours-content markdown-body" id="cours-markdown"></div>
        </div>
      `

      root.querySelectorAll<HTMLButtonElement>('.track-tab').forEach((btn) => {
        btn.addEventListener('click', () => {
          currentTrack = btn.dataset.track!
          currentSlug = premier(currentTrack)
          renderLayout()
        })
      })
      root.querySelectorAll<HTMLButtonElement>('.cours-item').forEach((btn) => {
        btn.addEventListener('click', () => {
          currentSlug = btn.dataset.slug!
          renderLayout()
        })
      })
      renderMarkdown()
    }

    function renderCoursParcours(target: HTMLDivElement, cours: ContenuCours): void {
      const chapitre = groupes.find((g) => g.elements.includes(cours))?.chapitre
      target.innerHTML = `
        <p class="cours-source">${echapper(chapitre?.titre ?? '')}${cours.source ? ` — Source : ${echapper(cours.source)}` : ''}</p>
        <h2>${echapper(cours.titre)}</h2>
        <div class="cours-texte"></div>`
      afficherMarkdown(target.querySelector('.cours-texte')!, cours.markdown ?? '')
    }

    function renderMarkdown(): void {
      const target = root.querySelector('#cours-markdown') as HTMLDivElement
      if (currentTrack === PARCOURS) {
        const cours = tousLesCours.find((c) => c.id === currentSlug)
        if (cours) renderCoursParcours(target, cours)
        else target.innerHTML = '<p>Pas encore de cours dans ce parcours.</p>'
        return
      }
      const course = (content.courses[currentTrack] ?? []).find((c: CourseFile) => c.slug === currentSlug)
      if (!course) {
        target.innerHTML = '<p>Aucune fiche pour ce parcours pour le moment.</p>'
        return
      }
      const sourceLine = course.source ? `<p class="cours-source">Source : ${course.source}</p>` : ''
      target.innerHTML = sourceLine + (marked.parse(course.markdown) as string)
      target.querySelectorAll<HTMLAnchorElement>('a[href$=".md"], a[href*=".md#"]').forEach((a) => {
        const resolved = resolveCourseLink(a.getAttribute('href') ?? '', currentTrack)
        if (!resolved) return
        a.addEventListener('click', (ev) => {
          ev.preventDefault()
          currentTrack = resolved.track
          currentSlug = resolved.slug
          renderLayout()
        })
      })
    }

    renderLayout()
  })

  return () => {
    disposed = true
  }
}
