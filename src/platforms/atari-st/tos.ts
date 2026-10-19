import type { Cpu } from '../../cpu/cpu'
import type { Platform } from '../../cpu/platform'
import {
  BASEPAGE,
  DEFAULT_PALETTE,
  HARDWARE_START,
  JOYBUF,
  KBDBUF,
  KBDVBASE,
  OP_IKBDSYS,
  OP_PROGRAM_EXIT,
  OP_SUPEXEC_RETURN,
  PALETTE_BASE,
  PROTECTED_LOW_END,
  ROM_ACIA,
  ROM_END,
  ROM_IKBDSYS,
  ROM_PROGRAM_EXIT,
  ROM_RTS,
  ROM_START,
  ROM_SUPEXEC_RETURN,
  ROM_CLOCHE,
  ROM_TIMER_C,
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
import { routinesRom } from './rom'
import { CODE, traduire } from './clavier'
import { materielAtari } from './materiel'

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
  /**
   * Vrai : quand aucune touche n'est disponible, Cnecin & co attendent qu'on en tape une (clavier
   * de l'interface). Faux : erreur « aucune touche prévue » (exercices vérifiés automatiquement).
   */
  clavierInteractif?: boolean
}

/** Longueur des paquets de l'IKBD (en-tête compris), selon l'en-tête $F6-$FF. */
const LONGUEUR_PAQUET: Record<number, number> = { 0xf6: 8, 0xf7: 6, 0xf8: 3, 0xf9: 3, 0xfa: 3, 0xfb: 3, 0xfc: 7, 0xfd: 3, 0xfe: 2, 0xff: 2 }
/** Bits de Kbshift. */
const SHIFT_DROIT = 0x01
const SHIFT_GAUCHE = 0x02
const CONTROL = 0x04
const ALTERNATE = 0x08
const CAPS = 0x10
/** Son de la cloche (Ctrl+G), liste Dosound du TOS (EmuTOS, bios/sound.c). */
const CLOCHE = new Uint8Array([0, 0x34, 1, 0, 2, 0, 3, 0, 4, 0, 5, 0, 6, 0, 7, 0xfe, 8, 0x10, 13, 9, 11, 0, 12, 0x10, 0xff, 0])

