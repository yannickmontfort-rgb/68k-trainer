## Ce que le 68000 comprend vraiment

Le microprocesseur **Motorola 68000** de l'Atari ST ne comprend qu'une chose : des **nombres**. Chaque
instruction qu'il exécute est un code binaire rangé en mémoire. Par exemple, le mot `$303C`
signifie pour lui « charge une valeur de 16 bits dans le registre D0 ».

Écrire directement ces codes serait épuisant. On écrit donc le programme en **langage
assembleur**, avec des noms faciles à retenir (les *mnémoniques*) :

```asm
    MOVE.W  #5,D0       ; mets 5 dans le registre D0
```

Un programme, l'**assembleur**, traduit ce texte en codes machine. Il n'y a presque aucune magie :
chaque ligne d'instruction devient un code machine, et rien d'autre. C'est ce qui rend
l'assembleur si direct… et si exigeant.

## L'atelier : sur un vrai ST, et ici

| Sur un Atari ST (Devpac 2) | Dans 68k Trainer |
|---|---|
| **GENST** : éditeur + assembleur | L'éditeur de code + l'assembleur **vasm** (même syntaxe que Devpac) |
| **MONST** : débogueur pas à pas | Le panneau **Pas à pas** : registres, registre d'état, pile, mémoire, écran |
| Le **TOS**, système de l'Atari | Un TOS **simulé** : les principaux appels système, la mémoire et l'écran d'un 1040 STF |

Tout ce que tu apprends ici fonctionne sur un vrai Atari ST (ou dans un émulateur comme Hatari) :
le 68000 simulé exécute exactement les mêmes codes machine que le vrai.

## Comment avancer dans ce parcours

Chaque notion suit le même chemin :

1. un **cours** court ;
2. un **exemple corrigé** que tu exécutes pas à pas, en lisant l'explication de chaque ligne ;
3. un exercice de **prédiction** : tu lis un programme et tu devines ce qu'il fera, *avant* de
   l'exécuter ;
4. des **exercices** de plus en plus autonomes : à compléter (niveau ●○○), guidé (●●○), puis seul
   (●●●).

À la fin de chaque chapitre, un **QCM** valide tes acquis. Les **défis bonus ★** sont
facultatifs : ils ne comptent pas dans ta progression, ils sont là pour le plaisir.
