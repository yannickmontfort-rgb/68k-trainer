import type { Cpu } from '../../cpu/cpu'
import type { Platform } from '../../cpu/platform'

/** 16 couleurs, 1 word chacune, à partir de $FF8240 (voir content/courses/atari-st/trap-et-systeme.md). */
const PALETTE_BASE = 0xff8240
const PALETTE_COLOR_COUNT = 16
const PALETTE_END = PALETTE_BASE + PALETTE_COLOR_COUNT * 2 // exclusif

/**
 * Sur le matériel ST réel (STF), un registre de couleur ne code que 3 bits par composante RVB
 * (0RRR0GGG0BBB) — les autres bits sont ignorés par la puce Shifter, quelle que soit la valeur
 * écrite. Confirmé par le cours (trap-et-systeme.md) : $700 = rouge pur, $070 = vert pur.
 */
const PALETTE_RGB_MASK = 0x0777

/**
 * AST-1 — palette couleurs Atari ST ($FF8240-$FF825E). N'importe quelle écriture dans cette plage
 * est immédiatement "corrigée" en mémoire pour ne garder que les bits réellement significatifs sur
 * le matériel réel, exactement comme le ferait un vrai ST.
 */
export function createAtariStPalette(): Platform {
  return {
    onMemoryWrite(cpu: Cpu, address: number): void {
      if (address < PALETTE_BASE || address >= PALETTE_END) return
      const registerAddress = address - ((address - PALETTE_BASE) % 2)
      const raw = cpu.memory.readU16(registerAddress)
      const masked = raw & PALETTE_RGB_MASK
      if (masked !== raw) cpu.memory.writeU16(registerAddress, masked)
    }
  }
}
