## 50 frames per second

The Shifter reads the screen 50 times a second on a European ST. Between two frames, the
monitor's beam goes back up to the top of the screen, which is the vertical retrace, and the ST
signals it with an interrupt, the **VBL** (*Vertical BLank*, vector `$70`, level 4).

To animate cleanly, you lock the program to this rhythm, one step of the animation per frame. The
XBIOS function 37, `Vsync`, waits precisely for the next VBL:

```asm
    MOVE.W  #37,-(SP)       ; Vsync
    TRAP    #14
    ADDQ.L  #2,SP
```

In 68k Trainer, the Real time button runs the program at the speed of a real ST, and you see the
animation as on a monitor; step by step, a `Vsync` goes by in a single click.

## The budget of a frame

An ST runs at 8 MHz, so a frame lasts 160,256 clock cycles: that is all the time you have to
erase, compute and redraw. A simple instruction takes 4 cycles, and each memory access adds 4 per
word. The debugger shows the cycle counter under the status register.

Erasing the whole screen with a `CLR.L (A0)+` / `DBF` loop costs about 8,000 × 22 = 176,000
cycles, more than one frame: this is why games only erase what moves.

## Flicker and double buffering

If you erase then redraw on the displayed screen, the beam may pass at the wrong moment and show
the sprite half erased, and the picture flickers. The classic solution is **double buffering**:
you reserve two screens, draw on the one you cannot see (the *logical* screen), then ask the
Shifter to display the one you have just finished (the *physical* screen) and wait for the VBL, so
that the swap happens during the retrace of the beam. On the next frame, the roles are reversed.

The swap is done with XBIOS 5, `Setscreen(logical, physical, resolution)`, where −1 leaves a
value unchanged:

```asm
    MOVE.W  #-1,-(SP)       ; resolution: unchanged
    MOVE.L  D0,-(SP)        ; physical screen (displayed)
    MOVE.L  D0,-(SP)        ; logical screen (where TOS draws)
    MOVE.W  #5,-(SP)        ; Setscreen
    TRAP    #14
    LEA     12(SP),SP
```

## A screen starts on a multiple of 256

An ST's Shifter only stores two bytes of the screen address (`$FF8201` and `$FF8203`, bits 23-16
and 15-8): the low-order byte is always 0, so a screen must start at an address that is a multiple
of 256. To be sure of it, you reserve 256 extra bytes and round the address:

```asm
    MOVE.L  #ECRANS+255,D0
    CLR.B   D0              ; multiple of 256 above ECRANS
    ; ...
    SECTION BSS
ECRANS: DS.B    32000+256
```

If you forget it, the Shifter rounds down by itself, and the picture appears shifted.
