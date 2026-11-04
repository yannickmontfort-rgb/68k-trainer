## Une pile d'assiettes

La pile est une zone de mémoire où le programme dépose des valeurs pour un moment. Comme sur une
pile d'assiettes, on reprend toujours la dernière posée.

Le registre A7, qu'on appelle aussi SP, pointe sur le sommet de la pile. Sur le 68000, la pile
descend vers les adresses basses : empiler fait donc diminuer SP.

## Empiler, dépiler

| Action | Instruction | Ce qui se passe |
|---|---|---|
| empiler D0 | `MOVE.L D0,-(SP)` | SP recule de 4, puis D0 est écrit à l'adresse SP |
| dépiler dans D1 | `MOVE.L (SP)+,D1` | le long à l'adresse SP va dans D1, puis SP avance de 4 |

Le `-` placé avant la parenthèse indique qu'on recule d'abord, le `+` placé après qu'on avance
ensuite. On retrouvera ces deux modes au chapitre suivant pour parcourir des tableaux. Pour que SP
reste pair, empiler un octet le fait quand même descendre de 2.

## Une pile équilibrée

Quand [[atari:le TOS|amiga:le CLI]] lance ton programme, il dépose sur la pile l'adresse où revenir, et
c'est elle que `RTS` reprend à la fin. Si ton programme a laissé une valeur sur la pile, `RTS` la
prend pour cette adresse de retour et le processeur saute n'importe où.

Avant chaque `RTS`, il faut donc dépiler autant d'octets qu'on en a empilé.

## Deux piles

Le 68000 possède en réalité deux pointeurs de pile, USP pour le mode utilisateur et SSP pour le
mode superviseur ; A7 désigne celui du mode en cours, et le pas à pas affiche les deux.
