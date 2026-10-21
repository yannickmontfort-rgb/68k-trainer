import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join, resolve } from 'path'
import { afterAll, describe, expect, it, vi } from 'vitest'

// Electron simulé : Documents et données dans un dossier temporaire, paquets pris dans build/emulateurs
const temp = mkdtempSync(join(tmpdir(), '68kt-emu-'))
vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getAppPath: () => resolve(__dirname, '..'),
    getPath: (nom: string) => join(temp, nom === 'documents' ? 'Mes documents é' : nom)
  },
  net: { fetch: () => Promise.reject(new Error('pas de réseau dans les tests')) }
}))
process.env.LOCALAPPDATA = join(temp, 'local')

const { EMULATEURS } = await import('../src/main/emulateurs/catalogue')
const emu = await import('../src/main/emulateurs/installation')

const paquetsPresents = Object.values(EMULATEURS).every((e) =>
  e.paquets.every((p) => existsSync(resolve(__dirname, '..', 'build', 'emulateurs', p.fichier)))
)

afterAll(() => rmSync(temp, { recursive: true, force: true }))

describe('catalogue des émulateurs', () => {
  it('aucune ROM sous droits, des sommes SHA-256 complètes', () => {
    for (const e of Object.values(EMULATEURS)) {
      for (const p of e.paquets) {
        expect(p.sha256).toMatch(/^[0-9a-f]{64}$/)
        expect(p.url).toMatch(/^https:\/\//)
        expect(p.fichier).not.toMatch(/kick|tos[0-9]/i)
      }
    }
  })

  it('lit une seule fois les émulateurs cochés dans l’installateur', () => {
    mkdirSync(emu.dossierEmulateurs(), { recursive: true })
    writeFileSync(join(emu.dossierEmulateurs(), 'a-installer.txt'), 'hatari\r\nwinuae\r\ninconnu\r\n')
    expect(emu.installationsDemandees()).toEqual(['hatari', 'winuae'])
    expect(emu.installationsDemandees()).toEqual([])
  })

  it('installation automatique sous Windows seulement (les paquets sont des versions Windows)', async () => {
    const windows = process.platform === 'win32'
    expect(emu.etatEmulateurs().every((e) => e.disponible === windows)).toBe(true)
    if (!windows) await expect(emu.installer('hatari')).rejects.toThrow(/Windows/)
  })

  it('la configuration WinUAE monte AROS: et PARTAGE:', () => {
    const c = emu.configUae('C:\\x\\aros', 'C:\\Docs\\68k Trainer\\Amiga')
    // Séparateur du système (le test tourne aussi sous Linux et macOS dans la CI)
    expect(c).toContain('kickstart_rom_file=' + join('C:\\x\\aros', 'boot', 'amiga', 'aros-rom.bin'))
    expect(c).toContain('filesystem2=rw,DH1:PARTAGE:C:\\Docs\\68k Trainer\\Amiga,-128')
    expect(c).toContain('cpu_type=68020')
  })
})

describe.skipIf(!paquetsPresents)('installation depuis les paquets embarqués', () => {
  it('rien n’est installé au départ, les paquets sont embarqués', () => {
    const etats = emu.etatEmulateurs()
    expect(etats.map((e) => [e.id, e.installe, e.embarque])).toEqual([
      ['hatari', false, true],
      ['winuae', false, true]
    ])
  })

  it('installe Hatari et prépare le disque C:', async () => {
    const etapes: string[] = []
    await emu.installer('hatari', (_f, _t, etape) => etapes.push(etape))
    const d = join(emu.dossierEmulateurs(), 'hatari')
    expect(existsSync(join(d, 'hatari.exe'))).toBe(true)
    expect(existsSync(join(d, 'tos.img'))).toBe(true)
    expect(existsSync(join(d, '68k-trainer.cfg'))).toBe(true)
    expect(existsSync(join(emu.dossierPartage('atari'), 'LISEZMOI.txt'))).toBe(true)
    expect(etapes.at(-1)).toBe('Terminé')
    expect(emu.etatEmulateurs().find((e) => e.id === 'hatari')!.installe).toBe(true)
  })

  it('installe WinUAE en mode portable avec AROS et le crochet User-Startup', async () => {
    await emu.installer('winuae')
    const d = join(emu.dossierEmulateurs(), 'winuae')
    expect(existsSync(join(d, 'winuae64.exe'))).toBe(true)
    expect(existsSync(join(d, 'winuae.ini'))).toBe(true)
    expect(existsSync(join(d, 'aros', 'boot', 'amiga', 'aros-rom.bin'))).toBe(true)
    expect(readFileSync(join(d, 'aros', 'S', 'User-Startup'), 'utf-8')).toContain('PARTAGE:essai/lancer')
    const uae = readFileSync(join(d, '68k-trainer.uae'), 'utf-8')
    expect(uae).toContain(`DH1:PARTAGE:${emu.dossierPartage('amiga')},-128`)
  }, 120000)

  it('désinstalle sans toucher au dossier de partage', () => {
    emu.desinstaller('hatari')
    expect(existsSync(join(emu.dossierEmulateurs(), 'hatari'))).toBe(false)
    expect(existsSync(emu.dossierPartage('atari'))).toBe(true)
    expect(emu.etatEmulateurs().find((e) => e.id === 'hatari')!.installe).toBe(false)
  })
})
