import { Memory } from './memory'
import { maskToSize, setFlagsAdd, setFlagsLogic, setFlagsSub, signExtend, testCondition } from './flags'
import type { CpuSnapshot, ExceptionInfo, Flags, MemoryWrite, Size, StepEffects } from './types'
import type { Platform } from './platform'
import { M68kException, VECTOR, bombCount, exceptionAdvice, exceptionName } from './exceptions'

// 16 Mo = tout l'espace adressable réel d'un 68000 (bus d'adresse 24 bits). Doit rester une
// puissance de 2 (cf. maskAddr). Augmenté depuis 1 Mo car les adresses matérielles réelles
// (ex. palette Atari ST $FF8240, registres Amiga $DFFxxx) seraient sinon repliées (wrap) dans le
// premier Mo par maskAddr, pointant silencieusement sur la mauvaise case mémoire.
export const MEMORY_SIZE = 0x1000000
const STACK_TOP = MEMORY_SIZE - 4

interface EA {
  mode: number
  reg: number
  address?: number
}

const STD_SIZES: Size[] = [1, 2, 4] // champ taille "standard" (00/01/10) utilisé par CLR/NEG/NOT/TST/ORI/ANDI/...
const MOVE_SIZES: Record<number, Size> = { 1: 1, 3: 2, 2: 4 } // champ taille propre à MOVE (01/11/10)

// Bits du registre d'état (SR) hors CCR
const SR_T = 0x8000
const SR_S = 0x2000
const SR_IPL_SHIFT = 8

export class Cpu {
  readonly d = new Uint32Array(8)
  /** A7 = pile active (USP ou SSP selon le bit S). L'autre pile est rangée dans `inactiveSp`. */
  readonly a = new Uint32Array(8)
  pc = 0
  flags: Flags = { x: false, n: false, z: false, v: false, c: false }
  /** Bit S du SR : vrai = mode superviseur (état d'un 68000 après RESET). */
  supervisor = true
  /** Masque d'interruption (bits 8-10 du SR) : seules les interruptions de niveau supérieur passent. */
  intMask = 7
  trace = false
  /** Vrai après STOP : le processeur attend une interruption. */
  stopped = false
  halted = false
  output = ''

  readonly memory = new Memory(MEMORY_SIZE)
  private inactiveSp = 0
  private stepWrites: MemoryWrite[] = []
  private pendingInterrupt: { level: number; vector?: number } | null = null
  /** Adresse de l'instruction en cours d'exécution (PC empilé pour les fautes). */
  private instrPc = 0
  private currentOpcode = 0

  constructor(private readonly platform?: Platform) {}

  reset(baseAddress: number): void {
    this.memory.reset()
    this.d.fill(0)
    this.a.fill(0)
    this.a[7] = STACK_TOP
    this.inactiveSp = 0
    this.supervisor = true
    this.intMask = 7
    this.trace = false
    this.stopped = false
    this.pc = baseAddress
    this.flags = { x: false, n: false, z: false, v: false, c: false }
    this.halted = false
    this.output = ''
    this.pendingInterrupt = null
    this.platform?.onReset?.(this)
  }

  loadProgram(baseAddress: number, bytes: Uint8Array): void {
    this.memory.loadBytes(baseAddress, bytes)
  }

  // --- Registre d'état ----------------------------------------------------

  get ccr(): number {
    const f = this.flags
    return (f.x ? 0x10 : 0) | (f.n ? 0x08 : 0) | (f.z ? 0x04 : 0) | (f.v ? 0x02 : 0) | (f.c ? 0x01 : 0)
  }

  set ccr(value: number) {
    this.flags = {
      x: (value & 0x10) !== 0,
      n: (value & 0x08) !== 0,
      z: (value & 0x04) !== 0,
      v: (value & 0x02) !== 0,
      c: (value & 0x01) !== 0
    }
  }

  get sr(): number {
    return (this.trace ? SR_T : 0) | (this.supervisor ? SR_S : 0) | (this.intMask << SR_IPL_SHIFT) | this.ccr
  }

  /** Écrire SR peut changer de mode : la pile active (A7) est alors échangée avec l'autre. */
  set sr(value: number) {
    this.ccr = value & 0x1f
    this.trace = (value & SR_T) !== 0
    this.intMask = (value >> SR_IPL_SHIFT) & 0x7
    this.setSupervisor((value & SR_S) !== 0)
  }

  private setSupervisor(on: boolean): void {
    if (on === this.supervisor) return
    const current = this.a[7]
    this.a[7] = this.inactiveSp
    this.inactiveSp = current
    this.supervisor = on
  }

  get usp(): number {
    return this.supervisor ? this.inactiveSp : this.a[7]
  }

  set usp(value: number) {
    if (this.supervisor) this.inactiveSp = value >>> 0
    else this.a[7] = value >>> 0
  }

  get ssp(): number {
    return this.supervisor ? this.a[7] : this.inactiveSp
  }

  /**
   * Passe en mode utilisateur avec la pile utilisateur donnée, comme le fait un système
   * d'exploitation avant de lancer un programme (TOS, AmigaOS).
   */
  enterUserMode(userStack: number): void {
    this.usp = userStack
    this.setSupervisor(false)
  }

  /** Demande une interruption (niveau 1-7). Prise en compte au prochain pas si le masque le permet. */
  requestInterrupt(level: number, vector?: number): void {
    this.pendingInterrupt = { level: level & 7, vector }
  }

  getSnapshot(): CpuSnapshot {
    return {
      d: Array.from(this.d),
      a: Array.from(this.a),
      pc: this.pc,
      flags: { ...this.flags },
      halted: this.halted,
      output: this.output,
      sr: this.sr,
      supervisor: this.supervisor,
      usp: this.usp,
      ssp: this.ssp,
      stopped: this.stopped
    }
  }

