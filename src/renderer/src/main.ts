import './style.css'
import './monaco/workers'
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'
import { registerM68kLanguage } from './monaco/m68kLanguage'
import { Cpu } from '../../cpu/cpu'
import type { AssembleResult } from '../../shared/ipc'

registerM68kLanguage()

const DEFAULT_PROGRAM = `\tORG $1000
START:  MOVE.W  #5,D0
        MOVE.W  #10,D1
        ADD.W   D1,D0
        MOVE.W  D0,$3000
        MOVE.B  #9,D0
        TRAP    #15
`

const app = document.getElementById('app')!
app.innerHTML = `
  <div class="toolbar">
    <button id="btn-assemble">Assembler</button>
    <button id="btn-step" disabled>Pas</button>
    <button id="btn-run" disabled>Exécuter</button>
    <button id="btn-reset" disabled>Réinitialiser</button>
    <span class="status" id="status">Prêt</span>
  </div>
  <div class="main">
    <div id="editor"></div>
    <div class="sidebar">
      <div class="panel">
        <h3>Registres</h3>
        <div class="registers" id="registers"></div>
        <div class="flags" id="flags"></div>
      </div>
      <div class="panel">
        <h3>Mémoire</h3>
        <div class="memory-controls">
          <label>Adresse : $<input id="mem-address" value="1000" /></label>
        </div>
        <div class="memory" id="memory"></div>
      </div>
      <div class="panel">
        <h3>Console (TRAP #15)</h3>
        <div class="console-output" id="console"></div>
      </div>
    </div>
  </div>
  <div class="errors" id="errors"></div>
`

const editorEl = document.getElementById('editor') as HTMLDivElement
const editor = monaco.editor.create(editorEl, {
  value: DEFAULT_PROGRAM,
  language: 'm68k',
  theme: 'm68k-dark',
  fontSize: 14,
  minimap: { enabled: false },
  automaticLayout: true
})

const btnAssemble = document.getElementById('btn-assemble') as HTMLButtonElement
const btnStep = document.getElementById('btn-step') as HTMLButtonElement
const btnRun = document.getElementById('btn-run') as HTMLButtonElement
const btnReset = document.getElementById('btn-reset') as HTMLButtonElement
const statusEl = document.getElementById('status') as HTMLSpanElement
const registersEl = document.getElementById('registers') as HTMLDivElement
const flagsEl = document.getElementById('flags') as HTMLDivElement
const memoryEl = document.getElementById('memory') as HTMLDivElement
const memAddressInput = document.getElementById('mem-address') as HTMLInputElement
const consoleEl = document.getElementById('console') as HTMLDivElement
const errorsEl = document.getElementById('errors') as HTMLDivElement

const cpu = new Cpu()
let assembleResult: AssembleResult | null = null
let previousSnapshot = cpu.getSnapshot()
let currentLineDecorations: string[] = []
let running = false

function setErrors(messages: string[]): void {
  errorsEl.textContent = messages.join('\n')
  const markers: monaco.editor.IMarkerData[] = messages.length
    ? assembleResult?.errors?.map((e) => ({
        severity: monaco.MarkerSeverity.Error,
        message: e.message,
        startLineNumber: e.line,
        endLineNumber: e.line,
        startColumn: 1,
        endColumn: 1000
      })) ?? []
    : []
  monaco.editor.setModelMarkers(editor.getModel()!, 'vasm', markers)
}

function renderRegisters(): void {
  const snap = cpu.getSnapshot()
  const rows: string[] = []
  for (let i = 0; i < 8; i++) {
    const changed = snap.d[i] !== previousSnapshot.d[i]
    rows.push(
      `<div class="reg${changed ? ' changed' : ''}"><span class="name">D${i}</span><span class="value">${hex32(snap.d[i])}</span></div>`
    )
  }
  for (let i = 0; i < 8; i++) {
    const changed = snap.a[i] !== previousSnapshot.a[i]
    rows.push(
      `<div class="reg${changed ? ' changed' : ''}"><span class="name">A${i}</span><span class="value">${hex32(snap.a[i])}</span></div>`
    )
  }
  const pcChanged = snap.pc !== previousSnapshot.pc
  rows.push(
    `<div class="reg${pcChanged ? ' changed' : ''}"><span class="name">PC</span><span class="value">${hex32(snap.pc)}</span></div>`
  )
  registersEl.innerHTML = rows.join('')

  const flagNames: Array<keyof typeof snap.flags> = ['x', 'n', 'z', 'v', 'c']
  flagsEl.innerHTML = flagNames
    .map((f) => `<span class="flag${snap.flags[f] ? ' set' : ''}">${f.toUpperCase()}</span>`)
    .join('')
}

