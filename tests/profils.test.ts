import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { GestionProfils } from '../src/main/profils'

let dir: string
let g: GestionProfils

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), '68k-profils-'))
  g = new GestionProfils(dir)
})
afterEach(() => rmSync(dir, { recursive: true, force: true }))

describe('profils', () => {
  it('premier lancement sans ancienne progression : aucun profil', async () => {
    expect((await g.lister()).profils).toEqual([])
  })

  it("migre la progression de l'ancienne version dans un profil « Moi »", async () => {
    writeFileSync(join(dir, 'progress.json'), JSON.stringify({ completedExerciseIds: ['general-l1-e1'] }))
    const { profils, dernier } = await g.lister()
    expect(profils.map((p) => p.nom)).toEqual(['Moi'])
    expect(dernier).toBe(profils[0].id)
    await g.ouvrir(profils[0].id)
    expect((await g.chargerProgression()).completedExerciseIds).toEqual(['general-l1-e1'])
    expect(existsSync(join(dir, 'progress.json'))).toBe(true) // l'ancien fichier est gardé
  })

  it('chaque profil a sa propre progression', async () => {
    const a = (await g.creer('Alice')).profil!
    const b = (await g.creer('Bob')).profil!
    await g.ouvrir(a.id)
    await g.enregistrerProgression({ completedExerciseIds: ['x'], contenusVus: [] })
    await g.ouvrir(b.id)
    expect((await g.chargerProgression()).completedExerciseIds).toEqual([])
    await g.ouvrir(a.id)
    expect((await g.chargerProgression()).completedExerciseIds).toEqual(['x'])
  })

  it('mot de passe : jamais stocké en clair, vérifié à l’ouverture', async () => {
    const p = (await g.creer('Claire', 'secret68k')).profil!
    expect(p.protege).toBe(true)
    expect(readFileSync(join(dir, 'profils.json'), 'utf-8')).not.toContain('secret68k')
    expect((await g.ouvrir(p.id, 'mauvais')).ok).toBe(false)
    expect((await g.ouvrir(p.id)).ok).toBe(false)
    expect((await g.ouvrir(p.id, 'secret68k')).ok).toBe(true)
  })

  it('changer puis retirer le mot de passe exige l’actuel', async () => {
    const p = (await g.creer('Dan', 'un')).profil!
    await g.ouvrir(p.id, 'un')
    expect((await g.changerMotDePasse('faux', 'deux')).ok).toBe(false)
    expect((await g.changerMotDePasse('un', 'deux')).ok).toBe(true)
    expect((await g.ouvrir(p.id, 'deux')).ok).toBe(true)
    const res = await g.changerMotDePasse('deux', undefined)
    expect(res.profil?.protege).toBe(false)
    expect((await g.ouvrir(p.id)).ok).toBe(true)
  })

  it('noms uniques et renommage', async () => {
    await g.creer('Eve')
    expect((await g.creer('eve')).profil!.nom).toBe('eve (2)')
    const f = (await g.creer('Fred')).profil!
    await g.ouvrir(f.id)
    expect((await g.renommer('Eve')).ok).toBe(false)
    expect((await g.renommer('  Frédéric  ')).profil!.nom).toBe('Frédéric')
  })

  it('suppression protégée par le mot de passe', async () => {
    const p = (await g.creer('Gus', 'mdp')).profil!
    await g.ouvrir(p.id, 'mdp')
    expect((await g.supprimer('non')).ok).toBe(false)
    expect((await g.supprimer('mdp')).ok).toBe(true)
    expect((await g.lister()).profils).toEqual([])
    expect(existsSync(join(dir, 'profils', p.id))).toBe(false)
  })

  it('export puis import sur un autre poste, avec un nouveau mot de passe', async () => {
    const p = (await g.creer('Hugo', 'maison')).profil!
    await g.ouvrir(p.id, 'maison')
    await g.enregistrerProgression({ completedExerciseIds: ['a', 'b'], contenusVus: ['c'] })
    const exp = await g.exporter({ 'brouillon:a': 'MOVE.W #1,D0' })
    expect(JSON.stringify(exp)).not.toContain('hachage')

    const autre = new GestionProfils(mkdtempSync(join(tmpdir(), '68k-profils-autre-')))
    const res = await autre.importer(JSON.parse(JSON.stringify(exp)), 'lycee')
    expect(res.ok).toBe(true)
    expect(res.brouillons).toEqual({ 'brouillon:a': 'MOVE.W #1,D0' })
    expect((await autre.ouvrir(res.profil!.id, 'lycee')).ok).toBe(true)
    expect((await autre.chargerProgression()).completedExerciseIds).toEqual(['a', 'b'])
  })

  it('refuse un fichier qui n’est pas un profil', async () => {
    expect((await g.importer({ bonjour: 1 })).ok).toBe(false)
  })

  it('tableau de suivi : tous les profils, sans données sensibles', async () => {
    await g.creer('Iris', 'x')
    await g.creer('Jade')
    const t = await g.tableau()
    expect(t.map((l) => l.profil.nom).sort()).toEqual(['Iris', 'Jade'])
    expect(JSON.stringify(t)).not.toContain('hachage')
  })
})
