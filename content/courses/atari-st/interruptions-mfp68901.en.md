---
title: "Hardware interrupts: the MFP68901 controller"
source: "cours_asm_68000.pdf — Le Féroce Lapin, Volume 2, lesson 10 (adapted); MC68901 MFP (Motorola), Atari ST Hardware Register Listing. Completed and corrected on October 21, 2026."
themes: ["interruptions", "materiel"]
---

# Hardware interrupts: the MFP68901 controller

> The exception mechanism and the I2-I0 interrupt mask of the SR belong to the common core
> ([registres-et-memoire.md](../general/registres-et-memoire.md),
> [pile-et-sous-programmes.md](../general/pile-et-sous-programmes.md)). This sheet covers what is
> specific to the Atari ST.

## The three interrupt levels of the ST

| Level | Source | Vector | Use |
|---|---|---|---|
| 2 | **HBL** — end of each displayed line | `$68` | almost never used (masked by TOS) |
| 4 | **VBL** — beam returning to the top of the screen (50 or 60 Hz) | `$70` | synchronization, animation |
| 6 | **MFP 68901** — 16 sources on its own | `$100`-`$13C` | timers, keyboard, disk, printer |

TOS works with the mask at 3 (`MOVE.W #$2300,SR`), which lets the VBL and the MFP through but not
the HBL.

## The MFP and its 16 sources

The 68000 sees the **MFP 68901** (*Multi Function Peripheral*) as a single level 6 interrupt
source, but internally the MFP handles 16 channels ranked by priority, each with its own vector. On
the ST, TOS sets its `VR` register to `$48`: the vectors start at number 64 (`$100`), and the
**software end-of-interrupt** mode is active (S bit at 1).

| Channel | Source | Vector | Group / bit |
|---|---|---|---|
| 15 | monochrome monitor detection (GPIP 7) | `$13C` | A / 7 |
| 14 | RS-232: ring indicator | `$138` | A / 6 |
| 13 | **Timer A** (free: music, effects) | `$134` | A / 5 |
| 12 | RS-232: receive buffer full | `$130` | A / 4 |
| 11 | RS-232: receive error | `$12C` | A / 3 |
| 10 | RS-232: transmit buffer empty | `$128` | A / 2 |
| 9 | RS-232: transmit error | `$124` | A / 1 |
| 8 | **Timer B** (counts displayed lines) | `$120` | A / 0 |
| 7 | disk controller (FDC/DMA) | `$11C` | B / 7 |
| 6 | keyboard and MIDI **ACIA** | `$118` | B / 6 |
| 5 | **Timer C** (TOS 200 Hz system clock) | `$114` | B / 5 |
| 4 | Timer D (RS-232 baud rate) | `$110` | B / 4 |
| 3 | Blitter (Mega ST, STE) | `$10C` | B / 3 |
| 2 | RS-232: CTS | `$108` | B / 2 |
| 1 | RS-232: DCD | `$104` | B / 1 |
| 0 | printer: BUSY | `$100` | B / 0 |

## The MFP registers

They occupy the odd addresses from `$FFFFFA01` to `$FFFFFA2F`, and you access them by byte, in
supervisor mode. The interrupt registers come in pairs, group A for channels 8 to 15 and group B
for channels 0 to 7, unrelated to Timers A and B.

| Address | Register | Role |
|---|---|---|
| `$FFFFFA01` | `GPIP` | state of the 8 input lines (bit 0 = printer BUSY, bit 4 = ACIA, bit 5 = disk, bit 7 = monitor) |
| `$FFFFFA07` / `$FFFFFA09` | `IERA` / `IERB` | **enable**: bit at 0 = the channel is ignored completely |
| `$FFFFFA0B` / `$FFFFFA0D` | `IPRA` / `IPRB` | **pending**: set to 1 when the event occurs; writing a 0 cancels it |
| `$FFFFFA0F` / `$FFFFFA11` | `ISRA` / `ISRB` | **in service**: the channel's routine is running |
| `$FFFFFA13` / `$FFFFFA15` | `IMRA` / `IMRB` | **mask**: bit at 0 = the event is recorded (IPR) but does not trigger an interrupt |
| `$FFFFFA17` | `VR` | number of the first vector (bits 7-4), bit 3 = software end of interrupt |
| `$FFFFFA19` | `TACR` | Timer A control |
| `$FFFFFA1B` | `TBCR` | Timer B control |
| `$FFFFFA1D` | `TCDCR` | control of Timers C (bits 6-4) and D (bits 2-0) |
| `$FFFFFA1F` | `TADR` | Timer A data (starting value of the countdown) |
| `$FFFFFA21` | `TBDR` | Timer B data |
| `$FFFFFA23` / `$FFFFFA25` | `TCDR` / `TDDR` | Timers C and D data |

With software end of interrupt, the TOS mode, the channel's `ISR` bit goes to 1 when handling
starts and stays there until the routine clears it itself. In the meantime, no channel of lower or
equal priority can interrupt it. An MFP routine must therefore **clear its ISR bit** just before
`RTE`, otherwise no interrupt of the same or lower priority arrives anymore, and both the keyboard
and the clock freeze. In automatic mode (bit 3 of `VR` at 0), the `ISR` bit drops back on its own,
and an interrupt can interrupt itself.

