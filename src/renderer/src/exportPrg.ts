/**
 * « Exporter pour Hatari / un vrai ST » : le processus principal assemble le source en .PRG
 * relogeable (avec les fichiers d'INCLUDE et d'INCBIN), puis propose de l'enregistrer.
 */

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
  const prg = await window.api.fabriquerPrg(source)
  if (!prg.octets) return { ok: false, message: prg.raison ?? 'Export impossible.' }
  const enregistre = await window.api.enregistrerPrg(prg.octets, nomTos(nom))
  if (!enregistre.ok) return { ok: false, message: 'Export annulé.' }
  // Sur un vrai ST, un programme rend la main au bureau par GEMDOS Pterm0 (TRAP #1), pas par RTS
  const conseil = /\btrap\s+#1\b/i.test(source)
    ? ''
    : '\nAstuce : sur un vrai ST, termine le programme par CLR.W -(SP) puis TRAP #1 (Pterm0) pour revenir proprement au bureau.'
  return { ok: true, message: `Programme enregistré : ${enregistre.chemin}${conseil}` }
}
