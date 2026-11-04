## A 68000 trap turned into a toolbox

When the 68000 meets an instruction word that starts with `$A`, it does not execute it: it
triggers an exception and jumps to vector 10, at address `$28`. TOS has plugged its graphics
primitives into that vector, the ones GEM also uses to draw, and that is what is called Line A.

The assembler does not know these instructions, so you write them as data:

```asm
    DC.W    $A000           ; Line A no. 0: initialization
```

## $A000 first

Function `$A000` returns in A0 the address of the **Line A variables**, a memory area where you
put the parameters of the other functions. Since Line A may modify D0-D2 and A0-A2, like TOS, you
immediately copy that address into a preserved register, A5 for example.

| Offset | Variable | Role |
|---|---|---|
| 8 | `INTIN` | address of the integer array |
| 12 | `PTSIN` | address of the coordinate array |
| 24 to 30 | `COLBIT0` to `COLBIT3` | the drawing color, one word per plane |
| 32 | `LSTLIN` | in exclusive OR, 0: the last point is not drawn |
| 34 | `LN_MASK` | the line pattern, `$FFFF` for a solid line |
| 36 | `WRT_MODE` | the write mode |
| 38 to 44 | `X1`, `Y1`, `X2`, `Y2` | the ends of the line |

## Setting, reading, drawing

`$A001` sets the pixel whose coordinates are stored in PTSIN, x then y, with the color stored in
INTIN. `$A002` reads the color of the pixel given by PTSIN and returns it in D0.

`$A003` draws a line from (X1, Y1) to (X2, Y2). Its color is given plane by plane: for color 5,
written `%0101`, COLBIT0 and COLBIT2 are 1, COLBIT1 and COLBIT3 are 0. The LN_MASK pattern is read
bit by bit along the line starting with bit 15, and Line A leaves it rotated by as many bits as the
line has pixels.

## Write modes

| WRT_MODE | Mode | Where the pattern is 1 | Where it is 0 |
|---|---|---|---|
| 0 | replace | the color | the background, color 0 |
| 1 | transparent | the color | nothing changes |
| 2 | exclusive OR | the pixel is inverted | nothing changes |
| 3 | reverse transparent | nothing changes | the color |

Exclusive OR has a valuable property: drawing the same line twice makes it disappear and leaves
the scenery intact, which is useful for a cursor or for the rubber-band rectangle of a selection.

## What 68k Trainer simulates

The simulator knows `$A000` to `$A003`, as well as `$A009` and `$A00A`, which show and hide the
mouse, and its drawings are identical to those of EmuTOS. The other functions, such as filled
rectangles, text or the mouse shape, can be explored in Hatari with the "Try in Hatari" button.
