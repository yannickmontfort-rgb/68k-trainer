; Code for chapter 5, "Graphics and framebuffer" (user mode).

;=== pixel-exemple
START:
    MOVE.W  #2,-(SP)        ; XBIOS 2: Physbase
    TRAP    #14
    ADDQ.L  #2,SP
    MOVEA.L D0,A0           ; A0 = start of the screen
    MOVE.W  #100,D4         ; Y = 100
    MULU    #160,D4         ; Y x 160 = start of the line
    ADDA.L  D4,A0
    MOVE.W  #37,D1          ; X = 37
    MOVE.W  D1,D2
    LSR.W   #4,D2           ; X / 16 = number of the group of 16 pixels
    LSL.W   #3,D2           ; x 8 bytes per group
    ADDA.W  D2,A0           ; A0 = plane 0 of the group
    AND.W   #15,D1          ; X mod 16 = position of the pixel in the group
    MOVE.W  #15,D3
    SUB.W   D1,D3           ; bit number (15 = leftmost pixel)
    MOVE.W  #1,D5
    LSL.W   D3,D5           ; mask: a single bit at 1
    OR.W    D5,(A0)         ; turn the pixel on in plane 0: color 1
    CLR.W   -(SP)
    TRAP    #1

;=== prediction-adresse
START:
    LEA     $F8000+100*160+160/16*8,A0
    MOVE.W  #160,D1
    AND.W   #15,D1
    MOVE.W  #15,D2
    SUB.W   D1,D2
    CLR.W   -(SP)
    TRAP    #1

;=== couleur3-depart
; The pixel (0, 0) must take color 3 (%0011)
START:
    MOVE.W  #2,-(SP)        ; Physbase
    TRAP    #14
    ADDQ.L  #2,SP
    MOVEA.L D0,A0           ; A0 = group of the first 16 pixels
    OR.W    #$8000,(A0)     ; plane 0: bit 15 (leftmost pixel) at 1
    ; which other plane must be modified?

    CLR.W   -(SP)
    TRAP    #1

;=== couleur3-solution
START:
    MOVE.W  #2,-(SP)
    TRAP    #14
    ADDQ.L  #2,SP
    MOVEA.L D0,A0
    OR.W    #$8000,(A0)     ; plane 0
    OR.W    #$8000,2(A0)    ; plane 1
    CLR.W   -(SP)
    TRAP    #1

;=== ligne-depart
; Draw on line Y = 10 a 32-pixel stroke (X = 0 to 31) in color 1
START:

    CLR.W   -(SP)
    TRAP    #1

;=== ligne-solution
START:
    MOVE.W  #2,-(SP)
    TRAP    #14
    ADDQ.L  #2,SP
    MOVEA.L D0,A0
    LEA     10*160(A0),A0   ; start of line 10
    MOVE.W  #$FFFF,(A0)     ; plane 0 of the 1st group: pixels 0 to 15
    MOVE.W  #$FFFF,8(A0)    ; plane 0 of the 2nd group: pixels 16 to 31
    CLR.W   -(SP)
    TRAP    #1

;=== pset-depart
; Draw the pixel (37, 10) in color 5 with the PSET routine from the manual.
; The routine contains TWO errors. Find them by stepping through it.
START:
    MOVE.W  #2,-(SP)        ; Physbase
    TRAP    #14
    ADDQ.L  #2,SP
    MOVE.L  D0,SCREEN_BASE
    MOVE.W  #37,D1          ; X
    MOVE.W  #10,D4          ; Y
    MOVE.W  #5,D2           ; color
    BSR     PSET
    CLR.W   -(SP)
    TRAP    #1

; PSET: D1.W = X (0-319), D4.W = Y (0-199), D2.W = color (0-15)
PSET:
    MOVEM.L D0-D6/A0-A1,-(SP)
    LEA     SCREEN_BASE,A0
    MOVE.L  (A0),A0
    MULU.W  #160,D4
    ADDA.L  D4,A0           ; A0 points to the start of line Y
    MOVE.W  D1,D0
    LSR.W   #1,D0           ; D0 = X / 2
    ANDI.W  #$FFFE,D0       ; "align on an even address"
    ADDA.L  D0,A0           ; A0 points to the 4 words of the group
    ANDI.W  #15,D1
    MOVE.W  #15,D3
    SUB.W   D1,D3           ; bit number
    MOVE.W  #1,D5
    LSL.W   D3,D5           ; mask of the pixel
    MOVE.W  D5,D6
    NOT.W   D6              ; inverted mask
    AND.W   D6,(A0)         ; plane 0
    LSR.W   #1,D2
    BCC.S   .BP1
    OR.W    D5,(A0)
.BP1:
    AND.W   D6,2(A0)        ; plane 1
    LSR.W   #1,D2
    BCC.S   .BP2
    OR.W    D5,2(A0)
.BP2:
    AND.W   D6,4(A0)        ; plane 2
    LSR.W   #1,D2
    BCC.S   .BP3
    OR.W    D5,4(A0)
.BP3:
    AND.W   D6,6(A0)        ; plane 3
    LSR.W   #1,D2
    BCC.S   .DONE
    OR.W    D5,6(A0)
.DONE:
    MOVEM.L (SP)+,D0-D6/A0-A1
    RTS

    EVEN
SCREEN_BASE:
    DC.L    0

