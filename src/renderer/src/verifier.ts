import { evaluateCheck } from '../../shared/checkResult'
import type { ContenuExercice, Plateforme } from '../../shared/parcours'
import { platformFor, runBinary } from '../../shared/runProgram'
import { materielAmiga } from '../../platforms/amiga/chipset'
import { traducteur } from './langue'

const t = traducteur({
  fr: {
    hypotheseUn:
      "Hypothèse : à quel moment {regs} prend-il une valeur inattendue ? Lance « Pas à pas » et observe ce registre (il s'allume en jaune quand il change).",
    hypothesePlusieurs:
      "Hypothèse : à quel moment {regs} prend-il une valeur inattendue ? Lance « Pas à pas » et observe ces registres (il s'allume en jaune quand il change).",
    taille: 'Vérifie la taille (.B, .W, .L) : une opération .W ne modifie que les 16 bits de poids faible.',
    memoire: "Mets l'adresse attendue dans la vue « Mémoire » du pas à pas et regarde quand elle est écrite (les octets écrits s'allument).",
    sortie: 'Compare caractère par caractère la sortie obtenue et la sortie attendue (espaces, majuscules, retour à la ligne 13,10).',
    pile: "Après un TRAP, la pile a-t-elle été nettoyée (ADDQ.L / LEA) du bon nombre d'octets ?",
    pixels: "Regarde l'écran dans le pas à pas : le point est-il au bon endroit ? Vérifie le calcul d'adresse (Y × 160 + (X / 16) × 8).",
    image: "Lance « Temps réel » et regarde l'écran : la couleur change-t-elle à la bonne ligne ? Ouvre « Vecteurs et matériel » pour voir COP1LC, DMACON et les couleurs.",
    copper: "Une liste Copper se termine par DC.W $FFFF,$FFFE ; un WAIT s'écrit DC.W $vvhh,$FFFE (ligne vv, position hh impaire).",
    custom: "Un registre custom s'écrit à $DFF000 + son décalage (COLOR00 = $DFF180). Ouvre « Vecteurs et matériel » pour voir ce que les puces ont reçu.",
    systemeRendu:
      "Avant RTS, rends tout au système : Permit, Enable, FreeMem, DMACON et INTENA d'origine (avec le bit 15), liste Copper du système dans COP1LC.",
    plante: "Le programme a planté : regarde la ligne surlignée au moment de l'arrêt, c'est elle qui a provoqué l'exception.",
    ligne: 'Ligne {ligne} : {message}',
    neSAssemblePas: "Le programme ne s'assemble pas.",
    syntaxe: "Erreur de syntaxe : corrige d'abord la ligne indiquée (elle est soulignée en rouge dans l'éditeur).",
    remarques: 'Remarques :',
    pasTermine: "Le programme ne s'est pas terminé proprement."
  },
  en: {
    hypotheseUn:
      'Hypothesis: at what point does {regs} take an unexpected value? Run “Step by step” and watch this register (it lights up in yellow when it changes).',
    hypothesePlusieurs:
      'Hypothesis: at what point does one of {regs} take an unexpected value? Run “Step by step” and watch these registers (each one lights up in yellow when it changes).',
    taille: 'Check the size (.B, .W, .L): a .W operation only changes the low-order 16 bits.',
    memoire: 'Put the expected address in the “Memory” view of the step-by-step mode and watch when it is written (the bytes written light up).',
    sortie: 'Compare the output you got with the expected output character by character (spaces, capitals, line break 13,10).',
    pile: 'After a TRAP, was the stack cleaned up (ADDQ.L / LEA) by the right number of bytes?',
    pixels: 'Look at the screen in step-by-step mode: is the dot in the right place? Check the address calculation (Y × 160 + (X / 16) × 8).',
    image: 'Run “Real time” and look at the screen: does the color change on the right line? Open “Vectors and hardware” to see COP1LC, DMACON and the colors.',
    copper: 'A copper list ends with DC.W $FFFF,$FFFE; a WAIT is written DC.W $vvhh,$FFFE (line vv, odd position hh).',
    custom: 'A custom register is written at $DFF000 + its offset (COLOR00 = $DFF180). Open “Vectors and hardware” to see what the chips received.',
    systemeRendu:
      'Before RTS, give everything back to the system: Permit, Enable, FreeMem, the original DMACON and INTENA (with bit 15), and the system copper list in COP1LC.',
    plante: 'The program crashed: look at the line highlighted when it stopped, it is the one that caused the exception.',
    ligne: 'Line {ligne}: {message}',
    neSAssemblePas: 'The program does not assemble.',
    syntaxe: 'Syntax error: first fix the line shown (it is underlined in red in the editor).',
    remarques: 'Notes:',
    pasTermine: 'The program did not end cleanly.'
  }
})

