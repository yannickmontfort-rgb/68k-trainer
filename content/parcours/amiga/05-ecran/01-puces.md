## Trois puces autour du 68000

Le graphisme et le son de l'Amiga reposent sur ses puces custom, le chipset OCS de l'A500, qui
travaillent en même temps que le 68000 :

| Puce | Rôle |
|---|---|
| Agnus | le chef d'orchestre : les accès directs à la mémoire (DMA), le Copper, le Blitter, la position du faisceau |
| Denise | l'affichage : les plans de bits, la palette, les sprites, la souris |
| Paula | le son (4 voies), les interruptions, le lecteur de disquette, le port série |

On les commande par des **registres** de 16 bits, rangés à partir de l'adresse `$DFF000`. Chaque
registre a un décalage et un nom : `COLOR00`, la couleur 0, est en `$DFF180`, `DMACON` en
`$DFF096`. Les programmeurs gardent souvent `$DFF000` dans A5 et écrivent
`MOVE.W #$0F00,$180(A5)`.

## Écrire ou lire, pas les deux

La plupart de ces registres sont en écriture seule : on y écrit, mais les relire donne n'importe
quoi. Quand il faut connaître un état, on lit un registre jumeau, prévu pour la lecture :

| On écrit dans… | On lit dans… | Contenu |
|---|---|---|
| `DMACON` (`$096`) | `DMACONR` (`$002`) | les canaux DMA actifs |
| `INTENA` (`$09A`) | `INTENAR` (`$01C`) | les interruptions autorisées |
| `INTREQ` (`$09C`) | `INTREQR` (`$01E`) | les interruptions demandées |
| `ADKCON` (`$09E`) | `ADKCONR` (`$010`) | réglages du son et du disque |

Les couleurs, les pointeurs et les réglages de l'écran s'écrivent, et ne se relisent pas.

## Le bit 15 : mettre à 1 ou mettre à 0

`DMACON`, `INTENA`, `INTREQ` et `ADKCON` ne s'écrivent pas comme les autres registres : leur
**bit 15** dit ce qu'on fait des bits à 1 du reste du mot. Quand il vaut 1 (SET), ces bits passent
à 1 ; quand il vaut 0 (CLR), ils passent à 0. Dans les deux cas, les bits à 0 du mot écrit ne
changent rien.

```asm
    MOVE.W  #$8020,$96(A5)  ; $8000 + $0020 : allumer le DMA des sprites, sans toucher au reste
    MOVE.W  #$0020,$96(A5)  ; l'éteindre
    MOVE.W  #$7FFF,$96(A5)  ; tout éteindre d'un coup
```

Les principaux bits de `DMACON` :

| Bit | Valeur | Nom | Canal |
|---|---|---|---|
| 9 | `$0200` | DMAEN | l'interrupteur général : sans lui, aucun canal ne marche |
| 8 | `$0100` | BPLEN | les plans de bits (l'image) |
| 7 | `$0080` | COPEN | le Copper |
| 6 | `$0040` | BLTEN | le Blitter |
| 5 | `$0020` | SPREN | les sprites |
| 0-3 | `$000F` | AUD0EN-AUD3EN | les 4 voies du son |

## 4096 couleurs

Une couleur s'écrit `$0RGB`, avec 4 bits de rouge, 4 de vert et 4 de bleu, chacun de 0 à `$F`,
soit 16 × 16 × 16 = 4096 couleurs possibles. Le bleu du Workbench 1.3 est `$05A`, le blanc `$FFF`,
l'orange `$F80`.

L'écran en montre au plus 32 à la fois, sauf modes spéciaux, rangées dans les registres `COLOR00`
à `COLOR31`, de `$DFF180` à `$DFF1BE`. `COLOR00` est la couleur du fond et de la bordure autour de
l'image.

## Où en est le faisceau ?

L'image est dessinée ligne par ligne par un faisceau, 50 fois par seconde, et Agnus dit à tout
moment où il en est. L'octet fort de `VHPOSR` (`$DFF006`) donne la ligne (bits 7-0) et son octet
faible la position horizontale ; le bit 0 de `VPOSR` (`$DFF004`) est le 9e bit de la ligne, car une
image PAL a 313 lignes.

L'image standard commence à la ligne `$2C` (44) et fait 256 lignes. Cette boucle attend que le
faisceau atteigne la ligne `$80` :

```asm
.attente:
    CMP.B   #$80,$DFF006    ; octet fort de VHPOSR : la ligne
    BNE.S   .attente
```

C'est le moyen le plus simple de faire quelque chose à un endroit précis de l'écran.
