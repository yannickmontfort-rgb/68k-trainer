## Un piège du 68000 devenu une boîte à outils

Quand le 68000 rencontre un mot d'instruction qui commence par `$A`, il ne l'exécute pas : il
déclenche une exception et saute au vecteur 10, à l'adresse `$28`. Le TOS a branché sur ce vecteur
ses primitives graphiques, celles dont se sert aussi le GEM pour dessiner, et c'est ce qu'on appelle
la Ligne A.

L'assembleur ne connaît pas ces instructions, et on les écrit donc comme des données :

```asm
    DC.W    $A000           ; Ligne A n° 0 : initialisation
```

## $A000 d'abord

La fonction `$A000` rend dans A0 l'adresse des **variables de la Ligne A**, une zone de mémoire où
l'on dépose les paramètres des autres fonctions. Comme la Ligne A peut modifier D0-D2 et A0-A2, à
l'image du TOS, on recopie aussitôt cette adresse dans un registre préservé, A5 par exemple.

| Décalage | Variable | Rôle |
|---|---|---|
| 8 | `INTIN` | adresse du tableau des entiers |
| 12 | `PTSIN` | adresse du tableau des coordonnées |
| 24 à 30 | `COLBIT0` à `COLBIT3` | la couleur du tracé, un mot par plan |
| 32 | `LSTLIN` | en OU exclusif, 0 : le dernier point n'est pas tracé |
| 34 | `LN_MASK` | le motif du trait, `$FFFF` pour un trait plein |
| 36 | `WRT_MODE` | le mode d'écriture |
| 38 à 44 | `X1`, `Y1`, `X2`, `Y2` | les extrémités de la ligne |

## Allumer, lire, tracer

`$A001` allume le pixel dont les coordonnées sont rangées dans PTSIN, x puis y, avec la couleur
rangée dans INTIN. `$A002` lit la couleur du pixel désigné par PTSIN et la rend dans D0.

`$A003` trace une ligne de (X1, Y1) à (X2, Y2). Sa couleur se donne plan par plan : pour la couleur
5, qui s'écrit `%0101`, COLBIT0 et COLBIT2 valent 1, COLBIT1 et COLBIT3 valent 0. Le motif LN_MASK
se lit bit par bit le long de la ligne en commençant par le bit 15, et la Ligne A le laisse décalé
d'autant de bits que la ligne compte de pixels.

## Les modes d'écriture

| WRT_MODE | Mode | Là où le motif vaut 1 | Là où il vaut 0 |
|---|---|---|---|
| 0 | remplacement | la couleur | le fond, couleur 0 |
| 1 | transparent | la couleur | rien ne change |
| 2 | OU exclusif | le pixel est inversé | rien ne change |
| 3 | transparent inversé | rien ne change | la couleur |

Le OU exclusif a une propriété précieuse : tracer deux fois la même ligne la fait disparaître et
rend le décor intact, ce qui sert pour un curseur ou pour le rectangle élastique d'une sélection.

## Ce que simule 68k Trainer

Le simulateur connaît `$A000` à `$A003`, ainsi que `$A009` et `$A00A`, qui montrent et cachent la
souris, et ses tracés sont identiques à ceux d'EmuTOS. Les autres fonctions, comme les rectangles
pleins, le texte ou la forme de la souris, se découvrent dans Hatari avec le bouton « Essayer ».
