/**
 * Vérifie TOUT le contenu du parcours guidé, pour de vrai : chaque solution d'exercice est
 * assemblée par vasm puis exécutée sur la machine simulée, chaque exemple corrigé doit aller au
 * bout sans erreur, et chaque prédiction doit être vraie (champ `verification`).
 */
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import { loadContent } from '../src/main/content'
import type { Cpu } from '../src/cpu/cpu'
import { evaluateCheck } from '../src/shared/checkResult'
import type { ContenuExercice, Parcours, Plateforme } from '../src/shared/parcours'
import { platformFor, runBinary } from '../src/shared/runProgram'
import { assemble } from './helpers/assemble'

const content = await loadContent(join(__dirname, '..', 'content'))

function executer(source: string, plateforme: Plateforme, machine: ContenuExercice['machine'], maxSteps: number) {
  const asm = assemble(source)
  if (!asm.success) throw new Error("Ne s'assemble pas : " + JSON.stringify(asm.errors))
  return runBinary(asm.binary, asm.baseAddress, platformFor(plateforme, machine), maxSteps)
}

function lireEtat(cpu: Cpu, cle: string): string {
  const snap = cpu.getSnapshot()
  const h = (v: number): string => '$' + (v >>> 0).toString(16).toUpperCase().padStart(8, '0')
  if (/^D[0-7]$/.test(cle)) return h(snap.d[+cle[1]])
  if (/^A[0-7]$/.test(cle)) return h(snap.a[+cle[1]])
  if (cle === 'PC') return h(snap.pc)
  if (cle === 'SR') return '$' + snap.sr.toString(16).toUpperCase().padStart(4, '0')
  if (/^[XNZVC]$/.test(cle)) return snap.flags[cle.toLowerCase() as 'x'] ? '1' : '0'
  const m = cle.match(/^\$([0-9A-F]+)\.([BWL])$/i)
  if (m) {
    const size = m[2].toUpperCase() === 'B' ? 1 : m[2].toUpperCase() === 'W' ? 2 : 4
    return '$' + cpu.memory.read(parseInt(m[1], 16), size).toString(16).toUpperCase().padStart(size * 2, '0')
  }
  throw new Error(`Clé de vérification inconnue : ${cle}`)
}

const normaliser = (v: string): string =>
  v.startsWith('$') ? '$' + parseInt(v.slice(1), 16).toString(16).toUpperCase() : v

function sourceExercice(ex: ContenuExercice): string {
  return ex.variante === 'ordonner' ? [ex.entete ?? '', ...(ex.lignes ?? []), ex.pied ?? ''].join('\n') : ex.solution
}

function verifierParcours(parcours: Parcours): void {
  const ids = new Set<string>()
  const exercices: ContenuExercice[] = []

  describe(`parcours ${parcours.id}`, () => {
    for (const chapitre of parcours.chapitres) {
      describe(chapitre.titre, () => {
        const contenus = [...chapitre.notions.flatMap((n) => n.contenus), ...(chapitre.bonus ?? [])]
        it('identifiants uniques', () => {
          for (const c of contenus) {
            expect(ids.has(c.id), `id en double : ${c.id}`).toBe(false)
            ids.add(c.id)
          }
          if (chapitre.qcm) {
            expect(ids.has(chapitre.qcm.id)).toBe(false)
            ids.add(chapitre.qcm.id)
            for (const q of chapitre.qcm.questions) expect(q.bonne).toBeLessThan(q.choix.length)
          }
        })

        for (const c of contenus) {
          if (c.type === 'cours') {
            it(`cours « ${c.titre} » a un texte`, () => expect((c.markdown ?? '').length).toBeGreaterThan(20))
          }
          if (c.type === 'exemple') {
            it(`exemple « ${c.titre} » s'exécute jusqu'au bout`, () => {
              const { cpu, last } = executer(c.code, parcours.plateforme, c.machine, 100000)
              expect(last.error, last.error).toBeUndefined()
              expect(cpu.halted).toBe(true)
              const nbLignes = c.code.split('\n').length
              for (const e of c.explications) expect(e.ligne).toBeLessThanOrEqual(nbLignes)
            })
          }
          if (c.type === 'prediction') {
            it(`prédiction « ${c.titre} » : les bonnes réponses sont vraies`, () => {
              for (const q of c.questions) {
                expect(q.bonne).toBeLessThan(q.choix.length)
                if (!q.verification) continue
                const { cpu, last } = executer(q.code ?? c.code, parcours.plateforme, c.machine, 100000)
                expect(last.error, last.error).toBeUndefined()
                for (const [cle, attendu] of Object.entries(q.verification)) {
                  expect(normaliser(lireEtat(cpu, cle)), `${q.id} ${cle}`).toBe(normaliser(attendu))
                }
              }
            })
          }
          if (c.type === 'exercice') {
            exercices.push(c)
            it(`exercice « ${c.titre} » : la solution est acceptée`, () => {
              expect(c.solution || c.variante === 'ordonner', 'solution manquante').toBeTruthy()
              const { cpu, last } = executer(sourceExercice(c), parcours.plateforme, c.machine, c.check.maxSteps)
              const verdict = evaluateCheck(cpu, c.check)
              expect(verdict.success, `${verdict.message}\n${last.error ?? ''}`).toBe(true)
            })
            if (c.variante === 'completer' || c.variante === 'corriger') {
              it(`exercice « ${c.titre} » : le code de départ n'est pas déjà juste`, () => {
                const asm = assemble(c.codeDepart)
                if (!asm.success) return // erreur de syntaxe volontaire
                const { cpu } = runBinary(asm.binary, asm.baseAddress, platformFor(parcours.plateforme, c.machine), c.check.maxSteps)
                expect(evaluateCheck(cpu, c.check).success).toBe(false)
              })
            }
          }
        }
      })
    }
  })
}

for (const parcours of content.parcours) verifierParcours(parcours)
