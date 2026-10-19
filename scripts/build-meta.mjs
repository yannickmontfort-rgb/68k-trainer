// Écrit build-meta.json (version de package.json + date du build) sans changer la version :
// utilisé par la construction automatique (GitHub Actions), où la version vient du tag.
import { readFileSync, writeFileSync } from 'fs'

const pkg = JSON.parse(readFileSync('package.json', 'utf-8'))
const buildMeta = { version: pkg.version, year: new Date().getFullYear(), builtAt: new Date().toISOString() }
writeFileSync('build-meta.json', JSON.stringify(buildMeta, null, 2) + '\n')
console.log(`Version : ${buildMeta.version} (${buildMeta.year})`)
