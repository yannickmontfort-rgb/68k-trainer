## Sauter

`BRA etiquette` (*BRanch Always*) fait sauter le programme à l'étiquette en donnant au PC sa
nouvelle adresse. Sans saut, les instructions s'exécutent dans l'ordre ; avec les sauts, on écrit
des choix et des boucles.

## Comparer, puis brancher selon les flags

Un branchement conditionnel `Bcc` ne saute que si une condition sur les flags est vraie, et on
prépare donc les flags juste avant : `CMP.t src,dst` calcule dst − src sans ranger le résultat, et
`TST.t dst` compare dst à zéro.

```asm
    CMP.W   D2,D1       ; compare D1 à D2 (calcule D1 - D2)
    BGT     PLUSGRAND   ; saute si D1 > D2
```

On lit `CMP src,dst` suivi de `Bcc` comme « si dst *condition* src ».

## Signé ou non signé

Comme le processeur ne sait pas si tes nombres sont signés, c'est toi qui choisis la condition qui
convient.

| Condition | Non signé | Signé |
|---|---|---|
| dst > src | `BHI` | `BGT` |
| dst ≥ src | `BCC` (ou `BHS`) | `BGE` |
| dst < src | `BCS` (ou `BLO`) | `BLT` |
| dst ≤ src | `BLS` | `BLE` |

D'autres conditions ne dépendent pas du signe :

| Instruction | Saute si… | Flag testé |
|---|---|---|
| `BEQ` | égal, ou résultat nul | Z = 1 |
| `BNE` | différent, ou non nul | Z = 0 |
| `BMI` | négatif | N = 1 |
| `BPL` | positif ou nul | N = 0 |
| `BVS` / `BVC` | débordement, ou pas | V |

L'octet `$C8`, par exemple, vaut 200 en non signé mais −56 en signé : comparé à 100, il est plus
grand pour `BHI` et plus petit pour `BGT`.

## Écrire un « si… sinon… »

```asm
    CMP.W   D2,D1
    BGT     ALORS       ; condition vraie : on saute au bloc ALORS
    MOVE.W  D2,D0       ; bloc SINON
    BRA     FINSI       ; on saute par-dessus ALORS
ALORS:
    MOVE.W  D1,D0
FINSI:
```

Sans le `BRA FINSI`, le programme exécuterait les deux blocs l'un après l'autre.

`BRA.S` et `Bcc.S` sont des formes courtes, un peu plus rapides, pour un saut de −128 à +127
octets ; sans `.S`, l'assembleur choisit la forme qui convient.
