import { describe, expect, it } from 'vitest'
import { assembler } from '../../src/asm/assembleur'

describe('REPT', () => {
  it('une étiquette sur la ligne du REPT désigne le début du bloc (comme vasm)', () => {
    const r = assembler('    ORG $0\ndebut:\tnop\ntab:\tREPT 3\n\tdc.w 1\n\tENDR\nfin:\tlea\ttab,a0\n')
    expect(r.erreurs).toEqual([])
    expect(Buffer.from(r.binaire).toString('hex')).toBe('4e7100010001000141f900000002')
  })
})