/** Taille du tampon clavier du TOS (en touches). */
const TAMPON_CLAVIER = 64

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
  let kbshift = 0
  let paquet: number[] | null = null

  /** Lit une touche ; le programme attend si le clavier est interactif et le tampon vide. */
  function nextKey(cpu: Cpu, echo: boolean): boolean {
    const key = keys.shift()
    if (!key) {
      if (options.clavierInteractif) return attendreTouche(cpu)
      throw new Error("Le programme attend une touche, mais aucune touche n'a été prévue pour cet exercice.")
    }
    if (echo) cpu.output += String.fromCharCode(key.ascii)
    cpu.d[0] = ((key.scancode & 0xff) << 16) | (key.ascii & 0xff)
    return true
  }

  /**
   * Comme le vrai TOS qui boucle en attendant une touche (interruptions autorisées) : le TRAP sera
   * réexécuté, et le temps passe pendant ce temps.
   */
  function attendreTouche(cpu: Cpu): boolean {
    cpu.pc = (cpu.pc - 2) & 0xffffff
    const evenement = materielAtari(cpu)?.prochainEvenement() ?? Infinity
    cpu.cycles = Math.max(cpu.cycles + 4, Math.min(cpu.cycles + 40000, evenement))
    cpu.waiting = true
    return true
  }

  /** Code clavier reçu de l'IKBD (bit 7 = touche relâchée) : touches mortes ou caractère. */
  function codeClavier(cpu: Cpu, octet: number): void {
    const code = octet & 0x7f
    const enfoncee = (octet & 0x80) === 0
    const bit =
      code === CODE.shiftDroit
        ? SHIFT_DROIT
        : code === CODE.shiftGauche
          ? SHIFT_GAUCHE
          : code === CODE.control
            ? CONTROL
            : code === CODE.alternate
              ? ALTERNATE
              : 0
    if (bit) {
      kbshift = enfoncee ? kbshift | bit : kbshift & ~bit
      return
    }
    if (!enfoncee) return
    if (code === CODE.capsLock) {
      kbshift ^= CAPS
      return
    }
    let ascii = traduire(cpu, code, (kbshift & (SHIFT_DROIT | SHIFT_GAUCHE)) !== 0, (kbshift & CONTROL) !== 0)
    if (kbshift & CAPS && ascii >= 0x61 && ascii <= 0x7a) ascii -= 0x20
    if (keys.length < TAMPON_CLAVIER) keys.push({ ascii, scancode: code })
  }

  /**
   * ikbdsys (ROM) a lu l'octet D0 : touche, ou morceau d'un paquet. Un paquet complet est rangé
   * comme le fait le TOS (EmuTOS, aciavecs.S) et A1 reçoit le vecteur à appeler, A0 le paquet.
   */
  function octetIkbd(cpu: Cpu): void {
    const octet = cpu.d[0] & 0xff
    const mem = cpu.memory
    cpu.a[1] = 0
    if (!paquet) {
      if (octet < 0xf6) return codeClavier(cpu, octet)
      paquet = [octet]
      return
    }
    paquet.push(octet)
    const entete = paquet[0]
    if (paquet.length < LONGUEUR_PAQUET[entete]) return
    const p = paquet
    paquet = null
    let vecteur: number
    let a0 = KBDBUF
    if (entete >= 0xfd) {
      // Joysticks : tampon de 3 octets. $FD : joy0, joy1 ; $FE : en-tête, joy0 ; $FF : en-tête, -, joy1
      if (entete === 0xfd) {
        mem.writeU8(JOYBUF, p[1])
        mem.writeU8(JOYBUF + 1, p[2])
      } else {
        mem.writeU8(JOYBUF, entete)
        mem.writeU8(JOYBUF + (entete === 0xfe ? 1 : 2), p[1])
      }
      a0 = JOYBUF
      vecteur = KBDVBASE + 24
    } else {
      // Souris relative : en-tête compris ; état, souris absolue, horloge : sans l'en-tête
      const donnees = entete >= 0xf8 && entete <= 0xfb ? p : p.slice(1)
      donnees.forEach((o, i) => mem.writeU8(KBDBUF + i, o))
      vecteur = KBDVBASE + (entete === 0xf6 ? 12 : entete === 0xfc ? 20 : 16)
    }
    cpu.a[0] = a0
    cpu.a[1] = mem.readU32(vecteur)
  }

  function setVideoBase(cpu: Cpu, address: number): void {
    cpu.memory.writeU8(VIDEO_BASE_HIGH, (address >> 16) & 0xff)
    cpu.memory.writeU8(VIDEO_BASE_MID, (address >> 8) & 0xff)
  }

  /** Caractère vers la console ; Ctrl+G (7) fait sonner la cloche si conterm le permet. */
  function afficher(cpu: Cpu, car: number): void {
    if (car === 7 && cpu.memory.readU8(SYSVAR.conterm) & 0x04) {
      materielAtari(cpu)?.dosound(ROM_CLOCHE)
      return
    }
    cpu.output += String.fromCharCode(car)
  }

  function gemdos(cpu: Cpu): boolean {
    const fn = argW(cpu, 0)
    switch (fn) {
      case 0x00: // Pterm0
        cpu.halted = true
        return true
      case 0x01: // Cconin : lit une touche avec écho
        return nextKey(cpu, true)
      case 0x02: // Cconout(car)
        afficher(cpu, argW(cpu, 2) & 0xff)
        return true
      case 0x07: // Crawcin
      case 0x08: // Cnecin
        return nextKey(cpu, false)
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
        return nextKey(cpu, false)
      case 3: {
        // Bconout(périph, car) : 2 = console, 5 = console brute
        const device = argW(cpu, 2)
        if (device === 2) afficher(cpu, argW(cpu, 4) & 0xff)
        else if (device === 5) cpu.output += String.fromCharCode(argW(cpu, 4) & 0xff)
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
      case 11: {
        // Kbshift(mode) : état des touches Shift, Control, Alternate, CapsLock ; mode ≥ 0 le modifie
        const mode = argW(cpu, 2)
        cpu.d[0] = kbshift
        if (mode !== 0xffff) kbshift = mode & 0xff
        return true
      }
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
      case 28: {
        // Giaccess(donnée, registre) : registre + $80 = écrire ; sinon lire
        const donnee = argW(cpu, 2) & 0xff
        const reg = argW(cpu, 4)
        const psg = materielAtari(cpu)?.psg
        if (psg) {
          if (reg & 0x80) psg.ecrire(donnee, cpu.cycles, reg & 0x0f)
          cpu.d[0] = psg.etat.lire(reg & 0x0f)
        }
        return true
      }
      case 32: // Dosound(liste) ; liste négative : renvoie seulement la position courante
        cpu.d[0] = materielAtari(cpu)?.dosound(argL(cpu, 2)) ?? 0
        return true
      case 34: // Kbdvbase
        cpu.d[0] = KBDVBASE
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
      kbshift = 0
      paquet = null
      const mem = cpu.memory
      for (const [adresse, octets] of routinesRom()) mem.loadBytes(adresse, octets)
      mem.loadBytes(ROM_CLOCHE, CLOCHE)
      mem.writeU32(0x114, ROM_TIMER_C)
      mem.writeU32(0x118, ROM_ACIA)
      for (let i = 0; i < 16; i++) mem.writeU8(KBDBUF + i, 0)
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
      for (let i = 0; i < 8; i++) mem.writeU32(KBDVBASE + i * 4, ROM_RTS)
      mem.writeU32(KBDVBASE + 32, ROM_IKBDSYS)
      // Piles en RAM. Comme sous le TOS, la pile du programme contient l'adresse de retour (un RTS
      // final termine proprement le programme) puis l'adresse de la page de base.
      // Le TOS fait tourner les programmes avec le masque d'interruption à 3 (SR = $0300 / $2300)
      cpu.intMask = 3
      const stack = options.userMode ? USER_STACK : SUPERVISOR_STACK
      mem.writeU32(stack - 8, ROM_PROGRAM_EXIT)
      mem.writeU32(stack - 4, BASEPAGE)
      if (options.userMode) {
        cpu.a[7] = SUPERVISOR_STACK
        cpu.enterUserMode(stack - 8)
      } else {
        cpu.a[7] = stack - 8
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
      if (opcode === OP_IKBDSYS && at >= ROM_IKBDSYS && at < ROM_IKBDSYS + 0x40) {
        octetIkbd(cpu)
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
