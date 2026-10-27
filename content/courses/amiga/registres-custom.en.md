---
title: "Amiga: custom chip and CIA registers (reference)"
source: "Amiga Hardware Reference Manual (3rd edition); registers of the 68k Trainer simulator (checked). Sheet created on 10/21/2026."
themes: ["hardware", "reference"]
---

# Amiga: custom chip and CIA registers

> This sheet applies to the Amiga 500 and its OCS chipset; the explanations are in
> [the chips and demos sheet](demos-et-custom-chips.md). Offsets start from **`$DFF000`**.
> R marks a read-only register, W a write-only one, and S a "SET/CLR" register, whose bit 15 says
> whether the bits written as 1 must be set to 1 (bit 15 = 1) or cleared to 0 (bit 15 = 0).

## General control

| Offset | Name | | Role |
|---|---|---|---|
| `$002` | `DMACONR` | R | active DMA channels, `BBUSY` (14), `BZERO` (13) |
| `$004` / `$006` | `VPOSR` / `VHPOSR` | R | beam position: `VPOSR` bit 0 = bit 8 of the line; `VHPOSR` = line (bits 15-8), column (bits 7-0) |
| `$00A` / `$00C` | `JOY0DAT` / `JOY1DAT` | R | mouse (port 1) / joystick (port 2) |
| `$016` | `POTGOR` | R | bit 10 = right mouse button (0 = pressed) |
| `$01C` / `$01E` | `INTENAR` / `INTREQR` | R | enabled / requested interrupts |
| `$034` | `POTGO` | W | to be set up to read the right button |
| `$096` | `DMACON` | W S | DMA channels (see below) |
| `$09A` | `INTENA` | W S | enabled interrupts |
| `$09C` | `INTREQ` | W S | interrupt requests (to be cleared in the routine) |
| `$09E` | `ADKCON` | W S | sound and disk settings |

`DMACON` bits: 15 SET/CLR, 14 `BBUSY` (read), 13 `BZERO` (read), 10 `BLTPRI` (Blitter priority),
**9 `DMAEN`** (master switch), 8 `BPLEN` (bitplanes), 7 `COPEN` (Copper), 6 `BLTEN` (Blitter),
5 `SPREN` (sprites), 4 `DSKEN` (disk), 3-0 `AUD3EN`-`AUD0EN`.

`INTENA` / `INTREQ` bits, with the interrupt level in parentheses: 15 SET/CLR,
**14 `INTEN`** (master switch, `INTENA` only), 13 `EXTER` (CIA B, level 6), 12 `DSKSYNC` (5), 11 `RBF` (5), 10-7 `AUD3`-`AUD0` (4),
6 `BLIT` (3), **5 `VERTB`** (VBL, 3), 4 `COPER` (3), 3 `PORTS` (CIA A, 2), 2 `SOFT` (1),
1 `DSKBLK` (1), 0 `TBE` (1).

## Copper

| Offset | Name | | Role |
|---|---|---|---|
| `$02E` | `COPCON` | W | bit 1 `CDANG`: allows the Copper to write to the Blitter registers |
| `$080` / `$082` | `COP1LCH` / `COP1LCL` | W | address of list no. 1 (reloaded every frame) |
| `$084` / `$086` | `COP2LCH` / `COP2LCL` | W | address of list no. 2 |
| `$088` / `$08A` | `COPJMP1` / `COPJMP2` | W | write anything: the Copper jumps to list 1 / 2 |

Each instruction is two words: `MOVE` = (even register, value), `WAIT` = (line << 8 + column + 1,
mask `$FFFE`) and `SKIP` = (position + 1, mask + 1). The list ends with `$FFFF,$FFFE`, and
`$FFDF,$FFFE` lets you get past line 255.

## Display (Denise)

| Offset | Name | | Role |
|---|---|---|---|
| `$08E` / `$090` | `DIWSTRT` / `DIWSTOP` | W | display window (standard PAL: `$2C81` / `$2CC1`) |
| `$092` / `$094` | `DDFSTRT` / `DDFSTOP` | W | data fetch (low resolution: `$0038` / `$00D0`) |
| `$0E0`-`$0F6` | `BPL1PTH`-`BPL6PTL` | W | addresses of the 6 bitplanes (2 words each) |
| `$100` | `BPLCON0` | W | see below |
| `$102` | `BPLCON1` | W | delay: playfield 2 (bits 7-4), playfield 1 (bits 3-0) |
| `$104` | `BPLCON2` | W | bit 6 = playfield 2 in front; sprite priorities (bits 5-0) |
| `$108` / `$10A` | `BPL1MOD` / `BPL2MOD` | W | modulos of odd / even planes |
| `$180`-`$1BE` | `COLOR00`-`COLOR31` | W | `$0RGB` palette |

