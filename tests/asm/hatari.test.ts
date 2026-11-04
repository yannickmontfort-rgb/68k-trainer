/**
 * Vérification sur une vraie machine émulée : nos .PRG sont lancés dans Hatari (avec EmuTOS),
 * depuis le dossier AUTO d'un disque dur GEMDOS émulé, et on lit ce qu'ils affichent.
 *
 * Test facultatif : il ne tourne que si la variable d'environnement HATARI donne le chemin de
 * hatari.exe (Hatari 2.6 ou plus, livré avec tos.img = EmuTOS). Exemple :
 *   HATARI="C:/outils/hatari-2.6.1_windows64/hatari.exe" npx vitest run tests/asm/hatari.test.ts
 */
import { spawnSync } from 'child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { dirname, join } from 'path'
import { describe, expect, it } from 'vitest'
import { assembler } from '../../src/asm/assembleur'
import { creerPrg } from '../../src/asm/prg'
import { sourceLanceurAtari } from '../../src/main/emulateurs/lanceurAtari'

const HATARI = process.env.HATARI ?? ''

function lancerDansHatari(nom: string, source: string): string {
  const r = assembler(source, { prg: true })
  if (!r.ok) throw new Error(JSON.stringify(r.erreurs))
  const disque = mkdtempSync(join(tmpdir(), '68k-hatari-'))
  try {
    mkdirSync(join(disque, 'AUTO'))
    writeFileSync(join(disque, 'AUTO', `${nom}.PRG`), creerPrg(r))
    const res = spawnSync(
      HATARI,
      ['--conout', '2', '--run-vbls', '3000', '--fast-forward', 'yes', '--sound', 'off', '--confirm-quit', 'no',
        '--tos', join(dirname(HATARI), 'tos.img'), '--harddrive', disque],
      { encoding: 'utf-8', timeout: 180000, env: { ...process.env, SDL_VIDEODRIVER: 'dummy', SDL_AUDIODRIVER: 'dummy' }, input: '' }
    )
    const sortie = (res.stdout ?? '').replace(/\r/g, '')
    // Ce que le programme a affiché, après les messages de démarrage d'EmuTOS
    return sortie.split('Hold <Shift> to pause this screen').pop()!.split('\n').filter((l) => l.trim() && !/^(WARN|INFO|DEBUG)/.test(l)).join('\n').trim()
  } finally {
    rmSync(disque, { recursive: true, force: true })
  }
}

describe.skipIf(!HATARI || !existsSync(HATARI))('les .PRG tournent dans Hatari (EmuTOS)', () => {
  it('Cconws puis Pterm0', () => {
    const source = ['START:', '    PEA     MESSAGE', '    MOVE.W  #9,-(SP)', '    TRAP    #1', '    ADDQ.L  #6,SP',
      '    CLR.W   -(SP)', '    TRAP    #1', 'MESSAGE:', "    DC.B    'Bonjour, Atari !',13,10,0"].join('\n')
    expect(lancerDansHatari('BONJOUR', source)).toBe('Bonjour, Atari !')
  }, 200000)

  it('trois sections et des relocations (adresses de DATA et BSS)', () => {
    const source = [
      '    SECTION TEXT', 'START:', '    LEA     TABLE,A3', '    MOVEQ   #4,D3',
      'BOUCLE:', '    MOVE.L  (A3)+,-(SP)', '    MOVE.W  #9,-(SP)', '    TRAP    #1', '    ADDQ.L  #6,SP', '    DBRA    D3,BOUCLE',
      '    MOVE.L  COMPTEUR,D0', '    ADDQ.L  #1,D0', '    MOVE.L  D0,COMPTEUR', '    CLR.W   -(SP)', '    TRAP    #1',
      '    SECTION DATA', 'TABLE:  DC.L    M1,M2,M3,M4,M5',
      "M1: DC.B 'un ',0", "M2: DC.B 'deux ',0", "M3: DC.B 'trois ',0", "M4: DC.B 'quatre ',0", "M5: DC.B 'cinq',13,10,0",
      '    SECTION BSS', 'COMPTEUR: DS.L 1'
    ].join('\n')
    expect(lancerDansHatari('RELOC', source)).toBe('un deux trois quatre cinq')
  }, 200000)
})

describe.skipIf(!HATARI || !existsSync(HATARI))('lanceur du bouton « Essayer dans Hatari »', () => {
  it('lance le programme et écrit son code de retour dans C:\ESSAI68K.RET', () => {
    const programme = ['    PEA     MESSAGE', '    MOVE.W  #9,-(SP)', '    TRAP    #1', '    ADDQ.L  #6,SP',
      '    MOVE.W  #7,-(SP)', '    MOVE.W  #$4C,-(SP)', '    TRAP    #1', 'MESSAGE:', "    DC.B    'Essai 68k',13,10,0"].join('\n')
    const disque = mkdtempSync(join(tmpdir(), '68k-lanceur-'))
    try {
      for (const [nom, source] of [['ESSAI', programme], ['ESSAI68K', sourceLanceurAtari('ESSAI.PRG')]]) {
        const r = assembler(source, { prg: true })
        if (!r.ok) throw new Error(JSON.stringify(r.erreurs))
        writeFileSync(join(disque, `${nom}.PRG`), creerPrg(r))
      }
      const res = spawnSync(
        HATARI,
        ['--conout', '2', '--run-vbls', '1500', '--fast-forward', 'yes', '--sound', 'off', '--confirm-quit', 'no',
          '--tos', join(dirname(HATARI), 'tos.img'), '--harddrive', disque, '--auto', 'C:\ESSAI68K.PRG'],
        { encoding: 'utf-8', timeout: 180000, env: { ...process.env, SDL_VIDEODRIVER: 'dummy', SDL_AUDIODRIVER: 'dummy' }, input: '' }
      )
      expect(res.stdout).toContain('Essai 68k')
      expect(readFileSync(join(disque, 'ESSAI68K.RET')).readInt32BE(0)).toBe(7)
    } finally {
      rmSync(disque, { recursive: true, force: true })
    }
  }, 200000)
})
