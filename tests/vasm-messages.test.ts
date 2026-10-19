import { describe, expect, it } from 'vitest'
import { assemble } from './helpers/assemble'

describe('messages de vasm pour débutants', () => {
  it('symbole non défini : situé dans le source et reformulé', () => {
    const asm = assemble('    ORG $1000\n    MOVEQ #1,D0\n    BRA NULLEPART\n')
    expect(asm.success).toBe(false)
    expect(asm.errors[0].line).toBe(3)
    expect(asm.errors[0].message).toContain('NULLEPART')
    expect(asm.errors[0].original).toContain('undefined symbol')
  })

  it('registre inexistant', () => {
    const asm = assemble('    ORG $1000\n    MOVE.L #1,D8\n')
    expect(asm.errors[0].message).toContain('D0 à D7')
  })

  it('MOVEQ hors limites', () => {
    const asm = assemble('    ORG $1000\n    MOVEQ #300,D0\n')
    expect(asm.errors[0].line).toBe(2)
    expect(asm.errors[0].message).toContain('-128 à 127')
  })

  it('.B sur un registre d’adresse', () => {
    const asm = assemble('    ORG $1000\n    MOVE.B D0,A1\n')
    expect(asm.errors[0].message).toContain('registre d')
  })

  it('pas d’alignement automatique : une instruction après DC.B impair reste impaire', () => {
    const asm = assemble('    ORG $1000\n    DC.B 1\n    NOP\n')
    expect(asm.success).toBe(true)
    expect(asm.binary.length).toBe(3)
  })
})

describe('sources façon Devpac', () => {
  it('sans ORG : programme placé en $1000, numéros de ligne inchangés', () => {
    const asm = assemble('START:\n    MOVEQ #1,D0\n    RTS\n')
    expect(asm.success).toBe(true)
    expect(asm.baseAddress).toBe(0x1000)
    expect(asm.addressToLine[0x1000]).toBe(2)
  })

  it('TEXT / DATA / BSS mis bout à bout', () => {
    const asm = assemble('    SECTION TEXT\n    MOVE.W VAL,D0\n    RTS\n    SECTION DATA\nVAL: DC.W 5\n    SECTION BSS\nBUF: DS.L 1\n')
    expect(asm.success).toBe(true)
  })

  it('erreur sans ORG : bonne ligne', () => {
    const asm = assemble('START:\n    MOVX D0,D1\n')
    expect(asm.errors[0].line).toBe(2)
  })
})
