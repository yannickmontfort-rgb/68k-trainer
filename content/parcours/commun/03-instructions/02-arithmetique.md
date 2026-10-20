## Additionner et soustraire

| Instruction | Effet | Remarque |
|---|---|---|
| `ADD.t src,dst` | dst ← dst + src | un des deux opérandes doit être un Dn |
| `SUB.t src,dst` | dst ← dst − src | même règle |
| `ADDI` / `SUBI #n,dst` | avec une valeur immédiate | l'assembleur les choisit souvent pour toi quand tu écris `ADD #n` |
| `ADDQ` / `SUBQ #n,dst` | valeur de **1 à 8** seulement | plus court et plus rapide |
| `ADDA` / `SUBA` | vers un registre d'adresse | aucun flag modifié |
| `NEG.t dst` | dst ← 0 − dst | change le signe (complément à deux) |
| `EXT.W` / `EXT.L Dn` | étend le signe d'un octet en mot, ou d'un mot en long | indispensable avant de mélanger des tailles |

Les additions et soustractions positionnent les cinq flags (X N Z V C), comme on l'a vu au
chapitre précédent.

## Multiplier

```text
    MULU    src,Dn      ; non signé : Dn.L ← Dn.W × src.W
    MULS    src,Dn      ; signé
```

Le 68000 multiplie deux **mots** (16 bits) et range le produit sur **32 bits** dans le registre
destination. Les mots de poids fort des opérandes sont ignorés. `MULU` (*unsigned*) considère les
mots comme non signés, `MULS` (*signed*) comme signés : `$FFFF × 2` vaut 131 070 avec MULU, mais
−2 avec MULS.

## Diviser

```text
    DIVU    src,Dn      ; Dn.L ÷ src.W, non signé
    DIVS    src,Dn      ; signé
```

Le dividende est le **mot long** Dn, le diviseur un **mot**. Le résultat est rangé dans Dn en deux
morceaux :

| Bits de Dn | 31 … 16 | 15 … 0 |
|---|---|---|
| Contenu | le **reste** | le **quotient** |

Après `DIVU #5,D0` avec D0 = 47 : quotient 9, reste 2, donc D0 = `$00020009`. Pour récupérer le
reste, `SWAP D0` le fait passer dans le mot faible.

Deux pièges :

- **division par zéro** : le 68000 déclenche l'exception n° 5 ([[atari:cinq bombes sur un ST|amiga:Guru Meditation #00000005 sur l'Amiga]]) ;
- **dépassement** : si le quotient ne tient pas sur 16 bits, le flag **V** passe à 1 et le
  registre reste **inchangé**.