export interface Verdict {
  success: boolean
  message: string
  /** Pistes de débogage guidé quand ça ne marche pas. */
  pistes: string[]
}

/** Source complet d'un exercice « remettre dans l'ordre » à partir de l'ordre choisi. */
export function sourceOrdonne(ex: ContenuExercice, ordre: string[]): string {
  return [ex.entete ?? '', ...ordre, ex.pied ?? ''].join('\n')
}

function pistesPour(ex: ContenuExercice, message: string): string[] {
  const pistes: string[] = []
  const regs = Object.keys(ex.check.expected)
  if (ex.check.type === 'registers') {
    pistes.push(t(regs.length > 1 ? 'hypothesePlusieurs' : 'hypotheseUn', { regs: regs.join(', ') }))
    pistes.push(t('taille'))
  } else if (ex.check.type === 'memory') {
    pistes.push(t('memoire'))
  } else if (ex.check.type === 'output') {
    pistes.push(t('sortie'))
    pistes.push(t('pile'))
  } else if (ex.check.type === 'pixels') {
    pistes.push(t('pixels'))
  } else if (ex.check.type === 'image') {
    pistes.push(t('image'))
    pistes.push(t('copper'))
  } else if (ex.check.type === 'custom') {
    pistes.push(t('custom'))
  }
  if (ex.check.systemeRendu) pistes.push(t('systemeRendu'))
  // Message du simulateur (en français) : « bombes » sur l'Atari, Guru Meditation sur l'Amiga
  if (/bombe|Guru/.test(message)) pistes.unshift(t('plante'))
  return pistes
}

/** Assemble la proposition, l'exécute sur la machine simulée et la compare au résultat attendu. */
export async function verifierExercice(source: string, ex: ContenuExercice, plateforme: Plateforme): Promise<Verdict> {
  const asm = await window.api.assemble(source)
  if (!asm.success) {
    const lignes = asm.errors.map((e) => (e.line > 0 ? t('ligne', { ligne: e.line, message: e.message }) : e.message))
    return {
      success: false,
      message: t('neSAssemblePas') + '\n' + lignes.join('\n'),
      pistes: [t('syntaxe')]
    }
  }
  const { cpu, last } = runBinary(asm.binary!, asm.baseAddress ?? 0, platformFor(plateforme, ex.machine, ex.check), ex.check.maxSteps)
  const result = evaluateCheck(cpu, ex.check)
  // Remarques de la machine (Amiga : WaitBlit oublié, Copper arrêté…)
  const alertes = materielAmiga(cpu)?.alertes ?? []
  const remarques = alertes.length ? '\n\n' + t('remarques') + '\n' + alertes.map((a) => '⚠ ' + a).join('\n') : ''
  // Un programme qui plante n'est jamais réussi, même si les registres sont justes
  if (result.success && !last.error) return { success: true, message: result.message + remarques, pistes: [] }
  const message =
    (last.error
      ? `${t('pasTermine')}\n${last.error}${result.success ? '' : '\n\n' + result.message}`
      : result.message) + remarques
  return { success: false, message, pistes: pistesPour(ex, message) }
}
