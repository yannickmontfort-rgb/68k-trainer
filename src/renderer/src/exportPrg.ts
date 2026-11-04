/**
 * « Exporter pour Hatari / un vrai ST » (.PRG) ou « pour l'Amiga » (exécutable AmigaDOS) : le
 * processus principal assemble le source en programme relogeable (avec les fichiers d'INCLUDE et
 * d'INCBIN), puis propose de l'enregistrer.
 */
import type { Plateforme } from '../../shared/parcours'
import { machineDe } from '../../shared/machines'
import { traducteur } from './langue'

const t = traducteur({
  fr: {
    exportImpossible: 'Export impossible.',
    exportAnnule: 'Export annulé.',
    astuceSt: '\nAstuce : sur un vrai ST, termine le programme par CLR.W -(SP) puis TRAP #1 (Pterm0) pour revenir proprement au bureau.',
    enregistre: 'Programme enregistré : {chemin}{conseil}',
    lancerAmiga: '\nOn peut le lancer depuis le Shell (CLI) ou par une icône : sa sortie s’affiche alors dans une fenêtre console.',
    astuceChip: 'Astuce : sur un Amiga avec de la Fast RAM, mets les listes Copper, images et sons dans une « SECTION nom,DATA_C » (Chip RAM).',
    aAffiche: '\nIl a affiché :\n{sortie}',
    fin: 'Programme terminé, code de retour {code}.{texte}',
    windowsSeulement: "L'essai automatique dans {nom} n'existe que sous Windows pour l'instant : exporte ton programme (bouton Exporter) et lance-le dans ton émulateur.",
    pasInstalle: "{nom} n'est pas installé : installe-le depuis l'onglet « Émulateurs ».",
    essaiImpossible: 'Essai impossible.',
    manuel: '{nom} (re)démarre sur ta disquette Workbench. Ouvre un Shell et tape PARTAGE:{fichier} pour lancer ton programme.',
    lanceAmiga: '{nom} (re)démarre et lance {chemin} dès que {systeme} est prêt (une vingtaine de secondes).',
    bureauAros: "le bureau d'AROS",
    shellKickstart: 'le Shell du Kickstart',
    lanceAtari: '{nom} (re)démarre et lance {chemin} dès que le bureau {systeme} est prêt.',
    duTos: 'du TOS',
    dEmutos: "d'EmuTOS"
  },
  en: {
    exportImpossible: 'Export failed.',
    exportAnnule: 'Export cancelled.',
    astuceSt: '\nTip: on a real ST, end the program with CLR.W -(SP) then TRAP #1 (Pterm0) to return cleanly to the desktop.',
    enregistre: 'Program saved: {chemin}{conseil}',
    lancerAmiga: '\nYou can run it from the Shell (CLI) or from an icon: its output then appears in a console window.',
    astuceChip: 'Tip: on an Amiga with Fast RAM, put copper lists, images and sounds in a “SECTION name,DATA_C” (Chip RAM).',
    aAffiche: '\nIt printed:\n{sortie}',
    fin: 'Program finished, return code {code}.{texte}',
    windowsSeulement: 'Automatic test runs in {nom} are only available on Windows for now: export your program (Export button) and run it in your emulator.',
    pasInstalle: '{nom} is not installed: install it from the “Emulators” tab.',
    essaiImpossible: 'Test run failed.',
    manuel: '{nom} is (re)starting on your Workbench disk. Open a Shell and type PARTAGE:{fichier} to run your program.',
    lanceAmiga: '{nom} is (re)starting and will run {chemin} as soon as {systeme} is ready (about twenty seconds).',
    bureauAros: 'the AROS desktop',
    shellKickstart: 'the Kickstart Shell',
    lanceAtari: '{nom} is (re)starting and will run {chemin} as soon as the {systeme} desktop is ready.',
    duTos: 'TOS',
    dEmutos: 'EmuTOS'
  }
})

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
  if (!prg.octets) return { ok: false, message: prg.raison ?? t('exportImpossible') }
  const enregistre = await window.api.enregistrerPrg(prg.octets, nomTos(nom))
  if (!enregistre.ok) return { ok: false, message: t('exportAnnule') }
  // Sur un vrai ST, un programme rend la main au bureau par GEMDOS Pterm0 (TRAP #1), pas par RTS
  const conseil = /\btrap\s+#1\b/i.test(source)
    ? ''
    : t('astuceSt')
  return { ok: true, message: t('enregistre', { chemin: enregistre.chemin ?? '', conseil }) }
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
  if (!exe.octets) return { ok: false, message: exe.raison ?? t('exportImpossible') }
  const enregistre = await window.api.enregistrerPrg(exe.octets, nomAmiga(nom), 'hunk')
  if (!enregistre.ok) return { ok: false, message: t('exportAnnule') }
  const conseils = [t('lancerAmiga')]
  // Les données lues par les puces doivent être en Chip RAM sur une machine qui a de la Fast RAM
  if (/\$?dff[0-9a-f]{3}|\$dff000/i.test(source) && !/_C\b/i.test(source)) {
    conseils.push(t('astuceChip'))
  }
  return { ok: true, message: t('enregistre', { chemin: enregistre.chemin ?? '', conseil: conseils.join('\n') }) }
}

