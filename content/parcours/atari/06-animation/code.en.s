; Code for chapter 6, "Animation, sprites and pixel shifting" (user mode).

;=== copie-exemple
START:
    MOVE.W  #2,-(SP)        ; Physbase: address of the screen
    TRAP    #14
    ADDQ.L  #2,SP
    MOVEA.L D0,A1
    LEA     50*160+8*8(A1),A1 ; destination: line 50, 9th group (X = 128)
    LEA     SPRITE,A0       ; source: the drawing, 16 lines of 8 bytes
    MOVEQ   #15,D7          ; 16 lines
.ligne:
    MOVE.L  (A0)+,(A1)+     ; planes 0 and 1
    MOVE.L  (A0)+,(A1)+     ; planes 2 and 3
    LEA     160-8(A1),A1    ; skip to the same column, next line
    DBF     D7,.ligne
    CLR.W   -(SP)
    TRAP    #1

; A 16 x 16 square: border in color 3 (planes 0 and 1), inside in color 4 (plane 2)
SPRITE:
    DC.W    $FFFF,$FFFF,$0000,$0000
    REPT    14
    DC.W    $8001,$8001,$7FFE,$0000
    ENDR
    DC.W    $FFFF,$FFFF,$0000,$0000

;=== saut-prediction
START:
    LEA     $10000,A1       ; any destination
    MOVEQ   #1,D7           ; two lines of a 32-pixel block (16 bytes)
.ligne:
    CLR.L   (A1)+
    CLR.L   (A1)+
    CLR.L   (A1)+
    CLR.L   (A1)+
    LEA     160-16(A1),A1
    DBF     D7,.ligne
    CLR.W   -(SP)
    TRAP    #1

;=== saut-depart
; Copy a block of 32 x 8 pixels (color 1) to the top left of line 20.
; The line skip is wrong: fix it.
START:
    MOVE.W  #2,-(SP)        ; Physbase
    TRAP    #14
    ADDQ.L  #2,SP
    MOVEA.L D0,A1
    LEA     20*160(A1),A1   ; start of line 20
    LEA     BLOC,A0
    MOVEQ   #7,D7           ; 8 lines
.ligne:
    MOVE.L  (A0)+,(A1)+     ; 1st group: planes 0 and 1
    MOVE.L  (A0)+,(A1)+     ;            planes 2 and 3
    MOVE.L  (A0)+,(A1)+     ; 2nd group
    MOVE.L  (A0)+,(A1)+
    LEA     0(A1),A1        ; <- the line skip: replace 0 with the right value
    DBF     D7,.ligne
    CLR.W   -(SP)
    TRAP    #1

BLOC:
    REPT    8
    DC.W    $FFFF,0,0,0,$FFFF,0,0,0
    ENDR

;=== saut-solution
START:
    MOVE.W  #2,-(SP)
    TRAP    #14
    ADDQ.L  #2,SP
    MOVEA.L D0,A1
    LEA     20*160(A1),A1
    LEA     BLOC,A0
    MOVEQ   #7,D7
.ligne:
    MOVE.L  (A0)+,(A1)+
    MOVE.L  (A0)+,(A1)+
    MOVE.L  (A0)+,(A1)+
    MOVE.L  (A0)+,(A1)+
    LEA     160-16(A1),A1   ; 160 bytes per line - 16 bytes copied
    DBF     D7,.ligne
    CLR.W   -(SP)
    TRAP    #1

BLOC:
    REPT    8
    DC.W    $FFFF,0,0,0,$FFFF,0,0,0
    ENDR

;=== effacer-depart
; The program fills the screen in color 15. Then erase (color 0) the rectangle
; X = 64 to 95, Y = 20 to 39: 32 pixels wide (2 groups), 20 lines high.
START:
    MOVE.W  #2,-(SP)        ; Physbase
    TRAP    #14
    ADDQ.L  #2,SP
    MOVEA.L D0,A0
    MOVEA.L D0,A1           ; A1 keeps the address of the screen
    MOVE.W  #7999,D7
