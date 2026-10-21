---
title: "Assembleur 68000 — Référence (Meyne / Hoppenot)"
source: "assemble.pdf — P. Hoppenot (1999), d'après un cours de Philippe Meyne, IUT GEII Evry ; complétée d'après le M68000PRM (Motorola) le 21/10/2026."
themes: ["transfert", "adressage", "branchements", "sous-programmes"]
---

# Assembleur 68000 — Référence

## I. Format d'une instruction assembleur

Une action informatique se décrit par une séquence d'instructions permettant :

- **Transfert** : écrire ou lire en mémoire et dans les registres internes du processeur.
- **Opérations arithmétiques et logiques** : addition, multiplication, inversion de signe, ET, OU, NON, OU exclusif…
- **Branchement** : conditionnel (*si \<condition\> alors aller à*) ou inconditionnel (*aller à*).
- **Appel à sous-programme**.

L'assembleur est un langage avec ses propres règles et sa syntaxe :

```
Étiquette   Mnémonique.format   source,destination   ; commentaire
```

- **Étiquette** : facultative, repère une instruction ou une donnée dans un programme.
- **Mnémonique** : nom de l'instruction.
- **Format** : taille des données manipulées — `.B` byte (octet, 8 bits), `.W` word (mot, 16 bits,
  la taille par défaut si on n'en écrit pas), `.L` long word (mot long, 32 bits).
- **Source** : donnée de départ. **Destination** : endroit d'arrivée. Sur le 68000, la source est à
  **gauche** et la destination à **droite** (l'inverse des processeurs Intel).

**Exemple :**

```asm
DEB     MOVE.B  D0,D1           ; transfère l'octet de poids faible de D0 dans D1
        NOT.B   D1              ; complément à 1 de l'octet de poids faible de D1
        BRA     DEB             ; saute à l'étiquette DEB
```

## II. Instruction de transfert — Modes d'adressage

Instruction de transfert : `MOVE.<format> <source>,<destination>`. `MOVE` positionne les flags
N et Z d'après la valeur transférée, et remet V et C à 0.

### II.1. Adressage direct par registre

La donnée est contenue dans un registre (`Dn` ou `An`).

```asm
        MOVE.L  D1,D0           ; D0 reçoit les 32 bits de D1
        MOVE.B  D1,D0           ; seul l'octet de poids faible de D0 est modifié
```

Exemple : si l'octet bas de D1 vaut `$AF` et D0 valait `$FA23FBED`, D0 vaut `$FA23FBAF` après le
`MOVE.B` (seul le dernier octet change).

### II.2. Adressage immédiat

La donnée est contenue **dans l'instruction elle-même** (préfixe `#`).

```asm
        MOVE.W  #523,D0         ; le mot de poids faible de D0 reçoit 523 (décimal, base par défaut)
        MOVEQ   #-1,D1          ; « quick » : -128 à 127, D1 entier = $FFFFFFFF
        ADDQ.W  #8,D2           ; « quick » : 1 à 8
```

| Préfixe | Base |
|---|---|
| `$` | hexadécimal |
| `%` | binaire |
| *(rien)* | décimal |
| `'…'` | code ASCII des caractères |

> **Piège :** `MOVE.B #$D0,D0` transfère la donnée `$D0` = 208 dans le registre `D0` — ne pas
> confondre le nombre hexadécimal `$D0` avec le registre `D0`. Et **sans `#`**, `MOVE.W $10,D0` lit
> le mot **à l'adresse** `$10` : oublier le `#` est l'erreur la plus fréquente.

### II.3. Adressage absolu

L'adresse (et non la donnée) est contenue dans l'instruction.

```asm
        MOVE.B  #$F0,$FF9001    ; écrit $F0 à l'adresse $FF9001
        MOVE.W  $4000,D0        ; lit le mot à l'adresse $4000
```

> Pour un mot ou un long (`.W`/`.L`), **l'adresse doit être paire**.

### II.4. Adressage indirect `(An)`

L'adresse de la donnée est contenue dans un registre d'adresse (un **pointeur**).

```asm
        LEA     TABLE,A3        ; A3 = adresse de TABLE (Load Effective Address)
        MOVE.B  D0,(A3)         ; écrit l'octet de D0 à l'adresse contenue dans A3
```

### II.5. Indirect avec déplacement `d16(An)`

L'adresse effective = contenu du registre + un déplacement fixe signé sur 16 bits (−32 768 à 32 767).

```asm
        MOVE.W  #$F14D,$70(A4)  ; adresse effective = A4 + $70
        MOVE.L  -4(A6),D0       ; un déplacement peut être négatif
```

C'est le mode idéal pour lire les **champs d'une structure** dont A4 contient l'adresse de début.

### II.6. Indirect indexé `d8(An,Xn.taille)`

L'adresse effective = registre d'adresse + registre d'index (`Dn` ou `An`) + déplacement signé sur
**8 bits** (−128 à 127).

```asm
        MOVE.L  D7,$70(A2,D1.L) ; A2 + D1 + $70
        MOVE.W  0(A0,D0.W),D2   ; D0.W étendu en signe sur 32 bits avant l'addition
```

L'index se précise en `.W` (étendu en signe) ou `.L`, jamais `.B`. Le déplacement compte en
**octets** : pour le *i*-ème mot d'un tableau, l'index doit valoir 2 × *i*.

### II.7. Indirect post-incrémenté `(An)+`

L'adresse effective est dans le registre, qui est **augmenté après** l'accès de la taille de la
donnée : 1 pour `.B`, 2 pour `.W`, 4 pour `.L` (2 pour un `.B` sur A7).

```asm
        NOT.B   (A3)+           ; utilise A3, puis A3 += 1
        NOT.L   (A3)+           ; utilise A3, puis A3 += 4
        MOVE.W  (A0)+,(A1)+     ; copie un mot et avance les deux pointeurs
```

Sert à parcourir des tableaux et à **dépiler** (`(SP)+`).

### II.8. Indirect pré-décrémenté `-(An)`

Le registre est **diminué avant** l'accès, de la taille de la donnée. Sert à **empiler** (`-(SP)`)
et à parcourir un tableau à l'envers.

### II.9. Adressage relatif au PC `d16(PC)` et `d8(PC,Xn)`

L'adresse est calculée à partir du **compteur de programme** : le code reste juste où qu'il soit
chargé en mémoire (code **relogeable**). L'assembleur calcule le déplacement lui-même.

```asm
        LEA     MESSAGE(PC),A0  ; A0 = adresse de MESSAGE, sans adresse absolue
        MOVE.W  TABLE(PC,D0.W),D1 ; lecture indexée dans une table proche
```

> Le mode relatif au PC n'est permis qu'en **source** (lecture) : `MOVE.W D0,VAR(PC)` est refusé.

### II.10. Extension de signe des adresses courtes

Le 68000 a un bus d'adresse de 24 bits (A23…A0). Une adresse absolue codée sur 16 bits (forme
« courte », `.W`, une instruction plus courte et plus rapide) est **étendue en signe** :

```asm
        NOT.L   $7000.W         ; codée $7000 → adresse $00007000 (bit 15 à 0 : complétée par des 0)
        NOT.L   $FFFFF000.W     ; codée $F000 → adresse $FFFFF000, soit $FFF000 sur 24 bits
```

On écrit l'adresse **telle qu'elle sera après extension** : la forme courte n'atteint que
`$0000`-`$7FFF` et `$FFFF8000`-`$FFFFFFFF` (l'assembleur refuse `$F000.W`, qui serait ambigu).

C'est ce qui permet d'atteindre en adresse courte à la fois le bas de la mémoire (vecteurs,
variables système) et le haut (registres matériels de l'Atari ST en `$FF8000`-`$FFFFFF`).

> **Piège** : un registre d'index `Dn.W` est lui aussi étendu en signe — un index de `$8000` ou plus
> devient négatif. Utiliser `Dn.L` pour les grands tableaux.

## III. Instructions de branchement

| | Inconditionnel | Conditionnel |
|---|---|---|
| Relatif au PC | `BRA` | `Bcc`, `DBcc` |
| Adresse effective | `JMP` | — |

### III.1. Branchement inconditionnel

```asm
        BRA     ETIQUETTE       ; relatif : PC ← PC + déplacement
        JMP     (A0)            ; vers l'adresse contenue dans A0 (table de sauts)
```

`BRA.S` code le déplacement sur 8 bits (±126 octets), `BRA` (ou `BRA.W`) sur 16 bits (±32 Ko).
`JMP ETIQUETTE` en adresse absolue n'est pas relogeable → préférer `BRA`.

### III.2. Branchement conditionnel

Structure : *si \<condition\> alors \<traitement\>*.

#### III.2.1. Le registre code condition (CCR)

Poids faible du registre d'état SR :

| bit | 4 | 3 | 2 | 1 | 0 |
|---|---|---|---|---|---|
| nom | X | N | Z | V | C |
| signification | Extension | Négatif | Zéro | Dépassement signé (oVerflow) | Retenue / emprunt (Carry) |

Positionnés par les instructions arithmétiques et logiques, `MOVE` (N, Z), `CMP`, `TST` et `BTST`
(Z seulement). Les instructions vers un registre d'adresse (`MOVEA`, `ADDA`, `SUBA`), `LEA`,
`MOVEM`, `SWAP`… ne les modifient pas (sauf `SWAP`, qui positionne N et Z).

Sur le 68000, **C vaut 1 quand une soustraction (ou une comparaison) a dû emprunter**, c'est-à-dire
quand la destination était plus petite que la source **en non signé**.

**Exemple :**

```asm
        MOVE.B  #$1,D0          ; D0 ← 1
        SUB.B   #$1,D0          ; D0 ← 0     → Z=1, N=0, V=0, C=0
        SUB.B   #$1,D0          ; D0 ← $FF   → Z=0, N=1, V=0, C=1 (emprunt : 0 - 1)
```

#### III.2.2. L'instruction CMP

Compare deux données et positionne le CCR **sans modifier la destination**.

```
CMP.<format> <source>,<destination>   ; calcule <destination> - <source>
```

```asm
        MOVE.B  #$0A,D0
        MOVE.B  #$0B,D1
        CMP.B   D1,D0           ; D0 - D1 = -1 → N=1, Z=0, V=0, C=1
        CMP.B   #$0A,D0         ; D0 - $0A = 0 → N=0, Z=1, V=0, C=0
```

> L'ordre des opérandes est le piège n° 1 : `CMP.W #10,D0` puis `BGT` se lit « si **D0** > 10 ».

`TST.<format> <ea>` compare à zéro (positionne N et Z, efface V et C).

#### III.2.3. L'instruction BTST

Teste un bit d'un registre (ou d'une adresse effective) et positionne uniquement `Z` : si le bit
testé est à 0, alors `Z=1`. Sur un registre, le numéro de bit va de 0 à 31 ; en mémoire, le test
porte sur un **octet** (bit 0 à 7).

```asm
        BTST    #6,$BFE001      ; Amiga : bouton gauche de la souris (actif à 0)
        BEQ     APPUYE          ; bit à 0 → Z=1 → bouton appuyé
```

`BSET`, `BCLR` et `BCHG` testent de la même façon, puis mettent le bit à 1, à 0 ou l'inversent.

#### III.2.4. Les instructions de branchement conditionnel (Bcc)

`Bcc étiquette` — branchement **relatif**, `cc` = code condition :

| cc | signification | condition | usage |
|---|---|---|---|
| `EQ` | égal | `Z` | tous |
| `NE` | différent | `Z̄` | tous |
| `GT` | supérieur | `N.V.Z̄ + N̄.V̄.Z̄` | signé |
| `GE` | supérieur ou égal | `N.V + N̄.V̄` | signé |
| `LT` | inférieur | `N.V̄ + N̄.V` | signé |
| `LE` | inférieur ou égal | `Z + N.V̄ + N̄.V` | signé |
| `HI` | supérieur | `C̄.Z̄` | non signé |
| `HS` = `CC` | supérieur ou égal (retenue à 0) | `C̄` | non signé |
| `LO` = `CS` | inférieur (retenue à 1) | `C` | non signé |
| `LS` | inférieur ou égal | `C + Z` | non signé |
| `MI` | négatif | `N` | |
| `PL` | positif ou nul | `N̄` | |
| `VS` | dépassement | `V` | |
| `VC` | pas de dépassement | `V̄` | |

**Exemple** (X = `$0A` dans D0, Y = `$0B` dans D1) :

```asm
        CMP.B   D0,D1           ; Y - X = $01 → N=0, Z=0, V=0, C=0
        BGT     PLUS_GRAND      ; pris (Y > X en signé)
        BHI     PLUS_GRAND      ; pris aussi (Y > X en non signé)
```

Avec X = `$0A` et Y = `$F0` : `BGT` n'est **pas** pris (`$F0` = −16 en signé) mais `BHI` l'est
(`$F0` = 240 en non signé). C'est le branchement qui décide si les nombres sont signés.

`Scc <ea>` (*Set according to condition*) met un octet à `$FF` si la condition est vraie, à `$00`
sinon — pratique pour garder le résultat d'un test.

#### III.2.5. Test-et-branchement : DBcc

Combine un test de condition et une décrémentation de compteur — idéal pour les boucles.

```
DBcc Dn,étiquette
; si la condition est vraie : on sort (on continue après le DBcc)
; sinon : Dn.W ← Dn.W - 1 ; si Dn.W ≠ -1 alors PC ← étiquette
```

`DBRA` (= `DBF`, condition toujours fausse) est la boucle « compteur » : pour répéter *n* fois, on
charge **n − 1** dans le compteur.

```asm
        LEA     TABLE,A0
        MOVE.W  #10-1,D7        ; 10 tours
.efface CLR.W   (A0)+
        DBRA    D7,.efface      ; D7 = 9, 8, ... 0, puis -1 → sortie
```

`DBEQ D0,boucle` sort **soit** quand Z = 1 (trouvé), **soit** quand le compteur est épuisé — une
recherche avec une limite :

```asm
        MOVE.W  #100-1,D1       ; au plus 100 octets
.cherche CMP.B  (A0)+,D0        ; l'octet lu vaut-il D0 ?
        DBEQ    D1,.cherche     ; sort si égal, ou après 100 essais
```

> Le compteur d'un `DBcc` est un **mot** : `DBRA` ne fait que 65 536 tours au plus.

## IV. Instruction d'appel de sous-programme

Un appel de sous-programme sauvegarde l'adresse de retour (empilée) puis branche ; `RTS` dépile
cette adresse et y retourne.

```asm
        BSR     ROUTINE         ; relatif : adresse de retour empilée, PC ← PC + déplacement
        JSR     (A0)            ; vers une adresse calculée
        JSR     -552(A6)        ; Amiga : fonction d'une bibliothèque (décalage négatif)
ROUTINE RTS                     ; retour de sous-programme
```

Intérêt : conception modulaire, factoriser une séquence de code répétitive. Les détails (pile,
paramètres, sauvegarde des registres) sont dans [la fiche sur la pile](pile-et-sous-programmes.md).

## V. Tableau récapitulatif des instructions

| Famille | Instructions | À retenir |
|---|---|---|
| Transfert | `MOVE`, `MOVEA`, `MOVEQ`, `MOVEM`, `MOVEP`, `LEA`, `PEA`, `EXG`, `SWAP`, `CLR` | `LEA` calcule une adresse sans lire la mémoire ; `PEA` l'empile |
| Addition | `ADD`, `ADDA`, `ADDI`, `ADDQ`, `ADDX` | `ADDX` ajoute aussi X : calculs sur 64 bits ou plus |
| Soustraction | `SUB`, `SUBA`, `SUBI`, `SUBQ`, `SUBX`, `NEG`, `NEGX` | `NEG` = 0 − opérande (complément à 2) |
| Multiplication | `MULU`, `MULS` | 16 × 16 bits → 32 bits (non signé / signé) ; lente (jusqu'à 70 cycles) |
| Division | `DIVU`, `DIVS` | 32 / 16 bits : quotient dans le mot bas, reste dans le mot haut ; division par 0 → exception |
| Comparaison | `CMP`, `CMPA`, `CMPI`, `CMPM`, `TST` | `CMPM (A0)+,(A1)+` compare deux zones mémoire |
| Logique | `AND`, `ANDI`, `OR`, `ORI`, `EOR`, `EORI`, `NOT` | `ANDI #…,CCR` / `ORI #…,SR` agissent sur les flags |
| Décalages | `LSL`, `LSR`, `ASL`, `ASR`, `ROL`, `ROR`, `ROXL`, `ROXR` | LS = logique (0 entrant), AS = arithmétique (garde le signe à droite), RO = rotation, ROX = rotation à travers X |
| Bits | `BTST`, `BSET`, `BCLR`, `BCHG`, `TAS` | registre : bit 0-31 ; mémoire : octet, bit 0-7 |
| Signe | `EXT.W`, `EXT.L` | octet → mot, mot → long |
| Décimal (BCD) | `ABCD`, `SBCD`, `NBCD` | deux chiffres décimaux par octet (scores, horloges) |
| Branchements | `BRA`, `Bcc`, `DBcc`, `Scc`, `JMP` | voir § III |
| Sous-programmes | `BSR`, `JSR`, `RTS`, `RTR`, `LINK`, `UNLK` | voir § IV |
| Système | `TRAP`, `TRAPV`, `CHK`, `RTE`, `STOP`, `RESET`, `NOP`, `ILLEGAL` | `RTE`, `STOP`, `RESET` : mode superviseur seulement |

Les décalages acceptent un nombre de 1 à 8 en immédiat (`LSL.W #3,D0`), ou un nombre de 0 à 63 dans
un registre de données (`LSL.L D1,D0`). Sur une case mémoire, ils ne portent que sur un **mot**,
d'une seule position.

```asm
        MOVE.W  #$1234,D0
        LSL.W   #4,D0           ; D0.W = $2340 : un chiffre hexadécimal vers la gauche (x 16)
        ROL.W   #4,D0           ; D0.W = $3402 : le chiffre sorti à gauche revient à droite
        MOVE.W  #-20,D1
        ASR.W   #2,D1           ; D1.W = -5 : division par 4 qui garde le signe
```

> Fiche complétée et corrigée le 21/10/2026 (Claude) : notation `&` retirée, note fausse sur la
> retenue des soustractions corrigée (sur le 68000, C = emprunt), boucle `DBEQ` de temporisation
> remplacée, modes relatifs au PC, `DBRA`, `Scc`, tableau récapitulatif — à relire.
