import { marked } from 'marked'
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'

/** Rend du Markdown dans `el` et colore les blocs de code 68000 avec le langage de l'éditeur. */
export function renderMarkdown(el: HTMLElement, markdown: string): void {
  el.innerHTML = marked.parse(markdown) as string
  el.querySelectorAll<HTMLElement>('pre code').forEach((code) => colorer(code))
}

/** Colore un élément contenant du code 68000 (syntaxe Devpac). */
export function colorer(code: HTMLElement): void {
  code.setAttribute('data-lang', 'm68k')
  void monaco.editor.colorizeElement(code, { theme: 'm68k-dark' } as monaco.editor.IColorizerElementOptions)
}

export function echapper(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** Bloc de code coloré, en lecture seule, à partir d'un source. */
export function blocCode(source: string): HTMLPreElement {
  const pre = document.createElement('pre')
  pre.className = 'bloc-code'
  const code = document.createElement('code')
  code.textContent = source
  pre.appendChild(code)
  colorer(code)
  return pre
}