.remplir:
    MOVE.L  #-1,(A0)+
    DBF     D7,.remplir
    ; your turn: erase the rectangle (A1 = start of the screen)

    CLR.W   -(SP)
    TRAP    #1

;=== effacer-solution
START:
    MOVE.W  #2,-(SP)
    TRAP    #14
    ADDQ.L  #2,SP
    MOVEA.L D0,A0
    MOVEA.L D0,A1
    MOVE.W  #7999,D7
.remplir:
    MOVE.L  #-1,(A0)+
    DBF     D7,.remplir
    LEA     20*160+64/16*8(A1),A1 ; line 20, group 4 (X = 64)
    MOVEQ   #19,D7          ; 20 lines
.ligne:
    CLR.L   (A1)+           ; 2 groups = 16 bytes = 4 long words
    CLR.L   (A1)+
    CLR.L   (A1)+
    CLR.L   (A1)+
    LEA     160-16(A1),A1
    DBF     D7,.ligne
    CLR.W   -(SP)
    TRAP    #1

;=== descente-exemple
START:
    MOVE.W  #2,-(SP)        ; Physbase
    TRAP    #14
    ADDQ.L  #2,SP
    MOVEA.L D0,A1
    LEA     8*8(A1),A1      ; at the top of the screen, X = 64
    MOVEQ   #59,D6          ; 60 frames (a little over one second)
.image:
    BSR     CARRE           ; draw the square from A1
    MOVE.W  #37,-(SP)       ; Vsync: wait for the end of the current frame
    TRAP    #14
    ADDQ.L  #2,SP
    CLR.W   (A1)            ; erase the top line of the square
    LEA     160(A1),A1      ; the square moves down one line
    DBF     D6,.image
    CLR.W   -(SP)
    TRAP    #1

; CARRE: 16 lines of 16 pixels in color 1 (plane 0) from A1
CARRE:
    MOVEA.L A1,A0
    MOVEQ   #15,D0
.ligne:
    MOVE.W  #$FFFF,(A0)
    LEA     160(A0),A0
    DBF     D0,.ligne
    RTS

;=== aligner-prediction
START:
    MOVE.L  #$1234F,D0      ; any address
    ADD.L   #255,D0
    CLR.B   D0
    CLR.W   -(SP)
    TRAP    #1

;=== double-exemple
START:
    MOVE.L  #ECRANS+255,D0  ; start of the reserved area, rounded
    CLR.B   D0              ; up to the next multiple of 256
    MOVE.L  D0,CACHE        ; 1st screen
    ADD.L   #32000,D0       ; 32,000 = $7D00: the 2nd stays a multiple of 256
    MOVE.L  D0,VISIBLE
    MOVEQ   #0,D5           ; column of the square (in groups of 16 pixels)
    MOVEQ   #19,D6          ; 20 frames
.image:
    MOVEA.L CACHE,A0        ; draw on the screen you cannot see
    BSR     DESSINER
    MOVE.L  CACHE,D0        ; swap the two screens
    MOVE.L  VISIBLE,CACHE
    MOVE.L  D0,VISIBLE
    MOVE.W  #-1,-(SP)       ; Setscreen(logical, physical, resolution): resolution unchanged
    MOVE.L  D0,-(SP)        ; physical = the screen just finished
    MOVE.L  D0,-(SP)        ; logical = the same
    MOVE.W  #5,-(SP)
    TRAP    #14
    LEA     12(SP),SP
    MOVE.W  #37,-(SP)       ; Vsync: the swap happens during the retrace of the beam
    TRAP    #14
    ADDQ.L  #2,SP
    ADDQ.W  #1,D5
    DBF     D6,.image
    CLR.W   -(SP)
    TRAP    #1

; DESSINER: erase the band of lines 92 to 107, then draw the square in column D5
DESSINER:
    LEA     92*160(A0),A1
    MOVE.W  #16*40-1,D0     ; 16 lines of 40 long words
