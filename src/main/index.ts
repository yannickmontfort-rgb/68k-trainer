import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { is } from '@electron-toolkit/utils'
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { IPC, type AssembleRequest, type ProgressState } from '../shared/ipc'
import { assemblerDansApplication, fabriquerPrg } from './assemblage'
import { GestionProfils } from './profils'
import { loadContent } from './content'
import { getBuildInfo } from './buildInfo'

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1280,
    height: 860,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  window.on('ready-to-show', () => window.show())
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
  ipcMain.handle(IPC.creerProfil, (_e, nom: string, motDePasse?: string) => profils.creer(nom, motDePasse))
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
  ipcMain.handle(IPC.enregistrerPrg, async (event, octets: Uint8Array, nom: string) => {
    const fenetre = BrowserWindow.fromWebContents(event.sender)!
    const choix = await dialog.showSaveDialog(fenetre, {
      title: 'Exporter pour Hatari ou un vrai Atari ST',
      defaultPath: `${nom}.PRG`,
      filters: [{ name: 'Programme Atari ST', extensions: ['PRG', 'TOS', 'TTP'] }]
    })
    if (choix.canceled || !choix.filePath) return { ok: false }
    await writeFile(choix.filePath, Buffer.from(octets))
    return { ok: true, chemin: choix.filePath }
  })
  ipcMain.handle(IPC.fabriquerPrg, (_event, source: string) => fabriquerPrg(source))
  ipcMain.handle(IPC.loadContent, () => loadContent())
  ipcMain.handle(IPC.getBuildInfo, () => getBuildInfo())

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
