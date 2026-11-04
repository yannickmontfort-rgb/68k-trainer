## Down to the pixel

The Blitter works in words of 16 pixels. To put a drawing at an x coordinate that is not a
multiple of 16, it **shifts** the data of A and B to the right on the fly, by 0 to 15 bits: the
shift of A, ASH, takes bits 15-12 of `BLTCON0`, and that of B, BSH, bits 15-12 of `BLTCON1`.

For a drawing at x coordinate x, the shift is x mod 16, and the first destination word is the one
that contains x, at byte `(x ÷ 16) × 2` of the line.

```asm
    MOVE.W  D0,D1           ; D0 = x
    AND.W   #15,D1          ; the shift
    ROR.W   #4,D1           ; into bits 15-12
    OR.W    #$09F0,D1       ; A and D, D = A
    MOVE.W  D1,$40(A5)      ; BLTCON0
```

## The extra word

When it is shifted, a 16-pixel drawing spills over onto the next word and takes up two: you
therefore blit one extra word per line. This extra word of the source contains anything at all,
and the masks are what neutralize it: `BLTAFWM` (*First Word Mask*) applies to the first word of
each line of A, `BLTALWM` (*Last Word Mask*) to the last.

With `BLTALWM` = `$0000`, the extra word is emptied before being shifted, and only the bits that
spill over from the previous word reach the destination. Since the source reads one word too many
per line, its modulo is −2 to bring it back to the right place.

```asm
    MOVE.W  #$FFFF,$44(A5)  ; BLTAFWM: whole first word
    MOVE.W  #$0000,$46(A5)  ; BLTALWM: last word emptied
    MOVE.W  #-2,$64(A5)     ; BLTAMOD: step back one word at each line of the source
    MOVE.W  #40-4,$66(A5)   ; BLTDMOD: 2 words written per line of a 40-byte screen
    MOVE.W  #(16<<6)|2,$58(A5) ; 16 lines of 2 words
```

The 16 × 16 drawing is stored in one piece, one word per line: without this −2, its second line
would start one word too far.