.effacer:
    CLR.L   (A1)+
    DBF     D0,.effacer
    LEA     92*160(A0),A1
    MOVE.W  D5,D0
    LSL.W   #3,D0           ; 8 bytes per group
    ADDA.W  D0,A1
    MOVEQ   #15,D0
.ligne:
    MOVE.W  #$FFFF,(A1)
    LEA     160(A1),A1
    DBF     D0,.ligne
    RTS

    SECTION BSS
ECRANS: DS.B    2*32000+256     ; two screens, plus enough to round the address
CACHE:  DS.L    1
VISIBLE: DS.L   1

;=== aligne-depart
; Draw a square at the top left of a screen of our own, then display it with Setscreen.
; The square does not appear in the right place: why? Fix the program.
START:
    LEA     MONECRAN,A0
    MOVEQ   #15,D0
.ligne:
    MOVE.W  #$FFFF,(A0)     ; 16 x 16 square, color 1
    LEA     160(A0),A0
    DBF     D0,.ligne
    MOVE.W  #-1,-(SP)       ; Setscreen: resolution unchanged
    PEA     MONECRAN        ; physical: our screen
    MOVE.L  #-1,-(SP)       ; logical: unchanged
    MOVE.W  #5,-(SP)
    TRAP    #14
    LEA     12(SP),SP
    MOVE.W  #37,-(SP)       ; Vsync
    TRAP    #14
    ADDQ.L  #2,SP
    CLR.W   -(SP)
    TRAP    #1

    SECTION BSS
    DS.B    2
MONECRAN:
    DS.B    32000

;=== aligne-solution
START:
    MOVE.L  #MONECRAN+255,D0
    CLR.B   D0              ; address that is a multiple of 256
    MOVEA.L D0,A0
    MOVEA.L D0,A2           ; keep it for Setscreen
    MOVEQ   #15,D0
.ligne:
    MOVE.W  #$FFFF,(A0)
    LEA     160(A0),A0
    DBF     D0,.ligne
    MOVE.W  #-1,-(SP)
    MOVE.L  A2,-(SP)        ; physical: the rounded address
    MOVE.L  #-1,-(SP)
    MOVE.W  #5,-(SP)
    TRAP    #14
    LEA     12(SP),SP
    MOVE.W  #37,-(SP)
    TRAP    #14
    ADDQ.L  #2,SP
    CLR.W   -(SP)
    TRAP    #1

    SECTION BSS
    DS.B    2
MONECRAN:
    DS.B    32000+256       ; 256 extra bytes so the address can be rounded

;=== dix-depart
; Move a 16 x 16 square (color 1, lines 50 to 65) 16 pixels to the right
; on each frame, 10 times, starting from X = 0. At the end, it must be at X = 160 and
; nowhere else. Wait for the VBL (Vsync) between two frames.
START:
    MOVE.W  #2,-(SP)        ; Physbase
    TRAP    #14
    ADDQ.L  #2,SP
    MOVEA.L D0,A1
    LEA     50*160(A1),A1   ; line 50, X = 0

    CLR.W   -(SP)
    TRAP    #1

;=== dix-solution
START:
    MOVE.W  #2,-(SP)
    TRAP    #14
    ADDQ.L  #2,SP
    MOVEA.L D0,A1
    LEA     50*160(A1),A1
    MOVE.W  #$FFFF,D1       ; color 1: draw
    BSR     CARRE
    MOVEQ   #9,D6           ; 10 moves
.image:
    MOVE.W  #37,-(SP)       ; Vsync
    TRAP    #14
    ADDQ.L  #2,SP
    MOVEQ   #0,D1           ; erase the old position
    BSR     CARRE
    ADDQ.L  #8,A1           ; next group: 16 pixels further right
    MOVE.W  #$FFFF,D1       ; draw the new one
    BSR     CARRE
    DBF     D6,.image
    CLR.W   -(SP)
    TRAP    #1

; CARRE: write D1 into plane 0 of 16 lines from A1
CARRE:
    MOVEA.L A1,A0
    MOVEQ   #15,D0
.ligne:
    MOVE.W  D1,(A0)
    LEA     160(A0),A0
    DBF     D0,.ligne
    RTS

