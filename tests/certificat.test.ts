import { join } from 'path'
import { describe, expect, it } from 'vitest'
import { loadContent } from '../src/main/content'
import { htmlCertificat } from '../src/shared/certificat'
import type { ProgressState } from '../src/shared/ipc'

const content = await loadContent(join(__dirname, '..', 'content'))
const parcours = content.parcours.find((p) => p.id === 'atari')!

/** Progression où tout le parcours (ou seulement le 1er chapitre) est fait. */
function progression(tout: boolean): ProgressState {
  const chapitres = tout ? parcours.chapitres : parcours.chapitres.slice(0, 1)
  const contenus = chapitres.flatMap((c) => c.notions.flatMap((n) => n.contenus))
  return {
    version: 2,
    completedExerciseIds: contenus.filter((c) => c.type === 'exercice').map((c) => c.id),
    contenusVus: contenus.filter((c) => c.type !== 'exercice').map((c) => c.id),
    qcm: Object.fromEntries(chapitres.filter((c) => c.qcm).map((c) => [c.qcm!.id, { meilleurScore: 9, total: 10, reussi: true, date: '2026-10-19' }]))
  } as ProgressState
}

describe('certificat', () => {
  it('attestation de progression tant que le parcours n’est pas fini', () => {
    const html = htmlCertificat(parcours, progression(false), { nom: 'Philippe <test>', date: new Date(2026, 9, 19) })
    expect(html).toContain('Attestation de progression')
    expect(html).toContain('Philippe &lt;test&gt;')
    expect(html).toContain('a validé 1 chapitre sur 8')
    expect(html).toContain('19 octobre 2026')
  })

  it('certificat quand tout est fait, avec chaque chapitre validé', () => {
    const html = htmlCertificat(parcours, progression(true), { nom: 'Yannick', version: '1.0.0' })
    expect(html).toContain('Certificat de fin de parcours')
    expect(html.match(/<tr class="ok">/g)?.length).toBe(8)
    expect(html).toContain('9/10')
    expect(html).toContain('68k Trainer 1.0.0')
  })
})
