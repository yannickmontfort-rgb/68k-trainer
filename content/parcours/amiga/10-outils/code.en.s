; Code for chapter 10, "Tools, executable and demo".

;=== intro-exemple
; A small intro: a gradient, a bouncing bar (VBL routine), a ball (sprite 0)
; and a held note, until the left click.
START:
    BSR     prendre
    MOVE.L  #balle,D0       ; sprite 0: the ball; sprites 1 to 7: the empty list
    LEA     cop_sprites,A0
    MOVE.W  D0,6(A0)
    SWAP    D0
    MOVE.W  D0,2(A0)
    MOVE.L  #vide,D0
    LEA     8(A0),A0
    MOVEQ   #6,D7
.vides:
    MOVE.W  D0,6(A0)
    SWAP    D0
    MOVE.W  D0,2(A0)
    SWAP    D0
    ADDQ.L  #8,A0
    DBF     D7,.vides
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.L  #onde,$A0(A5)   ; a low note, not too loud
    MOVE.W  #16,$A4(A5)
    MOVE.W  #508,$A6(A5)
    MOVE.W  #24,$A8(A5)
    MOVE.W  #$82A1,$96(A5)  ; DMAEN + COPEN + SPREN + AUD0EN
    MOVE.L  #vbl,$6C.W
    MOVE.W  #$C020,$9A(A5)  ; the VBL
    BSR     attendre_clic
    MOVE.W  #$0001,$96(A5)  ; silence
    BSR     rendre
    MOVEQ   #0,D0
    RTS

vbl:
    MOVEM.L D0-D1/A0,-(SP)
    MOVE.W  index,D1
    ADDQ.W  #1,D1
    AND.W   #31,D1          ; 32 positions, in a loop
    MOVE.W  D1,index
    LEA     positions(PC),A0
    MOVEQ   #0,D0
    MOVE.B  0(A0,D1.W),D0   ; the line of the bar
    LSL.W   #8,D0
    OR.W    #$07,D0
    MOVE.W  D0,barre
    ADD.W   #$0400,D0
    MOVE.W  D0,barre2
    ADD.W   #$0400,D0
    MOVE.W  D0,barre3
    MOVE.W  #$0020,$DFF09C
    MOVEM.L (SP)+,D0-D1/A0
    RTE
index:  DC.W    0
positions:
    DC.B    $50,$51,$54,$59,$60,$69,$74,$81,$90,$A0,$AF,$BE,$CA,$D4,$DB,$DF
    DC.B    $E0,$DF,$DB,$D4,$CA,$BE,$AF,$A0,$90,$81,$74,$69,$60,$59,$54,$51
    INCLUDE "amiga-systeme.s"

    SECTION chip,DATA_C
copper:
    DC.W    $0100,$0200,$0104,$0024
    DC.W    $01A2,$0FFF,$01A4,$0F80,$01A6,$0FF0 ; the colors of the ball
cop_sprites:
    DC.W    $0120,0,$0122,0,$0124,0,$0126,0,$0128,0,$012A,0,$012C,0,$012E,0
    DC.W    $0130,0,$0132,0,$0134,0,$0136,0,$0138,0,$013A,0,$013C,0,$013E,0
    DC.W    $0180,$0003
    DC.W    $3007,$FFFE,$0180,$0005 ; a gradient sky
    DC.W    $3807,$FFFE,$0180,$0007
    DC.W    $4007,$FFFE,$0180,$0009
barre:
    DC.W    $5007,$FFFE,$0180,$0F00 ; the bar: red, orange, yellow
barre2:
    DC.W    $5407,$FFFE,$0180,$0F80
barre3:
    DC.W    $5807,$FFFE,$0180,$0FF0
    DC.W    $5C07,$FFFE,$0180,$0009 ; after the bar (this WAIT has often already passed: the sky resumes)
    DC.W    $FFFF,$FFFE
