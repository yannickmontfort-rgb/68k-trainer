---
title: "Low-level graphics programming: the framebuffer"
source: "Technical manual: Low-Level Graphics Programming on the Atari ST (provided by Yannick, 2026-08); Atari ST Hardware Register Listing. Completed and corrected on October 21, 2026."
themes: ["graphisme", "framebuffer"]
---

# Low-level graphics programming: the framebuffer

> This sheet complements [ligne-a-et-gem.md](ligne-a-et-gem.md): here you handle video memory
> directly, without going through Line A or GEM, to understand what lies beneath these interfaces or
> to write routines where every cycle counts.

## Locating the framebuffer

The Atari ST screen is an area of **32,000 bytes** of RAM, which the video chip, the *Shifter*,
reads continuously. Its address is not fixed, since it depends on the amount of memory and on the
TOS version (`$F8000` on a 1040 STF), so you ask the XBIOS for it:

```asm
        MOVE.W  #3,-(SP)        ; XBIOS 3: Logbase, the screen you draw on
        TRAP    #14
        ADDQ.L  #2,SP
        MOVEA.L D0,A3           ; A3 = start of the screen
```

`Physbase()` (XBIOS 2) gives the displayed screen, which is the same one except with double
buffering, and `Setscreen()` (XBIOS 5) changes either one. The address must be a multiple of 256
on the STF, of 2 on the STE.

## The three resolutions

| Resolution | Pixels | Colors | Bitplanes | Bytes per line |
|---|---|---|---|---|
| Low (0) | 320 × 200 | 16 | 4 | 160 |
| Medium (1) | 640 × 200 | 4 | 2 | 160 |
| High (2) | 640 × 400 | 2 (monochrome) | 1 | 80 |

All three take up 32,000 bytes. The color number of a pixel is written with as many bits as there
are planes, that is 4 bits (0 to 15) in low resolution.

## Monochrome high resolution (640 × 400)

This is the simplest mode to start with, since one pixel is one bit. The 400 lines of 80 bytes do
make 32,000 bytes, and each line of 640 pixels splits into 40 groups of 16 pixels, one per word. The
word that holds pixel (x, y) is at:

```
address = screen_start + y × 80 + (x / 16) × 2
```

By default, the monochrome screen shows black on white: a bit at 0 gives the white of the
background, a bit at 1 gives black.

**Big endian** plays out at two levels: the most significant bit (bit 15) of a word corresponds to
the leftmost pixel of the group of 16, and the high-order byte of the word is at the lowest address.
This consistency with the 68000 lets you handle strips of 16 pixels at the full speed of the bus.

## Low resolution (320 × 200, 16 colors): interleaved bitplanes

This is the resolution of games and demos, and the one of the 68k Trainer simulator. Each group of
16 pixels takes up 4 consecutive words (8 bytes), one per **plane**:

```
bytes 0-1 : plane 0  (bit 0 of the color number of the 16 pixels)
bytes 2-3 : plane 1  (bit 1)
bytes 4-5 : plane 2  (bit 2)
bytes 6-7 : plane 3  (bit 3)
```

A pixel of color 5 (`%0101`) has its bit at 1 in planes 0 and 2, at 0 in planes 1 and 3. A line
holds 20 groups of 8 bytes, that is 160 bytes.

```
group address = screen_start + y × 160 + (x / 16) × 8
bit in each word = 15 − (x mod 16)
```

```asm
; Fills the first 16 pixels of the first line with color 5 (%0101)
        MOVE.W  #$FFFF,(A3)     ; plane 0: all bits at 1
        CLR.W   2(A3)           ; plane 1: all at 0
        MOVE.W  #$FFFF,4(A3)    ; plane 2: all at 1
        CLR.W   6(A3)           ; plane 3: all at 0
```

Medium resolution follows the same principle with 2 planes, so 2 words (4 bytes) per group of 16
pixels.

## The palette

In low resolution, the ST displays 16 colors chosen from 512 on the STF, 4,096 on the STE. The 16
color registers are words, from `$FFFF8240` to `$FFFF825E`, accessible in supervisor mode:

```
color word: %0000 0RRR 0GGG 0BBB   ($0RGB: red, green, blue, each component from 0 to 7)
$0000 black  $0777 white  $0700 red  $0070 green  $0007 blue  $0770 yellow
```

On the STE, bit 3 of each component adds a half step, for 16 levels. Color 0 is also the color of
the screen border.

