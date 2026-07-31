import type { AssembleError } from '../shared/ipc'

const ERROR_LINE_RE = /error \d+ in line (\d+) of "[^"]*":\s*(.+)/
const LISTING_LINE_RE = /^(?:[0-9A-Fa-f]{2}:([0-9A-Fa-f]{8})\s+[0-9A-Fa-f]+)?\s*\t\s*(\d+):/

export function parseErrors(stderr: string): AssembleError[] {
  const errors: AssembleError[] = []
  for (const raw of stderr.split('\n')) {
    const match = ERROR_LINE_RE.exec(raw)
    if (match) {
      errors.push({ line: parseInt(match[1], 10), message: match[2].trim() })
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
