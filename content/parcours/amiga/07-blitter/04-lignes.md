## Tracer des lignes

En **mode ligne** (bit 0 de `BLTCON1`), le Blitter trace un segment avec l'algorithme de
Bresenham, un point par « ligne » de son rectangle. On lui donne :

| Registre | Valeur |
|---|---|
| `BLTCON0` | x1 mod 16 dans les bits 15-12, canaux A, C, D (`$0B00`), minterm `$CA` (A posé sur C) |
| `BLTCON1` | l'octant (bits 4-2), le bit SIGN (6), le bit LINE (0) |
| `BLTAPTL` | 4 × dmin − 2 × dmax, l'accumulateur de Bresenham |
| `BLTAMOD`, `BLTBMOD` | 4 × (dmin − dmax), 4 × dmin |
| `BLTCPT`, `BLTDPT` | l'adresse du mot qui contient le point de départ |
| `BLTCMOD`, `BLTDMOD` | la largeur de l'écran en octets |
| `BLTADAT`, `BLTBDAT` | `$8000` (un point), `$FFFF` (trait plein, ou un motif pointillé) |
| `BLTSIZE` | (dmax + 1) × 64 + 2 |

dmax et dmin sont la plus grande et la plus petite des deux distances |x2 − x1| et |y2 − y1|.

## L'octant

Les trois bits d'octant disent dans quelle direction avance le tracé. SUD (bit 4) indique que le
pas « parfois » est vertical, c'est-à-dire que la ligne est plus large que haute ; SUL (bit 3)
que ce pas va vers le haut ou vers la gauche ; AUL (bit 2) que le pas « toujours » va vers le
haut ou vers la gauche.

La routine de l'exemple calcule tout cela à partir de (x1, y1) et (x2, y2). Elle a été vérifiée
point par point contre l'algorithme de Bresenham, dans les 8 directions.

## Remplir

En **mode remplissage**, le Blitter parcourt chaque ligne de droite à gauche et passe de
« dehors » à « dedans », ou l'inverse, à chaque bit à 1 qu'il rencontre : il remplit ainsi les
zones comprises entre deux bords.

| Bit de `BLTCON1` | Nom | Rôle |
|---|---|---|
| 3 | IFE (*Inclusive Fill*) | les bords font partie de la zone |
| 4 | EFE (*Exclusive Fill*) | le bord de gauche n'en fait pas partie |
| 1 | DESC | le mode descendant, obligatoire pour remplir |

On copie la zone sur elle-même (A = D, minterm `$F0`), avec les pointeurs sur le dernier mot de
la zone, en bas à droite, puisqu'en mode descendant le Blitter avance vers les adresses basses.

Pour remplir un polygone, on trace ses bords en ne gardant qu'un point par ligne (bit 1 de
`BLTCON1` en mode ligne, SING), puis on remplit : c'est ainsi que les démos dessinent leurs objets
3D en faces pleines.
