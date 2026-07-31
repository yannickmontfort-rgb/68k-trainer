import type { Size } from './types'

export class Memory {
  readonly size: number
  private readonly buffer: ArrayBuffer
  private readonly view: DataView

  constructor(size: number) {
    this.size = size
    this.buffer = new ArrayBuffer(size)
    this.view = new DataView(this.buffer)
  }

  reset(): void {
    new Uint8Array(this.buffer).fill(0)
  }

  loadBytes(address: number, bytes: Uint8Array): void {
    new Uint8Array(this.buffer).set(bytes, address)
  }

  readU8(address: number): number {
    return this.view.getUint8(address)
  }

  readU16(address: number): number {
    return this.view.getUint16(address, false)
  }

  readU32(address: number): number {
    return this.view.getUint32(address, false)
  }

  readS8(address: number): number {
    return this.view.getInt8(address)
  }

  readS16(address: number): number {
    return this.view.getInt16(address, false)
  }

  readS32(address: number): number {
    return this.view.getInt32(address, false)
  }

  writeU8(address: number, value: number): void {
    this.view.setUint8(address, value & 0xff)
  }

  writeU16(address: number, value: number): void {
    this.view.setUint16(address, value & 0xffff, false)
  }

  writeU32(address: number, value: number): void {
    this.view.setUint32(address, value >>> 0, false)
  }

  read(address: number, size: Size): number {
    if (size === 1) return this.readU8(address)
    if (size === 2) return this.readU16(address)
    return this.readU32(address)
  }

  write(address: number, size: Size, value: number): void {
    if (size === 1) this.writeU8(address, value)
    else if (size === 2) this.writeU16(address, value)
    else this.writeU32(address, value)
  }

  readCString(address: number, maxLength = 4096): string {
    let result = ''
    let addr = address
    while (result.length < maxLength) {
      const byte = this.readU8(addr)
      if (byte === 0) break
      result += String.fromCharCode(byte)
      addr += 1
    }
    return result
  }
}
