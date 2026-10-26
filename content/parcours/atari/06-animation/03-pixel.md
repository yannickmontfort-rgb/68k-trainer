## Le problème : 16 pixels par mot

Un sprite placé en X = 44 ne tombe pas sur un début de groupe, puisque 44 = 2 × 16 + 12. Ses pixels
commencent au 13ᵉ pixel du groupe n° 2, et ceux qui dépassent continuent dans le groupe suivant,
8 octets plus loin. Il faut donc décaler les bits du dessin de `X mod 16` vers la droite, puis
écrire la partie gauche dans le premier groupe et le débordement dans le second.

## Travailler sur 32 bits

Si l'on décale un mot avec `LSR.W`, les bits qui sortent à droite sont perdus. On place donc le
dessin en haut d'un registre de 32 bits et on décale le registre entier avec `LSR.L` : ce qui
déborde du mot fort descend simplement dans le mot faible.

```asm
    MOVEQ   #0,D0           ; tout le registre à 0
    MOVE.B  (A2)+,D0        ; 8 pixels du dessin (bits 7-0)
    ROR.L   #8,D0           ; -> bits 31-24
    LSR.L   D1,D0           ; décalage de X mod 16
    SWAP    D0
    OR.W    D0,(A0)         ; mot fort : premier groupe
    SWAP    D0
    OR.W    D0,8(A0)        ; mot faible : groupe suivant
```

`SWAP` échange les deux moitiés de D0, et c'est le moyen le plus rapide d'atteindre le mot fort.
Avec un octet `$FF` et un décalage de 12, `$FF000000` devient `$000FF000` : le mot fort `$000F`
donne les 4 derniers pixels du premier groupe, le mot faible `$F000` les 4 premiers du groupe
suivant.

Un décalage écrit en immédiat (`LSR.L #n,D0`) ne va que de 1 à 8. Au-delà, ou quand le décalage
varie, on le met dans un registre, `LSR.L D1,D0`, qui accepte de 0 à 63.

## Le masque

`OR` allume des bits mais n'en éteint jamais. Sur un fond de couleur, les bits du fond restent
allumés sous le sprite et les couleurs se mélangent : la couleur 1 posée sur la couleur 2 donne la
couleur 3. On fait donc d'abord un trou dans le fond, plan par plan, avant d'y poser le dessin :

```text
    AND.W   masque_inversé,(A0)   ; 1) un trou dans le fond
    OR.W    dessin,(A0)           ; 2) le dessin dans le trou
```

Le **masque** a des 1 partout où le sprite a un pixel, et `NOT` en fait le masque inversé, à 0 sous
le sprite et à 1 ailleurs. Le AND éteint ainsi les bits sous le sprite sans toucher au reste, et le
masque se décale exactement comme le dessin.

## Une routine du manuel à corriger

La routine 7.3 du manuel, « déplacement au pixel près », contient plusieurs erreurs : la même erreur
d'alignement que PSET, un `ADDA.L` avec un mot fort jamais remis à zéro, et surtout un décalage sur
16 bits (`LSR.W`) qui perd le débordement, suivi d'un `SWAP` qui ramène un mot fort jamais préparé.
Tu la répares en exercice.
