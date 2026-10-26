/**
 * La Ligne A et l'AES du simulateur comparés au vrai EmuTOS : un même programme dessine une série de
 * pixels et de lignes, puis affiche pour chacun une somme de contrôle de l'écran et le motif du
 * trait (LN_MASK) qui reste. Les deux sorties doivent être identiques.
 *
 * Test facultatif, comme hatari.test.ts : il ne tourne que si HATARI donne le chemin de hatari.exe.
 */
import { spawnSync } from 'child_process'
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { dirname, join } from 'path'
import { describe, expect, it } from 'vitest'
import { assembler } from '../../src/asm/assembleur'
import { creerPrg } from '../../src/asm/prg'
import { Cpu } from '../../src/cpu/cpu'
import { createAtariSt } from '../../src/platforms/atari-st'
import { sortieAtari, sourceLanceurAtari } from '../../src/main/emulateurs/lanceurAtari'

const HATARI = process.env.HATARI ?? ''

/** Une ligne $A003 : extrémités, couleur (0-15), mode, motif, LSTLIN. */
function ligne(x1: number, y1: number, x2: number, y2: number, couleur: number, mode = 0, motif = 0xffff, lstlin = 0): string {
  return [
    ...[0, 1, 2, 3].map((p) => `    MOVE.W  #${(couleur >> p) & 1},${24 + 2 * p}(A5)`),
    `    MOVE.W  #${lstlin},32(A5)`,
    `    MOVE.W  #$${motif.toString(16)},34(A5)`,
    `    MOVE.W  #${mode},36(A5)`,
    `    MOVE.W  #${x1},38(A5)`,
    `    MOVE.W  #${y1},40(A5)`,
    `    MOVE.W  #${x2},42(A5)`,
    `    MOVE.W  #${y2},44(A5)`,
    '    DC.W    $A003'
  ].join('\n')
}

/** Un pixel $A001. */
function pixel(x: number, y: number, couleur: number): string {
  return ['    MOVEA.L 8(A5),A0', `    MOVE.W  #${couleur},(A0)`, '    MOVEA.L 12(A5),A0', `    MOVE.W  #${x},(A0)`, `    MOVE.W  #${y},2(A0)`, '    DC.W    $A001'].join('\n')
}

/** Les cas, chacun sur un écran effacé. */
const CAS: string[] = [
  [pixel(0, 0, 15), pixel(160, 100, 5), pixel(319, 199, 10), pixel(17, 3, 1)].join('\n'),
  ligne(10, 10, 300, 60, 3),
  ligne(300, 190, 20, 30, 5),
  ligne(50, 10, 70, 180, 9),
  ligne(3, 50, 200, 50, 1, 1, 0xf0f0),
  ligne(100, 20, 100, 150, 7, 0, 0xaaaa),
  ligne(100, 150, 100, 20, 2, 1, 0xff00),
  [ligne(0, 0, 319, 199, 15), ligne(0, 199, 319, 0, 15, 2, 0xffff, 0)].join('\n'),
  [ligne(0, 0, 319, 199, 15), ligne(0, 199, 319, 0, 15, 2, 0xffff, -1)].join('\n'),
  [ligne(5, 5, 250, 100, 6), ligne(5, 5, 250, 100, 1, 3, 0xcccc)].join('\n'),
  [ligne(5, 5, 250, 100, 6), ligne(5, 5, 250, 100, 0, 1, 0x0ff0)].join('\n'),
  ligne(10, 100, 300, 101, 4, 0, 0x8001),
  ligne(40, 120, 40, 120, 12)
]

