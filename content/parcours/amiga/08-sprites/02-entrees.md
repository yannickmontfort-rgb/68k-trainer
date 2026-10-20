## Les boutons

Les boutons de « feu » sont lus par la **CIA-A**, dans l'octet `$BFE001`. Ils sont **actifs à
0** : le bit passe à 0 quand on appuie.

| Bit de `$BFE001` | Bouton |
|---|---|
| 6 | bouton gauche de la souris (port 1) |
| 7 | bouton du joystick (port 2) |

```asm
    BTST    #7,$BFE001      ; joystick : feu ?
    BEQ     tir             ; Z = 1 : le bit vaut 0, le bouton est enfoncé
```

Le bouton droit de la souris se lit ailleurs : bit 10 de `POTGOR` (`$DFF016`), à 0 quand il est
enfoncé.

## Le joystick

La direction du joystick (port 2) se lit dans `JOY1DAT` (`$DFF00C`). Le codage est un peu
tordu, hérité des compteurs de la souris :

| Direction | Comment la lire |
|---|---|
| droite | bit 1 |
| gauche | bit 9 |
| bas | bit 1 **EOR** bit 0 |
| haut | bit 9 **EOR** bit 8 |

```asm
    MOVE.W  $DFF00C,D0
    BTST    #1,D0           ; droite ?
    BNE     droite
    BTST    #9,D0           ; gauche ?
    BNE     gauche
    MOVE.W  D0,D1
    LSR.W   #1,D1
    EOR.W   D0,D1           ; bit 0 = bas, bit 8 = haut
    BTST    #0,D1
    BNE     bas
    BTST    #8,D1
    BNE     haut
```

## La souris

La souris (port 1) ne donne pas une position, mais deux **compteurs** de 8 bits dans `JOY0DAT`
(`$DFF00A`) : l'octet fort compte les mouvements verticaux, l'octet faible les horizontaux. Ils
avancent quand la souris va vers la droite (ou le bas) et reculent dans l'autre sens, en faisant
le tour de 255 à 0.

Pour suivre la souris, on garde la valeur de l'image précédente et on calcule la
**différence**, une fois par image, sur 8 bits signés :

```asm
    MOVE.W  $DFF00A,D0
    MOVE.B  D0,D1
    SUB.B   ancien_x,D1     ; déplacement horizontal depuis la dernière image
    MOVE.B  D0,ancien_x
    EXT.W   D1              ; signé : -128 à +127
    ADD.W   D1,souris_x
```

## Le clavier

Le clavier envoie un **code** pour chaque touche enfoncée ou relâchée, par le port série de la
CIA-A. À l'arrivée d'un octet, le bit 3 de l'ICR (`$BFED01`) passe à 1, et l'octet est dans le
registre `SDR` (`$BFEC01`). Il arrive inversé et décalé : on le remet à l'endroit ainsi :

```asm
    MOVE.B  $BFEC01,D0
    NOT.B   D0
    ROR.B   #1,D0           ; bits 6-0 = le code de la touche, bit 7 = 1 si elle est relâchée
```

Le clavier attend ensuite une « poignée de main » : on met brièvement le port série en sortie
(bit 6 de `$BFEE01`), environ 85 microsecondes. Quelques codes : Échap `$45`, Espace `$40`,
Entrée `$44`, flèches `$4C` (haut), `$4D` (bas), `$4E` (droite), `$4F` (gauche), F1 `$50`.

Tant que le système tourne, c'est lui qui lit le clavier (et Read peut renvoyer des lignes) : on
ne lit la CIA soi-même qu'après avoir coupé ses interruptions.
