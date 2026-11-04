; Code for chapter 6, "The Copper". The programs include content/fichiers/amiga-systeme.s.

;=== degrade-exemple
START:
    BSR     prendre         ; A5 = $DFF000
    MOVE.L  #copper,$80(A5) ; COP1LC
    MOVE.W  D0,$88(A5)      ; COPJMP1
    MOVE.W  #$8280,$96(A5)  ; DMAEN + COPEN
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS
    INCLUDE "amiga-systeme.s"

    SECTION chip,DATA_C
copper:
    DC.W    $0100,$0200     ; no plane: the whole screen is in color 0
    DC.W    $0180,$0000     ; black at the top
    DC.W    $6007,$FFFE,$0180,$0002 ; line $60: a very dark blue
    DC.W    $6407,$FFFE,$0180,$0004
    DC.W    $6807,$FFFE,$0180,$0006
    DC.W    $6C07,$FFFE,$0180,$0008
    DC.W    $7007,$FFFE,$0180,$000A
    DC.W    $7407,$FFFE,$0180,$000C
    DC.W    $7807,$FFFE,$0180,$000E
    DC.W    $7C07,$FFFE,$0180,$022F ; the blue gets lighter
    DC.W    $8007,$FFFE,$0180,$044F
    DC.W    $8407,$FFFE,$0180,$066F
    DC.W    $8807,$FFFE,$0180,$088F
    DC.W    $8C07,$FFFE,$0180,$0AAF
    DC.W    $9007,$FFFE,$0180,$0CCF
    DC.W    $9407,$FFFE,$0180,$0FFF ; white from line $94 on
    DC.W    $FFFF,$FFFE     ; end of the list

;=== wait-prediction
START:
    MOVE.W  #$9007,D0       ; the first word of a WAIT
    LSR.W   #8,D0           ; the line waited for
    SUB.W   #$2C,D0         ; minus the first line of the standard image
    RTS

;=== bande-depart
START:
    BSR     prendre
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$8280,$96(A5)
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS
    INCLUDE "amiga-systeme.s"

    SECTION chip,DATA_C
copper:
    DC.W    $0100,$0200,$0180,$0000
    DC.W    $6007,$FFFE,$0180,$00F0 ; line $60: green
    DC.W    $7007,$FFFE,$0180,$0000 ; line $70: black
    DC.W    $0007,$FFFE,$0180,$000F ; <- line $A0: blue
    DC.W    $B007,$FFFE,$0180,$0000 ; line $B0: black
    DC.W    $FFFF,$FFFE

;=== bande-solution
START:
    BSR     prendre
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$8280,$96(A5)
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS
    INCLUDE "amiga-systeme.s"

    SECTION chip,DATA_C
copper:
    DC.W    $0100,$0200,$0180,$0000
    DC.W    $6007,$FFFE,$0180,$00F0 ; line $60: green
    DC.W    $7007,$FFFE,$0180,$0000 ; line $70: black
    DC.W    $A007,$FFFE,$0180,$000F ; line $A0: blue
    DC.W    $B007,$FFFE,$0180,$0000 ; line $B0: black
    DC.W    $FFFF,$FFFE

;=== ordonner-entete
; Put the lines of the copper list back in order: black at the top, red from
; line $50, white from $80, blue from $B0.
START:
    BSR     prendre
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$8280,$96(A5)
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS
    INCLUDE "amiga-systeme.s"

    SECTION chip,DATA_C
copper:
    DC.W    $0100,$0200     ; no plane

;=== ordonner-pied
    DC.W    $FFFF,$FFFE     ; end of the list

;=== faux-wait-depart
START:
    BSR     prendre
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$8280,$96(A5)
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS
    INCLUDE "amiga-systeme.s"

    SECTION chip,DATA_C
copper:
    DC.W    $0100,$0200,$0180,$0000
    DC.W    $5007,$FFFE,$0180,$0F00 ; line $50: red
    DC.W    $8006,$FFFE,$0180,$0FF0 ; line $80: yellow
    DC.W    $B007,$FFFE,$0180,$0000 ; line $B0: black
    DC.W    $FFFF,$FFFE

;=== faux-wait-solution
START:
    BSR     prendre
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$8280,$96(A5)
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS
    INCLUDE "amiga-systeme.s"

    SECTION chip,DATA_C