vide:   DC.W    0,0
balle:
    DC.W    $40A0,$5001
    DC.W    %0000011111100000,%0000000000000000
    DC.W    %0001111111111000,%0000000000000000
    DC.W    %0011111111111100,%0000011000000000
    DC.W    %0111111111111110,%0000111100000000
    DC.W    %0111111111111110,%0000011000000000
    DC.W    %1111111111111111,%0000000000000000
    DC.W    %1111111111111111,%0000000000000000
    DC.W    %1111111111111111,%0000000000000000
    DC.W    %1111111111111111,%0000000000000000
    DC.W    %1111111111111111,%0000000000000000
    DC.W    %1111111111111111,%0000000000000000
    DC.W    %0111111111111110,%0000000000000000
    DC.W    %0111111111111110,%0000000000000000
    DC.W    %0011111111111100,%0000000000000000
    DC.W    %0001111111111000,%0000000000000000
    DC.W    %0000011111100000,%0000000000000000
    DC.W    0,0
onde:   DCB.B   16,60
        DCB.B   16,-60

;=== retour-prediction
START:
    MOVEQ   #20,D0          ; the return code
    RTS

;=== retour-depart
; A program that ends well must tell the Shell so.
START:
    MOVEA.L 4.W,A6
    LEA     dosnom(PC),A1
    MOVEQ   #0,D0
    JSR     -552(A6)
    MOVEA.L D0,A6
    JSR     -60(A6)
    MOVE.L  D0,D1
    LEA     texte(PC),A0
    MOVE.L  A0,D2
    MOVEQ   #fin-texte,D3
    JSR     -48(A6)
    MOVEA.L A6,A1
    MOVEA.L 4.W,A6
    JSR     -414(A6)
    MOVEQ   #20,D0          ; <- the return code: everything went well
    RTS
dosnom: DC.B    'dos.library',0
texte:  DC.B    'Fini !',10
fin:
    EVEN

;=== retour-solution
START:
    MOVEA.L 4.W,A6
    LEA     dosnom(PC),A1
    MOVEQ   #0,D0
    JSR     -552(A6)
    MOVEA.L D0,A6
    JSR     -60(A6)
    MOVE.L  D0,D1
    LEA     texte(PC),A0
    MOVE.L  A0,D2
    MOVEQ   #fin-texte,D3
    JSR     -48(A6)
    MOVEA.L A6,A1
    MOVEA.L 4.W,A6
    JSR     -414(A6)
    MOVEQ   #0,D0           ; 0: everything went well
    RTS
dosnom: DC.B    'dos.library',0
texte:  DC.B    'Fini !',10
fin:
    EVEN

;=== bonus-intro-depart
; Your intro: the ball (sprite 0) in the middle of the screen at (152, 120), and the three-color
; bar that follows the "positions" table, one position per frame, for 40 frames;
; then everything stays in place until the click. The lists and the data are ready.
START:
    BSR     prendre

    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS
positions:
    DC.B    $50,$51,$54,$59,$60,$69,$74,$81,$90,$A0,$AF,$BE,$CA,$D4,$DB,$DF
    DC.B    $E0,$DF,$DB,$D4,$CA,$BE,$AF,$A0,$90,$81,$74,$69,$60,$59,$54,$51
    INCLUDE "amiga-systeme.s"

    SECTION chip,DATA_C
copper:
    DC.W    $0100,$0200,$0104,$0024
    DC.W    $01A2,$0FFF,$01A4,$0F80,$01A6,$0FF0
cop_sprites:
    DC.W    $0120,0,$0122,0,$0124,0,$0126,0,$0128,0,$012A,0,$012C,0,$012E,0
    DC.W    $0130,0,$0132,0,$0134,0,$0136,0,$0138,0,$013A,0,$013C,0,$013E,0
    DC.W    $0180,$0003
barre:
    DC.W    $5007,$FFFE,$0180,$0F00
barre2:
    DC.W    $5407,$FFFE,$0180,$0F80
