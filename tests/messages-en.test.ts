/**
 * Messages du cœur en anglais (src/shared/messagesEn.ts) : chaque motif traduit son exemple en
 * gardant les valeurs insérées, et de vrais messages de l'assembleur, du simulateur et des
 * vérifications sont tous reconnus.
 */
import { describe, expect, it } from 'vitest'
import { MOTIFS, ligneEnAnglais, traduireMessage } from '../src/shared/messagesEn'
import { assemblerSource } from '../src/shared/assemblage'
import { platformFor, runBinary } from '../src/shared/runProgram'
import { evaluateCheck } from '../src/shared/checkResult'
import { materielAmiga } from '../src/platforms/amiga/chipset'
import { bilanAmiga } from '../src/platforms/amiga/kickstart'
import type { ExerciseCheck } from '../src/shared/ipc'

/** Valeurs d'un message : nombres, adresses, textes entre guillemets. */
function valeurs(message: string): string[] {
  const nombres = message.match(/\$[0-9A-Fa-f]+|\d+/g) ?? []
  const citations = [...message.matchAll(/« (.+?) »/g)].map((m) => m[1])
  return [...nombres, ...citations]
}

/** Ce qui trahit une phrase restée en français. */
const FRANCAIS = /[«»éèàùçêâôî]| : |\b(le|la|les|des|du|une|est|pas|dans|pour|avec)\b/

function verifierAnglais(fr: string): string {
  const en = ligneEnAnglais(fr)
  expect(en, `non reconnu : ${fr}`).not.toBeNull()
  expect(en, fr).not.toMatch(FRANCAIS)
  for (const v of valeurs(fr)) expect(en, `${fr}\n→ ${en}\n(valeur ${v} perdue)`).toContain(v)
  return en!
}

describe('table des messages anglais', () => {
  it.each(MOTIFS.map((m, i) => [i, m.exemple] as const))('motif %i : %s', (i, exemple) => {
    // L'exemple est reconnu par son propre motif, pas par un motif placé avant lui
    expect(MOTIFS.findIndex((m) => m.fr.test(exemple))).toBe(i)
    verifierAnglais(exemple)
  })

  it('le français reste tel quel, et une ligne inconnue aussi', () => {
    expect(traduireMessage('Valeur manquante.', 'fr')).toBe('Valeur manquante.')
    expect(traduireMessage('Bonjour Atari !\nValeur manquante.', 'en')).toBe('Bonjour Atari !\nMissing value.')
    expect(traduireMessage(undefined, 'en')).toBeUndefined()
    // Déjà en anglais : rien ne change
    expect(traduireMessage('Missing value.', 'en')).toBe('Missing value.')
  })

  it('les préfixes (macro, fichier inclus) et les remarques se traduisent avec leur message', () => {
    expect(traduireMessage('macros.i, ligne 3 : Dans la macro AFFICHE : Opérande manquant.', 'en')).toBe(
      'macros.i, line 3: In macro AFFICHE: Missing operand.'
    )
    expect(traduireMessage('⚠ Le Copper s’est arrêté : un MOVE vers DMACON ($DFF096) lui est interdit.', 'en')).toBe(
      '⚠ The Copper stopped: a MOVE to DMACON ($DFF096) is forbidden to it.'
    )
  })
})

// --- Vrais messages ------------------------------------------------------------------------

const ERREURS_ASSEMBLAGE = [
  '    MOVE.L D8,D0',
  '    MOVE.L DO,D1',
  '    BRA boucle\nBoucle:\n    RTS',
  '    BRA fni\nfin:\n    RTS',
  '    BRA nullepart',
  '    MOVEE.L D0,D1',
  '    XYZZY D0',
  '    MOVEQ #1,A0',
  '    TRAP #16',
  '    MOVE.L D0',
  '    MOVEA.B D0,A0',
  '    ADDA.B D0,A0',
  '    ADDQ.B #1,A0',
  '    MOVE.L #(1+2,D0',
  '    MOVE.L #5/0,D0',
  '    DC.B 300',
  '    DC.W 70000',
  "    DC.B 'abc",
  '    BRA.S suite\nsuite:\n    RTS',
  '    DS.W -1',
  '    INCLUDE "absent.i"',
  '    ENDM',
  '    IFEQ 0\n    NOP',
  '    SECTION truc,TOTO',
  '    MOVE.L 4(D0),D1',
  '    MOVE.L -(D0),D1',
  '    CMPM.B D0,D1',
  '    ADDX.L (A0),D0',
  '    LSL.L #9,D0',
  '    BTST.W #1,D0',
  'fin:\nfin:\n    RTS',
  '    FAIL trop grand',
  'X EQU',
  '    EQU 3'
]

const AVERTISSEMENTS = ['    MOVE.W 5,D0\n    RTS', '    MOVEQ #200,D0\n    RTS', "    DC.B 'A'\n    NOP\n    RTS", '    MOVEA.L D0,D1\n    RTS']

