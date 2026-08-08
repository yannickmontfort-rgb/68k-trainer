import { Memory } from './memory'
import { maskToSize, setFlagsAdd, setFlagsLogic, setFlagsSub, signExtend, testCondition } from './flags'
import type { CpuSnapshot, Flags, MemoryWrite, Size, StepEffects } from './types'
import type { Platform } from './platform'

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

export class Cpu {
  readonly d = new Uint32Array(8)
  readonly a = new Uint32Array(8)
  pc = 0
  flags: Flags = { x: false, n: false, z: false, v: false, c: false }
  halted = false
  output = ''

  readonly memory = new Memory(MEMORY_SIZE)
  private stepWrites: MemoryWrite[] = []

  constructor(private readonly platform?: Platform) {}

  reset(baseAddress: number): void {
    this.memory.reset()
    this.d.fill(0)
    this.a.fill(0)
    this.a[7] = STACK_TOP
    this.pc = baseAddress
    this.flags = { x: false, n: false, z: false, v: false, c: false }
    this.halted = false
    this.output = ''
  }

  loadProgram(baseAddress: number, bytes: Uint8Array): void {
    this.memory.loadBytes(baseAddress, bytes)
  }

  getSnapshot(): CpuSnapshot {
    return {
      d: Array.from(this.d),
      a: Array.from(this.a),
      pc: this.pc,
      flags: { ...this.flags },
      halted: this.halted,
      output: this.output
    }
  }

  step(): StepEffects {
    this.stepWrites = []
    if (this.halted) return { writes: [], halted: true }
    try {
      const opcode = this.fetchWord()
      this.execute(opcode)
    } catch (err) {
      this.halted = true
      return { writes: this.stepWrites, halted: true, error: (err as Error).message }
    }
    return { writes: this.stepWrites, halted: this.halted }
  }

  // --- Mémoire / registres bas niveau ---------------------------------

  private maskAddr(address: number): number {
    return (address >>> 0) & (MEMORY_SIZE - 1)
  }

  private fetchWord(): number {
    const value = this.memory.readU16(this.pc)
    this.pc = this.maskAddr(this.pc + 2)
    return value
  }

  private fetchLong(): number {
    const hi = this.fetchWord()
    const lo = this.fetchWord()
    return ((hi << 16) | lo) >>> 0
  }

  private pushLong(value: number): void {
    this.a[7] = this.maskAddr(this.a[7] - 4)
    this.memory.writeU32(this.a[7], value >>> 0)
    this.stepWrites.push({ address: this.a[7], size: 4 })
    this.platform?.onMemoryWrite?.(this, this.a[7], 4, value >>> 0)
  }

