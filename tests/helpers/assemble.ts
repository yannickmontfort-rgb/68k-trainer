import { spawnSync } from 'child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { parseErrors, parseListing } from '../../src/main/vasmParse'

const VASM_PATH = join(__dirname, '../../tools/vasmm68k_mot.exe')

export interface TestAssembleResult {
  success: boolean
  binary: Uint8Array
  baseAddress: number
  addressToLine: Record<number, number>
  errors: { line: number; message: string }[]
}

export function assemble(source: string): TestAssembleResult {
  const dir = mkdtempSync(join(tmpdir(), '68k-trainer-test-'))
  const srcPath = join(dir, 'program.s')
  const binPath = join(dir, 'program.bin')
  const lstPath = join(dir, 'program.lst')
  try {
    writeFileSync(srcPath, source, 'utf-8')
    const result = spawnSync(VASM_PATH, ['-Fbin', '-o', binPath, '-L', lstPath, srcPath])
    const stderr = result.stderr?.toString() ?? ''
    const errors = parseErrors(stderr)
    if (errors.length > 0) {
      return { success: false, binary: new Uint8Array(), baseAddress: 0, addressToLine: {}, errors }
    }
    const binary = new Uint8Array(readFileSync(binPath))
    const listing = readFileSync(lstPath, 'utf-8')
    const { baseAddress, addressToLine } = parseListing(listing)
    return { success: true, binary, baseAddress: baseAddress ?? 0, addressToLine, errors: [] }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}
