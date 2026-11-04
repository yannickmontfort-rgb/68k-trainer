/**
 * La version anglaise ne change que des textes : mêmes chapitres, mêmes contenus, même code (aux
 * commentaires près), mêmes vérifications. Ce test compare le contenu chargé en français et en anglais.
 */
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import { loadContent } from '../src/main/content'
import type { Chapitre, Contenu } from '../src/shared/parcours'
import { codeSansCommentaires, fichierTraduit, traduireChapitre } from '../src/shared/traduction'

const racine = join(__dirname, '..', 'content')
const fr = await loadContent(racine, 'fr')
const en = await loadContent(racine, 'en')

const contenus = (ch: Chapitre): Contenu[] => [...ch.notions.flatMap((n) => n.contenus), ...(ch.bonus ?? [])]
const CHAMPS_CODE = ['code', 'solution', 'codeDepart', 'entete', 'pied'] as const

describe('traduction : la mécanique', () => {
  it('nom du fichier traduit', () => {
    expect(fichierTraduit('01-unites.md', 'en')).toBe('01-unites.en.md')
    expect(fichierTraduit('code.s', 'en')).toBe('code.en.s')
    expect(fichierTraduit('chapitre.json', 'fr')).toBe('chapitre.json')
  })
  it('le code sans ses commentaires', () => {
    expect(codeSansCommentaires("    MOVE.W  #1,D0   ; un\n* commentaire\n    DC.B    'a;b',0 ; deux")).toBe("    MOVE.W  #1,D0\n    DC.B    'a;b',0")
  })
  it('un identifiant inconnu est refusé', () => {
    const ch = structuredClone(fr.parcours[0].chapitres[0])
    expect(() => traduireChapitre(ch, { contenus: { inconnu: { titre: 'x' } } })).toThrow(/inconnu/)
  })
})

describe('traduction anglaise : seuls les textes changent', () => {
  for (const pf of fr.parcours) {
    const pe = en.parcours.find((p) => p.id === pf.id)!
    it(`${pf.id} : mêmes chapitres`, () => {
      expect(pe.chapitres.map((c) => c.id)).toEqual(pf.chapitres.map((c) => c.id))
    })
    pf.chapitres.forEach((chf, i) => {
      const che = pe.chapitres[i]
      it(`${pf.id} / ${chf.id} : même structure, même code, mêmes vérifications`, () => {
        const cf = contenus(chf)
        const ce = contenus(che)
        expect(ce.map((c) => c.id)).toEqual(cf.map((c) => c.id))
        cf.forEach((a, j) => {
          const b = ce[j] as Contenu & Record<string, unknown>
          const aa = a as Contenu & Record<string, unknown>
          for (const champ of CHAMPS_CODE) {
            if (typeof aa[champ] === 'string') {
              expect(codeSansCommentaires(b[champ] as string), `${a.id}.${champ}`).toBe(codeSansCommentaires(aa[champ] as string))
            }
          }
          if (a.type === 'exercice') {
            expect(b.check, `${a.id}.check`).toEqual(a.check)
            expect(b.machine, `${a.id}.machine`).toEqual(a.machine)
            if (a.lignes) expect((b.lignes as string[]).map(codeSansCommentaires), `${a.id}.lignes`).toEqual(a.lignes.map(codeSansCommentaires))
          }
          if (a.type === 'prediction') {
            const qb = b.questions as typeof a.questions
            expect(qb.map((q) => [q.id, q.bonne, q.choix.length, q.verification])).toEqual(a.questions.map((q) => [q.id, q.bonne, q.choix.length, q.verification]))
          }
          if (a.type === 'exemple') {
            expect((b.explications as typeof a.explications).map((e) => e.ligne)).toEqual(a.explications.map((e) => e.ligne))
          }
        })
        if (chf.qcm) {
          expect(che.qcm!.questions.map((q) => [q.id, q.bonne, q.choix.length])).toEqual(chf.qcm.questions.map((q) => [q.id, q.bonne, q.choix.length]))
        }
      })
    })
  }

  it('les fiches de référence : les mêmes, dans le même ordre', () => {
    for (const piste of Object.keys(fr.courses)) {
      expect(en.courses[piste].map((c) => c.slug)).toEqual(fr.courses[piste].map((c) => c.slug))
    }
  })
})
