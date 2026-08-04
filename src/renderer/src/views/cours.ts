import { marked } from 'marked'
import { getContent } from '../content'
import type { CourseFile } from '../../../shared/ipc'

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

export function renderCours(container: HTMLElement): () => void {
  container.innerHTML = `<div class="cours-view"><p class="loading">Chargement du contenu…</p></div>`
  const root = container.querySelector('.cours-view') as HTMLDivElement

  let disposed = false
  let currentTrack = 'general'
  let currentSlug: string | null = null

  getContent().then((content) => {
    if (disposed) return
    currentSlug = content.courses[currentTrack]?.[0]?.slug ?? null

    function renderLayout(): void {
      const track = content.tracks.find((t) => t.id === currentTrack)
      root.innerHTML = `
        <div class="cours-tracks">
          ${content.tracks
            .map(
              (t) =>
                `<button class="track-tab${t.id === currentTrack ? ' active' : ''}" data-track="${t.id}">${t.title}</button>`
            )
            .join('')}
        </div>
        <p class="track-description">${track?.description ?? ''}</p>
        <div class="cours-body">
          <div class="cours-list">
            ${(content.courses[currentTrack] ?? [])
              .map(
                (c) =>
                  `<button class="cours-item${c.slug === currentSlug ? ' active' : ''}" data-slug="${c.slug}">${c.title}</button>`
              )
              .join('')}
          </div>
          <div class="cours-content markdown-body" id="cours-markdown"></div>
        </div>
      `

      root.querySelectorAll<HTMLButtonElement>('.track-tab').forEach((btn) => {
        btn.addEventListener('click', () => {
          currentTrack = btn.dataset.track!
          currentSlug = content.courses[currentTrack]?.[0]?.slug ?? null
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

    function renderMarkdown(): void {
      const target = root.querySelector('#cours-markdown') as HTMLDivElement
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