`BPLCON0` bits: 15 `HIRES` (640 pixels), **14-12 `BPU`** (number of planes, 0 to 6), 11 `HOMOD`
(HAM), 10 `DBLPF` (dual playfield), 9 `COLOR` (set to 1), 2 `LACE` (interlace). So `$1200` gives
1 plane, `$5200` 5 planes (32 colors) and `$6A00` 6 planes in HAM.

## Sprites

| Offset | Name | | Role |
|---|---|---|---|
| `$120`-`$13E` | `SPR0PTH`-`SPR7PTL` | W | addresses of the data of the 8 sprites |
| `$140` + 8 × *n* | `SPRnPOS` | W | start line (bits 15-8), column / 2 (bits 7-0) |
| `$142` + 8 × *n* | `SPRnCTL` | W | end line (bits 15-8), bit 7 `ATTACH`, bits 2/1/0 = 9th bit of start / of end / bit 0 of the column |
| `$144` / `$146` + 8 × *n* | `SPRnDATA` / `SPRnDATB` | W | the two planes (written by the DMA) |

In Chip RAM, a sprite's data chains `POS`, `CTL`, then (plane 0, plane 1) for each line, and ends
with `0, 0`.

## Blitter

| Offset | Name | | Role |
|---|---|---|---|
| `$040` | `BLTCON0` | W | shift of A (bits 15-12), sources used `USEA`-`USED` (bits 11-8), minterm (bits 7-0) |
| `$042` | `BLTCON1` | W | shift of B (15-12), `EFE` (4), `IFE` (3), `FCI` (2), `DESC` (1, descending), `LINE` (0); in line mode: `SING` (1) |
| `$044` / `$046` | `BLTAFWM` / `BLTALWM` | W | masks of the first / last word of A |
| `$048` / `$04C` / `$050` / `$054` | `BLTCPT` / `BLTBPT` / `BLTAPT` / `BLTDPT` | W | addresses (2 words each) |
| `$058` | `BLTSIZE` | W | height × 64 + width in words (0 = 1,024 lines / 64 words): **starts** the job |
| `$060` / `$062` / `$064` / `$066` | `BLTCMOD` / `BLTBMOD` / `BLTAMOD` / `BLTDMOD` | W | modulos in bytes |
| `$070` / `$072` / `$074` | `BLTCDAT` / `BLTBDAT` / `BLTADAT` | W | fixed data (source not read) |

To write a minterm, you combine the three constants A = `$F0`, B = `$CC` and C = `$AA` with the
operators you need: `$F0` copies A, and `$CA` cuts B out with mask A over background C.

## Sound (Paula)

For channel *n* (0 to 3), offset `$0A0` + `$10` × *n*:

| Offset | Name | | Role |
|---|---|---|---|
| +`$0` / +`$2` | `AUDnLCH` / `AUDnLCL` | W | address of the sample (Chip RAM, signed bytes) |
| +`$4` | `AUDnLEN` | W | length in **words** |
| +`$6` | `AUDnPER` | W | period: 3,546,895 / desired frequency (PAL); 124 minimum |
| +`$8` | `AUDnVOL` | W | volume 0 to 64 |
| +`$A` | `AUDnDAT` | W | data (written by the DMA) |

Channels 0 and 3 come out on the left, channels 1 and 2 on the right. Sound starts when you turn
on the channel's DMA in `DMACON`, and Paula loops over the sample until you stop it.

## CIA A (`$BFE001`, odd addresses) and CIA B (`$BFD000`, even addresses)

The registers are spaced `$100` apart: `PRA` (+`$000`), `PRB` (+`$100`), `DDRA` (+`$200`), `DDRB` (+`$300`),
timer A low / high (+`$400` / +`$500`), timer B (+`$600` / +`$700`), event counter
`TOD` (+`$800` to +`$A00`), `SDR` (+`$C00`), `ICR` (+`$D00`), `CRA` / `CRB` (+`$E00` / +`$F00`).

| Address | Contents |
|---|---|
| `$BFE001` (CIA A `PRA`) | bit 7: joystick button (port 2), bit 6: left mouse button (port 1), bit 1: LED / filter, all three active low; bit 0: `OVL`, which at 1 maps the ROM at `$0`, as at startup |
| `$BFEC01` (CIA A `SDR`) | keyboard code (`NOT` then `ROR.B #1`) |
| `$BFED01` (CIA A `ICR`) | read: which interrupts (bit 7 = at least one); write: enable (bit 7 = 1) or disable |
| `$BFD100` (CIA B `PRB`) | motor, select, head and direction of the drives |

The timers count at the rate of the E clock, 709,379 Hz in PAL, that is the 68000 clock divided
by 10. CIA A interrupts arrive at level 2 (`PORTS`), CIA B interrupts at level 6 (`EXTER`).

> Sheet created on 10/21/2026 (Claude) from the simulator's registers (checked against the
> Hardware Reference Manual).
