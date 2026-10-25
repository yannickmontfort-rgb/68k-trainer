## Des octets numérotés

La mémoire est une rangée d'octets. Chacun a une adresse, de `$000000` à `$FFFFFF`, soit 16 Mo.
Un mot occupe deux octets, un mot long quatre.

## Le poids fort d'abord

Le 68000 range un nombre dans l'ordre où on l'écrit. Après `MOVE.L #$12345678,$2000` :

| Adresse | $2000 | $2001 | $2002 | $2003 |
|---|---|---|---|---|
| Contenu | `$12` | `$34` | `$56` | `$78` |

## Mots et longs aux adresses paires

Un mot ou un mot long se lit et s'écrit à une adresse **paire**. Sinon, le 68000 s'arrête sur une
erreur d'adresse : [[atari:trois bombes sur l'Atari ST|amiga:le Guru Meditation #00000003 sur l'Amiga]].
Un octet, lui, peut être à n'importe quelle adresse.

## Ranger des données dans le programme

Les directives ne sont pas des instructions du 68000. Ce sont des ordres pour l'assembleur.

| Directive | Effet | Exemple |
|---|---|---|
| `DC.B` `DC.W` `DC.L` | range des valeurs | `TABLE: DC.W 10,20,30` |
| `DS.B` `DS.W` `DS.L` | réserve de la place, mise à zéro | `TAMPON: DS.B 80` |
| `EVEN` | passe à l'adresse paire suivante | après un texte |

Un texte s'écrit entre apostrophes et se termine souvent par un 0 :
`DC.B '[[atari:ATARI|amiga:AMIGA]]',0`. Il peut faire un nombre impair d'octets. Mets `EVEN` juste
après, pour que la suite retombe sur une adresse paire. L'exercice de l'étiquette seule montre ce
qui arrive quand on l'oublie.

:::atari
## La mémoire de l'Atari ST

| Adresses | Contenu |
|---|---|
| `$000000`–`$0003FF` | vecteurs d'exception |
| `$000400`–`$0007FF` | variables système du TOS |
| `$000800`–… | mémoire libre : ton programme, ses données, la pile |
| `$0F8000`–`$0FFFFF` | l'écran d'un 1040 ST (32 000 octets) |
| `$FC0000`–`$FEFFFF` | le TOS, en ROM |
| `$FF8000`–`$FFFFFF` | registres matériels : vidéo, palette, son |
:::
:::amiga
## La mémoire de l'Amiga 500

| Adresses | Contenu |
|---|---|
| `$000000`–`$0003FF` | vecteurs d'exception ; en `$4`, l'adresse d'ExecBase |
| `$000400`–`$07FFFF` | Chip RAM (512 Ko) : tout ce que lisent les puces, écrans et sons compris |
| `$C00000`–`$C7FFFF` | Slow RAM (extension de 512 Ko), invisible pour les puces |
| `$BFD000`–`$BFEF01` | les deux CIA : souris, joystick, clavier, timers |
| `$DFF000`–`$DFF1FF` | les puces custom : écran, Copper, Blitter, son |
| `$FC0000`–`$FFFFFF` | le Kickstart, en ROM |

L'écran n'a pas d'adresse fixe. La seule adresse fixe est `$4` : elle mène à ExecBase, et de là au
reste du système.
:::
