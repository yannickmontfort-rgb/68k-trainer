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
import { SEUIL_QCM_DEFAUT } from '../../../../shared/parcours'
import type { ProgressState } from '../../../../shared/ipc'
import { corrigerQcm, detailChapitre, etatNotion } from '../../../../shared/progression'
import { platformFor } from '../../../../shared/runProgram'
import { machineDe } from '../../../../shared/machines'
import { Debogueur } from '../../components/debogueur'
import { Execution } from '../../components/execution'
import { essayerDansEmulateur, exporterPrg } from '../../exportPrg'
import { enregistrerQcm, marquerExerciceReussi, marquerVu } from '../../progressionStore'
import { ecrireLocal, lireLocal } from '../../profilActif'
import { sourceOrdonne, verifierExercice } from '../../verifier'
import { blocCode, echapper, renderMarkdown } from './markdown'
import { confirmer, informer } from '../../components/dialogue'
import { traducteur } from '../../langue'

const t = traducteur({
  fr: {
    relire: 'à relire',
    relireTitre: 'Contenu rédigé par Claude, à relire par Yannick',
    nonTeste: 'non testé',
    nonTesteTitre: 'Code non vérifié par le simulateur',
    source: 'Source : {source}',
    esquisse: 'Chapitre en préparation : son plan est prêt, son contenu arrive dans une prochaine version.',
    auProgramme: 'Au programme',
    etapes1: '({n} étape)',
    etapesN: '({n} étapes)',
    qcmFin: 'QCM de fin de chapitre',
    bonus1: '{n} défi bonus facultatif',
    bonusN: '{n} défis bonus facultatifs',
    commencer: 'Commencer le chapitre',
    typeCours: 'Cours',
    continuer: 'Continuer →',
    luContinuer: 'J’ai lu ce cours, continuer →',
    typeExemple: 'Exemple corrigé',
    pasSuivant: '▶ Pas suivant',
    jusquauBout: "⏭ Jusqu'au bout",
    tempsReelTitre: 'Exécute à la vitesse de la vraie machine : l’écran s’anime à 50 images par seconde',
    tempsReel: '🎬 Temps réel',
    recommencerBtn: '↺ Recommencer',
    ligneExpliquee: 'Ligne {ligne} — ce qui vient de se passer :',
    prochaine: 'Prochaine instruction (ligne {ligne}) :',
    cliquePas: 'Clique sur « Pas suivant » pour exécuter la première instruction.',
    arretException: 'Arrêt sur exception',
    termineOk: 'Programme terminé ✓',
    erreurContenu: 'Erreur d’assemblage (contenu à corriger)',
    pointArret: "Point d'arrêt",
    arreterBtn: '⏸ Arrêter',
    tempsReelEnCours: 'Temps réel…',
    arrete: 'Arrêté',
    'variante-completer': 'À compléter',
    'variante-modifier': 'À modifier',
    'variante-ecrire': 'À écrire',
    'variante-corriger': 'À corriger',
    'variante-ordonner': 'À remettre dans l’ordre',
    defiBonus: '★ Défi bonus — facultatif',
    typeExercice: 'Exercice',
    niveauTitre: 'Niveau {n} sur 3',
    niveau: 'Niveau {niveau}',
    reussiBadge: 'réussi ✓',
    verifier: 'Vérifier',
    pasAPas: 'Pas à pas',
    indice: 'Indice ({vus}/{total})',
    solutionTitre: 'Disponible après avoir vu les indices ou après 3 essais',
    voirSolution: 'Voir la solution',
    reinitTitre: 'Revenir au code de départ',
    essayerTitre: "Lancer ton programme dans un vrai émulateur (onglet « Émulateurs » pour l'installer)",
    essayer: 'Essayer dans {emulateur}',
    pas: '▶ Pas',
    fermerPasAPas: 'Fermer le pas à pas',
    passerSuite: 'Passer à la suite →',
    monter: 'Monter',
    descendre: 'Descendre',
    solutionPossible: 'Une solution possible',
    solutionConseil: 'Lis-la, puis ferme-la et réécris le programme toi-même : c’est comme ça qu’on retient.',
    solutionAbsente: '(solution non fournie)',
    masquerSolution: 'Masquer la solution',
    verification: 'Vérification…',
    defiReleve: '★ Défi relevé !',
    reussi: '✓ Réussi !',
    pasEncore: '✗ Pas encore…',
    pourDeboguer: 'Pour déboguer :',
    pretPasAPas: 'Prêt : avance pas à pas',
    autre1: ' (et {n} autre)',
    autreN: ' (et {n} autres)',
    erreurLigne: 'Erreur d’assemblage, ligne {ligne} : {message}{autres}',
    erreurAssemblage: 'Erreur d’assemblage',
    codeModifie: 'Code modifié : le prochain pas repart du début avec ton nouveau code',
    programmeTermine: 'Programme terminé',
    recommence: 'Recommencé',
    confirmerReinit: 'Revenir au code de départ ? Ton code actuel sera perdu.',
    revenirDepart: 'Revenir au départ',
    juste: '✓ **Juste.**',
    bonneReponse: '✗ **La bonne réponse était : {reponse}.**',
    typePrediction: 'Lire et prédire',
    validerReponses: 'Valider mes réponses',
    verifierExecutant: 'Vérifier en exécutant',
    repondreTout: 'Réponds à toutes les questions avant de valider : il faut d’abord prédire, sans exécuter.',
    executeBout: 'Programme exécuté jusqu’au bout : compare l’état ci-dessous à tes prédictions.',
    qcmTitre: '{titre} — vérifie tes acquis',
    qcmConsigne:
      '{n} questions. Il faut {bonnes} bonnes réponses ({pourcent} %) pour valider le chapitre. Tu peux recommencer autant de fois que tu veux, sans pénalité.',
    meilleurScore: 'Meilleur score : {score}/{total}',
    valide: ' — validé ✓',
    valider: 'Valider',
    recommencer: 'Recommencer',
    chapitreValide: 'chapitre validé ✓',
    pasEncoreValide: 'pas encore validé',
    relisCorrections: 'Relis les corrections ci-dessus, revois les notions concernées, puis recommence.'
  },
  en: {
    relire: 'to proofread',
    relireTitre: 'Content written by Claude, to be proofread by Yannick',
    nonTeste: 'untested',
    nonTesteTitre: 'Code not checked by the simulator',
    source: 'Source: {source}',
    esquisse: 'Chapter in preparation: its outline is ready, its content comes in a future version.',
    auProgramme: 'In this chapter',
    etapes1: '({n} step)',
    etapesN: '({n} steps)',
    qcmFin: 'End-of-chapter quiz',
    bonus1: '{n} optional bonus challenge',
    bonusN: '{n} optional bonus challenges',
    commencer: 'Start the chapter',
    typeCours: 'Lesson',
    continuer: 'Continue →',
    luContinuer: 'I have read this lesson, continue →',
    typeExemple: 'Worked example',
    pasSuivant: '▶ Next step',
    jusquauBout: '⏭ Run to the end',
    tempsReelTitre: 'Runs at the speed of the real machine: the screen updates 50 times per second',
    tempsReel: '🎬 Real time',
    recommencerBtn: '↺ Restart',
    ligneExpliquee: 'Line {ligne} — what just happened:',
    prochaine: 'Next instruction (line {ligne}):',
    cliquePas: 'Click “Next step” to run the first instruction.',
    arretException: 'Stopped on an exception',
    termineOk: 'Program finished ✓',
    erreurContenu: 'Assembly error (the content needs fixing)',
    pointArret: 'Breakpoint',
    arreterBtn: '⏸ Stop',
    tempsReelEnCours: 'Real time…',
    arrete: 'Stopped',
    'variante-completer': 'Fill in',
    'variante-modifier': 'Modify',
    'variante-ecrire': 'Write',
    'variante-corriger': 'Fix',
    'variante-ordonner': 'Put in order',
    defiBonus: '★ Bonus challenge — optional',
    typeExercice: 'Exercise',
    niveauTitre: 'Level {n} of 3',
    niveau: 'Level {niveau}',
    reussiBadge: 'passed ✓',
    verifier: 'Check',
    pasAPas: 'Step by step',
    indice: 'Hint ({vus}/{total})',
    solutionTitre: 'Available once you have seen the hints or after 3 attempts',
    voirSolution: 'Show the solution',
    reinitTitre: 'Back to the starting code',
    essayerTitre: 'Run your program in a real emulator (see the “Emulators” tab to install it)',
    essayer: 'Try in {emulateur}',
    pas: '▶ Step',
    fermerPasAPas: 'Close step by step',
    passerSuite: 'Move on →',
    monter: 'Move up',
    descendre: 'Move down',
    solutionPossible: 'One possible solution',
    solutionConseil: 'Read it, then close it and write the program again yourself: that is how it sticks.',
    solutionAbsente: '(no solution provided)',
    masquerSolution: 'Hide the solution',
    verification: 'Checking…',
    defiReleve: '★ Challenge completed',
    reussi: '✓ Passed',
    pasEncore: '✗ Not yet…',
    pourDeboguer: 'To debug:',
    pretPasAPas: 'Ready: go step by step',
    autre1: ' (and {n} more)',
    autreN: ' (and {n} more)',
    erreurLigne: 'Assembly error, line {ligne}: {message}{autres}',
    erreurAssemblage: 'Assembly error',
    codeModifie: 'Code changed: the next step starts again from the beginning with your new code',
    programmeTermine: 'Program finished',
    recommence: 'Restarted',
    confirmerReinit: 'Go back to the starting code? Your current code will be lost.',
    revenirDepart: 'Back to the start',
    juste: '✓ **Correct.**',
    bonneReponse: '✗ **The right answer was: {reponse}.**',
    typePrediction: 'Read and predict',
    validerReponses: 'Submit my answers',
    verifierExecutant: 'Check by running',
    repondreTout: 'Answer every question before submitting: predict first, without running the code.',
    executeBout: 'Program run to the end: compare the state below with your predictions.',
    qcmTitre: '{titre} — test what you have learned',
    qcmConsigne:
      '{n} questions. You need {bonnes} right answers ({pourcent} %) to complete the chapter. You can try again as many times as you like, with no penalty.',
    meilleurScore: 'Best score: {score}/{total}',
    valide: ' — completed ✓',
    valider: 'Submit',
    recommencer: 'Restart',
    chapitreValide: 'chapter completed ✓',
    pasEncoreValide: 'not completed yet',
    relisCorrections: 'Read the corrections above, go back over the topics involved, then try again.'
  }
})

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
    (c.aRelire ? `<span class="badge badge-relire" title="${t('relireTitre')}">${t('relire')}</span>` : '') +
    (c.nonTeste ? `<span class="badge badge-non-teste" title="${t('nonTesteTitre')}">${t('nonTeste')}</span>` : '')
  )
}

