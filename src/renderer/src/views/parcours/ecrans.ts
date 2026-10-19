import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'
import type {
  Chapitre,
  ContenuCours,
  ContenuExemple,
  ContenuExercice,
  ContenuPrediction,
  Plateforme,
  QuestionQcm
} from '../../../../shared/parcours'
import { LIBELLE_VARIANTE, SEUIL_QCM_DEFAUT } from '../../../../shared/parcours'
import type { ProgressState } from '../../../../shared/ipc'
import { corrigerQcm, detailChapitre, etatNotion } from '../../../../shared/progression'
import { platformFor } from '../../../../shared/runProgram'
import { Debogueur } from '../../components/debogueur'
import { Execution } from '../../components/execution'
import { exporterPrg } from '../../exportPrg'
import { enregistrerQcm, marquerExerciceReussi, marquerVu } from '../../progressionStore'
import { ecrireLocal, lireLocal } from '../../profilActif'
import { sourceOrdonne, verifierExercice } from '../../verifier'
import { blocCode, echapper, renderMarkdown } from './markdown'

export interface ContexteEcran {
  plateforme: Plateforme
  progression: ProgressState
  /** À appeler quand la progression a changé (met à jour barre et sommaire). */
  progressionChangee: () => void
  suivant: () => void
  ouvrir: (etapeId: string) => void
}

type Nettoyage = () => void

function badges(c: { aRelire?: boolean; nonTeste?: boolean; source?: string }): string {
  return (
    (c.aRelire ? '<span class="badge badge-relire" title="Contenu rédigé par Claude, à relire par Yannick">à relire</span>' : '') +
    (c.nonTeste ? '<span class="badge badge-non-teste" title="Code non vérifié par le simulateur">non testé</span>' : '')
  )
}

function source(c: { source?: string }): string {
  return c.source ? `<p class="contenu-source">Source : ${echapper(c.source)}</p>` : ''
}

function creerEditeur(el: HTMLElement, value: string, readOnly: boolean): monaco.editor.IStandaloneCodeEditor {
  return monaco.editor.create(el, {
    value,
    language: 'm68k',
    theme: 'm68k-dark',
    fontSize: 14,
    minimap: { enabled: false },
    automaticLayout: true,
    readOnly,
    scrollBeyondLastLine: false,
    lineNumbersMinChars: 3
  })
}

// --- Accueil de chapitre --------------------------------------------------------

export function ecranChapitre(el: HTMLElement, chapitre: Chapitre, ctx: ContexteEcran): Nettoyage {
  const d = detailChapitre(chapitre, ctx.progression)
  const icone = { 'non-commencee': '○', 'en-cours': '◐', terminee: '●' }
  el.innerHTML = `
    <div class="ecran ecran-chapitre">
      <h2>${echapper(chapitre.titre)}</h2>
      ${chapitre.esquisse ? '<p class="esquisse">Chapitre en préparation : son plan est prêt, son contenu arrive dans une prochaine version.</p>' : ''}
      <div class="markdown-body chapitre-resume"></div>
      <h3>Au programme</h3>
      <ul class="liste-notions">
        ${chapitre.notions
          .map((n) => `<li><span class="etat-notion">${icone[etatNotion(n, ctx.progression)]}</span> ${echapper(n.titre)} <small>(${n.contenus.length} étape${n.contenus.length > 1 ? 's' : ''})</small></li>`)
          .join('')}
        ${chapitre.qcm ? `<li><span class="etat-notion">${d.qcm.reussi ? '●' : '○'}</span> QCM de fin de chapitre</li>` : ''}
        ${d.bonus.total ? `<li class="ligne-bonus">★ ${d.bonus.total} défi${d.bonus.total > 1 ? 's' : ''} bonus facultatif${d.bonus.total > 1 ? 's' : ''}</li>` : ''}
      </ul>
      ${chapitre.notions.length ? '<button class="btn-principal" id="btn-commencer">Commencer le chapitre</button>' : ''}
    </div>`
  renderMarkdown(el.querySelector('.chapitre-resume')!, chapitre.resume)
  const premier = chapitre.notions[0]?.contenus[0]
  el.querySelector('#btn-commencer')?.addEventListener('click', () => premier && ctx.ouvrir(premier.id))
  return () => {}
}

