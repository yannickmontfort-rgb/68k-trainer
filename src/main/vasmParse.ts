import type { AssembleError } from '../shared/ipc'
import { explainVasmError } from '../shared/vasmMessages'

const ERROR_LINE_RE = /error \d+ in line (\d+) of "[^"]*":\s*(.+)/
// Certaines erreurs (symbole non défini) sont signalées après coup, sans numéro de ligne
const ERROR_NO_LINE_RE = /^\s*(?:fatal )?error \d+:\s*(.+)/
const LISTING_LINE_RE = /^(?:[0-9A-Fa-f]{2}:([0-9A-Fa-f]{8})\s+[0-9A-Fa-f]+)?\s*\t\s*(\d+):/

/** Arguments de vasm communs à l'application et aux tests. */
export const VASM_ARGS = ['-Fbin', '-m68000', '-noialign']

/**
 * Cherche la ligne d'un symbole non défini dans le source (vasm ne la donne pas) : première ligne
 * où le nom apparaît comme mot entier en dehors d'un commentaire.
 */
function findSymbolLine(source: string, symbol: string): number {
  const escaped = symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`(^|[^\\w.])${escaped}($|[^\\w])`, 'i')
  const lines = source.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const code = lines[i].replace(/;.*$/, '')
    if (/^\s*\*/.test(code)) continue
    if (re.test(code)) return i + 1
  }
  return 0
}

export function parseErrors(stderr: string, source = ''): AssembleError[] {
  const errors: AssembleError[] = []
  for (const raw of stderr.split('\n')) {
    let match = ERROR_LINE_RE.exec(raw)
    if (match) {
      const original = match[2].trim()
      errors.push({ line: parseInt(match[1], 10), message: explainVasmError(original), original })
      continue
    }
    match = ERROR_NO_LINE_RE.exec(raw)
    if (match) {
      const original = match[1].trim()
      const symbol = original.match(/undefined symbol <(.+)>/i)?.[1]
      const line = symbol ? findSymbolLine(source, symbol) : 0
      errors.push({ line, message: explainVasmError(original), original })
    }
  }
  return errors
}

export function parseListing(listing: string): {
  baseAddress?: number
  addressToLine: Record<number, number>
} {
  const addressToLine: Record<number, number> = {}
  let baseAddress: number | undefined
  for (const raw of listing.split('\n')) {
    const match = LISTING_LINE_RE.exec(raw)
    if (!match) continue
    const [, addrHex, lineStr] = match
    if (addrHex !== undefined) {
      const address = parseInt(addrHex, 16)
      if (baseAddress === undefined) baseAddress = address
      addressToLine[address] = parseInt(lineStr, 10)
    }
  }
  return { baseAddress, addressToLine }
}
