import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join, resolve } from 'path'
import { afterAll, describe, expect, it, vi } from 'vitest'

// INCLUDE et INCBIN du bac à sable : d'abord à côté du source ouvert, puis dans content/fichiers
vi.mock('electron', () => ({ app: { isPackaged: false, getAppPath: () => resolve(__dirname, '..') } }))

const { assemblerDansApplication, fabriquerPrg } = await import('../src/main/assemblage')

const temp = mkdtempSync(join(tmpdir(), '68kt-include-'))
const projet = join(temp, 'projet')
mkdirSync(join(projet, 'lib'), { recursive: true })
writeFileSync(join(projet, 'macros.s'), 'VALEUR EQU 42\n')
writeFileSync(join(projet, 'lib', 'outils.s'), 'AUTRE EQU 7\n')
writeFileSync(join(projet, 'donnees.bin'), Buffer.from([1, 2, 3, 4]))
// Le même nom que dans content/fichiers : celui du projet passe devant
writeFileSync(join(projet, 'amiga-systeme.s'), 'PROJET EQU 1\n')
writeFileSync(join(temp, 'secret.s'), 'SECRET EQU 1\n')

afterAll(() => rmSync(temp, { recursive: true, force: true }))

const octets = (source: string, dossier?: string): number[] => {
  const r = assemblerDansApplication(source, dossier)
  expect(r.errors).toEqual([])
  return [...r.binary!]
}

describe('INCLUDE / INCBIN à côté du source ouvert', () => {
  it('trouve un fichier du dossier du source, et dans ses sous-dossiers', () => {
    expect(octets(' INCLUDE "macros.s"\n MOVEQ #VALEUR,D0\n', projet)).toEqual([0x70, 42])
    expect(octets(' INCLUDE "lib\\outils.s"\n MOVEQ #AUTRE,D0\n', projet)).toEqual([0x70, 7])
    expect(octets(' INCBIN "donnees.bin"\n', projet)).toEqual([1, 2, 3, 4])
  })

  it('le fichier du projet passe devant celui de 68k Trainer', () => {
    expect(octets(' INCLUDE "amiga-systeme.s"\n MOVEQ #PROJET,D0\n', projet)).toEqual([0x70, 1])
  })

  it('sans source ouvert, ou si le fichier manque à côté, prend celui de 68k Trainer', () => {
    expect(assemblerDansApplication(' INCLUDE "amiga-systeme.s"\n', undefined).success).toBe(true)
    expect(assemblerDansApplication(' INCLUDE "macros.s"\n', undefined).success).toBe(false)
  })

  it('refuse de sortir des deux dossiers', () => {
    expect(assemblerDansApplication(' INCLUDE "..\\secret.s"\n', projet).success).toBe(false)
    expect(assemblerDansApplication(` INCLUDE "${join(temp, 'secret.s')}"\n`, projet).success).toBe(false)
  })

  it('l’export (PRG et Amiga) utilise le même dossier', () => {
    expect(fabriquerPrg(' INCLUDE "macros.s"\n MOVEQ #VALEUR,D0\n CLR.W -(SP)\n TRAP #1\n', 'prg', projet).raison).toBeUndefined()
    expect(fabriquerPrg(' INCLUDE "macros.s"\n MOVEQ #0,D0\n RTS\n', 'hunk', projet).raison).toBeUndefined()
  })
})
