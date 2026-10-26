import { describe, expect, it } from 'vitest'
import { analyserRom, configUaeKickstart, STARTUP_KICKSTART } from '../src/main/emulateurs/roms'

const Ko = 1024

/** Une fausse ROM : la bonne taille et les premiers octets d'une vraie. */
function rom(taille: number, debut: number[]): Uint8Array {
  const o = new Uint8Array(taille)
  o.set(debut)
  return o
}

describe('« Ma propre ROM » : reconnaissance', () => {
  it('un TOS 1.04 de 192 Ko : Atari ST', () => {
    const r = analyserRom(rom(192 * Ko, [0x60, 0x2e, 0x01, 0x04]), 'atari')
    expect(r).toMatchObject({ ok: true, nom: 'TOS 1.04', modele: 'st' })
  })
  it('un TOS 2.06 de 256 Ko : STE', () => {
    expect(analyserRom(rom(256 * Ko, [0x60, 0x2e, 0x02, 0x06]), 'atari')).toMatchObject({ ok: true, nom: 'TOS 2.06', modele: 'ste' })
  })
  it('refuse un TOS du Falcon, un fichier qui ne commence pas par BRA, une mauvaise taille', () => {
    expect(analyserRom(rom(512 * Ko, [0x60, 0x2e, 0x04, 0x04]), 'atari').ok).toBe(false)
    expect(analyserRom(rom(192 * Ko, [0x00, 0x00]), 'atari').ok).toBe(false)
    expect(analyserRom(rom(100 * Ko, [0x60]), 'atari').ok).toBe(false)
  })
  it('un Kickstart 1.3 (34.5) : Amiga 500, sans Shell en ROM', () => {
    const r = analyserRom(rom(256 * Ko, [0x11, 0x11, 0x4e, 0xf9, 0, 0xfc, 0, 0xd2, 0, 0, 0xff, 0xff, 0, 34, 0, 5]), 'amiga')
    expect(r).toMatchObject({ ok: true, nom: 'Kickstart 1.3 (34.5)', modele: 'a500', shellEnRom: false })
  })
  it('un Kickstart 3.1 (40.68) : Amiga 1200, Shell en ROM', () => {
    const r = analyserRom(rom(512 * Ko, [0x11, 0x14, 0x4e, 0xf9, 0, 0xf8, 0, 0xd2, 0, 0, 0xff, 0xff, 0, 40, 0, 68]), 'amiga')
    expect(r).toMatchObject({ ok: true, nom: 'Kickstart 3.1 (40.68)', modele: 'a1200', shellEnRom: true })
  })
  it('refuse une ROM chiffrée d’Amiga Forever', () => {
    const chiffree = new Uint8Array(256 * Ko + 11)
    chiffree.set(new TextEncoder().encode('AMIROMTYPE1'))
    const r = analyserRom(chiffree, 'amiga')
    expect(r.ok).toBe(false)
    expect(r.ok ? '' : r.raison).toMatch(/chiffrée/)
  })
})

describe('« Ma propre ROM » : réglages de WinUAE', () => {
  it('Kickstart 3.1 : démarre sur le disque généré, partage monté, pas de disquette', () => {
    const r = analyserRom(rom(512 * Ko, [0x11, 0x14, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 40, 0, 68]), 'amiga')
    if (!r.ok) throw new Error(r.raison)
    const cfg = configUaeKickstart(r, 'C:\\roms\\kick.rom', 'C:\\Partage', 'C:\\roms\\demarrage')
    expect(cfg).toContain('kickstart_rom_file=C:\\roms\\kick.rom')
    expect(cfg).toContain('cpu_type=68020')
    expect(cfg).toContain('chipset=aga')
    expect(cfg).toContain('filesystem2=rw,DH0:DEMARRAGE:C:\\roms\\demarrage,0')
    expect(cfg).toContain('filesystem2=rw,DH1:PARTAGE:C:\\Partage,-128')
    expect(cfg).toContain('floppy0=\r\n')
  })
  it('Kickstart 1.3 : Amiga 500, démarre sur la disquette Workbench donnée', () => {
    const r = analyserRom(rom(256 * Ko, [0x11, 0x11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 34, 0, 5]), 'amiga')
    if (!r.ok) throw new Error(r.raison)
    const cfg = configUaeKickstart(r, 'k.rom', 'P', 'D', 'wb13.adf')
    expect(cfg).toContain('cpu_type=68000')
    expect(cfg).toContain('chipset=ocs')
    expect(cfg).toContain('bogomem_size=2')
    expect(cfg).not.toContain('DEMARRAGE')
    expect(cfg).toContain('floppy0=wb13.adf')
  })
  it('le Startup-sequence ne demande que des commandes du Shell en ROM', () => {
    expect(STARTUP_KICKSTART).toMatch(/If EXISTS "PARTAGE:essai\/lancer"/)
    expect(STARTUP_KICKSTART).not.toMatch(/\bDelete\b|\bC:/)
  })
})
