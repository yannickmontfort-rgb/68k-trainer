# Dossier de candidature SignPath Foundation

Préparé le 19/10/2026, **mis à jour le 21/10/2026 pour la version 1.1.0**. **Pas encore envoyé.**
Objectif : faire signer gratuitement les exécutables Windows de 68k Trainer, pour que SmartScreen
affiche « Yannick Montfort » (ou « SignPath Foundation ») au lieu de « Éditeur inconnu ».

- Conditions : <https://signpath.org/terms>
- Formulaire : <https://signpath.org/apply>

Les conditions ci-dessous ont été relevées le 19/10/2026 : **les relire avant d'envoyer**, elles
peuvent avoir changé.

## 1. Ce qu'on fait signer : la version légère seulement

Depuis la 1.1.0, 68k Trainer existe en deux versions Windows :

| Version | Contenu | Signable par SignPath ? |
|---|---|---|
| **Légère** (`68k Trainer Setup x.y.z.exe`, `68k Trainer x.y.z.exe`) | l'application seule (notre code GPL v3 + Electron, Monaco, marked : MIT) ; les émulateurs sont **téléchargés à la demande** depuis leurs sites officiels | ✅ oui |
| **Complète** (`… complet.exe`) | la même, **plus les paquets des émulateurs** : Hatari et WinUAE (GPL v2), EmuTOS (GPL v2), AROS (licence publique AROS), **`capsimg.dll`** (bibliothèque des images de disquettes protégées, licence propre à la Software Preservation Society) | ❌ non : `capsimg.dll` n'est pas sous licence libre (et la licence d'AROS n'est pas, à notre connaissance, approuvée par l'OSI) — or SignPath exige que **tout** le contenu signé soit sous licence OSI |

`capsimg.dll` ne peut pas être retirée : `hatari.exe` refuse de démarrer sans elle (vérifié le
20/10/2026).

**Proposition** : SignPath signe la **version légère** (installeur et portable), construite par la
CI. La version complète reste publiée **sans signature**, présentée comme telle dans les notes de
release (« version hors ligne, non signée »). Piste pour plus tard : remplacer la version complète par
un **« pack hors ligne »** séparé (un zip des paquets des émulateurs, sans exécutable de 68k Trainer
dedans) que l'application légère et signée saurait importer.

## 2. Les conditions, point par point