  step(): StepEffects {
    this.stepWrites = []
    if (this.halted) return { writes: [], halted: true }

    const pending = this.pendingInterrupt
    if (pending && (pending.level === 7 || pending.level > this.intMask)) {
      this.pendingInterrupt = null
      this.stopped = false
      const vector = pending.vector ?? VECTOR.autovector1 + pending.level - 1
      const exception = this.processException(vector, this.pc, undefined, pending.level)
      return { writes: this.stepWrites, halted: this.halted, exception, error: this.unhandledMessage(exception) }
    }
    if (this.stopped) return { writes: [], halted: false }

    this.instrPc = this.pc
    try {
      const opcode = this.fetchWord()
      this.currentOpcode = opcode
      this.execute(opcode)
    } catch (err) {
      if (err instanceof M68kException) {
        const stackedPc = err.kind === 'fault' ? this.instrPc : this.pc
        const exception = this.processException(err.vector, stackedPc, err.access)
        return { writes: this.stepWrites, halted: this.halted, exception, error: this.unhandledMessage(exception) }
      }
      this.halted = true
      return { writes: this.stepWrites, halted: true, error: (err as Error).message }
    }
    return { writes: this.stepWrites, halted: this.halted }
  }

  private unhandledMessage(exception: ExceptionInfo): string | undefined {
    if (exception.handled) return undefined
    const bombs = bombCount(exception.vector)
    const where = `à l'adresse $${exception.pc.toString(16).toUpperCase()}`
    const access =
      exception.accessAddress !== undefined ? ` (accès à $${exception.accessAddress.toString(16).toUpperCase()})` : ''
    const bombText = bombs > 0 ? ` — sur Atari ST : ${bombs} bombe${bombs > 1 ? 's' : ''}` : ''
    const advice = exceptionAdvice(exception.vector)
    return `${exception.name} ${where}${access}${bombText}.${advice ? ' ' + advice : ''}`
  }

  /**
   * Traitement d'exception 68000 : sauvegarde de SR, passage en superviseur, empilement du PC et
   * de SR (plus 8 octets pour les erreurs de bus/d'adresse), puis saut à l'adresse lue dans la
   * table des vecteurs (vecteur × 4). Si le vecteur vaut 0 (pas de routine installée), le
   * programme s'arrête sur l'instruction en cause, comme le TOS qui affiche ses bombes.
   */
  private processException(
    vector: number,
    stackedPc: number,
    access?: { address: number; read: boolean; instruction: boolean },
    interruptLevel?: number
  ): ExceptionInfo {
    const info: ExceptionInfo = {
      vector,
      name: exceptionName(vector),
      handled: false,
      pc: access ? this.instrPc : stackedPc,
      accessAddress: access?.address
    }
    const handler = this.memory.readU32(vector * 4)
    if (handler === 0) {
      this.halted = true
      this.pc = info.pc
      return info
    }
    const oldSr = this.sr
    this.setSupervisor(true)
    this.trace = false
    if (interruptLevel !== undefined) this.intMask = interruptLevel
    try {
      this.pushLong(stackedPc)
      this.pushWord(oldSr)
      if (access) {
        this.pushWord(this.currentOpcode)
        this.pushLong(access.address)
        const fc = (oldSr & SR_S ? 4 : 0) | (access.instruction ? 2 : 1)
        this.pushWord((access.read ? 0x10 : 0) | (access.instruction ? 0 : 0x08) | fc)
      }
      if (handler & 1) throw new M68kException(VECTOR.addressError, 'fault')
    } catch {
      // Faute pendant le traitement d'une faute : un vrai 68000 s'arrête (« double bus fault »).
      this.halted = true
      info.name += ' puis double faute (pile superviseur invalide)'
      return info
    }
    this.pc = handler
    info.handled = true
    return info
  }

  // --- Mémoire / registres bas niveau ---------------------------------

  private maskAddr(address: number): number {
    return (address >>> 0) & (MEMORY_SIZE - 1)
  }

  private checkAccess(address: number, size: Size, write: boolean, instruction = false): void {
    if (size > 1 && (address & 1) !== 0) {
      throw new M68kException(VECTOR.addressError, 'fault', { address, read: !write, instruction })
    }
    if (!instruction && this.platform?.isBusError?.(this, address, write)) {
      throw new M68kException(VECTOR.busError, 'fault', { address, read: !write, instruction })
    }
  }

  /** Lecture mémoire « par le programme » : vérifie l'alignement et les zones protégées. */
  readMem(address: number, size: Size): number {
    const addr = this.maskAddr(address)
    this.checkAccess(addr, size, false)
    return this.memory.read(addr, size)
  }

  /** Écriture mémoire « par le programme » : vérifie, écrit, mémorise et prévient la plateforme. */
  writeMem(address: number, size: Size, value: number): void {
    const addr = this.maskAddr(address)
    this.checkAccess(addr, size, true)
    this.memory.write(addr, size, value)
    this.stepWrites.push({ address: addr, size })
    this.platform?.onMemoryWrite?.(this, addr, size, value)
  }

  private fetchWord(): number {
    this.checkAccess(this.pc, 2, false, true)
    const value = this.memory.readU16(this.pc)
    this.pc = this.maskAddr(this.pc + 2)
    return value
  }

  private fetchLong(): number {
    const hi = this.fetchWord()
    const lo = this.fetchWord()
    return ((hi << 16) | lo) >>> 0
  }

  pushLong(value: number): void {
    this.writeMem(this.a[7] - 4, 4, value >>> 0)
    this.a[7] = this.maskAddr(this.a[7] - 4)
  }

  pushWord(value: number): void {
    this.writeMem(this.a[7] - 2, 2, value & 0xffff)
    this.a[7] = this.maskAddr(this.a[7] - 2)
  }

  popLong(): number {
    const value = this.readMem(this.a[7], 4)
    this.a[7] = this.maskAddr(this.a[7] + 4)
    return value
  }

  popWord(): number {
    const value = this.readMem(this.a[7], 2)
    this.a[7] = this.maskAddr(this.a[7] + 2)
    return value
  }

  private requireSupervisor(): void {
    if (!this.supervisor) throw new M68kException(VECTOR.privilege, 'fault')
  }

  // --- Adressage effectif -----------------------------------------------

  private decodeBriefExtension(base: number): number {
    const ext = this.fetchWord()
    const isAddressReg = (ext & 0x8000) !== 0
    const xnReg = (ext >> 12) & 0x7
    const useLong = (ext & 0x0800) !== 0
    const rawXn = isAddressReg ? this.a[xnReg] : this.d[xnReg]
    const indexValue = useLong ? rawXn | 0 : signExtend(rawXn, 2)
    const disp8 = signExtend(ext & 0xff, 1)
    return (base + indexValue + disp8) >>> 0
  }

