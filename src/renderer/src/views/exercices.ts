import { marked } from 'marked'
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'
import { getContent } from '../content'
import { checkExercise } from '../checker'
import type { Exercise, ExerciseLevel } from '../../../shared/ipc'
import { chargerProgression, marquerExerciceReussi } from '../progressionStore'
import { exercicesParChapitre, parcoursDeLaMachine, pisteDeLaMachine } from '../contenuParcours'
import { ecranExercice, type ContexteEcran } from './parcours/ecrans'
import { echapper } from './parcours/markdown'

/** Onglet des exercices du parcours (avant les pistes d'exercices de la version 0.1). */
const PARCOURS = 'parcours'

/**
 * Exercices libres : tous les exercices du parcours de la machine choisie (défis bonus compris),
 * à refaire dans l'ordre qu'on veut, puis les exercices de la version 0.1 (communs au 68000 et
 * propres à la machine). Un exercice du parcours réussi ici compte aussi dans le parcours.
 */
export function renderExercices(container: HTMLElement): () => void {
  container.innerHTML = `<div class="exercices-view"><p class="loading">Chargement du contenu…</p></div>`
  const root = container.querySelector('.exercices-view') as HTMLDivElement

  let disposed = false
  let editor: monaco.editor.IStandaloneCodeEditor | null = null
  let nettoyerEcran: (() => void) | null = null
  let currentTrack = PARCOURS
  let currentExerciseId: string | null = null
  let hintsShown = 0

  Promise.all([getContent(), chargerProgression()]).then(([content, progress]) => {
    if (disposed) return
    const completed = new Set(progress.completedExerciseIds)
    const parcours = parcoursDeLaMachine(content)
    const groupes = parcours ? exercicesParChapitre(parcours) : []
    const exercicesParcours = groupes.flatMap((g) => g.elements)
    const pistes = content.tracks.filter((t) => t.id === 'general' || t.id === pisteDeLaMachine())

    // L'écran d'exercice du parcours, avec « Suivant » vers l'exercice suivant de la liste
    const ctx: ContexteEcran = {
      plateforme: parcours?.plateforme ?? 'atari',
      progression: progress,
      progressionChangee: () => {
        for (const id of progress.completedExerciseIds) completed.add(id)
        marquerListe()
      },
      suivant: () => {
        const i = exercicesParcours.findIndex((e) => e.id === currentExerciseId)
        const next = exercicesParcours[i + 1]
        if (next) {
          currentExerciseId = next.id
          renderLayout()
        }
      },
      ouvrir: () => {}
    }

    function findExercise(id: string): Exercise | undefined {
      for (const level of content.exercises[currentTrack] ?? []) {
        const found = level.exercises.find((e) => e.id === id)
        if (found) return found
      }
      return undefined
    }

    function firstExerciseId(): string | null {
      if (currentTrack === PARCOURS) return exercicesParcours[0]?.id ?? null
      return content.exercises[currentTrack]?.[0]?.exercises?.[0]?.id ?? null
    }

    const bouton = (id: string, titre: string, bonus = false): string => `
      <button class="cours-item${id === currentExerciseId ? ' active' : ''}" data-id="${id}">
        <span class="marque-reussi">${completed.has(id) ? '✓ ' : ''}</span>${bonus ? '★ ' : ''}${titre}
      </button>`

    /** Met à jour les ✓ de la liste sans la reconstruire (l'exercice ouvert reste tel quel). */
    function marquerListe(): void {
      root.querySelectorAll<HTMLButtonElement>('.cours-item').forEach((btn) => {
        const m = btn.querySelector('.marque-reussi')
        if (m) m.textContent = completed.has(btn.dataset.id!) ? '✓ ' : ''
      })
    }

    function renderLayout(): void {
      nettoyerEcran?.()
      nettoyerEcran = null
      editor?.dispose()
      editor = null
      const track = pistes.find((t) => t.id === currentTrack)
      const levels = content.exercises[currentTrack] ?? []
      const description =
        currentTrack === PARCOURS
          ? `Tous les exercices du parcours « ${parcours?.titre ?? ''} », défis bonus compris, dans l'ordre que tu veux. Un exercice réussi ici compte aussi dans le parcours.`
          : (track?.description ?? '')
      const liste =
        currentTrack === PARCOURS
          ? groupes
              .map(
                (g) => `
                  <div class="exercice-level-group">
                    <div class="exercice-level-title">${echapper(g.chapitre.titre)}</div>
                    ${g.elements.map((ex) => bouton(ex.id, echapper(ex.titre), ex.bonus)).join('')}
                  </div>`
              )
              .join('') + (groupes.length === 0 ? "<p>Pas encore d'exercices dans ce parcours.</p>" : '')
          : levels
              .map(
                (level: ExerciseLevel) => `
                  <div class="exercice-level-group">
                    <div class="exercice-level-title">Niveau ${level.level} — ${level.title}</div>
                    ${level.exercises.map((ex) => bouton(ex.id, ex.title)).join('')}
                  </div>`
              )
              .join('') + (levels.length === 0 ? "<p>Pas encore d'exercices pour ce parcours.</p>" : '')

      root.innerHTML = `
        <div class="cours-tracks">
          <button class="track-tab${currentTrack === PARCOURS ? ' active' : ''}" data-track="${PARCOURS}">Exercices du parcours</button>
          ${pistes
            .map(
              (t) =>
                `<button class="track-tab${t.id === currentTrack ? ' active' : ''}" data-track="${t.id}">Version 0.1 : ${t.title}</button>`
            )
            .join('')}
        </div>
        <p class="track-description">${description}</p>
        <div class="cours-body">
          <div class="cours-list">${liste}</div>
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
      if (currentTrack === PARCOURS) {
        const ex = exercicesParcours.find((e) => e.id === currentExerciseId)
        if (!ex) {
          detail.innerHTML = '<p>Choisis un exercice dans la liste.</p>'
          return
        }
        nettoyerEcran?.()
        nettoyerEcran = ecranExercice(detail, ex, ctx)
        return
      }
      const exercise = currentExerciseId ? findExercise(currentExerciseId) : undefined
      if (!exercise) {
        detail.innerHTML = '<p>Choisis un exercice dans la liste.</p>'
        return
      }
      editor?.dispose()
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
    nettoyerEcran?.()
    editor?.dispose()
  }
}
