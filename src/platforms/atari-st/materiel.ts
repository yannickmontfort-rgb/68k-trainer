import type { Cpu } from '../../cpu/cpu'
import type { Platform } from '../../cpu/platform'
import type { Size } from '../../cpu/types'
import { ACIA_CLAVIER_CTRL, ACIA_MIDI_DATA, Ikbd } from './ikbd'
import { CYCLES_PER_VBL, PALETTE_BASE, SCREEN_HEIGHT } from './machine'
import { MFP, MFP_BASE, MFP_END, Mfp } from './mfp'
import { toucheSt } from './clavier'

/**
 * Balayage d'une trame PAL : 313 lignes de 512 cycles ; les 200 lignes de la basse résolution
 * commencent à la ligne 63. Le Shifter lit la palette au début de chaque ligne affichée ; la fin
 * de l'affichage d'une ligne est un événement pour le timer B (rasters).
 */
export const CYCLES_PAR_LIGNE = 512
export const PREMIERE_LIGNE = 63
const DEBUT_AFFICHAGE = 56
const FIN_AFFICHAGE = 376

export interface MaterielAtari {
  mfp: Mfp
  ikbd: Ikbd
  /**
   * Palette lue par le Shifter pour chacune des 200 lignes de la dernière trame complète
   * (16 mots par ligne), ou `null` si elle n'a pas changé en cours de trame.
   */
  palettesParLigne(): Uint16Array | null
}

const registre = new WeakMap<Cpu, MaterielAtari>()

/** Action programmée sur le clavier ou le joystick (même forme que dans le contenu du parcours). */
export interface EvenementAtari {
  image: number
  touche?: number
  caractere?: string
  maintenue?: boolean
  joystick?: number
}

export interface MaterielOptions {
  /** Actions jouées à l'image (VBL) indiquée : touches, joystick. */
  evenements?: EvenementAtari[]
}

/** Périphériques de l'Atari simulé par ce processeur (pour l'interface : clavier, joystick, écran). */
export function materielAtari(cpu: Cpu): MaterielAtari | undefined {
  return registre.get(cpu)
}

/** Découpe une écriture de 1, 2 ou 4 octets en octets successifs. */
function octets(address: number, size: Size, value: number): [number, number][] {
  const r: [number, number][] = []
  for (let i = 0; i < size; i++) r.push([address + i, (value >>> (8 * (size - 1 - i))) & 0xff])
  return r
}

