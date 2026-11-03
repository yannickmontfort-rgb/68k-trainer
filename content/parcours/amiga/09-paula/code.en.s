; Code for chapter 9, "Paula and sound". The samples are in Chip RAM (SECTION son,DATA_C).

;=== la-exemple
START:
    LEA     $DFF000,A5
    MOVE.L  #onde,$A0(A5)   ; AUD0LC: the sample
    MOVE.W  #16,$A4(A5)     ; AUD0LEN: 32 bytes = 16 words
    MOVE.W  #252,$A6(A5)    ; AUD0PER: 3,546,895 / (252 x 32) = 440 Hz, an A
    MOVE.W  #64,$A8(A5)     ; AUD0VOL: the maximum
    MOVE.W  #$8201,$96(A5)  ; DMACON: SET + DMAEN + AUD0EN
    MOVEQ   #49,D7          ; one second: 50 frames
.attente:
    BSR     attendre_vbl
    DBF     D7,.attente
    MOVE.W  #$0001,$96(A5)  ; AUD0EN at 0: silence
    MOVEQ   #0,D0
    RTS
    INCLUDE "amiga-systeme.s"

    SECTION son,DATA_C
onde:   DCB.B   16,100      ; a square wave: 16 bytes high...
        DCB.B   16,-100     ; ... 16 low

;=== periode-prediction
START:
    MOVE.L  #3546895,D0     ; Paula's clock
    DIVU    #440*32,D0      ; divided by (frequency x wave length)
    AND.L   #$FFFF,D0       ; the quotient only
    RTS

;=== volume-depart
START:
    LEA     $DFF000,A5
    MOVE.L  #onde,$A0(A5)
    MOVE.W  #16,$A4(A5)
    MOVE.W  #252,$A6(A5)
    MOVE.W  #0,$A8(A5)      ; <- the volume: as loud as possible
    MOVE.W  #$8201,$96(A5)
    MOVEQ   #24,D7
.attente:
    BSR     attendre_vbl
    DBF     D7,.attente
    MOVE.W  #$0001,$96(A5)
    MOVEQ   #0,D0
    RTS
    INCLUDE "amiga-systeme.s"

    SECTION son,DATA_C
onde:   DCB.B   16,100
        DCB.B   16,-100

;=== volume-solution
START:
    LEA     $DFF000,A5
    MOVE.L  #onde,$A0(A5)
    MOVE.W  #16,$A4(A5)
    MOVE.W  #252,$A6(A5)
    MOVE.W  #64,$A8(A5)     ; the maximum volume: 64
    MOVE.W  #$8201,$96(A5)
    MOVEQ   #24,D7
.attente:
    BSR     attendre_vbl
    DBF     D7,.attente
    MOVE.W  #$0001,$96(A5)
    MOVEQ   #0,D0
    RTS
    INCLUDE "amiga-systeme.s"

    SECTION son,DATA_C
onde:   DCB.B   16,100
        DCB.B   16,-100

;=== muet-depart
; Start channel 0, wait until Paula has started it (bit 7 of INTREQR), put 1 in D7, stop.
START:
    LEA     $DFF000,A5
    MOVE.L  #onde,$A0(A5)
    MOVE.W  #16,$A4(A5)
    MOVE.W  #252,$A6(A5)
    MOVE.W  #64,$A8(A5)
    MOVE.W  #$0080,$9C(A5)  ; an old AUD0 request cleared
    MOVE.W  #$0201,$96(A5)  ; DMACON: channel 0 plays
.demarre:
    BTST    #7,$1F(A5)      ; INTREQR: has Paula started channel 0?
    BEQ.S   .demarre
    MOVEQ   #1,D7
    MOVE.W  #$0001,$96(A5)
    MOVEQ   #0,D0           ; return code for the Shell: all is well
    RTS

    SECTION son,DATA_C
onde:   DCB.B   16,100
        DCB.B   16,-100

