## Chip RAM, Fast RAM

L'Amiga a deux sortes de mémoire, et la différence compte énormément :

- la **Chip RAM** (512 Ko sur un A500, à partir de `$000000`) est partagée entre le 68000 et les
  **puces custom**. Tout ce que les puces doivent lire, l'image à afficher, les listes du Copper,
  les sons, les dessins pour le Blitter, **doit** être en Chip RAM ;
- la **Fast RAM** n'est visible que du 68000. Les puces ne peuvent pas y lire. Sur un A500, la
  carte d'extension de 512 Ko (en `$C00000`) n'est pas vraiment rapide, on l'appelle **Slow
  RAM**, mais pour les puces c'est pareil : elle leur est invisible.

Une image rangée hors de la Chip RAM ne fait pas planter la machine : les puces lisent simplement
autre chose, et l'écran affiche n'importe quoi. C'est un bogue classique, et silencieux.

## Demander de la mémoire : AllocMem

Un programme ne choisit pas lui-même où ranger ses données : il les **demande à exec**.

```asm
    MOVEA.L 4.W,A6
    MOVE.L  #10240,D0       ; D0 = la taille, en octets
    MOVE.L  #$10002,D1      ; D1 = le type : MEMF_CHIP + MEMF_CLEAR
    JSR     -198(A6)        ; AllocMem : D0 = l'adresse du bloc, ou 0
    TST.L   D0
    BEQ     plusdememoire
    MOVE.L  D0,tampon
```

Le type est une somme de **drapeaux** :

| Drapeau | Valeur | Sens |
|---|---|---|
| `MEMF_ANY` | 0 | n'importe laquelle (Fast RAM de préférence) |
| `MEMF_PUBLIC` | 1 | partageable avec les autres tâches |
| `MEMF_CHIP` | 2 | **Chip RAM** obligatoire |
| `MEMF_FAST` | 4 | Fast RAM obligatoire |
| `MEMF_CLEAR` | `$10000` | remplie de zéros |

`AllocMem` renvoie **0** s'il n'y a plus assez de mémoire : il faut toujours tester D0.

## Rendre la mémoire : FreeMem

Exec ne libère rien tout seul, même quand ton programme se termine. Tout bloc reçu doit être
rendu avec `FreeMem(adresse, taille)(A1, D0)` (−210), **avec exactement la même taille** :

```asm
    MOVEA.L tampon,A1
    MOVE.L  #10240,D0
    MOVEA.L 4.W,A6
    JSR     -210(A6)        ; FreeMem
```

Rendre deux fois le même bloc, ou une mauvaise taille, abîme les listes de la mémoire libre : le
vrai Amiga s'arrête sur un **Guru Meditation #81000009**. Oublier de rendre un bloc ne plante
rien, mais cette mémoire est perdue jusqu'au prochain redémarrage.

## Combien en reste-t-il ?

`AvailMem(type)(D1)` (−216) renvoie dans D0 le nombre d'octets libres du type demandé. Avec
`MEMF_LARGEST` (`$20000`) en plus, il renvoie la taille du plus **grand bloc** d'un seul tenant :
c'est elle qui compte pour réserver un écran entier.

## Dans 68k Trainer

Le programme lui-même est chargé en `$1000`, en Chip RAM. `AllocMem` donne la Chip RAM libre à
partir de `$40000`, et la Slow RAM à partir de `$C00000` quand on ne demande pas `MEMF_CHIP`.
