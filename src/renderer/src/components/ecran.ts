import type { Cpu } from '../../../cpu/cpu'
import { SCREEN_HEIGHT, SCREEN_WIDTH } from '../../../platforms/atari-st/machine'
import { decodeLowRes, readPalette, screenAddress, stColorToRgb } from '../../../platforms/atari-st/screen'

/**
 * Aperçu de l'écran Atari ST en basse résolution (320 × 200, 16 couleurs), dessiné à partir de la
 * mémoire vidéo simulée et de la palette ($FF8240). Affiché à l'échelle 2 avec des pixels nets.
 */
export class EcranAtari {
  readonly element: HTMLCanvasElement
  private readonly ctx: CanvasRenderingContext2D
  private readonly image: ImageData

  constructor() {
    this.element = document.createElement('canvas')
    this.element.width = SCREEN_WIDTH
    this.element.height = SCREEN_HEIGHT
    this.element.className = 'ecran-atari'
    this.element.title = 'Écran Atari ST simulé (basse résolution 320 × 200)'
    this.ctx = this.element.getContext('2d')!
    this.image = this.ctx.createImageData(SCREEN_WIDTH, SCREEN_HEIGHT)
  }

  draw(cpu: Cpu): void {
    const pixels = decodeLowRes(cpu.memory, screenAddress(cpu.memory))
    const palette = readPalette(cpu.memory).map(stColorToRgb)
    const data = this.image.data
    for (let i = 0; i < pixels.length; i++) {
      const [r, g, b] = palette[pixels[i]]
      data[i * 4] = r
      data[i * 4 + 1] = g
      data[i * 4 + 2] = b
      data[i * 4 + 3] = 255
    }
    this.ctx.putImageData(this.image, 0, 0)
  }
}
