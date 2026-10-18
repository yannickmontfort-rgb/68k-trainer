import type { Cpu } from '../../cpu/cpu'
import type { Platform } from '../../cpu/platform'
import {
  BASEPAGE,
  DEFAULT_PALETTE,
  HARDWARE_START,
  KBDVBASE,
  OP_PROGRAM_EXIT,
  OP_SUPEXEC_RETURN,
  PALETTE_BASE,
  PROTECTED_LOW_END,
  ROM_END,
  ROM_PROGRAM_EXIT,
  ROM_RTS,
  ROM_START,
  ROM_SUPEXEC_RETURN,
  SCREEN_BASE,
  SUPERVISOR_STACK,
  SYSVAR,
  UNMAPPED_END,
  UNMAPPED_START,
  USER_STACK,
  VIDEO_BASE_HIGH,
  VIDEO_BASE_MID
} from './machine'
import { screenAddress } from './screen'

export interface AtariKey {
  ascii: number
  scancode: number
}

export interface TosOptions {
  /**
   * Vrai : le programme démarre en mode utilisateur comme sous le vrai TOS (vecteurs, variables
   * système et matériel protégés : il faut Supexec ou Super pour y toucher). Faux : démarrage en
   * superviseur, plus simple pour les premiers exercices.
   */
  userMode?: boolean
  /** Touches « tapées » à l'avance, lues par Cnecin/Crawcin/Cconin/Bconin. */
  keys?: AtariKey[]
}

/** Mot à l'offset `offset` de la pile active (paramètres d'un appel TOS). */
function argW(cpu: Cpu, offset: number): number {
  return cpu.memory.readU16((cpu.a[7] + offset) & 0xffffff)
}

function argL(cpu: Cpu, offset: number): number {
  return cpu.memory.readU32((cpu.a[7] + offset) & 0xffffff)
}

const RGB_MASK = 0x0777

/**
 * TOS simulé : les appels système les plus utiles pour apprendre (GEMDOS texte et clavier, BIOS
 * Bconout/Setexec, XBIOS écran/palette/Supexec), la protection mémoire du mode utilisateur et le
 * retour du programme par RTS.
 */
