/**
 * Le désassembleur est vérifié par aller-retour : assembler → désassembler → réassembler doit
 * redonner exactement les mêmes octets, sur toute la matrice d'instructions et sur le parcours.
 * Quelques textes attendus vérifient en plus la présentation (syntaxe Devpac).
 */
import { readdirSync, readFileSync, statSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import { assembler } from '../../src/asm/assembleur'
import { desassembler, desassemblerInstruction, desassemblerPrg, sourceReassemblable } from '../../src/asm/desassembleur'
import { creerPrg, lirePrg } from '../../src/asm/prg'

const hex = (b: Uint8Array): string => Buffer.from(b).toString('hex')

function allerRetour(code: string): { ok: boolean; source?: string; avant?: string; apres?: string; erreur?: string } {
  const a = assembler(code)
  if (!a.ok) return { ok: true } // rien à vérifier
  const lignes = desassembler(a.binaire, { base: a.base })
  const source = sourceReassemblable(lignes, a.base)
  const b = assembler(source)
  if (!b.ok) return { ok: false, source, erreur: b.erreurs.map((e) => `l.${e.ligne} ${e.message}`).join(' | ') }
  return { ok: hex(a.binaire) === hex(b.binaire), source, avant: hex(a.binaire), apres: hex(b.binaire) }
}

function texte(code: string): string {
  const a = assembler('    ORG $1000\n' + code)
  expect(a.erreurs).toEqual([])
  const lire16 = (adr: number): number => (a.binaire[adr - 0x1000] << 8) | a.binaire[adr - 0x1000 + 1]
  const ins = desassemblerInstruction(lire16, 0x1000)
  return `${ins.mnemo} ${ins.operandes}`.trim()
}

describe('désassembleur', () => {
  it('présentation façon Devpac', () => {
    expect(texte(' MOVE.W #5,D0')).toBe('MOVE.W #$5,D0')
    expect(texte(' MOVEQ #-1,D3')).toBe('MOVEQ #-$1,D3')
    expect(texte(' MOVE.L (SP)+,D0')).toBe('MOVE.L (SP)+,D0')
    expect(texte(' MOVE.W -2(A0,D1.W),4(A1)')).toBe('MOVE.W -$2(A0,D1.W),$4(A1)')
    expect(texte(' MOVE.W $FFFF8240.W,D0')).toBe('MOVE.W $FFFF8240.W,D0')
    expect(texte(' MOVE.W $FF8240,D0')).toBe('MOVE.W $00FF8240,D0')
    expect(texte(' MOVEM.L D0-D2/A0/A6,-(SP)')).toBe('MOVEM.L D0-D2/A0/A6,-(SP)')
    expect(texte(' MOVEM.L (SP)+,D0-D7/A0-A6')).toBe('MOVEM.L (SP)+,D0-D7/A0-A6')
    expect(texte('L: DBRA D0,L')).toBe('DBRA D0,$1000')
    expect(texte(' BNE.S *+4')).toBe('BNE.S $1004')
    expect(texte(' LEA *+6(PC),A0')).toBe('LEA $1006(PC),A0')
    expect(texte(' TRAP #14')).toBe('TRAP #14')
    expect(texte(' ANDI #$DFFF,SR')).toBe('ANDI #$DFFF,SR')
    expect(texte(' LSL.W #8,D1')).toBe('LSL.W #8,D1')
    expect(texte(' DC.W $A000')).toBe('DC.W $A000    ; Ligne A')
  })

  it('aller-retour sur toute la matrice d’instructions', () => {
    const modes = ['D1', 'A2', '(A3)', '(A4)+', '-(A5)', '$10(A6)', '-2(A0,D1.W)', '4(A1,A2.L)', '$1234.W', '$FFFF8240.W', '$12345678', 'CIBLE', 'CIBLE(PC)', 'CIBLE(PC,D3.W)', '#5', '#$1234', 'SR', 'CCR', 'USP', 'D0-D2/A0']
    const tailles = ['', '.B', '.W', '.L', '.S']
    const deux = ['MOVE', 'MOVEA', 'ADD', 'ADDA', 'ADDI', 'ADDQ', 'ADDX', 'SUB', 'SUBA', 'SUBI', 'SUBQ', 'SUBX', 'AND', 'ANDI', 'OR', 'ORI', 'EOR', 'EORI', 'CMP', 'CMPA', 'CMPI', 'CMPM', 'MULU', 'MULS', 'DIVU', 'DIVS', 'CHK', 'LEA', 'EXG', 'BTST', 'BCHG', 'BCLR', 'BSET', 'ASL', 'ASR', 'LSL', 'LSR', 'ROL', 'ROR', 'ROXL', 'ROXR', 'MOVEP', 'MOVEM', 'ABCD', 'SBCD', 'MOVEQ', 'LINK', 'DBRA', 'DBNE']
    const un = ['CLR', 'NEG', 'NEGX', 'NOT', 'TST', 'NBCD', 'TAS', 'PEA', 'JMP', 'JSR', 'SWAP', 'EXT', 'UNLK', 'ST', 'SF', 'SEQ', 'SHI', 'ASL', 'LSR', 'ROXL', 'TRAP', 'STOP', 'BRA', 'BSR', 'BEQ', 'BGT', 'NOP', 'RTS', 'RTE', 'ILLEGAL']
    const lignes: string[] = []
    for (const m of deux) for (const t of tailles) for (const a of modes) for (const b of modes) lignes.push(`${m}${t} ${a},${b}`)
    for (const m of un) for (const t of tailles) for (const a of modes) lignes.push(`${m}${t} ${a}`)
    const valides = lignes.filter((l) => assembler(`    ORG $1000\nCIBLE: NOP\n    ${l}\n`).ok)
    expect(valides.length).toBeGreaterThan(5000)
    // Par lots de 200 lignes, chacune précédée de sa cible
    const echecs: string[] = []
    for (let i = 0; i < valides.length; i += 200) {
      const lot = valides.slice(i, i + 200)
      const code = '    ORG $1000\n' + lot.map((l, k) => `C${k}: NOP\n    ${l.replace(/CIBLE/g, `C${k}`)}`).join('\n') + '\n'
      const r = allerRetour(code)
      if (!r.ok) {
        // Retrouver la ligne fautive
        for (const l of lot) {
          const r1 = allerRetour(`    ORG $1000\nC: NOP\n    ${l.replace(/CIBLE/g, 'C')}\n`)
          if (!r1.ok) echecs.push(`${l} → ${r1.erreur ?? `${r1.avant} ≠ ${r1.apres}`}\n${r1.source}`)
        }
      }
    }
    expect(echecs.slice(0, 10), echecs.slice(0, 10).join('\n')).toEqual([])
  }, 600000)

  it('aller-retour sur tout le code du parcours', () => {
    const racine = join(__dirname, '../../content/parcours')
    const echecs: string[] = []
    const parcourir = (dir: string): void => {
      for (const f of readdirSync(dir)) {
        const p = join(dir, f)
        if (statSync(p).isDirectory()) parcourir(p)
        else if (f.endsWith('.s')) {
          for (const bloc of readFileSync(p, 'utf-8').replace(/\r\n/g, '\n').split(/^;=== .*$/m)) {
            const r = allerRetour(bloc)
            if (!r.ok) echecs.push(`${p}: ${r.erreur ?? `${r.avant} ≠ ${r.apres}`}\n${bloc.slice(0, 200)}`)
          }
        }
      }
    }
    parcourir(racine)
    expect(echecs, echecs.join('\n\n')).toEqual([])
  }, 300000)
})

describe('désassemblage d’un .PRG', () => {
  const programmes: Record<string, string> = {
    simple: 'START:\n PEA MSG\n MOVE.W #9,-(SP)\n TRAP #1\n ADDQ.L #6,SP\n CLR.W -(SP)\n TRAP #1\nMSG: DC.B \'Bonjour\',13,10,0',
    sections: ' SECTION TEXT\nSTART: LEA TABLE,A3\n MOVE.L #M2,D0\n MOVE.L COMPTEUR,D1\n JSR SOUS\n RTS\nSOUS: ADDQ.L #1,COMPTEUR\n RTS\n SECTION DATA\nTABLE: DC.L M1,M2\nM1: DC.B \'un\',0\nM2: DC.B \'deux\',0\n SECTION BSS\nCOMPTEUR: DS.L 1\nTAMPON: DS.B 100',
    symboles: ' OPT D+\nDEBUT: BSR AFFICHE\n RTS\nAFFICHE: LEA TEXTE(PC),A0\n RTS\nTEXTE: DC.B \'x\',0\n EVEN\n SECTION BSS\nPILE: DS.L 64'
  }
  for (const [nom, code] of Object.entries(programmes)) {
    it(`aller-retour .PRG → source → .PRG : ${nom}`, () => {
      const a = assembler(code, { prg: true })
      expect(a.erreurs).toEqual([])
      const prg = creerPrg(a)
      const source = desassemblerPrg(lirePrg(prg))
      const b = assembler(source, { prg: true })
      expect(b.erreurs.map((e) => `l.${e.ligne} ${e.message}`), source).toEqual([])
      expect(hex(creerPrg(b)), source).toBe(hex(prg))
    })
  }

  it('tout le parcours, en .PRG', () => {
    const racine = join(__dirname, '../../content/parcours')
    const echecs: string[] = []
    const parcourir = (dir: string): void => {
      for (const f of readdirSync(dir)) {
        const p = join(dir, f)
        if (statSync(p).isDirectory()) parcourir(p)
        else if (f.endsWith('.s')) {
          for (const bloc of readFileSync(p, 'utf-8').replace(/\r\n/g, '\n').split(/^;=== .*$/m)) {
            if (/^\s*ORG\b/im.test(bloc)) continue
            const a = assembler(bloc, { prg: true })
            if (!a.ok) continue
            const prg = creerPrg(a)
            const source = desassemblerPrg(lirePrg(prg))
            const b = assembler(source, { prg: true })
            if (!b.ok || hex(creerPrg(b)) !== hex(prg)) echecs.push(`${bloc.slice(0, 120)}\n→ ${b.erreurs.map((e) => e.message).join(' | ')}\n${source}`)
          }
        }
      }
    }
    parcourir(racine)
    expect(echecs.slice(0, 3), echecs.slice(0, 3).join('\n\n')).toEqual([])
  }, 300000)
})
