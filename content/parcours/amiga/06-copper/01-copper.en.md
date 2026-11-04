## A processor for the screen

The **Copper** (*co-processor*) is a tiny processor housed in Agnus. It only knows three
instructions, but it executes them following the beam that sweeps the screen, without tying up
the 68000:

- MOVE writes a value to a chip register;
- WAIT waits for the beam to reach a position;
- SKIP skips the next instruction if the beam has passed a position.

Its program, the copper list, is stored in Chip RAM, and each instruction there is two words long.
Agnus restarts the list from the beginning, at the address held in `COP1LC`, on every frame.

## MOVE

```asm
    DC.W    $0180,$0F00     ; MOVE: $0F00 into register $DFF180 (COLOR00)
```

The first word is the register's offset, `$180` for COLOR00. It is always even, and its bit 0 at 0
is what marks a MOVE; the second word is the value. The Copper cannot write to the registers
below `$80` (DMACON, the Blitter…) unless it is allowed to, and an attempt stops it dead.

## WAIT

```asm
    DC.W    $8007,$FFFE     ; WAIT: wait for line $80, horizontal position $06
```

The first word gives the position, with the line in the high byte (`$80`) and the horizontal
position in the low byte. Its **bit 0 at 1** tells a WAIT apart from a MOVE: `$07` therefore means
"position `$06`", at the very start of the line, before the visible part. The second word, `$FFFE`,
asks for all the bits to be compared; the next topic shows that you can ignore some of them.

The Copper waits for the beam to have reached this position, or to have passed it, then moves on to
the next instruction.

## The end of the list

```asm
    DC.W    $FFFF,$FFFE     ; wait for line 255, position $FE... which does not exist
```

Since a line does not go as far as position `$FE`, the Copper waits until the end of the frame,
where Agnus restarts it at the beginning. This is the conventional end of every copper list.

## A gradient

A sequence of WAIT and MOVE instructions changes the background color line after line:

```asm
copper:
    DC.W    $0100,$0200     ; no plane: the whole screen is in color 0
    DC.W    $4007,$FFFE,$0180,$0001
    DC.W    $4107,$FFFE,$0180,$0002
    DC.W    $4207,$FFFE,$0180,$0003
    ; ...
    DC.W    $FFFF,$FFFE
```

The Copper changes a color in 4 "color" cycles, the time of 8 pixels, and can therefore make dozens
of changes on the same line. The color bars of demos, the gradient skies of games and screens with
more than 32 colors all come from this.

## Starting it

```asm
    MOVE.L  #copper,$80(A5)     ; COP1LC
    MOVE.W  D0,$88(A5)          ; COPJMP1: the Copper jumps there at once
    MOVE.W  #$8280,$96(A5)      ; DMACON: SET + DMAEN + COPEN
```

Without the write to `COPJMP1`, the Copper would only pick up the new list on the next frame.
