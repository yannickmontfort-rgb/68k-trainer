/**
 * Export en exécutable AmigaDOS : comparé à vasm -Fhunkexe quand le programme n'a qu'une section,
 * relu, puis chargé ailleurs en mémoire (relocations) et exécuté sur l'Amiga simulé.
 */
import { describe, expect, it } from 'vitest'
import { assembler } from '../../src/asm/assembleur'
import { chargerHunks, creerHunk, empechementHunk, lireHunk } from '../../src/asm/hunk'
import { Cpu } from '../../src/cpu/cpu'
import { createAmiga } from '../../src/platforms/amiga'
import { vasm, vasmDisponible } from '../helpers/vasm'
import { avecDemarrageAmiga } from '../../src/asm/demarrageAmiga'

const hex = (b: Uint8Array): string => Buffer.from(b).toString('hex')

const SIMPLE = `
debut:\tlea\tmessage(pc),a0
\tmove.l\t#message,d0
\tmove.l\ttable,d1
\tlea\tfin,a1
\trts
message:\tdc.b\t'Amiga',0
\teven
table:\tdc.l\tdebut,message,fin
fin:\tds.l\t2
`

const AVEC_SECTIONS = `
\tSECTION code,CODE
\tmovea.l\t4.w,a6
\tlea\tdos(pc),a1
\tjsr\t-408(a6)
\tmovea.l\td0,a6
\tjsr\t-60(a6)
\tmove.l\td0,d1
\tmove.l\tpointeur,d2
\tmoveq\t#6,d3
\tjsr\t-48(a6)
\tmove.l\t#compteur,a0
\taddq.l\t#1,(a0)
\tmoveq\t#0,d0
\trts
dos:\tdc.b\t'dos.library',0
\tSECTION donnees,DATA_C
pointeur:\tdc.l\ttexte
texte:\tdc.b\t'Salut',10
\tSECTION vide,BSS_C
compteur:\tds.l\t1
`

describe('Exécutable AmigaDOS (hunks)', () => {
  it.skipIf(!vasmDisponible)('programme sans section : identique à vasm -Fhunkexe', () => {
    const r = assembler(SIMPLE, { prg: true })
    expect(r.erreurs).toEqual([])
    const ref = vasm(SIMPLE, 'hunkexe', ['-kick1hunks'])
    expect(ref.ok, ref.sortie).toBe(true)
    expect(hex(creerHunk(r))).toBe(hex(ref.binaire))
  })

  it('relu : un hunk de code en Chip RAM, relocations et symboles', () => {
    const r = assembler('    OPT D+\n' + AVEC_SECTIONS, { prg: true })
    expect(r.erreurs).toEqual([])
    const hunks = lireHunk(creerHunk(r))
    expect(hunks).toHaveLength(1)
    expect(hunks[0].type).toBe('CODE')
    expect(hunks[0].chip).toBe(true)
    expect(hunks[0].relocs.get(0)?.length).toBe(r.relocs.length)
    expect(hunks[0].symboles.map((s) => s.nom)).toContain('compteur')
  })

  it('chargé en $30000 par « LoadSeg » : il tourne sur l’Amiga simulé', () => {
    const r = assembler(AVEC_SECTIONS, { prg: true })
    const { image, adresses } = chargerHunks(lireHunk(creerHunk(r)), 0x30000)
    const cpu = new Cpu(createAmiga())
    cpu.reset(adresses[0])
    cpu.loadProgram(adresses[0], image)
    for (let i = 0; i < 100000 && !cpu.halted; i++) cpu.step()
    expect(cpu.output).toBe('Salut\n')
    const compteur = adresses[0] + r.symboles.find((s) => s.nom === 'compteur')!.valeur - r.base
    expect(cpu.memory.readU32(compteur)).toBe(1)
  })

  it.skipIf(!vasmDisponible)('un exécutable à plusieurs hunks fait par vasm se relit et se charge', () => {
    const source = AVEC_SECTIONS.replace('lea\tdos(pc),a1', 'lea\tdos,a1')
    const ref = vasm(source, 'hunkexe')
    expect(ref.ok, ref.sortie).toBe(true)
    const hunks = lireHunk(ref.binaire)
    expect(hunks.map((h) => h.type)).toEqual(['CODE', 'DATA', 'BSS'])
    expect(hunks[1].chip).toBe(true)
    const { image, adresses } = chargerHunks(hunks, 0x30000)
    const cpu = new Cpu(createAmiga())
    cpu.reset(adresses[0])
    cpu.loadProgram(adresses[0], image)
    for (let i = 0; i < 100000 && !cpu.halted; i++) cpu.step()
    expect(cpu.output).toBe('Salut\n')
  })

  it('avec le code de démarrage (Shell ou Workbench) : lancé depuis le Shell, rien ne change', () => {
    const r = assembler(avecDemarrageAmiga(AVEC_SECTIONS), { prg: true })
    expect(r.erreurs).toEqual([])
    const { image, adresses } = chargerHunks(lireHunk(creerHunk(r)), 0x30000)
    const cpu = new Cpu(createAmiga())
    cpu.reset(adresses[0])
    cpu.loadProgram(adresses[0], image)
    for (let i = 0; i < 100000 && !cpu.halted; i++) cpu.step()
    expect(cpu.output).toBe('Salut\n')
    expect(cpu.d[0]).toBe(0)
  })

  it('refuse un programme avec ORG', () => {
    expect(empechementHunk(assembler('    ORG $1000\n    RTS', { prg: true }))).toMatch(/ORG/)
  })
})
