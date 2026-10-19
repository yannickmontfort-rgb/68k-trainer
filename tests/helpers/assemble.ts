/**
 * Assemble un source pour les tests, avec l'assembleur maison (comme l'application).
 * vasm ne sert plus qu'aux tests de comparaison (tests/helpers/vasm.ts).
 */
import { assemblerSource } from '../../src/shared/assemblage'

export interface TestAssembleResult {
  success: boolean
  binary: Uint8Array
  baseAddress: number
  addressToLine: Record<number, number>
  errors: { line: number; message: string; column?: number; length?: number }[]
  warnings: { line: number; message: string }[]
}

export function assemble(source: string): TestAssembleResult {
  const r = assemblerSource(source)
  return {
    success: r.success,
    binary: r.binary ?? new Uint8Array(),
    baseAddress: r.baseAddress ?? 0,
    addressToLine: r.addressToLine ?? {},
    errors: r.errors,
    warnings: r.warnings ?? []
  }
}
