## Les lignes au-delà de 255

L'image PAL fait 313 lignes, mais le WAIT ne compare que **8 bits** de la ligne et ne voit donc
que les numéros 0 à 255. Les lignes 256 à 312 portent les mêmes numéros que les lignes 0 à 56 : un
`DC.W $1007,$FFFE` attend la ligne `$10`, tout en haut de l'image, et sa condition reste remplie
pour tout le reste de l'image.

L'astuce classique consiste à attendre d'abord la fin de la ligne 255 :

```asm
    DC.W    $FFDF,$FFFE     ; attendre la fin de la ligne 255 (position $DE)
    DC.W    $1007,$FFFE     ; maintenant, $10 veut dire la ligne $110 (272)
    DC.W    $0180,$0F00
```

Après la ligne 255, le compteur sur 8 bits repart de 0, et le Copper attend bien la ligne
256 + `$10`. L'image standard (`DIWSTOP` = `$2CC1`) se termine à la ligne `$12C` (300), si bien que
ses 44 dernières lignes sont sous la ligne 255.

## Comparer seulement certains bits

Le second mot d'un WAIT est un masque, dont les bits 14-8 portent sur la ligne et les bits 7-1 sur
la position horizontale. Avec `$FFFE`, on compare tout. Avec `$80FE`, on ne compare que le bit 7 de
la ligne, qui l'est toujours, et la position : un tel WAIT est rempli à chaque ligne à partir de la
position demandée, ce qui sert à répéter un effet mais demande de la prudence.

Le bit 15 (*Blitter Finish Disable*), quand il est à 0, fait aussi attendre au WAIT que le Blitter
ait fini.

## SKIP

`SKIP` a la même forme que WAIT, avec le bit 0 du second mot à 1 : si le faisceau a déjà dépassé
la position, le Copper saute l'instruction suivante. Combiné à une écriture dans `COPJMP1` ou
`COPJMP2`, il permet des boucles dans la liste Copper, dont on se sert rarement.
