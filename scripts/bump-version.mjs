// Incrémente la version (patch, ou bêta pour une pré-version) de package.json et écrit build-meta.json
// (version + année de ce build). Appelé automatiquement avant chaque build
// de distribution (voir "dist:win" dans package.json) — pas de tag/commit git.
import { execSync } from 'child_process'
import { readFileSync, writeFileSync } from 'fs'

// Une pré-version (2.0.0-beta.N) avance de bêta en bêta ; une version finale, de correctif en correctif
const avant = JSON.parse(readFileSync('package.json', 'utf-8')).version
const pas = avant.includes('-') ? 'prerelease' : 'patch'
execSync(`npm version ${pas} --no-git-tag-version --no-commit-hooks`, { stdio: 'inherit' })

const pkg = JSON.parse(readFileSync('package.json', 'utf-8'))

const buildMeta = {
  version: pkg.version,
  year: new Date().getFullYear(),
  builtAt: new Date().toISOString()
}

writeFileSync('build-meta.json', JSON.stringify(buildMeta, null, 2) + '\n')
console.log(`Version : ${buildMeta.version} (${buildMeta.year})`)
