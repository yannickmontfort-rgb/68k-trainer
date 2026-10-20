import { marked } from 'marked'
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'
import { getContent } from '../content'
import { checkExercise } from '../checker'
import type { Exercise, ExerciseLevel } from '../../../shared/ipc'
import { chargerProgression, marquerExerciceReussi } from '../progressionStore'

export function renderExercices(container: HTMLElement): () => void {
  container.innerHTML = `<div class="exercices-view"><p class="loading">Chargement du contenu…</p></div>`
  const root = container.querySelector('.exercices-view') as HTMLDivElement

  let disposed = false
  let editor: monaco.editor.IStandaloneCodeEditor | null = null
  let currentTrack = 'general'
  let currentExerciseId: string | null = null
  let hintsShown = 0

  Promise.all([getContent(), chargerProgression()]).then(([content, progress]) => {
    if (disposed) return
    const completed = new Set(progress.completedExerciseIds)

    function findExercise(id: string): Exercise | undefined {
      for (const level of content.exercises[currentTrack] ?? []) {
        const found = level.exercises.find((e) => e.id === id)
        if (found) return found
      }
      return undefined
    }

    function firstExerciseId(): string | null {
      return content.exercises[currentTrack]?.[0]?.exercises?.[0]?.id ?? null
    }

    function renderLayout(): void {
      editor?.dispose()
      editor = null
      const track = content.tracks.find((t) => t.id === currentTrack)
      const levels = content.exercises[currentTrack] ?? []

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
            ${levels
              .map(
                (level: ExerciseLevel) => `
                  <div class="exercice-level-group">
                    <div class="exercice-level-title">Niveau ${level.level} — ${level.title}</div>
                    ${level.exercises
                      .map(
                        (ex) => `
                          <button class="cours-item${ex.id === currentExerciseId ? ' active' : ''}" data-id="${ex.id}">
                            ${completed.has(ex.id) ? '✓ ' : ''}${ex.title}
                          </button>`
                      )
                      .join('')}
                  </div>`
              )
              .join('')}
            ${levels.length === 0 ? '<p>Pas encore d\'exercices pour ce parcours.</p>' : ''}
          </div>
          <div class="exercice-detail" id="exercice-detail"></div>
        </div>
      `

      root.querySelectorAll<HTMLButtonElement>('.track-tab').forEach((btn) => {
        btn.addEventListener('click', () => {
          currentTrack = btn.dataset.track!
          currentExerciseId = firstExerciseId()
          hintsShown = 0
          renderLayout()
        })
      })
      root.querySelectorAll<HTMLButtonElement>('.cours-item').forEach((btn) => {
        btn.addEventListener('click', () => {
          currentExerciseId = btn.dataset.id!
          hintsShown = 0
          renderLayout()
        })
      })

      renderDetail()
    }

    function renderDetail(): void {
      const detail = root.querySelector('#exercice-detail') as HTMLDivElement
      const exercise = currentExerciseId ? findExercise(currentExerciseId) : undefined
      if (!exercise) {
        detail.innerHTML = '<p>Choisis un exercice dans la liste.</p>'
        return
      }
      detail.innerHTML = `
        <h2>${exercise.title}${completed.has(exercise.id) ? ' <span class="badge-done">terminé</span>' : ''}</h2>
        <div class="markdown-body exercice-statement">${marked.parse(exercise.statement) as string}</div>
        <div class="exercice-hints">
          <button id="btn-hint">Indice (${Math.min(hintsShown, exercise.hints.length)}/${exercise.hints.length})</button>
          <ul id="hints-list">
            ${exercise.hints
              .slice(0, hintsShown)
              .map((h) => `<li>${h}</li>`)
              .join('')}
          </ul>
        </div>
        <div id="exercice-editor"></div>
        <div class="exercice-actions">
          <button id="btn-verify">Vérifier</button>
          <span id="verify-result"></span>
        </div>
      `

      const editorEl = detail.querySelector('#exercice-editor') as HTMLDivElement
      editor = monaco.editor.create(editorEl, {
        value: exercise.starterCode,
        language: 'm68k',
        theme: 'm68k-dark',
        fontSize: 14,
        minimap: { enabled: false },
        // Menu du clic droit : celui de l'application (son « Coller » marche, pas celui de Monaco)
        contextmenu: false,
        automaticLayout: true
      })

      const btnHint = detail.querySelector('#btn-hint') as HTMLButtonElement
      btnHint.addEventListener('click', () => {
        if (hintsShown < exercise.hints.length) {
          hintsShown++
          renderDetail()
        }
      })

      const btnVerify = detail.querySelector('#btn-verify') as HTMLButtonElement
      const resultEl = detail.querySelector('#verify-result') as HTMLSpanElement
      btnVerify.addEventListener('click', () => {
        void (async () => {
          btnVerify.disabled = true
          resultEl.textContent = 'Vérification…'
          resultEl.className = ''
          try {
            const result = await checkExercise(editor!.getValue(), exercise, currentTrack)
            resultEl.textContent = result.message
            resultEl.className = result.success ? 'verify-ok' : 'verify-fail'
            if (result.success && !completed.has(exercise.id)) {
              completed.add(exercise.id)
              marquerExerciceReussi(exercise.id)
              renderLayout()
            }
          } finally {
            btnVerify.disabled = false
          }
        })()
      })
    }

    currentExerciseId = firstExerciseId()
    renderLayout()
  })

  return () => {
    disposed = true
    editor?.dispose()
  }
}
