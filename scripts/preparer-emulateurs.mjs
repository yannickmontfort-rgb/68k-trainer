/**
 * Prépare build/emulateurs pour la version complète (npm run dist:win:complet) : télécharge les
 * paquets du catalogue (src/main/emulateurs/catalogue.ts) qui manquent et vérifie leur SHA-256.
 *
 * Le paquet AROS est fabriqué par scripts/paquet-aros.py : s'il n'est pas encore publié, le
 * fabriquer d'abord et le ranger dans build/emulateurs.
 */
import { createHash } from 'crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const racine = join(dirname(fileURLToPath(import.meta.url)), '..')
const dossier = join(racine, 'build', 'emulateurs')
const catalogue = readFileSync(join(racine, 'src', 'main', 'emulateurs', 'catalogue.ts'), 'utf-8')
const paquets = [...catalogue.matchAll(/fichier: '([^']+)',\s*url: '([^']+)',\s*sha256: '([0-9a-f]{64})'/g)].map((m) => ({
  fichier: m[1],
  url: m[2],
  sha256: m[3]
}))
if (paquets.length === 0) throw new Error('Aucun paquet trouvé dans catalogue.ts')

const somme = (octets) => createHash('sha256').update(octets).digest('hex')
mkdirSync(dossier, { recursive: true })
let erreurs = 0
for (const p of paquets) {
  const chemin = join(dossier, p.fichier)
  if (existsSync(chemin) && somme(readFileSync(chemin)) === p.sha256) {
    console.log(`ok          ${p.fichier}`)
    continue
  }
  console.log(`téléchargé  ${p.fichier} …`)
  try {
    const r = await fetch(p.url)
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    const octets = Buffer.from(await r.arrayBuffer())
    if (somme(octets) !== p.sha256) throw new Error('somme SHA-256 différente')
    writeFileSync(chemin, octets)
  } catch (e) {
    erreurs++
    console.error(`ÉCHEC       ${p.fichier} : ${e.message} (${p.url})`)
  }
}
if (erreurs) process.exit(1)
