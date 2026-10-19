# État des lieux — 68k Trainer (19/10/2026)

Point de départ de la mise à jour décrite par la feuille de route
`Nextcloud/Logiciels_Projets/Roadmaps/Roadmap_ClaudeCode_68kTrainer.md`.
Version de référence : **0.1.1**, tag git `v0.1-avant-roadmap` (commit `705da57`).

## Stack

| Élément | Choix |
|---|---|
| Application | Electron 33 + electron-vite 2 + TypeScript 5 |
| Interface | TypeScript « vanilla » (pas de framework), DOM construit à la main |
| Éditeur de code | Monaco, avec un langage `m68k` maison (`src/renderer/src/monaco/m68kLanguage.ts`) |
| Assembleur | **vasm** (`tools/vasmm68k_mot.exe`, syntaxe Motorola/Devpac), appelé par le processus principal |
| Émulateur | 68000 maison en TypeScript (`src/cpu/`), décode le vrai code machine produit par vasm |
| Tests | Vitest : 10 fichiers, 56 tests, tous verts sur DARTHVADER |
| Distribution | electron-builder, `npm run dist:win` → installeur NSIS + exécutable portable |

## Arborescence utile

```
src/main/        processus principal : vasm, chargement du contenu, progression, version
src/preload/     pont IPC (window.api)
src/shared/      types partagés (ipc.ts) et logique de vérification (checkResult.ts)
src/cpu/         émulateur 68000 (cpu.ts, memory.ts, flags.ts, platform.ts)
src/platforms/   blocs « machine » (atari-st/palette.ts)
src/renderer/    interface : main.ts (onglets) + views/ (trainer, cours, exercices, apropos)
content/         tracks.json, courses/<parcours>/*.md, exercises/<parcours>/niveau-N-*.json
tests/           tests unitaires + vérification réelle de chaque exercice (vasm + Cpu)
docs/            PLAN-emulateurs.md (blocs AST/AMI), ce fichier
```

## Ce qui existe et marche

- **Bac à sable** : éditeur, assemblage, pas à pas, exécution, registres D0-D7/A0-A7/PC, flags
  X N Z V C, vue mémoire hexadécimale avec surlignage des octets écrits, console `TRAP #15`.
- **Cours** : fiches Markdown par parcours (`general` 4 fiches, `atari-st` 6, `amiga` 2).
- **Exercices** : parcours `general` niveaux 1 à 5 (17 exercices) + 3 exercices `atari-st`
  (palette). Indices progressifs, bouton « Vérifier » (assemble, exécute, compare registres,
  mémoire ou sortie). Chaque exercice a un test qui assemble et exécute la solution pour de vrai.
- **Progression** : liste plate des exercices réussis, dans `progress.json` (dossier `userData`).
- **À propos** : version, date de compilation.
- **Point d'extension `Platform`** (hooks `onTrap`, `onLineA`, `onJsr`, `onMemoryWrite`) et
  bloc AST-1 (palette ST masquée à `$0777`).

## Ce qui manque

### Côté émulateur (bloquant pour les modules 2, 4 et 5 du manuel Atari)

- Pas de **registre d'état complet** : seulement le CCR (X N Z V C). Ni bit S (superviseur), ni
  masque d'interruption, ni bit T.
- Pas d'**exceptions** : toute erreur arrête l'émulateur avec un message JavaScript. Pas de table
  des vecteurs, pas d'erreur d'adresse (accès mot/long impair = « 2 bombes » sur ST), pas de
  violation de privilège, pas de division par zéro « 68000 », pas de `RTE`.
- Pas de **double pile** USP/SSP, pas de `MOVE USP`, pas de `MOVE to/from SR`.
- Pas d'**interruptions** (indispensable pour IKBD, joystick, VBL).
- Instructions absentes : `EXT`, `Scc`, `LINK`/`UNLK`, `ADDX`/`SUBX`/`NEGX`, `CMPM`, `MOVEP`,
  `CHK`, `TRAPV`, `RTR`, `TAS`, `ILLEGAL`, décalages en mémoire, opérations sur CCR/SR, BCD.
- Flag V non calculé pour `ASL`. `DIVU`/`DIVS` modifient le registre même en cas de dépassement
  (le 68000 le laisse intact).
- Pas d'**écran** : aucun affichage du framebuffer Atari.

### Côté pédagogie et interface

- Pas de notion de **chapitre** ni de **notion** : seulement des parcours → niveaux → exercices.
- Pas de **barre de progression**, pas de sommaire avec états, pas de « reprendre ».
- Un seul type d'exercice (« écrire le programme »). Pas d'exemple corrigé pas à pas, pas de QCM,
  pas d'exercice de prédiction, de remise en ordre ou de débogage, pas de bonus.
- Messages d'erreur de vasm bruts (en anglais).
- Les cours ne marquent pas ce qui doit être relu.

## Dette technique repérée

- `progress.json` n'a pas de numéro de version : toute évolution du format doit rester
  rétrocompatible (on garde `completedExerciseIds`).
- Les vues reconstruisent tout le DOM à chaque clic (`renderLayout`), Monaco compris : simple mais
  lent si le contenu grossit.
- `checker.ts` et le test de chaque exercice dupliquent la boucle « assembler, exécuter,
  vérifier ».
- `node_modules/` est dans un dossier synchronisé par Nextcloud : à exclure ou à refaire par
  machine.
- La fiche `content/courses/amiga/demos-et-custom-chips.md` contient des adresses `$DFFxxx`
  fausses (voir `docs/PLAN-emulateurs.md`).
- Le manuel Atari v2 (source principale) semble généré par une IA (NotebookLM) : chaque adresse et
  chaque valeur doivent être vérifiées avant d'être reprises.
