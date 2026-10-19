/**
 * « Exporter pour Hatari / un vrai ST » : assemble le source avec l'assembleur maison en .PRG
 * relogeable et propose de l'enregistrer.
 */
import { assembler } from '../../asm/assembleur'
import { creerPrg, empechementPrg } from '../../asm/prg'

export interface ResultatExport {
  ok: boolean
  message: string
}

/** Nom de fichier TOS : 8 caractères, lettres et chiffres. */
function nomTos(nom: string): string {
  const propre = nom
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase()
    .slice(0, 8)
  return propre || 'PROGRAM'
}

export async function exporterPrg(source: string, nom: string): Promise<ResultatExport> {
  const r = assembler(source, { prg: true })
  const raison = empechementPrg(r)
  if (raison) {
    const premiere = r.erreurs[0]
    return { ok: false, message: premiere ? `${raison}\nLigne ${premiere.ligne} : ${premiere.message}` : raison }
  }
  const enregistre = await window.api.enregistrerPrg(creerPrg(r), nomTos(nom))
  if (!enregistre.ok) return { ok: false, message: 'Export annulé.' }
  // Sur un vrai ST, un programme rend la main au bureau par GEMDOS Pterm0 (TRAP #1), pas par RTS
  const conseil = /\btrap\s+#1\b/i.test(source)
    ? ''
    : '\nAstuce : sur un vrai ST, termine le programme par CLR.W -(SP) puis TRAP #1 (Pterm0) pour revenir proprement au bureau.'
  return { ok: true, message: `Programme enregistré : ${enregistre.chemin}${conseil}` }
}
