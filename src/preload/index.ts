import { contextBridge, ipcRenderer } from 'electron'
import {
  IPC,
  type AssembleRequest,
  type AssembleResult,
  type BuildInfo,
  type ContentBundle,
  type ExportProfil,
  type ProfilPublic,
  type ProgressState,
  type ResultatProfil
} from '../shared/ipc'

const api = {
  assemble: (source: string): Promise<AssembleResult> =>
    ipcRenderer.invoke(IPC.assemble, { source } satisfies AssembleRequest),
  loadProgress: (): Promise<ProgressState> => ipcRenderer.invoke(IPC.loadProgress),
  saveProgress: (state: ProgressState): Promise<void> => ipcRenderer.invoke(IPC.saveProgress, state),
  loadContent: (): Promise<ContentBundle> => ipcRenderer.invoke(IPC.loadContent),
  getBuildInfo: (): Promise<BuildInfo> => ipcRenderer.invoke(IPC.getBuildInfo),
  listerProfils: (): Promise<{ profils: ProfilPublic[]; dernier?: string }> => ipcRenderer.invoke(IPC.listerProfils),
  creerProfil: (nom: string, motDePasse?: string): Promise<ResultatProfil> =>
    ipcRenderer.invoke(IPC.creerProfil, nom, motDePasse),
  ouvrirProfil: (id: string, motDePasse?: string): Promise<ResultatProfil> =>
    ipcRenderer.invoke(IPC.ouvrirProfil, id, motDePasse),
  fermerProfil: (): Promise<void> => ipcRenderer.invoke(IPC.fermerProfil),
  renommerProfil: (nom: string): Promise<ResultatProfil> => ipcRenderer.invoke(IPC.renommerProfil, nom),
  motDePasseProfil: (actuel?: string, nouveau?: string): Promise<ResultatProfil> =>
    ipcRenderer.invoke(IPC.motDePasseProfil, actuel, nouveau),
  supprimerProfil: (actuel?: string): Promise<ResultatProfil> => ipcRenderer.invoke(IPC.supprimerProfil, actuel),
  exporterProfil: (brouillons: Record<string, string>): Promise<{ ok: boolean; chemin?: string }> =>
    ipcRenderer.invoke(IPC.exporterProfil, brouillons),
  importerProfil: (motDePasse?: string): Promise<ResultatProfil & { brouillons?: ExportProfil['brouillons'] }> =>
    ipcRenderer.invoke(IPC.importerProfil, motDePasse),
  tableauProfils: (): Promise<{ profil: ProfilPublic; progression: ProgressState }[]> =>
    ipcRenderer.invoke(IPC.tableauProfils),
  enregistrerPrg: (octets: Uint8Array, nom: string): Promise<{ ok: boolean; chemin?: string }> =>
    ipcRenderer.invoke(IPC.enregistrerPrg, octets, nom),
  fabriquerPrg: (source: string): Promise<{ octets?: Uint8Array; raison?: string }> =>
    ipcRenderer.invoke(IPC.fabriquerPrg, source)
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