  private decodeEA(mode: number, reg: number, size: Size): EA {
    switch (mode) {
      case 0:
      case 1:
        return { mode, reg }
      case 2:
        return { mode, reg, address: this.maskAddr(this.a[reg]) }
      case 3: {
        const address = this.maskAddr(this.a[reg])
        const inc = reg === 7 && size === 1 ? 2 : size
        this.a[reg] = this.maskAddr(this.a[reg] + inc)
        return { mode, reg, address }
      }
      case 4: {
        const dec = reg === 7 && size === 1 ? 2 : size
        this.a[reg] = this.maskAddr(this.a[reg] - dec)
        return { mode, reg, address: this.maskAddr(this.a[reg]) }
      }
      case 5: {
        const disp = signExtend(this.fetchWord(), 2)
        return { mode, reg, address: this.maskAddr(this.a[reg] + disp) }
      }
      case 6:
        return { mode, reg, address: this.decodeBriefExtension(this.a[reg]) }
      case 7:
        switch (reg) {
          case 0: {
            const disp = signExtend(this.fetchWord(), 2)
            return { mode, reg, address: this.maskAddr(disp) }
          }
          case 1:
            return { mode, reg, address: this.maskAddr(this.fetchLong()) }
          case 2: {
            const base = this.pc
            const disp = signExtend(this.fetchWord(), 2)
            return { mode, reg, address: this.maskAddr(base + disp) }
          }
          case 3:
            return { mode, reg, address: this.decodeBriefExtension(this.pc) }
          case 4:
            return { mode, reg } // immédiat : consommé au moment du readEA
          default:
            throw new M68kException(VECTOR.illegal, 'fault')
        }
      default:
        throw new M68kException(VECTOR.illegal, 'fault')
    }
  }

  private eaAddress(ea: EA): number {
    if (ea.address === undefined) throw new M68kException(VECTOR.illegal, 'fault')
    return ea.address
  }

  private readEA(ea: EA, size: Size): number {
    switch (ea.mode) {
      case 0:
        return maskToSize(this.d[ea.reg], size)
      case 1:
        return maskToSize(this.a[ea.reg], size)
      case 7:
        if (ea.reg === 4) {
          if (size === 4) return this.fetchLong()
          const word = this.fetchWord()
          return size === 1 ? word & 0xff : word & 0xffff
        }
        return this.readMem(this.eaAddress(ea), size)
      default:
        return this.readMem(this.eaAddress(ea), size)
    }
  }

  private writeEA(ea: EA, size: Size, value: number): void {
    switch (ea.mode) {
      case 0: {
        const old = this.d[ea.reg]
        if (size === 4) this.d[ea.reg] = value >>> 0
        else if (size === 2) this.d[ea.reg] = (old & 0xffff0000) | (value & 0xffff)
        else this.d[ea.reg] = (old & 0xffffff00) | (value & 0xff)
        return
      }
      case 1: {
        if (size === 1) throw new Error("Écriture d'un octet dans un registre d'adresse (An) invalide")
        this.a[ea.reg] = size === 4 ? value >>> 0 : signExtend(value, 2) >>> 0
        return
      }
      default:
        this.writeMem(this.eaAddress(ea), size, value)
    }
  }

  // --- Dispatcher principal ----------------------------------------------

