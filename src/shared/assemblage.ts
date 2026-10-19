/**
 * Pont entre l'assembleur maison (src/asm) et le reste de l'application : même forme de résultat
 * que du temps de vasm (`AssembleResult`), plus la colonne des erreurs et les avertissements.
 */
import { assembler, type OptionsAssemblage } from '../asm/assembleur'
import type { AssembleResult } from './ipc'

export function assemblerSource(source: string, options: OptionsAssemblage = {}): AssembleResult {
  const r = assembler(source, options)
  const convertir = (d: { ligne: number; message: string; colonne?: number; longueur?: number }) => ({
    line: d.ligne,
    message: d.message,
    column: d.colonne,
    length: d.longueur
  })
  if (!r.ok) return { success: false, errors: r.erreurs.map(convertir), warnings: r.avertissements.map(convertir) }
  return {
    success: true,
    binary: r.binaire,
    baseAddress: r.base,
    addressToLine: r.adresseVersLigne,
    errors: [],
    warnings: r.avertissements.map(convertir)
  }
}