| Condition SignPath | État pour 68k Trainer (version légère) | À faire |
|---|---|---|
| Pas de logiciel malveillant | ✅ | — |
| **Licence OSI pour tous les composants**, sans double licence commerciale | ✅ GPL v3 pour notre code (assembleur maison `src/asm/` depuis la 1.0.0 : vasm ne sert plus qu'aux tests, il n'est ni dans le dépôt ni dans les paquets) ; dépendances MIT (Electron, Monaco, marked) | — |
| Pas de code propriétaire dans le paquet signé | ✅ pour la version légère (voir § 1 pour la complète) | — |
| Projet maintenu | ✅ commits réguliers, releases 0.2.1, 1.0.0, 1.1.0 | — |
| Déjà publié sous la forme à signer | ✅ release v1.1.0 sur GitHub (installeur NSIS + portable) | — |
| Fonctions décrites sur la page de téléchargement | ✅ README + notes de release + guide de l'utilisateur | — |
| Projet et dépôt à nous, binaires construits depuis nos sources | ✅ | — |
| Pas d'outil de piratage | ✅ (les tutos de cracking des sources ne sont pas dans le dépôt ; les émulateurs sont réglés pour l'étude, **aucune ROM sous droits** n'est fournie ni téléchargée) | — |
| Vie privée : pas de transfert de données sans demande | ✅ **aucune donnée envoyée**. Seul accès réseau : le **téléchargement d'un émulateur**, quand l'utilisateur le demande (case cochée dans l'installeur ou bouton « Installer »), depuis les sites officiels (framagit.org pour Hatari, download.abime.net pour WinUAE, les releases GitHub du projet pour AROS), fichiers vérifiés par SHA-256 | Le dire dans la politique (fait dans `CODE_SIGNING_POLICY.md`) |
| Désinstallation fournie | ✅ désinstalleur NSIS (retire aussi les émulateurs installés, garde les documents de l'utilisateur) | — |
| **MFA** pour tous les membres (GitHub et SignPath) | ✅ double authentification activée sur GitHub (confirmé par Yannick le 21/10/2026) | L'activer aussi sur le compte SignPath, à sa création |
| Rôles définis (auteurs, relecteurs, approbateurs) | ✅ prêt dans `CODE_SIGNING_POLICY.md` (Yannick dans les trois rôles ; des copains pourront être relecteurs) | — |
| **Page « Code signing policy »** sur l'accueil et la page de téléchargement | ⬜ prête : `docs/signpath/CODE_SIGNING_POLICY.md` | La publier à la racine du dépôt et la lier depuis le README et les notes de release **une fois acceptés** |
| Nom et version du produit identiques dans les métadonnées | ✅ electron-builder écrit « 68k Trainer » et la version de `package.json` | — |
| **Builds vérifiables** (construits par une CI depuis les sources) | ✅ depuis la 1.1.1 : le tag `v1.1.1` a produit par GitHub Actions les paquets des trois systèmes (release en brouillon) | Ne publier que les binaires de la CI |
| Approbation manuelle de chaque signature | ⬜ | Se fait dans l'interface SignPath ; Yannick approuve |
| Coopérer en cas de plainte | ✅ engagement | — |
| Dons | ✅ autorisés (bouton GitHub « Sponsor » vers PayPal, lien dans À propos) : la GPL et SignPath ne s'y opposent pas | — |

## 3. Ordre des étapes, le jour venu

1. ~~Remplacer vasm~~ (fait en 1.0.0).
2. ~~Double authentification sur GitHub~~ (faite).
3. ~~Release construite par la CI~~ (v1.1.1, 21/10/2026).
4. Publier `CODE_SIGNING_POLICY.md` à la racine et le lier depuis le README et la page des releases.
5. Remplir le formulaire <https://signpath.org/apply> avec les réponses du § 4, **en signalant
   d'emblée** que seule la version légère est concernée (§ 1).
6. Une fois accepté : créer le compte SignPath (avec double authentification), la politique de
   signature et la configuration d'artefact (installeur et portable de la version légère), ajouter
   les secrets `SIGNPATH_API_TOKEN` et `SIGNPATH_ORGANIZATION_ID` dans GitHub, décommenter l'étape
   de signature du workflow, et ne plus publier que les binaires signés par la CI.

## 4. Réponses préparées pour le formulaire (en anglais)

Le formulaire est en ligne et ses questions peuvent changer : voici les informations qu'il demande
habituellement.

- **Project name:** 68k Trainer
- **Repository:** https://github.com/yannickmontfort-rgb/68k-trainer
- **Homepage / download page:** https://github.com/yannickmontfort-rgb/68k-trainer/releases
- **License:** GNU General Public License v3.0 or later
- **Short description:**
  > 68k Trainer is a free, open-source desktop application (Electron) that teaches Motorola 68000
  > assembly language through guided courses on a simulated Atari ST and a simulated Amiga 500:
  > step-by-step worked examples, prediction exercises, graded exercises, quizzes and optional
  > challenges. It contains its own 68000 assembler (Devpac compatible), emulator, debugger, a
  > simulated Atari TOS and a simulated Amiga Kickstart. On request, it can download and set up two
  > free (GPL) emulators, Hatari and WinUAE, with free system software (EmuTOS, AROS), to run the
  > learner's programs; no copyrighted ROM is ever provided or downloaded. It is aimed at hobbyists,
  > self-learners and vocational high-school students (French "Bac Pro CIEL").
- **Why do you need code signing?**
  > Our users are hobbyists and students, many of them on school computers. Unsigned installers
  > trigger SmartScreen warnings ("Unknown publisher") that discourage beginners and are blocked by
  > some school IT policies.
- **Artifacts to sign:** the Windows x64 NSIS installer (`68k Trainer Setup x.y.z.exe`, with its
  uninstaller) and the portable executable (`68k Trainer x.y.z.exe`) of the standard ("light")
  edition, built by electron-builder in GitHub Actions. We do **not** ask to sign our separate
  "offline" edition, which bundles third-party emulator packages including a non-OSI library
  (`capsimg.dll`, required by Hatari); it stays unsigned and is labelled as such.
- **Build system:** GitHub Actions (windows-latest), `npm ci`, `npm run typecheck`, `npm test`,
  `electron-vite build`, `electron-builder --win`.
- **Release frequency:** a few releases per year.
- **Team:** Yannick Montfort (author, reviewer, approver). Contributors from the retro-computing
  community may join as reviewers.
- **Does the software transfer data or modify the system?** It never sends any data. Its only
  network access is downloading an emulator package when the user explicitly asks for it (checkbox
  in the installer, or "Install" button), from the emulators' official sites and from this
  project's GitHub releases; every package is verified against a pinned SHA-256 hash. Everything is
  installed in the user's own folders (`%LOCALAPPDATA%\68k Trainer`, `Documents\68k Trainer`)
  without administrator rights; learner data stays in the local application data folder. The
  installer provides a standard uninstaller, which also removes the installed emulators.