  private execute(opcode: number): void {
    if ((opcode & 0xff00) === 0x4e00 && this.execMisc4E(opcode)) return
    if ((opcode & 0xfff0) === 0x4e40) {
      this.execTrap(opcode & 0xf)
      return
    }
    if ((opcode & 0xffc0) === 0x4e80) {
      const ea = this.decodeEA((opcode >> 3) & 0x7, opcode & 0x7, 4)
      const target = this.eaAddress(ea)
      if (this.platform?.onJsr?.(this, target)) return
      this.pushLong(this.pc)
      this.pc = target
      return
    } // JSR
    if ((opcode & 0xffc0) === 0x4ec0) {
      const ea = this.decodeEA((opcode >> 3) & 0x7, opcode & 0x7, 4)
      this.pc = this.eaAddress(ea)
      return
    } // JMP
    if ((opcode & 0xfff8) === 0x4840) {
      const reg = opcode & 0x7
      const value = this.d[reg]
      const swapped = (((value & 0xffff) << 16) | (value >>> 16)) >>> 0
      this.d[reg] = swapped
      setFlagsLogic(this.flags, swapped, 4)
      return
    } // SWAP
    if ((opcode & 0xfff8) === 0x4880 || (opcode & 0xfff8) === 0x48c0) {
      const reg = opcode & 0x7
      if ((opcode & 0x0040) === 0) {
        const value = signExtend(this.d[reg] & 0xff, 1) & 0xffff
        this.d[reg] = (this.d[reg] & 0xffff0000) | value
        setFlagsLogic(this.flags, value, 2)
      } else {
        const value = signExtend(this.d[reg] & 0xffff, 2) >>> 0
        this.d[reg] = value
        setFlagsLogic(this.flags, value, 4)
      }
      return
    } // EXT.W / EXT.L (avant MOVEM, qui partage ce motif avec un mode Dn invalide)
    if ((opcode & 0xffc0) === 0x4840) {
      const ea = this.decodeEA((opcode >> 3) & 0x7, opcode & 0x7, 4)
      this.pushLong(this.eaAddress(ea))
      return
    } // PEA
    if ((opcode & 0xffc0) === 0x4880) return this.execMovem(opcode, 'toMem', 2)
    if ((opcode & 0xffc0) === 0x48c0) return this.execMovem(opcode, 'toMem', 4)
    if ((opcode & 0xffc0) === 0x4c80) return this.execMovem(opcode, 'toRegs', 2)
    if ((opcode & 0xffc0) === 0x4cc0) return this.execMovem(opcode, 'toRegs', 4)
    if ((opcode & 0xf1c0) === 0x41c0) {
      const destReg = (opcode >> 9) & 0x7
      const ea = this.decodeEA((opcode >> 3) & 0x7, opcode & 0x7, 4)
      this.a[destReg] = this.eaAddress(ea) >>> 0
      return
    } // LEA
    if ((opcode & 0xf1c0) === 0x4180) return this.execChk(opcode)
    if (opcode === 0x4afc) throw new M68kException(VECTOR.illegal, 'fault') // ILLEGAL
    if ((opcode & 0xffc0) === 0x4ac0) {
      const ea = this.decodeEA((opcode >> 3) & 0x7, opcode & 0x7, 1)
      const value = this.readEA(ea, 1)
      setFlagsLogic(this.flags, value, 1)
      this.writeEA(ea, 1, value | 0x80)
      return
    } // TAS
    if ((opcode & 0xffc0) === 0x40c0) {
      const ea = this.decodeEA((opcode >> 3) & 0x7, opcode & 0x7, 2)
      this.writeEA(ea, 2, this.sr)
      return
    } // MOVE SR,<ea> (autorisé en mode utilisateur sur 68000)
    if ((opcode & 0xffc0) === 0x44c0) {
      const ea = this.decodeEA((opcode >> 3) & 0x7, opcode & 0x7, 2)
      this.ccr = this.readEA(ea, 2) & 0x1f
      return
    } // MOVE <ea>,CCR
    if ((opcode & 0xffc0) === 0x46c0) {
      this.requireSupervisor()
      const ea = this.decodeEA((opcode >> 3) & 0x7, opcode & 0x7, 2)
      this.sr = this.readEA(ea, 2)
      return
    } // MOVE <ea>,SR
    if ((opcode & 0xff00) === 0x4000) return this.execNegx(opcode)
    if ((opcode & 0xff00) === 0x4200) return this.execUnary(opcode, 'clr')
    if ((opcode & 0xff00) === 0x4400) return this.execUnary(opcode, 'neg')
    if ((opcode & 0xff00) === 0x4600) return this.execUnary(opcode, 'not')
    if ((opcode & 0xff00) === 0x4a00) return this.execUnary(opcode, 'tst')

    if ((opcode & 0xf100) === 0x7000) {
      const reg = (opcode >> 9) & 0x7
      const value = signExtend(opcode & 0xff, 1)
      this.d[reg] = value >>> 0
      setFlagsLogic(this.flags, value, 4)
      return
    } // MOVEQ

    const top2 = (opcode >>> 14) & 0x3
    if (top2 === 0) {
      const sizeField = (opcode >>> 12) & 0x3
      if (sizeField !== 0) return this.execMove(opcode, MOVE_SIZES[sizeField])
      return this.execImmediateOrBitGroup(opcode)
    }

    if ((opcode & 0xf000) === 0x6000) return this.execBranch(opcode)
    if ((opcode & 0xf000) === 0x5000) return this.execAddqSubqDbcc(opcode)
    if ((opcode & 0xf000) === 0xe000) return this.execShiftRotate(opcode)
    if ((opcode & 0xf000) === 0x8000) return this.execOrDiv(opcode)
    if ((opcode & 0xf000) === 0x9000) return this.execAddSubFamily(opcode, 'sub')
    if ((opcode & 0xf000) === 0xb000) return this.execCmpEor(opcode)
    if ((opcode & 0xf000) === 0xc000) return this.execAndMulExg(opcode)
    if ((opcode & 0xf000) === 0xd000) return this.execAddSubFamily(opcode, 'add')

    if ((opcode & 0xf000) === 0xa000) {
      if (this.platform?.onLineA?.(this, opcode)) return
      throw new M68kException(VECTOR.lineA, 'fault')
    }
    if ((opcode & 0xf000) === 0xf000) throw new M68kException(VECTOR.lineF, 'fault')

    throw new Error(
      `Instruction non reconnue ou non simulée (code $${opcode.toString(16).padStart(4, '0').toUpperCase()}). ` +
        'Les instructions BCD (ABCD, SBCD, NBCD) ne sont pas encore simulées.'
    )
  }

  /** Groupe $4Exx : NOP, RTS, RTE, RTR, STOP, RESET, TRAPV, LINK, UNLK, MOVE USP. */
  private execMisc4E(opcode: number): boolean {
    switch (opcode) {
      case 0x4e70: // RESET : réinitialise les périphériques, sans effet ici
        this.requireSupervisor()
        return true
      case 0x4e71: // NOP
        return true
      case 0x4e72: {
        // STOP #imm
        this.requireSupervisor()
        const value = this.fetchWord()
        this.sr = value
        this.stopped = true
        return true
      }
      case 0x4e73: {
        // RTE
        this.requireSupervisor()
        const newSr = this.popWord()
        const newPc = this.popLong()
        this.sr = newSr
        this.pc = newPc
        return true
      }
      case 0x4e75: // RTS
        this.pc = this.popLong()
        return true
      case 0x4e76: // TRAPV
        if (this.flags.v) throw new M68kException(VECTOR.trapv, 'trap')
        return true
      case 0x4e77: {
        // RTR
        this.ccr = this.popWord() & 0x1f
        this.pc = this.popLong()
        return true
      }
    }
    if ((opcode & 0xfff8) === 0x4e50) {
      // LINK An,#déplacement
      const reg = opcode & 0x7
      const disp = signExtend(this.fetchWord(), 2)
      this.pushLong(this.a[reg])
      this.a[reg] = this.a[7]
      this.a[7] = this.maskAddr(this.a[7] + disp)
      return true
    }
    if ((opcode & 0xfff8) === 0x4e58) {
      // UNLK An
      const reg = opcode & 0x7
      this.a[7] = this.a[reg]
      this.a[reg] = this.popLong()
      return true
    }
    if ((opcode & 0xfff0) === 0x4e60) {
      // MOVE An,USP / MOVE USP,An
      this.requireSupervisor()
      const reg = opcode & 0x7
      if (opcode & 0x8) this.a[reg] = this.usp
      else this.usp = this.a[reg]
      return true
    }
    return false
  }

  // --- MOVE / MOVEA --------------------------------------------------------

  private execMove(opcode: number, size: Size): void {
    const srcMode = (opcode >> 3) & 0x7
    const srcReg = opcode & 0x7
    const dstMode = (opcode >> 6) & 0x7
    const dstReg = (opcode >> 9) & 0x7
    const src = this.decodeEA(srcMode, srcReg, size)
    const value = this.readEA(src, size)
    const dst = this.decodeEA(dstMode, dstReg, size)
    this.writeEA(dst, size, value)
    if (dstMode !== 1) setFlagsLogic(this.flags, value, size) // MOVEA ne touche pas les flags
  }

  // --- CLR / NEG / NOT / TST / NEGX ---------------------------------------

