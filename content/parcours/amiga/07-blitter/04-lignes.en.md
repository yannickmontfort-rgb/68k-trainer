## Drawing lines

In **line mode** (bit 0 of `BLTCON1`), the Blitter draws a segment with Bresenham's algorithm, one
point per "line" of its rectangle. You give it:

| Register | Value |
|---|---|
| `BLTCON0` | x1 mod 16 in bits 15-12, channels A, C, D (`$0B00`), minterm `$CA` (A put on C) |
| `BLTCON1` | the octant (bits 4-2), the SIGN bit (6), the LINE bit (0) |
| `BLTAPTL` | 4 × dmin − 2 × dmax, Bresenham's accumulator |
| `BLTAMOD`, `BLTBMOD` | 4 × (dmin − dmax), 4 × dmin |
| `BLTCPT`, `BLTDPT` | the address of the word that contains the starting point |
| `BLTCMOD`, `BLTDMOD` | the width of the screen in bytes |
| `BLTADAT`, `BLTBDAT` | `$8000` (one point), `$FFFF` (solid line, or a dotted pattern) |
| `BLTSIZE` | (dmax + 1) × 64 + 2 |

dmax and dmin are the larger and the smaller of the two distances |x2 − x1| and |y2 − y1|.

## The octant

The three octant bits say in which direction the drawing moves. SUD (bit 4) indicates that the
"sometimes" step is vertical, that is, that the line is wider than it is tall; SUL (bit 3) that
this step goes up or to the left; AUL (bit 2) that the "always" step goes up or to the left.

The example's routine computes all this from (x1, y1) and (x2, y2). It has been checked point by
point against Bresenham's algorithm, in all 8 directions.

## Filling

In **fill mode**, the Blitter goes through each line from right to left and switches from
"outside" to "inside", or the reverse, at each bit set to 1 it meets: that is how it fills the
areas between two edges.

| `BLTCON1` bit | Name | Role |
|---|---|---|
| 3 | IFE (*Inclusive Fill*) | the edges are part of the area |
| 4 | EFE (*Exclusive Fill*) | the left edge is not part of it |
| 1 | DESC | descending mode, required for filling |

You copy the area onto itself (A = D, minterm `$F0`), with the pointers on the last word of the
area, at the bottom right, since in descending mode the Blitter moves toward lower addresses.

To fill a polygon, you draw its edges keeping only one point per line (bit 1 of `BLTCON1` in line
mode, SING), then you fill: that is how demos draw their solid-faced 3D objects.
