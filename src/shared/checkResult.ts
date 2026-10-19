import type { Cpu } from '../cpu/cpu'
import type { CpuSnapshot } from '../cpu/types'
import type { ExerciseCheck } from './ipc'
import { readPixel, screenAddress } from '../platforms/atari-st/screen'
import { materielAtari } from '../platforms/atari-st/materiel'

export interface CheckResult {
  success: boolean
  message: string
}

function readRegister(snap: CpuSnapshot, key: string): number {
  if (key === 'PC') return snap.pc
  if (key === 'SR') return snap.sr
  if (/^[XNZVC]$/.test(key)) return snap.flags[key.toLowerCase() as keyof CpuSnapshot['flags']] ? 1 : 0
  const index = parseInt(key.slice(1), 10)
  if (key[0] === 'D') return snap.d[index]
  if (key[0] === 'A') return snap.a[index]
  throw new Error(`Registre inconnu dans le corrigé : ${key}`)
}

/** Parse une clé "memory" du type "$FF8240", "$FF8240.B" ou "$FF8240.L" (".W" par défaut). */
function parseMemoryKey(key: string): { address: number; size: 1 | 2 | 4 } {
  const match = key.match(/^\$([0-9A-Fa-f]+)(?:\.([BWL]))?$/)
  if (!match) throw new Error(`Clé mémoire invalide dans le corrigé : ${key}`)
  const address = parseInt(match[1], 16)
  const size = match[2] === 'B' ? 1 : match[2] === 'L' ? 4 : 2
  return { address, size }
}

function readMemory(cpu: Cpu, key: string): number {
  const { address, size } = parseMemoryKey(key)
  if (size === 1) return cpu.memory.readU8(address)
  if (size === 2) return cpu.memory.readU16(address)
  return cpu.memory.readU32(address)
}

/**
 * Compare l'état d'un `Cpu` (déjà exécuté jusqu'à HALT ou `maxSteps`) au résultat attendu d'un
 * exercice. Logique pure, sans IPC ni assemblage — c'est `checker.ts` (renderer) qui s'occupe
 * d'assembler et d'exécuter avant d'appeler cette fonction.
 */
export function evaluateCheck(cpu: Cpu, check: ExerciseCheck): CheckResult {
  if (check.terminer && !cpu.halted) {
    return {
      success: false,
      message:
        `Le programme ne s'est pas terminé : il tournait encore après ${check.maxSteps} instructions. ` +
        'As-tu oublié la fin (Pterm0) ? La pile est-elle équilibrée avant RTS ?'
    }
  }
  if (check.type === 'output') {
    const sansCR = (s: string): string => s.replace(/\r/g, '')
    const expectedOutput = sansCR(check.expected.output ?? '')
    const actual = sansCR(cpu.output)
    if (actual !== expectedOutput) {
      return { success: false, message: `Sortie attendue : "${expectedOutput}"\nSortie obtenue : "${actual}"` }
    }
    return { success: true, message: 'Bravo, la sortie correspond !' }
  }

  if (check.type === 'pixels') {
    const base = screenAddress(cpu.memory)
    const mismatches: string[] = []
    for (const [key, expectedColor] of Object.entries(check.expected)) {
      const [x, y] = key.split(',').map((v) => parseInt(v, 10))
      const actual = readPixel(cpu.memory, base, x, y)
      if (actual !== parseInt(expectedColor, 10)) {
        mismatches.push(`Pixel (${x}, ${y}) : couleur ${expectedColor} attendue, couleur ${actual} obtenue`)
      }
    }
    if (mismatches.length > 0) return { success: false, message: mismatches.join('\n') }
    return { success: true, message: 'Bravo, l’écran est exactement comme prévu !' }
  }

  if (check.type === 'son') {
    const registres = materielAtari(cpu)?.psg.etat.registres
    const ecarts: string[] = []
    for (const [cle, attendu] of Object.entries(check.expected)) {
      const r = parseInt(cle.slice(1), 10)
      const valeur = registres?.[r] ?? 0
      if (valeur !== parseInt(attendu.replace('$', ''), 16)) {
        ecarts.push(`Registre ${r} du YM2149 : ${attendu} attendu, $${valeur.toString(16).toUpperCase().padStart(2, '0')} obtenu`)
      }
    }
    if (ecarts.length > 0) return { success: false, message: ecarts.join('\n') }
    return { success: true, message: 'Bravo, la puce sonore est réglée comme prévu !' }
  }

  const snap = cpu.getSnapshot()
  const mismatches: string[] = []
  for (const [key, expectedHex] of Object.entries(check.expected)) {
    const expected = parseInt(expectedHex.replace('$', ''), 16) >>> 0
    const actual = check.type === 'memory' ? readMemory(cpu, key) : readRegister(snap, key)
    if (actual !== expected) {
      if (/^[XNZVC]$/.test(key)) mismatches.push(`Flag ${key} attendu à ${expected}, obtenu ${actual}`)
      else mismatches.push(`${key} attendu ${expectedHex}, obtenu $${actual.toString(16).padStart(8, '0').toUpperCase()}`)
    }
  }
  if (mismatches.length > 0) return { success: false, message: mismatches.join('\n') }
  return {
    success: true,
    message: check.type === 'memory' ? 'Bravo, la mémoire correspond !' : 'Bravo, tous les registres correspondent !'
  }
}