// --- Cours ----------------------------------------------------------------------

export function ecranCours(el: HTMLElement, cours: ContenuCours, ctx: ContexteEcran): Nettoyage {
  const lu = ctx.progression.contenusVus?.includes(cours.id)
  el.innerHTML = `
    <div class="ecran ecran-cours">
      <div class="ecran-type">📖 Cours ${badges(cours)}</div>
      <h2>${echapper(cours.titre)}</h2>
      <div class="markdown-body cours-texte"></div>
      ${source(cours)}
      <div class="ecran-actions">
        <button class="btn-principal" id="btn-lu">${lu ? 'Continuer →' : 'J’ai lu ce cours, continuer →'}</button>
      </div>
    </div>`
  renderMarkdown(el.querySelector('.cours-texte')!, cours.markdown ?? '')
  el.querySelector('#btn-lu')!.addEventListener('click', () => {
    if (marquerVu(cours.id)) ctx.progressionChangee()
    ctx.suivant()
  })
  return () => {}
}

// --- Exemple corrigé pas à pas ----------------------------------------------------

export function ecranExemple(el: HTMLElement, ex: ContenuExemple, ctx: ContexteEcran): Nettoyage {
  el.innerHTML = `
    <div class="ecran ecran-exemple">
      <div class="ecran-type">🧪 Exemple corrigé ${badges(ex)}</div>
      <h2>${echapper(ex.titre)}</h2>
      <div class="markdown-body exemple-intro"></div>
      <div class="exemple-zone">
        <div class="exemple-gauche">
          <div class="toolbar-mini">
            <button id="btn-pas" class="btn-principal" disabled>▶ Pas suivant</button>
            <button id="btn-tout" disabled>⏭ Jusqu'au bout</button>
            ${ex.machine?.ecran ? '<button id="btn-temps-reel" disabled title="Exécute à la vitesse d’un vrai ST : l’écran s’anime à 50 images par seconde">🎬 Temps réel</button>' : ''}
            <button id="btn-reset">↺ Recommencer</button>
            <span class="statut" id="statut"></span>
          </div>
          <div class="editeur-exemple" id="editeur"></div>
          <div class="explication" id="explication"></div>
        </div>
        <div class="exemple-droite" id="dbg"></div>
      </div>
      <div class="markdown-body exemple-conclusion" hidden></div>
      ${source(ex)}
      <div class="ecran-actions"><button id="btn-suivant">Continuer →</button></div>
    </div>`
  renderMarkdown(el.querySelector('.exemple-intro')!, ex.introduction)
  const conclusionEl = el.querySelector<HTMLDivElement>('.exemple-conclusion')!
  if (ex.conclusion) renderMarkdown(conclusionEl, ex.conclusion)

  const editor = creerEditeur(el.querySelector('#editeur')!, ex.code, true)
  const dbg = new Debogueur({ ecran: ex.machine?.ecran })
  el.querySelector('#dbg')!.appendChild(dbg.element)
  const exec = new Execution(editor, dbg, () => platformFor(ctx.plateforme, ex.machine), ex.machine?.memoire)
  const explicationEl = el.querySelector<HTMLDivElement>('#explication')!
  const statut = el.querySelector<HTMLSpanElement>('#statut')!
  const btnPas = el.querySelector<HTMLButtonElement>('#btn-pas')!
  const btnTout = el.querySelector<HTMLButtonElement>('#btn-tout')!
  const textes = new Map(ex.explications.map((e) => [e.ligne, e.texte]))

  function expliquer(derniere: number | undefined): void {
    const prochaine = exec.ligneCourante()
    const parts: string[] = []
    if (derniere !== undefined && textes.has(derniere)) {
      parts.push(`<p><strong>Ligne ${derniere} — ce qui vient de se passer :</strong> ${textes.get(derniere)}</p>`)
    }
    if (prochaine !== undefined && !exec.cpu?.halted) {
      const ligne = editor.getModel()?.getLineContent(prochaine).trim() ?? ''
      parts.push(`<p class="prochaine">Prochaine instruction (ligne ${prochaine}) : <code>${echapper(ligne)}</code></p>`)
    }
    explicationEl.innerHTML = parts.join('') || '<p>Clique sur « Pas suivant » pour exécuter la première instruction.</p>'
  }

  function fin(error?: string): void {
    btnPas.disabled = true
    btnTout.disabled = true
    statut.textContent = error ? 'Arrêt sur exception' : 'Programme terminé ✓'
    if (error) explicationEl.innerHTML += `<p class="erreur">${echapper(error)}</p>`
    conclusionEl.hidden = !ex.conclusion
    if (marquerVu(ex.id)) ctx.progressionChangee()
  }

  async function demarrer(): Promise<void> {
    const res = await exec.assembler(ex.code)
    btnPas.disabled = !res.success
    btnTout.disabled = !res.success
    if (btnTempsReel) btnTempsReel.disabled = !res.success
    conclusionEl.hidden = true
    statut.textContent = res.success ? '' : 'Erreur d’assemblage (contenu à corriger)'
    expliquer(undefined)
  }

  btnPas.addEventListener('click', () => {
    const avant = exec.ligneCourante()
    const effects = exec.pas()
    expliquer(avant)
    if (effects?.halted || effects?.error) fin(effects.error)
  })
  btnTout.addEventListener('click', () => {
    const effects = exec.toutExecuter()
    expliquer(undefined)
    fin(effects?.error)
  })
  const btnTempsReel = el.querySelector<HTMLButtonElement>('#btn-temps-reel')
  btnTempsReel?.addEventListener('click', () => {
    if (exec.enTempsReel) return exec.arreter()
    btnTempsReel.textContent = '⏸ Arrêter'
    btnPas.disabled = true
    btnTout.disabled = true
    statut.textContent = 'Temps réel…'
    exec.tempsReel((raison, effects) => {
      btnTempsReel.textContent = '🎬 Temps réel'
      if (raison === 'arret') {
        btnPas.disabled = false
        btnTout.disabled = false
        statut.textContent = 'Arrêté'
        expliquer(undefined)
      } else fin(effects?.error)
    })
  })
  el.querySelector('#btn-reset')!.addEventListener('click', () => {
    exec.reinitialiser()
    btnPas.disabled = false
    btnTout.disabled = false
    if (btnTempsReel) btnTempsReel.disabled = false
    statut.textContent = ''
    conclusionEl.hidden = true
    expliquer(undefined)
  })
  el.querySelector('#btn-suivant')!.addEventListener('click', () => ctx.suivant())
  void demarrer()
  return () => {
    exec.arreter()
    editor.dispose()
  }
}

