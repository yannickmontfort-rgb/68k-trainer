---
title: "Amiga: Custom Chips and demo techniques"
source: "Amiga: Mastering System and Demo Programming (provided by Yannick, 2026-08); Amiga Hardware Reference Manual. Expanded and corrected on 10/21/2026."
themes: ["hardware", "graphisme", "demo"]
---

# Amiga: Custom Chips and demo techniques

> This sheet follows [systeme-et-hardware.md](systeme-et-hardware.md), which lays the foundations
> of the system and of memory. The addresses and bits of each register are gathered in
> [the chip registers sheet](registres-custom.md).

## The Amiga 500 chips (OCS)

| Chip | Role |
|---|---|
| **Agnus** | DMA (direct access to Chip RAM for the other chips), the **Copper**, the **Blitter**, the beam counter |
| **Denise** | display: bitplanes, palette, sprites, collisions |
| **Paula** | sound (4 DMA channels), interrupts, the floppy drive, the serial port, the potentiometers |
| **CIA A and B** (8520) | timers, keyboard, mouse (buttons), joystick (button), drive, parallel port |

The custom chip registers are words stored from `$DFF000` on, usually addressed as `offset(A5)`
with `A5 = $DFF000`. Many are **write-only**: since you cannot read them back, you must keep a
copy of what you wrote.

In the "SET/CLR" registers (`DMACON`, `INTENA`, `INTREQ`, `ADKCON`), bit 15 says whether the other
bits written as 1 must be set to 1 (bit 15 = 1) or cleared to 0 (bit 15 = 0), and bits written as
0 do not change. `MOVE.W #$7FFF,DMACON` therefore turns everything off, and
`MOVE.W #$8380,DMACON` turns on the master DMA, the bitplanes and the Copper.

## Taking over the machine, then giving it back

A program that writes directly to the chips must first ask the system for the machine, and give it
back at the end **in exactly the state it found it in**:

1. open graphics, keep the displayed view (`gb_ActiView`), then `LoadView(0)` and two `WaitTOF`;
2. `OwnBlitter` then `WaitBlit`; `Forbid` (no more other tasks);
3. save `DMACONR`, `INTENAR`, `ADKCONR` and the level 3 vector (`$6C`);
4. turn everything off: `INTENA`, `INTREQ` and `DMACON` to `$7FFF`;
5. … the program …
6. at the end, in reverse order: turn everything off, put the vector back, `COP1LC` = `gb_copinit`
   (the system copper list), turn the saved DMA and interrupts back on (with bit 15, and bit 14
   `INTEN` for `INTENA`), `LoadView(old view)`, `DisownBlitter`, `Permit`.

The `amiga-systeme.s` file provided by 68k Trainer does all of this (`BSR prendre` /
`BSR rendre`), including on the 68010 and later, where the VBR register can place the vector table
somewhere other than `$0`; writing to `$6C` would then do nothing.

## Denise: bitplanes and palette

The screen is made of stacked **bitplanes**, each supplying one bit of the color number of every
pixel: *n* bitplanes give 2ⁿ colors, that is 2 to 32 colors for 1 to 5 planes. Unlike the Atari
ST, where the planes are interleaved word by word, each plane here is a separate image in memory.

| Register | Role |
|---|---|
| `COLOR00`-`COLOR31` (`$180`-`$1BE`) | the palette: 32 `$0RGB` words (12 bits, 4,096 colors); `COLOR00` is also the background and border |
| `BPL1PT`-`BPL6PT` (`$0E0`-`$0F6`) | address of each bitplane, in Chip RAM, **to be rewritten every frame** (by the Copper) |
| `BPLCON0` (`$100`) | number of planes (bits 14-12), high resolution, HAM, dual playfield, interlace |
| `BPLCON1` (`$102`) | horizontal delay of 0 to 15 pixels for each playfield (fine scrolling) |
| `BPLCON2` (`$104`) | priorities between playfields and sprites |
| `BPL1MOD` / `BPL2MOD` (`$108` / `$10A`) | bytes skipped at the end of each line (odd / even planes) |
| `DIWSTRT` / `DIWSTOP` (`$08E` / `$090`) | corners of the display window |
| `DDFSTRT` / `DDFSTOP` (`$092` / `$094`) | start and end of data fetch on each line |