;=== pset-solution
START:
    MOVE.W  #2,-(SP)
    TRAP    #14
    ADDQ.L  #2,SP
    MOVE.L  D0,SCREEN_BASE
    MOVE.W  #37,D1
    MOVE.W  #10,D4
    MOVE.W  #5,D2
    BSR     PSET
    CLR.W   -(SP)
    TRAP    #1

PSET:
    MOVEM.L D0-D6/A0-A1,-(SP)
    LEA     SCREEN_BASE,A0
    MOVE.L  (A0),A0
    MULU.W  #160,D4
    ADDA.L  D4,A0
    MOVE.W  D1,D0
    LSR.W   #1,D0
    ANDI.W  #$FFF8,D0       ; fix 1: align on a group of 8 bytes
    ADDA.W  D0,A0           ; fix 2: only the low word of D0 is valid
    ANDI.W  #15,D1
    MOVE.W  #15,D3
    SUB.W   D1,D3
    MOVE.W  #1,D5
    LSL.W   D3,D5
    MOVE.W  D5,D6
    NOT.W   D6
    AND.W   D6,(A0)
    LSR.W   #1,D2
    BCC.S   .BP1
    OR.W    D5,(A0)
.BP1:
    AND.W   D6,2(A0)
    LSR.W   #1,D2
    BCC.S   .BP2
    OR.W    D5,2(A0)
.BP2:
    AND.W   D6,4(A0)
    LSR.W   #1,D2
    BCC.S   .BP3
    OR.W    D5,4(A0)
.BP3:
    AND.W   D6,6(A0)
    LSR.W   #1,D2
    BCC.S   .DONE
    OR.W    D5,6(A0)
.DONE:
    MOVEM.L (SP)+,D0-D6/A0-A1
    RTS

    EVEN
SCREEN_BASE:
    DC.L    0

;=== palette-exemple
START:
    MOVE.W  #2,-(SP)        ; Physbase
    TRAP    #14
    ADDQ.L  #2,SP
    MOVEA.L D0,A0
    MOVE.W  #3999,D3        ; 4000 groups of 16 pixels
REMPLIR:
    CLR.W   (A0)+           ; plane 0: 0
    MOVE.W  #$FFFF,(A0)+    ; plane 1: 1
    CLR.L   (A0)+           ; planes 2 and 3: 0
    DBRA    D3,REMPLIR      ; the whole screen in color 2 (%0010)
    MOVE.W  #$007,-(SP)     ; blue
    MOVE.W  #2,-(SP)        ; color no. 2
    MOVE.W  #7,-(SP)        ; XBIOS 7: Setcolor
    TRAP    #14
    ADDQ.L  #6,SP
    CLR.W   -(SP)
    TRAP    #1

;=== palette-prediction
START:
    MOVE.W  #2,-(SP)
    TRAP    #14
    ADDQ.L  #2,SP
    MOVEA.L D0,A0
    MOVE.W  #3999,D3
REMPLIR:
    CLR.W   (A0)+
    MOVE.W  #$FFFF,(A0)+
    CLR.L   (A0)+
    DBRA    D3,REMPLIR
    MOVE.W  #$700,-(SP)
    MOVE.W  #2,-(SP)
    MOVE.W  #7,-(SP)        ; Setcolor(2, $700)
    TRAP    #14
    ADDQ.L  #6,SP
    CLR.W   -(SP)
    TRAP    #1

;=== rouge15-depart
; With Setcolor, give color 15 the value bright red
START:

    CLR.W   -(SP)
    TRAP    #1

;=== rouge15-solution
START:
    MOVE.W  #$700,-(SP)
    MOVE.W  #15,-(SP)
    MOVE.W  #7,-(SP)
    TRAP    #14
    ADDQ.L  #6,SP
    CLR.W   -(SP)
    TRAP    #1

;=== remplir15-depart
; Fill the whole screen with color 15 (%1111)
START:

    CLR.W   -(SP)
    TRAP    #1

;=== remplir15-solution
START:
    MOVE.W  #2,-(SP)
    TRAP    #14
    ADDQ.L  #2,SP
    MOVEA.L D0,A0
    MOVE.W  #7999,D3        ; 32,000 bytes = 8,000 long words
REMPLIR:
    MOVE.L  #-1,(A0)+       ; every bit of every plane at 1
    DBRA    D3,REMPLIR
    CLR.W   -(SP)
    TRAP    #1

;=== bonus-carre-depart
; Draw a filled 16 x 16 square in color 4 at the top left
START:

    CLR.W   -(SP)
    TRAP    #1

;=== bonus-carre-solution
START:
    MOVE.W  #2,-(SP)
    TRAP    #14
    ADDQ.L  #2,SP
    MOVEA.L D0,A0
    MOVE.W  #15,D3          ; 16 lines
LIGNE:
    MOVE.W  #$FFFF,4(A0)    ; color 4 = %0100: plane 2 only
    LEA     160(A0),A0      ; next line
    DBRA    D3,LIGNE
    CLR.W   -(SP)
    TRAP    #1

;=== rappel
START:
    MOVE.W  #'A',D3
    MOVE.W  #2,D4
BOUCLE:
    MOVE.W  D3,-(SP)
    MOVE.W  #2,-(SP)        ; Cconout
    TRAP    #1
    ADDQ.L  #4,SP
    ADDQ.W  #1,D3
    DBRA    D4,BOUCLE
    RTS
