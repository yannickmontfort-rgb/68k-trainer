/**
 * « Ma propre ROM » sur un vrai TOS : le lanceur du bouton « Essayer » tourne dans Hatari avec le TOS
 * de l'utilisateur. Test facultatif, comme hatari.test.ts : il faut HATARI (hatari.exe) et TOS (une
 * ROM du TOS de 192 ou 256 Ko, qui ne va jamais dans le dépôt). Exemple :
 *   HATARI=".../hatari.exe" TOS=".../tos206fr.img" npx vitest run tests/asm/tos-utilisateur.test.ts
 */
import { spawnSync } from 'child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import { assembler } from '../../src/asm/assembleur'
import { creerPrg } from '../../src/asm/prg'
import { sortieAtari, sourceLanceurAtari } from '../../src/main/emulateurs/lanceurAtari'
import { analyserRom } from '../../src/main/emulateurs/roms'

const HATARI = process.env.HATARI ?? ''
const TOS = process.env.TOS ?? ''

describe.skipIf(!HATARI || !TOS || !existsSync(HATARI) || !existsSync(TOS))('« Essayer » avec le TOS de l’utilisateur', () => {
  it('le programme tourne, son texte et son code de retour reviennent', () => {
    const rom = analyserRom(readFileSync(TOS), 'atari')
    if (!rom.ok) throw new Error(rom.raison)
    const programme = ['    PEA     MESSAGE', '    MOVE.W  #9,-(SP)', '    TRAP    #1', '    ADDQ.L  #6,SP',
      '    MOVE.W  #5,-(SP)', '    MOVE.W  #$4C,-(SP)', '    TRAP    #1', 'MESSAGE:', "    DC.B    'Bonjour TOS',13,10,0"].join('\n')
    const disque = mkdtempSync(join(tmpdir(), '68k-tos-'))
    try {
      for (const [nom, source] of [['ESSAI', programme], ['ESSAI68K', sourceLanceurAtari('ESSAI.PRG')]]) {
        const r = assembler(source, { prg: true })
        if (!r.ok) throw new Error(JSON.stringify(r.erreurs))
        writeFileSync(join(disque, `${nom}.PRG`), creerPrg(r))
      }
      const res = spawnSync(
        HATARI,
        ['--conout', '2', '--run-vbls', '9000', '--fast-forward', 'yes', '--sound', 'off', '--confirm-quit', 'no', '--tos', TOS,
          '--tos-res', 'low', '--machine', rom.modele, '--memsize', '1024', '--harddrive', disque, '--auto', 'C:\ESSAI68K.PRG'],
        { encoding: 'latin1', timeout: 200000, env: { ...process.env, SDL_VIDEODRIVER: 'dummy', SDL_AUDIODRIVER: 'dummy' }, input: '' }
      )
      expect(sortieAtari(res.stdout ?? '')).toBe('Bonjour TOS')
      expect(readFileSync(join(disque, 'ESSAI68K.RET')).readInt32BE(0)).toBe(5)
    } finally {
      rmSync(disque, { recursive: true, force: true })
    }
  }, 220000)
})
