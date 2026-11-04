## La puce sonore du ST

Le son du ST vient d'une puce Yamaha **YM2149**, compatible avec la General Instrument
AY-3-8910/8912 citée par le manuel. Elle produit 3 voies (A, B, C) de sons carrés, un générateur de
bruit et une enveloppe de volume : c'est le son des jeux et des musiques « chiptune » du ST.

On la commande par 16 registres, à travers deux adresses du matériel, donc en mode superviseur, par
`Supexec` : on écrit en `$FF8800` le numéro du registre à modifier, puis en `$FF8802` sa valeur.

```asm
    MOVE.B  #8,$FFFF8800.W  ; registre 8 (volume de la voie A)
    MOVE.B  #15,$FFFF8802.W ; reçoit 15
```

Un seul `MOVE.L #$08000F00,$FFFF8800.W` fait les deux d'un coup, car l'octet fort va en `$FF8800`
et le troisième en `$FF8802`.

## Les registres

| Registres | Rôle |
|---|---|
| 0-1, 2-3, 4-5 | période des voies A, B, C (12 bits : octet faible, puis fort) |
| 6 | période du bruit (5 bits) |
| 7 | mixeur : bits 0-2 = son carré de A, B, C ; bits 3-5 = bruit sur A, B, C |
| 8, 9, 10 | volume de A, B, C (0 à 15 ; bit 4 à 1 = suivre l'enveloppe) |
| 11-12 | période de l'enveloppe |
| 13 | forme de l'enveloppe |

Dans le **mixeur**, un bit à 0 active la source et un bit à 1 la coupe : `%11111110` n'active que le
son carré de la voie A. On garde les bits 6 et 7 à 1, car sur le ST ils règlent des ports de la
puce qui servent au lecteur de disquette et à l'imprimante.

## De la période à la note

La puce est cadencée à 2 MHz, et la fréquence d'une voie vaut :

```text
fréquence = 2 000 000 / (16 × période)        donc   période = 125 000 / fréquence
```

| Note | Fréquence | Période |
|---|---|---|
| la (la 4) | 440 Hz | 284 |
| si | 494 Hz | 253 |
| do# | 554 Hz | 225 |
| ré | 587 Hz | 213 |
| mi | 659 Hz | 190 |

Doubler la période fait descendre la note d'une octave.

## Faire durer une note : la VBL

La puce joue toute seule tant qu'on ne change pas ses registres. Pour une mélodie, il faut changer
de note au bon moment, et on confie ce travail à une routine appelée 50 fois par seconde par la VBL.
La variable `_vblqueue` (`$456`) pointe vers une file de 8 adresses de routines, et à chaque VBL le
TOS appelle (`JSR`) chacune des adresses non nulles. On y place sa routine en superviseur, et on
l'enlève avant de quitter.

## Le plus simple : Dosound

Le TOS sait aussi jouer seul une liste de commandes, avec XBIOS 32, `Dosound(liste)`. Chaque
commande est un couple d'octets « registre, valeur », `$FF, n` attend n cinquantièmes de seconde et
`$FF, 0` termine la liste. C'est ainsi que le TOS fait sa sonnerie de Ctrl+G.

Dans 68k Trainer, le son s'entend en mode « Temps réel », quand la case du son, sous l'écran, est
cochée.
