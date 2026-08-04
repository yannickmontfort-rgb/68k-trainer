---
title: "Assembleur 68000 — Référence (Meyne / Hoppenot)"
source: "assemble.pdf — P. Hoppenot (1999), d'après un cours de Philippe Meyne, IUT GEII Evry"
themes: ["transfert", "adressage", "branchements", "sous-programmes"]
---

# Assembleur 68000 — Référence

## I. Format d'une instruction assembleur

Une action informatique se décrit par une séquence d'instructions permettant :

- **Transfert** : allocation en mémoire et dans les registres internes du processeur (écrire / lire).
- **Opérations arithmétiques et logiques** : addition, multiplication, inversion de signe, ET, OU, NON, XOR, NAND, NOR…
- **Branchement** : conditionnel (*si \<condition\> alors aller à*) ou inconditionnel (*aller à*).
- **Appel à sous-programme**.

L'assembleur est un langage avec ses propres règles et sa syntaxe :

```
Étiquette   Mnémonique.format   source, destination   commentaires
```

- **Étiquette** : facultative, repère une instruction dans un programme.
- **Mnémonique** : nom de l'instruction.
- **Format** : taille des données manipulées.
  - `.B` byte (octet)
  - `.W` word (mot, 16 bits)
  - `.L` long word (mot long, 32 bits)
- **Source** : donnée de départ.
- **Destination** : endroit d'arrivée. Source et destination peuvent être confondues.

**Exemple :**

```asm
DEB    MOVE.B   D0,D1     ; transfère l'octet de poids faible de D0 dans D1
       NOT.B    D1        ; complément à 1 de l'octet de poids faible de D1
       BRA      DEB       ; saute à l'étiquette DEB
```

## II. Instruction de transfert — Modes d'adressage

Instruction de transfert : `MOVE.<format> <source>, <destination>`

### II.1. Adressage direct

La donnée est contenue dans un registre.

```asm
MOVE.L "valeur", D0   ; D0 est initialisé avec "valeur"
MOVE.B "valeur", D0   ; seul l'octet de poids faible de D0 est modifié
```

Exemple : si `valeur = AF` et `D0` valait `FA23FBED` avant, `D0` vaut `FA23FBAF` après (seul le dernier octet change).

### II.2. Adressage immédiat

La donnée est contenue **dans l'instruction elle-même**.

```asm
MOVE.W #523, D0   ; le mot de poids faible de D0 est initialisé avec 523 (décimal, base par défaut)
```

Notations de base pour une donnée immédiate (préfixe `#`) :

| Préfixe | Base |
|---|---|
| `$` | hexadécimal |
| `%` | binaire |
| `&` | décimal |

> **Piège :** `MOVE.B #$D0, D0` transfère la donnée `$D0` = 208 (décimal) dans le registre `D0` — ne pas confondre le `D0` du préfixe hexadécimal avec le registre `D0`.

### II.3. Adressage absolu

L'adresse (et non la donnée) est contenue dans l'instruction.

```asm
MOVE.B #$F0, $FF9001   ; écrit F0 à l'adresse $FF9001
```

> Pour un mot (`.W`/`.L`), **l'adresse doit être paire**.

### II.4. Adressage indirect

L'adresse de la source ou de la destination est contenue dans un pointeur d'adresses (registre `An`).

```asm
MOVE.B D0, (A3)   ; écrit l'octet de D0 à l'adresse pointée par A3
```

Le contenu du pointeur d'adresses **est** l'adresse effective de la donnée transférée.

### II.5. Adressage indirect avec déplacement

L'adresse effective = contenu du pointeur d'adresses + un déplacement fixe.

```asm
MOVE.W #$F14D, $70(A4)   ; adresse effective = (A4) + $70
```

### II.6. Adressage indirect indexé avec déplacement

L'adresse effective = contenu du pointeur d'adresses + registre d'index + déplacement fixe.

```asm
MOVE.L D7, $70(A2,D1.L)
```

Le registre d'index se précise en `.L` ou `.W` (jamais `.B`). Déplacement : 8 bits si indexé + déplacement, 16 bits si déplacement seul.

### II.7. Adressage indirect post-incrémenté

L'adresse effective est dans un pointeur, qui est **incrémenté après** l'instruction.

```asm
NOT.B (A3)+   ; utilise A3, puis A3 += 1
NOT.L (A3)+   ; utilise A3, puis A3 += 4
```

Incrément : 1 pour `.B`, 2 pour `.W`, 4 pour `.L`. Sert typiquement à la gestion des piles / parcours de tableaux.

### II.8. Adressage indirect pré-décrémenté

L'adresse effective est dans un pointeur, qui est **décrémenté avant** l'instruction. Sert aussi à la gestion des piles.

### II.9. Principe d'extension du signe

L'adresse effective est sur 24 bits (A23…A0). Si l'adresse manipulée n'est pas sur 24 bits, elle est complétée en **extension de signe** :

```asm
NOT.L $F000   ; adresse effective : $FFF000 (bit de poids fort à 1 → extension par des 1)
NOT.L $7000   ; adresse effective : $007000 (bit de poids fort à 0 → extension par des 0)
```