copper:
    DC.W    $0100,$0200,$0180,$0000
    DC.W    $5007,$FFFE,$0180,$0F00 ; line $50: red
    DC.W    $8007,$FFFE,$0180,$0FF0 ; line $80: yellow (bit 0 at 1: it is a WAIT)
    DC.W    $B007,$FFFE,$0180,$0000 ; line $B0: black
    DC.W    $FFFF,$FFFE

;=== drapeau-depart
; The German flag in three horizontal bands: black at the top, red ($F00) from
; line $80, gold ($FC0) from line $D5.
START:
    BSR     prendre
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$8280,$96(A5)
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS
    INCLUDE "amiga-systeme.s"

    SECTION chip,DATA_C
copper:
    DC.W    $0100,$0200

    DC.W    $FFFF,$FFFE

;=== drapeau-solution
START:
    BSR     prendre
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$8280,$96(A5)
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS
    INCLUDE "amiga-systeme.s"

    SECTION chip,DATA_C
copper:
    DC.W    $0100,$0200
    DC.W    $0180,$0000             ; black
    DC.W    $8007,$FFFE,$0180,$0F00 ; red
    DC.W    $D507,$FFFE,$0180,$0FC0 ; gold
    DC.W    $FFFF,$FFFE

;=== bas-exemple
START:
    BSR     prendre
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$8280,$96(A5)
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS
    INCLUDE "amiga-systeme.s"

    SECTION chip,DATA_C
copper:
    DC.W    $0100,$0200,$0180,$0000
    DC.W    $F007,$FFFE,$0180,$0300 ; line $F0: dark red
    DC.W    $FFDF,$FFFE             ; end of line 255: the 8-bit counter starts again from 0
    DC.W    $0807,$FFFE,$0180,$0600 ; line $108
    DC.W    $1007,$FFFE,$0180,$0900 ; line $110
    DC.W    $1807,$FFFE,$0180,$0C00 ; line $118
    DC.W    $2007,$FFFE,$0180,$0F00 ; line $120
    DC.W    $2C07,$FFFE,$0180,$0000 ; line $12C: the end of the standard image
    DC.W    $FFFF,$FFFE

;=== ligne256-prediction
START:
    MOVE.W  #$2C,D0         ; the line of a WAIT placed after $FFDF,$FFFE
    ADD.W   #256,D0         ; the Copper's counter started again from 0 at line 256
    RTS

;=== sous255-depart
START:
    BSR     prendre
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$8280,$96(A5)
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS
    INCLUDE "amiga-systeme.s"

    SECTION chip,DATA_C
copper:
    DC.W    $0100,$0200,$0180,$0000
                                    ; <- a wait is missing here
    DC.W    $1007,$FFFE,$0180,$00F0 ; line $110: green, all the way down
    DC.W    $FFFF,$FFFE

;=== sous255-solution
START:
    BSR     prendre
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$8280,$96(A5)
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS
    INCLUDE "amiga-systeme.s"

    SECTION chip,DATA_C
copper:
    DC.W    $0100,$0200,$0180,$0000
    DC.W    $FFDF,$FFFE             ; wait for the end of line 255
    DC.W    $1007,$FFFE,$0180,$00F0 ; line $110: green, all the way down
    DC.W    $FFFF,$FFFE

;=== barre-exemple
START:
    BSR     prendre
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$8280,$96(A5)
    MOVE.W  #$40,D0         ; the line of the top of the bar
.image:
    BSR     attendre_vbl    ; once per frame, below the visible image
    BSR     placer
    ADDQ.W  #1,D0           ; one line lower on the next frame
    CMP.W   #$F0,D0
    BLS.S   .encore
    MOVE.W  #$40,D0         ; at the bottom: start again at the top
.encore:
    BTST    #6,$BFE001
    BNE.S   .image
    BSR     rendre
    MOVEQ   #0,D0
    RTS

; Places the bar at line D0 (from $40 to $F0)
placer:
    MOVE.W  D0,D1
    LSL.W   #8,D1           ; the line in the high byte
    OR.W    #$07,D1         ; position $06, bit 0 at 1: a WAIT
    MOVE.W  D1,barre
    ADD.W   #$0800,D1       ; 8 lines further down
    MOVE.W  D1,fin_barre
    RTS
    INCLUDE "amiga-systeme.s"

    SECTION chip,DATA_C
