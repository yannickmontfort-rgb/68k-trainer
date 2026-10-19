/**
 * vasm, l'assembleur de référence, utilisé uniquement par les tests (oracle de comparaison) :
 * il n'est plus livré avec l'application.
 */
import { spawnSync } from 'child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

export const VASM = join(__dirname, '../../tools/vasmm68k_mot.exe')

const SECTION_RE = /^\s*(?:SECTION\s+)?(TEXT|DATA|BSS)\s*(?:[;*].*)?$/i
const ORG_RE = /^(?:\S+:?)?\s+ORG\b/i

/**
 * Comme le faisait l'application du temps de vasm : sans ORG, le programme est placé en $1000
 * (vasm -Fbin l'exige) et les directives de section sont neutralisées.
 */
export function prepareSource(source: string): { source: string; lineOffset: number } {
  const lines = source.split(/\r?\n/).map((l) => (SECTION_RE.test(l) ? '; ' + l : l))
  if (lines.some((l) => ORG_RE.test(l))) return { source: lines.join('\n'), lineOffset: 0 }
  return { source: '    ORG $1000\n' + lines.join('\n'), lineOffset: 1 }
}
export const vasmDisponible = existsSync(VASM)

export interface ResultatVasm {
  ok: boolean
  binaire: Uint8Array
  /** Lignes (à partir de 1) signalées en erreur. */
  lignesErreur: number[]
  sortie: string
  /** Octets par ligne, d'après le listing. */
  octetsParLigne: Map<number, string>
}

/** Assemble avec vasm en mode Devpac, sortie binaire à plat (`format` : bin ou tos). */
export function vasm(source: string, format: 'bin' | 'tos' = 'bin', options: string[] = []): ResultatVasm {
  const dir = mkdtempSync(join(tmpdir(), '68k-vasm-'))
  try {
    const src = join(dir, 'p.s')
    const bin = join(dir, 'p.bin')
    const lst = join(dir, 'p.lst')
    writeFileSync(src, source, 'utf-8')
    const args = [format === 'bin' ? '-Fbin' : '-Ftos', '-m68000', '-devpac', ...options, '-quiet', '-o', bin, '-L', lst, src]
    const r = spawnSync(VASM, args, { encoding: 'utf-8' })
    const sortie = (r.stdout ?? '') + (r.stderr ?? '')
    const lignesErreur = [...sortie.matchAll(/error \d+ in line (\d+) of "[^"]*"/g)].map((m) => +m[1])
    if (/error \d+:/.test(sortie) && lignesErreur.length === 0) lignesErreur.push(0)
    const ok = existsSync(bin) && lignesErreur.length === 0
    const octetsParLigne = new Map<number, string>()
    if (existsSync(lst)) {
      let derniere = 0
      for (const l of readFileSync(lst, 'utf-8').split('\n')) {
        const m = /^[0-9A-F]{2}:[0-9A-F]{8} ([0-9A-F]+) *(?:\t *(\d+):)?/.exec(l)
        if (!m) continue
        if (m[2]) derniere = +m[2]
        octetsParLigne.set(derniere, (octetsParLigne.get(derniere) ?? '') + m[1])
      }
    }
    return { ok, binaire: ok ? new Uint8Array(readFileSync(bin)) : new Uint8Array(), lignesErreur, sortie, octetsParLigne }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}
