/**
 * Les extraits de code des cours (blocs ```asm des fichiers .md du parcours) sont des fragments :
 * ils ne s'exécutent pas seuls, mais ils doivent au moins être de l'assembleur 68000 valide.
 * On les assemble avec vasm en tolérant uniquement les symboles non définis (étiquettes du
 * contexte, comme TABLE ou ROUTINE).
 */
import { readdirSync, readFileSync, statSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import { assemble } from './helpers/assemble'

const RACINE = join(__dirname, '..', 'content', 'parcours')

function fichiersMarkdown(dir: string): string[] {
  return readdirSync(dir).flatMap((nom) => {
    const chemin = join(dir, nom)
    if (statSync(chemin).isDirectory()) return fichiersMarkdown(chemin)
    return nom.endsWith('.md') && nom !== 'README.md' ? [chemin] : []
  })
}

describe('extraits de code des cours', () => {
  for (const fichier of fichiersMarkdown(RACINE)) {
    const blocs = [...readFileSync(fichier, 'utf-8').replace(/\r\n/g, '\n').matchAll(/```asm\n([\s\S]*?)```/g)].map((m) => m[1])
    blocs.forEach((bloc, i) => {
      it(`${fichier.slice(RACINE.length + 1)} — extrait ${i + 1}`, () => {
        const asm = assemble(bloc)
        const vraies = asm.errors.filter((e) => !/n'est défini nulle part/.test(e.message))
        expect(vraies, JSON.stringify(vraies)).toEqual([])
      })
    })
  }
})