copper:
    DC.W    $0100,$0200,$0180,$0000
barre:
    DC.W    $4007,$FFFE,$0180,$0F00 ; the top of the bar: red
fin_barre:
    DC.W    $4807,$FFFE,$0180,$0000 ; the bottom: black
    DC.W    $FFFF,$FFFE

;=== wait-mot-prediction
START:
    MOVE.W  #$50,D0         ; the line wanted
    MOVE.W  D0,D1
    LSL.W   #8,D1
    OR.W    #$07,D1         ; the top WAIT
    MOVE.W  D1,D2
    ADD.W   #$0800,D2       ; the bottom WAIT
    RTS

;=== disparait-depart
; The bar must move down one line per frame for 30 frames, starting from line $40,
; then stay in place until the click. But it disappears.
START:
    BSR     prendre
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$8280,$96(A5)
    MOVE.W  #$40,D0
    MOVEQ   #29,D7
.image:
    BSR     attendre_vbl
    ADDQ.W  #1,D0
    MOVE.W  D0,D1
    LSL.W   #8,D1
    OR.W    #$07,D1
    MOVE.W  D1,barre
    DBF     D7,.image
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS
    INCLUDE "amiga-systeme.s"

    SECTION chip,DATA_C
copper:
    DC.W    $0100,$0200,$0180,$0000
barre:
    DC.W    $4007,$FFFE,$0180,$0F00
fin_barre:
    DC.W    $4807,$FFFE,$0180,$0000
    DC.W    $FFFF,$FFFE

;=== disparait-solution
START:
    BSR     prendre
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$8280,$96(A5)
    MOVE.W  #$40,D0
    MOVEQ   #29,D7
.image:
    BSR     attendre_vbl
    ADDQ.W  #1,D0
    MOVE.W  D0,D1
    LSL.W   #8,D1
    OR.W    #$07,D1
    MOVE.W  D1,barre
    ADD.W   #$0800,D1       ; the bottom of the bar follows, 8 lines further down
    MOVE.W  D1,fin_barre
    DBF     D7,.image
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS
    INCLUDE "amiga-systeme.s"

    SECTION chip,DATA_C
copper:
    DC.W    $0100,$0200,$0180,$0000
barre:
    DC.W    $4007,$FFFE,$0180,$0F00
fin_barre:
    DC.W    $4807,$FFFE,$0180,$0000
    DC.W    $FFFF,$FFFE

;=== haute-solution
START:
    BSR     prendre
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$8280,$96(A5)
    MOVE.W  #$40,D0
    MOVEQ   #29,D7
.image:
    BSR     attendre_vbl
    ADDQ.W  #1,D0
    MOVE.W  D0,D1
    LSL.W   #8,D1
    OR.W    #$07,D1
    MOVE.W  D1,barre
    ADD.W   #$1000,D1       ; the bottom of the bar, 16 lines further down
    MOVE.W  D1,fin_barre
    DBF     D7,.image
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS
    INCLUDE "amiga-systeme.s"

    SECTION chip,DATA_C
copper:
    DC.W    $0100,$0200,$0180,$0000
barre:
    DC.W    $4007,$FFFE,$0180,$0F00
fin_barre:
    DC.W    $4807,$FFFE,$0180,$0000
    DC.W    $FFFF,$FFFE

;=== soixante-depart
; Move the bar down 2 lines per frame, 60 times, starting from line $40.
; It must end up from line $B8 to $C0, then stay in place until the click.
START:
    BSR     prendre
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$8280,$96(A5)

    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS
    INCLUDE "amiga-systeme.s"

    SECTION chip,DATA_C
copper:
    DC.W    $0100,$0200,$0180,$0000
barre:
    DC.W    $4007,$FFFE,$0180,$0F00
fin_barre:
    DC.W    $4807,$FFFE,$0180,$0000
    DC.W    $FFFF,$FFFE

;=== soixante-solution
START:
    BSR     prendre
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$8280,$96(A5)
    MOVE.W  #$40,D0
    MOVEQ   #59,D7          ; 60 frames
