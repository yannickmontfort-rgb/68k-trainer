## Déboguer sur l'Amiga

Quand un programme plante sur un vrai Amiga, la boîte rouge « Software Failure » affiche le
**Guru Meditation** : `#0000000N.xxxxxxxx`. N est le numéro de l'exception du 68000 (3 pour une
erreur d'adresse, 4 pour une instruction illégale, 5 pour une division par zéro…), et la seconde
partie l'adresse de la tâche. Les codes qui commencent par `8` viennent d'exec lui-même :
`#81000009` signale une mémoire rendue deux fois.

Les débogueurs de l'époque, MonAm (avec Devpac) ou celui d'ASM-One, permettent comme 68k Trainer
d'avancer pas à pas, de poser des points d'arrêt, de lire les registres et la mémoire. Un
programme qui a coupé le système, ses interruptions et son DMA, ne peut cependant plus être suivi
par un débogueur qui compte sur ce système.

## Les règles d'or

1. Tout ce que lisent les puces est en Chip RAM : listes Copper, plans, sprites, sons
   (`SECTION …,DATA_C` ou `BSS_C`, ou `AllocMem` avec `MEMF_CHIP`).
2. On attend le Blitter avant de toucher à ses registres ou de lire ce qu'il a écrit.
3. Le bit 15 de DMACON, INTENA et INTREQ dit si l'on allume (SET) ou si l'on éteint (CLR).
4. On rend le système exactement comme on l'a trouvé : DMA, interruptions, vecteurs, liste
   Copper, vue, Blitter, Permit, mémoire, bibliothèques.
5. Une routine d'interruption efface sa demande dans INTREQ avant le `RTE`.
6. Aucune adresse en dur, sauf `$4` et les registres des puces : ExecBase, les bibliothèques et la
   mémoire se demandent au système.
7. On ne compte pas sur la vitesse, car un Amiga 1200 ou 4000 va plus vite qu'un A500 : on se
   cale sur le faisceau ou la VBL, jamais sur des boucles d'attente.

## Ce que 68k Trainer ne simule pas

L'Amiga simulé reste simple, et ses quelques différences avec le vrai ne changent rien aux
programmes de ce parcours :

- le Blitter fait son travail d'un coup, mais reste « occupé » le temps qu'il lui faudrait ;
- le 68000 n'est jamais ralenti par les puces qui lisent la Chip RAM ;
- le Copper change les couleurs au bon endroit de la ligne, mais les autres registres de l'image
  sont pris en compte pour la ligne entière ;
- il n'y a ni disquette, ni écran entrelacé, ni collisions de sprites, et un seul programme tourne
  à la fois.

Si un programme marche ici mais pas sur ta machine, signale-le (voir « À propos »).