;=== pixel-exemple
START:
    MOVE.W  #2,-(SP)        ; Physbase
    TRAP    #14
    ADDQ.L  #2,SP
    MOVEA.L D0,A0
    LEA     10*160(A0),A0   ; line Y = 10
    MOVE.W  #44,D1          ; X = 44
    MOVE.W  D1,D0
    LSR.W   #4,D0           ; X / 16 = 2
    LSL.W   #3,D0           ; x 8 = 16 bytes
    ADDA.W  D0,A0           ; A0 = group of pixels 32 to 47
    AND.W   #15,D1          ; shift = X mod 16 = 12
    LEA     BALLE,A2
    MOVEQ   #7,D7           ; 8 lines
.ligne:
    MOVEQ   #0,D0
    MOVE.B  (A2)+,D0        ; 8 pixels of the drawing, in bits 7 to 0
    ROR.L   #8,D0           ; ... moved into bits 31 to 24
    LSR.L   D1,D0           ; shifted by 12: whatever overflows drops into the low word
    SWAP    D0              ; low word = left part
    OR.W    D0,(A0)         ; into the 1st group (plane 0)
    SWAP    D0              ; low word = overflow
    OR.W    D0,8(A0)        ; into the next group (plane 0)
    LEA     160(A0),A0
    DBF     D7,.ligne
    CLR.W   -(SP)
    TRAP    #1

BALLE:
    DC.B    $3C,$7E,$FF,$FF,$FF,$FF,$7E,$3C

;=== decalage-prediction
START:
    MOVE.L  #$FF000000,D0   ; 8 pixels on, at the far left
    MOVEQ   #12,D1          ; shift (an immediate shift only goes from 1 to 8)
    LSR.L   D1,D0
    CLR.W   -(SP)
    TRAP    #1

;=== decalage-prediction-swap
START:
    MOVE.L  #$FF000000,D0
    MOVEQ   #12,D1
    LSR.L   D1,D0
    SWAP    D0
    CLR.W   -(SP)
    TRAP    #1

;=== sprite73-depart
; Draw the ball (8 x 8 pixels, color 1) at X = 44, Y = 10 with routine 7.3 from the manual.
; It assembles and does not crash... but the ball does not appear. Find and fix
; the errors (there are several, including the one from PSET).
START:
    MOVE.W  #2,-(SP)        ; Physbase
    TRAP    #14
    ADDQ.L  #2,SP
    MOVE.L  D0,SCREEN_BASE
    MOVE.W  #44,D1          ; X
    MOVE.W  #10,D4          ; Y
    LEA     BALLE,A2
    BSR     DRAW_SPRITE_SHIFT
    CLR.W   -(SP)
    TRAP    #1

; DRAW_SPRITE_SHIFT: sprite 8 pixels wide, 8 lines, plane 0
; Inputs: D1.W = X (0-312), D4.W = Y (0-192), A2 = drawing
DRAW_SPRITE_SHIFT:
    LEA     SCREEN_BASE,A0
    MOVE.L  (A0),A0
    MULU.W  #160,D4
    ADDA.L  D4,A0           ; line Y
    MOVE.W  D1,D0
    LSR.W   #1,D0           ; D0 = X / 2
    ANDI.W  #$FFFE,D0       ; "word alignment"
    ADDA.L  D0,A0           ; first word of the group
    ANDI.W  #15,D1          ; number of shifts to the right
    MOVE.W  #7,D7           ; 8 lines
.LINE_LOOP:
    MOVE.B  (A2)+,D2        ; 8 pixels of plane 0
    CLR.W   D0
    MOVE.B  D2,D0
    LSL.W   #8,D0           ; to the top of the word
    LSR.W   D1,D0           ; shifted by X mod 16
    OR.W    D0,(A0)         ; first word
    SWAP    D0
    OR.B    D0,8(A0)        ; "the overflowing bits" into the next word
    ADDA.L  #160,A0
    DBRA    D7,.LINE_LOOP
    RTS