;=== muet-solution
START:
    LEA     $DFF000,A5
    MOVE.L  #onde,$A0(A5)
    MOVE.W  #16,$A4(A5)
    MOVE.W  #252,$A6(A5)
    MOVE.W  #64,$A8(A5)
    MOVE.W  #$0080,$9C(A5)  ; an old AUD0 request cleared
    MOVE.W  #$8201,$96(A5)  ; DMACON: bit 15 at 1, otherwise you turn off instead of on
.demarre:
    BTST    #7,$1F(A5)      ; INTREQR: has Paula started channel 0?
    BEQ.S   .demarre
    MOVEQ   #1,D7
    MOVE.W  #$0001,$96(A5)
    MOVEQ   #0,D0           ; return code for the Shell: all is well
    RTS

    SECTION son,DATA_C
onde:   DCB.B   16,100
        DCB.B   16,-100

;=== notes-depart
; Play C (period 423), E (336) then G (283) on channel 0, half a second each
; (25 frames), then stop the channel.
START:
    LEA     $DFF000,A5

    RTS
    INCLUDE "amiga-systeme.s"

    SECTION son,DATA_C
onde:   DCB.B   16,100
        DCB.B   16,-100

;=== notes-solution
START:
    LEA     $DFF000,A5
    MOVE.L  #onde,$A0(A5)
    MOVE.W  #16,$A4(A5)
    MOVE.W  #64,$A8(A5)
    LEA     periodes(PC),A0
    MOVE.W  (A0)+,$A6(A5)   ; C
    MOVE.W  #$8201,$96(A5)
    MOVEQ   #2,D6           ; three notes
.note:
    MOVEQ   #24,D7
.attente:
    BSR     attendre_vbl
    DBF     D7,.attente
    SUBQ.W  #1,D6
    BMI.S   .fin
    MOVE.W  (A0)+,$A6(A5)   ; the next note: changing the period is enough
    BRA.S   .note
.fin:
    MOVE.W  #$0001,$96(A5)
    MOVEQ   #0,D0
    RTS
periodes: DC.W  423,336,283
    INCLUDE "amiga-systeme.s"

    SECTION son,DATA_C
onde:   DCB.B   16,100
        DCB.B   16,-100

;=== unefois-exemple
START:
    LEA     $DFF000,A5
    MOVE.L  #bip,$A0(A5)    ; a 1600-byte "beep"
    MOVE.W  #800,$A4(A5)
    MOVE.W  #200,$A6(A5)
    MOVE.W  #64,$A8(A5)
    MOVE.W  #$0080,$9C(A5)  ; an old AUD0 request cleared
    MOVE.W  #$8201,$96(A5)  ; off it goes
.note:
    BTST    #7,$1F(A5)      ; has Paula noted the address and the length?
    BEQ.S   .note
    MOVE.L  #silence,$A0(A5) ; the next block: one word of silence...
    MOVE.W  #1,$A4(A5)      ; ... which it will replay in a loop
    MOVEQ   #24,D7          ; the beep lasts 1600 x 200 x 2 cycles, less than half a second
.attente:
    BSR     attendre_vbl
    DBF     D7,.attente
    MOVE.W  #$0001,$96(A5)
    MOVEQ   #0,D0
    RTS
    INCLUDE "amiga-systeme.s"

    SECTION son,DATA_C
bip:
        REPT    50
        DCB.B   16,90
        DCB.B   16,-90
        ENDR
silence: DC.W   0

;=== silence-depart
START:
    LEA     $DFF000,A5
    MOVE.L  #bip,$A0(A5)
    MOVE.W  #800,$A4(A5)
    MOVE.W  #200,$A6(A5)
    MOVE.W  #64,$A8(A5)
    MOVE.W  #$0080,$9C(A5)
    MOVE.W  #$8201,$96(A5)
.note:
    BTST    #7,$1F(A5)
    BEQ.S   .note
    MOVE.L  #silence,$A0(A5)
    MOVE.W  #800,$A4(A5)    ; <- the length of the silence block
    MOVEQ   #24,D7
