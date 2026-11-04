## A color number is not a color

The 4 bits of a pixel do not give a color but a number, from 0 to 15. The real color is read from
the **palette**, 16 hardware registers of 16 bits located from `$FF8240` (color 0) to `$FF825E`
(color 15).

Each register encodes a color in the format `$0RGB`, one hexadecimal digit for red, green and
blue. On an ST (STF), each component ranges from 0 to 7, on 3 bits, which gives 8 × 8 × 8 = 512
possible colors, 16 of them on screen at the same time.

| Value | Color |
|---|---|
| `$000` | black |
| `$700` | bright red |
| `$070` | bright green |
| `$007` | bright blue |
| `$770` | yellow |
| `$777` | white |

The STE adds a fourth bit per component (4,096 colors), stored in a particular way to stay
compatible. 68k Trainer simulates an STF, which ignores the extra bits as the real machine does.

Color 0 is the color of the background and of the screen border.

## Changing the palette

Setcolor (XBIOS 7) changes one color and Setpalette (XBIOS 6) all 16 at once, without switching to
supervisor mode. Writing directly from `$FF8240` onward is faster, but requires supervisor mode,
since these are hardware registers.

## Changing a color without redrawing

Changing a color of the palette changes at the same time every pixel that carries this number,
without touching a single byte of the screen. Demos use this constantly to scroll gradients, make
a pattern flash or fade the picture to black, much faster than by redrawing.
