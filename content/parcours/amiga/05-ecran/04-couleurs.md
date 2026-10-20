## Empiler les plans

Avec **n** plans, chaque pixel a n bits, un dans chaque plan : il peut prendre **2ⁿ** couleurs.
Le numéro de couleur d'un pixel se lit en prenant **le bit du plan 1 comme bit 0**, celui du
plan 2 comme bit 1, et ainsi de suite :

| Plan 3 | Plan 2 | Plan 1 | Couleur | Registre |
|---|---|---|---|---|
| 0 | 0 | 0 | 0 | `COLOR00` (`$180`) |
| 0 | 0 | 1 | 1 | `COLOR01` (`$182`) |
| 0 | 1 | 0 | 2 | `COLOR02` (`$184`) |
| 0 | 1 | 1 | 3 | `COLOR03` (`$186`) |
| 1 | 0 | 0 | 4 | `COLOR04` (`$188`) |
| … | | | | |

Le registre de la couleur n est en `$DFF180 + 2 × n`.

| Plans | Couleurs | Mémoire (320 × 256) |
|---|---|---|
| 1 | 2 | 10 Ko |
| 2 | 4 | 20 Ko |
| 3 | 8 | 30 Ko |
| 4 | 16 | 40 Ko |
| 5 | 32 | 50 Ko |

Le nombre de plans va dans les bits 14-12 de `BPLCON0` : `$1200` pour 1 plan, `$2200` pour 2,
`$5200` pour 5. Chaque plan a son pointeur : `BPL1PT` (`$0E0`), `BPL2PT` (`$0E4`), `BPL3PT`
(`$0E8`)…

## Dessiner en couleur

Pour donner la couleur 3 à un pixel, il faut allumer son bit dans le plan 1 **et** dans le plan 2.
Pour la couleur 2 : l'allumer dans le plan 2, et l'**éteindre** dans le plan 1. Un pixel
« effacé » est un pixel dont tous les bits sont à 0 : il prend la couleur du fond.

## Six plans et plus

En basse résolution, l'A500 accepte jusqu'à **6 plans**, avec deux modes spéciaux :

- **Extra Half-Brite** (6 plans) : les couleurs 32 à 63 sont les couleurs 0 à 31 à **demi-
  luminosité**, pour 64 couleurs à l'écran avec seulement 32 registres ;
- **HAM** (*Hold And Modify*, bit 11 de `BPLCON0`) : les plans 5 et 6 disent si le pixel prend
  une couleur de la palette ou s'il **modifie** une composante (rouge, vert ou bleu) du pixel
  précédent. Les 4096 couleurs à l'écran, au prix de franges colorées.

En haute résolution (640 pixels de large, bit 15 de `BPLCON0`), on est limité à 4 plans.

## Pourquoi pas toujours 32 couleurs ?

Chaque plan coûte 10 Ko de Chip RAM. Et jusqu'à 4 plans en basse résolution, Agnus lit l'image
pendant des créneaux que le 68000 n'utilise pas ; au-delà, il doit lui **prendre** une partie de
ses accès à la Chip RAM, et le programme ralentit. Les jeux choisissent souvent 4 ou 5 plans.
(68k Trainer ne simule pas ce ralentissement.)