.attente:
    BSR     attendre_vbl
    DBF     D7,.attente
    MOVE.W  #$0001,$96(A5)
    MOVEQ   #0,D0
    RTS
    INCLUDE "amiga-systeme.s"

    SECTION son,DATA_C
bip:
        REPT    50
        DCB.B   16,90
        DCB.B   16,-90
        ENDR
silence: DC.W   0

;=== silence-solution
START:
    LEA     $DFF000,A5
    MOVE.L  #bip,$A0(A5)
    MOVE.W  #800,$A4(A5)
    MOVE.W  #200,$A6(A5)
    MOVE.W  #64,$A8(A5)
    MOVE.W  #$0080,$9C(A5)
    MOVE.W  #$8201,$96(A5)
.note:
    BTST    #7,$1F(A5)
    BEQ.S   .note
    MOVE.L  #silence,$A0(A5)
    MOVE.W  #1,$A4(A5)      ; a single word: the silence
    MOVEQ   #24,D7
.attente:
    BSR     attendre_vbl
    DBF     D7,.attente
    MOVE.W  #$0001,$96(A5)
    MOVEQ   #0,D0
    RTS
    INCLUDE "amiga-systeme.s"

    SECTION son,DATA_C
bip:
        REPT    50
        DCB.B   16,90
        DCB.B   16,-90
        ENDR
silence: DC.W   0

;=== qcm-dma
    MOVE.W  #$8203,$DFF096

;=== bonus-stereo-depart
; A stereo chord: A (period 252) on channel 0 (left), E (period 336) on
; channel 1 (right). Wait until Paula has started BOTH channels (bits 7 and 8 of INTREQR),
; put 3 in D7, then stop both channels.
START:
    LEA     $DFF000,A5

    MOVEQ   #0,D0           ; return code for the Shell: all is well
    RTS

    SECTION son,DATA_C
onde:   DCB.B   16,100
        DCB.B   16,-100

;=== bonus-stereo-solution
START:
    LEA     $DFF000,A5
    MOVE.L  #onde,$A0(A5)   ; channel 0
    MOVE.W  #16,$A4(A5)
    MOVE.W  #252,$A6(A5)
    MOVE.W  #64,$A8(A5)
    MOVE.L  #onde,$B0(A5)   ; channel 1: the same registers, $10 further on
    MOVE.W  #16,$B4(A5)
    MOVE.W  #336,$B6(A5)
    MOVE.W  #64,$B8(A5)
    MOVE.W  #$0180,$9C(A5)  ; the old AUD0 and AUD1 requests cleared
    MOVE.W  #$8203,$96(A5)  ; DMAEN + AUD0EN + AUD1EN
.demarre:
    MOVE.W  $1E(A5),D0      ; INTREQR
    AND.W   #$0180,D0
    CMP.W   #$0180,D0       ; both channels?
    BNE.S   .demarre
    MOVEQ   #3,D7
    MOVE.W  #$0003,$96(A5)
    MOVEQ   #0,D0           ; return code for the Shell: all is well
    RTS

    SECTION son,DATA_C
onde:   DCB.B   16,100
        DCB.B   16,-100

;=== rappel
START:
    MOVEQ   #0,D1
    MOVE.W  #$2C+16,D1      ; VSTART: y = 16
    LSL.W   #8,D1           ; in the high byte
    MOVE.W  #$81+40,D2      ; HSTART: x = 40
    LSR.W   #1,D2           ; HSTART / 2
    OR.W    D2,D1           ; D1 = the first control word
    MOVEQ   #0,D0
    RTS

;=== ordonner-entete
; Compute the period of an A (440 Hz, 32-byte wave), rounded to the nearest integer,
; and store it in AUD0PER before playing the note.
START:
    LEA     $DFF000,A5
    MOVE.L  #onde,$A0(A5)   ; AUD0LC
    MOVE.W  #16,$A4(A5)     ; AUD0LEN
    MOVE.W  #64,$A8(A5)     ; AUD0VOL

