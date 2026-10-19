## Une boucle, c'est un saut en arrière

Répéter une action, c'est revenir en arrière dans le programme tant qu'une condition est vraie.
Deux grandes façons de faire.

### Avec un compteur et un branchement

```asm
    MOVE.W  #10,D0      ; 10 tours
BOUCLE:
    ; ... le travail à répéter ...
    SUBQ.W  #1,D0       ; un tour de moins
    BNE     BOUCLE      ; tant que D0 n'est pas nul, on recommence
```

### Avec DBRA, la boucle du 68000

`DBRA Dn,etiquette` (*Decrement and Branch*, aussi écrit `DBF`) fait trois choses en une
instruction :

1. il **retire 1** au mot faible de Dn ;
2. si Dn.W vaut **−1** (`$FFFF`), il s'arrête et passe à la suite ;
3. sinon, il saute à l'étiquette.

```asm
    MOVE.W  #9,D0       ; 9 + 1 = 10 tours !
BOUCLE:
    ; ... le travail à répéter ...
    DBRA    D0,BOUCLE
```

⚠️ Comme la boucle s'arrête à −1 et non à 0, elle fait **N + 1 tours** quand le compteur part de
N. Pour 10 tours, on initialise donc à **9**. C'est l'erreur « à un près » la plus fréquente en
assembleur 68000.

Il existe aussi `DBcc` (`DBEQ`, `DBNE`…) : la boucle s'arrête **aussi** dès que la condition cc
est vraie. Pratique pour chercher un élément.

## Parcourir une chaîne de caractères

Une chaîne se termine par un octet nul. On l'explore avec un pointeur postincrémenté, jusqu'au 0 :

```asm
    LEA     TEXTE,A0
BOUCLE:
    MOVE.B  (A0)+,D1    ; lit un caractère et avance
    BEQ     FIN         ; MOVE a positionné Z : c'était le 0 final
    ; ... traiter le caractère D1 ...
    BRA     BOUCLE
FIN:
```

Remarque : `MOVE` positionne déjà les flags, pas besoin d'un `TST` après.
