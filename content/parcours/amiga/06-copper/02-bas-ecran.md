## Les lignes au-delà de 255

L'image PAL fait 313 lignes, mais le WAIT ne compare que **8 bits** de la ligne : il ne voit que
les numéros de 0 à 255. Les lignes 256 à 312 portent les mêmes numéros que 0 à 56 : un
`DC.W $1007,$FFFE` attend la ligne `$10`… tout en haut de l'image, et la condition est déjà
remplie pour le reste de l'image.

L'astuce classique :

```asm
    DC.W    $FFDF,$FFFE     ; attendre la fin de la ligne 255 (position $DE)
    DC.W    $1007,$FFFE     ; maintenant, $10 veut dire la ligne $110 (272)
    DC.W    $0180,$0F00
```

Après la ligne 255, le compteur sur 8 bits repart de 0 : le Copper attend donc bien la ligne
256 + `$10`. L'image standard (`DIWSTOP` = `$2CC1`) se termine à la ligne `$12C` (300) : ses 44
dernières lignes sont sous la ligne 255.

## Comparer seulement certains bits

Le second mot d'un WAIT est un **masque** : les bits 14-8 pour la ligne, 7-1 pour la position
horizontale. Avec `$FFFE`, on compare tout. Avec `$80FE`, on ne compare que le bit 7 de la ligne
(toujours comparé) et la position : un tel WAIT est rempli **à chaque ligne** à partir de la
position demandée… pratique pour répéter un effet, mais à manier avec précaution.

Le bit 15 (*Blitter Finish Disable*) : à 0, le WAIT attend aussi que le **Blitter** ait fini.

## SKIP

`SKIP` a la même forme que WAIT, avec le **bit 0 du second mot à 1** : si le faisceau a déjà
dépassé la position, le Copper **saute** l'instruction suivante. Combiné à une écriture dans
`COPJMP1` ou `COPJMP2`, il fait des boucles dans la liste Copper. On s'en sert rarement.
