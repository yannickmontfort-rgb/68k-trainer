# 68k Trainer

Apprendre l'assembleur **Motorola 68000** en programmant un **Atari ST simulé**, pas à pas.

- Un **parcours guidé** façon OpenClassrooms : chapitres, notions, barre de progression,
  « reprendre là où je me suis arrêté ».
- Pour chaque notion : un cours, un **exemple corrigé exécuté pas à pas** (avec l'explication de
  chaque ligne), un exercice de **prédiction**, des **exercices par niveaux** (à compléter, guidé,
  en autonomie, à corriger, à remettre dans l'ordre), et à la fin de chaque chapitre un **QCM** et
  des **défis bonus** facultatifs.
- Un **émulateur 68000** complet (exceptions, superviseur, interruptions) et un **Atari 1040 STF**
  simulé : écran en basse résolution, palette, TOS (GEMDOS, BIOS, XBIOS), bombes.
- L'assembleur est **[vasm](http://sun.hasenbraten.de/vasm/)**, en syntaxe Devpac.

Les choix pédagogiques s'appuient sur la recherche : exemples résolus puis retrait progressif de
l'aide, une difficulté à la fois, lire et prédire avant d'écrire, enseignement explicite du
débogage.

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
npm run dist:win   # installeur + version portable dans dist/
```

> Si l'application ne s'ouvre pas depuis un terminal lancé par un outil basé sur Electron, la
> variable `ELECTRON_RUN_AS_NODE` est peut-être définie : supprime-la avant `npm run dev`.

| Dossier | Contenu |
|---|---|
| `src/cpu/` | émulateur 68000 (`cpu.ts`, `exceptions.ts`, point d'extension `platform.ts`) |
| `src/platforms/atari-st/` | Atari ST : TOS simulé, carte mémoire, écran, palette |
| `src/shared/` | modèle du parcours, calcul de la progression, vérification des exercices |
| `src/renderer/` | interface (TypeScript sans framework, éditeur Monaco) |
| `content/parcours/atari/` | le parcours : un dossier par chapitre (`chapitre.json`, cours `.md`, codes `code.s`) |
| `content/courses/`, `content/exercises/` | fiches et exercices de la version 0.1 |
| `docs/` | état des lieux, inventaire des sources, errata du manuel, plan des émulateurs, rapports |

Le format du contenu est décrit dans [content/parcours/README.md](content/parcours/README.md).
Chaque exemple, solution et prédiction est **assemblé et exécuté** par
`tests/contenu-parcours.test.ts` : un contenu faux fait échouer les tests.

## Licence

Logiciel libre sous **GNU GPL v3 ou ultérieure** ([LICENSE](LICENSE)). L'assembleur vasm, fourni
dans `tools/`, garde sa propre licence (usage non commercial) : voir [THIRD_PARTY.md](THIRD_PARTY.md).

## Crédits

Développé par Yannick Montfort avec Claude (Anthropic). Cours reformulés à partir du cours
d'assembleur 68000 sur Atari ST du Féroce Lapin, du cours de David Bouchet (EPITA), du polycopié de
Philippe Meyne (IUT d'Évry) et du manuel Motorola M68000PRM.
