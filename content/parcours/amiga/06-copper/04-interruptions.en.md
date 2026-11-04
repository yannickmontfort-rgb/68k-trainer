## The VBL, without busy waiting

`attendre_vbl` keeps the 68000 busy watching the beam, and it does nothing else meanwhile. Paula
does better: at the start of each frame, it requests an interrupt, the **VBL** (*Vertical BLank*,
bit 5 of `INTREQ`, named VERTB). The 68000 stops what it is doing, runs a routine, then returns to
where it was.

On the Amiga, the VBL is a level 3 interrupt, like those of the Copper (COPER, bit 4) and the
Blitter (BLIT, bit 6), and the 68000 finds the address of the routine in vector `$6C`.

## Installing your routine

After `prendre`, which noted the old vector, you install your routine and enable the interrupt:

```asm
    MOVE.L  #vbl,$6C.W      ; the level 3 vector
    MOVE.W  #$C020,$9A(A5)  ; INTENA: SET + INTEN + VERTB
```

## Writing the routine

```asm
vbl:
    MOVEM.L D0-D7/A0-A6,-(SP)   ; damage nothing: the main program has been interrupted
    ; ... the work for this frame ...
    MOVE.W  #$0020,$DFF09C      ; INTREQ: the VERTB request has been handled
    MOVEM.L (SP)+,D0-D7/A0-A6
    RTE                         ; return from exception
```

The routine saves the registers it uses and restores them, since it interrupts the main program
anywhere. It **clears its request** in `INTREQ`, with bit 15 at 0 and bit 5 at 1; otherwise Paula
keeps it up, and as soon as the `RTE` runs the 68000 goes back into the routine, again and again,
without the main program ever running again. Finally, it ends with `RTE`, not `RTS`, to also
recover the status register that was pushed.

On faster Amigas (68020 and above), you often write to `INTREQ` twice, because the first write may
not have reached Paula when the `RTE` executes. On an A500, once is enough.

`rendre` puts the system's `$6C` vector back, which is why `prendre` had noted it.

**On an Amiga 1200 or 4000.** From the 68010 onward, the processor has a VBR register that says
where the vector table is. The system often stores it in Fast RAM, and writing to `$6C` is then
useless: the routine is never called. `prendre` takes care of this for you by bringing the table
back to `$0` on a 68010 or above, for the duration of the program, and `rendre` puts it back in
place. On an A500 (68000), the problem does not exist. (Checked in WinUAE with the AROS Kickstart
on a 68020.)

## The Copper triggers an interrupt

The Copper can write to `INTREQ` (`$09C`), which is above `$80`: `DC.W $009C,$8010` requests the
COPER interrupt at the precise moment the Copper reaches this line of the list. The level 3 routine
then looks at `INTREQR` to find out who called it:

```asm
    BTST    #4,$DFF01F      ; bit 4 of INTREQR: the Copper?
    BNE.S   .copper
```
