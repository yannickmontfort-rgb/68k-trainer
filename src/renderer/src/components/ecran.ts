import type { Cpu } from '../../../cpu/cpu'
import { SCREEN_HEIGHT, SCREEN_WIDTH } from '../../../platforms/atari-st/machine'
import { decodeLowRes, readPalette, screenAddress, stColorToRgb } from '../../../platforms/atari-st/screen'
import { materielAtari } from '../../../platforms/atari-st/materiel'
import { CODE_PC, toucheSt } from '../../../platforms/atari-st/clavier'
import { JOY } from '../../../platforms/atari-st/ikbd'

/** Touches du PC qui pilotent le joystick 1 en mode joystick. */
const JOY_PC: Record<string, number> = {
  ArrowUp: JOY.haut,
  ArrowDown: JOY.bas,
  ArrowLeft: JOY.gauche,
  ArrowRight: JOY.droite,
  Space: JOY.feu
}

/**
 * Aperçu de l'écran Atari ST en basse résolution (320 × 200, 16 couleurs), dessiné à partir de la
 * mémoire vidéo simulée et de la palette ($FF8240) — ligne par ligne quand la palette change en
 * cours de trame (rasters). Quand il a le focus, l'écran envoie les touches du PC au ST simulé ;
 * en mode joystick, les flèches et Espace pilotent le joystick 1 (une manette du PC aussi).
 */
export class EcranAtari {
  readonly element: HTMLDivElement
  private readonly canvas: HTMLCanvasElement
  private readonly ctx: CanvasRenderingContext2D
  private readonly image: ImageData
  private readonly modeJoystick: HTMLInputElement
  private cpu: Cpu | null = null
  private joyClavier = 0
  private joyManette = 0

  constructor() {
    this.element = document.createElement('div')
    this.element.className = 'ecran-atari-bloc'
    this.canvas = document.createElement('canvas')
    this.canvas.width = SCREEN_WIDTH
    this.canvas.height = SCREEN_HEIGHT
    this.canvas.className = 'ecran-atari'
    this.canvas.tabIndex = 0
    this.canvas.title = 'Écran Atari ST simulé (basse résolution 320 × 200). Clique dessus pour taper au clavier du ST.'
    this.ctx = this.canvas.getContext('2d')!
    this.image = this.ctx.createImageData(SCREEN_WIDTH, SCREEN_HEIGHT)
    const options = document.createElement('label')
    options.className = 'ecran-options'
    options.title = 'Les flèches et Espace pilotent le joystick 1 au lieu du clavier (une manette branchée sur le PC marche toujours)'
    options.innerHTML = '<input type="checkbox" /> 🕹 Flèches + Espace = joystick'
    this.modeJoystick = options.querySelector('input')!
    this.element.append(this.canvas, options)
    this.canvas.addEventListener('keydown', (e) => this.clavier(e, true))
    this.canvas.addEventListener('keyup', (e) => this.clavier(e, false))
    this.canvas.addEventListener('blur', () => {
      this.joyClavier = 0
      this.envoyerJoystick()
    })
  }

  private clavier(e: KeyboardEvent, enfoncee: boolean): void {
    const cpu = this.cpu
    if (!cpu || !materielAtari(cpu)) return
    if (this.modeJoystick.checked && JOY_PC[e.code]) {
      this.joyClavier = enfoncee ? this.joyClavier | JOY_PC[e.code] : this.joyClavier & ~JOY_PC[e.code]
      this.envoyerJoystick()
    } else {
      const code = CODE_PC[e.code]
      if (code === undefined || (enfoncee && e.repeat)) return
      toucheSt(cpu, code, enfoncee, e.key.length === 1 ? e.key : e.key === 'Escape' ? '\x1b' : e.key === 'Enter' ? '\r' : undefined, e.shiftKey)
    }
    e.preventDefault()
  }

  private envoyerJoystick(): void {
    if (this.cpu) materielAtari(this.cpu)?.ikbd.joystick(1, this.joyClavier | this.joyManette)
  }

  /** Manette du PC (API Gamepad) : croix ou stick gauche + bouton A. */
  private lireManette(): void {
    const pads = typeof navigator.getGamepads === 'function' ? navigator.getGamepads() : []
    const pad = [...pads].find((p) => p)
    if (!pad) return
    const b = (i: number): boolean => pad.buttons[i]?.pressed ?? false
    const [x = 0, y = 0] = pad.axes
    let etat = 0
    if (b(12) || y < -0.5) etat |= JOY.haut
    if (b(13) || y > 0.5) etat |= JOY.bas
    if (b(14) || x < -0.5) etat |= JOY.gauche
    if (b(15) || x > 0.5) etat |= JOY.droite
    if (b(0) || b(1)) etat |= JOY.feu
    if (etat !== this.joyManette) {
      this.joyManette = etat
      this.envoyerJoystick()
    }
  }

  draw(cpu: Cpu): void {
    if (cpu !== this.cpu) {
      this.cpu = cpu
      this.joyClavier = this.joyManette = 0
    }
    this.lireManette()
    const pixels = decodeLowRes(cpu.memory, screenAddress(cpu.memory))
    const parLigne = materielAtari(cpu)?.palettesParLigne() ?? null
    const courante = readPalette(cpu.memory).map(stColorToRgb)
    const data = this.image.data
    let palette = courante
    for (let y = 0; y < SCREEN_HEIGHT; y++) {
      if (parLigne) palette = Array.from(parLigne.subarray(y * 16, y * 16 + 16), stColorToRgb)
      for (let x = 0; x < SCREEN_WIDTH; x++) {
        const i = y * SCREEN_WIDTH + x
        const [r, g, b] = palette[pixels[i]]
        data[i * 4] = r
        data[i * 4 + 1] = g
        data[i * 4 + 2] = b
        data[i * 4 + 3] = 255
      }
    }
    this.ctx.putImageData(this.image, 0, 0)
  }
}
