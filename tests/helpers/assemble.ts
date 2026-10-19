/**
 * Assemble un source pour les tests, avec l'assembleur maison (comme l'application).
 * vasm ne sert plus qu'aux tests de comparaison (tests/helpers/vasm.ts).
 */
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { assemblerSource } from '../../src/shared/assemblage'

/** Comme dans l'application : INCLUDE et INCBIN lisent le dossier content/fichiers. */
const FICHIERS = join(__dirname, '..', '..', 'content', 'fichiers')
const chemin = (nom: string): string | null => {
  const p = join(FICHIERS, nom.replace(/\\/g, '/'))
  return existsSync(p) ? p : null
}

export interface TestAssembleResult {
  success: boolean
  binary: Uint8Array
  baseAddress: number
  addressToLine: Record<number, number>
  errors: { line: number; message: string; column?: number; length?: number }[]
  warnings: { line: number; message: string }[]
}

export function assemble(source: string): TestAssembleResult {
  const r = assemblerSource(source, {
    lireTexte: (nom) => {
      const p = chemin(nom)
      return p ? readFileSync(p, 'utf-8') : null
    },
    lireBinaire: (nom) => {
      const p = chemin(nom)
      return p ? new Uint8Array(readFileSync(p)) : null
    }
  })
  return {
    success: r.success,
    binary: r.binary ?? new Uint8Array(),
    baseAddress: r.baseAddress ?? 0,
    addressToLine: r.addressToLine ?? {},
    errors: r.errors,
    warnings: r.warnings ?? []
  }
}
