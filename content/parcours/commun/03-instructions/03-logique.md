## Les opérations logiques et les masques

Les opérations logiques travaillent bit à bit. Avec une valeur bien choisie, le masque, elles
modifient certains bits sans toucher aux autres, ce qui sert partout en graphisme sur
[[atari:Atari ST|amiga:Amiga]], où chaque bit est un morceau de pixel.

| Instruction | Règle pour chaque bit | Avec un masque |
|---|---|---|
| `AND` | 1 si les deux bits valent 1 | éteint les bits à 0 dans le masque |
| `OR` | 1 si au moins un bit vaut 1 | allume les bits à 1 dans le masque |
| `EOR` | 1 si les deux bits diffèrent | inverse les bits à 1 dans le masque |
| `NOT` | inverse tous les bits | |

```asm
    AND.B   #%00001111,D0   ; garde les 4 bits faibles, éteint les autres
    OR.B    #%10000000,D0   ; allume le bit 7
    EOR.B   #%00000001,D0   ; inverse le bit 0
```

## Les décalages et les rotations

| Instruction | Effet | Usage |
|---|---|---|
| `LSL #n,Dn` | décale à gauche, des 0 entrent à droite | × 2ⁿ en non signé |
| `LSR #n,Dn` | décale à droite, des 0 entrent à gauche | ÷ 2ⁿ en non signé |
| `ASL #n,Dn` | comme LSL, mais V signale un changement de signe | × 2ⁿ en signé |
| `ASR #n,Dn` | décale à droite en recopiant le bit de signe | ÷ 2ⁿ en signé |
| `ROL` / `ROR` | le bit qui sort rentre de l'autre côté | manipuler des motifs de bits |

Le dernier bit sorti va dans C, et aussi dans X pour les décalages. Le nombre de décalages est une
valeur immédiate de 1 à 8 ou un registre de données, comme dans `LSL.W D1,D0`.

Comme un petit décalage prend moins de 15 cycles d'horloge, contre environ 70 pour `MULU`, on
multiplie souvent par décalages : × 10, c'est × 8 plus × 2.

## Tester et modifier un bit

| Instruction | Effet |
|---|---|
| `BTST #n,dst` | teste le bit n |
| `BSET #n,dst` | teste, puis met le bit à 1 |
| `BCLR #n,dst` | teste, puis met le bit à 0 |
| `BCHG #n,dst` | teste, puis inverse le bit |

Sur un registre de données, n va de 0 à 31 ; en mémoire, l'opération porte sur un octet et n va de
0 à 7. Après le test, Z vaut 1 quand le bit testé est **à 0**, ce qui surprend souvent la première
fois.
