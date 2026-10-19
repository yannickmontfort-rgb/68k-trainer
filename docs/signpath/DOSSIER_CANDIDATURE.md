# Dossier de candidature SignPath Foundation

Préparé le 19/10/2026, mis à jour pour la version 1.0.0. **Pas encore envoyé.** Objectif : faire signer gratuitement les
exécutables Windows de 68k Trainer, pour que SmartScreen affiche « Yannick Montfort » au lieu de
« Éditeur inconnu ».

- Conditions : <https://signpath.org/terms>
- Formulaire : <https://signpath.org/apply>

Les conditions ci-dessous ont été relevées le 19/10/2026 : les relire avant d'envoyer, elles
peuvent avoir changé.

## 1. Les conditions, point par point

| Condition SignPath | État pour 68k Trainer | À faire |
|---|---|---|
| Pas de logiciel malveillant | ✅ | — |
| **Licence OSI pour tous les composants**, sans double licence commerciale | ✅ depuis la 1.0.0 : l'assembleur est le nôtre (`src/asm/`, GPL v3). vasm ne sert plus qu'aux tests de comparaison, il n'est ni dans le dépôt ni dans les paquets. Electron, Monaco, marked : MIT | — |
| Pas de code propriétaire dans le paquet signé | ✅ | — |
| Projet maintenu | ✅ (commits réguliers) | — |
| Déjà publié sous la forme à signer | ✅ release v0.2.1 sur GitHub (installeur NSIS + portable) | — |
| Fonctions décrites sur la page de téléchargement | ✅ README + notes de release | — |
| Projet et dépôt à nous, binaires construits depuis nos sources | ✅ | — |
| Pas d'outil de piratage | ✅ (les tutos de cracking des sources ne sont pas dans le dépôt) | — |
| Vie privée : pas de transfert de données | ✅ aucune connexion réseau, tout reste en local | Le dire dans la politique |
| Désinstallation fournie | ✅ désinstalleur NSIS | — |
| **MFA** pour tous les membres (GitHub et SignPath) | ❓ à vérifier sur le compte GitHub `yannickmontfort-rgb` | Activer la double authentification sur GitHub : Settings → Password and authentication |
| Rôles définis (auteurs, relecteurs, approbateurs) | ⬜ | Rempli dans `CODE_SIGNING_POLICY.md` (Yannick dans les trois rôles ; ajouter des copains comme relecteurs s'ils contribuent) |
| **Page « Code signing policy »** sur l'accueil et la page de téléchargement | ⬜ prête : `docs/signpath/CODE_SIGNING_POLICY.md` | La publier à la racine du dépôt et la lier depuis le README et les notes de release **une fois acceptés** |
| Nom et version du produit identiques dans les métadonnées | ✅ electron-builder écrit « 68k Trainer » et la version de `package.json` | — |
| **Builds vérifiables** (construits par une CI depuis les sources) | ✅ prêt : `.github/workflows/release.yml` construit les paquets des trois systèmes à chaque tag | Donner au jeton GitHub le droit `workflow` pour pousser les workflows, puis vérifier un premier tag |
| Approbation manuelle de chaque signature | ⬜ | Se fait dans l'interface SignPath ; Yannick approuve |
| Coopérer en cas de plainte | ✅ engagement | — |

## 2. Le point bloquant : remplacer vasm — **fait**

L'assembleur maison (`src/asm/`, piste 1 de la première version de ce dossier) remplace vasm dans
l'application depuis la 1.0.0. Il est vérifié octet par octet contre vasm en mode Devpac par les
tests (`tests/asm/differentiel.test.ts`), qui sautent la comparaison quand vasm n'est pas installé.

## 3. Ordre des étapes, le jour venu

1. ~~Remplacer vasm~~ (fait).
2. Activer la double authentification sur GitHub.
3. Pousser les workflows (`gh auth refresh -s workflow`), puis vérifier qu'un tag `vX.Y.Z` produit
   bien les paquets dans une release en brouillon.
4. Publier `CODE_SIGNING_POLICY.md` et le lier depuis le README et la page de releases.
5. Remplir le formulaire <https://signpath.org/apply> avec les réponses du § 4.
6. Une fois accepté : créer le compte SignPath, la politique de signature et la configuration
   d'artefact (l'installeur `.exe` et le portable `.exe`), ajouter les secrets
   `SIGNPATH_API_TOKEN` et `SIGNPATH_ORGANIZATION_ID` dans GitHub, décommenter l'étape de
   signature du workflow.

## 4. Réponses préparées pour le formulaire (en anglais)

Le formulaire est en ligne et ses questions peuvent changer : voici les informations qu'il demande
habituellement.

- **Project name:** 68k Trainer
- **Repository:** https://github.com/yannickmontfort-rgb/68k-trainer
- **Homepage / download page:** https://github.com/yannickmontfort-rgb/68k-trainer/releases
- **License:** GNU General Public License v3.0 or later
- **Short description:**
  > 68k Trainer is a free, open-source desktop application (Electron) that teaches Motorola 68000
  > assembly language through a guided course on a simulated Atari ST: step-by-step worked
  > examples, prediction exercises, graded exercises, quizzes and optional challenges. It contains
  > its own 68000 emulator and a simulated Atari TOS. It is aimed at teenagers and adults learning
  > on their own, and at vocational high-school students (French "Bac Pro CIEL").
- **Why do you need code signing?**
  > Our users are hobbyists and students, many of them on school computers. Unsigned installers
  > trigger SmartScreen warnings ("Unknown publisher") that discourage beginners and are blocked by
  > some school IT policies.
- **Artifacts to sign:** Windows x64 NSIS installer (`68k Trainer Setup x.y.z.exe`) and portable
  executable (`68k Trainer x.y.z.exe`), built by electron-builder.
- **Build system:** GitHub Actions (windows-latest), `npm ci`, `npm test`, `electron-vite build`,
  `electron-builder --win`.
- **Release frequency:** a few releases per year.
- **Team:** Yannick Montfort (author, reviewer, approver). Contributors from the retro-computing
  community may join as reviewers.
- **Does the software transfer data or modify the system?** No network access at all; all data
  (learner progress, profiles) stays in the user's local application data folder. The installer
  provides a standard uninstaller.
