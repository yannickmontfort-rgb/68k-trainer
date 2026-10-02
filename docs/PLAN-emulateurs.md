# Plan — mini-émulateurs Atari ST / Amiga

> **Reconstitué le 2026-10-02.** Le plan d'origine (`~/.claude/plans/vast-brewing-platypus.md`,
> approuvé le 2026-08-05) a été effacé par le nettoyage automatique de Claude Code, qui supprime
> les fichiers de session de plus de 30 jours. Ce document le remplace. Il repart du découpage
> mémorisé, du code existant (Bloc 0, AST-1) et des fiches de `content/courses/`. Le détail des
> exercices prévus à l'origine est perdu : ceux proposés ici sont nouveaux, à valider.
>
> Ce fichier est versionné dans git : il ne peut plus disparaître comme le plan d'origine.

## Principe

Pas un émulateur complet de machine, mais **de petits blocs indépendants**, chacun améliorable
seul. Chaque bloc :

1. implémente un ou plusieurs hooks de l'interface `Platform` (`src/cpu/platform.ts`) dans
   `src/platforms/<machine>/<bloc>.ts` ;
2. est branché dans `src/renderer/src/platformForTrack.ts` ;
3. apporte ses exercices (`content/exercises/<machine>/niveau-N-<theme>.json`) ;
4. est **vérifié pour de vrai** : un test `tests/exercises-<machine>-niveau-N.test.ts` assemble la
   solution avec vasm, l'exécute dans le vrai `Cpu` avec la vraie `Platform` et vérifie le
   résultat attendu, comme pour le parcours `general`.

Le cœur 68000 (`src/cpu/cpu.ts`) ne connaît aucune machine : tout passe par les hooks.

### Piège connu (rencontré deux fois)

Le premier test d'un nouveau dossier `src/platforms/<machine>/` échoue au typecheck tant que
`"src/platforms/**/*"` n'est pas dans les `include` de `tsconfig.node.json` **et** de
`tsconfig.web.json`. C'est déjà fait pour `atari-st` ; à vérifier pour `amiga`.

### Composer plusieurs blocs

`getPlatformForTrack` renvoie aujourd'hui une seule `Platform` (la palette). Dès AST-2, il faudra
**combiner** plusieurs blocs : une petite fonction `combinePlatforms(...blocs)` qui appelle chaque
hook dans l'ordre et s'arrête au premier qui renvoie `true` (`onMemoryWrite` est appelé sur tous).

## État des blocs

| Bloc | Sujet | Hook(s) | État |
|---|---|---|---|
| Bloc 0 | Point d'extension `Platform` + check `memory`/`output` | — | ✅ 2026-08-08 |
| AST-1 | Palette ST `$FF8240-$FF825E` (masque `$0777`) | `onMemoryWrite` | ✅ 2026-08-08, 3 exercices |
| AST-2 | Texte via GEMDOS (`TRAP #1`) | `onTrap` | ⬜ |
| AST-3 | BIOS (`TRAP #13`) | `onTrap` | ⬜ |
| AST-4 | Dessin en Ligne A (`$A000`…) | `onLineA` | ⬜ |
| AMI-1 | ExecBase (`$4`) | initialisation mémoire | ⬜ |
| AMI-2 | exec.library (`JSR -offset(A6)`) | `onJsr` | ⬜ |
| AMI-3 | Registres des custom chips `$DFFxxx` | `onMemoryWrite` | ⬜ |

## Atari ST

Référence : `content/courses/atari-st/trap-et-systeme.md`, `ligne-a-et-gem.md`.

### AST-2 — Texte via GEMDOS

Les paramètres GEMDOS passent **par la pile** : numéro de fonction en dernier (au sommet), puis
`TRAP #1`, puis nettoyage de la pile par l'appelant (`ADDQ.L #n,SP` ou `LEA n(SP),SP`).

- `onTrap(cpu, 1)` lit le word au sommet de la pile (`A7`) = numéro de fonction.
- Fonctions à simuler :
  - `$09` **Cconws(chaîne)** : adresse longue en `4(SP)` → ajoute la chaîne (terminée par 0) à
    `cpu.output` ;
  - `$02` **Cconout(car)** : word en `2(SP)` → ajoute un caractère ;
  - `$00` **Pterm0** : arrête le programme (comme le HALT de `TRAP #15`).
- Ne **pas** dépiler à la place du programme : c'est son travail, et l'oubli du nettoyage est
  justement une erreur pédagogique classique à rendre visible.
- Exercices proposés (`niveau-2-gemdos.json`, check `output`) : afficher « BONJOUR » avec Cconws ;
  afficher un caractère avec Cconout ; afficher deux lignes en nettoyant correctement la pile ;
  terminer proprement avec Pterm0.

### AST-3 — BIOS

- `onTrap(cpu, 13)`, même convention de pile.
- `$03` **Bconout(périph, car)** : périphérique en `2(SP)` (2 = console), caractère en `4(SP)` →
  `cpu.output`.
- Montre la hiérarchie expliquée dans la fiche : GEMDOS appelle le BIOS en interne.
- Exercices : afficher une chaîne caractère par caractère avec une boucle `DBRA` autour de
  Bconout (réutilise le niveau 4 du parcours `general`).

### AST-4 — Ligne A

