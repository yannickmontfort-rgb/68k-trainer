import { app, BrowserWindow, dialog, ipcMain, Menu, shell } from 'electron'
import { is } from '@electron-toolkit/utils'
import { mkdirSync } from 'fs'
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { IPC, type AssembleRequest, type ProgressState } from '../shared/ipc'
import { assemblerDansApplication, fabriquerPrg } from './assemblage'
import * as emulateurs from './emulateurs/installation'
import { GestionProfils } from './profils'
import { loadContent } from './content'
import { getBuildInfo } from './buildInfo'

/** Installe un émulateur ; la progression est envoyée à toutes les fenêtres (onglet « Émulateurs »). */
async function installerEmulateur(id: 'hatari' | 'winuae'): Promise<{ ok: boolean; erreur?: string }> {
  try {
    await emulateurs.installer(id, (fait, total, etape) => {
      for (const w of BrowserWindow.getAllWindows()) w.webContents.send(IPC.emulateurProgression, { id, fait, total, etape })
    })
    return { ok: true }
  } catch (e) {
    return { ok: false, erreur: (e as Error).message }
  }
}

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1280,
    height: 860,
    show: false,
    // Linux : l'icône de la fenêtre n'est pas prise dans l'exécutable
    ...(process.platform === 'linux'
      ? { icon: app.isPackaged ? join(process.resourcesPath, 'icon.png') : join(app.getAppPath(), 'resources', 'icon.png') }
      : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  window.on('ready-to-show', () => window.show())
  // Clic droit : Couper / Copier / Coller / Tout sélectionner (Electron n'en a pas par défaut)
  window.webContents.on('context-menu', (_e, params) => {
    const f = params.editFlags
    const modele: Electron.MenuItemConstructorOptions[] = params.isEditable
      ? [
          { label: 'Couper', role: 'cut', enabled: f.canCut },
          { label: 'Copier', role: 'copy', enabled: f.canCopy },
          { label: 'Coller', role: 'paste', enabled: f.canPaste },
          { type: 'separator' },
          { label: 'Tout sélectionner', role: 'selectAll' }
        ]
      : [
          { label: 'Copier', role: 'copy', enabled: params.selectionText.length > 0 },
          { label: 'Tout sélectionner', role: 'selectAll' }
        ]
    Menu.buildFromTemplate(modele).popup({ window })
  })
  window.webContents.on('console-message', (_e, level, message, line, sourceId) => {
    console.log(`[renderer:${level}] ${message} (${sourceId}:${line})`)
  })
  window.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    window.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    window.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  ipcMain.handle(IPC.assemble, (_event, request: AssembleRequest) => assemblerDansApplication(request.source))
  const profils = new GestionProfils(app.getPath('userData'))
  ipcMain.handle(IPC.loadProgress, () => profils.chargerProgression())
  ipcMain.handle(IPC.saveProgress, (_event, state: ProgressState) => profils.enregistrerProgression(state))
  ipcMain.handle(IPC.listerProfils, () => profils.lister())
  ipcMain.handle(IPC.creerProfil, (_e, nom: string, motDePasse?: string, progression?: ProgressState) => profils.creer(nom, motDePasse, progression))
  ipcMain.handle(IPC.ouvrirProfil, (_e, id: string, motDePasse?: string) => profils.ouvrir(id, motDePasse))
  ipcMain.handle(IPC.fermerProfil, () => profils.fermer())
  ipcMain.handle(IPC.renommerProfil, (_e, nom: string) => profils.renommer(nom))
  ipcMain.handle(IPC.motDePasseProfil, (_e, actuel?: string, nouveau?: string) => profils.changerMotDePasse(actuel, nouveau))
  ipcMain.handle(IPC.supprimerProfil, (_e, actuel?: string) => profils.supprimer(actuel))
  ipcMain.handle(IPC.tableauProfils, () => profils.tableau())
  ipcMain.handle(IPC.exporterProfil, async (event, brouillons: Record<string, string>) => {
    const donnees = await profils.exporter(brouillons)
    const fenetre = BrowserWindow.fromWebContents(event.sender)!
    const choix = await dialog.showSaveDialog(fenetre, {
      title: 'Exporter mon profil',
      defaultPath: `${donnees.nom}.68kprofil`,
      filters: [{ name: 'Profil 68k Trainer', extensions: ['68kprofil'] }]
    })
    if (choix.canceled || !choix.filePath) return { ok: false }
    await writeFile(choix.filePath, JSON.stringify(donnees, null, 2), 'utf-8')
    return { ok: true, chemin: choix.filePath }
  })
  ipcMain.handle(IPC.importerProfil, async (event, motDePasse?: string) => {
    const fenetre = BrowserWindow.fromWebContents(event.sender)!
    const choix = await dialog.showOpenDialog(fenetre, {
      title: 'Importer un profil',
      properties: ['openFile'],
      filters: [{ name: 'Profil 68k Trainer', extensions: ['68kprofil', 'json'] }]
    })
    if (choix.canceled || choix.filePaths.length === 0) return { ok: false }
    try {
      return await profils.importer(JSON.parse(await readFile(choix.filePaths[0], 'utf-8')), motDePasse)
    } catch {
      return { ok: false, erreur: "Ce fichier n'est pas un profil 68k Trainer lisible." }
    }
  })
  ipcMain.handle(IPC.enregistrerPrg, async (event, octets: Uint8Array, nom: string, format: 'prg' | 'hunk' = 'prg') => {
    const fenetre = BrowserWindow.fromWebContents(event.sender)!
    const choix = await dialog.showSaveDialog(
      fenetre,
      format === 'hunk'
        ? {
            title: 'Exporter pour un émulateur Amiga (WinUAE, FS-UAE) ou un vrai Amiga',
            defaultPath: nom,
            filters: [{ name: 'Programme Amiga (sans extension)', extensions: ['*'] }]
          }
        : {
            title: 'Exporter pour Hatari ou un vrai Atari ST',
            defaultPath: `${nom}.PRG`,
            filters: [{ name: 'Programme Atari ST', extensions: ['PRG', 'TOS', 'TTP'] }]
          }
    )
    if (choix.canceled || !choix.filePath) return { ok: false }
    await writeFile(choix.filePath, Buffer.from(octets))
    return { ok: true, chemin: choix.filePath }
  })
  // Sources du bac à sable : rangées par défaut dans le dossier de partage de la machine
  // (Documents\68k Trainer\Atari ou Amiga), lisibles directement par l'émulateur
  const filtresSource = [
    { name: 'Source assembleur 68000', extensions: ['s', 'asm', 'i'] },
    { name: 'Tous les fichiers', extensions: ['*'] }
  ]
  ipcMain.handle(IPC.ouvrirSource, async (event, machine: 'atari' | 'amiga') => {
    const dossier = emulateurs.dossierPartage(machine)
    mkdirSync(dossier, { recursive: true })
    const choix = await dialog.showOpenDialog(BrowserWindow.fromWebContents(event.sender)!, {
      title: 'Ouvrir un source assembleur',
      defaultPath: dossier,
      filters: filtresSource,
      properties: ['openFile']
    })
    if (choix.canceled || choix.filePaths.length === 0) return { ok: false }
    const octets = await readFile(choix.filePaths[0])
    // UTF-8 si le fichier en est, sinon Latin-1 (sources venus d'un vrai ST, de Devpac, d'un Amiga…)
    let texte: string
    try {
      texte = new TextDecoder('utf-8', { fatal: true }).decode(octets)
    } catch {
      texte = new TextDecoder('latin1').decode(octets)
    }
    return { ok: true, chemin: choix.filePaths[0], texte: texte.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n') }
  })
  ipcMain.handle(
    IPC.enregistrerSource,
    async (event, texte: string, chemin: string | null, machine: 'atari' | 'amiga', nom: string) => {
      let cible = chemin
      if (!cible) {
        const dossier = emulateurs.dossierPartage(machine)
        mkdirSync(dossier, { recursive: true })
        const choix = await dialog.showSaveDialog(BrowserWindow.fromWebContents(event.sender)!, {
          title: 'Enregistrer le source',
          defaultPath: join(dossier, nom),
          filters: filtresSource
        })
        if (choix.canceled || !choix.filePath) return { ok: false }
        cible = choix.filePath
      }
      // Fins de ligne CR LF : celles de Devpac, de l'Atari et de Windows
      await writeFile(cible, texte.replace(/\r?\n/g, '\r\n'), 'utf-8')
      return { ok: true, chemin: cible }
    }
  )
  ipcMain.handle(IPC.emulateursEtat, () => emulateurs.etatEmulateurs())
  ipcMain.handle(IPC.emulateurInstaller, (_e, id: 'hatari' | 'winuae') => installerEmulateur(id))
  ipcMain.handle(IPC.emulateurDesinstaller, (_e, id: 'hatari' | 'winuae') => emulateurs.desinstaller(id))
  ipcMain.handle(IPC.emulateurLancer, async (_e, id: 'hatari' | 'winuae') => {
    try {
      await emulateurs.lancer(id)
      return { ok: true }
    } catch (e) {
      return { ok: false, erreur: (e as Error).message }
    }
  })
  ipcMain.handle(IPC.emulateurEssayer, async (_e, id: 'hatari' | 'winuae', source: string, nom: string) => {
    const exe = fabriquerPrg(source, id === 'winuae' ? 'hunk' : 'prg')
    if (!exe.octets) return { ok: false, erreur: exe.raison }
    const lanceur = id === 'hatari' ? fabriquerPrg(emulateurs.sourceLanceurAtari(`${nom}.PRG`)).octets : undefined
    try {
      return { ok: true, chemin: await emulateurs.essayer(id, exe.octets, nom, lanceur) }
    } catch (e) {
      return { ok: false, erreur: (e as Error).message }
    }
  })
  ipcMain.handle(IPC.ouvrirPartage, (_e, machine: 'atari' | 'amiga') => {
    const d = emulateurs.dossierPartage(machine)
    mkdirSync(d, { recursive: true })
    return shell.openPath(d)
  })
  ipcMain.handle(IPC.fabriquerPrg, (_event, source: string, format?: 'prg' | 'hunk') => fabriquerPrg(source, format))
  // Certificat : page HTML rendue dans une fenêtre invisible, imprimée en PDF (A4 paysage)
  ipcMain.handle(IPC.exporterPdf, async (event, html: string, nom: string) => {
    const fenetre = BrowserWindow.fromWebContents(event.sender)!
    const choix = await dialog.showSaveDialog(fenetre, {
      title: 'Enregistrer le certificat',
      defaultPath: `${nom}.pdf`,
      filters: [{ name: 'Document PDF', extensions: ['pdf'] }]
    })
    if (choix.canceled || !choix.filePath) return { ok: false }
    const invisible = new BrowserWindow({ show: false, webPreferences: { javascript: false } })
    try {
      await invisible.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html))
      const pdf = await invisible.webContents.printToPDF({ landscape: true, pageSize: 'A4', printBackground: true })
      await writeFile(choix.filePath, pdf)
    } finally {
      invisible.destroy()
    }
    void shell.openPath(choix.filePath)
    return { ok: true, chemin: choix.filePath }
  })
  ipcMain.handle(IPC.loadContent, () => loadContent())
  ipcMain.handle(IPC.getBuildInfo, () => getBuildInfo())

  // macOS : le menu de l'application (« 68k Trainer », Quitter avec Cmd+Q) est obligatoire
  if (process.platform === 'darwin') {
    Menu.setApplicationMenu(
      Menu.buildFromTemplate([{ role: 'appMenu' }, { role: 'editMenu' }, { role: 'viewMenu' }, { role: 'windowMenu' }])
    )
  }

  createWindow()
  // Émulateurs cochés dans l'installateur : installés en arrière-plan au premier lancement
  void (async () => {
    for (const id of emulateurs.installationsDemandees()) await installerEmulateur(id)
  })()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
