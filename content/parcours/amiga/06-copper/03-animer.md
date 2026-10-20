## Le 68000 modifie la liste

Une liste Copper est une simple zone de mémoire : le 68000 peut changer ses valeurs **entre deux
images**, et le Copper appliquera la nouvelle version à l'image suivante. Pour animer, on repère
les mots à modifier par des **étiquettes** :

```asm
copper:
    DC.W    $0100,$0200
barre:
    DC.W    $4007,$FFFE     ; le WAIT du haut de la barre
    DC.W    $0180,$0F00     ; rouge
fin_barre:
    DC.W    $4807,$FFFE     ; 8 lignes plus bas
    DC.W    $0180,$0000     ; noir
    DC.W    $FFFF,$FFFE
```

Pour placer la barre à la ligne contenue dans D0, on fabrique le mot du WAIT :

```asm
    MOVE.W  D0,D1
    LSL.W   #8,D1           ; la ligne dans l'octet fort
    OR.W    #$07,D1         ; la position $06 et le bit 0 à 1
    MOVE.W  D1,barre        ; le nouveau WAIT
    ADD.W   #$0800,D1       ; 8 lignes plus bas
    MOVE.W  D1,fin_barre
```

## Au bon moment : une fois par image

Si l'on modifie la liste pendant que le Copper la lit, l'image peut être coupée en deux. On la
modifie donc **pendant le retour du faisceau**, en bas de l'écran. `attendre_vbl` (dans
`amiga-systeme.s`) attend que le faisceau atteigne la ligne 303, sous l'image visible :

```asm
.image:
    BSR     attendre_vbl    ; une fois par image, sous l'image visible
    ADDQ.W  #1,D0           ; la barre descend d'une ligne
    BSR     placer
    BTST    #6,$BFE001
    BNE.S   .image
```

## Une barre qui rebondit : les tables

Pour une trajectoire qui n'est pas une droite (un rebond, une ondulation), on ne calcule pas de
sinus au vol : on lit une **table** de positions calculée à l'avance, rangée dans le programme
avec `DC.B`, et un index qui avance à chaque image et revient au début à la fin de la table.

```asm
positions:
    DC.B    $40,$42,$46,$4C,$54,$5E,$6A,$78 ; ...
```

## Le manuel corrigé

L'exercice 2 du manuel Amiga fourni avec 68k Trainer déplace sa barre ainsi, mais il ne modifie
que le **premier** WAIT : le second reste à la ligne `$31`. Dès que la barre descend plus bas, ce
second WAIT est déjà dépassé quand le Copper y arrive, le noir revient aussitôt, et la barre
disparaît. Il faut déplacer les deux WAIT ensemble, comme ci-dessus (voir l'errata).