barre3:
    DC.W    $5807,$FFFE,$0180,$0FF0
barre4:
    DC.W    $5C07,$FFFE,$0180,$0003
    DC.W    $FFFF,$FFFE
vide:   DC.W    0,0
balle:
    DC.W    0,0             ; the control words: yours to compute
    DCB.L   16,$FFFF0000    ; a white square (color 17)
    DC.W    0,0

;=== bonus-intro-solution
START:
    BSR     prendre
    MOVE.L  #balle,D0
    LEA     cop_sprites,A0
    MOVE.W  D0,6(A0)
    SWAP    D0
    MOVE.W  D0,2(A0)
    MOVE.L  #vide,D0
    LEA     8(A0),A0
    MOVEQ   #6,D7
.vides:
    MOVE.W  D0,6(A0)
    SWAP    D0
    MOVE.W  D0,2(A0)
    SWAP    D0
    ADDQ.L  #8,A0
    DBF     D7,.vides
    MOVE.W  #$A48C,balle    ; y = 120: VSTART = $A4; x = 152: HSTART = $119, divided by 2 = $8C
    MOVE.W  #$B401,balle+2  ; VSTOP = $B4, bit 0 of HSTART
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$82A0,$96(A5)  ; DMAEN + COPEN + SPREN
    LEA     positions(PC),A1
    MOVEQ   #0,D6
    MOVEQ   #39,D7
.image:
    BSR     attendre_vbl
    MOVEQ   #0,D0
    MOVE.B  0(A1,D6.W),D0
    LSL.W   #8,D0
    OR.W    #$07,D0
    MOVE.W  D0,barre
    ADD.W   #$0400,D0
    MOVE.W  D0,barre2
    ADD.W   #$0400,D0
    MOVE.W  D0,barre3
    ADD.W   #$0400,D0
    MOVE.W  D0,barre4
    ADDQ.W  #1,D6
    AND.W   #31,D6
    DBF     D7,.image
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS
positions:
    DC.B    $50,$51,$54,$59,$60,$69,$74,$81,$90,$A0,$AF,$BE,$CA,$D4,$DB,$DF
    DC.B    $E0,$DF,$DB,$D4,$CA,$BE,$AF,$A0,$90,$81,$74,$69,$60,$59,$54,$51
    INCLUDE "amiga-systeme.s"

    SECTION chip,DATA_C
copper:
    DC.W    $0100,$0200,$0104,$0024
    DC.W    $01A2,$0FFF,$01A4,$0F80,$01A6,$0FF0
cop_sprites:
    DC.W    $0120,0,$0122,0,$0124,0,$0126,0,$0128,0,$012A,0,$012C,0,$012E,0
    DC.W    $0130,0,$0132,0,$0134,0,$0136,0,$0138,0,$013A,0,$013C,0,$013E,0
    DC.W    $0180,$0003
barre:
    DC.W    $5007,$FFFE,$0180,$0F00
barre2:
    DC.W    $5407,$FFFE,$0180,$0F80
barre3:
    DC.W    $5807,$FFFE,$0180,$0FF0
barre4:
    DC.W    $5C07,$FFFE,$0180,$0003
    DC.W    $FFFF,$FFFE
vide:   DC.W    0,0
balle:
    DC.W    0,0
    DCB.L   16,$FFFF0000
    DC.W    0,0

;=== rappel
START:
    MOVEQ   #64,D1          ; a 64-byte sample
    LSR.L   #1,D1           ; D1 = its length for AUD0LEN
    MOVEQ   #0,D0           ; all is well
    RTS

;=== abime-depart
; Add the 8 words of "table" into D7 and compare the sum with "attendu":
; return code 0 if they are equal, 10 (ERROR) otherwise.
START:
    ; your turn
    MOVEQ   #0,D0
    RTS
table:  DC.W    120,250,75,300,55,400,90,10
attendu: DC.W   1310

;=== abime-solution
START:
    LEA     table(PC),A0
    MOVEQ   #0,D7
    MOVEQ   #7,D1           ; 8 words
