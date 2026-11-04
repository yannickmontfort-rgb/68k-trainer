import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'
import { platformFor } from '../../../shared/runProgram'
import { Debogueur } from '../components/debogueur'
import { Execution } from '../components/execution'
import { essayerDansEmulateur, exporterPrg } from '../exportPrg'
import { ecrireLocal as ecrire, lireLocal as lire } from '../profilActif'
import { machineActive } from '../progressionStore'
import { materielAmiga } from '../../../platforms/amiga/chipset'
import { MACHINES, type Machine } from '../../../shared/machines'
import { confirmer } from '../components/dialogue'
import { langueCourante, traducteur, traduireCoeur } from '../langue'

const t = traducteur({
  fr: {
    ouvrir: 'Ouvrir…',
    ouvrirTitre: 'Ouvrir un source .s (Ctrl+O)',
    enregistrer: 'Enregistrer',
    enregistrerTitre: 'Enregistrer le source (Ctrl+S)',
    enregistrerSous: 'Enregistrer sous…',
    enregistrerSousTitre: 'Enregistrer le source sous un autre nom',
    exemple: 'Exemple',
    exempleTitre: "Remettre le programme d'exemple dans l'éditeur",
    assembler: 'Assembler',
    pas: 'Pas',
    executer: 'Exécuter',
    reinitialiser: 'Réinitialiser',
    exportBoutonAtari: MACHINES.atari.export.bouton.fr,
    exportTitreAtari: MACHINES.atari.export.titre.fr,
    exportBoutonAmiga: MACHINES.amiga.export.bouton.fr,
    exportTitreAmiga: MACHINES.amiga.export.titre.fr,
    essayer: 'Essayer dans {emulateur}',
    essayerTitre: "Lancer le programme dans un vrai émulateur (onglet « Émulateurs » pour l'installer)",
    modeUtilisateur: 'Mode utilisateur',
    modeUtilisateurTitre: 'Comme sous le vrai TOS : vecteurs, variables système et matériel protégés',
    pret: 'Prêt',
    sansNom: 'Sans nom',
    modifie: ' (modifié, pas encore enregistré)',
    pasEnregistre: 'Pas encore enregistré dans un fichier',
    enregistreSous: 'Enregistré : {nom}',
    ouvrirConfirmer: 'Ouvrir un autre source ? Les modifications non enregistrées seront perdues (Ctrl+Z pour revenir en arrière).',
    ouvrirBouton: 'Ouvrir',
    ouvert: 'Ouvert : {nom}',
    remplacerConfirmer: "Remplacer ton programme par l'exemple ? (Ctrl+Z pour revenir en arrière)",
    remplacer: 'Remplacer',
    assemblage: 'Assemblage…',
    ligne: 'Ligne {ligne} : {message}',
    erreurAssemblage: 'Erreur d’assemblage',
    assemble: 'Assemblé ({octets} octets)',
    arretException: 'Arrêt sur exception',
    termine: 'Programme terminé',
    arreter: 'Arrêter',
    locale: 'fr-FR',
    tempsReel: 'Exécution en temps réel ({mhz} MHz, 50 images/s)…',
    arrete: 'Arrêté : tu peux continuer pas à pas',
    pointArret: "Point d'arrêt : continue pas à pas ou relance",
    exporte: 'Programme exporté',
    exportImpossible: 'Export impossible',
    preparationEssai: 'Préparation de l’essai…',
    essaiLance: 'Essai lancé',
    essaiImpossible: 'Essai impossible',
    reinitialise: 'Réinitialisé',
    modeUtilisateurTos: 'Mode utilisateur (comme le TOS)',
    modeSuperviseur: 'Mode superviseur'
  },
  en: {
    ouvrir: 'Open…',
    ouvrirTitre: 'Open a .s source file (Ctrl+O)',
    enregistrer: 'Save',
    enregistrerTitre: 'Save the source (Ctrl+S)',
    enregistrerSous: 'Save as…',
    enregistrerSousTitre: 'Save the source under another name',
    exemple: 'Example',
    exempleTitre: 'Put the example program back in the editor',
    assembler: 'Assemble',
    pas: 'Step',
    executer: 'Run',
    reinitialiser: 'Reset',
    exportBoutonAtari: MACHINES.atari.export.bouton.en,
    exportTitreAtari: MACHINES.atari.export.titre.en,
    exportBoutonAmiga: MACHINES.amiga.export.bouton.en,
    exportTitreAmiga: MACHINES.amiga.export.titre.en,
    essayer: 'Try in {emulateur}',
    essayerTitre: 'Run the program in a real emulator (install it from the “Emulators” tab)',
    modeUtilisateur: 'User mode',
    modeUtilisateurTitre: 'As under the real TOS: vectors, system variables and hardware are protected',
    pret: 'Ready',
    sansNom: 'Untitled',
    modifie: ' (modified, not saved yet)',
    pasEnregistre: 'Not saved to a file yet',
    enregistreSous: 'Saved: {nom}',
    ouvrirConfirmer: 'Open another source file? Unsaved changes will be lost (Ctrl+Z to undo).',
    ouvrirBouton: 'Open',
    ouvert: 'Opened: {nom}',
    remplacerConfirmer: 'Replace your program with the example? (Ctrl+Z to undo)',
    remplacer: 'Replace',
    assemblage: 'Assembling…',
    ligne: 'Line {ligne}: {message}',
    erreurAssemblage: 'Assembly error',
    assemble: 'Assembled ({octets} bytes)',
    arretException: 'Stopped on an exception',
    termine: 'Program finished',
    arreter: 'Stop',
    locale: 'en-US',
    tempsReel: 'Running in real time ({mhz} MHz, 50 frames/s)…',
    arrete: 'Stopped: you can continue step by step',
    pointArret: 'Breakpoint: continue step by step or run again',
    exporte: 'Program exported',
    exportImpossible: 'Export failed',
    preparationEssai: 'Preparing the test run…',
    essaiLance: 'Test run started',
    essaiImpossible: 'Test run failed',
    reinitialise: 'Reset done',
    modeUtilisateurTos: 'User mode (like TOS)',
    modeSuperviseur: 'Supervisor mode'
  }
})