BALLE:
    DC.B    $3C,$7E,$FF,$FF,$FF,$FF,$7E,$3C
    EVEN
SCREEN_BASE:
    DC.L    0

;=== sprite73-solution
START:
    MOVE.W  #2,-(SP)
    TRAP    #14
    ADDQ.L  #2,SP
    MOVE.L  D0,SCREEN_BASE
    MOVE.W  #44,D1
    MOVE.W  #10,D4
    LEA     BALLE,A2
    BSR     DRAW_SPRITE_SHIFT
    CLR.W   -(SP)
    TRAP    #1

DRAW_SPRITE_SHIFT:
    LEA     SCREEN_BASE,A0
    MOVE.L  (A0),A0
    MULU.W  #160,D4
    ADDA.L  D4,A0
    MOVEQ   #0,D0           ; high word of D0 at zero before ADDA.L
    MOVE.W  D1,D0
    LSR.W   #1,D0
    ANDI.W  #$FFF8,D0       ; align on the group of 8 bytes
    ADDA.L  D0,A0
    ANDI.W  #15,D1
    MOVE.W  #7,D7
.LINE_LOOP:
    MOVEQ   #0,D0           ; work on 32 bits
    MOVE.B  (A2)+,D0
    ROR.L   #8,D0           ; the 8 pixels in bits 31 to 24
    LSR.L   D1,D0           ; nothing is lost: the overflow drops into the low word
    SWAP    D0
    OR.W    D0,(A0)         ; left part
    SWAP    D0
    OR.W    D0,8(A0)        ; overflow: the whole word, not its low byte
    ADDA.L  #160,A0
    DBRA    D7,.LINE_LOOP
    RTS

BALLE:
    DC.B    $3C,$7E,$FF,$FF,$FF,$FF,$7E,$3C
    EVEN
SCREEN_BASE:
    DC.L    0

;=== masque-depart
; The background of the first 8 lines is in color 2 (plane 1). We draw 8 pixels on it in
; color 1 (plane 0)... but they appear in color 3. Add ONE instruction.
START:
    MOVE.W  #2,-(SP)        ; Physbase
    TRAP    #14
    ADDQ.L  #2,SP
    MOVEA.L D0,A0
    MOVEA.L D0,A1
    MOVE.W  #8*20-1,D7      ; 8 lines of 20 groups
.fond:
    MOVE.W  #$FFFF,2(A1)    ; plane 1 at 1: color 2
    ADDQ.L  #8,A1
    DBF     D7,.fond
    MOVE.W  #$0FF0,D2       ; the drawing: 8 pixels in the middle of the 1st group
    MOVE.W  D2,D3
    NOT.W   D3              ; inverted mask: 0 under the drawing, 1 elsewhere
    MOVEQ   #7,D7
.ligne:
    OR.W    D2,(A0)         ; plane 0: turn on the pixels of the drawing
    ; an instruction is missing here

    LEA     160(A0),A0
    DBF     D7,.ligne
    CLR.W   -(SP)
    TRAP    #1

;=== masque-solution
START:
    MOVE.W  #2,-(SP)
    TRAP    #14
    ADDQ.L  #2,SP
    MOVEA.L D0,A0
    MOVEA.L D0,A1
    MOVE.W  #8*20-1,D7
.fond:
    MOVE.W  #$FFFF,2(A1)
    ADDQ.L  #8,A1
    DBF     D7,.fond
    MOVE.W  #$0FF0,D2
    MOVE.W  D2,D3
    NOT.W   D3
    MOVEQ   #7,D7
.ligne:
    OR.W    D2,(A0)
    AND.W   D3,2(A0)        ; plane 1: turn off the background under the drawing
    LEA     160(A0),A0
    DBF     D7,.ligne
    CLR.W   -(SP)
    TRAP    #1

