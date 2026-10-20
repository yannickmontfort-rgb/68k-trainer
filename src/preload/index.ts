import { contextBridge, ipcRenderer } from 'electron'
import {
  IPC,
  type AssembleRequest,
  type AssembleResult,
  type BuildInfo,
  type ContentBundle,
  type EtatEmulateurPublic,
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
  creerProfil: (nom: string, motDePasse?: string, progression?: ProgressState): Promise<ResultatProfil> =>
    ipcRenderer.invoke(IPC.creerProfil, nom, motDePasse, progression),
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
  enregistrerPrg: (octets: Uint8Array, nom: string, format: 'prg' | 'hunk' = 'prg'): Promise<{ ok: boolean; chemin?: string }> =>
    ipcRenderer.invoke(IPC.enregistrerPrg, octets, nom, format),
  fabriquerPrg: (source: string, format: 'prg' | 'hunk' = 'prg'): Promise<{ octets?: Uint8Array; raison?: string }> =>
    ipcRenderer.invoke(IPC.fabriquerPrg, source, format),
  exporterPdf: (html: string, nom: string): Promise<{ ok: boolean; chemin?: string }> =>
    ipcRenderer.invoke(IPC.exporterPdf, html, nom),
  emulateursEtat: (): Promise<EtatEmulateurPublic[]> => ipcRenderer.invoke(IPC.emulateursEtat),
  emulateurInstaller: (id: 'hatari' | 'winuae'): Promise<{ ok: boolean; erreur?: string }> => ipcRenderer.invoke(IPC.emulateurInstaller, id),
  emulateurDesinstaller: (id: 'hatari' | 'winuae'): Promise<void> => ipcRenderer.invoke(IPC.emulateurDesinstaller, id),
  emulateurLancer: (id: 'hatari' | 'winuae'): Promise<{ ok: boolean; erreur?: string }> => ipcRenderer.invoke(IPC.emulateurLancer, id),
  emulateurEssayer: (id: 'hatari' | 'winuae', source: string, nom: string): Promise<{ ok: boolean; erreur?: string; chemin?: string }> =>
    ipcRenderer.invoke(IPC.emulateurEssayer, id, source, nom),
  ouvrirPartage: (machine: 'atari' | 'amiga'): Promise<string> => ipcRenderer.invoke(IPC.ouvrirPartage, machine),
  surProgressionEmulateur: (rappel: (p: { id: string; fait: number; total: number; etape: string }) => void): (() => void) => {
    const f = (_e: unknown, p: { id: string; fait: number; total: number; etape: string }): void => rappel(p)
    ipcRenderer.on(IPC.emulateurProgression, f)
    return () => ipcRenderer.removeListener(IPC.emulateurProgression, f)
  }
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