/** Programme d'exemple du bac à sable, dans chaque langue (les chaînes affichées restent en français). */
const PROGRAMMES: Record<'fr' | 'en', Record<Machine, string>> = {
  fr: {
    atari: `; Bac à sable : écris ici ce que tu veux, puis Assembler et Pas / Exécuter.
; La machine simulée est un Atari 1040 STF (TOS, écran en $F8000).
START:
    PEA     texte(PC)
    MOVE.W  #9,-(SP)
    TRAP    #1              ; GEMDOS Cconws : affiche le texte
    ADDQ.L  #6,SP
    CLR.W   -(SP)
    TRAP    #1              ; GEMDOS Pterm0 : fin du programme
texte:  DC.B    'Bonjour Atari !',13,10,0
    EVEN
`,
    amiga: `; Bac à sable : écris ici ce que tu veux, puis Assembler et Pas / Exécuter.
; La machine simulée est un Amiga 500 (Kickstart 1.3, puces custom en $DFF000).
START:
    MOVEA.L 4.W,A6          ; A6 = ExecBase
    LEA     dosnom(PC),A1
    MOVEQ   #0,D0
    JSR     -552(A6)        ; OpenLibrary("dos.library", 0)
    MOVEA.L D0,A6           ; A6 = DOSBase
    JSR     -60(A6)         ; Output() : la fenêtre du CLI
    MOVE.L  D0,D1
    LEA     texte(PC),A0
    MOVE.L  A0,D2
    MOVEQ   #fin-texte,D3
    JSR     -48(A6)         ; Write(sortie, texte, longueur)
    MOVEA.L A6,A1
    MOVEA.L 4.W,A6
    JSR     -414(A6)        ; CloseLibrary(DOSBase)
    MOVEQ   #0,D0           ; code de retour : tout va bien
    RTS
dosnom: DC.B    'dos.library',0
texte:  DC.B    'Bonjour Amiga !',10
fin:
    EVEN
`
  },
  en: {
    atari: `; Sandbox: write whatever you want here, then Assemble and Step / Run.
; The simulated machine is an Atari 1040 STF (TOS, screen at $F8000).
START:
    PEA     texte(PC)
    MOVE.W  #9,-(SP)
    TRAP    #1              ; GEMDOS Cconws: prints the text
    ADDQ.L  #6,SP
    CLR.W   -(SP)
    TRAP    #1              ; GEMDOS Pterm0: end of the program
texte:  DC.B    'Bonjour Atari !',13,10,0
    EVEN
`,
    amiga: `; Sandbox: write whatever you want here, then Assemble and Step / Run.
; The simulated machine is an Amiga 500 (Kickstart 1.3, custom chips at $DFF000).
START:
    MOVEA.L 4.W,A6          ; A6 = ExecBase
    LEA     dosnom(PC),A1
    MOVEQ   #0,D0
    JSR     -552(A6)        ; OpenLibrary("dos.library", 0)
    MOVEA.L D0,A6           ; A6 = DOSBase
    JSR     -60(A6)         ; Output(): the CLI window
    MOVE.L  D0,D1
    LEA     texte(PC),A0
    MOVE.L  A0,D2
    MOVEQ   #fin-texte,D3
    JSR     -48(A6)         ; Write(output, text, length)
    MOVEA.L A6,A1
    MOVEA.L 4.W,A6
    JSR     -414(A6)        ; CloseLibrary(DOSBase)
    MOVEQ   #0,D0           ; return code: all is well
    RTS
dosnom: DC.B    'dos.library',0
texte:  DC.B    'Bonjour Amiga !',10
fin:
    EVEN
`
  }
}