function source(c: { source?: string }): string {
  return c.source ? `<p class="contenu-source">${t('source', { source: echapper(c.source) })}</p>` : ''
}

function creerEditeur(el: HTMLElement, value: string, readOnly: boolean): monaco.editor.IStandaloneCodeEditor {
  return monaco.editor.create(el, {
    value,
    language: 'm68k',
    theme: 'm68k-dark',
    fontSize: 14,
    minimap: { enabled: false },
    // Menu du clic droit : celui de l'application (son « Coller » marche, pas celui de Monaco)
    contextmenu: false,
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
      ${chapitre.esquisse ? `<p class="esquisse">${t('esquisse')}</p>` : ''}
      <div class="markdown-body chapitre-resume"></div>
      <h3>${t('auProgramme')}</h3>
      <ul class="liste-notions">
        ${chapitre.notions
          .map((n) => `<li><span class="etat-notion">${icone[etatNotion(n, ctx.progression)]}</span> ${echapper(n.titre)} <small>${t(n.contenus.length > 1 ? 'etapesN' : 'etapes1', { n: n.contenus.length })}</small></li>`)
          .join('')}
        ${chapitre.qcm ? `<li><span class="etat-notion">${d.qcm.reussi ? '●' : '○'}</span> ${t('qcmFin')}</li>` : ''}
        ${d.bonus.total ? `<li class="ligne-bonus">★ ${t(d.bonus.total > 1 ? 'bonusN' : 'bonus1', { n: d.bonus.total })}</li>` : ''}
      </ul>
      ${chapitre.notions.length ? `<button class="btn-principal" id="btn-commencer">${t('commencer')}</button>` : ''}
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
      <div class="ecran-type">📖 ${t('typeCours')} ${badges(cours)}</div>
      <h2>${echapper(cours.titre)}</h2>
      <div class="markdown-body cours-texte"></div>
      ${source(cours)}
      <div class="ecran-actions">
        <button class="btn-principal" id="btn-lu">${lu ? t('continuer') : t('luContinuer')}</button>
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
      <div class="ecran-type">🧪 ${t('typeExemple')} ${badges(ex)}</div>
      <h2>${echapper(ex.titre)}</h2>
      <div class="markdown-body exemple-intro"></div>
      <div class="exemple-zone">
        <div class="exemple-gauche">
          <div class="toolbar-mini">
            <button id="btn-pas" class="btn-principal" disabled>${t('pasSuivant')}</button>
            <button id="btn-tout" disabled>${t('jusquauBout')}</button>
            ${ex.machine?.ecran ? `<button id="btn-temps-reel" disabled title="${t('tempsReelTitre')}">${t('tempsReel')}</button>` : ''}
            <button id="btn-reset">${t('recommencerBtn')}</button>
            <span class="statut" id="statut"></span>
          </div>
          <div class="editeur-exemple" id="editeur"></div>
          <div class="explication" id="explication"></div>
        </div>
        <div class="exemple-droite" id="dbg"></div>
      </div>
      <div class="markdown-body exemple-conclusion" hidden></div>
      ${source(ex)}
      <div class="ecran-actions"><button id="btn-suivant">${t('continuer')}</button></div>
    </div>`
  renderMarkdown(el.querySelector('.exemple-intro')!, ex.introduction)
  const conclusionEl = el.querySelector<HTMLDivElement>('.exemple-conclusion')!
  if (ex.conclusion) renderMarkdown(conclusionEl, ex.conclusion)

  const editor = creerEditeur(el.querySelector('#editeur')!, ex.code, true)
  const dbg = new Debogueur({ ecran: ex.machine?.ecran, machine: machineDe(ctx.plateforme).id })
  el.querySelector('#dbg')!.appendChild(dbg.element)
  const exec = new Execution(editor, dbg, () => platformFor(ctx.plateforme, ex.machine), ex.machine?.memoire, machineDe(ctx.plateforme).id)
  const explicationEl = el.querySelector<HTMLDivElement>('#explication')!
  const statut = el.querySelector<HTMLSpanElement>('#statut')!
  const btnPas = el.querySelector<HTMLButtonElement>('#btn-pas')!
  const btnTout = el.querySelector<HTMLButtonElement>('#btn-tout')!
  const textes = new Map(ex.explications.map((e) => [e.ligne, e.texte]))

  function expliquer(derniere: number | undefined): void {
    const prochaine = exec.ligneCourante()
    const parts: string[] = []
    if (derniere !== undefined && textes.has(derniere)) {
      parts.push(`<p><strong>${t('ligneExpliquee', { ligne: derniere })}</strong> ${textes.get(derniere)}</p>`)
    }
    if (prochaine !== undefined && !exec.cpu?.halted) {
      const ligne = editor.getModel()?.getLineContent(prochaine).trim() ?? ''
      parts.push(`<p class="prochaine">${t('prochaine', { ligne: prochaine })} <code>${echapper(ligne)}</code></p>`)
    }
    explicationEl.innerHTML = parts.join('') || `<p>${t('cliquePas')}</p>`
  }

  function fin(error?: string): void {
    btnPas.disabled = true
    btnTout.disabled = true
    statut.textContent = error ? t('arretException') : t('termineOk')
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
    statut.textContent = res.success ? '' : t('erreurContenu')
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
    if (exec.arreteSurPoint && !effects?.error) statut.textContent = t('pointArret')
    else fin(effects?.error)
  })
  const btnTempsReel = el.querySelector<HTMLButtonElement>('#btn-temps-reel')
  btnTempsReel?.addEventListener('click', () => {
    if (exec.enTempsReel) return exec.arreter()
    btnTempsReel.textContent = t('arreterBtn')
    btnPas.disabled = true
    btnTout.disabled = true
    statut.textContent = t('tempsReelEnCours')
    exec.tempsReel((raison, effects) => {
      btnTempsReel.textContent = t('tempsReel')
      if (raison === 'arret' || raison === 'point') {
        btnPas.disabled = false
        btnTout.disabled = false
        statut.textContent = raison === 'point' ? t('pointArret') : t('arrete')
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
        ${ex.bonus ? `<span class="badge badge-bonus">${t('defiBonus')}</span>` : `✏️ ${t('typeExercice')}`}
        <span class="badge badge-variante">${t(`variante-${ex.variante}`)}</span>
        <span class="niveau" title="${t('niveauTitre', { n: ex.niveau })}">${t('niveau', { niveau })}</span>
        ${reussi ? `<span class="badge badge-ok">${t('reussiBadge')}</span>` : ''}
        ${badges(ex)}
      </div>
      <h2>${echapper(ex.titre)}</h2>
      <div class="markdown-body exercice-enonce"></div>
      <div class="exercice-zone">
        <div class="exercice-gauche">
          ${ordonner ? '<div class="ordonner" id="ordonner"></div>' : '<div class="editeur-exercice" id="editeur"></div>'}
          <div class="toolbar-mini">
            <button class="btn-principal" id="btn-verifier">${t('verifier')}</button>
            <button id="btn-pas-a-pas">${t('pasAPas')}</button>
            <button id="btn-indice">${t('indice', { vus: 0, total: ex.indices.length })}</button>
            <button id="btn-solution" disabled title="${t('solutionTitre')}">${t('voirSolution')}</button>
            ${ordonner ? '' : `<button id="btn-reinit" title="${t('reinitTitre')}">↺</button>`}
            <button id="btn-prg" ${reussi ? '' : 'hidden'} title="${machineDe(ctx.plateforme).export.titre}">${machineDe(ctx.plateforme).export.bouton}</button>
            <button id="btn-essayer" ${reussi ? '' : 'hidden'} title="${t('essayerTitre')}">${t('essayer', { emulateur: ctx.plateforme === 'amiga' ? 'WinUAE' : 'Hatari' })}</button>
          </div>
          <p class="export-prg" id="export-prg" hidden></p>
          <ul class="indices" id="indices"></ul>
          <div class="verdict" id="verdict" hidden></div>
        </div>
        <div class="exercice-droite" id="panneau-dbg" hidden>
          <div class="toolbar-mini">
            <button id="dbg-pas" class="btn-principal">${t('pas')}</button>
            <button id="dbg-tout">${t('jusquauBout')}</button>
            ${ex.machine?.ecran ? `<button id="dbg-temps-reel" title="${t('tempsReelTitre')}">${t('tempsReel')}</button>` : ''}
            <button id="dbg-reset">↺</button>
            <button id="dbg-fermer" title="${t('fermerPasAPas')}">✕</button>
            <span class="statut" id="dbg-statut"></span>
          </div>
          <div id="dbg"></div>
        </div>
      </div>
      ${source(ex)}
      <div class="ecran-actions"><button id="btn-suivant">${ex.bonus ? t('continuer') : t('passerSuite')}</button></div>
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
      row.innerHTML = `<button title="${t('monter')}" ${i === 0 ? 'disabled' : ''}>▲</button><button title="${t('descendre')}" ${i === ordre.length - 1 ? 'disabled' : ''}>▼</button>`
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
    btnIndice.textContent = t('indice', { vus: indicesVus, total: ex.indices.length })
    majSolution()
  })
  majSolution()
  // La solution s'ouvre et se referme (« lis-la, puis ferme-la »)
  let blocSolution: HTMLDivElement | null = null
  btnSolution.addEventListener('click', () => {
    if (blocSolution) {
      blocSolution.remove()
      blocSolution = null
      btnSolution.textContent = t('voirSolution')
      return
    }
    blocSolution = document.createElement('div')
    blocSolution.className = 'solution'
    blocSolution.innerHTML = `<h4>${t('solutionPossible')}</h4><p>${t('solutionConseil')}</p>`
    blocSolution.appendChild(blocCode(ex.solution || t('solutionAbsente')))
    const fermer = document.createElement('button')
    fermer.textContent = t('masquerSolution')
    fermer.addEventListener('click', () => btnSolution.click())
    blocSolution.appendChild(fermer)
    indicesEl.after(blocSolution)
    btnSolution.textContent = t('masquerSolution')
  })

  // Vérification
  const verdictEl = el.querySelector<HTMLDivElement>('#verdict')!
  // Export .PRG, proposé une fois l'exercice réussi
  const btnPrg = el.querySelector<HTMLButtonElement>('#btn-prg')!
  const exportEl = el.querySelector<HTMLParagraphElement>('#export-prg')!
  btnPrg.addEventListener('click', () => {
    void exporterPrg(sourceActuel(), ex.id.split('-').pop() ?? ex.id, ctx.plateforme).then((r) => {
      exportEl.hidden = false
      exportEl.textContent = r.message
    })
  })
  const btnEssayer = el.querySelector<HTMLButtonElement>('#btn-essayer')!
  btnEssayer.addEventListener('click', () => {
    void essayerDansEmulateur(sourceActuel(), ex.id.split('-').pop() ?? ex.id, ctx.plateforme, undefined, (fin) => {
      exportEl.textContent = fin
    }).then((r) => {
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
      verdictEl.textContent = t('verification')
      try {
        const v = await verifierExercice(sourceActuel(), ex, ctx.plateforme)
        essais++
        verdictEl.className = 'verdict ' + (v.success ? 'verdict-ok' : 'verdict-ko')
        verdictEl.innerHTML =
          `<p class="verdict-titre">${v.success ? (ex.bonus ? t('defiReleve') : t('reussi')) : t('pasEncore')}</p>` +
          `<pre>${echapper(v.message)}</pre>` +
          (v.pistes.length ? `<div class="pistes"><strong>${t('pourDeboguer')}</strong><ul>${v.pistes.map((p) => `<li>${echapper(p)}</li>`).join('')}</ul></div>` : '')
        if (v.success) btnPrg.hidden = btnEssayer.hidden = false
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
  const dbg = new Debogueur({ ecran: ex.machine?.ecran, machine: machineDe(ctx.plateforme).id })
  el.querySelector('#dbg')!.appendChild(dbg.element)
  // Une seule exécution par éditeur : en recréer une à chaque clic laissait l'ancienne surligner
  // sa ligne et basculer les points d'arrêt en double.
  let exec: Execution | null = null
  let editeurPasAPas: monaco.editor.IStandaloneCodeEditor | null = null
  /** Faux quand le code a changé depuis le dernier assemblage du pas à pas. */
  let aJour = false
  async function preparerPasAPas(): Promise<void> {
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
    exec ??= new Execution(cible, dbg, () => platformFor(ctx.plateforme, ex.machine), ex.machine?.memoire, machineDe(ctx.plateforme).id)
    exec.arreter()
    const res = await exec.assembler(sourceActuel())
    aJour = true
    if (res.success) dbgStatut.textContent = t('pretPasAPas')
    else {
      // L'erreur en clair, sans avoir à survoler la ligne soulignée
      const e = res.errors[0]
      const autres = res.errors.length > 1 ? t(res.errors.length > 2 ? 'autreN' : 'autre1', { n: res.errors.length - 1 }) : ''
      dbgStatut.textContent = e ? t('erreurLigne', { ligne: e.line, message: e.message, autres }) : t('erreurAssemblage')
    }
  }
  editor?.onDidChangeModelContent(() => {
    if (!exec || !aJour) return
    aJour = false
    exec.arreter()
    exec.surligner(undefined)
    dbgStatut.textContent = t('codeModifie')
  })
  el.querySelector('#btn-pas-a-pas')!.addEventListener('click', () => void preparerPasAPas())
  /** Lance une action du débogueur, après avoir réassemblé si le code a changé. */
  const agir = (action: (e: Execution) => ReturnType<Execution['pas']>): void => {
    void (async () => {
      if (!exec || !aJour) {
        await preparerPasAPas()
        return
      }
      apres(action(exec))
    })()
  }
  const apres = (effects: ReturnType<Execution['pas']>): void => {
    if (effects?.error) dbgStatut.textContent = effects.error
    else if (exec?.arreteSurPoint) dbgStatut.textContent = t('pointArret')
    else if (effects?.halted) dbgStatut.textContent = t('programmeTermine')
  }
  el.querySelector('#dbg-pas')!.addEventListener('click', () => agir((e) => e.pas()))
  el.querySelector('#dbg-tout')!.addEventListener('click', () => agir((e) => e.toutExecuter(ex.check.maxSteps)))
  const dbgTempsReel = el.querySelector<HTMLButtonElement>('#dbg-temps-reel')
  dbgTempsReel?.addEventListener('click', () => {
    if (!exec || !aJour) return void preparerPasAPas()
    if (exec.enTempsReel) return exec.arreter()
    dbgTempsReel.textContent = t('arreterBtn')
    dbgStatut.textContent = t('tempsReelEnCours')
    exec.tempsReel((raison, effects) => {
      dbgTempsReel.textContent = t('tempsReel')
      if (raison === 'arret') dbgStatut.textContent = t('arrete')
      else apres(effects)
      if (raison === 'point') dbgStatut.textContent = t('pointArret')
    })
  })
  el.querySelector('#dbg-reset')!.addEventListener('click', () => {
    exec?.reinitialiser()
    dbgStatut.textContent = t('recommence')
  })
  el.querySelector('#dbg-fermer')!.addEventListener('click', () => {
    panneau.hidden = true
    exec?.surligner(undefined)
  })
  el.querySelector('#btn-reinit')?.addEventListener('click', () => {
    if (!editor) return
    void confirmer(t('confirmerReinit'), t('revenirDepart')).then((oui) => {
      if (oui) editor!.setValue(ex.codeDepart)
    })
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
    renderMarkdown(corr, `${ok ? t('juste') : t('bonneReponse', { reponse: q.choix[q.bonne] })} ${q.explication}`)
  })
}

export function ecranPrediction(el: HTMLElement, pred: ContenuPrediction, ctx: ContexteEcran): Nettoyage {
  el.innerHTML = `
    <div class="ecran ecran-prediction">
      <div class="ecran-type">🔮 ${t('typePrediction')} ${badges(pred)}</div>
      <h2>${echapper(pred.titre)}</h2>
      <div class="markdown-body prediction-intro"></div>
      <div class="prediction-zone">
        <div class="prediction-gauche">
          <div class="editeur-exemple" id="editeur"></div>
          <div class="questions" id="questions"></div>
          <div class="ecran-actions">
            <button class="btn-principal" id="btn-valider">${t('validerReponses')}</button>
            <button id="btn-executer" disabled>${t('verifierExecutant')}</button>
          </div>
        </div>
        <div class="prediction-droite" id="dbg" hidden></div>
      </div>
      ${source(pred)}
      <div class="ecran-actions"><button id="btn-suivant">${t('continuer')}</button></div>
    </div>`
  renderMarkdown(el.querySelector('.prediction-intro')!, pred.introduction)
  const editor = creerEditeur(el.querySelector('#editeur')!, pred.code, true)
  const questionsEl = el.querySelector<HTMLDivElement>('#questions')!
  renderQuestions(questionsEl, pred.questions, pred.id)
  const btnExecuter = el.querySelector<HTMLButtonElement>('#btn-executer')!
  el.querySelector('#btn-valider')!.addEventListener('click', () => {
    const reponses = lireReponses(questionsEl, pred.questions, pred.id)
    if (reponses.some((r) => r === undefined)) {
      void informer(t('repondreTout'))
      return
    }
    corrigerQuestions(questionsEl, pred.questions, reponses)
    btnExecuter.disabled = false
    if (marquerVu(pred.id)) ctx.progressionChangee()
  })
  const dbgEl = el.querySelector<HTMLDivElement>('#dbg')!
  // Créés une seule fois : un second clic réutilise le même débogueur et la même exécution
  const dbg = new Debogueur({ ecran: pred.machine?.ecran, machine: machineDe(ctx.plateforme).id })
  const exec = new Execution(editor, dbg, () => platformFor(ctx.plateforme, pred.machine), pred.machine?.memoire, machineDe(ctx.plateforme).id)
  btnExecuter.addEventListener('click', () => {
    void (async () => {
      dbgEl.hidden = false
      dbgEl.innerHTML = ''
      dbgEl.appendChild(dbg.element)
      const res = await exec.assembler(pred.code)
      if (!res.success) return
      const effects = exec.toutExecuter(100000)
      const bilan = document.createElement('p')
      bilan.className = effects?.error ? 'verdict verdict-ko' : 'verdict verdict-ok'
      bilan.textContent = effects?.error ?? t('executeBout')
      dbgEl.prepend(bilan)
    })()
  })
  el.querySelector('#btn-suivant')!.addEventListener('click', () => ctx.suivant())
  return () => {
    exec.arreter()
    editor.dispose()
  }
}

export function ecranQcm(el: HTMLElement, chapitre: Chapitre, ctx: ContexteEcran): Nettoyage {
  const qcm = chapitre.qcm!
  const seuil = qcm.seuil ?? SEUIL_QCM_DEFAUT
  const resultat = ctx.progression.qcm?.[qcm.id]
  el.innerHTML = `
    <div class="ecran ecran-qcm">
      <div class="ecran-type">❓ ${t('qcmFin')}</div>
      <h2>${t('qcmTitre', { titre: echapper(chapitre.titre) })}</h2>
      <p>${t('qcmConsigne', { n: qcm.questions.length, bonnes: Math.ceil(seuil * qcm.questions.length), pourcent: Math.round(seuil * 100) })}
      ${resultat ? `<br><strong>${t('meilleurScore', { score: resultat.meilleurScore, total: resultat.total })}${resultat.reussi ? t('valide') : ''}</strong>` : ''}</p>
      <div class="questions" id="questions"></div>
      <div class="verdict" id="verdict" hidden></div>
      <div class="ecran-actions">
        <button class="btn-principal" id="btn-valider">${t('valider')}</button>
        <button id="btn-recommencer" hidden>${t('recommencer')}</button>
        <button id="btn-suivant">${t('continuer')}</button>
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
    verdictEl.innerHTML = `<p class="verdict-titre">${r.score}/${r.total} — ${r.reussi ? t('chapitreValide') : t('pasEncoreValide')}</p>${
      r.reussi ? '' : `<p>${t('relisCorrections')}</p>`

    }`
    btnValider.hidden = true
    btnRecommencer.hidden = false
    verdictEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
  })
  btnRecommencer.addEventListener('click', afficher)
  el.querySelector('#btn-suivant')!.addEventListener('click', () => ctx.suivant())
  return () => {}
}
