/**
 * « Exporter pour Hatari / un vrai ST » (.PRG) ou « pour l'Amiga » (exécutable AmigaDOS) : le
 * processus principal assemble le source en programme relogeable (avec les fichiers d'INCLUDE et
 * d'INCBIN), puis propose de l'enregistrer.
 */
import type { Plateforme } from '../../shared/parcours'
import { machineDe } from '../../shared/machines'

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

export async function exporterPrg(source: string, nom: string, plateforme: Plateforme = 'atari', dossier?: string): Promise<ResultatExport> {
  if (machineDe(plateforme).export.format === 'hunk') return exporterAmiga(source, nom, dossier)
  const prg = await window.api.fabriquerPrg(source, 'prg', dossier)
  if (!prg.octets) return { ok: false, message: prg.raison ?? 'Export impossible.' }
  const enregistre = await window.api.enregistrerPrg(prg.octets, nomTos(nom))
  if (!enregistre.ok) return { ok: false, message: 'Export annulé.' }
  // Sur un vrai ST, un programme rend la main au bureau par GEMDOS Pterm0 (TRAP #1), pas par RTS
  const conseil = /\btrap\s+#1\b/i.test(source)
    ? ''
    : '\nAstuce : sur un vrai ST, termine le programme par CLR.W -(SP) puis TRAP #1 (Pterm0) pour revenir proprement au bureau.'
  return { ok: true, message: `Programme enregistré : ${enregistre.chemin}${conseil}` }
}

/** Nom de fichier AmigaDOS : jusqu'à 30 caractères, sans espace ni « : » ou « / ». */
function nomAmiga(nom: string): string {
  const propre = nom
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9_-]/g, '')
    .slice(0, 30)
  return propre || 'programme'
}

async function exporterAmiga(source: string, nom: string, dossier?: string): Promise<ResultatExport> {
  const exe = await window.api.fabriquerPrg(source, 'hunk', dossier)
  if (!exe.octets) return { ok: false, message: exe.raison ?? 'Export impossible.' }
  const enregistre = await window.api.enregistrerPrg(exe.octets, nomAmiga(nom), 'hunk')
  if (!enregistre.ok) return { ok: false, message: 'Export annulé.' }
  const conseils = ['\nOn peut le lancer depuis le Shell (CLI) ou par une icône : sa sortie s’affiche alors dans une fenêtre console.']
  // Les données lues par les puces doivent être en Chip RAM sur une machine qui a de la Fast RAM
  if (/\$?dff[0-9a-f]{3}|\$dff000/i.test(source) && !/_C\b/i.test(source)) {
    conseils.push('Astuce : sur un Amiga avec de la Fast RAM, mets les listes Copper, images et sons dans une « SECTION nom,DATA_C » (Chip RAM).')
  }
  return { ok: true, message: `Programme enregistré : ${enregistre.chemin}${conseils.join('\n')}` }
}

/**
 * « Essayer dans Hatari / WinUAE » : le programme est assemblé, déposé dans le dossier de partage
 * (Documents\68k Trainer\Atari ou Amiga) et lancé au démarrage de l'émulateur.
 */
export async function essayerDansEmulateur(source: string, nom: string, plateforme: Plateforme = 'atari', dossier?: string): Promise<ResultatExport> {
  const id = plateforme === 'amiga' ? 'winuae' : 'hatari'
  const etat = (await window.api.emulateursEtat()).find((e) => e.id === id)
  if (etat && !etat.disponible) {
    return {
      ok: false,
      message: `L'essai automatique dans ${etat.nom} n'existe que sous Windows pour l'instant : exporte ton programme (bouton Exporter) et lance-le dans ton émulateur.`
    }
  }
  if (!etat?.installe) {
    return { ok: false, message: `${etat?.nom ?? id} n'est pas installé : installe-le depuis l'onglet « Émulateurs ».` }
  }
  const r = await window.api.emulateurEssayer(id, source, plateforme === 'amiga' ? nomAmiga(nom) : nomTos(nom), dossier)
  if (!r.ok) return { ok: false, message: r.erreur ?? 'Essai impossible.' }
  return {
    ok: true,
    message:
      plateforme === 'amiga'
        ? `${etat.nom} (re)démarre et lance ${r.chemin} dès que le bureau d'AROS est prêt (une vingtaine de secondes).`
        : `${etat.nom} (re)démarre et lance ${r.chemin} dès que le bureau d'EmuTOS est prêt.`
  }
}
