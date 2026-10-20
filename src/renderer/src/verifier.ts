import { evaluateCheck } from '../../shared/checkResult'
import type { ContenuExercice, Plateforme } from '../../shared/parcours'
import { platformFor, runBinary } from '../../shared/runProgram'
import { materielAmiga } from '../../platforms/amiga/chipset'

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
    pistes.push(
      `Hypothèse : à quel moment ${regs.join(', ')} prend-il une valeur inattendue ? Lance « Pas à pas » et observe ${regs.length > 1 ? 'ces registres' : 'ce registre'} (il s'allume en jaune quand il change).`
    )
    pistes.push('Vérifie la taille (.B, .W, .L) : une opération .W ne modifie que les 16 bits de poids faible.')
  } else if (ex.check.type === 'memory') {
    pistes.push('Mets l\'adresse attendue dans la vue « Mémoire » du pas à pas et regarde quand elle est écrite (les octets écrits s\'allument).')
  } else if (ex.check.type === 'output') {
    pistes.push('Compare caractère par caractère la sortie obtenue et la sortie attendue (espaces, majuscules, retour à la ligne 13,10).')
    pistes.push('Après un TRAP, la pile a-t-elle été nettoyée (ADDQ.L / LEA) du bon nombre d\'octets ?')
  } else if (ex.check.type === 'pixels') {
    pistes.push('Regarde l\'écran dans le pas à pas : le point est-il au bon endroit ? Vérifie le calcul d\'adresse (Y × 160 + (X / 16) × 8).')
  } else if (ex.check.type === 'image') {
    pistes.push('Lance « Temps réel » et regarde l\'écran : la couleur change-t-elle à la bonne ligne ? Ouvre « Vecteurs et matériel » pour voir COP1LC, DMACON et les couleurs.')
    pistes.push('Une liste Copper se termine par DC.W $FFFF,$FFFE ; un WAIT s\'écrit DC.W $vvhh,$FFFE (ligne vv, position hh impaire).')
  } else if (ex.check.type === 'custom') {
    pistes.push('Un registre custom s\'écrit à $DFF000 + son décalage (COLOR00 = $DFF180). Ouvre « Vecteurs et matériel » pour voir ce que les puces ont reçu.')
  }
  if (ex.check.systemeRendu) pistes.push('Avant RTS, rends tout au système : Permit, Enable, FreeMem, DMACON et INTENA d\'origine (avec le bit 15), liste Copper du système dans COP1LC.')
  if (/bombe|Guru/.test(message)) pistes.unshift('Le programme a planté : regarde la ligne surlignée au moment de l\'arrêt, c\'est elle qui a provoqué l\'exception.')
  return pistes
}

/** Assemble la proposition, l'exécute sur la machine simulée et la compare au résultat attendu. */
export async function verifierExercice(source: string, ex: ContenuExercice, plateforme: Plateforme): Promise<Verdict> {
  const asm = await window.api.assemble(source)
  if (!asm.success) {
    const lignes = asm.errors.map((e) => (e.line > 0 ? `Ligne ${e.line} : ${e.message}` : e.message))
    return {
      success: false,
      message: "Le programme ne s'assemble pas.\n" + lignes.join('\n'),
      pistes: ['Erreur de syntaxe : corrige d\'abord la ligne indiquée (elle est soulignée en rouge dans l\'éditeur).']
    }
  }
  const { cpu, last } = runBinary(asm.binary!, asm.baseAddress ?? 0, platformFor(plateforme, ex.machine, ex.check), ex.check.maxSteps)
  const result = evaluateCheck(cpu, ex.check)
  // Remarques de la machine (Amiga : WaitBlit oublié, Copper arrêté…)
  const alertes = materielAmiga(cpu)?.alertes ?? []
  const remarques = alertes.length ? '\n\nRemarques :\n' + alertes.map((a) => '⚠ ' + a).join('\n') : ''
  // Un programme qui plante n'est jamais réussi, même si les registres sont justes
  if (result.success && !last.error) return { success: true, message: result.message + remarques, pistes: [] }
  const message =
    (last.error
      ? `Le programme ne s'est pas terminé proprement.\n${last.error}${result.success ? '' : '\n\n' + result.message}`
      : result.message) + remarques
  return { success: false, message, pistes: pistesPour(ex, message) }
}
