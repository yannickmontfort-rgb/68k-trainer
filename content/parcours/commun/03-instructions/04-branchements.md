## Sauter

`BRA etiquette` (*BRanch Always*) fait sauter le programme à l'étiquette : le PC prend la
nouvelle adresse. Sans saut, les instructions s'exécutent dans l'ordre ; avec les sauts, on écrit
des choix (« si… sinon… ») et des boucles.

## Comparer, puis brancher selon les flags

Un **branchement conditionnel** `Bcc` ne saute que si une condition sur les flags est vraie. On
prépare donc les flags juste avant :

- `CMP.t src,dst` calcule **dst − src** sans ranger le résultat : seuls les flags changent ;
- `TST.t dst` compare dst à zéro (N et Z selon dst).

```asm
    CMP.W   D2,D1       ; compare D1 à D2 (calcule D1 - D2)
    BGT     PLUSGRAND   ; saute si D1 > D2
```

Lis toujours `CMP src,dst` puis `Bcc` comme « **si dst** *condition* **src** ».

## Signé ou non signé ? À toi de choisir

Les mêmes bits peuvent représenter un nombre signé ou non. Le processeur ne sait pas ce que tu
veux : tu choisis la bonne condition.

| Condition | Non signé | Signé |
|---|---|---|
| dst > src | `BHI` | `BGT` |
| dst ≥ src | `BCC` (aussi écrit `BHS`) | `BGE` |
| dst < src | `BCS` (aussi écrit `BLO`) | `BLT` |
| dst ≤ src | `BLS` | `BLE` |

Et quelle que soit la représentation :

| Instruction | Saute si… | Flag testé |
|---|---|---|
| `BEQ` | égal / résultat nul | Z = 1 |
| `BNE` | différent / non nul | Z = 0 |
| `BMI` | négatif | N = 1 |
| `BPL` | positif ou nul | N = 0 |
| `BVS` / `BVC` | débordement / pas de débordement | V |

Exemple du piège : l'octet `$C8` vaut 200 en non signé, mais −56 en signé. Comparé à 100, il est
plus grand pour `BHI`… et plus petit pour `BGT`.

## Écrire un « si… sinon… »

```asm
    CMP.W   D2,D1
    BGT     ALORS       ; condition vraie : on saute au bloc ALORS
    MOVE.W  D2,D0       ; bloc SINON
    BRA     FINSI       ; ne pas oublier de sauter par-dessus ALORS !
ALORS:
    MOVE.W  D1,D0
FINSI:
```

Le `BRA FINSI` oublié est un grand classique : le programme exécute alors les deux blocs.

`BRA.S` et `Bcc.S` sont des versions **courtes** (saut de −128 à +127 octets), un peu plus
rapides. Sans `.S`, l'assembleur choisit la forme qui convient.
