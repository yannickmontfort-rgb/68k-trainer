## Huit sprites matériels

Un **sprite** est un petit dessin que Denise superpose à l'image, **sans toucher aux plans de
bits** : pas besoin de l'effacer ni de sauver le décor. L'Amiga en a **8**, numérotés de 0 à 7.
Chacun fait **16 pixels de large** (en basse résolution), et autant de lignes de haut qu'on veut.
Le pointeur de la souris du Workbench est le sprite 0.

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

Pour chaque ligne, les deux mots (**DATA** et **DATB**) donnent 2 bits par pixel, donc **3
couleurs** et le transparent :

| DATB | DATA | Pixel |
|---|---|---|
| 0 | 0 | transparent : on voit l'image dessous |
| 0 | 1 | couleur 1 du sprite |
| 1 | 0 | couleur 2 |
| 1 | 1 | couleur 3 |

Les sprites vont par paires et partagent leurs couleurs : les sprites 0 et 1 utilisent
`COLOR17`, `COLOR18` et `COLOR19` ; 2 et 3, `COLOR21` à `23` ; 4 et 5, `COLOR25` à `27` ; 6 et 7,
`COLOR29` à `31`.

## Les mots de contrôle

Les positions sont celles du faisceau (comme pour DIWSTRT) : l'image standard commence en
ligne `$2C` et en abscisse `$81`.

- **premier mot** (SPRxPOS) : bits 15-8 = les 8 bits bas de la **ligne de départ** (VSTART) ;
  bits 7-0 = les 8 bits hauts de l'**abscisse** (HSTART ÷ 2) ;
- **second mot** (SPRxCTL) : bits 15-8 = les 8 bits bas de la **ligne de fin** (VSTOP, la ligne
  après la dernière) ; bit 2 = bit 8 de VSTART, bit 1 = bit 8 de VSTOP, bit 0 = bit 0 de HSTART.

Pour un sprite de 16 lignes en x, y de l'image standard :

```
HSTART = $81 + x        VSTART = $2C + y        VSTOP = VSTART + 16
```

## L'afficher

Le DMA des sprites (bit 5 de DMACON, SPREN) lit chaque sprite à partir de son pointeur
`SPRxPT` (`$120` pour le sprite 0, `$124` pour le 1… jusqu'à `$13C`). Comme les pointeurs des
plans, ils avancent pendant l'image : la **liste Copper** les remet à chaque image.

Les sprites dont on ne se sert pas doivent pointer sur une **liste vide** (deux mots à 0), sinon
ils affichent ce qu'ils trouvent en mémoire.

## Le déplacer

Pour bouger un sprite, il suffit de réécrire ses deux mots de contrôle une fois par image : le
dessin, lui, ne change pas. C'est ce qui rend les sprites si économiques.

## Devant ou derrière

`BPLCON2` règle la priorité entre les sprites et les plans. Avec `$0024`, tous les sprites
passent **devant** l'image ; avec 0, l'image passe devant eux (sauf là où elle est en couleur 0).
Entre sprites, le plus petit numéro est devant.
