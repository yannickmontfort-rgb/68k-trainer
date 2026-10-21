/**
 * Les exemples complets des fiches de référence tournent dans le simulateur et donnent bien ce que
 * leurs commentaires annoncent. Chaque exemple est retrouvé dans sa fiche par un extrait de texte
 * qui lui est propre (et non par son numéro, qui change quand on complète une fiche).
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import { assemble } from './helpers/assemble'
import { lancer } from './helpers/amiga'
import { runBinary } from '../src/shared/runProgram'
import { createAtariSt } from '../src/platforms/atari-st'
import { materielAtari } from '../src/platforms/atari-st/materiel'

const FICHES = join(__dirname, '..', 'content', 'courses')

/** Le bloc ```asm de la fiche qui contient `repere`. */
function bloc(fiche: string, repere: string): string {
  const texte = readFileSync(join(FICHES, fiche), 'utf-8').replace(/\r\n/g, '\n')
  const blocs = [...texte.matchAll(/```asm\n([\s\S]*?)```/g)].map((m) => m[1]).filter((b) => b.includes(repere))
  expect(blocs, `un seul bloc contenant « ${repere} » dans ${fiche}`).toHaveLength(1)
  return blocs[0]
}

function atari(source: string, maxSteps = 200000, userMode = false) {
  const asm = assemble(source)
  expect(asm.errors, JSON.stringify(asm.errors)).toEqual([])
  const r = runBinary(asm.binary!, asm.baseAddress!, createAtariSt({ userMode }), maxSteps)
  expect(r.last.error, r.last.error).toBeUndefined()
  expect(r.cpu.halted, 'le programme se termine').toBe(true)
  return r.cpu
}

const flags = (sr: number) => ({ X: (sr >> 4) & 1, N: (sr >> 3) & 1, Z: (sr >> 2) & 1, V: (sr >> 1) & 1, C: sr & 1 })

describe('fiches communes : les valeurs annoncées', () => {
  it('registres : MOVE.B/.W dans Dn, MOVEA.W étendu en signe', () => {
    const cpu = atari(bloc('general/registres-et-memoire.md', 'MOVEA.W #$8000,A0') + '\n        RTS\n')
    expect(cpu.d[0] >>> 0).toBe(0x1234beef)
    expect(cpu.a[0] >>> 0).toBe(0xffff8000)
  })

  it('registres : SWAP et EXT', () => {
    const cpu = atari(bloc('general/registres-et-memoire.md', 'EXT.L   D1') + '\n        RTS\n')
    expect(cpu.d[0] >>> 0).toBe(0x56781234)
    expect(cpu.d[1] >>> 0).toBe(0xfffffff0)
  })

  it('registres : big endian', () => {
    const cpu = atari(bloc('general/registres-et-memoire.md', 'MOVE.L  #$12345678,$1000') + '\n        RTS\n')
    expect(cpu.d[0] & 0xffff).toBe(0x1234)
    expect(cpu.d[1] & 0xff).toBe(0x78)
  })

  it('pile : AJOUTE rend $12368ACE et rend la pile', () => {
    const cpu = atari(bloc('general/pile-et-sous-programmes.md', 'AJOUTE: MOVE.L  D1,-(SP)'))
    expect(cpu.d[0] >>> 0).toBe(0x12368ace)
  })

  it('référence : flags après SUB.B', () => {
    const cpu = atari(bloc('general/reference-meyne-hoppenot.md', 'Z=0, N=1, V=0, C=1 (emprunt') + '\n        RTS\n')
    expect(cpu.d[0] & 0xff).toBe(0xff)
    expect(flags(cpu.sr)).toMatchObject({ N: 1, Z: 0, V: 0, C: 1 })
  })

  it('référence : LSL, ROL, ASR', () => {
    const cpu = atari(bloc('general/reference-meyne-hoppenot.md', 'ROL.W   #4,D0') + '\n        RTS\n')
    expect(cpu.d[0] & 0xffff).toBe(0x3402)
    expect(cpu.d[1] & 0xffff).toBe(0xfffb) // -5
  })

  it('bonnes pratiques : constantes EQU', () => {
    const cpu = atari(bloc('general/bonnes-pratiques.md', 'LARGEUR     EQU') + '\n        RTS\n')
    expect(cpu.d[7] & 0xffff).toBe(31999)
    expect(cpu.memory.readU16(0xff8240)).toBe(0x0700)
  })
})

