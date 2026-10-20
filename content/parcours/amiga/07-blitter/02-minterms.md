## La fonction logique : le minterm

Pour chaque bit, le Blitter regarde les trois bits correspondants de A, B et C, et décide du bit
de D. Il y a 8 combinaisons possibles de (A, B, C) : l'octet bas de `BLTCON0`, le **minterm**,
donne le résultat de chacune (son bit 7 pour A=1, B=1, C=1… son bit 0 pour A=0, B=0, C=0).

## L'astuce pour le calculer

Inutile de remplir une table : on **écrit la formule voulue avec ces trois valeurs** :

> A = `$F0`, B = `$CC`, C = `$AA`

et on calcule. Le résultat est le minterm.

| On veut… | Formule | Minterm |
|---|---|---|
| copier A | D = A | `$F0` |
| copier C | D = C | `$AA` |
| effacer | D = 0 | `$00` |
| poser A sur le fond C | D = A OU C | `$F0` OR `$AA` = `$FA` |
| inverser le fond | D = NON C | NOT `$AA` = `$55` |
| A et B | D = A ET B | `$F0` AND `$CC` = `$C0` |
| A ou exclusif C | D = A EOR C | `$F0` EOR `$AA` = `$5A` |

## Le « cookie-cut » : un dessin avec un trou

Pour poser un dessin sur un décor **sans effacer le décor autour**, on utilise trois sources :

- **A** = le **masque** : 1 là où le dessin existe, 0 autour ;
- **B** = le **dessin** ;
- **C** = le **décor** (la destination elle-même).

Là où le masque vaut 1, on prend le dessin ; ailleurs, on garde le décor :

> D = (A ET B) OU (NON A ET C) = (`$F0` AND `$CC`) OR (`$0F` AND `$AA`) = `$C0` OR `$0A` = **`$CA`**

Avec les quatre canaux allumés : `BLTCON0` = `$0FCA`. C'est ainsi que les jeux de l'Amiga posent
leurs personnages (les *bobs*) sur le décor, à toute vitesse.

## Quatre canaux, deux pointeurs pour la destination

Le décor est lu par C et écrit par D : on donne **la même adresse** à `BLTCPT` et `BLTDPT`, et le
même modulo à `BLTCMOD` et `BLTDMOD`.
