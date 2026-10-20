## Au pixel près

Le Blitter travaille par mots de 16 pixels. Pour poser un dessin à une abscisse qui n'est pas un
multiple de 16, il **décale** les données de A (et de B) vers la droite, de 0 à 15 bits, au vol :

- les bits 15-12 de `BLTCON0` : **ASH**, le décalage de A ;
- les bits 15-12 de `BLTCON1` : **BSH**, le décalage de B.

Pour un dessin à l'abscisse x : décalage = **x mod 16**, et le premier mot de destination est
celui qui contient x, soit l'octet `(x ÷ 16) × 2` de la ligne.

```asm
    MOVE.W  D0,D1           ; D0 = x
    AND.W   #15,D1          ; le décalage
    ROR.W   #4,D1           ; dans les bits 15-12
    OR.W    #$09F0,D1       ; A et D, D = A
    MOVE.W  D1,$40(A5)      ; BLTCON0
```

## Le mot de plus

En se décalant, un dessin de 16 pixels déborde sur le mot suivant : il en occupe **deux**. On
blitte donc **un mot de plus par ligne**… mais ce mot supplémentaire de la source contient
n'importe quoi. Les **masques** règlent le problème :

- `BLTAFWM` (*First Word Mask*) s'applique au **premier** mot de chaque ligne de A ;
- `BLTALWM` (*Last Word Mask*) au **dernier**.

Avec `BLTALWM` = `$0000`, le mot de plus est vidé avant d'être décalé : seuls les bits qui
débordent du mot précédent arrivent dans la destination. La source lit donc un mot de trop par
ligne : son modulo vaut **−2** pour revenir au bon endroit.

```asm
    MOVE.W  #$FFFF,$44(A5)  ; BLTAFWM : premier mot entier
    MOVE.W  #$0000,$46(A5)  ; BLTALWM : dernier mot vidé
    MOVE.W  #-2,$64(A5)     ; BLTAMOD : on recule d'un mot à chaque ligne de la source
    MOVE.W  #40-4,$66(A5)   ; BLTDMOD : 2 mots écrits par ligne d'un écran de 40 octets
    MOVE.W  #(16<<6)|2,$58(A5) ; 16 lignes de 2 mots
```

Le dessin de 16 × 16 est rangé d'un seul tenant (1 mot par ligne) : sans le `−2`, la deuxième
ligne commencerait un mot trop loin.
