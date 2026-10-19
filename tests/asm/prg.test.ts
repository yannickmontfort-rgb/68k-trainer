/**
 * Export .PRG : nos fichiers comparés octet par octet à ceux de vasm -Ftos -devpac (-monst pour
 * les symboles, que vasm range dans un ordre arbitraire : on les compare comme un ensemble).
 */
import { readdirSync, readFileSync, statSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import { assembler } from '../../src/asm/assembleur'
import { creerPrg, empechementPrg } from '../../src/asm/prg'
import { vasm, vasmDisponible } from '../helpers/vasm'

const hex = (b: Uint8Array): string => Buffer.from(b).toString('hex')

const prgMaison = (source: string, symboles?: boolean): Uint8Array => {
  const r = assembler(source, { prg: true })
  expect(r.erreurs.map((e) => `l.${e.ligne} ${e.message}`)).toEqual([])
  return creerPrg(r, { symboles })
}

/** Découpe un .PRG en parties ; la table des symboles est triée par entrées de 14 octets. */
function parties(prg: Uint8Array): Record<string, string> {
  const v = new DataView(prg.buffer, prg.byteOffset)
  const t = v.getUint32(2)
  const d = v.getUint32(6)
  const s = v.getUint32(14)
  const sym: string[] = []
  for (let o = 28 + t + d; o < 28 + t + d + s; o += 14) sym.push(hex(prg.slice(o, o + 14)))
  return {
    entete: hex(prg.slice(0, 28)),
    text: hex(prg.slice(28, 28 + t)),
    data: hex(prg.slice(28 + t, 28 + t + d)),
    symboles: sym.sort().join(' '),
    relocation: hex(prg.slice(28 + t + d + s))
  }
}

const cas: Record<string, string> = {
  'TEXT, DATA, BSS et relocations': `
\tTEXT
debut:\tlea\tmessage(pc),a0
\tmove.l\t#message,-(sp)
\tmove.w\t#9,-(sp)
\ttrap\t#1
\taddq.l\t#6,sp
\tmove.l\ttampon,d0
\tlea\tloin,a1
\tclr.w\t-(sp)
\ttrap\t#1
\tDCB.B\t600,0
loin:\tdc.l\tdebut
\tDATA
message:\tdc.b\t"Bonjour",13,10,0
\teven
ptr:\tdc.l\tmessage,tampon
\tBSS
tampon:\tds.l\t10
`,
  'tailles impaires': '\tTEXT\n\tnop\n\tdc.b\t1\n\tDATA\nm:\tdc.b\t1,2,3\n\tBSS\nt:\tds.b\t3\n',
  'sans relocation': '\tmoveq\t#0,d0\n\trts\n',
  'écarts de relocation au-delà de 254': '\tdc.l\tx\n\tdcb.b\t254,0\n\tdc.l\tx\n\tdcb.b\t1000,0\n\tdc.l\tx\nx:\tdc.l\tx\n',
  'sans section explicite': 'go:\tpea\ttexte(pc)\n\tmove.w\t#9,-(sp)\n\ttrap\t#1\n\tclr.w\t(sp)\n\ttrap\t#1\ntexte:\tdc.b\t"Salut",0\n'
}

describe.skipIf(!vasmDisponible)('export .PRG = vasm -Ftos -devpac', () => {
  for (const [nom, source] of Object.entries(cas)) {
    it(`cas : ${nom}`, () => {
      const ref = vasm(source, 'tos')
      expect(ref.ok, ref.sortie).toBe(true)
      expect(parties(prgMaison(source))).toEqual(parties(ref.binaire))
    })
  }

  it('OPT D+ : table de symboles comme vasm -monst', () => {
    const source = '\tOPT\tD+\nK\tEQU\t5\n\tTEXT\ndebut:\tlea\tmessage,a0\nautre:\trts\n.local\tnop\n\tDATA\nmessage:\tdc.b\t"Bonjour",0\n\tBSS\ntampon:\tds.l\t10\n'
    const ref = vasm(source, 'tos', ['-monst'])
    expect(ref.ok, ref.sortie).toBe(true)
    expect(parties(prgMaison(source))).toEqual(parties(ref.binaire))
  })

  it('symboles demandés sans OPT D+', () => {
    const source = '\tTEXT\ndebut:\tnop\n\tDATA\nm:\tdc.w\t1\n'
    const ref = vasm('\tOPT\tD+\n' + source, 'tos', ['-monst'])
    expect(parties(prgMaison(source, true))).toEqual(parties(ref.binaire))
  })

  it('tout le code du parcours qui se construit en .PRG', () => {
    const racine = join(__dirname, '../../content/parcours')
    const differences: string[] = []
    let compares = 0
    const parcourir = (dir: string): void => {
      for (const f of readdirSync(dir)) {
        const p = join(dir, f)
        if (statSync(p).isDirectory()) parcourir(p)
        else if (f.endsWith('.s')) {
          const blocs = readFileSync(p, 'utf-8').replace(/\r\n/g, '\n').split(/^;=== /m).slice(1)
          for (const bloc of blocs) {
            const nom = `${f}#${bloc.split('\n')[0].trim()}`
            const code = bloc.split('\n').slice(1).join('\n')
            const ref = vasm(code, 'tos')
            const nous = assembler(code, { prg: true })
            if (!ref.ok || empechementPrg(nous)) {
              if (ref.ok !== !empechementPrg(nous)) differences.push(`${nom} : vasm ${ref.ok ? 'accepte' : 'refuse'}, nous ${empechementPrg(nous) ?? 'acceptons'}`)
              continue
            }
            compares++
            if (hex(creerPrg(nous)) !== hex(ref.binaire)) differences.push(`${nom} : .PRG différent`)
          }
        }
      }
    }
    parcourir(racine)
    expect(differences, differences.join('\n')).toEqual([])
    expect(compares).toBeGreaterThan(50)
  }, 300000)

  it('refuse un programme avec ORG', () => {
    const r = assembler('\tORG\t$1000\n\tnop\n', { prg: true })
    expect(empechementPrg(r)).toMatch(/ORG/)
    expect(() => creerPrg(r)).toThrow(/ORG/)
  })
})
