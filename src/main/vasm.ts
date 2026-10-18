import { app } from 'electron'
import { spawn } from 'child_process'
import { mkdtemp, readFile, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import type { AssembleResult } from '../shared/ipc'
import { VASM_ARGS, parseErrors, parseListing } from './vasmParse'

function getVasmPath(): string {
  const base = app.isPackaged ? process.resourcesPath : app.getAppPath()
  return join(base, 'tools', 'vasmm68k_mot.exe')
}

export async function assembleWithVasm(source: string): Promise<AssembleResult> {
  const dir = await mkdtemp(join(tmpdir(), '68k-trainer-'))
  const srcPath = join(dir, 'program.s')
  const binPath = join(dir, 'program.bin')
  const lstPath = join(dir, 'program.lst')

  try {
    await writeFile(srcPath, source, 'utf-8')

    const stderr = await new Promise<string>((resolve, reject) => {
      const proc = spawn(getVasmPath(), [...VASM_ARGS, '-o', binPath, '-L', lstPath, srcPath])
      let stderrData = ''
      proc.stderr.on('data', (chunk) => (stderrData += chunk.toString()))
      proc.on('error', reject)
      proc.on('close', () => resolve(stderrData))
    })

    const errors = parseErrors(stderr, source)
    if (errors.length > 0) {
      return { success: false, errors }
    }

    let binary: Buffer
    let listing: string
    try {
      ;[binary, listing] = await Promise.all([readFile(binPath), readFile(lstPath, 'utf-8')])
    } catch {
      const detail = stderr.trim().split(/\r?\n/).pop() ?? ''
      return { success: false, errors: [{ line: 0, message: "L'assemblage a échoué.", original: detail }] }
    }
    const { baseAddress, addressToLine } = parseListing(listing)

    return {
      success: true,
      binary: new Uint8Array(binary),
      baseAddress,
      addressToLine,
      errors: []
    }
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}
