import { describe, expect, it } from 'vitest'
import type { Parcours } from '../src/shared/parcours'
import {
  corrigerQcm,
  detailChapitre,
  detailParcours,
  etatNotion,
  normaliserProgression,
  premiereEtapeAFaire
} from '../src/shared/progression'

const check = { type: 'registers' as const, maxSteps: 1, expected: {} }
const ex = (id: string, bonus = false) => ({
  type: 'exercice' as const,
  id,
  titre: id,
  variante: 'ecrire' as const,
  niveau: 1 as const,
  enonce: '',
  indices: [],
  codeDepart: '',
  solution: '',
  check,
  bonus
})

const parcours: Parcours = {
  id: 'p',
  titre: 'P',
  plateforme: 'atari',
  description: '',
  statut: 'actif',
  chapitres: [
    {
      id: 'c1',
      titre: 'C1',
      plateforme: 'atari',
      resume: '',
      notions: [
        {
          id: 'n1',
          titre: 'N1',
          contenus: [{ type: 'cours', id: 'cours1', titre: 'cours' }, ex('ex1')]
        }
      ],
      qcm: { id: 'qcm1', questions: [] },
      bonus: [ex('bonus1', true)]
    },
    { id: 'c2', titre: 'C2', plateforme: 'atari', resume: '', notions: [{ id: 'n2', titre: 'N2', contenus: [ex('ex2')] }] }
  ]
}

describe('progression', () => {
  it('une progression v1 reste lisible', () => {
    const p = normaliserProgression({ completedExerciseIds: ['general-l1-e1'] })
    expect(p.completedExerciseIds).toEqual(['general-l1-e1'])
    expect(p.contenusVus).toEqual([])
    expect(p.version).toBe(2)
  })

  it('pourcentage du chapitre : contenus + QCM, sans le bonus', () => {
    const p = normaliserProgression({ completedExerciseIds: ['ex1', 'bonus1'], contenusVus: ['cours1'] })
    const d = detailChapitre(parcours.chapitres[0], p)
    expect(d.total).toBe(3) // cours + exercice + QCM
    expect(d.faits).toBe(2)
    expect(d.pourcentage).toBe(67)
    expect(d.bonus).toEqual({ faits: 1, total: 1 })
    expect(d.termine).toBe(false)
  })

  it('QCM réussi : chapitre terminé', () => {
    const p = normaliserProgression({
      completedExerciseIds: ['ex1'],
      contenusVus: ['cours1'],
      qcm: { qcm1: { meilleurScore: 8, total: 10, reussi: true, date: '' } }
    })
    expect(detailChapitre(parcours.chapitres[0], p).termine).toBe(true)
    const g = detailParcours(parcours, p)
    expect(g.chapitresTermines).toBe(1)
    expect(g.pourcentage).toBe(75) // 3 sur 4
    expect(g.bonusTotal).toBe(1)
  })

  it('état des notions', () => {
    const notion = parcours.chapitres[0].notions[0]
    expect(etatNotion(notion, normaliserProgression(null))).toBe('non-commencee')
    expect(etatNotion(notion, normaliserProgression({ completedExerciseIds: [], contenusVus: ['cours1'] }))).toBe('en-cours')
    expect(etatNotion(notion, normaliserProgression({ completedExerciseIds: ['ex1'], contenusVus: ['cours1'] }))).toBe('terminee')
  })

  it('première étape à faire', () => {
    expect(premiereEtapeAFaire(parcours, normaliserProgression(null))?.id).toBe('cours1')
    const p = normaliserProgression({ completedExerciseIds: ['ex1'], contenusVus: ['cours1'] })
    expect(premiereEtapeAFaire(parcours, p)?.id).toBe('qcm1')
  })

  it('correction de QCM avec seuil de 70 %', () => {
    expect(corrigerQcm([0, 1, 2, 0, 1, 2, 0, 1, 2, 0], [0, 1, 2, 0, 1, 2, 0, 0, 0, 1]).reussi).toBe(true)
    expect(corrigerQcm([0, 1, 2, 0, 1, 2, 0, 1, 2, 0], [0, 1, 2, 0, 1, 2, 1, 0, 0, 1]).reussi).toBe(false)
    expect(corrigerQcm([0, 1, 2], [0, 1, undefined]).score).toBe(2)
  })
})