  private execUnary(opcode: number, op: 'clr' | 'neg' | 'not' | 'tst'): void {
    const sizeField = (opcode >> 6) & 0x3
    if (sizeField === 3) throw new M68kException(VECTOR.illegal, 'fault')
    const size = STD_SIZES[sizeField]
    const ea = this.decodeEA((opcode >> 3) & 0x7, opcode & 0x7, size)
    if (op === 'tst') {
      const value = this.readEA(ea, size)
      setFlagsLogic(this.flags, value, size)
      return
    }
    if (op === 'clr') {
      this.writeEA(ea, size, 0)
      setFlagsLogic(this.flags, 0, size)
      return
    }
    const current = this.readEA(ea, size)
    if (op === 'not') {
      const result = maskToSize(~current, size)
      this.writeEA(ea, size, result)
      setFlagsLogic(this.flags, result, size)
    } else {
      const result = setFlagsSub(this.flags, 0, current, size)
      this.writeEA(ea, size, result)
    }
  }

  private execNegx(opcode: number): void {
    const size = STD_SIZES[(opcode >> 6) & 0x3]
    const ea = this.decodeEA((opcode >> 3) & 0x7, opcode & 0x7, size)
    const current = this.readEA(ea, size)
    this.writeEA(ea, size, this.subWithExtend(0, current, size))
  }

  /** a - b - X avec la règle « Z effacé si non nul, inchangé sinon » (SUBX, NEGX). */
  private subWithExtend(a: number, b: number, size: Size): number {
    const oldZ = this.flags.z
    const x = this.flags.x ? 1 : 0
    const bits = size === 1 ? 8 : size === 2 ? 16 : 32
    const full = maskToSize(a, size) - maskToSize(b, size) - x
    const result = maskToSize(full, size)
    const sign = (v: number): boolean => ((maskToSize(v, size) >>> (bits - 1)) & 1) === 1
    this.flags.n = sign(result)
    this.flags.v = sign(a) !== sign(b) && sign(result) !== sign(a)
    this.flags.c = full < 0
    this.flags.x = this.flags.c
    this.flags.z = result === 0 ? oldZ : false
    return result
  }

  /** a + b + X (ADDX). */
  private addWithExtend(a: number, b: number, size: Size): number {
    const oldZ = this.flags.z
    const x = this.flags.x ? 1 : 0
    const bits = size === 1 ? 8 : size === 2 ? 16 : 32
    const full = maskToSize(a, size) + maskToSize(b, size) + x
    const result = maskToSize(full, size)
    const sign = (v: number): boolean => ((maskToSize(v, size) >>> (bits - 1)) & 1) === 1
    this.flags.n = sign(result)
    this.flags.v = sign(a) === sign(b) && sign(result) !== sign(a)
    this.flags.c = full >= 2 ** bits
    this.flags.x = this.flags.c
    this.flags.z = result === 0 ? oldZ : false
    return result
  }

  // --- CHK -------------------------------------------------------------------

  private execChk(opcode: number): void {
    const reg = (opcode >> 9) & 0x7
    const ea = this.decodeEA((opcode >> 3) & 0x7, opcode & 0x7, 2)
    const bound = signExtend(this.readEA(ea, 2), 2)
    const value = signExtend(this.d[reg] & 0xffff, 2)
    if (value < 0) {
      this.flags.n = true
      throw new M68kException(VECTOR.chk, 'trap')
    }
    if (value > bound) {
      this.flags.n = false
      throw new M68kException(VECTOR.chk, 'trap')
    }
  }

  // --- Branchements --------------------------------------------------------

  private execBranch(opcode: number): void {
    const cc = (opcode >> 8) & 0xf
    const lowByte = opcode & 0xff
    const dispBase = this.pc
    let disp: number
    if (lowByte === 0) {
      disp = signExtend(this.fetchWord(), 2)
    } else {
      disp = signExtend(lowByte, 1)
    }
    const target = this.maskAddr(dispBase + disp)
    if (cc === 1) {
      this.pushLong(this.pc)
      this.pc = target
    } else if (testCondition(cc, this.flags)) {
      this.pc = target
    }
  }

  // --- ADDQ / SUBQ / Scc / DBcc ---------------------------------------------

  private execAddqSubqDbcc(opcode: number): void {
    const sizeField = (opcode >> 6) & 0x3
    if (sizeField === 3) {
      const mode = (opcode >> 3) & 0x7
      if (mode === 1) return this.execDbcc(opcode)
      // Scc : octet à $FF si la condition est vraie, $00 sinon
      const ea = this.decodeEA(mode, opcode & 0x7, 1)
      this.writeEA(ea, 1, testCondition((opcode >> 8) & 0xf, this.flags) ? 0xff : 0x00)
      return
    }
    const size = STD_SIZES[sizeField]
    const isSub = (opcode & 0x0100) !== 0
    let data = (opcode >> 9) & 0x7
    if (data === 0) data = 8
    const ea = this.decodeEA((opcode >> 3) & 0x7, opcode & 0x7, size)
    if (ea.mode === 1) {
      this.a[ea.reg] = this.maskAddr(this.a[ea.reg] + (isSub ? -data : data))
      return
    }
    const current = this.readEA(ea, size)
    const result = isSub
      ? setFlagsSub(this.flags, current, data, size)
      : setFlagsAdd(this.flags, current, data, size)
    this.writeEA(ea, size, result)
  }

  private execDbcc(opcode: number): void {
    const cc = (opcode >> 8) & 0xf
    const disp = signExtend(this.fetchWord(), 2)
    const dispBase = this.pc - 2
    if (testCondition(cc, this.flags)) return
    const reg = opcode & 0x7
    const word = this.d[reg] & 0xffff
    const newWord = (word - 1) & 0xffff
    this.d[reg] = (this.d[reg] & 0xffff0000) | newWord
    if (newWord !== 0xffff) this.pc = this.maskAddr(dispBase + disp)
  }

  // --- Décalages / rotations -------------------------------------------------