;=== ordonner-pied
    MOVE.W  #$8201,$96(A5)  ; channel 0 plays
    MOVEQ   #24,D7
.attente:
    BSR     attendre_vbl
    DBF     D7,.attente
    MOVE.W  #$0001,$96(A5)  ; silence
    MOVEQ   #0,D0
    RTS
    INCLUDE "amiga-systeme.s"

    SECTION son,DATA_C
onde:   DCB.B   16,100
        DCB.B   16,-100

;=== octave-solution
START:
    LEA     $DFF000,A5
    MOVE.L  #onde,$A0(A5)   ; AUD0LC: the sample
    MOVE.W  #16,$A4(A5)     ; AUD0LEN: 32 bytes = 16 words
    MOVE.W  #126,$A6(A5)    ; AUD0PER: half as large, the note goes up an octave
    MOVE.W  #32,$A8(A5)     ; AUD0VOL: half the maximum
    MOVE.W  #$8201,$96(A5)  ; DMACON: SET + DMAEN + AUD0EN
    MOVEQ   #49,D7          ; one second: 50 frames
.attente:
    BSR     attendre_vbl
    DBF     D7,.attente
    MOVE.W  #$0001,$96(A5)  ; AUD0EN at 0: silence
    MOVEQ   #0,D0
    RTS
    INCLUDE "amiga-systeme.s"

    SECTION son,DATA_C
onde:   DCB.B   16,100      ; a square wave: 16 bytes high...
        DCB.B   16,-100     ; ... 16 low

;=== demande-depart
; Play the beep only once.
START:
    LEA     $DFF000,A5
    MOVE.L  #bip,$A0(A5)    ; a 1600-byte "beep"
    MOVE.W  #800,$A4(A5)
    MOVE.W  #200,$A6(A5)
    MOVE.W  #64,$A8(A5)
    MOVE.W  #$0080,$9C(A5)  ; an old AUD0 request cleared
    MOVE.W  #$8201,$96(A5)  ; off it goes
.note:
    BTST    #7,$1E(A5)      ; INTREQR, bit 7: has Paula noted the address and the length?
    BEQ.S   .note
    MOVE.L  #silence,$A0(A5) ; the next block: one word of silence...
    MOVE.W  #1,$A4(A5)      ; ... which it will replay in a loop
    MOVEQ   #24,D7
.attente:
    BSR     attendre_vbl
    DBF     D7,.attente
    MOVE.W  #$0001,$96(A5)
    MOVEQ   #0,D0
    RTS
    INCLUDE "amiga-systeme.s"

    SECTION son,DATA_C
bip:
        REPT    50
        DCB.B   16,90
        DCB.B   16,-90
        ENDR
silence: DC.W   0

;=== demande-solution
START:
    LEA     $DFF000,A5
    MOVE.L  #bip,$A0(A5)    ; a 1600-byte "beep"
    MOVE.W  #800,$A4(A5)
    MOVE.W  #200,$A6(A5)
    MOVE.W  #64,$A8(A5)
    MOVE.W  #$0080,$9C(A5)  ; an old AUD0 request cleared
    MOVE.W  #$8201,$96(A5)  ; off it goes
.note:
    BTST    #7,$1F(A5)      ; INTREQR: its bit 7 is in the low byte, at $DFF01F
    BEQ.S   .note
    MOVE.L  #silence,$A0(A5) ; the next block: one word of silence...
    MOVE.W  #1,$A4(A5)      ; ... which it will replay in a loop
    MOVEQ   #24,D7
.attente:
    BSR     attendre_vbl
    DBF     D7,.attente
    MOVE.W  #$0001,$96(A5)
    MOVEQ   #0,D0
    RTS
    INCLUDE "amiga-systeme.s"

    SECTION son,DATA_C
bip:
        REPT    50
        DCB.B   16,90
        DCB.B   16,-90
        ENDR
silence: DC.W   0