.image:
    BSR     attendre_vbl
    ADDQ.W  #2,D0
    MOVE.W  D0,D1
    LSL.W   #8,D1
    OR.W    #$07,D1
    MOVE.W  D1,barre
    ADD.W   #$0800,D1
    MOVE.W  D1,fin_barre
    DBF     D7,.image
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS
    INCLUDE "amiga-systeme.s"

    SECTION chip,DATA_C
copper:
    DC.W    $0100,$0200,$0180,$0000
barre:
    DC.W    $4007,$FFFE,$0180,$0F00
fin_barre:
    DC.W    $4807,$FFFE,$0180,$0000
    DC.W    $FFFF,$FFFE

;=== vbl-exemple
START:
    BSR     prendre
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$8280,$96(A5)
    MOVE.L  #vbl,$6C.W      ; our level 3 routine
    MOVE.W  #$C020,$9A(A5)  ; INTENA: SET + INTEN + VERTB
    BSR     attendre_clic   ; the main program does nothing else
    BSR     rendre          ; also puts the system's $6C vector back
    MOVEQ   #0,D0
    RTS

vbl:
    MOVEM.L D0-D1,-(SP)
    MOVE.W  ligne,D0
    ADDQ.W  #1,D0           ; the bar moves down
    CMP.W   #$F0,D0
    BLS.S   .ok
    MOVE.W  #$40,D0
.ok:
    MOVE.W  D0,ligne
    LSL.W   #8,D0
    OR.W    #$07,D0
    MOVE.W  D0,barre
    ADD.W   #$0800,D0
    MOVE.W  D0,fin_barre
    MOVE.W  #$0020,$DFF09C  ; INTREQ: the VBL has been handled
    MOVEM.L (SP)+,D0-D1
    RTE
ligne:  DC.W    $40
    INCLUDE "amiga-systeme.s"

    SECTION chip,DATA_C
copper:
    DC.W    $0100,$0200,$0180,$0000
barre:
    DC.W    $4007,$FFFE,$0180,$00F0
fin_barre:
    DC.W    $4807,$FFFE,$0180,$0000
    DC.W    $FFFF,$FFFE

;=== intena-depart
; A VBL routine counts the frames. The program waits for it to have counted 50,
; then stores the counter in D7. But it waits forever...
START:
    BSR     prendre
    MOVE.L  #vbl,$6C.W
    MOVE.W  #$0000,$9A(A5)  ; <- INTENA: enable the VBL (and the master switch)
.attente:
    CMP.W   #50,compteur
    BLO.S   .attente
    MOVE.W  compteur,D7
    BSR     rendre
    MOVEQ   #0,D0           ; return code for the Shell: all is well
    RTS

vbl:
    ADDQ.W  #1,compteur
    MOVE.W  #$0020,$DFF09C
    RTE
compteur: DC.W  0
    INCLUDE "amiga-systeme.s"

;=== intena-solution
START:
    BSR     prendre
    MOVE.L  #vbl,$6C.W
    MOVE.W  #$C020,$9A(A5)  ; INTENA: SET + INTEN + VERTB
.attente:
    CMP.W   #50,compteur
    BLO.S   .attente
    MOVE.W  compteur,D7
    BSR     rendre
    MOVEQ   #0,D0           ; return code for the Shell: all is well
    RTS

vbl:
    ADDQ.W  #1,compteur
    MOVE.W  #$0020,$DFF09C
    RTE
compteur: DC.W  0
    INCLUDE "amiga-systeme.s"

;=== sans-fin-depart
START:
    BSR     prendre
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$8280,$96(A5)
    MOVE.L  #vbl,$6C.W
    MOVE.W  #$C020,$9A(A5)
.attente:
    CMP.W   #100,compteur   ; two seconds
    BLO.S   .attente
    BSR     rendre
    MOVEQ   #0,D0
    RTS

vbl:
    MOVE.L  D0,-(SP)
    ADDQ.W  #1,compteur
    MOVE.W  compteur,D0
    AND.W   #$0F,D0         ; a color that changes on every frame
    MOVE.W  D0,couleur
    MOVE.L  (SP)+,D0
    RTE
compteur: DC.W  0
    INCLUDE "amiga-systeme.s"

    SECTION chip,DATA_C
