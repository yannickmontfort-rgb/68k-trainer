## Des plans de bits

L'image de l'Amiga est faite de **plans de bits** (*bitplanes*). Un plan est une zone de Chip RAM
où **chaque bit est un pixel** : pour un écran de 320 × 256, une ligne fait 320 bits = **40
octets**, et le plan entier 40 × 256 = **10 240 octets**.

Avec un seul plan, chaque pixel vaut 0 ou 1 : il prend la couleur 0 (`COLOR00`) ou la couleur 1
(`COLOR01`). Avec plusieurs plans, on empile les bits (voir la notion suivante).

Contrairement au ST, où les plans d'un groupe de 16 pixels sont entrelacés mot par mot, chaque
plan de l'Amiga est **un bloc séparé**, et ses lignes se suivent.

## Trouver un pixel

Le pixel (x, y) d'un plan de 40 octets par ligne est dans l'octet :

> adresse = début du plan + y × 40 + x ÷ 8

et c'est le bit n° **7 − (x mod 8)** de cet octet (le pixel le plus à gauche est le bit 7).

```asm
    ; D0 = x, D1 = y, A0 = le plan : allume le pixel
    MULU    #40,D1
    MOVE.W  D0,D2
    LSR.W   #3,D2           ; x ÷ 8
    ADD.W   D2,D1           ; D1 = y × 40 + x ÷ 8
    NOT.B   D0              ; 7 − (x mod 8) : BSET ne garde que les 3 bits bas
    BSET    D0,0(A0,D1.W)
```

## Les réglages de l'écran

Pour afficher un plan, il faut régler plusieurs registres :

| Registre | Valeur standard | Rôle |
|---|---|---|
| `BPLCON0` (`$100`) | `$1200` | bits 14-12 = **nombre de plans** (ici 1), bit 15 = haute résolution, bit 9 = couleur |
| `BPLCON1` (`$102`) | `0` | décalage fin des plans (défilement horizontal) |
| `BPLCON2` (`$104`) | `$24` | priorités entre plans et sprites |
| `DIWSTRT`, `DIWSTOP` (`$08E`, `$090`) | `$2C81`, `$2CC1` | la **fenêtre** de l'image : de la ligne `$2C` à `$12C`, 320 pixels de large |
| `DDFSTRT`, `DDFSTOP` (`$092`, `$094`) | `$0038`, `$00D0` | quand Agnus va lire les données de chaque ligne |
| `BPL1MOD`, `BPL2MOD` (`$108`, `$10A`) | `0` | octets à sauter à la fin de chaque ligne (plans impairs, plans pairs) |
| `BPL1PTH`… (`$0E0`…) | l'adresse du plan | où Agnus lit le plan 1 (puis `$0E4` pour le plan 2, etc.) |

Les valeurs standard donnent l'écran classique de 320 × 256 en basse résolution PAL.

## Pourquoi c'est le Copper qui règle les pointeurs

Pendant l'affichage, Agnus fait avancer `BPL1PT` au fil des lignes lues : à la fin de l'image, il
pointe après le plan. Il faut donc le **remettre au début à chaque image**. C'est le travail
idéal pour le **Copper**, qui relit sa liste à chaque image :

```asm
copper:
    DC.W    $00E0,0         ; BPL1PTH : moitié haute de l'adresse du plan
    DC.W    $00E2,0         ; BPL1PTL : moitié basse
    DC.W    $0100,$1200     ; BPLCON0 : 1 plan, couleur
    DC.W    $FFFF,$FFFE     ; fin de la liste
```

Les deux mots de l'adresse sont mis en place par le programme, avant de lancer le Copper :

```asm
    MOVE.L  #plan,D0
    MOVE.W  D0,copper+6     ; moitié basse dans le MOVE vers BPL1PTL
    SWAP    D0
    MOVE.W  D0,copper+2     ; moitié haute dans le MOVE vers BPL1PTH
```

Tout ce que lisent les puces doit être en **Chip RAM** : sur un vrai Amiga, on range la liste
Copper et le plan dans une `SECTION nom,DATA_C` (ou `BSS_C` pour une zone vide).