## The timers

Each timer counts down from the value of its data register (1 to 256, 0 meaning 256); when it
reaches zero, it triggers its interrupt and starts again. The timers receive a 2.4576 MHz clock,
divided by a **prescaler** chosen in the control register:

| Value (bits 2-0) | Mode |
|---|---|
| 0 | timer stopped |
| 1 / 2 / 3 / 4 | delay, ÷ 4 / ÷ 10 / ÷ 16 / ÷ 50 |
| 5 / 6 / 7 | delay, ÷ 64 / ÷ 100 / ÷ 200 |
| 8 (Timers A and B) | **event counting** on an external input |

The frequency is 2,457,600 / prescaler / data: ÷ 200 and a data value of 246 give about 50 Hz.

In event counting mode, Timer B counts the ends of displayed lines, and with data *n* it interrupts
every *n* lines. This is the basis of the **rasters** of ST demos, which change the colors in the
middle of the screen.

## Installing your own routine on a timer

With Timer A (channel 13, vector `$134`, bit 5 of group A), installation follows this order:

1. Switch to supervisor mode (`Super` or `Supexec`).
2. Block interrupts (`MOVE.W #$2700,SR`) for the duration of the operation.
3. Save the old vector and the enable and mask registers (`IERA`, `IMRA`), to restore them when
   quitting; since TOS does not use Timer A, stopping it when leaving is enough.
4. Install your routine in the vector, set up the timer, then enable and unmask its channel.
5. Return to the normal TOS level (`MOVE.W #$2300,SR`).

```asm
MFP     EQU     $FFFFFA00

INSTALLE:                       ; in supervisor mode
        MOVE.W  #$2700,SR       ; no more interrupts during the operation
        MOVE.L  $134.W,ANCIEN_TA ; old Timer A vector
        MOVE.B  MFP+$07,ANC_IERA
        MOVE.B  MFP+$13,ANC_IMRA
        MOVE.L  #TIMER_A,$134.W ; our routine
        CLR.B   MFP+$19         ; Timer A stopped during setup
        MOVE.B  #246,MFP+$1F    ; data: 246
        MOVE.B  #7,MFP+$19      ; ÷ 200: about 50 interrupts per second
        BSET    #5,MFP+$07      ; IERA: channel 13 enabled
        BSET    #5,MFP+$13      ; IMRA: channel 13 unmasked
        MOVE.W  #$2300,SR       ; interrupts accepted again
        RTS

TIMER_A:
        MOVEM.L D0-D1/A0,-(SP)  ; save everything you use: you do not know what you are interrupting
        ADDQ.W  #1,COMPTEUR     ; ... the handling, kept short ...
        MOVEM.L (SP)+,D0-D1/A0
        BCLR    #5,MFP+$0F      ; ISRA: end of interrupt (TOS software mode)
        RTE                     ; return from exception, not RTS

DESINSTALLE:                    ; in supervisor mode, before quitting
        MOVE.W  #$2700,SR
        CLR.B   MFP+$19         ; Timer A stopped
        MOVE.B  ANC_IERA,MFP+$07
        MOVE.B  ANC_IMRA,MFP+$13
        MOVE.L  ANCIEN_TA,$134.W
        MOVE.W  #$2300,SR
        RTS

ANCIEN_TA DC.L  0
ANC_IERA  DC.B  0
ANC_IMRA  DC.B  0
COMPTEUR  DC.W  0
```

When quitting the program, you **restore everything**, MFP registers and original vector.
Otherwise the routine stays hooked after the program has ended, and on the next trigger the machine
jumps into memory that no longer holds your code and crashes.

> TOS also provides `Xbtimer(timer, control, data, routine)` (XBIOS 31) and `Jenabint`/`Jdisint`
> (XBIOS 27/26), which do this setup for you.

## The VBL: the simplest routine

To run code 50 times per second without touching the MFP, you only need to register in the TOS
**VBL list** (`_vblqueue`, `$456`, with `nvbls` entries), each routine of which TOS calls on every
VBL. A VBL routine is a plain subroutine that ends with `RTS`, TOS taking care of the `RTE`, and it
may modify D0-D7/A0-A6.

```asm
AJOUTE_VBL:                     ; in supervisor mode
        MOVEA.L $456.W,A0       ; _vblqueue: array of nvbls addresses
        MOVE.W  $454.W,D0       ; nvbls
        SUBQ.W  #1,D0
.cherche TST.L  (A0)+           ; a free slot holds 0
        DBEQ    D0,.cherche
        BNE     .pleine         ; no free slot
        MOVE.L  #MA_VBL,-(A0)   ; install ourselves in the slot found
.pleine RTS

MA_VBL: ADDQ.W  #1,COMPTEUR
        RTS
```

Remember to reset the slot to 0 before quitting.

> The 68k Trainer simulator simulates the MFP (interrupt registers, Timers A to D in delay mode,
> Timer B in line counting), as well as the VBL and its list. The Atari course devotes a whole
> chapter to interrupts.

> Sheet completed and corrected on October 21, 2026 (Claude): TOS uses software end of interrupt
> (`VR` = `$48`), not automatic; `BCLR #5,ISRA` with the real address; table of the 16 channels,
> registers, timers, VBL.