```asm
        PEA     PALETTE(PC)
        MOVE.W  #6,-(SP)        ; XBIOS 6: Setpalette (16 words), without switching to supervisor mode
        TRAP    #14
        ADDQ.L  #6,SP
        ; ... the rest of the program, which ends with Pterm0 ...
        CLR.W   -(SP)
        TRAP    #1

PALETTE DC.W    $0000,$0700,$0070,$0007,$0770,$0707,$0077,$0777
        DC.W    $0333,$0400,$0040,$0004,$0440,$0404,$0044,$0555
```

Since the TOS desktop needs its palette, you **save the original palette** at the start, by reading
the 16 words or with `Setcolor(n,-1)`, and you restore it when quitting.

## Handling pixels

The fastest way is to work by groups of 16, writing a word directly at the computed address:

```asm
        MOVE.W  #%1010101010101010,(A0) ; dotted pattern on 16 pixels at once
```

To change a single pixel without touching the other 15 of the group, you go through a **mask**: the
pixel's bit is at position `15 − (x mod 16)`, and the mask is `1 << bit_position`.

| Effect | Instruction | Why |
|---|---|---|
| Set | `OR.W D1,(A0)` | sets the targeted bit to 1 without touching the others |
| Clear | `NOT.W D1` then `AND.W D1,(A0)` | AND with the **inverted** mask |
| Invert | `EOR.W D1,(A0)` | exclusive OR: toggles only the targeted bit |

With a constant mask, the assembler computes the inversion itself: `ANDI.W #~%1000000000000000,(A0)`
clears the leftmost pixel, because the `~` is evaluated at assembly time and the 68000 only sees a
constant.

Simpler still, `BSET`, `BCLR` and `BCHG` on a data register take the bit number directly.

## Complete routine: `setpixel` (high resolution)

```asm
; SETPIXEL — sets pixel (D3,D4) on the high-resolution screen
; Input: D3.W = x (0-639), D4.W = y (0-399), A3 = start of the screen (Logbase)
; Modifies: D0, D1, A0
SETPIXEL:
        MOVE.W  D4,D0
        MULU    #80,D0          ; D0.L = y x 80 (byte at the start of the line)
        MOVE.W  D3,D1
        LSR.W   #4,D1           ; D1 = x / 16
        ADD.W   D1,D1           ; D1 = (x / 16) x 2
        ADD.W   D1,D0           ; D0 = offset of the word in the screen
        LEA     0(A3,D0.L),A0   ; A0 = address of the word
        MOVE.W  D3,D1
        NOT.W   D1              ; 15 - (x mod 16) = the 4 low bits of NOT x
        ANDI.W  #15,D1          ; D1 = bit number
        MOVE.W  (A0),D0
        BSET    D1,D0           ; sets this bit
        MOVE.W  D0,(A0)
        RTS
```

`MULU` costs up to 70 cycles. In a critical loop, you replace it with a precomputed table of line
starts (`y × 80`), or with shifts, since y × 80 = y × 64 + y × 16.

Calling a routine per pixel, with `BSR`, `RTS` and the full recalculation, remains too slow for a
game. Advanced techniques draw directly into memory (Bresenham for lines), fill by words or by longs,
or hand the work over to the **Blitter** of the STE and the Mega ST.

## Double buffering and synchronization

To animate without flicker, you draw into a hidden screen while another one is displayed, then swap
the two during the **vertical blank** (VBL, 50 times per second in Europe):

```asm
        MOVE.W  #-1,-(SP)       ; resolution: unchanged
        MOVE.L  ECRAN_CACHE,-(SP) ; new physical (displayed) screen
        MOVE.L  #-1,-(SP)       ; logical screen: unchanged
        MOVE.W  #5,-(SP)        ; XBIOS 5: Setscreen (applied at the next VBL)
        TRAP    #14
        LEA     12(SP),SP
        MOVE.W  #37,-(SP)       ; XBIOS 37: Vsync, wait for that VBL
        TRAP    #14
        ADDQ.L  #2,SP
```

Watch the order of the parameters of `Setscreen(log, phys, rez)`: you push `rez`, then `phys`, then
`log`. The second screen is reserved in the BSS section, with 32,000 bytes plus 255 to align it on
256 bytes.

> In the 68k Trainer simulator, the screen is in low resolution at address `$F8000`, the palette at
> `$FF8240` can be read in the debugger, and both `Setscreen` and `Vsync` are simulated: you can try
> double buffering there directly.

> Sheet completed and corrected on October 21, 2026 (Claude): low and medium resolutions
> (interleaved bitplanes), palette, double buffering; `AND.W ~masque`, invalid syntax, replaced;
> `setpixel` routine simplified with `BSET`.