The standard 320 × 256 PAL screen is set with `DIWSTRT` = `$2C81`, `DIWSTOP` = `$2CC1`,
`DDFSTRT` = `$0038`, `DDFSTOP` = `$00D0` and modulos at 0; each plane then takes 40 bytes per line,
that is 10,240 bytes.

Two special modes use 6 planes. In Extra Half-Brite (EHB), colors 32 to 63 are colors 0 to 31 at
half brightness. In HAM (*Hold And Modify*), each pixel takes one of the first 16 colors, or else
modifies a single component (red, green or blue) of its left neighbor, which puts 4,096 colors on
screen.

## The Copper: the beam coprocessor

The **Copper** runs a list of instructions stored in Chip RAM, synchronizing with the beam that
sweeps the screen (50 frames per second in PAL, 313 lines). It knows only three instructions, of
two words each:

| Instruction | 1st word | 2nd word | Effect |
|---|---|---|---|
| `MOVE` | register no. (even offset) | value | writes the value to a chip register |
| `WAIT` | position: line (bits 15-8), column (bits 7-1), bit 0 = 1 | mask, bit 0 = 0 (`$FFFE` usually) | waits for the beam to reach the position |
| `SKIP` | position, bit 0 = 1 | mask, bit 0 = 1 | skips the next instruction if the position is passed |

The list ends with `$FFFF,$FFFE`, an impossible wait. Since the Copper restarts at the beginning of
its list every frame, this is where you reset the bitplane and sprite pointers.

```asm
        SECTION code,CODE       ; code first: the program starts at the beginning of the 1st section
        BSR     prendre         ; (amiga-systeme.s) A5 = $DFF000, everything is turned off
        LEA     LISTE,A0
        MOVE.L  A0,$80(A5)      ; COP1LC: address of the list
        MOVE.W  D0,$88(A5)      ; COPJMP1: the Copper jumps there (the value written does not matter)
        MOVE.W  #$8280,$96(A5)  ; DMACON: master DMA (bit 9) + Copper (bit 7)
        BSR     attendre_clic
        BSR     rendre
        MOVEQ   #0,D0
        RTS

        SECTION copper,DATA_C   ; the copper list MUST be in Chip RAM
LISTE:  DC.W    $0180,$0000     ; MOVE: COLOR00 = black
        DC.W    $6401,$FFFE     ; WAIT: line $64 (100)
        DC.W    $0180,$0F00     ; COLOR00 = red
        DC.W    $9601,$FFFE     ; WAIT: line $96 (150)
        DC.W    $0180,$000F     ; COLOR00 = blue
        DC.W    $FFFF,$FFFE     ; end of the list

        INCLUDE "amiga-systeme.s"
```

The line position has only 8 bits in a `WAIT`. To wait beyond line 255, at the bottom of a PAL
screen, you first wait for `$FFDF,$FFFE`, the end of line 255, then for the desired line minus
256. A gradient (*copper bars*, *raster bars*) is nothing more than a sequence of `WAIT` and
`MOVE COLOR00`.

## The Blitter: copying and combining blocks

The **Blitter** copies and combines rectangles of memory, word by word, much faster than the 68000
and in parallel with it. It reads up to 3 sources (A, B, C), combines them with any logic function,
the 8-bit **minterm**, and writes the result to the destination D. It can also shift A and B by 0
to 15 bits to place an object at pixel precision, mask the first and last word of A, fill shapes
and draw lines.

