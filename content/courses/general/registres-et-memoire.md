---
title: "Registres, mémoire et binaire/hexadécimal"
source: "cours_asm_68000.pdf — Le Féroce Lapin, Volume 1, cours 2 à 4 (adapté) ; M68000PRM (Motorola). Complétée et corrigée le 21/10/2026."
themes: ["transfert", "adressage"]
---

# Registres, mémoire et binaire/hexadécimal

## Compter en binaire et en hexadécimal

Un ordinateur ne connaît que deux états, le courant passe ou ne passe pas, qu'on note `1` et `0` :
c'est le **bit** (*binary digit*). Avec *n* bits, on code 2ⁿ combinaisons.

| Bits | Possibilités | Valeurs non signées | Valeurs signées (complément à 2) |
|---|---|---|---|
| 1 | 2 | 0 à 1 | — |
| 4 | 16 | 0 à 15 | — |
| 8 | 256 | 0 à 255 | −128 à 127 |
| 16 | 65 536 | 0 à 65 535 | −32 768 à 32 767 |
| 32 | 4 294 967 296 | 0 à 4 294 967 295 | −2 147 483 648 à 2 147 483 647 |

Les bits se regroupent en paquets qui ont chacun leur nom :

- 1 bit = bit
- 4 bits = nibble (quartet)
- 8 bits = byte (octet), taille `.B`
- 16 bits = word (mot), taille `.W`
- 32 bits = long word (mot long), taille `.L`

Écrit en binaire, un nombre devient vite illisible, puisqu'un mot demande déjà 16 chiffres. On
regroupe donc les bits par quatre et on note chaque paquet en **hexadécimal**, la base 16, avec les
chiffres `0-9` puis `A-F` pour 10 à 15. Un chiffre hexadécimal vaut ainsi 4 bits : un octet s'écrit
avec 2 chiffres, un mot avec 4 et un long avec 8.

La base se marque par un préfixe devant le nombre :

| Préfixe | Base | Exemple |
|---|---|---|
| `%` | binaire | `%1101` |
| `$` | hexadécimal | `$D` |
| *(rien)* | décimal | `13` |

`%1101`, `$D` et 13 sont donc le même nombre. On peut aussi écrire un caractère entre apostrophes :
`'A'` vaut `$41`, son code ASCII.

### Les nombres négatifs : le complément à 2

Le 68000 code les entiers signés en complément à 2 : pour obtenir −*n*, il inverse tous les bits de
*n*, comme `NOT`, puis ajoute 1, et c'est exactement ce que fait l'instruction `NEG`. Le bit de
poids fort (bit 7, 15 ou 31 selon la taille) sert de bit de signe, à 1 quand le nombre est négatif.

| Valeur | Octet | Mot |
|---|---|---|
| 1 | `$01` | `$0001` |
| −1 | `$FF` | `$FFFF` |
| −2 | `$FE` | `$FFFE` |
| −128 | `$80` | `$FF80` |

Le même motif de bits se lit donc de deux façons : `$FF` vaut 255 en non signé et −1 en signé. C'est
le branchement choisi après une comparaison qui décide de l'interprétation, `BHI`/`BCS`… pour le non
signé, `BGT`/`BLT`… pour le signé (voir [la référence](reference-meyne-hoppenot.md)).

## Les registres du 68000

Le 68000 possède 17 registres de 32 bits pour les calculs et les adresses, auxquels s'ajoutent le
compteur de programme et le registre d'état :

- 8 registres de données, `D0`-`D7`, pour des valeurs quelconques ;
- 8 registres d'adresse, `A0`-`A7`, pour les adresses mémoire. `A7` est le pointeur de pile (`SP`)
  et il en existe deux exemplaires, `USP` pour le mode utilisateur et `SSP` pour le mode
  superviseur, d'où le compte de 17 ;
- le PC (*Program Counter*), 32 bits dont 24 utilisés sur le 68000, qui contient l'adresse de la
  prochaine instruction à lire ;
- le SR (*Status Register*), 16 bits, qui porte les flags et l'état du processeur (voir plus bas).

Électriquement, un registre d'adresse et un registre de données sont identiques, mais le processeur
lui-même renforce la convention d'usage qui les distingue :

- Dans un registre de données, une opération sur un octet ou un mot ne touche que la partie basse
  (les 8 ou 16 bits de poids faible), et le reste n'est ni lu ni modifié.
- Un registre d'adresse n'accepte pas d'opérande de taille octet. En destination, il est toujours
  écrit en entier : un mot y est **étendu en signe** sur 32 bits. En source, seule la partie utile
  (mot ou long) est lue.
- Les instructions vers un registre d'adresse (`MOVEA`, `ADDA`, `SUBA`) ne modifient pas les flags.

Pour transférer une valeur vers un registre d'adresse, on écrit `MOVEA` (*MOVE Address*), et si on
écrit `MOVE`, l'assembleur fait la substitution lui-même.

