import type { Cpu } from '../cpu/cpu'
import type { Platform } from '../cpu/platform'
import type { Size } from '../cpu/types'

/**
 * Assemble plusieurs blocs de plateforme en une seule `Platform`. Pour les hooks qui renvoient un
 * booléen, le premier bloc qui répond `true` gagne ; `onMemoryWrite` et `onReset` sont appelés sur
 * tous les blocs, dans l'ordre.
 */
export function combinePlatforms(...blocks: Platform[]): Platform {
  return {
    onTrap: (cpu: Cpu, n: number) => blocks.some((b) => b.onTrap?.(cpu, n) ?? false),
    onLineA: (cpu: Cpu, opcode: number) => blocks.some((b) => b.onLineA?.(cpu, opcode) ?? false),
    onJsr: (cpu: Cpu, target: number) => blocks.some((b) => b.onJsr?.(cpu, target) ?? false),
    isBusError: (cpu: Cpu, address: number, write: boolean) =>
      blocks.some((b) => b.isBusError?.(cpu, address, write) ?? false),
    onMemoryWrite: (cpu: Cpu, address: number, size: Size, value: number) => {
      for (const b of blocks) b.onMemoryWrite?.(cpu, address, size, value)
    },
    onReset: (cpu: Cpu) => {
      for (const b of blocks) b.onReset?.(cpu)
    }
  }
}
