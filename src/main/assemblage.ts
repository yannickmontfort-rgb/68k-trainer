import { app } from 'electron'
import { existsSync, readFileSync, statSync } from 'fs'
import { isAbsolute, join, normalize, relative } from 'path'
import { assemblerSource } from '../shared/assemblage'
import { assembler } from '../asm/assembleur'
import { creerPrg, empechementPrg } from '../asm/prg'
import { creerHunk, empechementHunk } from '../asm/hunk'
import { avecDemarrageAmiga } from '../asm/demarrageAmiga'
import type { AssembleResult } from '../shared/ipc'

/**
 * Fichiers accessibles à INCLUDE et INCBIN : d'abord le dossier du source ouvert dans le bac à
 * sable (comme Devpac et vasm), puis le dossier content/fichiers de 68k Trainer (images Degas,
 * inclusions des cours). Les noms qui sortent de ces dossiers sont refusés.
 */
function dossierFichiers(): string {
  const base = app.isPackaged ? process.resourcesPath : app.getAppPath()
  return join(base, 'content', 'fichiers')
}

const estDossier = (d: string): boolean => {
  try {
    return statSync(d).isDirectory()
  } catch {
    return false
  }
}

/** Le fichier `nom` dans `racine` (sous-dossiers compris), ou null s'il n'y est pas ou en sort. */
function dans(racine: string, nom: string): string | null {
  const p = normalize(join(racine, nom.replace(/\\/g, '/').replace(/^[A-Za-z]:/, '')))
  const rel = relative(racine, p)
  return rel && !rel.startsWith('..') && !isAbsolute(rel) && existsSync(p) && !estDossier(p) ? p : null
}

function lecteurs(dossierSource?: string) {
  const racines = [...(dossierSource && estDossier(dossierSource) ? [normalize(dossierSource)] : []), dossierFichiers()]
  const chemin = (nom: string): string | null => {
    for (const r of racines) {
      const p = dans(r, nom)
      if (p) return p
    }
    return null
  }
  return {
    lireTexte: (nom: string): string | null => {
      const p = chemin(nom)
      if (!p) return null
      // Comme à l'ouverture dans le bac à sable : UTF-8, sinon Latin-1
      const octets = readFileSync(p)
      try {
        return new TextDecoder('utf-8', { fatal: true }).decode(octets)
      } catch {
        return new TextDecoder('latin1').decode(octets)
      }
    },
    lireBinaire: (nom: string): Uint8Array | null => {
      const p = chemin(nom)
      return p ? new Uint8Array(readFileSync(p)) : null
    }
  }
}

export function assemblerDansApplication(source: string, dossierSource?: string): AssembleResult {
  return assemblerSource(source, lecteurs(dossierSource))
}

/**
 * Fabrique un .PRG (Atari) ou un exécutable AmigaDOS (INCLUDE et INCBIN compris), ou dit pourquoi
 * c'est impossible.
 */
export function fabriquerPrg(
  source: string,
  format: 'prg' | 'hunk' = 'prg',
  dossierSource?: string
): { octets?: Uint8Array; raison?: string } {
  const r = assembler(source, { ...lecteurs(dossierSource), prg: true })
  const raison = format === 'hunk' ? empechementHunk(r) : empechementPrg(r)
  if (raison) {
    const premiere = r.erreurs[0]
    return { raison: premiere ? `${raison}\nLigne ${premiere.ligne} : ${premiere.message}` : raison }
  }
  if (format === 'prg') return { octets: creerPrg(r) }
  // Amiga : le code de démarrage (Shell ou icône du Workbench) est ajouté devant le programme
  const exe = assembler(avecDemarrageAmiga(source), { ...lecteurs(dossierSource), prg: true })
  if (!exe.ok) return { raison: 'Export impossible : ' + (exe.erreurs[0]?.message ?? 'erreur inconnue') }
  return { octets: creerHunk(exe) }
}