  private popLong(): number {
    const value = this.memory.readU32(this.a[7])
    this.a[7] = this.maskAddr(this.a[7] + 4)
    return value
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
            throw new Error(`Mode d'adressage 7/${reg} non supporté`)
        }
      default:
        throw new Error(`Mode d'adressage ${mode} invalide`)
    }
  }

  private eaAddress(ea: EA): number {
    if (ea.address === undefined) throw new Error("Cette instruction requiert un opérande en mémoire")
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
        return this.memory.read(this.eaAddress(ea), size)
      default:
        return this.memory.read(this.eaAddress(ea), size)
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
      default: {
        const address = this.eaAddress(ea)
        this.memory.write(address, size, value)
        this.stepWrites.push({ address, size })
        this.platform?.onMemoryWrite?.(this, address, size, value)
      }
    }
  }

  // --- Dispatcher principal ----------------------------------------------

  private execute(opcode: number): void {
    if (opcode === 0x4e71) return // NOP
    if (opcode === 0x4e75) {
      this.pc = this.popLong()
      return
    } // RTS
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
      throw new Error(`Opcode Ligne A non supporté: 0x${opcode.toString(16).padStart(4, '0')}`)
    }

    throw new Error(`Opcode non supporté: 0x${opcode.toString(16).padStart(4, '0')}`)
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

  // --- CLR / NEG / NOT / TST -------------------------------------------

  private execUnary(opcode: number, op: 'clr' | 'neg' | 'not' | 'tst'): void {
    const size = STD_SIZES[(opcode >> 6) & 0x3]
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

  // --- Branchements --------------------------------------------------------

  private execBranch(opcode: number): void {
    const cc = (opcode >> 8) & 0xf
    const lowByte = opcode & 0xff
    let dispBase = this.pc
    let disp: number
    if (lowByte === 0) {
      dispBase = this.pc
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
      throw new Error('Scc non supporté par ce simulateur')
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

  // --- Décalages / rotations (registre uniquement) --------------------------

  private execShiftRotate(opcode: number): void {
    const sizeField = (opcode >> 6) & 0x3
    if (sizeField === 3) throw new Error('Décalage en mémoire non supporté par ce simulateur')
    const size = STD_SIZES[sizeField]
    const left = (opcode & 0x0100) !== 0
    const type = (opcode >> 3) & 0x3 // 00 ASx, 01 LSx, 10 ROXx, 11 ROx
    const dynamic = (opcode & 0x0020) !== 0
    const reg = opcode & 0x7
    let count: number
    if (dynamic) count = this.d[(opcode >> 9) & 0x7] % 64
    else {
      count = (opcode >> 9) & 0x7
      if (count === 0) count = 8
    }
    let value = maskToSize(this.d[reg], size)
    const bits = size === 1 ? 8 : size === 2 ? 16 : 32
    let lastOut = this.flags.c

    for (let i = 0; i < count; i++) {
      const signBit = 1 << (bits - 1)
      if (left) {
        lastOut = (value & signBit) !== 0
        if (type === 0 || type === 1) {
          value = maskToSize(value << 1, size)
        } else if (type === 3) {
          value = maskToSize((value << 1) | (lastOut ? 1 : 0), size)
        } else {
          const xIn = this.flags.x ? 1 : 0
          value = maskToSize((value << 1) | xIn, size)
          this.flags.x = lastOut
        }
      } else {
        lastOut = (value & 1) !== 0
        const signPreserved = type === 0 ? value & signBit : 0
        if (type === 0) {
          value = maskToSize((value >>> 1) | signPreserved, size)
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

    this.d[reg] = (this.d[reg] & (size === 4 ? 0 : size === 2 ? 0xffff0000 : 0xffffff00)) | value
    this.flags.n = (value & (1 << (bits - 1))) !== 0
    this.flags.z = value === 0
    this.flags.v = false // approximation : non recalculé bit à bit pour ASL (rare dans les exercices pédagogiques)
    if (count > 0) {
      this.flags.c = lastOut
      if (type === 0 || type === 1) this.flags.x = lastOut
    } else {
      this.flags.c = false
    }
  }

  // --- OR / DIVU / DIVS --------------------------------------------------

  private execOrDiv(opcode: number): void {
    const ooo = (opcode >> 6) & 0x7
    const dReg = (opcode >> 9) & 0x7
    const eaMode = (opcode >> 3) & 0x7
    const eaReg = opcode & 0x7

    if (ooo === 3 || ooo === 7) {
      const ea = this.decodeEA(eaMode, eaReg, 2)
      const rawDivisor = this.readEA(ea, 2)
      if (rawDivisor === 0) throw new Error('Division par zéro')
      const divisor = ooo === 7 ? signExtend(rawDivisor, 2) : rawDivisor & 0xffff
      const dividend = ooo === 7 ? this.d[dReg] | 0 : this.d[dReg] >>> 0
      const quotient = Math.trunc(dividend / divisor)
      const remainder = dividend % divisor
      this.d[dReg] = (((remainder & 0xffff) << 16) | (quotient & 0xffff)) >>> 0
      this.flags.n = quotient < 0
      this.flags.z = quotient === 0
      this.flags.v = ooo === 7 ? quotient > 0x7fff || quotient < -0x8000 : quotient > 0xffff
      this.flags.c = false
      return
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

  // --- SUB/SUBA/ADD/ADDA ------------------------------------------------

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

  // --- CMP / CMPA / EOR ---------------------------------------------------

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
    } else {
      const ea = this.decodeEA(eaMode, eaReg, size)
      const src = maskToSize(this.d[dReg], size)
      const dst = this.readEA(ea, size)
      const result = maskToSize(src ^ dst, size)
      this.writeEA(ea, size, result)
      setFlagsLogic(this.flags, result, size)
    }
  }

  // --- Groupe immédiat / bits (ORI, ANDI, SUBI, ADDI, EORI, CMPI, BTST...) ---

  private execImmediateOrBitGroup(opcode: number): void {
    const highByte = (opcode >> 8) & 0xff
    const eaMode = (opcode >> 3) & 0x7
    const eaReg = opcode & 0x7

    if ((opcode & 0xf100) === 0x0100 || (opcode & 0xffc0) === 0x0800 || (opcode & 0xffc0) === 0x0840 || (opcode & 0xffc0) === 0x0880 || (opcode & 0xffc0) === 0x08c0) {
      return this.execBitOp(opcode)
    }

    let size: Size
    let op: 'ori' | 'andi' | 'subi' | 'addi' | 'eori' | 'cmpi'
    if (highByte === 0x00) { op = 'ori'; size = STD_SIZES[(opcode >> 6) & 0x3] }
    else if (highByte === 0x02) { op = 'andi'; size = STD_SIZES[(opcode >> 6) & 0x3] }
    else if (highByte === 0x04) { op = 'subi'; size = STD_SIZES[(opcode >> 6) & 0x3] }
    else if (highByte === 0x06) { op = 'addi'; size = STD_SIZES[(opcode >> 6) & 0x3] }
    else if (highByte === 0x0a) { op = 'eori'; size = STD_SIZES[(opcode >> 6) & 0x3] }
    else if (highByte === 0x0c) { op = 'cmpi'; size = STD_SIZES[(opcode >> 6) & 0x3] }
    else throw new Error(`Opcode non supporté: 0x${opcode.toString(16).padStart(4, '0')}`)

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
        this.memory.write(addr, size, value)
        this.stepWrites.push({ address: addr, size })
        this.platform?.onMemoryWrite?.(this, addr, size, value)
      } else {
        const raw = this.memory.read(addr, size)
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

  // --- TRAP (E/S simulée façon EASy68K, uniquement TRAP #15) --------------

  private execTrap(number: number): void {
    if (this.platform?.onTrap?.(this, number)) return
    if (number !== 15) throw new Error('Seul TRAP #15 est simulé par cet environnement')
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
