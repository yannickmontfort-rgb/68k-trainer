---
title: "Registres, mémoire et binaire/hexadécimal"
source: "cours_asm_68000.pdf — Le Féroce Lapin, Volume 1, cours 2 à 4 (adapté) ; M68000PRM (Motorola). Complétée et corrigée le 21/10/2026."
themes: ["transfert", "adressage"]
---

# Registres, mémoire et binaire/hexadécimal

## Compter en binaire et en hexadécimal

Un ordinateur ne connaît que deux états (courant / pas de courant), notés `1` et `0` : un **bit**
(*binary digit*). Avec *n* bits, on peut coder 2ⁿ combinaisons possibles.

| Bits | Possibilités | Valeurs non signées | Valeurs signées (complément à 2) |
|---|---|---|---|
| 1 | 2 | 0 à 1 | — |
| 4 | 16 | 0 à 15 | — |
| 8 | 256 | 0 à 255 | −128 à 127 |
| 16 | 65 536 | 0 à 65 535 | −32 768 à 32 767 |
| 32 | 4 294 967 296 | 0 à 4 294 967 295 | −2 147 483 648 à 2 147 483 647 |

Regroupements usuels :

- 1 bit = **bit**
- 4 bits = **nibble** (quartet)
- 8 bits = **byte** (octet), taille `.B`
- 16 bits = **word** (mot), taille `.W`
- 32 bits = **long word** (mot long), taille `.L`

L'écriture binaire d'un nombre devient vite illisible (16 chiffres pour un word). On regroupe donc
les bits par paquets de 4 (nibbles) et on les note en **hexadécimal** (base 16, chiffres `0-9` puis
`A-F` pour 10-15) : **un chiffre hexadécimal = 4 bits**, un octet = 2 chiffres, un mot = 4, un long = 8.

**Notation des bases** (préfixe devant le nombre) :

| Préfixe | Base | Exemple |
|---|---|---|
| `%` | binaire | `%1101` |
| `$` | hexadécimal | `$D` |
| *(rien)* | décimal | `13` |

Exemple : `%1101` = `$D` = 13 (décimal). On peut aussi écrire un caractère entre apostrophes :
`'A'` vaut `$41` (code ASCII).

### Les nombres négatifs : le complément à 2

Le 68000 code les entiers signés en **complément à 2** : pour obtenir −*n*, on inverse tous les bits
de *n* (`NOT`) puis on ajoute 1 (c'est exactement ce que fait l'instruction `NEG`). Le bit de poids
fort (bit 7, 15 ou 31 selon la taille) est le **bit de signe** : 1 = négatif.

| Valeur | Octet | Mot |
|---|---|---|
| 1 | `$01` | `$0001` |
| −1 | `$FF` | `$FFFF` |
| −2 | `$FE` | `$FFFE` |
| −128 | `$80` | `$FF80` |

Le **même motif de bits** peut donc se lire de deux façons : `$FF` vaut 255 en non signé, −1 en signé.
C'est le **branchement** choisi après une comparaison qui décide de l'interprétation (`BHI`/`BCS`…
pour le non signé, `BGT`/`BLT`… pour le signé, voir [la référence](reference-meyne-hoppenot.md)).

## Les registres du 68000

Le 68000 possède **17 registres de 32 bits** pour les calculs et les adresses, plus le compteur de
programme et le registre d'état :

- **8 registres de données** `D0`-`D7` — pour manipuler des valeurs quelconques.
- **8 registres d'adresse** `A0`-`A7` — pour manipuler des adresses mémoire. `A7` est le **pointeur
  de pile** (`SP`) ; il en existe deux exemplaires : `USP` (mode utilisateur) et `SSP` (mode
  superviseur), d'où le compte de 17.
- Le **PC** (*Program Counter*, 32 bits dont 24 utilisés sur le 68000) — l'adresse de la
  **prochaine** instruction à lire.
- Le **SR** (*Status Register*, 16 bits) — les flags et l'état du processeur (voir plus bas).

Électriquement, un registre d'adresse et un registre de données sont identiques (32 bits) ; la
distinction est une convention d'usage renforcée par le processeur lui-même :

- **Registre de données** : une opération sur un octet ou un mot ne modifie que la partie basse du
  registre (les 8 ou 16 bits de poids faible) — le reste n'est ni lu ni modifié.
- **Registre d'adresse** : n'accepte **pas** d'opérande de taille octet (`.B`). En **destination**,
  le registre entier est toujours affecté : un mot est **étendu en signe** sur 32 bits avant d'être
  écrit. En **source**, seule la partie utile (mot ou long) est lue.
- Les instructions vers un registre d'adresse (`MOVEA`, `ADDA`, `SUBA`) **ne modifient pas les flags**.

