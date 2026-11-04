## Du source au programme

Sur un vrai Amiga, on écrit son programme dans ASM-One ou Devpac (GenAm), et l'assembleur produit
un **exécutable AmigaDOS** : un fichier sans extension qu'on lance depuis le Shell en tapant son
nom. Dans 68k Trainer, le bouton « Exporter pour l'Amiga » fabrique ce même fichier.

## Le format « hunk »

Un exécutable AmigaDOS est découpé en **hunks**, des morceaux de code (`HUNK_CODE`), de données
(`HUNK_DATA`) ou de zone vide (`HUNK_BSS`). Pour chacun, le fichier dit dans quelle mémoire le
charger, Chip, Fast ou n'importe laquelle, et donne une table de relocations, la liste des
adresses absolues à corriger. La fonction `LoadSeg` d'AmigaDOS charge chaque hunk là où elle
trouve de la place, puis ajoute à ces adresses l'endroit réel du chargement.

C'est pourquoi un programme Amiga ne contient jamais de `ORG` : il ne sait pas d'avance où il sera
en mémoire, et 68k Trainer refuse d'exporter un programme qui en a un.

## Les sections et la Chip RAM

Les directives `SECTION` découpent le source en hunks :

```asm
    SECTION code,CODE           ; le programme : n'importe quelle mémoire
    SECTION donnees,DATA_C      ; des données en Chip RAM : listes Copper, images, sons
    SECTION ecran,BSS_C         ; une zone vide en Chip RAM : les plans de bits
```

Le suffixe `_C` demande la Chip RAM, `_F` la Fast RAM. Sur un A500 sans extension, tout est en
Chip RAM de toute façon ; mais sur un A500 avec sa carte de 512 Ko, ou sur un A1200 avec de la
Fast RAM, un écran rangé sans `_C` serait invisible pour les puces.

68k Trainer range tout le programme dans un seul hunk, exactement comme il l'exécute (code,
données, puis zone vide), et le place en Chip RAM dès qu'une section l'a demandé.

## Lancer le programme

Nos programmes sont prévus pour le Shell, le CLI : ils finissent par `RTS` avec un code de retour
dans D0, 0 quand tout va bien, 5 pour un avertissement, 10 pour une erreur, 20 pour un échec.

Lancé depuis une icône du Workbench, un programme doit d'abord récupérer le message que le
Workbench lui envoie (`WaitPort` puis `GetMsg` sur son port de processus) et le lui rendre
(`ReplyMsg`) avant de finir, et il n'a pas de fenêtre de Shell où écrire. Le bouton « Exporter
pour l'Amiga » ajoute devant ton programme un petit code de démarrage qui s'en charge : lancé par
une icône, il ouvre une fenêtre console (que `Output()` renvoie), attend Entrée à la fin, puis
répond au Workbench ; lancé depuis le Shell, il ne change rien.

## L'essayer

Dans un émulateur, WinUAE (Windows) ou FS-UAE (Windows, macOS, Linux), on configure un Amiga 500
avec un 68000, le Kickstart 1.3 et 512 Ko de Chip RAM. Sans ROM Kickstart, ils peuvent utiliser
la ROM libre d'AROS, compatible avec le Kickstart 1.3 pour ce que nous faisons. On partage un
dossier du PC comme disque dur de l'Amiga, et on y dépose l'exécutable.

Sur un vrai Amiga, l'exécutable arrive par une disquette, une carte Gotek ou un disque dur, et se
lance depuis le Shell.
