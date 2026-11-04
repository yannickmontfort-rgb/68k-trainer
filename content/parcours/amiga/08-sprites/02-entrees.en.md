## The buttons

CIA-A reads the fire buttons in the byte `$BFE001`. They are **active low**: the bit drops to 0
when you press.

| Bit of `$BFE001` | Button |
|---|---|
| 6 | left mouse button (port 1) |
| 7 | joystick button (port 2) |

```asm
    BTST    #7,$BFE001      ; joystick: fire?
    BEQ     tir             ; Z = 1: the bit is 0, the button is pressed
```

The right mouse button is read elsewhere, in bit 10 of `POTGOR` (`$DFF016`), which also drops to
0 when you press.

## The joystick

The direction of the port 2 joystick is read in `JOY1DAT` (`$DFF00C`), with an encoding inherited
from the mouse counters:

| Direction | How to read it |
|---|---|
| right | bit 1 |
| left | bit 9 |
| down | bit 1 EOR bit 0 |
| up | bit 9 EOR bit 8 |

```asm
    MOVE.W  $DFF00C,D0
    BTST    #1,D0           ; right?
    BNE     droite
    BTST    #9,D0           ; left?
    BNE     gauche
    MOVE.W  D0,D1
    LSR.W   #1,D1
    EOR.W   D0,D1           ; bit 0 = down, bit 8 = up
    BTST    #0,D1
    BNE     bas
    BTST    #8,D1
    BNE     haut
```

## The mouse

The port 1 mouse does not give a position, but two 8-bit **counters** in `JOY0DAT` (`$DFF00A`):
the high byte counts vertical movements, the low byte horizontal ones. They go up when the mouse
moves right or down, go down in the other direction, and wrap around from 255 to 0. To follow the
mouse, you keep the value from the previous frame and compute, once per frame, the difference as
a signed 8-bit number:

```asm
    MOVE.W  $DFF00A,D0
    MOVE.B  D0,D1
    SUB.B   ancien_x,D1     ; horizontal movement since the last frame
    MOVE.B  D0,ancien_x
    EXT.W   D1              ; signed: -128 to +127
    ADD.W   D1,souris_x
```

## The keyboard

The keyboard sends a code for each key pressed or released, through the serial port of CIA-A.
When a byte arrives, bit 3 of the ICR (`$BFED01`) goes to 1 and the byte waits in the `SDR`
register (`$BFEC01`), inverted and shifted; you put it back the right way like this:

```asm
    MOVE.B  $BFEC01,D0
    NOT.B   D0
    ROR.B   #1,D0           ; bits 6-0 = the key code, bit 7 = 1 if it is released
```

The keyboard then waits for a handshake: you briefly set the serial port to output (bit 6 of
`$BFEE01`), for about 85 microseconds. A few codes: Esc `$45`, Space `$40`, Return `$44`, arrows
`$4C` (up), `$4D` (down), `$4E` (right), `$4F` (left), F1 `$50`.

As long as the system is running, it reads the keyboard itself, and Read can return lines: you
only read the CIA yourself after shutting off its interrupts.
