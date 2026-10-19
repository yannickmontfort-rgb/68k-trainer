import { app } from 'electron'
import { existsSync, readFileSync } from 'fs'
import { join, normalize } from 'path'
import { assemblerSource } from '../shared/assemblage'
import type { AssembleResult } from '../shared/ipc'

/**
 * Fichiers accessibles à INCLUDE et INCBIN depuis l'application : le dossier content/fichiers
 * (images Degas, inclusions d'exemple). Les noms qui sortent de ce dossier sont refusés.
 */
function dossierFichiers(): string {
  const base = app.isPackaged ? process.resourcesPath : app.getAppPath()
  return join(base, 'content', 'fichiers')
}

function chemin(nom: string): string | null {
  const racine = dossierFichiers()
  const p = normalize(join(racine, nom.replace(/\\/g, '/').replace(/^[A-Za-z]:/, '')))
  return p.startsWith(racine) && existsSync(p) ? p : null
}

export function assemblerDansApplication(source: string): AssembleResult {
  return assemblerSource(source, {
    lireTexte: (nom) => {
      const p = chemin(nom)
      return p ? readFileSync(p, 'utf-8') : null
    },
    lireBinaire: (nom) => {
      const p = chemin(nom)
      return p ? new Uint8Array(readFileSync(p)) : null
    }
  })
}
