## The edges of the screen

Nothing stops a sprite at the edge of the screen, because memory carries on. On the right, the
group that follows the last group of a line (X = 304 to 319) is the first group of the line below:
the overflow therefore reappears on the left of the screen, one line down. At the bottom, after
line 199, you write outside the screen, into the memory that follows, where your program or your
data may well be.

You must therefore cut the sprite before drawing it (*clipping*): do not write the overflow when
the sprite is in the last column, and reduce the number of lines when it sticks out at the bottom.
In a game, the simplest approach is often to stop the sprite from going too far, with X between 0
and 304 and Y between 0 and 184 for a 16 × 16 sprite, as for the ball in the challenge.

## The mirror effect with a table

To flip a sprite horizontally, when a character turns around, you must reverse the order of the
pixels: bit 7 of each byte becomes bit 0, bit 6 becomes bit 1, and so on. Doing it bit by bit for
every byte of every frame would be far too slow.

So you compute once and for all a table of 256 bytes, whose entry no. n holds n flipped; flipping
a byte then costs no more than a read:

```asm
    MOVEQ   #0,D0
    MOVE.B  (A2)+,D0         ; byte of the drawing
    MOVE.B  0(A3,D0.W),D0    ; A3 = table: D0 = flipped byte
```

For a 16-pixel word, you flip its two bytes and swap them, since the left byte becomes the right
one.

To build the table, you shift the bits of n out on the right with `LSR` and shift them in on the
right of another register with `ROXL`, with the X flag acting as the passage between the two.

This **precomputed table** (*look-up table*) is found everywhere in demos: sines for movements,
multiplications by 160, gradient colors.
