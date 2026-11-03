## Three chips around the 68000

The Amiga's graphics and sound rely on its custom chips, the A500's OCS chipset, which work at the
same time as the 68000:

| Chip | Role |
|---|---|
| Agnus | the conductor: direct memory access (DMA), the Copper, the Blitter, the beam position |
| Denise | the display: bitplanes, the palette, sprites, the mouse |
| Paula | sound (4 channels), interrupts, the floppy drive, the serial port |

You control them through 16-bit **registers**, stored starting at address `$DFF000`. Each
register has an offset and a name: `COLOR00`, color 0, is at `$DFF180`, `DMACON` at `$DFF096`.
Programmers often keep `$DFF000` in A5 and write `MOVE.W #$0F00,$180(A5)`.

## Write or read, not both

Most of these registers are write-only: you write to them, but reading them back gives garbage.
When you need to know a state, you read a twin register, meant for reading:

| You write to… | You read from… | Contents |
|---|---|---|
| `DMACON` (`$096`) | `DMACONR` (`$002`) | the active DMA channels |
| `INTENA` (`$09A`) | `INTENAR` (`$01C`) | the enabled interrupts |
| `INTREQ` (`$09C`) | `INTREQR` (`$01E`) | the requested interrupts |
| `ADKCON` (`$09E`) | `ADKCONR` (`$010`) | sound and disk settings |

Colors, pointers and screen settings are written, and cannot be read back.

## Bit 15: set to 1 or clear to 0

`DMACON`, `INTENA`, `INTREQ` and `ADKCON` are not written like the other registers: their
**bit 15** says what to do with the bits set to 1 in the rest of the word. When it is 1 (SET),
those bits become 1; when it is 0 (CLR), they become 0. In both cases, the bits at 0 in the word
written change nothing.

```asm
    MOVE.W  #$8020,$96(A5)  ; $8000 + $0020: turn on sprite DMA, without touching the rest
    MOVE.W  #$0020,$96(A5)  ; turn it off
    MOVE.W  #$7FFF,$96(A5)  ; turn everything off at once
```

The main bits of `DMACON`:

| Bit | Value | Name | Channel |
|---|---|---|---|
| 9 | `$0200` | DMAEN | the master switch: without it, no channel works |
| 8 | `$0100` | BPLEN | the bitplanes (the image) |
| 7 | `$0080` | COPEN | the Copper |
| 6 | `$0040` | BLTEN | the Blitter |
| 5 | `$0020` | SPREN | the sprites |
| 0-3 | `$000F` | AUD0EN-AUD3EN | the 4 sound channels |

## 4096 colors

A color is written `$0RGB`, with 4 bits of red, 4 of green and 4 of blue, each from 0 to `$F`,
that is 16 × 16 × 16 = 4096 possible colors, where the Atari ST only offers 512, with 3 bits per
component (the STE offers 4096, like the Amiga). The blue of Workbench 1.3 is `$05A`, white is
`$FFF`, orange `$F80`.

The screen shows at most 32 of them at a time, apart from special modes, stored in the registers
`COLOR00` to `COLOR31`, from `$DFF180` to `$DFF1BE`. `COLOR00` is the color of the background and
of the border around the image.

## Where is the beam?

The image is drawn line by line by a beam, 50 times per second, and Agnus tells you at any moment
where it is. The high byte of `VHPOSR` (`$DFF006`) gives the line (bits 7-0) and its low byte the
horizontal position; bit 0 of `VPOSR` (`$DFF004`) is the 9th bit of the line, because a PAL image
has 313 lines.

The standard image starts at line `$2C` (44) and is 256 lines tall. This loop waits for the beam
to reach line `$80`:

```asm
.attente:
    CMP.B   #$80,$DFF006    ; high byte of VHPOSR: the line
    BNE.S   .attente
```

It is the simplest way to do something at a precise place on the screen.