- `onLineA(cpu, opcode)` : `$A000` = initialisation (renvoie dans `A0` (et `D0`) l'adresse de la zone
  des variables Ligne A simulée, qui contient les pointeurs vers les 5 tableaux) ; puis les fonctions de dessin
  utiles : `$A001` point, `$A002` lecture de point, `$A003` ligne.
- Paramètres par les **tableaux partagés** (`CONTRL`, `INT_IN`, `PTSIN`, `INTOUT`, `PTSOUT`), pas
  par la pile, à placer à des adresses fixes dans la mémoire simulée.
- Écran simulé : un framebuffer en mémoire (basse résolution 320×200, 4 plans entrelacés, comme
  décrit dans `graphisme-bas-niveau.md`). Vérification par check `memory` sur les octets attendus.
- Plus tard, éventuellement : un petit panneau d'affichage dans l'UI qui dessine ce framebuffer
  avec la palette AST-1. C'est le bloc le plus gros, à faire en dernier.

## Amiga

Référence : `content/courses/amiga/systeme-et-hardware.md`, `demos-et-custom-chips.md`.

### AMI-1 — ExecBase

- Au démarrage d'un exercice `amiga`, écrire à l'adresse `$4` un pointeur vers une ExecBase
  simulée (zone mémoire réservée, hors de portée des programmes d'exercice en `$1000`).
- Rien d'autre : ce bloc ne fait que rendre vrai `MOVE.L $4,A6`.
- Prévoir dans `Platform` un hook d'initialisation (`onReset(cpu)`), qui n'existe pas encore.
- Exercice : charger ExecBase dans A6 (check `registers` sur A6).

### AMI-2 — exec.library

- `onJsr(cpu, cible)` : reconnaît une cible = ExecBase − offset et simule la fonction.
- Fonctions utiles pour des exercices simples :
  - `-552` **OpenLibrary(nom=A1, version=D0)** → `D0` = base fictive non nulle pour les noms
    connus (`dos.library`, `graphics.library`, `intuition.library`), 0 sinon ;
  - `-414` **CloseLibrary(A1)** ;
  - `-198` **AllocMem(taille=D0, attributs=D1)** / `-210` **FreeMem** : allocateur simple dans une zone
    réservée.
- Respecter la convention : `D0-D1`/`A0-A1` sont « scratch » après l'appel. On peut même les
  brouiller volontairement pour qu'un programme qui compte dessus échoue, ce qui serait très
  pédagogique.
- Exercices : ouvrir `dos.library` et tester `D0` (branchement si échec) ; ouvrir puis refermer ;
  allouer un bloc et y écrire.
- Plus tard : `dos.library` `-948` **PutStr** pour afficher du texte (check `output`), équivalent
  Amiga d'AST-2.

### AMI-3 — Registres des custom chips

- `onMemoryWrite` sur `$DFF000-$DFF1FF`.
- Premier pas : **COLOR00-COLOR31** (`$DFF180-$DFF1BE`), 12 bits utiles `$0RGB`, donc masque `$0FFF`.
  C'est l'équivalent exact d'AST-1, et une bonne comparaison ST/Amiga en cours (3 bits contre
  4 bits par composante).
- Ensuite : `DMACON` (`$DFF096`) avec sa logique SET/CLR (bit 15 = mettre ou effacer les bits
  désignés), puis `INTENA` (`$DFF09A`), même logique. Ce sont des exercices de manipulation de bits
  très formateurs.

> ⚠️ **Prérequis AMI-3 : corriger la fiche `demos-et-custom-chips.md`.** Plusieurs adresses du tableau
> semblent fausses par rapport au *Hardware Reference Manual*. Comparaison faite de mémoire, à
> vérifier sur une vraie référence avant de corriger :
>
> | Registre | Fiche actuelle | Adresse correcte (à confirmer) |
> |---|---|---|
> | DMACON | `$DFF09C` | `$DFF096` (`$DFF09C` = INTREQ) |
> | BPLCON0 / BPLCON1 | `$DFF08E` / `$DFF090` | `$DFF100` / `$DFF102` |
> | DIWSTRT / DIWSTOP | `$DFF09A` / `$DFF09E` | `$DFF08E` / `$DFF090` (`$DFF09A` = INTENA) |
> | COP1LCH/L | `$DFF088` / `$DFF08A` | `$DFF080` / `$DFF082` (`$DFF088` = COPJMP1) |
> | BPLxPTH/L | `$DFF080-086` | `$DFF0E0` et suivants |
> | BLTCON0 / BLTCON1 | `$DFF064` / `$DFF066` | `$DFF040` / `$DFF042` |
> | BLTSIZE | `$DFF050` | `$DFF058` |
>
> Les erreurs viennent probablement de l'extraction des sources. Les exercices AMI-3 ne doivent pas
> s'appuyer sur ces adresses avant correction.

## Ordre suggéré

1. **AST-2**, qui est le plus utile pédagogiquement (premier vrai « programme qui affiche ») et
   introduit `combinePlatforms`.
2. **AMI-1 + AMI-3 (couleurs seulement)** : petits, et donnent un parcours Amiga non vide.
3. **AST-3**, puis **AMI-2**.
4. **AST-4** en dernier (framebuffer, éventuellement un panneau d'affichage).

À chaque bloc : commit séparé, message en français (« AST-2 : … »), et mise à jour du tableau
« État des blocs » ci-dessus.
