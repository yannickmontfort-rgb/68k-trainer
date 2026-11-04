## Why take over?

While your program runs, the system keeps working: on every frame, graphics restarts its own copper
list, the one for the Workbench screen, its interrupts move the mouse pointer, and the Blitter
draws windows. If you program the chips alongside it, it undoes your work 50 times per second, as
it did with the background color in chapter 1.

Demos and games therefore shut the system down, do what they want with the chips, then restore it
exactly as it was. A program that forgets to give it back leaves a frozen Amiga, with a black
screen and a motionless mouse.

## Taking over, cleanly

1. Open graphics.library and note the view being displayed (`gb_ActiView`, 34 bytes from its base).
2. `LoadView(0)` (graphics, −222) then `WaitTOF` (−270) twice: the system no longer displays
   anything and has finished its last frame.
3. `OwnBlitter` (−456) then `WaitBlit` (−228): the Blitter is ours, and it has finished what the
   system had asked of it.
4. `Forbid`: no more other tasks.
5. Save `DMACONR`, `INTENAR`, `ADKCONR` and the level 3 vector (`$6C`).
6. Cut everything: `$7FFF` in `INTENA`, `INTREQ` and `DMACON`, where bit 15 at 0 clears all the
   bits.

Then you turn on only what you need, for example the Copper:

```asm
    MOVE.L  #maliste,$80(A5)    ; COP1LC: the address of our copper list
    MOVE.W  D0,$88(A5)          ; COPJMP1: writing anything here starts the Copper
    MOVE.W  #$8280,$96(A5)      ; DMACON: SET + DMAEN + COPEN
```

## Giving control back, exactly as it was

1. Cut everything again (`$7FFF` in `INTENA`, `INTREQ`, `DMACON`) and put the `$6C` vector back.
2. Put back the system's copper list, whose address is in `gb_copinit`, 38 bytes from the base of
   graphics: you write it to `COP1LC`, then you write to `COPJMP1`.
3. Turn back on what was on, by writing the saved value with bit 15 at 1.

```asm
    MOVE.W  sauve_dmacon,D0
    OR.W    #$8000,D0           ; SET: turn back on the bits that were 1
    MOVE.W  D0,$96(A5)
    MOVE.W  sauve_intena,D0
    OR.W    #$C000,D0           ; SET + INTEN, the master interrupt switch
    MOVE.W  D0,$9A(A5)
```

4. `LoadView` of the old view, two `WaitTOF`, `DisownBlitter` (−462), `Permit`, and close
   graphics.library.

Without the `OR.W #$8000`, the saved word has its bit 15 at 0, and writing it to `DMACON` **turns
off** the system's channels instead of turning them back on. The Amiga manual supplied with
68k Trainer actually makes this mistake in its skeleton, where it adds `$8000` to the variable but
then writes another address: it is corrected here, see the errata.

## The amiga-systeme.s file

These two procedures are always the same, and 68k Trainer provides them in a file you can include
at the end of your programs, the way demomakers included their *startup*:

```asm
    BSR     prendre             ; on return: A5 = $DFF000, everything is off
    ; ... your program ...
    BSR     rendre              ; everything is given back
    RTS
    INCLUDE "amiga-systeme.s"
```

It also contains `attendre_vbl`, which waits for the beam to be at the bottom of the image, and
`attendre_clic`, which waits for a click of the left button. The example for this topic gives its
complete text, which is easy to read.

At the end of each program, 68k Trainer reports on what was given back: Permit, Enable, memory,
DMA, interrupts, copper list, `$6C` vector and view.