export function createTos(options: TosOptions = {}): Platform {
  let keys: AtariKey[] = []
  let randomSeed = 0
  const supexecStack: { sr: number; pc: number }[] = []

  function nextKey(cpu: Cpu, echo: boolean): void {
    const key = keys.shift()
    if (!key) throw new Error("Le programme attend une touche, mais aucune touche n'a été prévue pour cet exercice.")
    if (echo) cpu.output += String.fromCharCode(key.ascii)
    cpu.d[0] = ((key.scancode & 0xff) << 16) | (key.ascii & 0xff)
  }

  function setVideoBase(cpu: Cpu, address: number): void {
    cpu.memory.writeU8(VIDEO_BASE_HIGH, (address >> 16) & 0xff)
    cpu.memory.writeU8(VIDEO_BASE_MID, (address >> 8) & 0xff)
  }

  function gemdos(cpu: Cpu): boolean {
    const fn = argW(cpu, 0)
    switch (fn) {
      case 0x00: // Pterm0
        cpu.halted = true
        return true
      case 0x01: // Cconin : lit une touche avec écho
        nextKey(cpu, true)
        return true
      case 0x02: // Cconout(car)
        cpu.output += String.fromCharCode(argW(cpu, 2) & 0xff)
        return true
      case 0x07: // Crawcin
      case 0x08: // Cnecin
        nextKey(cpu, false)
        return true
      case 0x09: // Cconws(chaîne)
        cpu.output += cpu.memory.readCString(argL(cpu, 2))
        cpu.d[0] = 0
        return true
      case 0x0b: // Cconis
        cpu.d[0] = keys.length > 0 ? 0xffffffff : 0
        return true
      case 0x20: {
        // Super(pile)
        const param = argL(cpu, 2)
        if (param === 1) {
          cpu.d[0] = cpu.supervisor ? 0xffffffff : 0
        } else if (!cpu.supervisor) {
          // Passage en superviseur : la pile superviseur prend la valeur de la pile utilisateur
          const userSp = cpu.a[7]
          const oldSsp = cpu.ssp
          cpu.sr = cpu.sr | 0x2000
          cpu.a[7] = param === 0 ? userSp : param
          cpu.d[0] = oldSsp
        } else {
          // Retour en mode utilisateur avec l'ancienne pile superviseur
          const currentSp = cpu.a[7]
          cpu.a[7] = param
          cpu.sr = cpu.sr & ~0x2000
          cpu.a[7] = currentSp
          cpu.d[0] = 0
        }
        return true
      }
      case 0x4c: // Pterm(code)
        cpu.d[0] = argW(cpu, 2)
        cpu.halted = true
        return true
      default:
        throw new Error(`Fonction GEMDOS ${fn} ($${fn.toString(16)}) non simulée.`)
    }
  }

  function bios(cpu: Cpu): boolean {
    const fn = argW(cpu, 0)
    switch (fn) {
      case 1: // Bconstat(périph)
        cpu.d[0] = keys.length > 0 ? 0xffffffff : 0
        return true
      case 2: // Bconin(périph)
        nextKey(cpu, false)
        return true
      case 3: {
        // Bconout(périph, car) : 2 = console, 5 = console brute
        const device = argW(cpu, 2)
        if (device === 2 || device === 5) cpu.output += String.fromCharCode(argW(cpu, 4) & 0xff)
        return true
      }
      case 5: {
        // Setexec(numéro, adresse) : lit (et remplace si adresse ≠ -1) un vecteur d'exception
        const number = argW(cpu, 2)
        const address = argL(cpu, 4)
        cpu.d[0] = cpu.memory.readU32(number * 4)
        if (address !== 0xffffffff) cpu.memory.writeU32(number * 4, address)
        return true
      }
      case 11: // Kbshift : aucune touche de contrôle enfoncée
        cpu.d[0] = 0
        return true
      default:
        throw new Error(`Fonction BIOS ${fn} non simulée.`)
    }
  }

  function xbios(cpu: Cpu): boolean {
    const fn = argW(cpu, 0)
    switch (fn) {
      case 2: // Physbase
        cpu.d[0] = screenAddress(cpu.memory)
        return true
      case 3: // Logbase
        cpu.d[0] = cpu.memory.readU32(SYSVAR.v_bas_ad)
        return true
      case 4: // Getrez : 0 = basse résolution
        cpu.d[0] = 0
        return true
      case 5: {
        // Setscreen(logique, physique, résolution) ; -1 = inchangé
        const log = argL(cpu, 2)
        const phys = argL(cpu, 6)
        if (log !== 0xffffffff) cpu.memory.writeU32(SYSVAR.v_bas_ad, log)
        if (phys !== 0xffffffff) setVideoBase(cpu, phys)
        return true
      }
      case 6: {
        // Setpalette(pointeur vers 16 mots)
        const table = argL(cpu, 2)
        for (let i = 0; i < 16; i++) {
          cpu.memory.writeU16(PALETTE_BASE + i * 2, cpu.memory.readU16(table + i * 2) & RGB_MASK)
        }
        return true
      }
      case 7: {
        // Setcolor(numéro, couleur) ; couleur = -1 : simple lecture. Renvoie l'ancienne couleur.
        const number = argW(cpu, 2) & 15
        const color = argW(cpu, 4)
        const address = PALETTE_BASE + number * 2
        cpu.d[0] = cpu.memory.readU16(address)
        if (color !== 0xffff) cpu.memory.writeU16(address, color & RGB_MASK)
        return true
      }
      case 17: // Random : nombre pseudo-aléatoire sur 24 bits (suite reproductible)
        randomSeed = (Math.imul(randomSeed, 0xbb40e62d) + 1) >>> 0
        cpu.d[0] = (randomSeed >>> 8) & 0xffffff
        return true
      case 34: // Kbdvbase
        cpu.d[0] = KBDVBASE
        return true
      case 37: // Vsync : attend la prochaine trame
        cpu.memory.writeU32(SYSVAR.vblclock, cpu.memory.readU32(SYSVAR.vblclock) + 1)
        cpu.memory.writeU32(SYSVAR.frclock, cpu.memory.readU32(SYSVAR.frclock) + 1)
        return true
      case 38: {
        // Supexec(routine) : exécute la routine en superviseur, puis revient en mode d'origine
        const routine = argL(cpu, 2)
        supexecStack.push({ sr: cpu.sr, pc: cpu.pc })
        cpu.sr = cpu.sr | 0x2000
        cpu.pushLong(ROM_SUPEXEC_RETURN)
        cpu.pc = routine
        return true
      }
      default:
        throw new Error(`Fonction XBIOS ${fn} non simulée.`)
    }
  }

  return {
    onReset(cpu: Cpu): void {
      keys = [...(options.keys ?? [])]
      randomSeed = 0x12345678
      supexecStack.length = 0
      const mem = cpu.memory
      // Code « en ROM »
      mem.writeU16(ROM_RTS, 0x4e75)
      mem.writeU16(ROM_PROGRAM_EXIT, OP_PROGRAM_EXIT)
      mem.writeU16(ROM_SUPEXEC_RETURN, OP_SUPEXEC_RETURN)
      // Écran, palette et variables système
      setVideoBase(cpu, SCREEN_BASE)
      mem.writeU32(SYSVAR.v_bas_ad, SCREEN_BASE)
      mem.writeU8(SYSVAR.conterm, 0x07)
      DEFAULT_PALETTE.forEach((color, i) => mem.writeU16(PALETTE_BASE + i * 2, color))
      // Table Kbdvbase : 9 vecteurs (MIDI, erreurs, statut, souris, horloge, joystick...) → RTS
      for (let i = 0; i < 9; i++) mem.writeU32(KBDVBASE + i * 4, ROM_RTS)
      // Pile superviseur en RAM, et pile utilisateur avec l'adresse de retour du programme
      cpu.a[7] = SUPERVISOR_STACK
      if (options.userMode) {
        mem.writeU32(USER_STACK - 8, ROM_PROGRAM_EXIT)
        mem.writeU32(USER_STACK - 4, BASEPAGE)
        cpu.enterUserMode(USER_STACK - 8)
      }
    },

    onTrap(cpu: Cpu, n: number): boolean {
      if (n === 1) return gemdos(cpu)
      if (n === 13) return bios(cpu)
      if (n === 14) return xbios(cpu)
      return false
    },

    onLineA(cpu: Cpu, opcode: number): boolean {
      const at = (cpu.pc - 2) & 0xffffff
      if (opcode === OP_PROGRAM_EXIT && at === ROM_PROGRAM_EXIT) {
        cpu.halted = true
        return true
      }
      if (opcode === OP_SUPEXEC_RETURN && at === ROM_SUPEXEC_RETURN) {
        const saved = supexecStack.pop()
        if (!saved) throw new Error('Retour de Supexec inattendu.')
        cpu.sr = saved.sr
        cpu.pc = saved.pc
        return true
      }
      return false
    },

    isBusError(cpu: Cpu, address: number, write: boolean): boolean {
      if (address >= UNMAPPED_START && address < UNMAPPED_END) return true
      if (write && address >= ROM_START && address < ROM_END) return true
      if (!cpu.supervisor && (address < PROTECTED_LOW_END || address >= HARDWARE_START)) return true
      return false
    }
  }
}
