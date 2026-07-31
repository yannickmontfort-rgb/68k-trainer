import type { Flags, Size } from './types'

export function bitsForSize(size: Size): number {
  return size === 1 ? 8 : size === 2 ? 16 : 32
}

export function maskToSize(value: number, size: Size): number {
  if (size === 1) return value & 0xff
  if (size === 2) return value & 0xffff
  return value >>> 0
}

export function signExtend(value: number, size: Size): number {
  const bits = bitsForSize(size)
  const masked = maskToSize(value, size)
  const signBit = 1 << (bits - 1)
  if (bits === 32) return masked | 0
  return (masked & signBit) !== 0 ? masked - (1 << bits) : masked
}

export function isNegative(value: number, size: Size): boolean {
  const bits = bitsForSize(size)
  const signBit = bits === 32 ? 0x80000000 : 1 << (bits - 1)
  return (maskToSize(value, size) & signBit) !== 0
}

/** N/Z depuis le résultat, V et C forcés à false (AND/OR/EOR/NOT/MOVE/TST). X inchangé. */
export function setFlagsLogic(flags: Flags, result: number, size: Size): void {
  flags.n = isNegative(result, size)
  flags.z = maskToSize(result, size) === 0
  flags.v = false
  flags.c = false
}

/** N/Z/V/C/X pour a + b (addition), résultat déjà calculé en arithmétique JS normale (peut dépasser la taille). */
export function setFlagsAdd(flags: Flags, a: number, b: number, size: Size): number {
  const ua = maskToSize(a, size)
  const ub = maskToSize(b, size)
  const bits = bitsForSize(size)
  const full = ua + ub
  const result = maskToSize(full, size)
  const signA = isNegative(ua, size)
  const signB = isNegative(ub, size)
  const signR = isNegative(result, size)
  flags.n = signR
  flags.z = result === 0
  flags.v = signA === signB && signR !== signA
  flags.c = full >= 2 ** bits
  flags.x = flags.c
  return result
}

/** N/Z/V/C/X pour a - b (soustraction). */
export function setFlagsSub(flags: Flags, a: number, b: number, size: Size): number {
  const ua = maskToSize(a, size)
  const ub = maskToSize(b, size)
  const full = ua - ub
  const result = maskToSize(full, size)
  const signA = isNegative(ua, size)
  const signB = isNegative(ub, size)
  const signR = isNegative(result, size)
  flags.n = signR
  flags.z = result === 0
  flags.v = signA !== signB && signR === signB
  flags.c = full < 0
  flags.x = flags.c
  return result
}

export function testCondition(code: number, flags: Flags): boolean {
  switch (code) {
    case 0x0:
      return true // T
    case 0x1:
      return false // F
    case 0x2:
      return !flags.c && !flags.z // HI
    case 0x3:
      return flags.c || flags.z // LS
    case 0x4:
      return !flags.c // CC
    case 0x5:
      return flags.c // CS
    case 0x6:
      return !flags.z // NE
    case 0x7:
      return flags.z // EQ
    case 0x8:
      return !flags.v // VC
    case 0x9:
      return flags.v // VS
    case 0xa:
      return !flags.n // PL
    case 0xb:
      return flags.n // MI
    case 0xc:
      return flags.n === flags.v // GE
    case 0xd:
      return flags.n !== flags.v // LT
    case 0xe:
      return flags.n === flags.v && !flags.z // GT
    case 0xf:
      return flags.z || flags.n !== flags.v // LE
    default:
      return false
  }
}