  private execShiftRotate(opcode: number): void {
    const sizeField = (opcode >> 6) & 0x3
    const left = (opcode & 0x0100) !== 0
    if (sizeField === 3) {
      // Décalage d'un mot en mémoire, d'un seul bit
      const type = (opcode >> 9) & 0x3
      const ea = this.decodeEA((opcode >> 3) & 0x7, opcode & 0x7, 2)
      const value = this.readEA(ea, 2)
      this.writeEA(ea, 2, this.shiftValue(value, 2, type, left, 1))
      return
    }
    const size = STD_SIZES[sizeField]
    const type = (opcode >> 3) & 0x3 // 00 ASx, 01 LSx, 10 ROXx, 11 ROx
    const dynamic = (opcode & 0x0020) !== 0
    const reg = opcode & 0x7
    let count: number
    if (dynamic) count = this.d[(opcode >> 9) & 0x7] % 64
    else {
      count = (opcode >> 9) & 0x7
      if (count === 0) count = 8
    }
    const value = this.shiftValue(maskToSize(this.d[reg], size), size, type, left, count)
    this.d[reg] = (this.d[reg] & (size === 4 ? 0 : size === 2 ? 0xffff0000 : 0xffffff00)) | value
  }

  /** Décale/tourne `value` de `count` bits et positionne les flags. type : 0 AS, 1 LS, 2 ROX, 3 RO. */
  private shiftValue(value: number, size: Size, type: number, left: boolean, count: number): number {
    const bits = size === 1 ? 8 : size === 2 ? 16 : 32
    const signBit = bits === 32 ? 0x80000000 : 1 << (bits - 1)
    let lastOut = this.flags.c
    let overflow = false

    for (let i = 0; i < count; i++) {
      if (left) {
        lastOut = (value & signBit) !== 0
        if (type === 0 || type === 1) {
          const shifted = maskToSize(value << 1, size)
          if (type === 0 && (shifted & signBit) !== (value & signBit)) overflow = true
          value = shifted
        } else if (type === 3) {
          value = maskToSize((value << 1) | (lastOut ? 1 : 0), size)
        } else {
          const xIn = this.flags.x ? 1 : 0
          value = maskToSize((value << 1) | xIn, size)
          this.flags.x = lastOut
        }
      } else {
        lastOut = (value & 1) !== 0
        if (type === 0) {
          value = maskToSize((value >>> 1) | (value & signBit), size)
        } else if (type === 1) {
          value = maskToSize(value >>> 1, size)
        } else if (type === 3) {
          value = maskToSize((value >>> 1) | (lastOut ? signBit : 0), size)
        } else {
          const xIn = this.flags.x ? signBit : 0
          value = maskToSize((value >>> 1) | xIn, size)
          this.flags.x = lastOut
        }
      }
    }

    this.flags.n = (value & signBit) !== 0
    this.flags.z = value === 0
    this.flags.v = type === 0 && left ? overflow : false
    if (count > 0) {
      this.flags.c = lastOut
      if (type === 0 || type === 1) this.flags.x = lastOut
    } else {
      this.flags.c = type === 2 ? this.flags.x : false
    }
    return value >>> 0
  }

  // --- OR / DIVU / DIVS / SBCD --------------------------------------------

  private execOrDiv(opcode: number): void {
    const ooo = (opcode >> 6) & 0x7
    const dReg = (opcode >> 9) & 0x7
    const eaMode = (opcode >> 3) & 0x7
    const eaReg = opcode & 0x7

    if (ooo === 3 || ooo === 7) {
      const ea = this.decodeEA(eaMode, eaReg, 2)
      const rawDivisor = this.readEA(ea, 2)
      if (rawDivisor === 0) throw new M68kException(VECTOR.zeroDivide, 'trap')
      const signed = ooo === 7
      const divisor = signed ? signExtend(rawDivisor, 2) : rawDivisor & 0xffff
      const dividend = signed ? this.d[dReg] | 0 : this.d[dReg] >>> 0
      const quotient = Math.trunc(dividend / divisor)
      const remainder = dividend % divisor
      this.flags.c = false
      const overflow = signed ? quotient > 0x7fff || quotient < -0x8000 : quotient > 0xffff
      if (overflow) {
        // Le 68000 laisse le registre intact et lève V
        this.flags.v = true
        return
      }
      this.d[dReg] = (((remainder & 0xffff) << 16) | (quotient & 0xffff)) >>> 0
      this.flags.n = (quotient & 0x8000) !== 0
      this.flags.z = quotient === 0
      this.flags.v = false
      return
    }

    if (ooo >= 4 && eaMode <= 1) {
      throw new Error('Instruction SBCD non simulée (calcul BCD).')
    }

    const size = STD_SIZES[ooo < 4 ? ooo : ooo - 4]
    const ea = this.decodeEA(eaMode, eaReg, size)
    if (ooo < 3) {
      const src = this.readEA(ea, size)
      const result = maskToSize(src | maskToSize(this.d[dReg], size), size)
      this.writeEA({ mode: 0, reg: dReg }, size, result)
      setFlagsLogic(this.flags, result, size)
    } else {
      const src = maskToSize(this.d[dReg], size)
      const dst = this.readEA(ea, size)
      const result = maskToSize(src | dst, size)
      this.writeEA(ea, size, result)
      setFlagsLogic(this.flags, result, size)
    }
  }

  // --- AND / MULU / MULS / EXG --------------------------------------------

  private execAndMulExg(opcode: number): void {
    // EXG, opmode (bits8-3, bit8 inclus) : 101000=Dx,Dy  101001=Ax,Ay  110001=Dx,Ay
    const bits8to3 = (opcode >> 3) & 0x3f
    if (bits8to3 === 0b101000 || bits8to3 === 0b101001 || bits8to3 === 0b110001) {
      const rx = (opcode >> 9) & 0x7
      const ry = opcode & 0x7
      if (bits8to3 === 0b101000) {
        const tmp = this.d[rx]
        this.d[rx] = this.d[ry]
        this.d[ry] = tmp
      } else if (bits8to3 === 0b101001) {
        const tmp = this.a[rx]
        this.a[rx] = this.a[ry]
        this.a[ry] = tmp
      } else {
        const tmp = this.d[rx]
        this.d[rx] = this.a[ry]
        this.a[ry] = tmp
      }
      return
    }

    const ooo = (opcode >> 6) & 0x7
    const dReg = (opcode >> 9) & 0x7
    const eaMode = (opcode >> 3) & 0x7
    const eaReg = opcode & 0x7

    if (ooo === 3 || ooo === 7) {
      const ea = this.decodeEA(eaMode, eaReg, 2)
      const src = this.readEA(ea, 2)
      const result =
        ooo === 7
          ? (signExtend(src, 2) * signExtend(this.d[dReg] & 0xffff, 2)) >>> 0
          : (src * (this.d[dReg] & 0xffff)) >>> 0
      this.d[dReg] = result
      setFlagsLogic(this.flags, result, 4)
      return
    }

    if (ooo === 4 && eaMode <= 1) throw new Error('Instruction ABCD non simulée (calcul BCD).')

    const size = STD_SIZES[ooo < 4 ? ooo : ooo - 4]
    const ea = this.decodeEA(eaMode, eaReg, size)
    if (ooo < 3) {
      const src = this.readEA(ea, size)
      const result = maskToSize(src & maskToSize(this.d[dReg], size), size)
      this.writeEA({ mode: 0, reg: dReg }, size, result)
      setFlagsLogic(this.flags, result, size)
    } else {
      const src = maskToSize(this.d[dReg], size)
      const dst = this.readEA(ea, size)
      const result = maskToSize(src & dst, size)
      this.writeEA(ea, size, result)
      setFlagsLogic(this.flags, result, size)
    }
  }

