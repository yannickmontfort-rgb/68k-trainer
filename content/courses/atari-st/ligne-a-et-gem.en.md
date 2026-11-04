---
title: "Line A and GEM (AES/VDI)"
source: "cours_asm_68000.pdf — Le Féroce Lapin, Volume 2, lessons 7 to 9 (adapted); Atari ST Profibuch; Atari's Line-A and GEM documentation. Completed and corrected on October 21, 2026."
themes: ["graphisme", "gem"]
---

# Line A and GEM (AES/VDI)

> GEM is vast, and this sheet sticks to the architecture and the basic calls, enough to write a
> first program. For a specific function, the reference remains Atari's documentation (Bible ST,
> Profibuch, Atari Compendium).

> The 68k Trainer simulator knows the Line A functions `$A000` to `$A003`, `$A009` and `$A00A`,
> with drawing identical to EmuTOS, and the AES functions `appl_init`, `appl_exit`, `form_alert`,
> `graf_handle` and `graf_mouse`. For the rest, and for the VDI, run your program in Hatari with the
> "Try in Hatari" button.

## Line A: a 68000 mechanism put to use by TOS

An instruction word that starts with `$A` (`$A000` to `$AFFF`) is not a 68000 instruction: the
processor triggers an exception and jumps to vector 10, at address `$28`. This generic 68000
mechanism is called the line A emulator, and the Atari ST hooks its **low-level graphics
primitives** onto it, the same ones the GEM VDI uses. On the Amiga, this vector serves no such
purpose, and an `$Axxx` causes an error there.

The assembler knows no `$Axxx` instruction, so you write the functions as data:

```asm
        DC.W    $A000           ; Line A no. 0: initialization
```

| Code | Function | Code | Function |
|---|---|---|---|
| `$A000` | initialization (returns the useful addresses) | `$A008` | text (*textblt*) |
| `$A001` | set a pixel | `$A009` | show the mouse |
| `$A002` | read a pixel | `$A00A` | hide the mouse |
| `$A003` | draw a line | `$A00B` | change the mouse shape |
| `$A004` | draw a horizontal line | `$A00C` | erase a sprite |
| `$A005` | filled rectangle | `$A00D` | draw a sprite |
| `$A006` | filled polygon (one line) | `$A00E` | copy a surface (*copy raster*) |
| `$A007` | block copy (*bitblt*) | `$A00F` | fill (*seed fill*) |

You always start with `$A000`, which returns in A0 (and D0) the address of the **Line A
variables**, in A1 the font table and in A2 the routine table. Parameters go through these
variables and through the arrays whose addresses they hold:

| Offset | Variable | Role |
|---|---|---|
| 0 | `PLANES` | number of screen planes |
| 2 | `WIDTH` | bytes per line |
| 4 | `CONTRL` | address of the control array |
| 8 | `INTIN` | address of the integer parameters |
| 12 | `PTSIN` | address of the coordinates (x, y pairs) |
| 16 / 20 | `INTOUT` / `PTSOUT` | addresses of the results |
| 24-30 | `COLBIT0`-`COLBIT3` | drawing color, one bit per plane |
| 32 | `LSTLIN` | in XOR mode only: 0 = the last point is not drawn (so that the vertex shared by two segments is not inverted twice), any other value = it is drawn |
| 34 | `LNMASK` | line pattern (`$FFFF` = solid line) |
| 36 | `WMODE` | writing mode (0 replace, 1 transparent, 2 XOR, 3 reverse transparent) |
| 38-44 | `X1`, `Y1`, `X2`, `Y2` | ends of a line or corners of a rectangle |

```asm
; Set pixel (160, 100) in color 1, then draw a line in color 3
        DC.W    $A000           ; A0 = Line A variables
        MOVEA.L A0,A5           ; A5 keeps them (Line A destroys D0-D2/A0-A2)
        MOVEA.L 8(A5),A1        ; INTIN
        MOVE.W  #1,(A1)         ; INTIN[0] = color
        MOVEA.L 12(A5),A1       ; PTSIN
        MOVE.W  #160,(A1)       ; PTSIN[0] = x
        MOVE.W  #100,2(A1)      ; PTSIN[1] = y
        DC.W    $A001           ; set the pixel

        MOVE.W  #1,24(A5)       ; color 3 = %0011: COLBIT0 = 1, COLBIT1 = 1
        MOVE.W  #1,26(A5)
        CLR.W   28(A5)          ; COLBIT2 = 0
        CLR.W   30(A5)          ; COLBIT3 = 0
        MOVE.W  #$FFFF,34(A5)   ; solid line
        CLR.W   36(A5)          ; replace mode
        MOVE.W  #-1,32(A5)      ; LSTLIN (no effect outside XOR mode)
        MOVE.W  #10,38(A5)      ; X1
        MOVE.W  #10,40(A5)      ; Y1
        MOVE.W  #300,42(A5)     ; X2
        MOVE.W  #190,44(A5)     ; Y2
        DC.W    $A003           ; draw the line
```

These arrays are **shared with GEM**, and a GEM call between two Line A calls can overwrite their
contents: you therefore fill them just before each call.

Atari declared Line A "no longer to be used" from the TT onward, because it does not handle graphics
cards, but it remains handy on the ST for the mouse and the fast primitives.

## GEM: AES + VDI

GEM is called through `TRAP #2`, with in D0 the number of the part being called and in D1 the
address of a **parameter block**, a list of array addresses:

| Part | D0 | Role | Parameter block (addresses of…) |
|---|---|---|---|
| **AES** (*Application Environment System*) | `$C8` (200) | windows, menus, dialog boxes, events | `CONTROL`, `GLOBAL`, `INT_IN`, `INT_OUT`, `ADDR_IN`, `ADDR_OUT` |
| **VDI** (*Virtual Device Interface*) | `$73` (115) | device-independent drawing: lines, circles, text | `CONTRL`, `INTIN`, `PTSIN`, `INTOUT`, `PTSOUT` |

