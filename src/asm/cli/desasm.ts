/**
 * Désassembleur 68000 en ligne de commande (syntaxe Devpac, source réassemblable).
 *
 *   npm run desasm -- PROGRAMME.PRG              → source sur la sortie standard
 *   npm run desasm -- PROGRAMME.PRG -o prog.s    → dans un fichier
 *   npm run desasm -- image.bin --base $10000    → binaire brut chargé à une adresse donnée
 *
 * Un fichier qui commence par $601A est lu comme un programme TOS (sections, relocations,
 * symboles) ; sinon comme un binaire brut (ORG à l'adresse --base, $0 par défaut).
 */
import { readFileSync, writeFileSync } from 'fs'
import { desassembler, desassemblerPrg, sourceReassemblable } from '../desassembleur'
import { lirePrg } from '../prg'

function aide(): never {
  console.error('Usage : desasm <fichier> [-o sortie.s] [--base $adresse] [--brut] [--flot]')
  process.exit(1)
}

const args = process.argv.slice(2)
if (args.length === 0 || args.includes('-h') || args.includes('--help')) aide()
let fichier = ''
let sortie = ''
let base = 0
let brut = false
let flot = false
for (let i = 0; i < args.length; i++) {
  const a = args[i]
  if (a === '-o') sortie = args[++i] ?? aide()
  else if (a === '--base') base = parseInt((args[++i] ?? aide()).replace(/^\$/, ''), 16)
  else if (a === '--brut') brut = true
  else if (a === '--flot') flot = true
  else fichier = a
}
if (!fichier) aide()

const octets = new Uint8Array(readFileSync(fichier))
let source: string
if (!brut && octets.length >= 2 && octets[0] === 0x60 && octets[1] === 0x1a) {
  const prg = lirePrg(octets)
  const entete = [
    `; Désassemblé de ${fichier} par 68k Trainer`,
    `; TEXT ${prg.text.length} octets, DATA ${prg.data.length}, BSS ${prg.bss}, ${prg.relocs.length} relocations, ${prg.symboles.length} symboles`,
    ''
  ]
  source = entete.join('\n') + desassemblerPrg(prg)
} else {
  source = `; Désassemblé de ${fichier} par 68k Trainer\n` + sourceReassemblable(desassembler(octets, { base, flot }), base)
}
if (sortie) writeFileSync(sortie, source, 'utf-8')
else process.stdout.write(source)
