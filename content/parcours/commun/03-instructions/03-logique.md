## Les opérations logiques et les masques

Les opérations logiques travaillent **bit à bit**. Combinées à une valeur bien choisie, le
**masque**, elles permettent de modifier certains bits sans toucher aux autres. C'est la base du
graphisme sur [[atari:Atari ST|amiga:Amiga]], où chaque bit est un pixel.

| Instruction | Règle pour chaque bit | Usage avec un masque |
|---|---|---|
| `AND` | 1 si les deux bits valent 1 | **éteindre** des bits (0 dans le masque = bit mis à 0) |
| `OR` | 1 si au moins un bit vaut 1 | **allumer** des bits (1 dans le masque = bit mis à 1) |
| `EOR` | 1 si les deux bits sont différents | **inverser** des bits |
| `NOT` | inverse tous les bits | — |

```asm
    AND.B   #%00001111,D0   ; garde les 4 bits faibles, éteint les autres
    OR.B    #%10000000,D0   ; allume le bit 7
    EOR.B   #%00000001,D0   ; inverse le bit 0
```

## Les décalages et les rotations

| Instruction | Effet | Usage |
|---|---|---|
| `LSL #n,Dn` | décale vers la gauche, des 0 entrent à droite | **× 2ⁿ** (non signé) |
| `LSR #n,Dn` | décale vers la droite, des 0 entrent à gauche | **÷ 2ⁿ** (non signé) |
| `ASL #n,Dn` | comme LSL, mais V signale un changement de signe | × 2ⁿ (signé) |
| `ASR #n,Dn` | décale vers la droite en **recopiant le bit de signe** | **÷ 2ⁿ** (signé) |
| `ROL` / `ROR` | rotation : le bit qui sort rentre de l'autre côté | manipuler des motifs de bits |

Le dernier bit sorti va dans **C** (et dans X pour les décalages). Le nombre de décalages est une
valeur immédiate de **1 à 8**, ou un registre de données (`LSL.W D1,D0`).

Un décalage est bien plus rapide qu'une multiplication : sur 68000, `MULU` prend environ 70 cycles
d'horloge, un petit décalage moins de 15. Les programmeurs de démos s'en servent partout (`× 10`
= `× 8` + `× 2`).

## Tester et modifier un bit précis

| Instruction | Effet |
|---|---|
| `BTST #n,dst` | teste le bit n : **Z = 1 si le bit vaut 0** |
| `BSET #n,dst` | teste, puis met le bit à 1 |
| `BCLR #n,dst` | teste, puis met le bit à 0 |
| `BCHG #n,dst` | teste, puis inverse le bit |

Sur un registre de données, n va de 0 à 31 ; en mémoire, l'opération porte sur **un octet**
(n de 0 à 7). Attention au piège : après `BTST`, Z = 1 signifie que le bit testé est **à 0**.
