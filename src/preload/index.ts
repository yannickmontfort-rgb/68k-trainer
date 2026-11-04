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
  type RomPublique,
  type ResultatProfil
} from '../shared/ipc'

const api = {
  assemble: (source: string, dossier?: string): Promise<AssembleResult> =>
    ipcRenderer.invoke(IPC.assemble, { source, dossier } satisfies AssembleRequest),
  loadProgress: (): Promise<ProgressState> => ipcRenderer.invoke(IPC.loadProgress),
  saveProgress: (state: ProgressState): Promise<void> => ipcRenderer.invoke(IPC.saveProgress, state),
  loadContent: (langue: 'fr' | 'en' = 'fr'): Promise<ContentBundle> => ipcRenderer.invoke(IPC.loadContent, langue),
  getBuildInfo: (): Promise<BuildInfo> => ipcRenderer.invoke(IPC.getBuildInfo),
  /** Langue de l'interface, pour les textes du processus principal (dialogues, erreurs). */
  definirLangue: (langue: 'fr' | 'en'): Promise<void> => ipcRenderer.invoke(IPC.definirLangue, langue),
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
  ouvrirSource: (machine: 'atari' | 'amiga'): Promise<{ ok: boolean; chemin?: string; texte?: string }> =>
    ipcRenderer.invoke(IPC.ouvrirSource, machine),
  enregistrerSource: (
    texte: string,
    chemin: string | null,
    machine: 'atari' | 'amiga',
    nom: string
  ): Promise<{ ok: boolean; chemin?: string }> => ipcRenderer.invoke(IPC.enregistrerSource, texte, chemin, machine, nom),
  fabriquerPrg: (source: string, format: 'prg' | 'hunk' = 'prg', dossier?: string): Promise<{ octets?: Uint8Array; raison?: string }> =>
    ipcRenderer.invoke(IPC.fabriquerPrg, source, format, dossier),
  exporterPdf: (html: string, nom: string): Promise<{ ok: boolean; chemin?: string }> =>
    ipcRenderer.invoke(IPC.exporterPdf, html, nom),
  emulateursEtat: (): Promise<EtatEmulateurPublic[]> => ipcRenderer.invoke(IPC.emulateursEtat),
  emulateurInstaller: (id: 'hatari' | 'winuae'): Promise<{ ok: boolean; erreur?: string }> => ipcRenderer.invoke(IPC.emulateurInstaller, id),
  emulateurDesinstaller: (id: 'hatari' | 'winuae'): Promise<void> => ipcRenderer.invoke(IPC.emulateurDesinstaller, id),
  emulateurLancer: (id: 'hatari' | 'winuae'): Promise<{ ok: boolean; erreur?: string }> => ipcRenderer.invoke(IPC.emulateurLancer, id),
  emulateurEssayer: (
    id: 'hatari' | 'winuae',
    source: string,
    nom: string,
    dossier?: string
  ): Promise<{ ok: boolean; erreur?: string; chemin?: string; manuel?: boolean }> => ipcRenderer.invoke(IPC.emulateurEssayer, id, source, nom, dossier),
  romsEtat: (): Promise<Partial<Record<'atari' | 'amiga', RomPublique>>> => ipcRenderer.invoke(IPC.romsEtat),
  romChoisir: (machine: 'atari' | 'amiga'): Promise<{ ok: boolean; erreur?: string; nom?: string }> => ipcRenderer.invoke(IPC.romChoisir, machine),
  romAdfChoisir: (): Promise<{ ok: boolean; erreur?: string }> => ipcRenderer.invoke(IPC.romAdfChoisir),
  romUtiliser: (machine: 'atari' | 'amiga', actif: boolean): Promise<void> => ipcRenderer.invoke(IPC.romUtiliser, machine, actif),
  romRetirer: (machine: 'atari' | 'amiga'): Promise<void> => ipcRenderer.invoke(IPC.romRetirer, machine),
  ouvrirPartage: (machine: 'atari' | 'amiga'): Promise<string> => ipcRenderer.invoke(IPC.ouvrirPartage, machine),
  surProgressionEmulateur: (rappel: (p: { id: string; fait: number; total: number; etape: string }) => void): (() => void) => {
    const f = (_e: unknown, p: { id: string; fait: number; total: number; etape: string }): void => rappel(p)
    ipcRenderer.on(IPC.emulateurProgression, f)
    return () => ipcRenderer.removeListener(IPC.emulateurProgression, f)
  },
  /** Fin d'un programme lancé par « Essayer dans Hatari / WinUAE » : code de retour et texte affiché. */
  surFinEssai: (rappel: (f: { id: string; nom: string; code: number; sortie?: string }) => void): (() => void) => {
    const f = (_e: unknown, fin: { id: string; nom: string; code: number; sortie?: string }): void => rappel(fin)
    ipcRenderer.on(IPC.emulateurFin, f)
    return () => ipcRenderer.removeListener(IPC.emulateurFin, f)
  }
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