describe('fiches Atari ST : les exemples tournent sur le TOS simulé', () => {
  it('Cconws puis Pterm0 affichent « Bonjour ! » (mode utilisateur)', () => {
    const cpu = atari(bloc('atari-st/trap-et-systeme.md', "MESSAGE DC.B    'Bonjour !'"), 200000, true)
    expect(cpu.output.replace(/\r/g, '')).toBe('Bonjour !\n')
  })

  it('Super puis Supexec (en partant du mode utilisateur, comme sous le TOS) : la couleur 0 devient rouge', () => {
    const cpu = atari(bloc('atari-st/trap-et-systeme.md', 'MOVE.W  #38,-(SP)       ; Supexec'), 200000, true)
    expect(cpu.memory.readU16(0xff8240)).toBe(0x0700)
    expect(cpu.supervisor, 'retour en mode utilisateur').toBe(false)
  })

  it('Setexec détourne TRAP #3 (mode utilisateur)', () => {
    const cpu = atari(bloc('atari-st/trap-et-systeme.md', 'MOVE.W  #35,-(SP)'), 200000, true)
    expect(cpu.memory.readU16(0xff8240)).toBe(0x0700)
  })

  it('table des débuts de ligne (REPT/SET) : y x 320 + x', () => {
    const cpu = atari('        MOVE.W  #5,D0\n        MOVE.W  #2,D1\n        LEA     $20000,A0\n' + bloc('atari-st/demarrage-includes-macros-tableaux.md', 'LIGNES:'))
    expect(cpu.d[1] & 0xffff).toBe(2 * 320 + 5)
  })

  it('macro avec \\@ : deux utilisations sans conflit', () => {
    const asm = assemble(bloc('atari-st/demarrage-includes-macros-tableaux.md', 'ATTENDS MACRO'))
    expect(asm.errors).toEqual([])
  })

  it('setpixel allume le bon bit', () => {
    const cpu = atari(
      '        MOVE.W  #17,D3\n        MOVE.W  #3,D4\n        LEA     $20000,A3\n        BSR     SETPIXEL\n        RTS\n' +
        bloc('atari-st/graphisme-bas-niveau.md', 'SETPIXEL:')
    )
    // ligne 3 : 3 x 80 ; x = 17 : 2e mot (17 / 16 = 1), bit 15 - 1 = 14
    expect(cpu.memory.readU16(0x20000 + 3 * 80 + 2)).toBe(0x4000)
  })

  it('couleur 5 en basse résolution : plans 0 et 2', () => {
    const cpu = atari('        LEA     $20000,A3\n' + bloc('atari-st/graphisme-bas-niveau.md', 'couleur 5 (%0101)') + '\n        RTS\n')
    expect([0, 2, 4, 6].map((d) => cpu.memory.readU16(0x20000 + d))).toEqual([0xffff, 0, 0xffff, 0])
  })

  it('auto-modification : le bloc VARIANTE est remplacé par les encodages annoncés', () => {
    const cpu = atari('        MOVE.W  #2,D0\n        MOVE.W  #5,D1\n' + bloc('atari-st/auto-modification.md', 'VARIANTE MULU.W') + '\n        RTS\n')
    expect(cpu.d[1] & 0xffff).toBe((5 + 2) * 3 - 6) // ADD.W D0,D1 ; MULU #3,D1 ; SUBI.W #6,D1
  })

  it('YM2149 : un « la » sur la voie A', () => {
    const cpu = atari(bloc('atari-st/registres-materiels.md', 'YM      EQU') + '\n        RTS\n')
    const reg = materielAtari(cpu)!.psg.etat.registres
    expect([reg[0], reg[1], reg[8]]).toEqual([284 & 0xff, 284 >> 8, 15])
    expect(reg[7] & 0x3f).toBe(0b111110)
  })
})

describe('fiches Amiga : les exemples tournent sur le Kickstart simulé', () => {
  it('Bonjour par dos.library, code de retour 0', () => {
    const { cpu, error } = lancer(bloc('amiga/systeme-et-hardware.md', "TEXTE:  DC.B    'Bonjour Amiga !'"))
    expect(error).toBeUndefined()
    expect(cpu.output).toContain('Bonjour Amiga !')
    expect(cpu.d[0]).toBe(0)
  })

  it('RawDoFmt met « Score : 1234 » dans le tampon', () => {
    const { cpu, error } = lancer(bloc('amiga/bibliotheques-exec-dos.md', 'RawDoFmt → TAMPON'))
    expect(error).toBeUndefined()
    let trouve = false
    for (let a = 0; a < 0x80000 && !trouve; a += 2) {
      if (cpu.memory.readU16(a) === 0x5363 && cpu.memory.readCString(a) === 'Score : 1234') trouve = true
    }
    expect(trouve).toBe(true)
  })
})

describe('fiches Amiga : le Copper', () => {
  it('la liste Copper de la fiche colore le fond en trois bandes', () => {
    const source = bloc('amiga/demos-et-custom-chips.md', 'LISTE:  DC.W    $0180,$0000')
      .replace('INCLUDE "amiga-systeme.s"', readFileSync(join(__dirname, '..', 'content', 'fichiers', 'amiga-systeme.s'), 'utf-8'))
    const { m, error, cpu } = lancer(source, { captures: [3], evenements: [{ image: 5, boutonGauche: true }] }, 3000000)
    expect(error).toBeUndefined()
    expect(cpu.halted, 'le programme se termine après le clic').toBe(true)
    // L'image commence à la ligne $2C (44) : WAIT $64 (100) → ligne 56 de l'image, WAIT $96 (150) → 106
    expect([m.pixel(10, 20, 3), m.pixel(10, 80, 3), m.pixel(10, 150, 3)]).toEqual([0x000, 0xf00, 0x00f])
  })
})

describe('fiche MFP : la routine du Timer A', () => {
  it('reçoit plusieurs interruptions (fin logicielle : ISR effacé), puis se désinstalle', () => {
    const programme = [
      '        BSR     INSTALLE',
      '.attend CMPI.W  #3,COMPTEUR      ; trois interruptions du Timer A',
      '        BLO.S   .attend',
      '        BSR     DESINSTALLE',
      '        RTS',
      bloc('atari-st/interruptions-mfp68901.md', 'INSTALLE:')
    ].join('\n')
    const cpu = atari(programme, 3000000)
    // Le vecteur et les registres du MFP sont rendus
    expect(cpu.memory.readU8(0xfffa19)).toBe(0)
  })
})

describe('fiche MFP : la liste VBL', () => {
  it('la routine ajoutée dans _vblqueue est appelée à chaque VBL', () => {
    const programme = [
      '        BSR     AJOUTE_VBL',
      '.attend CMPI.W  #3,COMPTEUR',
      '        BLO.S   .attend',
      '        RTS',
      bloc('atari-st/interruptions-mfp68901.md', 'AJOUTE_VBL:'),
      'COMPTEUR DC.W   0'
    ].join('\n')
    atari(programme, 3000000)
  })
})