export function createMateriel(options: MaterielOptions = {}): Platform {
  let cpu!: Cpu
  // Événements programmés, triés par cycle (une touche non maintenue est relâchée 2 images plus tard)
  type Action = { cycle: number; faire: () => void }
  let actions: Action[] = []
  let prochaineAction = Infinity
  function programmer(): void {
    actions = []
    for (const e of options.evenements ?? []) {
      const cycle = e.image * CYCLES_PER_VBL
      if (e.joystick !== undefined) actions.push({ cycle, faire: () => ikbd.joystick(1, e.joystick!) })
      if (e.touche !== undefined) {
        actions.push({ cycle, faire: () => toucheSt(cpu, e.touche!, true, e.caractere) })
        if (!e.maintenue) actions.push({ cycle: cycle + 2 * CYCLES_PER_VBL, faire: () => toucheSt(cpu, e.touche!, false) })
      }
    }
    actions.sort((a, b) => a.cycle - b.cycle)
    prochaineAction = actions[0]?.cycle ?? Infinity
  }
  const mfp = new Mfp(() => cpu)
  const ikbd = new Ikbd((actif) => mfp.entree(4, !actif))

  // Événements de balayage : pour chaque ligne affichée, début (lecture palette) puis fin (timer B)
  let debutTrame = 0
  let evenement = 0
  let prochainEvenement = 0
  let trame = new Uint16Array(SCREEN_HEIGHT * 16)
  let derniere: Uint16Array | null = null

  const cycleEvenement = (): number =>
    debutTrame + (PREMIERE_LIGNE + (evenement >> 1)) * CYCLES_PAR_LIGNE + (evenement & 1 ? FIN_AFFICHAGE : DEBUT_AFFICHAGE)

  function uniforme(p: Uint16Array): boolean {
    for (let i = 16; i < p.length; i++) if (p[i] !== p[i % 16]) return false
    return true
  }

  function balayage(): void {
    while (cpu.cycles >= prochainEvenement) {
      const ligne = evenement >> 1
      if (evenement & 1) mfp.finDeLigne()
      else for (let c = 0; c < 16; c++) trame[ligne * 16 + c] = cpu.memory.readU16(PALETTE_BASE + c * 2)
      evenement++
      if (evenement === SCREEN_HEIGHT * 2) {
        derniere = uniforme(trame) ? null : trame
        trame = new Uint16Array(SCREEN_HEIGHT * 16)
        evenement = 0
        debutTrame += CYCLES_PER_VBL
      }
      prochainEvenement = cycleEvenement()
    }
  }

  const estMfp = (a: number): boolean => a >= MFP_BASE && a < MFP_END
  const estAcia = (a: number): boolean => a >= ACIA_CLAVIER_CTRL && a <= ACIA_MIDI_DATA + 1

  return {
    onReset(c: Cpu): void {
      cpu = c
      mfp.reset()
      ikbd.reset(0)
      debutTrame = 0
      evenement = 0
      prochainEvenement = cycleEvenement()
      derniere = null
      registre.set(cpu, { mfp, ikbd, palettesParLigne: () => derniere })
      programmer()
      // État laissé par le TOS au lancement d'un programme : vecteurs MFP en $100-$13C (EOI
      // logiciel), timer C à 200 Hz, interruptions du clavier et du timer C autorisées.
      const w = (r: number, v: number): void => mfp.ecrire(MFP_BASE + r, v, 0)
      w(MFP.vr, 0x48)
      w(MFP.aer, 0x04)
      w(MFP.tcdr, 192)
      w(MFP.tddr, 2)
      w(MFP.tcdcr, 0x51) // timer C : ÷64 (200 Hz) ; timer D : ÷4 (horloge RS-232)
      w(MFP.ierb, 0x60) // ACIA (canal 6) et timer C (canal 5)
      w(MFP.imrb, 0x60)
      ikbd.ecrire(ACIA_CLAVIER_CTRL, 0x96) // ÷64, 8 bits, interruption en réception
      mfp.refleter(cpu)
    },

    ioStart: MFP_BASE,

    readIo(c: Cpu, address: number, size: Size): number | undefined {
      if (!estMfp(address) && !estAcia(address)) return undefined
      let v = 0
      for (let i = 0; i < size; i++) {
        const a = address + i
        // MFP sur les octets impairs, ACIA sur les octets pairs ; l'autre moitié du bus flotte
        const octet = estMfp(a) ? (a & 1 ? mfp.lire(a, c.cycles) : 0xff) : estAcia(a) ? (a & 1 ? 0xff : ikbd.lire(a)) : 0xff
        v = (v << 8) | octet
      }
      return v >>> 0
    },

    onMemoryWrite(c: Cpu, address: number, size: Size, value: number): void {
      if (!estMfp(address) && !estAcia(address)) return
      for (const [a, o] of octets(address, size, value)) {
        if (estMfp(a) && a & 1) mfp.ecrire(a, o, c.cycles)
        else if (estAcia(a) && !(a & 1)) ikbd.ecrire(a, o)
      }
      mfp.refleter(c)
    },

    acknowledgeInterrupt(_c: Cpu, level: number): number | undefined {
      return level === 6 ? mfp.acquitter() : undefined
    },

    afterStep(c: Cpu): void {
      while (c.cycles >= prochaineAction) {
        actions.shift()!.faire()
        prochaineAction = actions[0]?.cycle ?? Infinity
      }
      mfp.avancer(c.cycles)
      if (ikbd.enAttente) ikbd.avancer(c.cycles)
      if (c.cycles >= prochainEvenement) balayage()
    }
  }
}