// --- Exercice (et défi bonus) ---------------------------------------------------------

const CLE_BROUILLON = 'brouillon:'

function melanger<T>(items: T[], graine: string): T[] {
  let h = 0
  for (const ch of graine) h = (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    h = (Math.imul(h, 1103515245) + 12345) >>> 0
    const j = h % (i + 1)
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  // Jamais déjà dans le bon ordre
  if (result.length > 1 && result.every((v, i) => v === items[i])) result.push(result.shift()!)
  return result
}

export function ecranExercice(el: HTMLElement, ex: ContenuExercice, ctx: ContexteEcran): Nettoyage {
  const reussi = ctx.progression.completedExerciseIds.includes(ex.id)
  const niveau = '●'.repeat(ex.niveau) + '○'.repeat(3 - ex.niveau)
  const ordonner = ex.variante === 'ordonner'
  el.innerHTML = `
    <div class="ecran ecran-exercice${ex.bonus ? ' ecran-bonus' : ''}">
      <div class="ecran-type">
        ${ex.bonus ? '<span class="badge badge-bonus">★ Défi bonus — facultatif</span>' : '✏️ Exercice'}
        <span class="badge badge-variante">${LIBELLE_VARIANTE[ex.variante]}</span>
        <span class="niveau" title="Niveau ${ex.niveau} sur 3">Niveau ${niveau}</span>
        ${reussi ? '<span class="badge badge-ok">réussi ✓</span>' : ''}
        ${badges(ex)}
      </div>
      <h2>${echapper(ex.titre)}</h2>
      <div class="markdown-body exercice-enonce"></div>
      <div class="exercice-zone">
        <div class="exercice-gauche">
          ${ordonner ? '<div class="ordonner" id="ordonner"></div>' : '<div class="editeur-exercice" id="editeur"></div>'}
          <div class="toolbar-mini">
            <button class="btn-principal" id="btn-verifier">Vérifier</button>
            <button id="btn-pas-a-pas">Pas à pas</button>
            <button id="btn-indice">Indice (0/${ex.indices.length})</button>
            <button id="btn-solution" disabled title="Disponible après avoir vu les indices ou après 3 essais">Voir la solution</button>
            ${ordonner ? '' : '<button id="btn-reinit" title="Revenir au code de départ">↺</button>'}
            <button id="btn-prg" ${reussi ? '' : 'hidden'} title="Lance ton programme dans l'émulateur Hatari ou sur un vrai Atari ST !">Exporter .PRG</button>
          </div>
          <p class="export-prg" id="export-prg" hidden></p>
          <ul class="indices" id="indices"></ul>
          <div class="verdict" id="verdict" hidden></div>
        </div>
        <div class="exercice-droite" id="panneau-dbg" hidden>
          <div class="toolbar-mini">
            <button id="dbg-pas" class="btn-principal">▶ Pas</button>
            <button id="dbg-tout">⏭ Jusqu'au bout</button>
            ${ex.machine?.ecran ? '<button id="dbg-temps-reel" title="Exécute à la vitesse d’un vrai ST : l’écran s’anime à 50 images par seconde">🎬 Temps réel</button>' : ''}
            <button id="dbg-reset">↺</button>
            <button id="dbg-fermer" title="Fermer le pas à pas">✕</button>
            <span class="statut" id="dbg-statut"></span>
          </div>
          <div id="dbg"></div>
        </div>
      </div>
      ${source(ex)}
      <div class="ecran-actions"><button id="btn-suivant">${ex.bonus ? 'Continuer →' : 'Passer à la suite →'}</button></div>
    </div>`
  renderMarkdown(el.querySelector('.exercice-enonce')!, ex.enonce)

  let editor: monaco.editor.IStandaloneCodeEditor | null = null
  let ordre: string[] = []
  const ordonnerEl = el.querySelector<HTMLDivElement>('#ordonner')

  function renderOrdonner(): void {
    if (!ordonnerEl) return
    ordonnerEl.innerHTML = ''
    if (ex.entete) ordonnerEl.appendChild(blocCode(ex.entete)).classList.add('fixe')
    ordre.forEach((ligne, i) => {
      const row = document.createElement('div')
      row.className = 'ordonner-ligne'
      row.innerHTML = `<button title="Monter" ${i === 0 ? 'disabled' : ''}>▲</button><button title="Descendre" ${i === ordre.length - 1 ? 'disabled' : ''}>▼</button>`
      row.appendChild(blocCode(ligne))
      const [haut, bas] = Array.from(row.querySelectorAll('button'))
      haut.addEventListener('click', () => {
        ;[ordre[i - 1], ordre[i]] = [ordre[i], ordre[i - 1]]
        renderOrdonner()
      })
      bas.addEventListener('click', () => {
        ;[ordre[i + 1], ordre[i]] = [ordre[i], ordre[i + 1]]
        renderOrdonner()
      })
      ordonnerEl.appendChild(row)
    })
    if (ex.pied) ordonnerEl.appendChild(blocCode(ex.pied)).classList.add('fixe')
  }

  if (ordonner) {
    ordre = melanger(ex.lignes ?? [], ex.id)
    renderOrdonner()
  } else {
    const brouillon = lireLocal(CLE_BROUILLON + ex.id)
    editor = creerEditeur(el.querySelector('#editeur')!, brouillon ?? ex.codeDepart, false)
    editor.onDidChangeModelContent(() => ecrireLocal(CLE_BROUILLON + ex.id, editor!.getValue()))
  }

  const sourceActuel = (): string => (editor ? editor.getValue() : sourceOrdonne(ex, ordre))

  // Indices et solution (retrait progressif de l'aide)
  let indicesVus = 0
  let essais = 0
  const btnIndice = el.querySelector<HTMLButtonElement>('#btn-indice')!
  const btnSolution = el.querySelector<HTMLButtonElement>('#btn-solution')!
  const indicesEl = el.querySelector<HTMLUListElement>('#indices')!
  const majSolution = (): void => {
    btnSolution.disabled = !(reussi || indicesVus >= ex.indices.length || essais >= 3)
  }
  btnIndice.disabled = ex.indices.length === 0
  btnIndice.addEventListener('click', () => {
    if (indicesVus >= ex.indices.length) return
    const li = document.createElement('li')
    renderMarkdown(li, ex.indices[indicesVus])
    indicesEl.appendChild(li)
    indicesVus++
    btnIndice.textContent = `Indice (${indicesVus}/${ex.indices.length})`
    majSolution()
  })
  majSolution()
  btnSolution.addEventListener('click', () => {
    const bloc = document.createElement('div')
    bloc.className = 'solution'
    bloc.innerHTML = '<h4>Une solution possible</h4><p>Lis-la, puis ferme-la et réécris le programme toi-même : c’est comme ça qu’on retient.</p>'
    bloc.appendChild(blocCode(ex.solution || '(solution non fournie)'))
    indicesEl.after(bloc)
    btnSolution.disabled = true
  })

  // Vérification
  const verdictEl = el.querySelector<HTMLDivElement>('#verdict')!
  // Export .PRG, proposé une fois l'exercice réussi
  const btnPrg = el.querySelector<HTMLButtonElement>('#btn-prg')!
  const exportEl = el.querySelector<HTMLParagraphElement>('#export-prg')!
  btnPrg.addEventListener('click', () => {
    void exporterPrg(sourceActuel(), ex.id.split('-').pop() ?? ex.id).then((r) => {
      exportEl.hidden = false
      exportEl.textContent = r.message
    })
  })
  const btnVerifier = el.querySelector<HTMLButtonElement>('#btn-verifier')!
  btnVerifier.addEventListener('click', () => {
    void (async () => {
      btnVerifier.disabled = true
      verdictEl.hidden = false
      verdictEl.className = 'verdict'
      verdictEl.textContent = 'Vérification…'
      try {
        const v = await verifierExercice(sourceActuel(), ex, ctx.plateforme)
        essais++
        verdictEl.className = 'verdict ' + (v.success ? 'verdict-ok' : 'verdict-ko')
        verdictEl.innerHTML =
          `<p class="verdict-titre">${v.success ? (ex.bonus ? '★ Défi relevé !' : '✓ Réussi !') : '✗ Pas encore…'}</p>` +
          `<pre>${echapper(v.message)}</pre>` +
          (v.pistes.length ? `<div class="pistes"><strong>Pour déboguer :</strong><ul>${v.pistes.map((p) => `<li>${echapper(p)}</li>`).join('')}</ul></div>` : '')
        if (v.success) btnPrg.hidden = false
        if (v.success && marquerExerciceReussi(ex.id)) ctx.progressionChangee()
        majSolution()
      } finally {
        btnVerifier.disabled = false
      }
    })()
  })

  // Pas à pas
  const panneau = el.querySelector<HTMLDivElement>('#panneau-dbg')!
  const dbgStatut = el.querySelector<HTMLSpanElement>('#dbg-statut')!
  const dbg = new Debogueur({ ecran: ex.machine?.ecran })
  el.querySelector('#dbg')!.appendChild(dbg.element)
  let exec: Execution | null = null
  let editeurPasAPas: monaco.editor.IStandaloneCodeEditor | null = null
  el.querySelector('#btn-pas-a-pas')!.addEventListener('click', () => {
    void (async () => {
      panneau.hidden = false
      let cible = editor
      if (!cible) {
        // « Ordonner » : un petit éditeur en lecture seule montre le programme reconstitué
        if (!editeurPasAPas) {
          const zone = document.createElement('div')
          zone.className = 'editeur-pas-a-pas'
          panneau.insertBefore(zone, el.querySelector('#dbg'))
          editeurPasAPas = creerEditeur(zone, '', true)
        }
        editeurPasAPas.setValue(sourceActuel())
        cible = editeurPasAPas
      }
      exec = new Execution(cible, dbg, () => platformFor(ctx.plateforme, ex.machine), ex.machine?.memoire)
      const res = await exec.assembler(sourceActuel())
      dbgStatut.textContent = res.success ? 'Prêt : avance pas à pas' : 'Erreur d’assemblage : voir les lignes soulignées'
    })()
  })
  const apres = (effects: ReturnType<Execution['pas']>): void => {
    if (effects?.error) dbgStatut.textContent = effects.error
    else if (effects?.halted) dbgStatut.textContent = 'Programme terminé'
  }
  el.querySelector('#dbg-pas')!.addEventListener('click', () => apres(exec?.pas() ?? null))
  el.querySelector('#dbg-tout')!.addEventListener('click', () => apres(exec?.toutExecuter(ex.check.maxSteps) ?? null))
  const dbgTempsReel = el.querySelector<HTMLButtonElement>('#dbg-temps-reel')
  dbgTempsReel?.addEventListener('click', () => {
    if (!exec) return
    if (exec.enTempsReel) return exec.arreter()
    dbgTempsReel.textContent = '⏸ Arrêter'
    dbgStatut.textContent = 'Temps réel…'
    exec.tempsReel((raison, effects) => {
      dbgTempsReel.textContent = '🎬 Temps réel'
      if (raison === 'arret') dbgStatut.textContent = 'Arrêté'
      else apres(effects)
    })
  })
  el.querySelector('#dbg-reset')!.addEventListener('click', () => {
    exec?.reinitialiser()
    dbgStatut.textContent = 'Recommencé'
  })
  el.querySelector('#dbg-fermer')!.addEventListener('click', () => {
    panneau.hidden = true
    exec?.surligner(undefined)
  })
  el.querySelector('#btn-reinit')?.addEventListener('click', () => {
    if (editor && confirm('Revenir au code de départ ? Ton code actuel sera perdu.')) editor.setValue(ex.codeDepart)
  })
  el.querySelector('#btn-suivant')!.addEventListener('click', () => ctx.suivant())

  return () => {
    exec?.arreter()
    editor?.dispose()
    editeurPasAPas?.dispose()
  }
}

// --- Questions à choix (prédiction et QCM) ------------------------------------------

function renderQuestions(container: HTMLElement, questions: QuestionQcm[], nom: string): void {
  container.innerHTML = questions
    .map(
      (q, qi) => `
      <fieldset class="question" data-q="${qi}">
        <legend>${qi + 1}. </legend>
        <div class="markdown-body question-enonce"></div>
        <div class="question-code"></div>
        ${q.choix
          .map(
            (c, ci) =>
              `<label class="choix"><input type="radio" name="${nom}-${qi}" value="${ci}" /> <span class="choix-texte">${echapper(c)}</span></label>`
          )
          .join('')}
        <div class="question-correction" hidden></div>
      </fieldset>`
    )
    .join('')
  container.querySelectorAll<HTMLFieldSetElement>('.question').forEach((fs, qi) => {
    const q = questions[qi]
    renderMarkdown(fs.querySelector('.question-enonce')!, q.enonce)
    if (q.code) fs.querySelector('.question-code')!.appendChild(blocCode(q.code))
  })
}

function lireReponses(container: HTMLElement, questions: QuestionQcm[], nom: string): (number | undefined)[] {
  return questions.map((_, qi) => {
    const checked = container.querySelector<HTMLInputElement>(`input[name="${nom}-${qi}"]:checked`)
    return checked ? parseInt(checked.value, 10) : undefined
  })
}

function corrigerQuestions(container: HTMLElement, questions: QuestionQcm[], reponses: (number | undefined)[]): void {
  container.querySelectorAll<HTMLFieldSetElement>('.question').forEach((fs, qi) => {
    const q = questions[qi]
    const ok = reponses[qi] === q.bonne
    fs.classList.toggle('juste', ok)
    fs.classList.toggle('faux', !ok)
    fs.querySelectorAll<HTMLLabelElement>('.choix').forEach((label, ci) => {
      label.classList.toggle('bonne-reponse', ci === q.bonne)
    })
    const corr = fs.querySelector<HTMLDivElement>('.question-correction')!
    corr.hidden = false
    renderMarkdown(corr, `${ok ? '✓ **Juste.**' : `✗ **La bonne réponse était : ${q.choix[q.bonne]}.**`} ${q.explication}`)
  })
}

export function ecranPrediction(el: HTMLElement, pred: ContenuPrediction, ctx: ContexteEcran): Nettoyage {
  el.innerHTML = `
    <div class="ecran ecran-prediction">
      <div class="ecran-type">🔮 Lire et prédire ${badges(pred)}</div>
      <h2>${echapper(pred.titre)}</h2>
      <div class="markdown-body prediction-intro"></div>
      <div class="prediction-zone">
        <div class="prediction-gauche">
          <div class="editeur-exemple" id="editeur"></div>
          <div class="questions" id="questions"></div>
          <div class="ecran-actions">
            <button class="btn-principal" id="btn-valider">Valider mes réponses</button>
            <button id="btn-executer" disabled>Vérifier en exécutant</button>
          </div>
        </div>
        <div class="prediction-droite" id="dbg" hidden></div>
      </div>
      ${source(pred)}
      <div class="ecran-actions"><button id="btn-suivant">Continuer →</button></div>
    </div>`
  renderMarkdown(el.querySelector('.prediction-intro')!, pred.introduction)
  const editor = creerEditeur(el.querySelector('#editeur')!, pred.code, true)
  const questionsEl = el.querySelector<HTMLDivElement>('#questions')!
  renderQuestions(questionsEl, pred.questions, pred.id)
  const btnExecuter = el.querySelector<HTMLButtonElement>('#btn-executer')!
  el.querySelector('#btn-valider')!.addEventListener('click', () => {
    const reponses = lireReponses(questionsEl, pred.questions, pred.id)
    if (reponses.some((r) => r === undefined)) {
      alert('Réponds à toutes les questions avant de valider : il faut d’abord prédire, sans exécuter.')
      return
    }
    corrigerQuestions(questionsEl, pred.questions, reponses)
    btnExecuter.disabled = false
    if (marquerVu(pred.id)) ctx.progressionChangee()
  })
  const dbgEl = el.querySelector<HTMLDivElement>('#dbg')!
  btnExecuter.addEventListener('click', () => {
    void (async () => {
      dbgEl.hidden = false
      dbgEl.innerHTML = ''
      const dbg = new Debogueur({ ecran: pred.machine?.ecran })
      dbgEl.appendChild(dbg.element)
      const exec = new Execution(editor, dbg, () => platformFor(ctx.plateforme, pred.machine), pred.machine?.memoire)
      const res = await exec.assembler(pred.code)
      if (!res.success) return
      const effects = exec.toutExecuter(100000)
      const bilan = document.createElement('p')
      bilan.className = effects?.error ? 'verdict verdict-ko' : 'verdict verdict-ok'
      bilan.textContent = effects?.error ?? 'Programme exécuté jusqu’au bout : compare l’état ci-dessous à tes prédictions.'
      dbgEl.prepend(bilan)
    })()
  })
  el.querySelector('#btn-suivant')!.addEventListener('click', () => ctx.suivant())
  return () => editor.dispose()
}

export function ecranQcm(el: HTMLElement, chapitre: Chapitre, ctx: ContexteEcran): Nettoyage {
  const qcm = chapitre.qcm!
  const seuil = qcm.seuil ?? SEUIL_QCM_DEFAUT
  const resultat = ctx.progression.qcm?.[qcm.id]
  el.innerHTML = `
    <div class="ecran ecran-qcm">
      <div class="ecran-type">❓ QCM de fin de chapitre</div>
      <h2>${echapper(chapitre.titre)} — vérifie tes acquis</h2>
      <p>${qcm.questions.length} questions. Il faut ${Math.ceil(seuil * qcm.questions.length)} bonnes réponses (${Math.round(seuil * 100)} %) pour valider le chapitre. Tu peux recommencer autant de fois que tu veux, sans pénalité.
      ${resultat ? `<br><strong>Meilleur score : ${resultat.meilleurScore}/${resultat.total}${resultat.reussi ? ' — validé ✓' : ''}</strong>` : ''}</p>
      <div class="questions" id="questions"></div>
      <div class="verdict" id="verdict" hidden></div>
      <div class="ecran-actions">
        <button class="btn-principal" id="btn-valider">Valider</button>
        <button id="btn-recommencer" hidden>Recommencer</button>
        <button id="btn-suivant">Continuer →</button>
      </div>
    </div>`
  const questionsEl = el.querySelector<HTMLDivElement>('#questions')!
  const verdictEl = el.querySelector<HTMLDivElement>('#verdict')!
  const btnValider = el.querySelector<HTMLButtonElement>('#btn-valider')!
  const btnRecommencer = el.querySelector<HTMLButtonElement>('#btn-recommencer')!
  const afficher = (): void => {
    renderQuestions(questionsEl, qcm.questions, qcm.id)
    verdictEl.hidden = true
    btnValider.hidden = false
    btnRecommencer.hidden = true
  }
  afficher()
  btnValider.addEventListener('click', () => {
    const reponses = lireReponses(questionsEl, qcm.questions, qcm.id)
    const r = corrigerQcm(
      qcm.questions.map((q) => q.bonne),
      reponses,
      seuil
    )
    corrigerQuestions(questionsEl, qcm.questions, reponses)
    enregistrerQcm(qcm.id, r.score, r.total, r.reussi)
    ctx.progressionChangee()
    verdictEl.hidden = false
    verdictEl.className = 'verdict ' + (r.reussi ? 'verdict-ok' : 'verdict-ko')
    verdictEl.innerHTML = `<p class="verdict-titre">${r.score}/${r.total} — ${r.reussi ? 'chapitre validé ✓' : 'pas encore validé'}</p>${
      r.reussi ? '' : '<p>Relis les corrections ci-dessus, revois les notions concernées, puis recommence.</p>'
    }`
    btnValider.hidden = true
    btnRecommencer.hidden = false
    verdictEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
  })
  btnRecommencer.addEventListener('click', afficher)
  el.querySelector('#btn-suivant')!.addEventListener('click', () => ctx.suivant())
  return () => {}
}
