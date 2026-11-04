## The screen is memory

The Atari ST has no graphics card: the displayed picture is a 32,000-byte area of RAM, the
*framebuffer*, which the video chip, the Shifter, reads 50 times a second to build the picture.
Writing into this area is therefore drawing.

You get its address with XBIOS 2, `Physbase`, for the displayed screen, or XBIOS 3, `Logbase`, for
the screen TOS draws on; on a 1040 ST, it is usually `$F8000`. This area is not protected, and a
program in user mode can write to it.

## The three resolutions

| Resolution | Pixels | Colors | Bitplanes | Bytes per line |
|---|---|---|---|---|
| Low | 320 × 200 | 16 | 4 | 160 |
| Medium | 640 × 200 | 4 | 2 | 160 |
| High (monochrome monitor) | 640 × 400 | 2 | 1 | 80 |

Here you work in low resolution, the one used by games and demos.

## Interleaved bitplanes

With 16 colors, each pixel needs 4 bits, but these 4 bits are not stored side by side. The screen
is split into groups of 16 pixels, and each group takes up 4 consecutive words (8 bytes), one per
**bitplane**:

```
  group address +0 : plane 0  (bit 0 of the color of the 16 pixels)
                +2 : plane 1  (bit 1)
                +4 : plane 2  (bit 2)
                +6 : plane 3  (bit 3)
```

In each word, bit 15 is the leftmost pixel and bit 0 the rightmost one. The color of a pixel is
therefore read vertically, taking its bit in each of the four planes: a pixel of color 5 (`%0101`)
has its bit at 1 in planes 0 and 2, and at 0 in planes 1 and 3.

## Finding the address of a pixel

A line is 320 pixels wide, that is 20 groups of 8 bytes, 160 bytes in all. For the pixel (X, Y):

```
group address  = screen + Y × 160 + (X ÷ 16) × 8
bit number     = 15 − (X modulo 16)
```

`(X ÷ 16) × 8` is computed with an integer division first, by `LSR.W #4` (÷ 16) then `LSL.W #3`
(× 8), or by `LSR.W #1` then `AND.W #$FFF8`. Simply writing "X ÷ 2" is a mistake, one you will
come across again in a routine from the manual.

## Turning on, turning off, choosing a color

To modify a pixel without damaging its 15 neighbors in the same word, you use masks: `OR.W` with a
mask such as `%0000 0100 0000 0000` sets the bit to 1, and `AND.W` with the inverted mask sets it
to 0.

To give color c to the pixel, you handle it plane by plane: its bit goes to 1 in plane n if bit n
of c is 1, and to 0 otherwise.
