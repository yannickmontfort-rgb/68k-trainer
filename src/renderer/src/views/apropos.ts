import { chargerProgression, reinitialiserProgression } from '../progressionStore'

export function renderApropos(container: HTMLElement): () => void {
  container.innerHTML = `<div class="apropos-view"><p class="loading">Chargement…</p></div>`
  const root = container.querySelector('.apropos-view') as HTMLDivElement
  let disposed = false

  Promise.all([window.api.getBuildInfo(), chargerProgression()]).then(([info]) => {
    if (disposed) return
    root.innerHTML = `
      <div class="apropos-card">
        <h2>68k Trainer</h2>
        <p class="apropos-version">Version ${info.version} — ${info.year}</p>
        <p class="apropos-authors">Développé par Yannick Montfort avec Claude (Anthropic)</p>
        ${info.builtAt ? `<p class="apropos-built">Compilé le ${new Date(info.builtAt).toLocaleString('fr-FR')}</p>` : '<p class="apropos-built">Version de développement</p>'}
        <h3>Sous le capot</h3>
        <p class="apropos-texte">Assembleur <strong>vasm</strong> (Volker Barthelmann, Frank Wille), syntaxe Motorola compatible Devpac.
        Émulateur 68000 et TOS simulé écrits pour 68k Trainer.</p>
        <h3>Sources des cours</h3>
        <p class="apropos-texte">Cours reformulés à partir du cours d'assembleur 68000 sur Atari ST du Féroce Lapin, du cours
        d'initiation à l'assembleur 68000 de David Bouchet (EPITA), du polycopié de Philippe Meyne (IUT d'Évry),
        du manuel Motorola M68000PRM et d'un manuel de synthèse Atari ST (vérifié et corrigé).</p>
        <h3>Ma progression</h3>
        <p class="apropos-texte">Ta progression est enregistrée sur cet ordinateur uniquement.</p>
        <button id="btn-reset-progression" class="btn-danger">Remettre ma progression à zéro</button>
        <span id="reset-ok" class="apropos-texte"></span>
      </div>
    `
    root.querySelector('#btn-reset-progression')!.addEventListener('click', () => {
      if (!confirm('Effacer toute ta progression (cours lus, exercices réussis, QCM) ? Cette action est définitive.')) return
      reinitialiserProgression()
      root.querySelector('#reset-ok')!.textContent = ' Progression effacée.'
    })
  })

  return () => {
    disposed = true
  }
}
