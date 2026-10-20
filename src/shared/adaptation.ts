/**
 * Tronc commun : un même chapitre sert aux deux machines, avec de petites adaptations.
 *
 * - En ligne, partout (JSON, Markdown, code) : `[[atari:le ST|amiga:l'Amiga]]`.
 * - Blocs de lignes (Markdown, code) : une ligne `:::amiga` (ou `;:::amiga` dans le code), les
 *   lignes propres à cette machine, puis une ligne `:::` (ou `;:::`).
 * - Dans le JSON d'un contenu : `"variantes": { "amiga": { "check": … } }` remplace des champs.
 * - Code : un bloc `;=== nom@amiga` remplace le bloc `;=== nom` pour l'Amiga (voir content.ts).
 */
export type MachineContenu = 'atari' | 'amiga'

const EN_LIGNE = /\[\[((?:atari|amiga):[^\]]*?)\]\]/g
const DEBUT_BLOC = /^\s*;?:::(atari|amiga)\s*$/
const FIN_BLOC = /^\s*;?:::\s*$/

/** Garde le texte de la machine dans les `[[atari:…|amiga:…]]` (rien si elle n'est pas citée). */
export function adapterEnLigne(texte: string, machine: MachineContenu): string {
  return texte.replace(EN_LIGNE, (_, corps: string) => {
    for (const partie of corps.split('|')) {
      const i = partie.indexOf(':')
      if (partie.slice(0, i) === machine) return partie.slice(i + 1)
    }
    return ''
  })
}

/** Retire les blocs `:::autre-machine … :::`, puis adapte le texte en ligne. */
export function adapterTexte(texte: string, machine: MachineContenu): string {
  const lignes = texte.split(/\r?\n/)
  const gardees: string[] = []
  let bloc: string | null = null
  for (const l of lignes) {
    const debut = DEBUT_BLOC.exec(l)
    if (debut && bloc === null) {
      bloc = debut[1]
      continue
    }
    if (bloc !== null && FIN_BLOC.test(l)) {
      bloc = null
      continue
    }
    if (bloc === null || bloc === machine) gardees.push(l)
  }
  if (bloc !== null) throw new Error(`Bloc « :::${bloc} » non fermé (il manque une ligne « ::: »).`)
  return adapterEnLigne(gardees.join('\n'), machine)
}

/** Applique les `"variantes": { machine: {…} }` d'un objet JSON et de tous ses sous-objets. */
export function appliquerVariantes(valeur: unknown, machine: MachineContenu): void {
  if (Array.isArray(valeur)) {
    for (const v of valeur) appliquerVariantes(v, machine)
    return
  }
  if (!valeur || typeof valeur !== 'object') return
  const objet = valeur as Record<string, unknown>
  const variantes = objet.variantes as Record<string, Record<string, unknown>> | undefined
  if (variantes) {
    Object.assign(objet, variantes[machine] ?? {})
    delete objet.variantes
  }
  for (const v of Object.values(objet)) appliquerVariantes(v, machine)
}
