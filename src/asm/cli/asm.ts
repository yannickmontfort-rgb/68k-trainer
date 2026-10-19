/**
 * Assembleur 68000 en ligne de commande, compatible Devpac.
 *
 *   npm run asm -- programme.s                   → programme.prg (exécutable TOS)
 *   npm run asm -- programme.s -o JEU.PRG
 *   npm run asm -- programme.s --bin -o code.bin  → binaire à plat (avec ORG, ou en --base)
 *
 * INCLUDE et INCBIN sont cherchés à côté du source. Les erreurs sont affichées en français,
 * au format « fichier:ligne:colonne: message », que comprennent les éditeurs de code.
 */
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join, parse } from 'path'
import { assembler } from '../assembleur'
import { creerPrg, empechementPrg } from '../prg'

function aide(): never {
  console.error('Usage : asm <source.s> [-o sortie] [--bin] [--base $adresse] [--symboles]')
  process.exit(1)
}

const args = process.argv.slice(2)
if (args.length === 0 || args.includes('-h') || args.includes('--help')) aide()
let fichier = ''
let sortie = ''
let binaire = false
let base: number | undefined
let symboles = false
for (let i = 0; i < args.length; i++) {
  const a = args[i]
  if (a === '-o') sortie = args[++i] ?? aide()
  else if (a === '--bin') binaire = true
  else if (a === '--base') base = parseInt((args[++i] ?? aide()).replace(/^\$/, ''), 16)
  else if (a === '--symboles') symboles = true
  else fichier = a
}
if (!fichier) aide()

const dossier = dirname(fichier)
const chemin = (nom: string): string => join(dossier, nom.replace(/\\/g, '/'))
const r = assembler(readFileSync(fichier, 'utf-8'), {
  base,
  prg: !binaire,
  lireTexte: (nom) => (existsSync(chemin(nom)) ? readFileSync(chemin(nom), 'utf-8') : null),
  lireBinaire: (nom) => (existsSync(chemin(nom)) ? new Uint8Array(readFileSync(chemin(nom))) : null)
})
for (const a of r.avertissements) console.error(`${fichier}:${a.ligne}:${a.colonne ?? 1}: avertissement : ${a.message}`)
for (const e of r.erreurs) console.error(`${fichier}:${e.ligne}:${e.colonne ?? 1}: erreur : ${e.message}`)
if (!r.ok) process.exit(2)

const cible = sortie || join(dossier, parse(fichier).name + (binaire ? '.bin' : '.prg'))
if (binaire) {
  writeFileSync(cible, r.binaire)
  console.error(`${cible} : ${r.binaire.length} octets, chargé en $${r.base.toString(16).toUpperCase()}`)
} else {
  const raison = empechementPrg(r)
  if (raison) {
    console.error(raison)
    process.exit(2)
  }
  const prg = creerPrg(r, symboles ? { symboles: true } : {})
  writeFileSync(cible, prg)
  console.error(`${cible} : ${prg.length} octets (TEXT ${r.sections.text.length}, DATA ${r.sections.data.length}, BSS ${r.sections.bss}, ${r.relocs.length} relocations)`)
}