| Minterm | Result | Use |
|---|---|---|
| `$F0` | D = A | copy |
| `$CC` | D = B | copy of B |
| `$AA` | D = C | copy the background back |
| `$00` / `$FF` | D = 0 / D = 1 | clear / fill |
| `$CA` | D = A·B + Ā·C | **cookie-cut**: object B cut out by mask A, over background C |
| `$3C` | D = A ⊕ B | exclusive OR |

The job starts when `BLTSIZE` is written (height × 64 + width in words). Before reprogramming the
Blitter, you must **wait for it to finish**, which bit 14 `BBUSY` of `DMACONR` indicates, because
on a real machine the 68000 is often faster than it.

```asm
; Copy a 64 x 32 pixel block (4 words x 32 lines) of a screen 40 bytes wide
        BSR     attendre_blitter        ; (amiga-systeme.s) the Blitter has finished its previous job
        MOVE.L  #$09F00000,$40(A5)      ; BLTCON0/BLTCON1: sources A and D, D = A ($F0)
        MOVE.L  #$FFFFFFFF,$44(A5)      ; BLTAFWM/BLTALWM: no mask
        MOVE.L  #SOURCE,$50(A5)         ; BLTAPT
        MOVE.L  #DESTINATION,$54(A5)    ; BLTDPT
        MOVE.W  #40-8,$64(A5)           ; BLTAMOD: bytes skipped on each line
        MOVE.W  #40-8,$66(A5)           ; BLTDMOD
        MOVE.W  #32*64+4,$58(A5)        ; BLTSIZE: 32 lines of 4 words — and off it goes
```

In fill mode (`IFE`/`EFE` bits of `BLTCON1`, with descending mode), the Blitter sweeps each line
from right to left and toggles the fill at every 1 bit it meets. Inclusive fill keeps the edges,
while exclusive fill clears the trailing edge, which lets you place adjacent shapes without a
double edge.

In line mode (`LINE` bit), the Blitter draws a segment with Bresenham's algorithm. For a shape you
will fill afterward, you choose the "single dot per horizontal line" mode (`SING` bit), because two
neighboring pixels on the same line would toggle the fill twice and leave a hole.

## Sprites

The Amiga has 8 hardware **sprites**, 16 pixels wide and of any height, in 3 colors plus
transparency. They come in pairs that share their colors (sprites 0-1: `COLOR17`-`19`,
2-3: `COLOR21`-`23`, 4-5: `COLOR25`-`27`, 6-7: `COLOR29`-`31`), and the two sprites of a pair can
be attached to form a sprite of 15 colors plus transparency (`COLOR17`-`31`).

Their data is read from Chip RAM by the sprite DMA (the `SPREN` channel of `DMACON`), and the Copper
usually just resets their pointers (`SPRxPT`) every frame. A sprite structure starts with a
position word (`SPRxPOS`) and a control word (`SPRxCTL`), continues with two words per line
(plane 0, plane 1) and ends with two words at 0. To move a sprite, you change only its first two
words, without redrawing the background.

## Interrupts

`INTENA` (`$09A`, read back through `INTENAR` `$01C`) enables the sources, and `INTREQ` (`$09C`,
read back through `INTREQR` `$01E`) says which ones have occurred. Bit 14 of `INTENA`, `INTEN`, is
the master switch.

| Level | Vector | Sources (`INTENA`/`INTREQ` bit) |
|---|---|---|
| 1 | `$64` | serial port: transmit (0), disk: block done (1), software (2) |
| 2 | `$68` | **CIA A**: keyboard, timers (3, `PORTS`) |
| 3 | `$6C` | **Copper** (4), **VBL** (5, `VERTB`), **Blitter** done (6) |
| 4 | `$70` | audio channels 0 to 3 (7 to 10) |
| 5 | `$74` | serial port: receive (11), disk: sync (12) |
| 6 | `$78` | **CIA B** (13, `EXTER`) |

A "metal" interrupt routine must **clear its own request** in `INTREQ`, twice in a row on the
68020 and later, which are faster than the chip, then end with `RTE`:

```asm
NIVEAU3:
        BTST    #5,$DFF01F      ; INTREQR, low byte: bit 5 = VBL?
        BEQ.S   .pas_vbl
        MOVEM.L D0-D7/A0-A6,-(SP)
        ; ... the work for each frame ...
        MOVEM.L (SP)+,D0-D7/A0-A6
.pas_vbl:
        MOVE.W  #$0070,$DFF09C  ; INTREQ: clears Copper, VBL and Blitter (bits 4 to 6)
        MOVE.W  #$0070,$DFF09C
        RTE
```

In system programming, you go through exec's `AddIntServer` instead: the system then calls your
routine on every VBL, without you touching the vector.

## The CIA chips

The Amiga has two 8520s: CIA A at odd addresses from `$BFE001`, CIA B at even addresses from
`$BFD000`. Their 8-bit registers are spaced `$100` apart, and their bits are often active low.

| Address | Register | Notable contents |
|---|---|---|
| `$BFE001` | CIA A, `PRA` | bit 6 = left mouse button (port 1), bit 7 = joystick button (port 2), bit 1 = LED and audio filter |
| `$BFEC01` | CIA A, `SDR` | byte received from the keyboard |
| `$BFED01` | CIA A, `ICR` | CIA A interrupts |
| `$BFE401` / `$BFE501` | CIA A, timer A | |
| `$BFD100` | CIA B, `PRB` | floppy drive control |

The keyboard sends its codes over the serial line of CIA A. The key code is the `SDR` byte
inverted then rotated by one bit (`NOT.B D0` then `ROR.B #1,D0`), and its bit 7 is 1 when the key
is released. The program must answer the keyboard with a pulse on the serial line to receive the
next key.

The joystick (port 2) is read in `JOY1DAT` (`$00C`) and the mouse (port 1) in `JOY0DAT` (`$00A`).
For the mouse, these are two 8-bit counters; for the joystick, right = bit 1, left = bit 9,
down = bit 1 ⊕ bit 0, up = bit 9 ⊕ bit 8.

## Classic demo techniques

- **Double buffering**: with two screens in memory, you draw in one while the other is displayed,
  then swap the bitplane pointers in the copper list during the VBL.
- **Sine scroll**: a text scrolls horizontally while waving vertically, thanks to a precomputed
  sine table applied column by column, often with the Blitter.
- **Fixed-point arithmetic**: the 68000 computes only with integers, so to zoom or rotate you
  reserve part of the bits for the fractional part (for example 16 integer bits + 16 fractional
  bits), with precomputed sine tables.
- **Color cycling**: you rotate a group of palette colors to animate water or neon lights without
  redrawing a single pixel.
- **Copper bars and plasma**: hundreds of `MOVE COLOR` in the copper list, recomputed every frame,
  give gradients and plasmas with almost no work for the 68000.
- **Dual playfield**: two independent 8-color backgrounds (3 planes each) have their own scrolling
  and priorities (`BPLCON2`), which gives platform games their depth.
- **Hardware scrolling**: `BPLCON1` shifts the first 15 pixels, then you advance the bitplane
  pointers by 2 bytes; with a screen wider than the display and modulos, the background scrolls
  without copying.

## Historical context: piracy and the demoscene

In the 16-bit era (Amiga, Atari ST), cheap blank floppies led to massive piracy, and publishers
protected their games with nonstandard tracks. The intros that cracking groups added to sign their
work, the *cracktros*, evolved into more and more sophisticated standalone demos: this is the
origin of the demoscene, still alive today.

> Sheet expanded and corrected on 10/21/2026 (Claude): sprites read by their DMA (not by the
> Copper), attached pair with 15 colors, EHB on 6 planes; additions: taking over and giving back the
> machine, Copper instructions, examples of a list and of a Blitter copy, minterms, interrupts,
> keyboard, joystick.
