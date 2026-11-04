## The problem: 16 pixels per word

A sprite placed at X = 44 does not fall at the start of a group, since 44 = 2 × 16 + 12. Its
pixels start at the 13th pixel of group no. 2, and those that stick out carry on into the next
group, 8 bytes further on. You must therefore shift the bits of the drawing right by `X mod 16`,
then write the left part into the first group and the overflow into the second.

## Working on 32 bits

If you shift a word with `LSR.W`, the bits that come out on the right are lost. So you place the
drawing at the top of a 32-bit register and shift the whole register with `LSR.L`: whatever
overflows from the high word simply drops into the low word.

```asm
    MOVEQ   #0,D0           ; the whole register at 0
    MOVE.B  (A2)+,D0        ; 8 pixels of the drawing (bits 7-0)
    ROR.L   #8,D0           ; -> bits 31-24
    LSR.L   D1,D0           ; shift by X mod 16
    SWAP    D0
    OR.W    D0,(A0)         ; high word: first group
    SWAP    D0
    OR.W    D0,8(A0)        ; low word: next group
```

`SWAP` exchanges the two halves of D0, and it is the fastest way to reach the high word. With a
byte `$FF` and a shift of 12, `$FF000000` becomes `$000FF000`: the high word `$000F` gives the
last 4 pixels of the first group, the low word `$F000` the first 4 of the next group.

A shift written as an immediate value (`LSR.L #n,D0`) only goes from 1 to 8. Beyond that, or when
the shift varies, you put it in a register, `LSR.L D1,D0`, which accepts 0 to 63.

## The mask

`OR` turns bits on but never turns them off. On a colored background, the background bits stay on
under the sprite and the colors mix: color 1 laid over color 2 gives color 3. So you first make a
hole in the background, plane by plane, before laying the drawing in it:

```text
    AND.W   inverted_mask,(A0)    ; 1) a hole in the background
    OR.W    drawing,(A0)          ; 2) the drawing in the hole
```

The **mask** has 1s wherever the sprite has a pixel, and `NOT` turns it into the inverted mask, 0
under the sprite and 1 elsewhere. The AND thus turns off the bits under the sprite without touching
the rest, and the mask is shifted exactly like the drawing.

## A routine from the manual to fix

Routine 7.3 of the manual, "moving to the nearest pixel", contains several errors: the same
alignment error as PSET, an `ADDA.L` with a high word never cleared, and above all a 16-bit shift
(`LSR.W`) that loses the overflow, followed by a `SWAP` that brings back a high word that was never
prepared. You repair it in an exercise.