For the AES, the `CONTROL` array describes the call: `CONTROL[0]` gives the function number, and
the next four words the number of elements of `INT_IN`, `INT_OUT`, `ADDR_IN` and `ADDR_OUT`. The
main result comes back in `INT_OUT[0]`.

| AES function | No. | CONTROL | Inputs | Result |
|---|---|---|---|---|
| `appl_init` | 10 | 10, 0, 1, 0, 0 | — | `INT_OUT[0]` = application ID (−1 = failure) |
| `appl_exit` | 19 | 19, 0, 1, 0, 0 | — | |
| `form_alert` | 52 | 52, 1, 1, 1, 0 | `INT_IN[0]` = default button, `ADDR_IN[0]` = text | `INT_OUT[0]` = button clicked (1 to 3) |
| `graf_handle` | 77 | 77, 0, 5, 0, 0 | — | `INT_OUT[0]` = VDI device number of the screen |
| `evnt_multi` | 25 | 25, 16, 7, 1, 0 | events awaited… | event that occurred |

A first GEM program can simply display an alert box:

```asm
        SECTION TEXT
DEBUT:  LEA     CONTROL,A3
        MOVE.W  #10,(A3)        ; appl_init: register with GEM
        CLR.W   2(A3)           ; 0 integers in
        MOVE.W  #1,4(A3)        ; 1 integer out
        CLR.L   6(A3)           ; 0 addresses in, 0 out
        BSR     AES

        MOVE.W  #52,(A3)        ; form_alert
        MOVE.W  #1,2(A3)        ; 1 integer in: the default button
        MOVE.W  #1,4(A3)        ; 1 integer out: the button chosen
        MOVE.W  #1,6(A3)        ; 1 address in: the text
        CLR.W   8(A3)
        MOVE.W  #1,INT_IN       ; button 1 by default
        MOVE.L  #ALERTE,ADDR_IN
        BSR     AES             ; waits for the click; INT_OUT[0] = button clicked

        MOVE.W  #19,(A3)        ; appl_exit
        CLR.W   2(A3)
        MOVE.W  #1,4(A3)
        CLR.L   6(A3)
        BSR     AES

        CLR.W   -(SP)           ; Pterm0
        TRAP    #1

AES:    MOVE.L  #AES_PB,D1      ; address of the parameter block
        MOVE.W  #$C8,D0         ; AES
        TRAP    #2
        RTS

        SECTION DATA
AES_PB: DC.L    CONTROL,GLOBAL,INT_IN,INT_OUT,ADDR_IN,ADDR_OUT
ALERTE: DC.B    '[1][Bonjour depuis le GEM !|Seconde ligne][ OK | Annuler ]',0
        EVEN

        SECTION BSS
CONTROL:  DS.W  5
GLOBAL:   DS.W  15
INT_IN:   DS.W  16
INT_OUT:  DS.W  7
ADDR_IN:  DS.L  2
ADDR_OUT: DS.L  1
```

The text of an alert follows the format `[icon][line 1|line 2…][button 1|button 2…]`, with icon 0
(none), 1 (exclamation mark), 2 (question mark) or 3 (stop), at most 5 lines of 30 characters and 3
buttons.

For the VDI, you first ask the AES for the screen device number (`graf_handle`), then you open a
**virtual workstation** (`v_opnvwk`, VDI 100), which returns its own number in `CONTRL[6]`. Each VDI
call then puts this number in `CONTRL[6]`, the function number in `CONTRL[0]`, and the number of
points and integers supplied in `CONTRL[1]` and `CONTRL[3]`. Among the common functions are
`v_pline` (6, polyline), `v_gtext` (8, text), `v_circle` (11, subfunction 4) and `v_clsvwk` (101,
close).

A few notions come back in every GEM program:

- the **application ID**, which `appl_init` returns to each application, main program or desk
  accessory (`.ACC`); a GEM program starts with `appl_init` and ends with `appl_exit`;
- the **handle**, the number of a window (AES) or of a workstation (VDI), obtained when opening it;
- the **event loop**: a GEM program spends most of its time waiting for an event (click, key, window
  message) with `evnt_multi`, and while this is not real multitasking, accessories can become active
  during that wait;
- **resources** (`.RSC`), menus and dialog boxes drawn with a resource editor and loaded by
  `rsrc_load`, rather than described by hand in the source.

## Practical pitfalls

- Writing addresses on 32 bits, `$FFFF8800` rather than `$FF8800`, keeps the program valid on the
  TT and the Falcon, whose address bus is 32 bits wide.
- An FDB (*Form Definition Block*) describes a surface (address, width, height, number of planes)
  for a block copy (`vro_cpyfm`); a null address in it refers to the screen.
- Atari's user interface conventions, borrowed from the Macintosh, require that menu entries which
  open a dialog end with "…", that Tab and Shift+Tab move from one editable field to the next, and
  that Ctrl+X, Ctrl+C and Ctrl+V cut, copy and paste. An accessory stays small and unobtrusive.
- In a resource object tree, the `ob_flags` field uses only 9 bits out of 16, and the remaining 7
  bits can carry your own data, such as a keyboard shortcut tied to a button.

> Sheet completed and corrected on October 21, 2026 (Claude): Line A parameters go mostly through
> its variables (returned by `$A000`), not only through 5 arrays; table of the 16 functions, pixel
> and line example, `TRAP #2` call (D0/D1), first GEM program. Corrected on October 26, 2026: role
> of `LSTLIN`, checked against the EmuTOS source code and behavior.
