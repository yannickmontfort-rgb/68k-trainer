# Dossier de candidature SignPath Foundation (mis de côté)

Préparé le 19/10/2026. **Pas encore envoyé.** Objectif : faire signer gratuitement les
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
| **Licence OSI pour tous les composants**, sans double licence commerciale | ❌ **Bloquant** : vasm (`tools/vasmm68k_mot.exe`) est « gratuit pour usage non commercial », ce qui n'est **pas** une licence OSI. Electron, Monaco, marked : MIT ✅. Notre code : GPL v3 ✅ | Remplacer vasm, voir § 2 |
| Pas de code propriétaire dans le paquet signé | ❌ même cause (vasm) | idem |
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
| **Builds vérifiables** (construits par une CI depuis les sources) | ⬜ les binaires sont aujourd'hui construits à la main sur DARTHVADER | Activer la construction par GitHub Actions : brouillon prêt dans `docs/signpath/release.yml.brouillon` |
| Approbation manuelle de chaque signature | ⬜ | Se fait dans l'interface SignPath ; Yannick approuve |
| Coopérer en cas de plainte | ✅ engagement | — |

## 2. Le point bloquant : remplacer vasm

Trois pistes, de la plus propre à la plus rapide :

1. **Écrire notre propre assembleur 68000 en TypeScript** (syntaxe Devpac, sous-ensemble
   pédagogique). C'est la piste la plus propre : plus d'exécutable externe, l'application devient
   multi-plateforme (Linux, macOS), et tout est sous GPL. Le simulateur décode déjà toutes les
   instructions : l'assembleur en est l'inverse. Les 300 tests existants, qui assemblent tout le
   contenu, serviraient de banc d'essai en comparant avec vasm. **Effort : quelques sessions.**
2. **Un assembleur libre existant**, s'il en existe un compatible Devpac sous licence OSI, à
   vérifier (GNU as avec son mode de compatibilité Motorola « MRI » : licence GPL, mais syntaxe
   et messages différents de Devpac).
3. **Demander aux auteurs de vasm** (Volker Barthelmann, Frank Wille) une autorisation ou une
   double licence pour un projet libre non commercial. Cela ne suffira probablement pas : SignPath
   veut une licence OSI, pas une autorisation.

Recommandation : piste 1.

## 3. Ordre des étapes, le jour venu

1. Remplacer vasm (§ 2) et retirer `tools/vasm*` des binaires.
2. Activer la double authentification sur GitHub.
3. Mettre en service la construction par GitHub Actions (brouillon fourni) et vérifier qu'elle
   produit les mêmes exécutables qu'à la main.
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
