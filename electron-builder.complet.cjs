/**
 * Version complète de 68k Trainer pour Windows : la configuration de package.json, avec les paquets
 * des émulateurs d'étude (build/emulateurs, préparés par scripts/preparer-emulateurs.mjs) rangés dans
 * resources/emulateurs. Ils s'installent alors sans Internet.
 *
 *   npm run dist:win:complet
 */
const { build } = require('./package.json')

module.exports = {
  ...build,
  extraResources: [...build.extraResources, { from: 'build/emulateurs', to: 'emulateurs', filter: ['*.zip'] }],
  portable: { artifactName: '${productName} ${version} complet.${ext}' },
  nsis: { ...build.nsis, artifactName: '${productName} Setup ${version} complet.${ext}' }
}
