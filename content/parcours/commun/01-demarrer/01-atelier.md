## Ce que le 68000 comprend vraiment

Le Motorola 68000 de [[atari:l'Atari ST|amiga:l'Amiga]] ne comprend que des nombres : chaque
instruction qu'il exécute est un code binaire rangé en mémoire. Le mot `$303C`, par exemple,
signifie pour lui « charge une valeur de 16 bits dans le registre D0 ».

Comme écrire ces codes à la main serait épuisant, on écrit le programme en langage assembleur, avec
des noms faciles à retenir appelés mnémoniques :

```asm
    MOVE.W  #5,D0       ; mets 5 dans le registre D0
```

Un programme, l'assembleur, traduit ensuite ce texte en codes machine. Chaque ligne d'instruction
devient un code machine et rien d'autre, ce qui rend l'assembleur à la fois très direct et très
exigeant.

:::atari
## L'atelier, sur un vrai ST et ici

| Sur un Atari ST (Devpac 2) | Dans 68k Trainer |
|---|---|
| GENST : éditeur et assembleur | l'éditeur et l'assembleur de 68k Trainer, avec la syntaxe de Devpac |
| MONST : débogueur pas à pas | le panneau Pas à pas : registres, registre d'état, pile, mémoire, écran |
| le TOS, système de l'Atari | un TOS simulé : les principaux appels système, la mémoire et l'écran d'un 1040 STF |

Le 68000 simulé exécute les mêmes codes machine que le vrai : ce que tu écris ici tourne aussi sur
un Atari ST ou dans Hatari.
:::
:::amiga
## L'atelier, sur un vrai Amiga et ici

| Sur un Amiga (Devpac 2 ou ASM-One) | Dans 68k Trainer |
|---|---|
| GenAm ou ASM-One : éditeur et assembleur | l'éditeur et l'assembleur de 68k Trainer, avec la syntaxe de Devpac |
| MonAm ou le débogueur d'ASM-One | le panneau Pas à pas : registres, registre d'état, pile, mémoire, écran, puces |
| le Kickstart en ROM et AmigaOS | un Kickstart 1.3 simulé : exec, dos, graphics et les puces d'un Amiga 500 |

Le 68000 simulé exécute les mêmes codes machine que le vrai : ce que tu écris ici tourne aussi sur
un Amiga ou dans WinUAE et FS-UAE.
:::

## Comment avancer dans le parcours

Chaque notion commence par un cours court, suivi d'un exemple corrigé que tu exécutes pas à pas en
lisant l'explication de chaque ligne. Vient ensuite une prédiction, où tu lis un programme et
devines ce qu'il fera avant de l'exécuter, puis des exercices de plus en plus autonomes : à
compléter (●○○), guidés (●●○), puis seul (●●●).

Chaque chapitre se termine par un QCM. Les défis bonus ★ sont facultatifs et ne comptent pas dans
ta progression.