function source(): string {
  const parties = [
    '    DC.W    $A00A           ; cacher la souris',
    '    MOVE.W  #3,-(SP)        ; Logbase',
    '    TRAP    #14',
    '    ADDQ.L  #2,SP',
    '    MOVEA.L D0,A4',
    '    DC.W    $A000',
    '    MOVEA.L A0,A5'
  ]
  CAS.forEach((c) => parties.push('    BSR     EFFACE', c, '    BSR     SOMME'))
  // Un pixel relu par $A002
  parties.push('    BSR     EFFACE', pixel(77, 33, 13), '    MOVEA.L 12(A5),A0', '    MOVE.W  #77,(A0)', '    MOVE.W  #33,2(A0)', '    DC.W    $A002', '    MOVE.W  D0,D6', '    BSR     HEX4')
  parties.push(
    '    CLR.W   -(SP)',
    '    TRAP    #1',
    'EFFACE: MOVEA.L A4,A3',
    '    MOVE.W  #7999,D7',
    '.e: CLR.L   (A3)+',
    '    DBF     D7,.e',
    '    RTS',
    // Somme de contrôle de l'écran (sensible à la position), puis LN_MASK
    'SOMME: MOVEA.L A4,A3',
    '    MOVE.W  #15999,D7',
    '    MOVEQ   #0,D6',
    '.s: ADD.W   (A3)+,D6',
    '    ROL.W   #1,D6',
    '    DBF     D7,.s',
    '    BSR     HEX4',
    '    MOVE.W  34(A5),D6',
    '    BSR     HEX4',
    '    RTS',
    // Affiche D6.W en hexadécimal, suivi d'un espace
    'HEX4: MOVEQ   #3,D5',
    '.h: ROL.W   #4,D6',
    '    MOVE.W  D6,D4',
    '    AND.W   #15,D4',
    '    MOVE.B  CHIFFRES(PC,D4.W),D4',
    '    MOVE.W  D4,-(SP)',
    '    MOVE.W  #2,-(SP)        ; Cconout',
    '    TRAP    #1',
    '    ADDQ.L  #4,SP',
    '    DBF     D5,.h',
    "    MOVE.W  #' ',-(SP)",
    '    MOVE.W  #2,-(SP)',
    '    TRAP    #1',
    '    ADDQ.L  #4,SP',
    '    RTS',
    "CHIFFRES: DC.B '0123456789ABCDEF'",
    '    EVEN'
  )
  return parties.join('\n')
}

/** La sortie du même programme dans le simulateur (mode utilisateur, comme sous le TOS). */
function sortieSimulateur(): string {
  const r = assembler(`    ORG $1000\nSTART:\n${source()}`)
  if (!r.ok) throw new Error(JSON.stringify(r.erreurs))
  const cpu = new Cpu(createAtariSt({ userMode: true }))
  cpu.reset(0x1000)
  cpu.loadProgram(0x1000, r.binaire)
  for (let i = 0; i < 3_000_000 && !cpu.halted; i++) {
    const e = cpu.step()
    if (e.error) throw new Error(e.error)
  }
  return cpu.output.trim()
}

describe('Ligne A du simulateur', () => {
  it('le programme de comparaison tourne et affiche une valeur par cas', () => {
    expect(sortieSimulateur().split(' ')).toHaveLength(CAS.length * 2 + 1)
  })
})

describe.skipIf(!HATARI || !existsSync(HATARI))('Ligne A : simulateur et EmuTOS (Hatari) identiques', () => {
  it('mêmes pixels, mêmes lignes, même motif restant', () => {
    const disque = mkdtempSync(join(tmpdir(), '68k-lignea-'))
    try {
      const prog = assembler(source(), { prg: true })
      if (!prog.ok) throw new Error(JSON.stringify(prog.erreurs))
      writeFileSync(join(disque, 'LIGNEA.PRG'), creerPrg(prog))
      const lanceur = assembler(sourceLanceurAtari('LIGNEA.PRG'), { prg: true })
      if (!lanceur.ok) throw new Error(JSON.stringify(lanceur.erreurs))
      writeFileSync(join(disque, 'ESSAI68K.PRG'), creerPrg(lanceur))
      const res = spawnSync(
        HATARI,
        ['--conout', '2', '--run-vbls', '6000', '--fast-forward', 'yes', '--sound', 'off', '--confirm-quit', 'no', '--tos-res', 'low',
          '--tos', join(dirname(HATARI), 'tos.img'), '--harddrive', disque, '--auto', 'C:\\ESSAI68K.PRG'],
        { encoding: 'latin1', timeout: 200000, env: { ...process.env, SDL_VIDEODRIVER: 'dummy', SDL_AUDIODRIVER: 'dummy' }, input: '' }
      )
      expect(sortieAtari(res.stdout ?? '')).toBe(sortieSimulateur())
    } finally {
      rmSync(disque, { recursive: true, force: true })
    }
  }, 220000)
})

