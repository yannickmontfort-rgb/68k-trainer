## Une boucle, c'est un saut en arrière

Pour répéter une action, le programme revient en arrière tant qu'une condition est vraie. On peut
compter les tours soi-même et brancher :

```asm
    MOVE.W  #10,D0      ; 10 tours
BOUCLE:
    ; ... le travail à répéter ...
    SUBQ.W  #1,D0       ; un tour de moins
    BNE     BOUCLE      ; on recommence tant que D0 n'est pas nul
```

## DBRA, la boucle du 68000

`DBRA Dn,etiquette` (*Decrement and Branch*, aussi écrit `DBF`) retire 1 au mot faible de Dn,
puis saute à l'étiquette, sauf si Dn.W vient de passer à −1 (`$FFFF`) : la boucle s'arrête alors
et le programme continue.

```asm
    MOVE.W  #9,D0       ; 9 + 1 = 10 tours
BOUCLE:
    ; ... le travail à répéter ...
    DBRA    D0,BOUCLE
```

Comme la boucle s'arrête à −1 et non à 0, elle fait **N + 1 tours** quand le compteur part de N :
pour 10 tours, on part donc de 9. C'est l'erreur « à un près » la plus fréquente sur 68000.

Les variantes `DBcc`, comme `DBEQ` ou `DBNE`, arrêtent aussi la boucle dès que la condition cc est
vraie, ce qui sert pour chercher un élément.

## Parcourir une chaîne de caractères

Une chaîne se termine par un octet nul, et on la parcourt avec un pointeur postincrémenté jusqu'à
ce 0.

```asm
    LEA     TEXTE,A0
BOUCLE:
    MOVE.B  (A0)+,D1    ; lit un caractère et avance
    BEQ     FIN         ; MOVE a positionné Z : c'était le 0 final
    ; ... traiter le caractère D1 ...
    BRA     BOUCLE
FIN:
```

`MOVE` positionne déjà les flags, et il n'y a donc pas besoin d'un `TST` après.
