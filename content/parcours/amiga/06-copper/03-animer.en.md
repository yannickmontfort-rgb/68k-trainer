## The 68000 changes the list

A copper list is just an area of memory: the 68000 can change its values between two frames, and
the Copper will apply the new version on the next frame. To animate, you mark the words to change
with labels:

```asm
copper:
    DC.W    $0100,$0200
barre:
    DC.W    $4007,$FFFE     ; the WAIT at the top of the bar
    DC.W    $0180,$0F00     ; red
fin_barre:
    DC.W    $4807,$FFFE     ; 8 lines further down
    DC.W    $0180,$0000     ; black
    DC.W    $FFFF,$FFFE
```

To place the bar at the line held in D0, you build the WAIT word:

```asm
    MOVE.W  D0,D1
    LSL.W   #8,D1           ; the line in the high byte
    OR.W    #$07,D1         ; position $06 and bit 0 at 1
    MOVE.W  D1,barre        ; the new WAIT
    ADD.W   #$0800,D1       ; 8 lines further down
    MOVE.W  D1,fin_barre
```

## At the right time: once per frame

If you change the list while the Copper is reading it, the image can be cut in two. You therefore
change it **during the beam's return**, at the bottom of the screen: `attendre_vbl`, in
`amiga-systeme.s`, waits for the beam to reach line 303, below the visible image.

```asm
.image:
    BSR     attendre_vbl    ; once per frame, below the visible image
    ADDQ.W  #1,D0           ; the bar moves down one line
    BSR     placer
    BTST    #6,$BFE001
    BNE.S   .image
```

## A bouncing bar: tables

For a path that is not a straight line, a bounce or a wave, you do not compute sines on the fly.
You read a table of positions computed in advance and stored in the program with `DC.B`, using an
index that moves forward on every frame and goes back to the start at the end of the table.

```asm
positions:
    DC.B    $40,$42,$46,$4C,$54,$5E,$6A,$78 ; ...
```

## The manual, corrected

Exercise 2 of the Amiga manual supplied with 68k Trainer moves its bar this way, but it only
changes the first WAIT, and the second one stays at line `$31`. As soon as the bar goes lower, this
second WAIT has already been passed when the Copper reaches it, the black comes back at once, and
the bar disappears. You must move both WAITs together, as above (see the errata).