/** Programme AES : appl_init, graf_handle, appl_exit ; affiche les valeurs rendues. */
const SOURCE_AES = [
  '    LEA     CONTROL,A3',
  '    MOVE.W  #10,(A3)        ; appl_init',
  '    CLR.W   2(A3)',
  '    MOVE.W  #1,4(A3)',
  '    CLR.L   6(A3)',
  '    BSR     AES',
  '    MOVE.W  INT_OUT,D6',
  '    BSR     HEX4',
  '    MOVE.W  GLOBAL+4,D6',
  '    BSR     HEX4',
  '    MOVE.W  #77,(A3)        ; graf_handle',
  '    CLR.W   2(A3)',
  '    MOVE.W  #5,4(A3)',
  '    CLR.L   6(A3)',
  '    BSR     AES',
  '    LEA     INT_OUT,A4',
  '    MOVEQ   #4,D3',
  '.g: MOVE.W  (A4)+,D6',
  '    BSR     HEX4',
  '    DBF     D3,.g',
  '    MOVE.W  #19,(A3)        ; appl_exit',
  '    CLR.W   2(A3)',
  '    MOVE.W  #1,4(A3)',
  '    CLR.L   6(A3)',
  '    BSR     AES',
  '    MOVE.W  INT_OUT,D6',
  '    BSR     HEX4',
  '    CLR.W   -(SP)',
  '    TRAP    #1',
  'AES: MOVE.L  #AES_PB,D1',
  '    MOVE.W  #$C8,D0',
  '    TRAP    #2',
  '    RTS',
  'HEX4: MOVEQ   #3,D5',
  '.h: ROL.W   #4,D6',
  '    MOVE.W  D6,D4',
  '    AND.W   #15,D4',
  '    MOVE.B  CHIFFRES(PC,D4.W),D4',
  '    MOVE.W  D4,-(SP)',
  '    MOVE.W  #2,-(SP)',
  '    TRAP    #1',
  '    ADDQ.L  #4,SP',
  '    DBF     D5,.h',
  "    MOVE.W  #' ',-(SP)",
  '    MOVE.W  #2,-(SP)',
  '    TRAP    #1',
  '    ADDQ.L  #4,SP',
  '    RTS',
  "CHIFFRES: DC.B '0123456789ABCDEF'",
  '    EVEN',
  '    SECTION DATA',
  'AES_PB: DC.L CONTROL,GLOBAL,INT_IN,INT_OUT,ADDR_IN,ADDR_OUT',
  '    SECTION BSS',
  'CONTROL:  DS.W 5',
  'GLOBAL:   DS.W 15',
  'INT_IN:   DS.W 16',
  'INT_OUT:  DS.W 7',
  'ADDR_IN:  DS.L 2',
  'ADDR_OUT: DS.L 1'
].join('\n')

function lancerSimulateur(src: string): string {
  const r = assembler(`    ORG $1000\nSTART:\n${src}`)
  if (!r.ok) throw new Error(JSON.stringify(r.erreurs))
  const cpu = new Cpu(createAtariSt({ userMode: true }))
  cpu.reset(0x1000)
  cpu.loadProgram(0x1000, r.binaire)
  for (let i = 0; i < 1_000_000 && !cpu.halted; i++) {
    const e = cpu.step()
    if (e.error) throw new Error(e.error)
  }
  return cpu.output.trim()
}

describe.skipIf(!HATARI || !existsSync(HATARI))('AES : simulateur et EmuTOS (Hatari) identiques', () => {
  it('appl_init, graf_handle et appl_exit rendent les mêmes valeurs', () => {
    const disque = mkdtempSync(join(tmpdir(), '68k-aes-'))
    try {
      const prog = assembler(SOURCE_AES, { prg: true })
      if (!prog.ok) throw new Error(JSON.stringify(prog.erreurs))
      writeFileSync(join(disque, 'AES.PRG'), creerPrg(prog))
      const lanceur = assembler(sourceLanceurAtari('AES.PRG'), { prg: true })
      if (!lanceur.ok) throw new Error(JSON.stringify(lanceur.erreurs))
      writeFileSync(join(disque, 'ESSAI68K.PRG'), creerPrg(lanceur))
      const res = spawnSync(
        HATARI,
        ['--conout', '2', '--run-vbls', '4000', '--fast-forward', 'yes', '--sound', 'off', '--confirm-quit', 'no', '--tos-res', 'low',
          '--tos', join(dirname(HATARI), 'tos.img'), '--harddrive', disque, '--auto', 'C:\ESSAI68K.PRG'],
        { encoding: 'latin1', timeout: 200000, env: { ...process.env, SDL_VIDEODRIVER: 'dummy', SDL_AUDIODRIVER: 'dummy' }, input: '' }
      )
      expect(sortieAtari(res.stdout ?? '')).toBe(lancerSimulateur(SOURCE_AES))
    } finally {
      rmSync(disque, { recursive: true, force: true })
    }
  }, 220000)
})
