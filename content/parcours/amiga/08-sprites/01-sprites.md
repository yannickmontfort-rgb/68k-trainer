## Huit sprites matériels

Un **sprite** est un petit dessin que Denise superpose à l'image sans toucher aux plans de bits :
on n'a ni à l'effacer ni à sauver le décor dessous. L'Amiga en a 8, numérotés de 0 à 7, larges
chacun de 16 pixels en basse résolution et aussi hauts qu'on veut. Le pointeur de la souris du
Workbench est le sprite 0.

## Le format d'un sprite

Un sprite est une liste de mots en Chip RAM :

```asm
sprite:
    DC.W    $6050,$7000     ; deux mots de contrôle : position et hauteur
    DC.W    %0000011111100000,%0000000000000000 ; ligne 1 : DATA, DATB
    DC.W    %0001111111111000,%0000011111100000 ; ligne 2
    ; ... une paire de mots par ligne ...
    DC.W    0,0             ; fin du sprite
```

Pour chaque ligne, les deux mots DATA et DATB donnent 2 bits par pixel, donc 3 couleurs et le
transparent :

| DATB | DATA | Pixel |
|---|---|---|
| 0 | 0 | transparent : on voit l'image dessous |
| 0 | 1 | couleur 1 du sprite |
| 1 | 0 | couleur 2 |
| 1 | 1 | couleur 3 |

Les sprites vont par paires qui partagent leurs couleurs : les sprites 0 et 1 utilisent
`COLOR17`, `COLOR18` et `COLOR19`, les sprites 2 et 3 `COLOR21` à `23`, 4 et 5 `COLOR25` à `27`,
6 et 7 `COLOR29` à `31`.

## Les mots de contrôle

Les positions se comptent comme celles du faisceau, à la manière de DIWSTRT : l'image standard
commence à la ligne `$2C` et à l'abscisse `$81`.

| Mot | Bits 15-8 | Bits 7-0 |
|---|---|---|
| premier (SPRxPOS) | les 8 bits bas de la ligne de départ, VSTART | les 8 bits hauts de l'abscisse, HSTART ÷ 2 |
| second (SPRxCTL) | les 8 bits bas de la ligne de fin, VSTOP (la ligne après la dernière) | bit 2 = bit 8 de VSTART, bit 1 = bit 8 de VSTOP, bit 0 = bit 0 de HSTART |

Pour un sprite de 16 lignes placé en (x, y) dans l'image standard :

```
HSTART = $81 + x        VSTART = $2C + y        VSTOP = VSTART + 16
```

## L'afficher et le déplacer

Le DMA des sprites (bit 5 de DMACON, SPREN) lit chaque sprite à partir de son pointeur `SPRxPT` :
`$120` pour le sprite 0, `$124` pour le 1, et ainsi de suite jusqu'à `$13C`. Comme ceux des plans,
ces pointeurs avancent pendant l'image, et c'est la liste Copper qui les remet à chaque image. Un
sprite dont on ne se sert pas doit pointer sur une liste vide, deux mots à 0, sinon il affiche ce
qu'il trouve en mémoire.

Pour déplacer un sprite, on réécrit ses deux mots de contrôle une fois par image, et le dessin ne
change pas : c'est ce qui rend les sprites si économiques.

## Devant ou derrière

`BPLCON2` règle la priorité entre les sprites et les plans. Avec `$0024`, tous les sprites passent
devant l'image ; avec 0, l'image passe devant eux, sauf là où elle est en couleur 0. Entre deux
sprites, le plus petit numéro est devant.
