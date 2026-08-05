export function renderApropos(container: HTMLElement): () => void {
  container.innerHTML = `<div class="apropos-view"><p class="loading">Chargement…</p></div>`
  const root = container.querySelector('.apropos-view') as HTMLDivElement
  let disposed = false

  window.api.getBuildInfo().then((info) => {
    if (disposed) return
    root.innerHTML = `
      <div class="apropos-card">
        <h2>68k-trainer</h2>
        <p class="apropos-version">Version ${info.version} — ${info.year}</p>
        <p class="apropos-authors">Développé par Yannick Montfort avec Claude (Anthropic)</p>
        ${info.builtAt ? `<p class="apropos-built">Compilé le ${new Date(info.builtAt).toLocaleString('fr-FR')}</p>` : '<p class="apropos-built">Version de développement</p>'}
      </div>
    `
  })

  return () => {
    disposed = true
  }
}
