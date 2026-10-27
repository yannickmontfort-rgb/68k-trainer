## A sprite is a rectangle of memory

A drawing, whether a character, a ball or a letter, is prepared in advance in the screen format: 4
words, one per plane, for each group of 16 pixels. A drawing of 16 × 16 pixels therefore takes up
16 lines of 8 bytes, that is 128 bytes.

Displaying it means copying it into screen memory, line by line; this copy is called a *blit*
(from *block transfer*). The basic ST has no chip to do it, so the 68000 copies each word itself.
The STE will later add a dedicated chip, the Blitter.

## The line skip

In the drawing, the lines follow one another, whereas on screen a line is 160 bytes long. After
copying a line of the drawing, you must therefore jump to the same column, one line down, which
gives the **line skip**:

```text
skip = 160 − width of the block in bytes
```

A 16-pixel block (one group, 8 bytes) needs a skip of 152, a 32-pixel block (16 bytes) a skip of
144.

```asm
    MOVEQ   #15,D7          ; 16 lines
.ligne:
    MOVE.L  (A0)+,(A1)+     ; planes 0 and 1
    MOVE.L  (A0)+,(A1)+     ; planes 2 and 3
    LEA     160-8(A1),A1    ; line skip
    DBF     D7,.ligne
```

`LEA 160-8(A1),A1` adds 152 to A1 without touching the flags, and it is the usual way to move a
pointer on by a fixed amount; the assembler computes `160-8` for you.

## Where to copy

The starting address follows the rule from chapter 5: screen + Y × 160 + (X ÷ 16) × 8. As long as
X is a multiple of 16, the drawing falls on whole groups and the copy stays as simple as above. For
a position to the nearest pixel, you will have to shift the bits, which is what topic 3 does.

## Copying is also erasing

Erasing a block comes down to copying zeros into it with `CLR.L (A1)+`. To move a sprite, you
therefore erase the old position, then draw the new one. When there is scenery behind it, you copy
that back instead of erasing: this is called restoring the background.