```asm
        MOVE.L  #$12345678,D0   ; D0 = $12345678
        MOVE.B  #$AA,D0         ; seul l'octet de poids faible change : D0 = $123456AA
        MOVE.W  #$BEEF,D0       ; seul le mot de poids faible change : D0 = $1234BEEF

        MOVEA.L #$12345678,A0   ; A0 = $12345678 (registre entier)
        MOVEA.W #$1234,A0       ; A0 = $00001234 : le mot est étendu sur 32 bits (bit 15 à 0)
        MOVEA.W #$8000,A0       ; A0 = $FFFF8000 : bit 15 à 1, donc 16 bits à 1 devant
```

Un registre de 32 bits contient deux mots, celui de poids fort et celui de poids faible, faits
chacun de deux octets. `SWAP Dn` échange les deux mots, et `EXT.W` / `EXT.L` étendent le signe d'un
octet vers un mot, ou d'un mot vers un long.

```asm
        MOVE.L  #$12345678,D0
        SWAP    D0              ; D0 = $56781234
        MOVE.B  #$F0,D1         ; octet bas de D1 = $F0 (−16 en signé)
        EXT.W   D1              ; mot bas de D1 = $FFF0 (toujours −16)
        EXT.L   D1              ; D1 = $FFFFFFF0
```

`MOVEQ #n,Dn` charge une petite valeur, de −128 à 127, dans tout le registre en l'étendant sur 32
bits ; l'instruction ne fait que 2 octets et va plus vite que `MOVE.L #n,Dn`.

## La mémoire comme un ruban d'octets

La mémoire se représente comme un long ruban d'octets où chaque case a une adresse, sa distance
depuis le début du ruban. Un mot occupe 2 cases consécutives et un long en occupe 4. Le 68000 est
**big endian** : il range l'octet de poids fort à l'adresse la plus basse.

```asm
        MOVE.L  #$12345678,$1000 ; $1000 = $12, $1001 = $34, $1002 = $56, $1003 = $78
        MOVE.W  $1000,D0         ; D0.W = $1234 (les deux premiers octets)
        MOVE.B  $1003,D1         ; D1.B = $78
```

Le 68000 ne lit ou n'écrit un mot ou un long qu'à une adresse paire. Une adresse impaire déclenche
une erreur d'adresse, l'exception n° 3, qui donne 3 bombes sur l'Atari ST et un Guru Meditation sur
l'Amiga. Les octets, eux, peuvent se trouver à n'importe quelle adresse.

Le PC est lui-même une adresse. Sur le 68000, le bus d'adresse fait 24 bits, si bien que l'espace
adressable est de 16 Mo (`$000000` à `$FFFFFF`) et que les 8 bits de poids fort d'une adresse sont
ignorés. Écrire quand même les adresses sur 32 bits (`$FFFF8240` plutôt que `$FF8240`) garde un
programme valable sur les 68020 et suivants (Atari TT/Falcon, Amiga 1200).

## Le registre d'état (Status Register / SR)

Le SR est un registre de 16 bits dont l'octet bas forme le CCR (*Condition Code Register*) :

```
bit   15 14 13 12 11 10 9  8  7 6 5 4 3 2 1 0
      T  .  S  .  .  I2 I1 I0 . . . X N Z V C
```

| Bit | Nom | Rôle |
|---|---|---|
| 0 | **C** (*Carry*) | retenue (addition) ou emprunt (soustraction), dernier bit sorti d'un décalage |
| 1 | **V** (*oVerflow*) | débordement **signé** : le résultat ne tient pas dans la taille choisie |
| 2 | **Z** (*Zero*) | le résultat vaut 0 |
| 3 | **N** (*Negative*) | le bit de signe du résultat est à 1 |
| 4 | **X** (*eXtend*) | copie de C pour les calculs en plusieurs morceaux (`ADDX`, `SUBX`, `ROXL`…) |
| 8-10 | **I2 I1 I0** | masque d'interruption : seules les interruptions de niveau **supérieur** sont acceptées (le niveau 7 l'est toujours) |
| 13 | **S** (*Supervisor*) | 1 = mode superviseur, 0 = mode utilisateur |
| 15 | **T** (*Trace*) | 1 = exception après **chaque** instruction (c'est le pas-à-pas des débogueurs) |

En mode utilisateur, on ne peut modifier que le CCR (`MOVE …,CCR`, `ANDI #…,CCR`). Le 68000 laisse
lire le SR entier (`MOVE SR,…`), ce que les 68010 et suivants interdisent. Modifier le SR entier
(`MOVE #$2700,SR`) ou exécuter `STOP`, `RESET` ou `RTE` provoque une violation de privilège,
l'exception n° 8. On passe en mode superviseur par une exception (`TRAP`, interruption…) ou par un
appel système prévu pour cela, `Super`/`Supexec` sous TOS, `Supervisor`/`SuperState` sous Exec.

Une fois en superviseur, `MOVE #$2700,SR` met le masque à 7 et bloque toutes les interruptions sauf
celles de niveau 7, tandis que `MOVE #$2300,SR` correspond au niveau normal du TOS sur l'Atari ST.

Le détail du positionnement des flags et des branchements qui les testent se trouve dans la fiche
[Référence](reference-meyne-hoppenot.md) ; les exceptions et les modes du processeur sont traités
dans les chapitres « superviseur et vecteurs » du parcours.

> Fiche complétée et corrigée le 21/10/2026 (Claude) : complément à 2, big endian, EXT/MOVEQ,
> tableau des flags, modes du processeur.