/** Le programme d'exemple dans la langue de l'interface. */
const exemple = (m: Machine): string => PROGRAMMES[langueCourante()][m]

/** Vrai si le texte est le programme d'exemple, dans l'une ou l'autre langue. */
const estExemple = (m: Machine, texte: string): boolean => texte === PROGRAMMES.fr[m] || texte === PROGRAMMES.en[m]

/** Anciens programmes d'exemple : un brouillon resté identique est remplacé par l'exemple actuel. */
const ANCIENS_EXEMPLES: Record<Machine, string[]> = {
  atari: [
    `; Bac à sable : écris ici ce que tu veux, puis Assembler et Pas / Exécuter.
; La machine simulée est un Atari 1040 STF (écran en $F8000).
START:
    MOVE.W  #5,D0
    MOVE.W  #10,D1
    ADD.W   D1,D0           ; D0 = 15
    MOVE.W  #$FFFF,$F8000   ; 16 pixels en haut à gauche de l'écran
    RTS
`
  ],
  amiga: []
}

/** Le brouillon du profil, sauf s'il n'est qu'un ancien exemple jamais modifié. */
function brouillon(machine: Machine, texte: string | null): string | null {
  if (texte === null) return null
  const net = (t: string): string => t.replace(/\r\n/g, '\n').trim()
  const anciens = [...ANCIENS_EXEMPLES[machine], PROGRAMMES.fr[machine], PROGRAMMES.en[machine]]
  return anciens.some((ancien) => net(ancien) === net(texte)) ? null : texte
}

const cleProgramme = (m: Machine): string => (m === 'atari' ? 'bac-a-sable:programme' : `bac-a-sable:programme:${m}`)
const CLE_MODE = 'bac-a-sable:mode-utilisateur'
const cleFichier = (m: Machine): string => `bac-a-sable:fichier:${m}`
const cleEnregistre = (m: Machine): string => `bac-a-sable:enregistre:${m}`

/** Nom du fichier sans le dossier. */
const nomCourt = (chemin: string): string => chemin.split(/[\\/]/).pop() ?? chemin

