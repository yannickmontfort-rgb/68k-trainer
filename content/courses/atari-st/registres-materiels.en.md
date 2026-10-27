---
title: "Atari ST: hardware registers and memory map (reference)"
source: "Atari ST Hardware Register Listing; Atari ST Profibuch; YM2149 documentation (Yamaha); registers of the 68k Trainer simulator. Sheet created on October 21, 2026."
themes: ["materiel", "reference"]
---

# Atari ST: hardware registers and memory map

> This sheet covers the ST and the STF, and points out what the STE adds. All these registers can
> only be reached in **supervisor mode** (see [the TOS sheet](trap-et-systeme.md)), and in user
> mode, touching them causes a bus error, the 2 bombs. Writing addresses on 32 bits (`$FFFF8240`)
> keeps the program valid on the TT and the Falcon.

## Memory map

| Addresses | Contents |
|---|---|
| `$000000`-`$0003FF` | 68000 vector table (the first 8 bytes are read from ROM at startup) |
| `$000400`-`$0007FF` | TOS system variables (`_v_bas_ad` at `$44E`, `_vbclock` at `$462`, `_hz_200` at `$4BA`…) |
| `$000800`-end of RAM | free memory, programs; the screen sits at the very top of RAM (`$F8000` with 1 MB) |
| `$E00000`-`$EFFFFF` | ROM of TOS 1.06 and later (STE) — `$FC0000` for TOS 1.00 to 1.04 |
| `$FA0000`-`$FBFFFF` | cartridge |
| `$FF8000`-`$FFFFFF` | hardware registers |

## Hardware registers

| Address | Register | Role |
|---|---|---|
| `$FFFF8001` | memory configuration | size of the RAM banks (set by TOS) |
| `$FFFF8201` / `$FFFF8203` | video base, high / middle bytes | address of the displayed screen (bits 23-8) |
| `$FFFF820D` | video base, low byte (STE) | |
| `$FFFF8205` / `07` / `09` | video counter (read) | address currently being read by the Shifter |
| `$FFFF820A` | synchronization | bit 1: 1 = 50 Hz, 0 = 60 Hz |
| `$FFFF820F` / `$FFFF8265` | extra line width / fine pixel scrolling (STE) | hardware scrolling |
| `$FFFF8240`-`$FFFF825E` | palette | 16 colors `$0RVB` (red, green, blue; 3 bits per component; 4 on STE) |
| `$FFFF8260` | resolution | 0 = low, 1 = medium, 2 = high |
| `$FFFF8604` / `$FFFF8606` | DMA controller | floppy disk and hard disk |
| `$FFFF8800` | YM2149: select / read | number of the register to read or write |
| `$FFFF8802` | YM2149: write | value for the selected register |
| `$FFFF8900`-`$FFFF893F` | DMA sound (STE) | 8-bit stereo samples |
| `$FFFF8A00`-`$FFFF8A3C` | Blitter (STE, Mega ST) | block copies |
| `$FFFFFA01`-`$FFFFFA2F` | MFP 68901 | interrupts, timers (see [the MFP sheet](interruptions-mfp68901.md)) |
| `$FFFFFC00` / `$FFFFFC02` | keyboard ACIA: control / data | communication with the keyboard processor (IKBD) |
| `$FFFFFC04` / `$FFFFFC06` | MIDI ACIA: control / data | |

## Sound: the YM2149

The sound generator, a Yamaha **YM2149** related to the AY-3-8910, has 3 square-wave channels (A,
B, C), a noise generator and an envelope, controlled by 16 registers. You select a register by
writing its number to `$FFFF8800`, then you write its value to `$FFFF8802`, or read it at
`$FFFF8800`.

| Register | Role |
|---|---|
| 0 / 1 | period of channel A (12 bits: low byte, then 4 high bits) |
| 2 / 3 | period of channel B |
| 4 / 5 | period of channel C |
| 6 | noise period (5 bits) |
| 7 | **mixer**: bits 0-2 = square wave A, B, C; bits 3-5 = noise A, B, C (**0 = on**); bits 6-7 = port direction |
| 8 / 9 / 10 | volume of channels A, B, C (0 to 15); bit 4 = follow the envelope |
| 11 / 12 | envelope period (16 bits) |
| 13 | envelope shape |
| 14 | port A: floppy drive and side selection (bits 0-2), RS-232 and printer lines |
| 15 | port B: printer data |

The frequency of a channel is 2,000,000 / (16 × period), that is 125,000 / period, so the 440 Hz
*A* needs a period of 284.

```asm
; An "A" note on channel A (in supervisor mode)
YM      EQU     $FFFF8800
        MOVE.B  #0,YM           ; register 0: period of A, low byte
        MOVE.B  #284&$FF,YM+2
        MOVE.B  #1,YM           ; register 1: period of A, 4 high bits
        MOVE.B  #284>>8,YM+2
        MOVE.B  #8,YM           ; register 8: volume of A
        MOVE.B  #15,YM+2
        MOVE.B  #7,YM           ; register 7: mixer
        MOVE.B  YM,D0           ; read the current value (port A must not change direction)
        ANDI.B  #%11000000,D0   ; keep bits 6-7 (port direction)
        ORI.B   #%00111110,D0   ; everything off except square wave A (bit 0 at 0)
        MOVE.B  D0,YM+2
```

> Register 14 also controls the floppy drives, so you never write it at random. To play a sequence
> of notes without doing everything by hand, the XBIOS provides `Dosound` (XBIOS 32), which reads a
> list of commands on each 50 Hz interrupt.

## Keyboard, mouse and joystick

The keyboard has its own processor, the **IKBD**, a 6301 connected through a serial link to the
ACIA (`$FFFFFC00`). It sends one byte per key, its code (*scancode*), with bit 7 set to 1 when the
key is released. The mouse and the joystick arrive in packets: for the mouse, a header from `$F8`
to `$FB` followed by the X and Y movements; for the joystick, a `$FE` or `$FF` header followed by
the state, with bits 0 to 3 for up, down, left, right and bit 7 for the button.

TOS decodes all this under the ACIA interrupt, MFP channel 6. A program gets the packets by hooking
the routines of the table returned by `Kbdvbase` (XBIOS 34), or the keys through `Crawcin` and
`Bconin`.

## Exceptions and "bombs"

When an unexpected exception occurs, TOS displays as many **bombs** as the vector number:

| Bombs | Cause | Classic mistake |
|---|---|---|
| 2 | bus error | access to the hardware or the vectors in user mode, address with no memory |
| 3 | address error | word or long at an odd address (missing `EVEN`, index not multiplied) |
| 4 | illegal instruction | jump into data, unbalanced stack |
| 5 | division by zero | |
| 8 | privilege violation | `MOVE #…,SR` in user mode |

> The 68k Trainer simulator simulates the palette, the video base, the resolution, the YM2149, the
> MFP and the keyboard ACIA, but not the DMA sound or the Blitter of the STE, which Hatari emulates
> in STE mode.

> Sheet created on October 21, 2026 (Claude).
