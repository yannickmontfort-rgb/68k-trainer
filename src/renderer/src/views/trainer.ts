import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'
import { platformFor } from '../../../shared/runProgram'
import { Debogueur } from '../components/debogueur'
import { Execution } from '../components/execution'
import { exporterPrg } from '../exportPrg'
import { ecrireLocal as ecrire, lireLocal as lire } from '../profilActif'

const DEFAULT_PROGRAM = `; Bac à sable : écris ici ce que tu veux, puis Assembler et Pas / Exécuter.
; La machine simulée est un Atari 1040 STF (écran en $F8000).
START:
    MOVE.W  #5,D0
    MOVE.W  #10,D1
    ADD.W   D1,D0           ; D0 = 15
    MOVE.W  #$FFFF,$F8000   ; 16 pixels en haut à gauche de l'écran
    RTS
`

const CLE_PROGRAMME = 'bac-a-sable:programme'
const CLE_MODE = 'bac-a-sable:mode-utilisateur'

/** Rend le bac à sable : éditeur libre + débogueur complet. Retourne une fonction de nettoyage. */
export function renderTrainer(container: HTMLElement, initialProgram?: string): () => void {
  container.innerHTML = `
    <div class="toolbar">
      <button id="btn-assemble">Assembler</button>
      <button id="btn-step" disabled>Pas</button>
      <button id="btn-run" disabled>Exécuter</button>
      <button id="btn-reset" disabled>Réinitialiser</button>
      <button id="btn-prg" title="Fabrique un programme .PRG à lancer dans l'émulateur Hatari ou sur un vrai Atari ST">Exporter .PRG</button>
      <label class="toolbar-option" title="Comme sous le vrai TOS : vecteurs, variables système et matériel protégés">
        <input type="checkbox" id="opt-utilisateur" /> Mode utilisateur
      </label>
      <span class="status" id="status">Prêt</span>
    </div>
    <div class="main">
      <div id="editor"></div>
      <div class="sidebar sidebar-dbg" id="dbg"></div>
    </div>
    <div class="errors" id="errors"></div>
  `

  const editor = monaco.editor.create(container.querySelector('#editor') as HTMLDivElement, {
    value: initialProgram ?? lire(CLE_PROGRAMME) ?? DEFAULT_PROGRAM,
    language: 'm68k',
    theme: 'm68k-dark',
    fontSize: 14,
    minimap: { enabled: false },
    automaticLayout: true
  })
  editor.onDidChangeModelContent(() => ecrire(CLE_PROGRAMME, editor.getValue()))

  const btnAssemble = container.querySelector('#btn-assemble') as HTMLButtonElement
  const btnStep = container.querySelector('#btn-step') as HTMLButtonElement
  const btnRun = container.querySelector('#btn-run') as HTMLButtonElement
  const btnReset = container.querySelector('#btn-reset') as HTMLButtonElement
  const optUtilisateur = container.querySelector('#opt-utilisateur') as HTMLInputElement
  const statusEl = container.querySelector('#status') as HTMLSpanElement
  const errorsEl = container.querySelector('#errors') as HTMLDivElement
  optUtilisateur.checked = lire(CLE_MODE) === '1'

  const debogueur = new Debogueur({ ecran: true })
  container.querySelector('#dbg')!.appendChild(debogueur.element)
  const exec = new Execution(editor, debogueur, () => platformFor('atari', { modeUtilisateur: optUtilisateur.checked }))

  function activer(actif: boolean): void {
    btnStep.disabled = !actif
    btnRun.disabled = !actif
    btnReset.disabled = !actif
  }

  async function onAssemble(): Promise<void> {
    statusEl.textContent = 'Assemblage…'
    const result = await exec.assembler(editor.getValue())
    if (!result.success) {
      errorsEl.textContent = result.errors.map((e) => (e.line > 0 ? `Ligne ${e.line} : ${e.message}` : e.message)).join('\n')
      statusEl.textContent = 'Erreur d’assemblage'
      activer(false)
      return
    }
    errorsEl.textContent = ''
    statusEl.textContent = `Assemblé (${result.binary!.length} octets)`
    activer(true)
  }

  function afficherFin(error?: string): void {
    if (error) {
      statusEl.textContent = 'Arrêt sur exception'
      errorsEl.textContent = error
    } else if (exec.cpu?.halted) statusEl.textContent = 'Programme terminé'
  }

  function doStep(): void {
    if (exec.cpu?.halted) {
      statusEl.textContent = 'Programme terminé'
      return
    }
    const effects = exec.pas()
    afficherFin(effects?.error)
  }

  /** Exécution à la vitesse d'un vrai ST : l'écran s'anime à 50 images par seconde. */
  function doRun(): void {
    if (!exec.cpu || exec.cpu.halted) return
    btnRun.textContent = 'Arrêter'
    btnStep.disabled = true
    statusEl.textContent = 'Exécution en temps réel (8 MHz, 50 images/s)…'
    exec.tempsReel((raison, effects) => {
      btnRun.textContent = 'Exécuter'
      btnStep.disabled = false
      if (raison === 'arret') statusEl.textContent = 'Arrêté : tu peux continuer pas à pas'
      afficherFin(effects?.error)
    })
  }

  container.querySelector('#btn-prg')!.addEventListener('click', () => {
    void exporterPrg(editor.getValue(), 'BACASABL').then((r) => {
      statusEl.textContent = r.ok ? '.PRG exporté' : 'Export impossible'
      errorsEl.textContent = r.message
    })
  })
  btnAssemble.addEventListener('click', () => void onAssemble())
  btnStep.addEventListener('click', doStep)
  btnReset.addEventListener('click', () => {
    exec.reinitialiser()
    errorsEl.textContent = ''
    statusEl.textContent = 'Réinitialisé'
  })
  btnRun.addEventListener('click', () => (exec.enTempsReel ? exec.arreter() : doRun()))
  optUtilisateur.addEventListener('change', () => {
    ecrire(CLE_MODE, optUtilisateur.checked ? '1' : '0')
    exec.reinitialiser()
    statusEl.textContent = optUtilisateur.checked ? 'Mode utilisateur (comme le TOS)' : 'Mode superviseur'
  })

  void onAssemble()

  return () => {
    exec.arreter()
    editor.dispose()
  }
}
