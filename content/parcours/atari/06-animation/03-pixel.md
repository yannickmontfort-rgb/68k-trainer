## Le problème : 16 pixels par mot

Un sprite placé en X = 44 ne tombe pas sur un début de groupe : 44 = 2 × 16 + **12**. Ses pixels
commencent au 13ᵉ pixel du groupe n° 2… et ceux qui dépassent continuent dans le **groupe suivant**,
8 octets plus loin. Il faut donc :

1. **décaler** les bits du dessin de `X mod 16` vers la droite ;
2. écrire la partie gauche dans le premier groupe, et le **débordement** dans le second.

## L'astuce : travailler sur 32 bits

Si l'on décale un **mot** (`LSR.W`), les bits qui sortent à droite sont **perdus**. L'astuce est de
placer le dessin en haut d'un registre de **32 bits** et de le décaler en entier (`LSR.L`) : ce qui
déborde du mot fort descend simplement dans le mot faible.

```
    MOVEQ   #0,D0           ; tout le registre à 0
    MOVE.B  (A2)+,D0        ; 8 pixels du dessin (bits 7-0)
    ROR.L   #8,D0           ; -> bits 31-24
    LSR.L   D1,D0           ; décalage de X mod 16
    SWAP    D0
    OR.W    D0,(A0)         ; mot fort : premier groupe
    SWAP    D0
    OR.W    D0,8(A0)        ; mot faible : groupe suivant
```

`SWAP` échange les deux moitiés de D0 : c'est le moyen le plus rapide d'atteindre le mot fort.

Exemple avec un octet `$FF` et un décalage de 12 : `$FF000000` devient `$000FF000`. Mot fort
`$000F` : les 4 derniers pixels du premier groupe ; mot faible `$F000` : les 4 premiers du groupe
suivant.

Attention : un décalage écrit en immédiat (`LSR.L #n,D0`) ne va que de **1 à 8**. Au-delà, ou
quand le décalage varie, on le met dans un registre : `LSR.L D1,D0` (de 0 à 63).

## Le masque : ne pas abîmer le fond

`OR` allume des bits mais n'en éteint jamais. Sur un fond de couleur, les bits du fond restent
allumés **sous** le sprite et les couleurs se mélangent (couleur 1 + couleur 2 = couleur 3 !). La
technique complète, pour chaque plan :

```
    AND.W   masque_inversé,(A0)   ; 1) on fait un trou dans le fond
    OR.W    dessin,(A0)           ; 2) on y pose le dessin
```

Le **masque** a des 1 partout où le sprite a un pixel ; `NOT` le transforme en masque inversé (0
sous le sprite, 1 ailleurs). Un AND avec lui éteint les bits sous le sprite et laisse le reste
intact. Le masque se décale exactement comme le dessin.

## Une routine du manuel à corriger

La routine 7.3 du manuel (« déplacement au pixel près ») contient plusieurs erreurs : la même
erreur d'alignement que PSET, un `ADDA.L` avec un mot fort jamais remis à zéro, et surtout un
décalage sur **16 bits** (`LSR.W`) qui perd le débordement, suivi d'un `SWAP` qui ramène… un mot
fort qui n'a jamais été préparé. Tu vas la réparer en exercice.