  // --- SUB/SUBA/SUBX/ADD/ADDA/ADDX ------------------------------------------

  private execAddSubFamily(opcode: number, kind: 'add' | 'sub'): void {
    const ooo = (opcode >> 6) & 0x7
    const dReg = (opcode >> 9) & 0x7
    const eaMode = (opcode >> 3) & 0x7
    const eaReg = opcode & 0x7

    if (ooo === 3 || ooo === 7) {
      const size: Size = ooo === 3 ? 2 : 4
      const ea = this.decodeEA(eaMode, eaReg, size)
      const src = signExtend(this.readEA(ea, size), size)
      const cur = this.a[dReg] | 0
      this.a[dReg] = (kind === 'add' ? cur + src : cur - src) >>> 0
      return
    }

    const size = STD_SIZES[ooo < 4 ? ooo : ooo - 4]
    const toEa = ooo >= 4

    if (toEa && eaMode <= 1) {
      // ADDX / SUBX : Dy,Dx (mode 0) ou -(Ay),-(Ax) (mode 1)
      const op = (a: number, b: number): number =>
        kind === 'add' ? this.addWithExtend(a, b, size) : this.subWithExtend(a, b, size)
      if (eaMode === 0) {
        const result = op(this.d[dReg], this.d[eaReg])
        this.writeEA({ mode: 0, reg: dReg }, size, result)
      } else {
        const srcEa = this.decodeEA(4, eaReg, size)
        const src = this.readEA(srcEa, size)
        const dstEa = this.decodeEA(4, dReg, size)
        const dst = this.readEA(dstEa, size)
        this.writeEA(dstEa, size, op(dst, src))
      }
      return
    }

    if (!toEa) {
      const ea = this.decodeEA(eaMode, eaReg, size)
      const src = this.readEA(ea, size)
      const dst = maskToSize(this.d[dReg], size)
      const result = kind === 'add' ? setFlagsAdd(this.flags, dst, src, size) : setFlagsSub(this.flags, dst, src, size)
      this.writeEA({ mode: 0, reg: dReg }, size, result)
    } else {
      const ea = this.decodeEA(eaMode, eaReg, size)
      const src = maskToSize(this.d[dReg], size)
      const dst = this.readEA(ea, size)
      const result = kind === 'add' ? setFlagsAdd(this.flags, dst, src, size) : setFlagsSub(this.flags, dst, src, size)
      this.writeEA(ea, size, result)
    }
  }

  // --- CMP / CMPA / CMPM / EOR ---------------------------------------------

  private execCmpEor(opcode: number): void {
    const ooo = (opcode >> 6) & 0x7
    const dReg = (opcode >> 9) & 0x7
    const eaMode = (opcode >> 3) & 0x7
    const eaReg = opcode & 0x7

    if (ooo === 3 || ooo === 7) {
      const size: Size = ooo === 3 ? 2 : 4
      const ea = this.decodeEA(eaMode, eaReg, size)
      const src = signExtend(this.readEA(ea, size), size)
      const dst = this.a[dReg] | 0
      setFlagsSub(this.flags, dst, src, 4)
      return
    }

    const size = STD_SIZES[ooo < 4 ? ooo : ooo - 4]
    if (ooo < 3) {
      const ea = this.decodeEA(eaMode, eaReg, size)
      const src = this.readEA(ea, size)
      const dst = maskToSize(this.d[dReg], size)
      setFlagsSub(this.flags, dst, src, size)
    } else if (eaMode === 1) {
      // CMPM (Ay)+,(Ax)+
      const src = this.readEA(this.decodeEA(3, eaReg, size), size)
      const dst = this.readEA(this.decodeEA(3, dReg, size), size)
      setFlagsSub(this.flags, dst, src, size)
    } else {
      const ea = this.decodeEA(eaMode, eaReg, size)
      const src = maskToSize(this.d[dReg], size)
      const dst = this.readEA(ea, size)
      const result = maskToSize(src ^ dst, size)
      this.writeEA(ea, size, result)
      setFlagsLogic(this.flags, result, size)
    }
  }

  // --- Groupe immédiat / bits (ORI, ANDI, SUBI, ADDI, EORI, CMPI, BTST, MOVEP...) ---

