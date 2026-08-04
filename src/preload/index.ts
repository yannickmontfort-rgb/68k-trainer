import { contextBridge, ipcRenderer } from 'electron'
import { IPC, type AssembleRequest, type AssembleResult, type ContentBundle, type ProgressState } from '../shared/ipc'

const api = {
  assemble: (source: string): Promise<AssembleResult> =>
    ipcRenderer.invoke(IPC.assemble, { source } satisfies AssembleRequest),
  loadProgress: (): Promise<ProgressState> => ipcRenderer.invoke(IPC.loadProgress),
  saveProgress: (state: ProgressState): Promise<void> => ipcRenderer.invoke(IPC.saveProgress, state),
  loadContent: (): Promise<ContentBundle> => ipcRenderer.invoke(IPC.loadContent)
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
