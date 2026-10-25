## Une pile d'assiettes

La pile est une zone de mémoire où l'on pose des valeurs pour un moment. Comme sur une pile
d'assiettes, on reprend toujours la dernière posée.

A7, qu'on appelle aussi SP, pointe sur le sommet. Sur le 68000, la pile descend : empiler fait
diminuer SP.

## Empiler, dépiler

| Action | Instruction | Ce qui se passe |
|---|---|---|
| empiler D0 | `MOVE.L D0,-(SP)` | SP recule de 4, puis D0 est écrit à l'adresse SP |
| dépiler dans D1 | `MOVE.L (SP)+,D1` | le long à l'adresse SP va dans D1, puis SP avance de 4 |

Le `-` avant la parenthèse : on recule d'abord. Le `+` après : on avance ensuite. Ces deux modes
servent aussi à parcourir des tableaux, au chapitre suivant.

Un octet empilé fait quand même descendre SP de 2. Ainsi, SP reste pair.

## Une pile équilibrée

Au lancement, [[atari:le TOS|amiga:le CLI]] pose sur la pile l'adresse où revenir. `RTS` la reprend à
la fin. Si tu as laissé une valeur sur la pile, `RTS` la prend pour cette adresse, et le programme
saute n'importe où.

Avant `RTS`, dépile autant d'octets que tu en as empilé.

## Deux piles

Il existe deux A7 : USP en mode utilisateur, SSP en mode superviseur. Le pas à pas affiche les deux.
