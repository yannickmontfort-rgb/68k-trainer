/** Les messages de l'assembleur maison, pensés pour des débutants. */
import { describe, expect, it } from 'vitest'
import { assemble } from '../helpers/assemble'

const premier = (src: string) => assemble(src).errors[0]

describe('messages de l’assembleur pour débutants', () => {
  it('étiquette inconnue : ligne, colonne et suggestion', () => {
    const e = premier('START: NOP\nBOUCLE: NOP\n    BRA BOUCEL\n')
    expect(e.line).toBe(3)
    expect(e.column).toBe(9)
    expect(e.message).toContain('« BOUCLE »')
  })

  it('majuscules et minuscules dans les étiquettes', () => {
    expect(premier('Boucle: NOP\n    BRA BOUCLE\n').message).toContain('majuscules')
  })

  it('registre inexistant', () => {
    expect(premier('    MOVE.L #1,D8\n').message).toContain('D0 à D7')
  })

  it('instruction mal orthographiée : suggestion', () => {
    expect(premier('    MOVX.W D0,D1\n').message).toContain('« MOVE »')
  })

  it('MOVEQ hors limites', () => {
    expect(premier('    MOVEQ #300,D0\n').message).toContain('-128 à 127')
  })

  it('.B sur un registre d’adresse', () => {
    expect(premier('    MOVE.B D0,A1\n').message).toContain("registre d'adresse")
  })

  it('BRA.S vers l’instruction suivante', () => {
    expect(premier('    BRA.S L\nL: NOP\n').message).toContain('juste après')
  })

  it('comme Devpac : alignement automatique, avec un avertissement', () => {
    const r = assemble('    DC.B 1\n    NOP\n')
    expect(r.success).toBe(true)
    expect(r.binary.length).toBe(4)
    expect(r.warnings[0].message).toContain('EVEN')
  })

  it('sans ORG, le programme est en $1000 et les lignes ne sont pas décalées', () => {
    const r = assemble('START:\n    MOVEQ #1,D0\n    RTS\n')
    expect(r.baseAddress).toBe(0x1000)
    expect(r.addressToLine[0x1000]).toBe(2)
  })

  it('TEXT / DATA / BSS : vraies sections', () => {
    const r = assemble('    SECTION TEXT\n    MOVE.W VAL,D0\n    RTS\n    SECTION DATA\nVAL: DC.W 5\n    SECTION BSS\nBUF: DS.L 1\n')
    expect(r.success).toBe(true)
  })
})
