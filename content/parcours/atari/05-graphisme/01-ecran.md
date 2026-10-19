## L'écran est de la mémoire

Sur l'Atari ST, il n'y a pas de carte graphique : l'image affichée est **une zone de la mémoire
vive** de 32 000 octets, le *framebuffer*. Le circuit vidéo (le **Shifter**) la relit 50 fois par
seconde pour fabriquer l'image. Écrire dans cette zone, c'est dessiner.

Son adresse s'obtient avec **XBIOS 2, `Physbase`** (l'écran affiché) ou **XBIOS 3, `Logbase`**
(l'écran où le TOS dessine). Sur un 1040 ST, c'est généralement `$F8000`. Ce n'est pas une zone
protégée : un programme en mode utilisateur peut y écrire.

## Les trois résolutions

| Résolution | Pixels | Couleurs | Plans de bits | Octets par ligne |
|---|---|---|---|---|
| Basse | 320 × 200 | 16 | 4 | 160 |
| Moyenne | 640 × 200 | 4 | 2 | 160 |
| Haute (moniteur monochrome) | 640 × 400 | 2 | 1 | 80 |

On travaille ici en **basse résolution**, celle des jeux et des démos.

## Les plans de bits entrelacés

Avec 16 couleurs, chaque pixel a besoin de **4 bits** (0 à 15). Mais ces 4 bits ne sont pas
rangés côte à côte ! L'écran est découpé en **groupes de 16 pixels**, et chaque groupe occupe
**4 mots consécutifs** (8 octets), un par **plan** :

```
  adresse du groupe +0 : plan 0  (bit 0 de la couleur des 16 pixels)
                    +2 : plan 1  (bit 1)
                    +4 : plan 2  (bit 2)
                    +6 : plan 3  (bit 3)
```

Dans chaque mot, le **bit 15 est le pixel de gauche** et le bit 0 celui de droite. La couleur
d'un pixel se lit verticalement, en prenant son bit dans chacun des quatre plans.

Exemple : un pixel de couleur 5 (`%0101`) a son bit à 1 dans les plans 0 et 2, et à 0 dans les
plans 1 et 3.

## Trouver l'adresse d'un pixel

Une ligne fait 320 pixels = 20 groupes × 8 octets = **160 octets**. Pour le pixel (X, Y) :

```
adresse du groupe  = écran + Y × 160 + (X ÷ 16) × 8
numéro du bit      = 15 − (X modulo 16)
```

Attention : `(X ÷ 16) × 8` se calcule **avec une division entière d'abord**. En assembleur :
`LSR.W #4` (÷ 16) puis `LSL.W #3` (× 8), ou `LSR.W #1` puis `AND.W #$FFF8`. Écrire simplement
« X ÷ 2 » est une erreur (on la retrouvera dans une routine du manuel).

## Allumer, éteindre, choisir une couleur

Pour modifier un pixel sans abîmer ses 15 voisins du même mot, on utilise les masques du
chapitre 3 :

- `OR.W` avec un masque `%0000 0100 0000 0000` met le bit à 1 ;
- `AND.W` avec le masque **inversé** le met à 0.

Pour donner la couleur c au pixel, on le traite plan par plan : bit à 1 dans le plan n si le bit n
de c vaut 1, bit à 0 sinon.
