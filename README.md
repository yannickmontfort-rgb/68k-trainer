# 68k Trainer

Apprendre l'assembleur **Motorola 68000** en programmant un **Atari ST** ou un **Amiga 500**
simulés, pas à pas. À notre connaissance, c'est le premier outil qui réunit les deux machines.

- Deux **parcours guidés** façon OpenClassrooms, avec un **tronc commun** (les chapitres 1 à 3, le
  68000) : **Atari ST** en 8 chapitres (TOS, écran, animation, clavier, joystick, son, Devpac) et
  **Amiga** en 10 chapitres (Exec et bibliothèques, puces custom, Copper, Blitter, sprites, Paula,
  exécutable AmigaDOS). La machine se choisit dans le profil. Barre de
  progression, « reprendre là où je me suis arrêté », attestation et certificat en PDF.
- Pour chaque notion : un cours, un **exemple corrigé exécuté pas à pas** (avec l'explication de
  chaque ligne), un exercice de **prédiction**, des **exercices par niveaux** (à compléter, guidé,
  en autonomie, à corriger, à remettre dans l'ordre), et à la fin de chaque chapitre un **QCM** et
  des **défis bonus** facultatifs.
- Un **émulateur 68000** complet (exceptions, superviseur, interruptions, compteur de cycles) et
  un **Atari 1040 STF** simulé : écran en basse résolution, palette et rasters, VBL à 50 Hz, MFP
  68901, clavier IKBD et joysticks, puce sonore YM2149, TOS (GEMDOS, BIOS, XBIOS), bombes. Mode
  **temps réel** à la vitesse d'un vrai ST, avec le son.
- Un **Amiga 500** simulé (OCS, PAL) : Copper, Blitter (zone, remplissage, lignes), plans de bits,
  sprites, Paula, CIA, souris, joystick, clavier, et un Kickstart 1.3 simulé (ExecBase en `$4`,
  vraies tables de sauts, exec, dos, graphics), Guru Meditation compris.
- Un **débogueur** : pas à pas, points d'arrêt, désassemblage, pile, mémoire, matériel.
- Son **propre assembleur 68000**, compatible Devpac (vérifié octet par octet contre vasm), un
  **désassembleur**, l'**export en .PRG** (Hatari, vrai ST) et en **exécutable AmigaDOS**
  (WinUAE, FS-UAE, vrai Amiga).
- Des **émulateurs d'étude** installés à la demande (Windows) : **Hatari** avec EmuTOS et
  **WinUAE** avec le Kickstart libre AROS, aucune ROM sous droits ; un dossier de partage dans les
  Documents, et un bouton **« Essayer dans l'émulateur »**.
- Un **bac à sable** qui est un vrai éditeur (ouvrir, enregistrer, `INCLUDE` à côté du source), des
  **fiches de référence** (68000, TOS, MFP, Ligne A et GEM, bibliothèques et puces de l'Amiga) et
  tous les exercices du parcours en **exercices libres**.

Les choix pédagogiques s'appuient sur la recherche : exemples résolus puis retrait progressif de
l'aide, une difficulté à la fois, lire et prédire avant d'écrire, enseignement explicite du
débogage.

## ☕ Soutenir le projet

68k Trainer est gratuit et libre. Si tu veux encourager son développement (de nouveaux chapitres,
les versions Linux et macOS des émulateurs…), tu peux faire un don par PayPal :
**[paypal.me/YMONTFORT](https://paypal.me/YMONTFORT)**. Merci !

## Tu as trouvé une erreur ?

Les cours et les exercices sont là pour être améliorés : une explication fausse, un exercice
impossible, une faute ? [Ouvre une *issue*](../../issues/new/choose) (modèle « Erreur dans un cours ou un
exercice »). Les corrections proposées par *pull request* sont aussi les bienvenues : le format du
contenu est décrit dans [content/parcours/README.md](content/parcours/README.md).

## Utiliser

Voir le [guide de l'utilisateur](docs/guide_utilisateur.md).

## Développer

```bash
npm install
npm run dev        # lance l'application en mode développement
npm test           # tests : émulateur, TOS simulé, et exécution réelle de tout le contenu
npm run typecheck
npm run dist:win   # Windows : installeur + version portable (légers : émulateurs téléchargés) dans dist/
npm run dist:win:complet # Windows : les mêmes avec Hatari et WinUAE embarqués (télécharge les paquets)
npm run dist:linux # Linux : AppImage + .deb (à lancer sous Linux)
npm run dist:mac   # macOS : .dmg universel (à lancer sous macOS)
```

> Si l'application ne s'ouvre pas depuis un terminal lancé par un outil basé sur Electron, la
> variable `ELECTRON_RUN_AS_NODE` est peut-être définie : supprime-la avant `npm run dev`.

| Dossier | Contenu |
|---|---|
| `src/cpu/` | émulateur 68000 (`cpu.ts`, `exceptions.ts`, point d'extension `platform.ts`) |
| `src/platforms/atari-st/` | Atari ST : TOS simulé, VBL, MFP, IKBD, YM2149, écran, palette |
| `src/platforms/amiga/` | Amiga 500 : puces custom, Copper, Blitter, sprites, Paula, CIA, Kickstart simulé |
| `src/asm/` | assembleur compatible Devpac, formats .PRG et hunk AmigaDOS, désassembleur (sans dépendance) |
| `src/shared/` | modèle du parcours, calcul de la progression, vérification des exercices |
| `src/renderer/` | interface (TypeScript sans framework, éditeur Monaco) |
| `content/parcours/` | les parcours `commun/`, `atari/`, `amiga/` : un dossier par chapitre (`chapitre.json`, cours `.md`, codes `code.s`) |
| `content/fichiers/` | fichiers pour INCLUDE et INCBIN (dont `amiga-systeme.s` : prendre et rendre la main) |
| `content/courses/`, `content/exercises/` | fiches et exercices de la version 0.1 |
| `docs/` | état des lieux, inventaire des sources, errata du manuel, plan des émulateurs, rapports |

Le format du contenu est décrit dans [content/parcours/README.md](content/parcours/README.md).
Chaque exemple, solution et prédiction est **assemblé et exécuté** par
`tests/contenu-parcours.test.ts` : un contenu faux fait échouer les tests.

Les paquets des trois systèmes sont construits par GitHub Actions à chaque tag `vX.Y.Z`
(`.github/workflows/release.yml`), et les tests tournent sous Windows, Linux et macOS.

## Licence

Logiciel libre sous **GNU GPL v3 ou ultérieure** ([LICENSE](LICENSE)). Composants tiers : voir
[THIRD_PARTY.md](THIRD_PARTY.md).

## Outils en ligne de commande

L'assembleur et le désassembleur (`src/asm/`, sans dépendance) servent aussi hors de l'application :

```bash
npm run asm -- programme.s              # → programme.prg (exécutable TOS)
npm run asm -- programme.s --bin        # → binaire à plat
npm run desasm -- PROGRAMME.PRG -o p.s  # → source Devpac réassemblable à l'identique
```

## Crédits

Développé par Yannick Montfort avec Claude (Anthropic). Cours reformulés à partir du cours
d'assembleur 68000 sur Atari ST du Féroce Lapin, du cours de David Bouchet (EPITA), du polycopié de
Philippe Meyne (IUT d'Évry) et du manuel Motorola M68000PRM ; parcours Amiga rédigé d'après Amiga
Intern (Abacus), La Bible de l'Amiga, le Hardware Reference Manual et les sources d'AROS.
