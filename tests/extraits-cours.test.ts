/**
 * Les extraits de code des cours (blocs ```asm des fichiers .md du parcours) sont des fragments :
 * ils ne s'exécutent pas seuls, mais ils doivent au moins être de l'assembleur 68000 valide.
 * On les assemble en tolérant uniquement les symboles non définis (étiquettes du contexte, comme
 * TABLE ou ROUTINE). Le tronc commun est vérifié dans sa version Atari et dans sa version Amiga.
 */
import { readdirSync, readFileSync, statSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import { adapterTexte, type MachineContenu } from '../src/shared/adaptation'
import { assemble } from './helpers/assemble'

const RACINE = join(__dirname, '..', 'content', 'parcours')

function fichiersMarkdown(dir: string): string[] {
  return readdirSync(dir).flatMap((nom) => {
    const chemin = join(dir, nom)
    if (statSync(chemin).isDirectory()) return fichiersMarkdown(chemin)
    return nom.endsWith('.md') && nom !== 'README.md' ? [chemin] : []
  })
}

/** Machines pour lesquelles un fichier est lu : celle de son parcours, ou les deux (tronc commun). */
function machines(fichier: string): MachineContenu[] {
  const parcours = fichier.slice(RACINE.length + 1).split(/[\\/]/)[0]
  return parcours === 'amiga' ? ['amiga'] : parcours === 'commun' ? ['atari', 'amiga'] : ['atari']
}

describe('extraits de code des cours', () => {
  for (const fichier of fichiersMarkdown(RACINE)) {
    for (const machine of machines(fichier)) {
      const texte = adapterTexte(readFileSync(fichier, 'utf-8').replace(/\r\n/g, '\n'), machine)
      const blocs = [...texte.matchAll(/```asm\n([\s\S]*?)```/g)].map((m) => m[1])
      blocs.forEach((bloc, i) => {
        it(`${fichier.slice(RACINE.length + 1)} (${machine}) — extrait ${i + 1}`, () => {
          const asm = assemble(bloc)
          const vraies = asm.errors.filter((e) => !/n'est défini nulle part/.test(e.message))
          expect(vraies, JSON.stringify(vraies)).toEqual([])
        })
      })
    }
  }
})