copper:
    DC.W    $0100,$0200
    DC.W    $0180
couleur:
    DC.W    $0000
    DC.W    $FFFF,$FFFE

;=== sans-fin-solution
START:
    BSR     prendre
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$8280,$96(A5)
    MOVE.L  #vbl,$6C.W
    MOVE.W  #$C020,$9A(A5)
.attente:
    CMP.W   #100,compteur   ; two seconds
    BLO.S   .attente
    BSR     rendre
    MOVEQ   #0,D0
    RTS

vbl:
    MOVE.L  D0,-(SP)
    ADDQ.W  #1,compteur
    MOVE.W  compteur,D0
    AND.W   #$0F,D0         ; a color that changes on every frame
    MOVE.W  D0,couleur
    MOVE.W  #$0020,$DFF09C  ; INTREQ: request handled
    MOVE.L  (SP)+,D0
    RTE
compteur: DC.W  0
    INCLUDE "amiga-systeme.s"

    SECTION chip,DATA_C
copper:
    DC.W    $0100,$0200
    DC.W    $0180
couleur:
    DC.W    $0000
    DC.W    $FFFF,$FFFE

;=== compte-depart
; Install a VBL routine that counts the frames in "compteur". The main program
; waits for the counter to reach 100, stores it in D7, then gives control back.
START:
    BSR     prendre

    BSR     rendre
    MOVEQ   #0,D0           ; return code for the Shell: all is well
    RTS
compteur: DC.W  0
    INCLUDE "amiga-systeme.s"

;=== compte-solution
START:
    BSR     prendre
    MOVE.L  #vbl,$6C.W
    MOVE.W  #$C020,$9A(A5)
.attente:
    CMP.W   #100,compteur
    BLO.S   .attente
    MOVEQ   #0,D7
    MOVE.W  compteur,D7
    BSR     rendre
    MOVEQ   #0,D0           ; return code for the Shell: all is well
    RTS

vbl:
    ADDQ.W  #1,compteur
    MOVE.W  #$0020,$DFF09C
    RTE
compteur: DC.W  0
    INCLUDE "amiga-systeme.s"

;=== qcm-fin
    DC.W    $FFFF,$FFFE

;=== bonus-rebond-depart
; A blue bar 8 lines tall bounces following the table "positions" (32 starting lines),
; one position per frame, for 80 frames; then it stays in place until the click.
START:
    BSR     prendre
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$8280,$96(A5)

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
    DC.W    $0100,$0200,$0180,$0000
barre:
    DC.W    $5007,$FFFE,$0180,$008F
fin_barre:
    DC.W    $5807,$FFFE,$0180,$0000
    DC.W    $FFFF,$FFFE

;=== bonus-rebond-solution
START:
    BSR     prendre
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$8280,$96(A5)
    MOVEQ   #0,D6           ; the index in the table
    MOVEQ   #79,D7          ; 80 frames
    LEA     positions(PC),A0
.image:
    BSR     attendre_vbl
    MOVEQ   #0,D0
    MOVE.B  0(A0,D6.W),D0   ; the line for this frame
    LSL.W   #8,D0
    OR.W    #$07,D0
    MOVE.W  D0,barre
    ADD.W   #$0800,D0
    MOVE.W  D0,fin_barre
    ADDQ.W  #1,D6
    AND.W   #31,D6          ; after the 32nd position, go back to the start
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
    DC.W    $0100,$0200,$0180,$0000
barre:
    DC.W    $5007,$FFFE,$0180,$008F
fin_barre:
    DC.W    $5807,$FFFE,$0180,$0000
    DC.W    $FFFF,$FFFE

;=== rappel
START:
    LEA     $DFF000,A5
    MOVE.W  $02(A5),D0      ; DMACONR
    AND.W   #$07FF,D0       ; only the channel bits
    MOVE.W  #$0100,$96(A5)  ; DMACON
    MOVE.W  $02(A5),D1
    AND.W   #$07FF,D1
    OR.W    #$8000,D0
    MOVE.W  D0,$96(A5)      ; DMACON
    MOVEQ   #17,D2          ; x
    MOVEQ   #2,D3           ; y
    MULU    #40,D3
    LSR.W   #3,D2
    ADD.W   D2,D3
    MOVEQ   #0,D0
    RTS