/** Rend le bac à sable : éditeur libre + débogueur complet. Retourne une fonction de nettoyage. */
export function renderTrainer(container: HTMLElement, initialProgram?: string): () => void {
  const machine = machineActive()
  const CLE_PROGRAMME = cleProgramme(machine)
  container.innerHTML = `
    <div class="toolbar">
      <button id="btn-ouvrir" title="${t('ouvrirTitre')}">${t('ouvrir')}</button>
      <button id="btn-enregistrer" title="${t('enregistrerTitre')}">${t('enregistrer')}</button>
      <button id="btn-enregistrer-sous" title="${t('enregistrerSousTitre')}">${t('enregistrerSous')}</button>
      <span class="toolbar-fichier" id="fichier"></span>
      <button id="btn-exemple" title="${t('exempleTitre')}">${t('exemple')}</button>
      <button id="btn-assemble">${t('assembler')}</button>
      <button id="btn-step" disabled>${t('pas')}</button>
      <button id="btn-run" disabled>${t('executer')}</button>
      <button id="btn-reset" disabled>${t('reinitialiser')}</button>
      <button id="btn-prg" title="${machine === 'amiga' ? t('exportTitreAmiga') : t('exportTitreAtari')}">${machine === 'amiga' ? t('exportBoutonAmiga') : t('exportBoutonAtari')}</button>
      <button id="btn-essayer" title="${t('essayerTitre')}">${t('essayer', { emulateur: machine === 'amiga' ? 'WinUAE' : 'Hatari' })}</button>
      <label class="toolbar-option" ${machine === 'atari' ? '' : 'style="display:none"'} title="${t('modeUtilisateurTitre')}">
        <input type="checkbox" id="opt-utilisateur" /> ${t('modeUtilisateur')}
      </label>
      <span class="status" id="status">${t('pret')}</span>
    </div>
    <div class="main">
      <div id="editor"></div>
      <div class="sidebar sidebar-dbg" id="dbg"></div>
    </div>
    <div class="errors" id="errors"></div>
  `

  const editor = monaco.editor.create(container.querySelector('#editor') as HTMLDivElement, {
    value: initialProgram ?? brouillon(machine, lire(CLE_PROGRAMME)) ?? exemple(machine),
    language: 'm68k',
    theme: 'm68k-dark',
    fontSize: 14,
    minimap: { enabled: false },
    // Menu du clic droit : celui de l'application (son « Coller » marche, pas celui de Monaco)
    contextmenu: false,
    automaticLayout: true
  })
  // Fichier source associé (Ouvrir / Enregistrer) et texte au dernier enregistrement
  let fichier: string | null = initialProgram ? null : lire(cleFichier(machine))
  let enregistre: string | null = fichier ? lire(cleEnregistre(machine)) : null
  const fichierEl = container.querySelector('#fichier') as HTMLSpanElement
  function afficherFichier(): void {
    const modifie = enregistre !== editor.getValue()
    fichierEl.textContent = fichier ? `${nomCourt(fichier)}${modifie ? ' ●' : ''}` : t('sansNom')
    fichierEl.title = fichier ? `${fichier}${modifie ? t('modifie') : ''}` : t('pasEnregistre')
  }
  function associer(chemin: string | null): void {
    fichier = chemin
    ecrire(cleFichier(machine), chemin ?? '')
    enregistre = chemin ? editor.getValue() : null
    ecrire(cleEnregistre(machine), enregistre ?? '')
    afficherFichier()
  }
  if (fichier === '') fichier = null
  afficherFichier()
  /** Dossier du source ouvert : INCLUDE et INCBIN y cherchent d'abord, comme Devpac et vasm. */
  const dossierSource = (): string | undefined => (fichier ? fichier.replace(/[\\/][^\\/]*$/, '') : undefined)

  editor.onDidChangeModelContent(() => {
    ecrire(CLE_PROGRAMME, editor.getValue())
    afficherFichier()
  })

  async function enregistrer(sous: boolean): Promise<void> {
    const nom = fichier ? nomCourt(fichier) : machine === 'amiga' ? 'programme.s' : 'PROGRAMM.S'
    const r = await window.api.enregistrerSource(editor.getValue(), sous ? null : fichier, machine, nom)
    if (!r.ok) return
    associer(r.chemin!)
    statusEl.textContent = t('enregistreSous', { nom: nomCourt(r.chemin!) })
  }
  async function ouvrir(): Promise<void> {
    if (enregistre !== editor.getValue() && !estExemple(machine, editor.getValue())) {
      const oui = await confirmer(t('ouvrirConfirmer'), t('ouvrirBouton'))
      if (!oui) return
    }
    const r = await window.api.ouvrirSource(machine)
    if (!r.ok) return
    editor.pushUndoStop()
    editor.executeEdits('ouvrir', [{ range: editor.getModel()!.getFullModelRange(), text: r.texte! }])
    editor.pushUndoStop()
    associer(r.chemin!)
    statusEl.textContent = t('ouvert', { nom: nomCourt(r.chemin!) })
  }
  container.querySelector('#btn-ouvrir')!.addEventListener('click', () => void ouvrir())
  container.querySelector('#btn-enregistrer')!.addEventListener('click', () => void enregistrer(false))
  container.querySelector('#btn-enregistrer-sous')!.addEventListener('click', () => void enregistrer(true))
  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => void enregistrer(false))
  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyO, () => void ouvrir())
  container.querySelector('#btn-exemple')!.addEventListener('click', () => {
    const remettre = (): void => {
      // Comme une frappe : Ctrl+Z rend le programme d'avant
      editor.pushUndoStop()
      editor.executeEdits('exemple', [{ range: editor.getModel()!.getFullModelRange(), text: exemple(machine) }])
      editor.pushUndoStop()
    }
    if (editor.getValue() === exemple(machine)) return
    void confirmer(t('remplacerConfirmer'), t('remplacer')).then((oui) => {
      if (oui) {
        remettre()
        associer(null)
      }
    })
  })

  const btnAssemble = container.querySelector('#btn-assemble') as HTMLButtonElement
  const btnStep = container.querySelector('#btn-step') as HTMLButtonElement
  const btnRun = container.querySelector('#btn-run') as HTMLButtonElement
  const btnReset = container.querySelector('#btn-reset') as HTMLButtonElement
  const optUtilisateur = container.querySelector('#opt-utilisateur') as HTMLInputElement
  const statusEl = container.querySelector('#status') as HTMLSpanElement
  const errorsEl = container.querySelector('#errors') as HTMLDivElement
  optUtilisateur.checked = lire(CLE_MODE) === '1'

  const debogueur = new Debogueur({ ecran: true, machine })
  container.querySelector('#dbg')!.appendChild(debogueur.element)
  const exec = new Execution(
    editor,
    debogueur,
    () => platformFor(machine, { modeUtilisateur: optUtilisateur.checked, interactif: true }),
    undefined,
    machine
  )

  function activer(actif: boolean): void {
    btnStep.disabled = !actif
    btnRun.disabled = !actif
    btnReset.disabled = !actif
  }

  async function onAssemble(): Promise<void> {
    statusEl.textContent = t('assemblage')
    const result = await exec.assembler(editor.getValue(), dossierSource())
    if (!result.success) {
      errorsEl.textContent = result.errors.map((e) => (e.line > 0 ? t('ligne', { ligne: e.line, message: e.message }) : e.message)).join('\n')
      statusEl.textContent = t('erreurAssemblage')
      activer(false)
      return
    }
    errorsEl.textContent = ''
    statusEl.textContent = t('assemble', { octets: result.binary!.length })
    activer(true)
  }

  function afficherFin(error?: string): void {
    const alertes = exec.cpu ? (materielAmiga(exec.cpu)?.alertes ?? []) : []
    const remarques = alertes.map((a) => '⚠ ' + traduireCoeur(a)).join('\n')
    if (error) {
      statusEl.textContent = t('arretException')
      errorsEl.textContent = traduireCoeur(error) + (remarques ? '\n' + remarques : '')
    } else {
      if (exec.cpu?.halted) statusEl.textContent = t('termine')
      if (remarques) errorsEl.textContent = remarques
    }
  }

  function doStep(): void {
    if (exec.cpu?.halted) {
      statusEl.textContent = t('termine')
      return
    }
    const effects = exec.pas()
    afficherFin(effects?.error)
  }

  /** Exécution à la vitesse de la vraie machine : l'écran s'anime à 50 images par seconde. */
  function doRun(): void {
    if (!exec.cpu || exec.cpu.halted) return
    btnRun.textContent = t('arreter')
    btnStep.disabled = true
    statusEl.textContent = t('tempsReel', { mhz: (MACHINES[machine].cpuHz / 1e6).toLocaleString(t('locale'), { maximumFractionDigits: 2 }) })
    exec.tempsReel((raison, effects) => {
      btnRun.textContent = t('executer')
      btnStep.disabled = false
      if (raison === 'arret') statusEl.textContent = t('arrete')
      else if (raison === 'point') statusEl.textContent = t('pointArret')
      afficherFin(effects?.error)
    })
  }

  container.querySelector('#btn-prg')!.addEventListener('click', () => {
    void exporterPrg(editor.getValue(), machine === 'amiga' ? 'bac_a_sable' : 'BACASABL', machine, dossierSource()).then((r) => {
      statusEl.textContent = r.ok ? t('exporte') : t('exportImpossible')
      errorsEl.textContent = r.message
    })
  })
  container.querySelector('#btn-essayer')!.addEventListener('click', () => {
    statusEl.textContent = t('preparationEssai')
    void essayerDansEmulateur(editor.getValue(), machine === 'amiga' ? 'bac_a_sable' : 'BACASABL', machine, dossierSource(), (fin) => {
      statusEl.textContent = t('termine')
      errorsEl.textContent = fin
    }).then((r) => {
      statusEl.textContent = r.ok ? t('essaiLance') : t('essaiImpossible')
      errorsEl.textContent = r.message
    })
  })
  btnAssemble.addEventListener('click', () => void onAssemble())
  btnStep.addEventListener('click', doStep)
  btnReset.addEventListener('click', () => {
    exec.reinitialiser()
    errorsEl.textContent = ''
    statusEl.textContent = t('reinitialise')
  })
  btnRun.addEventListener('click', () => (exec.enTempsReel ? exec.arreter() : doRun()))
  optUtilisateur.addEventListener('change', () => {
    ecrire(CLE_MODE, optUtilisateur.checked ? '1' : '0')
    exec.reinitialiser()
    statusEl.textContent = optUtilisateur.checked ? t('modeUtilisateurTos') : t('modeSuperviseur')
  })

  void onAssemble()

  return () => {
    exec.arreter()
    editor.dispose()
  }
}
