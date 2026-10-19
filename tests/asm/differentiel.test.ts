/**
 * Comparaison octet par octet de l'assembleur maison avec vasm -devpac (l'oracle).
 * 1. Tout le code du parcours.
 * 2. Une matrice générée : toutes les instructions × tailles × modes d'adressage.
 * 3. Des cas choisis : branchements, directives, expressions, macros…
 */
import { readdirSync, readFileSync, statSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import { assembler } from '../../src/asm/assembleur'

import { prepareSource, vasm, vasmDisponible } from '../helpers/vasm'

const hex = (b: Uint8Array): string => Buffer.from(b).toString('hex')

/** Blocs ;=== des fichiers code.s du parcours. */
function corpusParcours(): { nom: string; code: string }[] {
  const racine = join(__dirname, '../../content/parcours')
  const blocs: { nom: string; code: string }[] = []
  const parcourir = (dir: string): void => {
    for (const f of readdirSync(dir)) {
      const p = join(dir, f)
      if (statSync(p).isDirectory()) parcourir(p)
      else if (f.endsWith('.s')) {
        const lignes = readFileSync(p, 'utf-8').replace(/\r\n/g, '\n').split('\n')
        let nom = ''
        let courant: string[] = []
        const fin = (): void => {
          if (nom) blocs.push({ nom: `${p.slice(racine.length + 1)}#${nom}`, code: courant.join('\n') })
        }
        for (const l of lignes) {
          if (l.startsWith(';=== ')) {
            fin()
            nom = l.slice(5).trim()
            courant = []
          } else courant.push(l)
        }
        fin()
      }
    }
  }
  parcourir(racine)
  return blocs
}

/**
 * Programme de test : chaque ligne a son ORG propre (adresse fixée par son numéro global, pour
 * que les étiquettes absolues aient la même valeur seule ou dans un lot) et sa cible juste avant.
 * Une ligne occupe 3 lignes de source : ORG, cible, instruction.
 */
const programme = (ls: { texte: string; num: number }[]): string =>
  ls.map(({ texte, num }) => `    ORG $${(0x1000 + num * 0x40).toString(16)}\nC${num}: NOP\n    ${texte.replace(/CIBLE/g, `C${num}`)}`).join('\n') + '\n'

/**
 * Compare ligne par ligne : nos octets (ou notre refus) contre ceux de vasm, lus dans son
 * listing. vasm est appelé par lots ; une ligne qu'il refuse est retirée du lot, qu'on relance.
 */
function comparerLignes(lignes: string[]): string[] {
  const nos = lignes.map((l, i) => {
    const r = assembler(programme([{ texte: l, num: i }]))
    return r.ok ? hex(r.binaire.slice(2)).toUpperCase() : null
  })
  const refVasm: (string | null)[] = new Array(lignes.length).fill(undefined)
  const LOT = 200
  for (let debut = 0; debut < lignes.length; debut += LOT) {
    let lot = Array.from({ length: Math.min(LOT, lignes.length - debut) }, (_, k) => debut + k)
    for (let essai = 0; essai < 400 && lot.length > 0; essai++) {
      const r = vasm(programme(lot.map((i) => ({ texte: lignes[i], num: i }))))
      const fautives = new Set(r.lignesErreur.filter((n) => n >= 3).map((n) => Math.floor((n - 3) / 3)))
      if (fautives.size > 0 || !r.ok) {
        if (fautives.size === 0) break
        for (const k of fautives) refVasm[lot[k]] = null
        lot = lot.filter((_, k) => !fautives.has(k))
        continue
      }
      lot.forEach((i, k) => (refVasm[i] = r.octetsParLigne.get(3 + 3 * k) ?? ''))
      lot = []
    }
  }
  const ecarts: string[] = []
  lignes.forEach((l, i) => {
    if (refVasm[i] === undefined) return
    if (nos[i] !== refVasm[i]) ecarts.push(`${l.padEnd(34)} vasm=${refVasm[i] ?? 'refus'}  nous=${nos[i] ?? 'refus'}`)
  })
  return ecarts
}

describe.skipIf(!vasmDisponible)('assembleur maison = vasm -devpac', () => {
  it('tout le code du parcours', () => {
    const differences: string[] = []
    for (const { nom, code } of corpusParcours()) {
      const ref = vasm(prepareSource(code).source)
      const lineOffset = prepareSource(code).lineOffset
      const nous = assembler(code)
      if (!ref.ok) {
        if (nous.ok) differences.push(`${nom} : vasm refuse (${ref.sortie.trim().split('\n')[0]}), nous acceptons`)
        continue
      }
      if (!nous.ok) {
        differences.push(`${nom} : vasm accepte, nous refusons : ${nous.erreurs.map((e) => `l.${e.ligne} ${e.message}`).join(' | ')}`)
        continue
      }
      if (hex(ref.binaire) !== hex(nous.binaire)) differences.push(`${nom} : octets différents\n  vasm  ${hex(ref.binaire)}\n  nous  ${hex(nous.binaire)}`)
      void lineOffset
    }
    expect(differences, differences.join('\n')).toEqual([])
  }, 300000)

  it('matrice : instructions × tailles × modes d’adressage', () => {
    const modes = ['D1', 'A2', '(A3)', '(A4)+', '-(A5)', '$10(A6)', '-2(A0,D1.W)', '4(A1,A2.L)', '$1234.W', '$12345678', 'CIBLE', 'CIBLE(PC)', 'CIBLE(PC,D3.W)', '#5', '#$1234', 'SR', 'CCR', 'USP', 'D0-D2/A0']
    const tailles = ['', '.B', '.W', '.L']
    const deux = ['MOVE', 'MOVEA', 'ADD', 'ADDA', 'ADDI', 'ADDQ', 'ADDX', 'SUB', 'SUBA', 'SUBI', 'SUBQ', 'SUBX', 'AND', 'ANDI', 'OR', 'ORI', 'EOR', 'EORI', 'CMP', 'CMPA', 'CMPI', 'CMPM', 'MULU', 'MULS', 'DIVU', 'DIVS', 'CHK', 'LEA', 'EXG', 'BTST', 'BCHG', 'BCLR', 'BSET', 'ASL', 'ASR', 'LSL', 'LSR', 'ROL', 'ROR', 'ROXL', 'ROXR', 'MOVEP', 'MOVEM', 'ABCD', 'SBCD', 'MOVEQ', 'LINK']
    const un = ['CLR', 'NEG', 'NEGX', 'NOT', 'TST', 'NBCD', 'TAS', 'PEA', 'JMP', 'JSR', 'SWAP', 'EXT', 'UNLK', 'ST', 'SF', 'SEQ', 'SNE', 'SHI', 'SLS', 'SCC', 'SCS', 'SGE', 'SLT', 'ASL', 'LSR', 'ROXL', 'TRAP', 'STOP']
    const lignes: string[] = []
    for (const m of deux) for (const t of tailles) for (const a of modes) for (const b of modes) lignes.push(`${m}${t} ${a},${b}`)
    for (const m of un) for (const t of tailles) for (const a of modes) lignes.push(`${m}${t} ${a}`)

    const ecarts = comparerLignes(lignes)
    const parMnemo = new Map<string, number>()
    for (const e of ecarts) parMnemo.set(e.split(' ')[0], (parMnemo.get(e.split(' ')[0]) ?? 0) + 1)
    const resume = [...parMnemo].map(([m, k]) => `${m}:${k}`).join(' ')
    expect(ecarts.length, `${ecarts.length} écarts avec vasm (${resume}), par exemple :\n${ecarts.slice(0, 60).join('\n')}`).toBe(0)
  }, 900000)

  const cas: Record<string, string> = {
    branchements: 'A: NOP\n BRA A\n BRA.S A\n BEQ B\n BNE.S B\n BSR B\n DBRA D0,A\n DBEQ D1,B\n NOP\nB: RTS\n BHS A\n BLO B\nB2: BRA.W B2',
    'branchements longs': 'A: NOP\n DCB.B 200,0\n BRA A\n BRA C\n DCB.B 3000,0\nC: NOP',
    moveq: ' MOVEQ #0,D0\n MOVEQ #-128,D1\n MOVEQ #127,D7\n MOVEQ #-1,D3',
    'données': ' DC.B 1,2,3\n DC.W 4\n DC.L 5\n DC.B "texte",0\n DC.B \'it\'\'s\'\n EVEN\n DS.B 3\n DS.W 2\n DCB.W 3,$AB\n DC.L L\nL: DC.W L-*',
    'alignement Devpac': ' DC.B 1\n NOP\n DC.B 2\nX:\n DC.W 3\n DC.B 4\nY DC.L 5\n DC.B 6\n DS.W 0\n DC.B 7\n CNOP 0,4\n NOP',
    expressions: 'X EQU 5\nY = X*2+1\nZ SET 3\nZ SET Z+1\n DC.L X,Y,Z,1<<2*3,6&3*2,1|2*3,-7/2,-7//2,~0&$F,!0,$10!$01,1+2=3,5%3,\'AB\',%1010,@17\n MOVEQ #Y,D0',
    'étiquettes locales': 'A: NOP\n.x NOP\n BRA.S .x\nB: NOP\n.x NOP\n BRA.S .x\n1$ NOP\n BRA.S 1$',
    rs: ' RSRESET\nA RS.W 1\nB RS.L 2\nC RS.B 1\nD RS.W 1\n MOVEQ #C,D0\n MOVEQ #D,D1\n MOVEQ #__RS,D2',
    macros: 'M MACRO\n MOVE.\\0 #\\1,\\2\n ENDM\nN MACRO\nL\\@ NOP\n BRA.S L\\@\n DC.W NARG\n ENDM\n M.W 5,D0\n M.L 6,D1\n N\n N 1,2,3',
    rept: ' REPT 3\n NOP\n ENDR\n REPT 2\n DC.B 1\n REPT 2\n DC.B 2\n ENDR\n ENDR',
    conditions: 'X EQU 0\n IFEQ X\n NOP\n ELSE\n ILLEGAL\n ENDC\n IFNE X\n RTS\n ENDC\n IFD X\n NOP\n ENDC\n IFND Y\n NOP\n ENDC\n IFGT 2\n NOP\n ENDC',
    'adressages variés': ' MOVE.W (A0,D1),D0\n MOVE.W 2(A0,D1.L),D0\n MOVE.W -1(A0,A1.W),D0\n MOVE.W (4,A0),D1\n MOVE.W (2,A0,D0.W),D1\n MOVE.L $4.W,A6\n MOVE.W $FFFF8240.W,D0\n LEA L(PC),A0\n MOVE.W L(PC,D0.W),D1\nL: NOP\n MOVE.W (L),D2\n MOVE.L (SP)+,D0\n MOVE.L D0,-(SP)\n MOVEM.L (SP)+,D0-D7/A0-A6\n MOVEM.W D0/D2/A1,-(A7)',
    'casse et commentaires': ' move.w d0,d1\n Move.L A0,(a1)+ ; commentaire\n* ligne de commentaire\n NOP commentaire sans point-virgule\n\tNOP',
    'fin du source': ' NOP\n END\n ILLEGAL'
  }
  for (const [nom, code] of Object.entries(cas)) {
    it(`cas : ${nom}`, () => {
      const source = '    ORG $1000\n' + code + '\n'
      const ref = vasm(source)
      const nous = assembler(source)
      expect(nous.erreurs.map((e) => `l.${e.ligne} ${e.message}`)).toEqual([])
      expect(ref.ok, ref.sortie).toBe(true)
      expect(hex(nous.binaire)).toBe(hex(ref.binaire))
    })
  }
})