  private execImmediateOrBitGroup(opcode: number): void {
    const highByte = (opcode >> 8) & 0xff
    const eaMode = (opcode >> 3) & 0x7
    const eaReg = opcode & 0x7

    // ORI/ANDI/EORI vers CCR ($xx3C) ou SR ($xx7C)
    if ((opcode & 0xffbf) === 0x003c || (opcode & 0xffbf) === 0x023c || (opcode & 0xffbf) === 0x0a3c) {
      const toSr = (opcode & 0x0040) !== 0
      if (toSr) this.requireSupervisor()
      const imm = this.fetchWord() & (toSr ? 0xffff : 0xff)
      const current = toSr ? this.sr : this.ccr
      const result = highByte === 0x00 ? current | imm : highByte === 0x02 ? current & imm : current ^ imm
      if (toSr) this.sr = result
      else this.ccr = result & 0x1f
      return
    }

    if ((opcode & 0xf138) === 0x0108) return this.execMovep(opcode)

    if ((opcode & 0xf100) === 0x0100 || (opcode & 0xffc0) === 0x0800 || (opcode & 0xffc0) === 0x0840 || (opcode & 0xffc0) === 0x0880 || (opcode & 0xffc0) === 0x08c0) {
      return this.execBitOp(opcode)
    }

    let op: 'ori' | 'andi' | 'subi' | 'addi' | 'eori' | 'cmpi'
    if (highByte === 0x00) op = 'ori'
    else if (highByte === 0x02) op = 'andi'
    else if (highByte === 0x04) op = 'subi'
    else if (highByte === 0x06) op = 'addi'
    else if (highByte === 0x0a) op = 'eori'
    else if (highByte === 0x0c) op = 'cmpi'
    else throw new M68kException(VECTOR.illegal, 'fault')
    const sizeField = (opcode >> 6) & 0x3
    if (sizeField === 3) throw new M68kException(VECTOR.illegal, 'fault')
    const size = STD_SIZES[sizeField]

    const immediate = size === 4 ? this.fetchLong() : this.fetchWord() & (size === 1 ? 0xff : 0xffff)
    const ea = this.decodeEA(eaMode, eaReg, size)

    if (op === 'cmpi') {
      const dst = this.readEA(ea, size)
      setFlagsSub(this.flags, dst, immediate, size)
      return
    }
    const dst = this.readEA(ea, size)
    let result: number
    if (op === 'ori') result = maskToSize(dst | immediate, size)
    else if (op === 'andi') result = maskToSize(dst & immediate, size)
    else if (op === 'eori') result = maskToSize(dst ^ immediate, size)
    else if (op === 'addi') result = setFlagsAdd(this.flags, dst, immediate, size)
    else result = setFlagsSub(this.flags, dst, immediate, size)
    this.writeEA(ea, size, result)
    if (op === 'ori' || op === 'andi' || op === 'eori') setFlagsLogic(this.flags, result, size)
  }

  /** MOVEP : transfert vers/depuis un octet sur deux (registres des périphériques 8 bits, MFP du ST). */
  private execMovep(opcode: number): void {
    const dReg = (opcode >> 9) & 0x7
    const aReg = opcode & 0x7
    const opmode = (opcode >> 6) & 0x3
    const disp = signExtend(this.fetchWord(), 2)
    const base = this.maskAddr(this.a[aReg] + disp)
    const count = opmode & 1 ? 4 : 2
    if (opmode >= 2) {
      const value = this.d[dReg]
      for (let i = 0; i < count; i++) {
        const shift = 8 * (count - 1 - i)
        this.writeMem(base + 2 * i, 1, (value >>> shift) & 0xff)
      }
    } else {
      let value = 0
      for (let i = 0; i < count; i++) value = ((value << 8) | this.readMem(base + 2 * i, 1)) >>> 0
      if (count === 2) this.d[dReg] = (this.d[dReg] & 0xffff0000) | value
      else this.d[dReg] = value
    }
  }

  private execBitOp(opcode: number): void {
    const dynamic = (opcode & 0x0100) !== 0
    const opBits = (opcode >> 6) & 0x3
    const eaMode = (opcode >> 3) & 0x7
    const eaReg = opcode & 0x7
    const bitNumber = dynamic ? this.d[(opcode >> 9) & 0x7] : this.fetchWord()
    const size: Size = eaMode === 0 ? 4 : 1
    const bit = bitNumber % (size === 4 ? 32 : 8)
    const ea = this.decodeEA(eaMode, eaReg, size)
    const value = this.readEA(ea, size)
    this.flags.z = ((value >>> bit) & 1) === 0
    if (opBits === 0) return // BTST : lecture seule
    let result = value
    if (opBits === 1) result ^= 1 << bit // BCHG
    else if (opBits === 2) result &= ~(1 << bit) // BCLR
    else result |= 1 << bit // BSET
    this.writeEA(ea, size, maskToSize(result, size))
  }

  // --- MOVEM ---------------------------------------------------------------

  private execMovem(opcode: number, direction: 'toMem' | 'toRegs', size: Size): void {
    const mask = this.fetchWord()
    const mode = (opcode >> 3) & 0x7
    const reg = opcode & 0x7

    const transferOne = (addr: number, regIndex: number): void => {
      if (direction === 'toMem') {
        const value = regIndex < 8 ? this.d[regIndex] : this.a[regIndex - 8]
        this.writeMem(addr, size, value)
      } else {
        const raw = this.readMem(addr, size)
        const value = size === 2 ? signExtend(raw, 2) >>> 0 : raw >>> 0
        if (regIndex < 8) this.d[regIndex] = value
        else this.a[regIndex - 8] = value
      }
    }

    if (mode === 4) {
      let addr = this.a[reg]
      for (let i = 0; i < 16; i++) {
        if (!(mask & (1 << i))) continue
        addr = this.maskAddr(addr - size)
        const regIndex = i < 8 ? 7 - i + 8 : 15 - i
        transferOne(addr, regIndex)
      }
      this.a[reg] = addr
      return
    }

    let addr: number
    if (mode === 3) addr = this.a[reg]
    else addr = this.eaAddress(this.decodeEA(mode, reg, size))

    for (let i = 0; i < 16; i++) {
      if (!(mask & (1 << i))) continue
      transferOne(addr, i)
      addr = this.maskAddr(addr + size)
    }
    if (mode === 3) this.a[reg] = addr
  }

  // --- TRAP ------------------------------------------------------------------
  // Ordre : 1) routine installée par le programme dans la table des vecteurs (vraie exception),
  // 2) système simulé par la plateforme (GEMDOS, BIOS...), 3) TRAP #15 façon EASy68K.

  private execTrap(number: number): void {
    const vector = VECTOR.trap0 + number
    if (this.memory.readU32(vector * 4) !== 0) throw new M68kException(vector, 'trap')
    if (this.platform?.onTrap?.(this, number)) return
    if (number !== 15) throw new M68kException(vector, 'trap')
    const task = this.d[0] & 0xff
    if (task === 9) {
      this.halted = true
    } else if (task === 13) {
      this.output += this.memory.readCString(this.a[1])
    } else if (task === 14) {
      // Lecture clavier non simulée : pas d'effet
    } else {
      throw new Error(`Tâche TRAP #15 non supportée: D0=${task}`)
    }
  }
}