.somme:
    ADD.W   (A0)+,D7
    DBRA    D1,.somme
    MOVEQ   #0,D0           ; 0: all is well...
    CMP.W   attendu(PC),D7
    BEQ.S   .fin
    MOVEQ   #10,D0          ; ... unless the sum is wrong: 10, ERROR
.fin:
    RTS
table:  DC.W    120,250,75,300,55,400,90,10
attendu: DC.W   1310

;=== ordonner-entete
; The "code" subroutine stores in D0 the return code that matches the value of D1:
; 0 (OK) up to 100, 5 (WARN) up to 200, 10 (ERROR) beyond. It is tried with three values.
START:
    MOVE.W  #250,D1
    BSR.S   code
    MOVE.L  D0,D6           ; 10 expected
    MOVE.W  #50,D1
    BSR.S   code
    MOVE.L  D0,D5           ; 0 expected
    MOVE.W  #150,D1
    BSR.S   code            ; 5 expected, returned to the Shell
    RTS

code:

;=== ordonner-pied
.fin:
    RTS

;=== pile-depart
; Store in D7 the sum of the 8 words of "table", computed by the "somme" subroutine,
; then hand control back to the Shell with code 0.
START:
    MOVEQ   #1,D3           ; the table number, which "somme" must preserve
    LEA     table(PC),A0
    BSR     somme
    MOVE.L  D2,D7
    MOVEQ   #0,D0
    RTS

; Adds the 8 words A0 points to; result in D2, D3 and A0 returned intact
somme:
    MOVEM.L D3/A0,-(SP)
    MOVEQ   #0,D2
    MOVEQ   #7,D3
.boucle:
    ADD.W   (A0)+,D2
    DBRA    D3,.boucle
    RTS
table:  DC.W    120,250,75,300,55,400,90,10

;=== pile-solution
START:
    MOVEQ   #1,D3           ; the table number, which "somme" must preserve
    LEA     table(PC),A0
    BSR     somme
    MOVE.L  D2,D7
    MOVEQ   #0,D0
    RTS

; Adds the 8 words A0 points to; result in D2, D3 and A0 returned intact
somme:
    MOVEM.L D3/A0,-(SP)
    MOVEQ   #0,D2
    MOVEQ   #7,D3
.boucle:
    ADD.W   (A0)+,D2
    DBRA    D3,.boucle
    MOVEM.L (SP)+,D3/A0     ; the stack is back as it was: RTS pops the right address
    RTS
table:  DC.W    120,250,75,300,55,400,90,10

;=== moyenne-depart
; Stores in D7 the average of the first "nombre" words of "table", and returns 0 to the Shell.
START:
    LEA     table(PC),A0
    MOVE.W  nombre(PC),D1
    MOVEQ   #0,D7
    MOVE.W  D1,D2
    BRA.S   .test
.boucle:
    ADD.W   (A0)+,D7
.test:
    DBRA    D2,.boucle
    DIVU    D1,D7           ; the sum divided by the number of words
    AND.L   #$FFFF,D7       ; the quotient only
    MOVEQ   #0,D0
    RTS
table:  DC.W    120,250,75,300,55,400,90,10
nombre: DC.W    8

;=== moyenne-solution
START:
    LEA     table(PC),A0
    MOVE.W  nombre(PC),D1
    MOVEQ   #0,D7
    MOVE.W  D1,D2
    BEQ.S   .vide           ; an empty table: no division
    BRA.S   .test
.boucle:
    ADD.W   (A0)+,D7
.test:
    DBRA    D2,.boucle
    DIVU    D1,D7           ; the sum divided by the number of words
    AND.L   #$FFFF,D7       ; the quotient only
    MOVEQ   #0,D0
    RTS
.vide:
    MOVEQ   #10,D0          ; ERROR
    RTS
table:  DC.W    120,250,75,300,55,400,90,10
nombre: DC.W    0