> **Piège** `(An,Dm)` : le registre d'index `Dm` est utilisé avec extension de signe s'il est en `.W`.

## III. Instructions de branchement

Deux familles :

| | Inconditionnel | Conditionnel |
|---|---|---|
| | `JMP`, `BRA` | `Bcc`, `DBcc` |

### III.1. Branchement inconditionnel

```asm
BRA étiquette   ; déroutement relatif : PC ← PC + déplacement(étiquette)
JMP étiquette   ; déroutement absolu :  PC ← étiquette
```

> `JMP` génère un code non relogeable → **déconseillé**, préférer `BRA`.

### III.2. Branchement conditionnel

Structure : *si \<condition\> alors \<traitement\>*.

#### III.2.1. Le registre code condition (CCR)

Poids faible du registre d'état SR (Status Register) :

| bit | 4 | 3 | 2 | 1 | 0 |
|---|---|---|---|---|---|
| nom | X | N | Z | V | C |
| signification | Extension | Négatif | Zéro | Dépassement (oVerflow) | Retenue (Carry) |

Positionnés par les instructions arithmétiques/logiques, certaines instructions de transfert (calcul d'adresse), `CMP` (comparaison), et `BTST` (test de bit).

**Exemple :**

```asm
MOVE.B #$1, D0    ; D0 ← 1
SUB.B  #$1, D0    ; D0 ← D0-1 = 0    → Z=1, C=0
SUB.B  #$1, D0    ; D0 ← D0-1 = -1   → Z=0, C=1, N=1
```

#### III.2.2. L'instruction CMP

Compare deux données et positionne le CCR **sans modifier la destination**.

```asm
CMP.<format> <source>, <destination>   ; calcule <destination> - <source>
```

**Exemple :**

```asm
MOVE.B #$0A, D0
MOVE.B #$0B, D1
CMP.B  D1, D0        ; D0 - D1 < 0 → N=1, Z=0, V=0, C=1

CMP.B  #$0A, D0      ; D0 - $0A = 0 → N=0, Z=1, V=0, C=0
```

#### III.2.3. L'instruction BTST

Teste un bit d'un registre (ou d'une adresse effective) et positionne uniquement `Z` : si le bit testé est à 0, alors `Z=1`.

```asm
BTST <n° de bit>, AE
```

#### III.2.4. Les instructions de branchement conditionnel (Bcc)

`Bcc étiquette` — branchement **relatif**, `cc` = code condition :

| cc | signification | condition (signée) | condition (non signée) |
|---|---|---|---|
| `CC` | retenue à 0 | `C̄` | `C̄` |
| `CS` | retenue à 1 | `C` | `C` |
| `EQ` | égal | `Z` | `Z` |
| `NE` | non égal | `Z̄` | `Z̄` |
| `GE` | supérieur ou égal | `N.V + N̄.V̄` | — |
| `GT` | supérieur | `N.V.Z̄ + N̄.V̄.Z̄` | — |
| `LE` | inférieur ou égal | `Z + N.V̄ + N̄.V` | — |
| `LT` | inférieur | `N.V̄ + N̄.V` | — |
| `HI` | plus grand | — | `C̄.Z̄` |
| `LS` | plus petit ou égal | — | `C + Z` |
| `MI` | négatif | `N` | |
| `PL` | positif | `N̄` | |
| `VC` | pas de dépassement | `V̄` | |
| `VS` | dépassement | `V` | |

> Pour la soustraction, le bit `C` (carry) est le **complément** de celui trouvé en convention signée — cohérent avec la retenue utilisée pendant l'opération.

**Exemple** (X=`$0A`, Y=`$0B`) :

```asm
CMP.B D0, D1     ; Y-X = $01 → N=0,Z=0,V=0,C=0
BGT   ...        ; vrai  (Y>X)
BLE   ...        ; faux
BHI   ...        ; vrai
BLS   ...        ; faux
```

#### III.2.5. Test-et-branchement : DBcc

Combine un test de condition et une décrémentation de compteur — idéal pour les boucles.

```asm
DBcc Dn, étiquette
; si (condition fausse) alors Dn ← Dn - 1
; si (Dn ≠ -1) alors PC ← étiquette
; sinon PC ← PC + 2 (on continue après le DBcc)
```

**Exemple — boucle de temporisation :**

```asm
tempo   MOVE.W  #$FFFF, D0
bou     DBEQ    D0, bou
```

## IV. Instruction d'appel de sous-programme

Un appel de sous-programme sauvegarde l'adresse de retour (empilée) puis branche ; `RTS` dépile cette adresse et y retourne.

```asm
BSR étiquette   ; branchement relatif : PC(retour) sauvegardé, PC ← PC + déplacement
JSR étiquette   ; branchement absolu  : PC(retour) sauvegardé, PC ← étiquette
RTS             ; retour de sous-programme
```

> `JSR` génère un code non relogeable → **déconseillé**, préférer `BSR`.

Intérêt : conception modulaire, factoriser une séquence de code répétitive.
