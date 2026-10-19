## La pile : une pile d'assiettes

La **pile** (*stack*) est une zone de mémoire où l'on dépose des valeurs **temporairement**. Comme
une pile d'assiettes, on reprend toujours **la dernière posée** : c'est le principe **LIFO** (*Last
In, First Out*, dernier entré, premier sorti).

Le registre **A7** (ou **SP**) contient l'adresse du **sommet** de la pile. Sur le 68000, la pile
**grandit vers les adresses basses** : empiler fait diminuer SP.

## Empiler et dépiler

| Action | Instruction | Ce qui se passe |
|---|---|---|
| Empiler D0 | `MOVE.L D0,-(SP)` | SP diminue de 4, **puis** D0 est écrit à l'adresse SP |
| Dépiler dans D1 | `MOVE.L (SP)+,D1` | le long à l'adresse SP est lu dans D1, **puis** SP augmente de 4 |

Le `-` placé **avant** la parenthèse (*prédécrémentation*) et le `+` placé **après**
(*postincrémentation*) indiquent l'ordre des opérations. On reverra ces modes d'adressage au
chapitre suivant : ils servent aussi à parcourir des tableaux.

Pour garder SP toujours pair, empiler un **octet** fait quand même diminuer SP de **2**.

## Pourquoi la pile doit rester équilibrée

Quand le TOS lance ton programme, il dépose **sur la pile l'adresse où revenir**. C'est elle que
`RTS` reprend à la fin. Si ton programme a empilé une valeur sans la dépiler, `RTS` prend cette
valeur pour une adresse de retour… et le processeur saute n'importe où. Résultat : une erreur
d'adresse, une instruction illégale, des bombes.

**Règle** : autant d'octets dépilés qu'empilés, avant chaque `RTS`.

## Deux piles

Le 68000 a deux pointeurs de pile : **USP** en mode utilisateur, **SSP** en mode superviseur. A7
désigne toujours celui du mode courant. Le panneau de pas à pas affiche les deux, et la colonne
« Pile » montre les six mots longs du sommet, le premier pointé par A7.
