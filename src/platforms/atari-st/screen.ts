import type { Memory } from '../../cpu/memory'
import { BYTES_PER_LINE, PALETTE_BASE, SCREEN_HEIGHT, SCREEN_WIDTH, VIDEO_BASE_HIGH, VIDEO_BASE_MID } from './machine'

/** Adresse de l'écran affiché, lue dans les registres du Shifter ($FF8201 / $FF8203). */
export function screenAddress(memory: Memory): number {
  return (memory.readU8(VIDEO_BASE_HIGH) << 16) | (memory.readU8(VIDEO_BASE_MID) << 8)
}

/**
 * Couleur (0-15) du pixel (x, y) en basse résolution : 4 plans de bits entrelacés, un mot par plan
 * pour chaque groupe de 16 pixels. Le pixel le plus à gauche du groupe est le bit 15.
 */
export function readPixel(memory: Memory, base: number, x: number, y: number): number {
  const groupAddress = base + y * BYTES_PER_LINE + (x >> 4) * 8
  const bit = 15 - (x & 15)
  let color = 0
  for (let plane = 0; plane < 4; plane++) {
    if ((memory.readU16(groupAddress + plane * 2) >> bit) & 1) color |= 1 << plane
  }
  return color
}

/** Décode tout l'écran basse résolution en indices de couleur (320 × 200). */
export function decodeLowRes(memory: Memory, base: number): Uint8Array {
  const pixels = new Uint8Array(SCREEN_WIDTH * SCREEN_HEIGHT)
  for (let y = 0; y < SCREEN_HEIGHT; y++) {
    for (let group = 0; group < SCREEN_WIDTH / 16; group++) {
      const address = base + y * BYTES_PER_LINE + group * 8
      const p0 = memory.readU16(address)
      const p1 = memory.readU16(address + 2)
      const p2 = memory.readU16(address + 4)
      const p3 = memory.readU16(address + 6)
      for (let i = 0; i < 16; i++) {
        const bit = 15 - i
        pixels[y * SCREEN_WIDTH + group * 16 + i] =
          ((p0 >> bit) & 1) | (((p1 >> bit) & 1) << 1) | (((p2 >> bit) & 1) << 2) | (((p3 >> bit) & 1) << 3)
      }
    }
  }
  return pixels
}

/** Convertit un registre de couleur ST ($0RGB, 3 bits par composante) en [r, g, b] 0-255. */
export function stColorToRgb(word: number): [number, number, number] {
  const c = (v: number): number => Math.round(((v & 7) * 255) / 7)
  return [c(word >> 8), c(word >> 4), c(word)]
}

export function readPalette(memory: Memory): number[] {
  return Array.from({ length: 16 }, (_, i) => memory.readU16(PALETTE_BASE + i * 2))
}