Transférer une valeur *vers* un registre d'adresse utilise `MOVEA` (*MOVE Address*) plutôt que
`MOVE` — l'assembleur fait cette substitution lui-même si on écrit `MOVE`.

```asm
        MOVE.L  #$12345678,D0   ; D0 = $12345678
        MOVE.B  #$AA,D0         ; seul l'octet de poids faible change : D0 = $123456AA
        MOVE.W  #$BEEF,D0       ; seul le mot de poids faible change : D0 = $1234BEEF

        MOVEA.L #$12345678,A0   ; A0 = $12345678 (registre entier)
        MOVEA.W #$1234,A0       ; A0 = $00001234 : le mot est étendu sur 32 bits (bit 15 à 0)
        MOVEA.W #$8000,A0       ; A0 = $FFFF8000 : bit 15 à 1, donc 16 bits à 1 devant
```

Un registre de 32 bits contient deux *words* (poids fort / poids faible), eux-mêmes composés
chacun de deux *bytes*. `SWAP Dn` échange les deux mots ; `EXT.W` / `EXT.L` étendent le signe d'un
octet vers un mot, ou d'un mot vers un long.

```asm
        MOVE.L  #$12345678,D0
        SWAP    D0              ; D0 = $56781234
        MOVE.B  #$F0,D1         ; octet bas de D1 = $F0 (−16 en signé)
        EXT.W   D1              ; mot bas de D1 = $FFF0 (toujours −16)
        EXT.L   D1              ; D1 = $FFFFFFF0
```

> **Astuce** : `MOVEQ #n,Dn` charge une petite valeur (−128 à 127) dans **tout** le registre (étendue
> sur 32 bits) en une seule instruction de 2 octets, plus courte et plus rapide que `MOVE.L #n,Dn`.

## La mémoire comme un ruban d'octets

La mémoire se représente comme un long ruban d'octets. Chaque case a une **adresse** (sa
distance depuis le début du ruban) ; une donnée sur un mot occupe 2 cases consécutives, un long en
occupe 4. Le 68000 est **big endian** : l'octet de **poids fort** est rangé à l'adresse la plus
**basse**.

```asm
        MOVE.L  #$12345678,$1000 ; $1000 = $12, $1001 = $34, $1002 = $56, $1003 = $78
        MOVE.W  $1000,D0         ; D0.W = $1234 (les deux premiers octets)
        MOVE.B  $1003,D1         ; D1.B = $78
```

> Le 68000 ne peut lire ou écrire un **mot** ou un **long** qu'à une **adresse paire** — une adresse
> impaire déclenche une **erreur d'adresse** (exception n° 3 ; sur l'Atari ST : 3 bombes ; sur
> l'Amiga : un Guru Meditation). Les octets, eux, peuvent être à n'importe quelle adresse.

Le PC est lui-même une adresse. Sur le 68000, le bus d'adresse fait **24 bits** : l'espace adressable
est de 16 Mo (`$000000` à `$FFFFFF`), et les 8 bits de poids fort d'une adresse sont ignorés. Écrire
quand même les adresses sur 32 bits (`$FFFF8240` plutôt que `$FF8240`) garde un programme valable
sur les 68020 et suivants (Atari TT/Falcon, Amiga 1200).

## Le registre d'état (Status Register / SR)

Le SR est un registre de 16 bits ; son octet bas est le **CCR** (*Condition Code Register*) :

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

- En **mode utilisateur**, on ne peut modifier que le CCR (`MOVE …,CCR`, `ANDI #…,CCR`) ; le 68000
  laisse lire le SR entier (`MOVE SR,…`), pas les 68010 et suivants. Modifier le SR entier (`MOVE #$2700,SR`) ou exécuter `STOP`, `RESET`, `RTE` est une **violation
  de privilège** (exception n° 8).
- Le passage en mode superviseur se fait par une exception (`TRAP`, interruption…) ou un appel
  système prévu pour ça (`Super`/`Supexec` sous TOS, `Supervisor`/`SuperState` sous Exec).
- `MOVE #$2700,SR` (superviseur, masque 7) bloque toutes les interruptions sauf le niveau 7 ;
  `MOVE #$2300,SR` est le niveau normal du TOS sur l'Atari ST.

Le détail du positionnement des flags et des branchements qui les testent est dans la fiche
[Référence](reference-meyne-hoppenot.md) ; les exceptions et les modes du processeur sont traités
dans les chapitres « superviseur et vecteurs » du parcours.

> Fiche complétée et corrigée le 21/10/2026 (Claude) : complément à 2, big endian, EXT/MOVEQ,
> tableau des flags, modes du processeur — à relire.
