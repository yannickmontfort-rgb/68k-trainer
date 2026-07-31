import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { is } from '@electron-toolkit/utils'
import { join } from 'path'
import { IPC, type AssembleRequest, type ProgressState } from '../shared/ipc'
import { assembleWithVasm } from './vasm'
import { loadProgress, saveProgress } from './progress'

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
  ipcMain.handle(IPC.assemble, (_event, request: AssembleRequest) => assembleWithVasm(request.source))
  ipcMain.handle(IPC.loadProgress, () => loadProgress())
  ipcMain.handle(IPC.saveProgress, (_event, state: ProgressState) => saveProgress(state))

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