function hex32(value: number): string {
  return '$' + (value >>> 0).toString(16).padStart(8, '0')
}

function renderMemory(writes: { address: number; size: number }[] = []): void {
  const writtenAddresses = new Set<number>()
  for (const w of writes) {
    for (let i = 0; i < w.size; i++) writtenAddresses.add(w.address + i)
  }
  let base = parseInt(memAddressInput.value, 16)
  if (Number.isNaN(base)) base = 0
  base &= ~0xf
  const lines: string[] = []
  for (let row = 0; row < 16; row++) {
    const rowAddr = base + row * 16
    let line = `<span style="color:#888">${rowAddr.toString(16).padStart(6, '0')}</span>  `
    for (let col = 0; col < 16; col++) {
      const addr = rowAddr + col
      const value = cpu.memory.readU8(addr)
      const cls = writtenAddresses.has(addr) ? ' byte written' : ' byte'
      line += `<span class="${cls}">${value.toString(16).padStart(2, '0')}</span> `
    }
    lines.push(line)
  }
  memoryEl.innerHTML = lines.join('\n')
}

function renderConsole(): void {
  consoleEl.textContent = cpu.output
}

function highlightCurrentLine(): void {
  const line = assembleResult?.addressToLine?.[cpu.pc]
  if (line === undefined) {
    currentLineDecorations = editor.deltaDecorations(currentLineDecorations, [])
    return
  }
  currentLineDecorations = editor.deltaDecorations(currentLineDecorations, [
    {
      range: new monaco.Range(line, 1, line, 1),
      options: { isWholeLine: true, className: 'current-line-highlight' }
    }
  ])
  editor.revealLineInCenterIfOutsideViewport(line)
}

function refreshUI(writes: { address: number; size: number }[] = []): void {
  renderRegisters()
  renderMemory(writes)
  renderConsole()
  highlightCurrentLine()
  previousSnapshot = cpu.getSnapshot()
}

async function onAssemble(): Promise<void> {
  statusEl.textContent = 'Assemblage…'
  const result = await window.api.assemble(editor.getValue())
  assembleResult = result
  if (!result.success) {
    setErrors(result.errors.map((e) => `Ligne ${e.line} : ${e.message}`))
    statusEl.textContent = 'Erreur d’assemblage'
    btnStep.disabled = true
    btnRun.disabled = true
    btnReset.disabled = true
    return
  }
  setErrors([])
  statusEl.textContent = `Assemblé (${result.binary!.length} octets)`
  btnStep.disabled = false
  btnRun.disabled = false
  btnReset.disabled = false
  doReset()
}

function doReset(): void {
  if (!assembleResult?.success) return
  cpu.reset(assembleResult.baseAddress ?? 0)
  cpu.loadProgram(assembleResult.baseAddress ?? 0, assembleResult.binary!)
  memAddressInput.value = (assembleResult.baseAddress ?? 0).toString(16)
  previousSnapshot = cpu.getSnapshot()
  refreshUI()
  statusEl.textContent = 'Réinitialisé'
}

function doStep(): void {
  if (cpu.halted) {
    statusEl.textContent = 'Programme arrêté (halted)'
    return
  }
  const effects = cpu.step()
  refreshUI(effects.writes)
  if (effects.error) statusEl.textContent = `Erreur : ${effects.error}`
  else if (effects.halted) statusEl.textContent = 'Programme terminé'
}

async function doRun(): Promise<void> {
  running = true
  btnRun.textContent = 'Arrêter'
  let iterations = 0
  while (running && !cpu.halted && iterations < 2_000_000) {
    const effects = cpu.step()
    iterations++
    if (effects.error) {
      statusEl.textContent = `Erreur : ${effects.error}`
      break
    }
    if (iterations % 2000 === 0) {
      refreshUI(effects.writes)
      await new Promise((r) => setTimeout(r, 0))
    }
  }
  refreshUI()
  running = false
  btnRun.textContent = 'Exécuter'
  if (cpu.halted) statusEl.textContent = 'Programme terminé'
}

btnAssemble.addEventListener('click', () => void onAssemble())
btnStep.addEventListener('click', doStep)
btnReset.addEventListener('click', doReset)
btnRun.addEventListener('click', () => {
  if (running) {
    running = false
    return
  }
  void doRun()
})

renderRegisters()
renderMemory()
void onAssemble()