describe('vrais messages de l’assembleur', () => {
  it.each(ERREURS_ASSEMBLAGE)('erreur : %s', (corps) => {
    const r = assemblerSource(`    ORG $1000\nSTART:\n${corps}\n`)
    expect(r.errors.length, JSON.stringify(r)).toBeGreaterThan(0)
    for (const e of r.errors) verifierAnglais(e.message)
  })

  it.each(AVERTISSEMENTS)('avertissement : %s', (corps) => {
    const r = assemblerSource(`    ORG $1000\nSTART:\n${corps}\n`)
    expect(r.warnings?.length, JSON.stringify(r)).toBeGreaterThan(0)
    for (const e of r.warnings ?? []) verifierAnglais(e.message)
  })
})

function executer(corps: string, plateforme: 'atari' | 'amiga', options: { modeUtilisateur?: boolean } = {}, maxSteps = 200000) {
  const asm = assemblerSource(`${plateforme === 'atari' ? '    ORG $1000\n' : ''}START:\n${corps}\n`)
  if (!asm.success) throw new Error(JSON.stringify(asm.errors))
  return runBinary(asm.binary!, asm.baseAddress ?? 0, platformFor(plateforme, options), maxSteps)
}

describe('vrais messages du simulateur', () => {
  const plantages: [string, 'atari' | 'amiga', { modeUtilisateur?: boolean }][] = [
    ['    MOVE.W $1001,D0', 'atari', {}],
    ['    MOVE.W #$2700,SR', 'atari', { modeUtilisateur: true }],
    ['    MOVE.W $FF8240,D0', 'atari', { modeUtilisateur: true }],
    ['    MOVEQ #0,D1\n    DIVU D1,D0', 'atari', {}],
    ['    ILLEGAL', 'atari', {}],
    ['    MOVE.W #1,-(SP)\n    TRAP #1', 'atari', {}],
    ['    MOVE.W #99,-(SP)\n    TRAP #1', 'atari', {}],
    ['    DC.W $A00F', 'atari', {}],
    ['    MOVE.W $1001,D0', 'amiga', {}],
    ['    MOVEA.L 4.W,A6\n    JSR -6(A6)', 'amiga', {}]
  ]
  it.each(plantages)('%s (%s)', (corps, plateforme, options) => {
    const { last } = executer(corps, plateforme, options)
    expect(last.error).toBeTruthy()
    const en = traduireMessage(last.error!, 'en')
    expect(en).not.toMatch(FRANCAIS)
    for (const v of valeurs(last.error!)) expect(en).toContain(v)
  })

  it('remarques des puces et bilan du système de l’Amiga', () => {
    const { cpu } = executer(
      [
        '    MOVEA.L 4.W,A6',
        '    JSR -132(A6)', // Forbid
        '    MOVE.W #$7FFF,$DFF096', // DMA coupé
        '    MOVE.W #$0040,$DFF058', // BLTSIZE sans DMA
        '    MOVEQ #0,D0',
        '    RTS'
      ].join('\n'),
      'amiga'
    )
    const messages = [...(materielAmiga(cpu)?.alertes ?? []), ...(bilanAmiga(cpu)?.problemes ?? [])]
    expect(messages.length).toBeGreaterThan(1)
    for (const m of messages) verifierAnglais(m)
  })
})

describe('vrais messages des vérifications', () => {
  const cas: [string, ExerciseCheck][] = [
    ['    MOVEQ #41,D0\n    MOVE.B #9,D0\n    TRAP #15', { type: 'registers', maxSteps: 100, expected: { D1: '$0000002A', Z: '$1' } }],
    ['    MOVE.W #1,$2000\n    MOVE.B #9,D0\n    TRAP #15', { type: 'memory', maxSteps: 100, expected: { '$2000': '$0002' } }],
    ['    BRA START', { type: 'registers', maxSteps: 50, terminer: true, expected: { D0: '$00000000' } }],
    ['    PEA m(PC)\n    MOVE.W #9,-(SP)\n    TRAP #1\n    ADDQ.L #6,SP\n    CLR.W -(SP)\n    TRAP #1\nm: DC.B \'Bonjou\',0', { type: 'output', maxSteps: 1000, expected: { output: 'Bonjour' } }],
    ['    CLR.W -(SP)\n    TRAP #1', { type: 'pixels', maxSteps: 1000, expected: { '0,0': '1' } }],
    ['    CLR.W -(SP)\n    TRAP #1', { type: 'son', maxSteps: 1000, expected: { R7: '$3E' } }]
  ]
  it.each(cas)('%s', (corps, check) => {
    const { cpu } = executer(corps, 'atari', {}, check.maxSteps)
    const r = evaluateCheck(cpu, check)
    expect(r.success).toBe(false)
    const en = traduireMessage(r.message, 'en')
    for (const ligne of en.split('\n')) expect(ligne, r.message).not.toMatch(FRANCAIS)
  })

  it('réussites', () => {
    const { cpu } = executer('    MOVEQ #42,D0\n    MOVE.B #9,D0\n    TRAP #15', 'atari', {}, 100)
    const r = evaluateCheck(cpu, { type: 'registers', maxSteps: 100, expected: { D0: '$00000009' } })
    expect(r.success).toBe(true)
    expect(traduireMessage(r.message, 'en')).toBe('Well done, all the registers match.')
  })
})
