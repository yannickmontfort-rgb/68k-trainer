## The minterm

For each bit, the Blitter looks at the three corresponding bits of A, B and C and works out the bit
of D. There are 8 possible combinations of (A, B, C), and the low byte of `BLTCON0`, the
**minterm**, gives the result of each one: its bit 7 for A = 1, B = 1, C = 1, down to its bit 0 for
A = 0, B = 0, C = 0.

## Computing it

Rather than filling in this table, you write the formula you want, replacing the sources with these
three values:

> A = `$F0`, B = `$CC`, C = `$AA`

and the result of the calculation is the minterm.

| You want… | Formula | Minterm |
|---|---|---|
| copy A | D = A | `$F0` |
| copy C | D = C | `$AA` |
| clear | D = 0 | `$00` |
| put A on the background C | D = A OR C | `$F0` OR `$AA` = `$FA` |
| invert the background | D = NOT C | NOT `$AA` = `$55` |
| A and B | D = A AND B | `$F0` AND `$CC` = `$C0` |
| A exclusive or C | D = A EOR C | `$F0` EOR `$AA` = `$5A` |

## The cookie-cut

To put a drawing on a background without erasing the background around it, you use three sources:
A is the mask, at 1 where the drawing exists and at 0 around it, B is the drawing, and C the
background, that is, the destination itself. Where the mask is 1 you take the drawing, elsewhere
you keep the background:

> D = (A AND B) OR (NOT A AND C) = (`$F0` AND `$CC`) OR (`$0F` AND `$AA`) = `$C0` OR `$0A` = `$CA`

With all four channels on, `BLTCON0` is `$0FCA`. This is the **cookie-cut**, the way Amiga games
put their characters (the *bobs*) on the background.

Since the background is read through C and written through D, you give the same address to
`BLTCPT` and `BLTDPT`, and the same modulo to `BLTCMOD` and `BLTDMOD`.