let arreterGuet: (() => void) | undefined

function messageFin(code: number, sortie?: string): string {
  const texte = sortie ? t('aAffiche', { sortie }) : ''
  return t('fin', { code, texte })
}

/**
 * « Essayer dans Hatari / WinUAE » : le programme est assemblé, déposé dans le dossier de partage
 * (Documents\68k Trainer\Atari ou Amiga) et lancé au démarrage de l'émulateur.
 */
export async function essayerDansEmulateur(
  source: string,
  nom: string,
  plateforme: Plateforme = 'atari',
  dossier?: string,
  quandFini?: (message: string) => void
): Promise<ResultatExport> {
  const id = plateforme === 'amiga' ? 'winuae' : 'hatari'
  const etat = (await window.api.emulateursEtat()).find((e) => e.id === id)
  if (etat && !etat.disponible) {
    return {
      ok: false,
      message: t('windowsSeulement', { nom: etat.nom })
    }
  }
  if (!etat?.installe) {
    return { ok: false, message: t('pasInstalle', { nom: etat?.nom ?? id }) }
  }
  const nomFichier = plateforme === 'amiga' ? nomAmiga(nom) : nomTos(nom)
  // Un seul essai guetté à la fois : le précédent est oublié
  arreterGuet?.()
  arreterGuet = quandFini
    ? window.api.surFinEssai((fin) => {
        if (fin.id !== id || fin.nom !== nomFichier) return
        arreterGuet?.()
        arreterGuet = undefined
        quandFini(messageFin(fin.code, fin.sortie))
      })
    : undefined
  const r = await window.api.emulateurEssayer(id, source, nomFichier, dossier)
  if (!r.ok) {
    arreterGuet?.()
    arreterGuet = undefined
    return { ok: false, message: r.erreur ?? t('essaiImpossible') }
  }
  if (r.manuel) {
    arreterGuet?.()
    arreterGuet = undefined
    return {
      ok: true,
      message: t('manuel', { nom: etat.nom, fichier: nomFichier })
    }
  }
  const roms = await window.api.romsEtat()
  const systeme = plateforme === 'amiga' ? (roms.amiga?.actif ? 'Kickstart' : 'AROS') : roms.atari?.actif ? 'TOS' : 'EmuTOS'
  return {
    ok: true,
    message:
      plateforme === 'amiga'
        ? t('lanceAmiga', { nom: etat.nom, chemin: r.chemin ?? '', systeme: systeme === 'AROS' ? t('bureauAros') : t('shellKickstart') })
        : t('lanceAtari', { nom: etat.nom, chemin: r.chemin ?? '', systeme: systeme === 'TOS' ? t('duTos') : t('dEmutos') })
  }
}