;=== bord-prediction
START:
    LEA     $F8000+10*160+19*8,A0 ; last group of line 10 (X = 304 to 319)
    MOVE.L  #$FF000000,D0   ; 8 pixels...
    MOVEQ   #12,D1
    LSR.L   D1,D0           ; ... drawn at X = 304 + 12 = 316
    SWAP    D0
    OR.W    D0,(A0)
    SWAP    D0
    OR.W    D0,8(A0)        ; the "next group"
    CLR.W   -(SP)
    TRAP    #1

;=== miroir-depart
; Build at $20000 a table of 256 bytes: byte no. n must hold n "read
; backwards" (bit 7 <-> bit 0, bit 6 <-> bit 1...). Example: n = $01 gives $80.
START:
    LEA     $20000,A0

    CLR.W   -(SP)
    TRAP    #1

;=== miroir-solution
START:
    LEA     $20000,A0
    MOVEQ   #0,D0           ; n
.suivant:
    MOVE.B  D0,D1           ; copy of n, to be emptied bit by bit
    MOVEQ   #0,D2           ; the mirror, built bit by bit
    MOVEQ   #7,D3
.bit:
    LSR.B   #1,D1           ; rightmost bit of n -> X (and C)
    ROXL.B  #1,D2           ; X comes in on the right of the mirror
    DBF     D3,.bit
    MOVE.B  D2,(A0)+
    ADDQ.W  #1,D0
    CMP.W   #256,D0
    BNE.S   .suivant
    CLR.W   -(SP)
    TRAP    #1

;=== rebond-depart
; Challenge: a 16 x 16 square (color 1, lines 92 to 107) starts from X = 0 and moves
; 2 pixels to the right on each frame. When it reaches X = 304 (the right edge), it heads
; back to the left, and so on. Stop the program after 200 frames.
START:

    CLR.W   -(SP)
    TRAP    #1

;=== rebond-solution
START:
    MOVE.W  #2,-(SP)        ; Physbase
    TRAP    #14
    ADDQ.L  #2,SP
    MOVEA.L D0,A6
    LEA     92*160(A6),A6   ; start of the square's band
    MOVEQ   #0,D5           ; X
    MOVEQ   #2,D4           ; speed: +2 or -2
    MOVE.W  #199,D6         ; 200 frames
    BSR     DESSINER
.image:
    MOVE.W  #37,-(SP)       ; Vsync
    TRAP    #14
    ADDQ.L  #2,SP
    ADD.W   D4,D5           ; move on
    CMP.W   #304,D5
    BLT.S   .pasdroite
    MOVEQ   #-2,D4          ; right edge: turn back
.pasdroite:
    TST.W   D5
    BGT.S   .pasgauche
    MOVEQ   #2,D4           ; left edge: turn back
.pasgauche:
    BSR     DESSINER
    DBF     D6,.image
    CLR.W   -(SP)
    TRAP    #1

; DESSINER: erase the band (16 lines) then draw the square at X = D5
DESSINER:
    MOVEA.L A6,A0
    MOVE.W  #16*40-1,D0
.effacer:
    CLR.L   (A0)+
    DBF     D0,.effacer
    MOVEA.L A6,A0
    MOVE.W  D5,D0
    LSR.W   #4,D0
    LSL.W   #3,D0
    ADDA.W  D0,A0           ; group of the left edge of the square
    MOVE.W  D5,D1
    AND.W   #15,D1          ; shift
    MOVE.L  #$FFFF0000,D2
    LSR.L   D1,D2           ; 16 pixels over two groups
    MOVEQ   #15,D0
.ligne:
    SWAP    D2
    MOVE.W  D2,(A0)         ; left part
    SWAP    D2
    MOVE.W  D2,8(A0)        ; overflow (0 if X is a multiple of 16)
    LEA     160(A0),A0
    DBF     D0,.ligne
    RTS

;=== rappel
START:
    MOVE.W  #50,D0          ; X
    MOVE.W  #10,D1          ; Y
    MULU    #160,D1         ; Y × 160
    LSR.W   #4,D0           ; X ÷ 16
    LSL.W   #3,D0           ; × 8
    ADD.W   D0,D1           ; D1 = position of the group in the screen
    CLR.W   -(SP)           ; Pterm0
    TRAP    #1
