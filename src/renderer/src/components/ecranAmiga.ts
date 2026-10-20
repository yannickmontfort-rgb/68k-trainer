import type { Cpu } from '../../../cpu/cpu'
import { JOY_AMIGA, materielAmiga } from '../../../platforms/amiga/chipset'
import { CODE_PC_AMIGA } from '../../../platforms/amiga/clavier'
import { ECRAN_LARGEUR, ECRAN_LARGEUR_BASSE, ECRAN_LIGNES, rgb12 } from '../../../platforms/amiga/machine'
import { activerSon, sonActif } from './son'

const JOY_PC: Record<string, number> = {
  ArrowUp: JOY_AMIGA.haut,
  ArrowDown: JOY_AMIGA.bas,
  ArrowLeft: JOY_AMIGA.gauche,
  ArrowRight: JOY_AMIGA.droite,
  Space: JOY_AMIGA.feu
}

/** Table des 4096 couleurs Amiga en RGBA (pour aller vite). */
const RGBA = new Uint32Array(4096)
for (let c = 0; c < 4096; c++) {
  const [r, g, b] = rgb12(c)
  RGBA[c] = (255 << 24) | (b << 16) | (g << 8) | r
}

/**
 * Écran de l'Amiga 500 simulé : l'image produite par Denise (avec la bordure autour de l'image
 * standard 320 × 256), en haute résolution horizontale. Quand il a le focus, il reçoit le clavier
 * du PC ; la souris du PC bouge celle de l'Amiga quand elle passe dessus (clic gauche / droit) ;
 * en mode joystick, les flèches et Espace pilotent le joystick du port 2 (une manette aussi).
 */
export class EcranAmiga {
  readonly element: HTMLDivElement
  private readonly canvas: HTMLCanvasElement
  private readonly ctx: CanvasRenderingContext2D
  private readonly image: ImageData
  private readonly pixels: Uint32Array
  private readonly modeJoystick: HTMLInputElement
  private cpu: Cpu | null = null
  private joyClavier = 0
  private joyManette = 0
  private reste = { x: 0, y: 0 }

  constructor() {
    this.element = document.createElement('div')
    this.element.className = 'ecran-atari-bloc'
    this.canvas = document.createElement('canvas')
    this.canvas.width = ECRAN_LARGEUR
    this.canvas.height = ECRAN_LIGNES
    this.canvas.className = 'ecran-atari ecran-amiga'
    this.canvas.tabIndex = 0
    this.canvas.title =
      'Écran de l’Amiga 500 simulé (PAL, avec la bordure). Clique dessus pour taper au clavier de l’Amiga ; la souris du PC y pilote celle de l’Amiga.'
    this.ctx = this.canvas.getContext('2d')!
    this.image = this.ctx.createImageData(ECRAN_LARGEUR, ECRAN_LIGNES)
    this.pixels = new Uint32Array(this.image.data.buffer)
    const options = document.createElement('label')
    options.className = 'ecran-options'
    options.title = 'Les flèches et Espace pilotent le joystick du port 2 au lieu du clavier (une manette branchée sur le PC marche toujours)'
    options.innerHTML = '<input type="checkbox" /> 🕹 Flèches + Espace = joystick'
    this.modeJoystick = options.querySelector('input')!
    const son = document.createElement('label')
    son.className = 'ecran-options'
    son.title = 'Le son de Paula, en mode Temps réel'
    son.innerHTML = '<input type="checkbox" /> 🔊 Son'
    const caseSon = son.querySelector('input')!
    caseSon.checked = sonActif()
    caseSon.addEventListener('change', () => activerSon(caseSon.checked))
    const barre = document.createElement('div')
    barre.className = 'ecran-barre'
    barre.append(options, son)
    this.element.append(this.canvas, barre)
    this.canvas.addEventListener('keydown', (e) => this.clavier(e, true))
    this.canvas.addEventListener('keyup', (e) => this.clavier(e, false))
    this.canvas.addEventListener('blur', () => {
      this.joyClavier = 0
      this.envoyerJoystick()
    })
    this.canvas.addEventListener('mousemove', (e) => this.souris(e))
    this.canvas.addEventListener('mousedown', (e) => this.boutons(e))
    this.canvas.addEventListener('mouseup', (e) => this.boutons(e))
    this.canvas.addEventListener('mouseleave', () => this.cpu && materielAmiga(this.cpu)?.boutons(false, false))
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault())
  }

  private clavier(e: KeyboardEvent, enfoncee: boolean): void {
    const m = this.cpu && materielAmiga(this.cpu)
    if (!m) return
    if (this.modeJoystick.checked && JOY_PC[e.code]) {
      this.joyClavier = enfoncee ? this.joyClavier | JOY_PC[e.code] : this.joyClavier & ~JOY_PC[e.code]
      this.envoyerJoystick()
    } else {
      const code = CODE_PC_AMIGA[e.code]
      if (code === undefined || (enfoncee && e.repeat)) return
      const caractere = e.key.length === 1 ? e.key : e.key === 'Enter' ? '\n' : e.key === 'Backspace' ? '\b' : e.key === 'Escape' ? '\x1b' : undefined
      m.touche(code, enfoncee, caractere)
    }
    e.preventDefault()
  }

  /** Déplacement en pixels basse résolution de l'Amiga (les compteurs avancent d'un cran par pixel). */
  private souris(e: MouseEvent): void {
    const m = this.cpu && materielAmiga(this.cpu)
    if (!m || !this.canvas.clientWidth) return
    this.reste.x += (e.movementX * ECRAN_LARGEUR_BASSE) / this.canvas.clientWidth
    this.reste.y += (e.movementY * ECRAN_LIGNES) / this.canvas.clientHeight
    const dx = Math.trunc(this.reste.x)
    const dy = Math.trunc(this.reste.y)
    this.reste.x -= dx
    this.reste.y -= dy
    if (dx || dy) m.souris(dx, dy)
  }

  private boutons(e: MouseEvent): void {
    const m = this.cpu && materielAmiga(this.cpu)
    if (!m) return
    m.boutons((e.buttons & 1) !== 0, (e.buttons & 2) !== 0)
    if (e.type === 'mousedown') this.canvas.focus()
    e.preventDefault()
  }

  private envoyerJoystick(): void {
    if (this.cpu) materielAmiga(this.cpu)?.joystick(this.joyClavier | this.joyManette)
  }

  private lireManette(): void {
    const pads = typeof navigator.getGamepads === 'function' ? navigator.getGamepads() : []
    const pad = [...pads].find((p) => p)
    if (!pad) return
    const b = (i: number): boolean => pad.buttons[i]?.pressed ?? false
    const [x = 0, y = 0] = pad.axes
    let etat = 0
    if (b(12) || y < -0.5) etat |= JOY_AMIGA.haut
    if (b(13) || y > 0.5) etat |= JOY_AMIGA.bas
    if (b(14) || x < -0.5) etat |= JOY_AMIGA.gauche
    if (b(15) || x > 0.5) etat |= JOY_AMIGA.droite
    if (b(0) || b(1)) etat |= JOY_AMIGA.feu
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
    const image = materielAmiga(cpu)?.image()
    if (!image) return
    for (let i = 0; i < image.length; i++) this.pixels[i] = RGBA[image[i] & 0xfff]
    this.ctx.putImageData(this.image, 0, 0)
  }
}
