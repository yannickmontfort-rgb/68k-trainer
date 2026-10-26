## Le minterm

Pour chaque bit, le Blitter regarde les trois bits correspondants de A, B et C et en déduit le
bit de D. Il y a 8 combinaisons possibles de (A, B, C), et l'octet bas de `BLTCON0`, le
**minterm**, donne le résultat de chacune : son bit 7 pour A = 1, B = 1, C = 1, jusqu'à son bit 0
pour A = 0, B = 0, C = 0.

## Le calculer

Plutôt que de remplir cette table, on écrit la formule voulue en remplaçant les sources par ces
trois valeurs :

> A = `$F0`, B = `$CC`, C = `$AA`

et le résultat du calcul est le minterm.

| On veut… | Formule | Minterm |
|---|---|---|
| copier A | D = A | `$F0` |
| copier C | D = C | `$AA` |
| effacer | D = 0 | `$00` |
| poser A sur le fond C | D = A OU C | `$F0` OR `$AA` = `$FA` |
| inverser le fond | D = NON C | NOT `$AA` = `$55` |
| A et B | D = A ET B | `$F0` AND `$CC` = `$C0` |
| A ou exclusif C | D = A EOR C | `$F0` EOR `$AA` = `$5A` |

## Le cookie-cut

Pour poser un dessin sur un décor sans effacer le décor autour, on emploie trois sources : A est
le masque, à 1 là où le dessin existe et à 0 autour, B est le dessin, et C le décor, c'est-à-dire
la destination elle-même. Là où le masque vaut 1 on prend le dessin, ailleurs on garde le décor :

> D = (A ET B) OU (NON A ET C) = (`$F0` AND `$CC`) OR (`$0F` AND `$AA`) = `$C0` OR `$0A` = `$CA`

Avec les quatre canaux allumés, `BLTCON0` vaut `$0FCA`. C'est le **cookie-cut**, la façon dont
les jeux de l'Amiga posent leurs personnages (les *bobs*) sur le décor.

Comme le décor est lu par C et écrit par D, on donne la même adresse à `BLTCPT` et `BLTDPT`, et le
même modulo à `BLTCMOD` et `BLTDMOD`.
