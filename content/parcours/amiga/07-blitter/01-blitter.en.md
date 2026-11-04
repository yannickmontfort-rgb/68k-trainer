## A memory mover

The **Blitter** (*BLock Image Transferer*), housed in Agnus, copies and combines blocks of memory
much faster than the 68000. It reads up to three sources, A, B and C, combines them bit by bit and
writes the result to the destination D. It works in 16-bit words, on a rectangle of
*width* × *height* words, while the 68000 does something else. Like the other chips, it only sees
Chip RAM.

## Its registers

| Register | Offset | Role |
|---|---|---|
| `BLTCON0` | `$040` | the channels used, the logic function (*minterm*), the shift of A |
| `BLTCON1` | `$042` | the shift of B, the modes (descending, fill, line) |
| `BLTAFWM`, `BLTALWM` | `$044`, `$046` | masks for the first and last word of each line of A |
| `BLTCPT`, `BLTBPT`, `BLTAPT`, `BLTDPT` | `$048`, `$04C`, `$050`, `$054` | addresses of channels C, B, A and D (long words) |
| `BLTCMOD`, `BLTBMOD`, `BLTAMOD`, `BLTDMOD` | `$060` to `$066` | modulos: bytes to skip at the end of each line |
| `BLTSIZE` | `$058` | the size of the rectangle; writing it starts the job |

In `BLTCON0`, bits 11 to 8 turn on the channels: A = `$0800`, B = `$0400`, C = `$0200`,
D = `$0100`. The low byte is the logic function, and `$F0` means "D = A".

## BLTSIZE

```
BLTSIZE = height × 64 + width in words        (height ≤ 1024, width ≤ 64 words)
```

The height takes bits 15-6 and the width bits 5-0: a block 64 pixels (4 words) wide and 20 lines
tall is written `MOVE.W #(20<<6)|4,$58(A5)`. Since this write starts the Blitter, you do it last,
once everything else is set.

## Modulos

The Blitter goes through the rectangle line by line, and at the end of each line it adds its modulo
to each pointer. For a 64-pixel (8-byte) block in a screen with 40 bytes per line, the screen's
modulo is 40 − 8 = 32; for an image stored in one piece, it is 0.

## Waiting for the end

As soon as `BLTSIZE` is written, the 68000 carries on by itself. Before preparing the next blit or
reading the result, you must therefore **wait for the Blitter to finish**: bit 14 of `DMACONR`,
BBUSY, stays at 1 as long as it is working.

```asm
attendre_blitter:
    BTST    #6,$02(A5)      ; bit 14 of DMACONR = bit 6 of its high byte
    BNE.S   attendre_blitter
```

The very first Agnus chips had a flaw, and you often do a "dummy" read of `DMACONR` before the
loop. Changing the Blitter's registers while it is working gives wrong results or crashes, and
68k Trainer reports it.

Its DMA channel must also be on: `MOVE.W #$8240,$96(A5)` (SET + DMAEN + BLTEN).

## Clearing and copying

Clearing means writing zeros: you only turn on channel D, with function 0.

```asm
    MOVE.L  #$01000000,$40(A5)  ; BLTCON0 = $0100 (D only, minterm 0), BLTCON1 = 0
    MOVE.L  #ecran,$54(A5)      ; BLTDPT
    MOVE.W  #0,$66(A5)          ; BLTDMOD
    MOVE.W  #(256<<6)|20,$58(A5); 256 lines of 20 words: a whole 320 × 256 plane
```

Copying means D = A: channels A and D, function `$F0`, and both masks at `$FFFF`.

```asm
    MOVE.L  #$09F00000,$40(A5)  ; BLTCON0 = $09F0, BLTCON1 = 0
    MOVE.L  #-1,$44(A5)         ; BLTAFWM = BLTALWM = $FFFF
```
