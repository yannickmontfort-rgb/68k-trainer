---
title: "Registres, mémoire et binaire/hexadécimal"
source: "cours_asm_68000.pdf — Le Féroce Lapin, Volume 1, cours 2 à 4 (adapté, contenu spécifique Atari ST/MONST omis)"
themes: ["transfert", "adressage"]
---

# Registres, mémoire et binaire/hexadécimal

## Compter en binaire et en hexadécimal

Un ordinateur ne connaît que deux états (courant / pas de courant), notés `1` et `0` : un **bit**
(*binary digit*). Avec *n* bits, on peut coder 2ⁿ combinaisons possibles.

| Bits | Possibilités |
|---|---|
| 1 | 2 |
| 4 | 16 |
| 8 | 256 |
| 16 | 65536 |

Regroupements usuels :

- 1 bit = **bit**
- 4 bits = **nibble**
- 8 bits = **byte** (octet)
- 16 bits = **word** (mot)
- 32 bits = **long word** (mot long)

L'écriture binaire d'un nombre devient vite illisible (16 chiffres pour un word). On regroupe donc
les bits par paquets de 4 (nibbles) et on les note en **hexadécimal** (base 16, chiffres `0-9` puis
`A-F` pour 10-15).

**Notation des bases** (préfixe devant le nombre) :

| Préfixe | Base |
|---|---|
| `%` | binaire |
| `$` | hexadécimal |
| *(rien)* | décimal |

Exemple : `%1101` = `$D` = 13 (décimal).

## Registres de données et registres d'adresse

Le 68000 possède **17 "poches"** internes (registres) où stocker temporairement des valeurs,
toutes codées sur 32 bits (un long mot) :

- **8 registres de données** `D0`-`D7` — pour manipuler des valeurs quelconques.
- **8 registres d'adresse** `A0`-`A7` (+ `A7'`, la pile superviseur, voir plus loin) — pour manipuler
  des adresses mémoire.
- Le **PC** (*Program Counter*) — pointe vers l'instruction en cours d'exécution.

Électriquement, un registre d'adresse et un registre de données sont identiques (32 bits) ; la
distinction est une convention d'usage renforcée par le processeur lui-même :

- **Registre de données** : une opération sur un octet/word ne modifie que la partie basse du
  registre (les 8 ou 16 bits de poids faible) — le reste n'est ni lu ni modifié.
- **Registre d'adresse** : n'accepte **pas** d'opérande de taille octet (`.B`). En **destination**,
  le registre entier est toujours affecté, quelle que soit la taille de l'opération (le word manipulé
  est étendu en signe sur 32 bits avant d'être écrit). En **source**, seule la partie utile
  (word ou long) est lue.

Transférer une valeur *vers* un registre d'adresse utilise automatiquement `MOVEA` (*MOVE
ADDRESS*) plutôt que `MOVE` — l'assembleur fait cette substitution lui-même.

```asm
MOVE.L  #$12345678,D0   ; D0 = $12345678
MOVE.B  #$AA,D0         ; seul l'octet de poids faible change : D0 = $123456AA

MOVEA.L #$12345678,A0   ; A0 = $12345678 (registre entier affecté)
MOVEA.W #$12345678,A0   ; A0 = $000012345678 tronqué/étendu — le registre ENTIER est affecté,
                         ; contrairement à un registre de données
```

Un registre codé sur 32 bits contient deux *words* (poids fort / poids faible), eux-mêmes
composés chacun de deux *bytes* (poids fort / poids faible). `SWAP Dn` échange le word de
poids fort avec celui de poids faible.

```asm
MOVE.L #$12345678,D0
SWAP   D0             ; D0 devient $56781234
```

## La mémoire comme un ruban adressable

La mémoire se représente comme un long ruban d'octets. Chaque case a une **adresse** (sa
distance depuis le début du ruban) ; une donnée sur un word occupe 2 cases consécutives, une
donnée sur un long word en occupe 4.

```asm
MOVE.B #$F0, $FF9001   ; écrit l'octet $F0 à l'adresse $FF9001
```

> Le 68000 ne peut accéder qu'à des **adresses paires** pour un word ou un long word — accéder à
> une adresse impaire déclenche une erreur ("erreur d'adresse").

Le **PC** est lui-même une adresse : il indique en permanence où, dans le ruban mémoire, se
trouve l'instruction que le processeur est en train de lire/exécuter. Sur le 68000, le PC est codé
sur 24 bits, soit un espace adressable de 16 Mo.

## Le registre d'état (Status Register / SR)

Le SR est un registre de 16 bits qui reflète l'état du processeur :

```
bit   15 14 13 12 11 10 9  8  7 6 5 4 3 2 1 0
      T  .  S  .  .  I2 I1 I0 . . . X N Z V C
```

- **X N Z V C** — le *Condition Code Register* (CCR), l'octet bas du SR (voir la fiche
  [Référence Meyne/Hoppenot](reference-meyne-hoppenot.md) pour le détail de chaque bit).
- **T** (*Trace*) — mode pas-à-pas : quand il est à 1, le processeur s'interrompt après **chaque**
  instruction pour exécuter une routine de mise au point (c'est ce mécanisme qu'utilisent les
  débogueurs pour l'exécution pas-à-pas).
- **S** (*Supervisor*) — le 68000 distingue un mode **Superviseur** (accès à toute la mémoire et à
  toutes les instructions) et un mode **Utilisateur** (accès restreint). Utile pour isoler les
  programmes les uns des autres sur un système multi-utilisateur.
- **I2 I1 I0** (*Interrupt Mask*) — niveau minimal d'interruption pris en compte (0 à 7 ; le niveau 7
  est *non-masquable*, NMI).

Ce dernier registre système, les interruptions et le mode superviseur restent volontairement hors
du périmètre de ce trainer (ils ne concernent aucun des exercices) — voir directement le PDF
source si le sujet vous intéresse.
