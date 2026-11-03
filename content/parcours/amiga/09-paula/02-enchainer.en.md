## Paula copies, then signals

When a channel's DMA starts, Paula copies `AUDxLC` and `AUDxLEN` into its internal counters,
starts playing and immediately requests the channel's **interrupt**: bits 7 to 10 of `INTREQ`,
AUD0 to AUD3, at level 4. This request means that it has noted the address and the length, and
that you can prepare what comes next.

At the end of the block, Paula starts again with the values that `AUDxLC` and `AUDxLEN` hold at
that moment, and requests the interrupt again. By writing the next block as soon as the request
arrives, you therefore chain pieces of sound without any gap.

## A sound played only once

A sound effect, a shot or an explosion, must only be heard once. You use the first request to
give the channel a tiny, silent next block, which it will replay in a loop without anyone hearing
it.

```asm
    MOVE.W  #$0080,$9C(A5)  ; clear an old AUD0 request
    MOVE.W  #$8201,$96(A5)  ; play
.note:
    BTST    #7,$1F(A5)      ; INTREQR, bit 7: has Paula noted the block?
    BEQ.S   .note
    MOVE.L  #silence,$A0(A5); the next block: one word of zeros...
    MOVE.W  #1,$A4(A5)      ; ... one word long
    ; ...
silence: DC.W   0
```

You do not even need an interrupt routine: watching the bit in `INTREQR` is enough. Music
players, on the other hand, install a real routine (vector `$70`, level 4) or use a CIA-B timer,
set to 50 Hz, to move forward through the score.

## The filter

A low-pass filter softens the sound of the Amiga 500. It depends on bit 1 of `$BFE001` (CIA-A),
which also drives the power LED: at 0, the filter is active and the LED is bright; at 1, the
filter is off and the LED dims. Demos often turn it off for a brighter sound, and the LED then
blinks in time with the music that plays with it.
