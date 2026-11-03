; Code for chapter 5, "The screen and the custom chips".
; The programs that take over include content/fichiers/amiga-systeme.s.

;=== raster-exemple
START:
    LEA     $DFF000,A5      ; A5 = the chips
.image:
    CMP.B   #$80,$06(A5)    ; VHPOSR: is the beam at line $80?
    BNE.S   .image
    MOVE.W  #$0F00,$180(A5) ; COLOR00 = red
.bas:
    CMP.B   #$90,$06(A5)    ; line $90?
    BNE.S   .bas
    MOVE.W  #$005A,$180(A5) ; COLOR00 = the Workbench blue
    BTST    #6,$BFE001      ; left mouse button pressed?
    BNE.S   .image          ; no: next frame
    MOVEQ   #0,D0           ; return code for the Shell: all is well
    RTS

;=== setclr-prediction
START:
    LEA     $DFF000,A5
    MOVE.W  #$0040,$96(A5)  ; DMACON: bit 15 at 0, so bit 6 (Blitter) becomes 0
    MOVE.W  $02(A5),D0      ; DMACONR
    AND.W   #$07FF,D0       ; only the channel bits
    MOVE.W  #$8040,$96(A5)  ; bit 15 at 1: bit 6 goes back to 1
    MOVE.W  $02(A5),D1
    AND.W   #$07FF,D1
    RTS

;=== verte-depart
START:
    LEA     $DFF000,A5
.image:
    CMP.B   #$00,$06(A5)    ; <- the band starts at line $A0
    BNE.S   .image
    MOVE.W  #$0000,$180(A5) ; <- bright green
.bas:
    CMP.B   #$B0,$06(A5)
    BNE.S   .bas
    MOVE.W  #$005A,$180(A5)
    BTST    #6,$BFE001
    BNE.S   .image
    MOVEQ   #0,D0           ; return code for the Shell: all is well
    RTS

;=== verte-solution
START:
    LEA     $DFF000,A5
.image:
    CMP.B   #$A0,$06(A5)    ; the band starts at line $A0
    BNE.S   .image
    MOVE.W  #$00F0,$180(A5) ; bright green
.bas:
    CMP.B   #$B0,$06(A5)
    BNE.S   .bas
    MOVE.W  #$005A,$180(A5)
    BTST    #6,$BFE001
    BNE.S   .image
    MOVEQ   #0,D0           ; return code for the Shell: all is well
    RTS

;=== fin-bande-depart
START:
    LEA     $DFF000,A5
.image:
    CMP.B   #$70,$06(A5)
    BNE.S   .image
    MOVE.W  #$0FF0,$180(A5) ; yellow
.bas:
    CMP.B   #$78,$06(A5)
    BNE.S   .bas
    MOVE.W  #$0FF0,$180(A5)
    BTST    #6,$BFE001
    BNE.S   .image
    MOVEQ   #0,D0           ; return code for the Shell: all is well
    RTS

;=== fin-bande-solution
START:
    LEA     $DFF000,A5
.image:
    CMP.B   #$70,$06(A5)
    BNE.S   .image
    MOVE.W  #$0FF0,$180(A5) ; yellow
.bas:
    CMP.B   #$78,$06(A5)
    BNE.S   .bas
    MOVE.W  #$005A,$180(A5) ; end of the band: the blue comes back
    BTST    #6,$BFE001
    BNE.S   .image
    MOVEQ   #0,D0           ; return code for the Shell: all is well
    RTS

;=== deux-bandes-depart
; A red band from line $60 to $68, a yellow band from $C0 to $C8,
; on every frame, until the left click.
START:
    LEA     $DFF000,A5

    MOVEQ   #0,D0           ; return code for the Shell: all is well
    RTS

;=== deux-bandes-solution
START:
    LEA     $DFF000,A5
.image:
    CMP.B   #$60,$06(A5)
    BNE.S   .image
    MOVE.W  #$0F00,$180(A5)
.fin1:
    CMP.B   #$68,$06(A5)
    BNE.S   .fin1
    MOVE.W  #$005A,$180(A5)
.debut2:
    CMP.B   #$C0,$06(A5)
    BNE.S   .debut2
    MOVE.W  #$0FF0,$180(A5)
.fin2:
    CMP.B   #$C8,$06(A5)
    BNE.S   .fin2
    MOVE.W  #$005A,$180(A5)
    BTST    #6,$BFE001
    BNE.S   .image
    MOVEQ   #0,D0           ; return code for the Shell: all is well
    RTS

;=== prendre-exemple
; The complete skeleton: take over, display our copper list, give control back.
START:
    BSR     prendre         ; A5 = $DFF000, everything is off
    MOVE.L  #copper,$80(A5) ; COP1LC: our list
    MOVE.W  D0,$88(A5)      ; COPJMP1: the Copper jumps to it
    MOVE.W  #$8280,$96(A5)  ; DMACON: SET + DMAEN + COPEN
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS

prendre:
    MOVEM.L D0-D7/A0-A6,-(SP)
    MOVEA.L 4.W,A6
    LEA     sys_gfxnom(PC),A1
    MOVEQ   #0,D0
    JSR     -552(A6)            ; OpenLibrary("graphics.library", 0)
    MOVE.L  D0,sys_gfx
    MOVEA.L D0,A6
    MOVE.L  34(A6),sys_vue      ; gb_ActiView: the view displayed by the system
    SUBA.L  A1,A1
    JSR     -222(A6)            ; LoadView(0)
    JSR     -270(A6)            ; WaitTOF
    JSR     -270(A6)            ; WaitTOF
    JSR     -456(A6)            ; OwnBlitter
    JSR     -228(A6)            ; WaitBlit
    MOVEA.L 4.W,A6
    JSR     -132(A6)            ; Forbid
    LEA     $DFF000,A5
    MOVE.W  $02(A5),sys_dmacon  ; DMACONR
    MOVE.W  $1C(A5),sys_intena  ; INTENAR
    MOVE.W  $10(A5),sys_adkcon  ; ADKCONR
    MOVE.L  $6C.W,sys_niveau3   ; level 3 vector
    MOVE.W  #$7FFF,$9A(A5)      ; INTENA: everything off
    MOVE.W  #$7FFF,$9C(A5)      ; INTREQ: requests cleared
    MOVE.W  #$7FFF,$96(A5)      ; DMACON: everything off
    MOVEM.L (SP)+,D0-D7/A0-A6
    LEA     $DFF000,A5
    RTS

rendre:
    MOVEM.L D0-D7/A0-A6,-(SP)
    LEA     $DFF000,A5
    MOVE.W  #$7FFF,$9A(A5)
    MOVE.W  #$7FFF,$9C(A5)
    MOVE.W  #$7FFF,$96(A5)
    MOVE.L  sys_niveau3,$6C.W
    MOVEA.L sys_gfx,A6
    MOVE.L  38(A6),$80(A5)      ; COP1LC = gb_copinit
    MOVE.W  D0,$88(A5)          ; COPJMP1
    MOVE.W  sys_adkcon,D0
    OR.W    #$8000,D0
    MOVE.W  D0,$9E(A5)          ; ADKCON
    MOVE.W  sys_dmacon,D0
    OR.W    #$8000,D0
    MOVE.W  D0,$96(A5)          ; DMACON
    MOVE.W  sys_intena,D0
    OR.W    #$C000,D0
    MOVE.W  D0,$9A(A5)          ; INTENA
    MOVEA.L sys_vue,A1
    JSR     -222(A6)            ; LoadView(old view)
    JSR     -270(A6)            ; WaitTOF
    JSR     -270(A6)
    JSR     -462(A6)            ; DisownBlitter
    MOVEA.L 4.W,A6
    JSR     -138(A6)            ; Permit
    MOVEA.L sys_gfx,A1
    JSR     -414(A6)            ; CloseLibrary(graphics)
    MOVEM.L (SP)+,D0-D7/A0-A6
    RTS

attendre_clic:
.relache:
    BTST    #6,$BFE001
    BEQ.S   .relache
.appui:
    BTST    #6,$BFE001
    BNE.S   .appui
    RTS

sys_gfxnom: DC.B 'graphics.library',0
    EVEN
sys_gfx:     DC.L 0
sys_vue:     DC.L 0
sys_niveau3: DC.L 0
sys_dmacon:  DC.W 0
sys_intena:  DC.W 0
sys_adkcon:  DC.W 0

    SECTION chip,DATA_C
copper:
    DC.W    $0100,$0200     ; BPLCON0: no plane
    DC.W    $0180,$0F80     ; COLOR00: orange
    DC.W    $9007,$FFFE     ; WAIT line $90
    DC.W    $0180,$0008     ; COLOR00: midnight blue
    DC.W    $FFFF,$FFFE     ; end

;=== bit15-prediction
START:
    LEA     $DFF000,A5
    MOVE.W  $02(A5),D7      ; "save" DMACONR
    AND.W   #$07FF,D7
    MOVE.W  D7,$96(A5)      ; and "give it back" without bit 15...
    MOVE.W  $02(A5),D0
    AND.W   #$07FF,D0
    OR.W    #$8000,D7
    MOVE.W  D7,$96(A5)      ; ... then with bit 15
    MOVE.W  $02(A5),D1
    AND.W   #$07FF,D1
    RTS

;=== copinit-depart
START:
    MOVEA.L 4.W,A6
    LEA     gfxnom(PC),A1
    MOVEQ   #0,D0
    JSR     -552(A6)        ; graphics.library
    MOVEA.L D0,A4           ; A4 = GfxBase
    JSR     -132(A6)        ; Forbid
    LEA     $DFF000,A5
    MOVE.W  $02(A5),D7      ; saved DMACONR
    MOVE.W  #$7FFF,$96(A5)  ; all DMA off
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$8280,$96(A5)  ; only the Copper
.clic:
    BTST    #6,$BFE001
    BNE.S   .clic
    MOVE.W  #$7FFF,$96(A5)
    MOVE.L  0(A4),$80(A5)   ; <- COP1LC: gb_copinit is 38 bytes from the base of graphics
    MOVE.W  D0,$88(A5)
    OR.W    #$8000,D7
    MOVE.W  D7,$96(A5)      ; the system's DMA
    JSR     -138(A6)        ; Permit
    MOVEA.L A4,A1
    JSR     -414(A6)
    MOVEQ   #0,D0
    RTS
gfxnom: DC.B    'graphics.library',0
    EVEN
    SECTION chip,DATA_C
copper:
    DC.W    $0100,$0200,$0180,$0606,$FFFF,$FFFE

;=== copinit-solution
START:
    MOVEA.L 4.W,A6
    LEA     gfxnom(PC),A1
    MOVEQ   #0,D0
    JSR     -552(A6)        ; graphics.library
    MOVEA.L D0,A4           ; A4 = GfxBase
    JSR     -132(A6)        ; Forbid
    LEA     $DFF000,A5
    MOVE.W  $02(A5),D7      ; saved DMACONR
    MOVE.W  #$7FFF,$96(A5)  ; all DMA off
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$8280,$96(A5)  ; only the Copper
.clic:
    BTST    #6,$BFE001
    BNE.S   .clic
    MOVE.W  #$7FFF,$96(A5)
    MOVE.L  38(A4),$80(A5)  ; COP1LC = gb_copinit
    MOVE.W  D0,$88(A5)
    OR.W    #$8000,D7
    MOVE.W  D7,$96(A5)      ; the system's DMA
    JSR     -138(A6)        ; Permit
    MOVEA.L A4,A1
    JSR     -414(A6)
    MOVEQ   #0,D0
    RTS
gfxnom: DC.B    'graphics.library',0
    EVEN
    SECTION chip,DATA_C
copper:
    DC.W    $0100,$0200,$0180,$0606,$FFFF,$FFFE

;=== bit15-depart
START:
    MOVEA.L 4.W,A6
    LEA     gfxnom(PC),A1
    MOVEQ   #0,D0
    JSR     -552(A6)
    MOVEA.L D0,A4           ; A4 = GfxBase
    JSR     -132(A6)        ; Forbid
    LEA     $DFF000,A5
    MOVE.W  $02(A5),D7      ; saved DMACONR
    MOVE.W  #$7FFF,$96(A5)
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$8280,$96(A5)
.clic:
    BTST    #6,$BFE001
    BNE.S   .clic
    MOVE.W  #$7FFF,$96(A5)
    MOVE.L  38(A4),$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  D7,$96(A5)      ; the system's DMA comes back... really?
    JSR     -138(A6)
    MOVEA.L A4,A1
    JSR     -414(A6)
    MOVEQ   #0,D0
    RTS
gfxnom: DC.B    'graphics.library',0
    EVEN
    SECTION chip,DATA_C
copper:
    DC.W    $0100,$0200,$0180,$0066,$FFFF,$FFFE

;=== bit15-solution
START:
    MOVEA.L 4.W,A6
    LEA     gfxnom(PC),A1
    MOVEQ   #0,D0
    JSR     -552(A6)
    MOVEA.L D0,A4           ; A4 = GfxBase
    JSR     -132(A6)        ; Forbid
    LEA     $DFF000,A5
    MOVE.W  $02(A5),D7      ; saved DMACONR
    MOVE.W  #$7FFF,$96(A5)
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$8280,$96(A5)
.clic:
    BTST    #6,$BFE001
    BNE.S   .clic
    MOVE.W  #$7FFF,$96(A5)
    MOVE.L  38(A4),$80(A5)
    MOVE.W  D0,$88(A5)
    OR.W    #$8000,D7       ; SET: turn back on the bits that were 1
    MOVE.W  D7,$96(A5)
    JSR     -138(A6)
    MOVEA.L A4,A1
    JSR     -414(A6)
    MOVEQ   #0,D0
    RTS
gfxnom: DC.B    'graphics.library',0
    EVEN
    SECTION chip,DATA_C
copper:
    DC.W    $0100,$0200,$0180,$0066,$FFFF,$FFFE

;=== orange-depart
; With prendre and rendre (amiga-systeme.s): display an orange background ($F80) using your own
; copper list, until the left click.
START:
    BSR     prendre

    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS
    INCLUDE "amiga-systeme.s"

    SECTION chip,DATA_C
copper:
    DC.W    $FFFF,$FFFE

;=== orange-solution
START:
    BSR     prendre
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$8280,$96(A5)  ; DMAEN + COPEN
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS
    INCLUDE "amiga-systeme.s"

    SECTION chip,DATA_C
copper:
    DC.W    $0100,$0200     ; no plane
    DC.W    $0180,$0F80     ; COLOR00: orange
    DC.W    $FFFF,$FFFE

;=== plan-exemple
START:
    BSR     prendre
    LEA     plan,A0
    MOVE.L  A0,D0           ; the address of the plane in the copper list
    LEA     cop_plans,A1
    MOVE.W  D0,6(A1)        ; BPL1PTL
    SWAP    D0
    MOVE.W  D0,2(A1)        ; BPL1PTH
    LEA     128*40(A0),A1   ; line 128
    MOVEQ   #9,D7           ; 10 long words = 40 bytes = the whole line
.ligne:
    MOVE.L  #$FFFFFFFF,(A1)+
    DBF     D7,.ligne
    MOVEQ   #0,D0           ; the diagonal: (0,0), (1,1)... (99,99)
.diagonale:
    MOVE.W  D0,D1           ; y = x
    MULU    #40,D1
    MOVE.W  D0,D2
    LSR.W   #3,D2
    ADD.W   D2,D1           ; the byte: y × 40 + x ÷ 8
    MOVE.W  D0,D3
    NOT.B   D3              ; the bit: 7 − (x mod 8)
    BSET    D3,0(A0,D1.W)
    ADDQ.W  #1,D0
    CMP.W   #100,D0
    BNE.S   .diagonale
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$8380,$96(A5)  ; DMAEN + BPLEN + COPEN
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS
    INCLUDE "amiga-systeme.s"

    SECTION chip,DATA_C
copper:
    DC.W    $008E,$2C81,$0090,$2CC1 ; DIWSTRT, DIWSTOP: the standard window
    DC.W    $0092,$0038,$0094,$00D0 ; DDFSTRT, DDFSTOP
    DC.W    $0102,$0000,$0104,$0024 ; BPLCON1, BPLCON2
    DC.W    $0108,$0000,$010A,$0000 ; modulos
    DC.W    $0180,$0000,$0182,$0FFF ; color 0 black, color 1 white
    DC.W    $0100,$1200             ; BPLCON0: 1 plane
cop_plans:
    DC.W    $00E0,0,$00E2,0         ; BPL1PTH, BPL1PTL: set by the program
    DC.W    $FFFF,$FFFE

    SECTION ecran,BSS_C
plan:   DS.B    40*256

;=== pixel-prediction
START:
    MOVE.W  #100,D0         ; x
    MOVE.W  #10,D1          ; y
    MULU    #40,D1
    MOVE.W  D0,D2
    LSR.W   #3,D2
    ADD.W   D2,D1           ; the byte
    MOVE.W  D0,D3
    NOT.B   D3
    AND.W   #7,D3           ; the bit number
    RTS

;=== un-plan-depart
START:
    BSR     prendre
    LEA     plan,A0
    MOVE.L  A0,D0
    LEA     cop_plans,A1
    MOVE.W  D0,6(A1)
    SWAP    D0
    MOVE.W  D0,2(A1)
    MOVE.L  #$FFFF0000,40*20(A0) ; 16 pixels set on line 20
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$8380,$96(A5)
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS
    INCLUDE "amiga-systeme.s"

    SECTION chip,DATA_C
copper:
    DC.W    $008E,$2C81,$0090,$2CC1,$0092,$0038,$0094,$00D0
    DC.W    $0102,$0000,$0104,$0024,$0108,$0000,$010A,$0000
    DC.W    $0180,$0000,$0182,$0FFF,$0184,$0F00,$0186,$00F0
    DC.W    $0100,$0200             ; <- BPLCON0: no plane declared
cop_plans:
    DC.W    $00E0,0,$00E2,0
    DC.W    $FFFF,$FFFE

    SECTION ecran,BSS_C
plan:   DS.B    40*256

;=== un-plan-solution
START:
    BSR     prendre
    LEA     plan,A0
    MOVE.L  A0,D0
    LEA     cop_plans,A1
    MOVE.W  D0,6(A1)
    SWAP    D0
    MOVE.W  D0,2(A1)
    MOVE.L  #$FFFF0000,40*20(A0) ; 16 pixels set on line 20
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$8380,$96(A5)
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS
    INCLUDE "amiga-systeme.s"

    SECTION chip,DATA_C
copper:
    DC.W    $008E,$2C81,$0090,$2CC1,$0092,$0038,$0094,$00D0
    DC.W    $0102,$0000,$0104,$0024,$0108,$0000,$010A,$0000
    DC.W    $0180,$0000,$0182,$0FFF,$0184,$0F00,$0186,$00F0
    DC.W    $0100,$1200             ; BPLCON0: 1 plane
cop_plans:
    DC.W    $00E0,0,$00E2,0
    DC.W    $FFFF,$FFFE

    SECTION ecran,BSS_C
plan:   DS.B    40*256

;=== ordonner-entete
; Put back in order the lines that set pixel (x, y) = (D0, D1) in the plane.
START:
    BSR     prendre
    LEA     plan,A0
    MOVE.L  A0,D0
    LEA     cop_plans,A1
    MOVE.W  D0,6(A1)
    SWAP    D0
    MOVE.W  D0,2(A1)
    MOVE.W  #203,D0         ; x
    MOVE.W  #50,D1          ; y

;=== ordonner-pied
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$8380,$96(A5)
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS
    INCLUDE "amiga-systeme.s"

    SECTION chip,DATA_C
copper:
    DC.W    $008E,$2C81,$0090,$2CC1,$0092,$0038,$0094,$00D0
    DC.W    $0102,$0000,$0104,$0024,$0108,$0000,$010A,$0000
    DC.W    $0180,$0000,$0182,$0FFF
    DC.W    $0100,$1200
cop_plans:
    DC.W    $00E0,0,$00E2,0
    DC.W    $FFFF,$FFFE

    SECTION ecran,BSS_C
plan:   DS.B    40*256

;=== horizontale-depart
; Draw a white line across the whole width of the screen, on line y = 100.
START:
    BSR     prendre
    LEA     plan,A0
    MOVE.L  A0,D0
    LEA     cop_plans,A1
    MOVE.W  D0,6(A1)
    SWAP    D0
    MOVE.W  D0,2(A1)

    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$8380,$96(A5)
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS
    INCLUDE "amiga-systeme.s"

    SECTION chip,DATA_C
copper:
    DC.W    $008E,$2C81,$0090,$2CC1,$0092,$0038,$0094,$00D0
    DC.W    $0102,$0000,$0104,$0024,$0108,$0000,$010A,$0000
    DC.W    $0180,$0000,$0182,$0FFF
    DC.W    $0100,$1200
cop_plans:
    DC.W    $00E0,0,$00E2,0
    DC.W    $FFFF,$FFFE

    SECTION ecran,BSS_C
plan:   DS.B    40*256

;=== horizontale-solution
START:
    BSR     prendre
    LEA     plan,A0
    MOVE.L  A0,D0
    LEA     cop_plans,A1
    MOVE.W  D0,6(A1)
    SWAP    D0
    MOVE.W  D0,2(A1)
    LEA     100*40(A0),A1   ; start of line 100
    MOVEQ   #39,D7          ; 40 bytes
.ligne:
    MOVE.B  #$FF,(A1)+
    DBF     D7,.ligne
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$8380,$96(A5)
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS
    INCLUDE "amiga-systeme.s"

    SECTION chip,DATA_C
copper:
    DC.W    $008E,$2C81,$0090,$2CC1,$0092,$0038,$0094,$00D0
    DC.W    $0102,$0000,$0104,$0024,$0108,$0000,$010A,$0000
    DC.W    $0180,$0000,$0182,$0FFF
    DC.W    $0100,$1200
cop_plans:
    DC.W    $00E0,0,$00E2,0
    DC.W    $FFFF,$FFFE

    SECTION ecran,BSS_C
plan:   DS.B    40*256

;=== diagonale-depart
; Draw the diagonal (0,0), (1,1)... (99,99): 100 white pixels.
START:
    BSR     prendre
    LEA     plan,A0
    MOVE.L  A0,D0
    LEA     cop_plans,A1
    MOVE.W  D0,6(A1)
    SWAP    D0
    MOVE.W  D0,2(A1)

    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$8380,$96(A5)
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS
    INCLUDE "amiga-systeme.s"

    SECTION chip,DATA_C
copper:
    DC.W    $008E,$2C81,$0090,$2CC1,$0092,$0038,$0094,$00D0
    DC.W    $0102,$0000,$0104,$0024,$0108,$0000,$010A,$0000
    DC.W    $0180,$0000,$0182,$0FFF
    DC.W    $0100,$1200
cop_plans:
    DC.W    $00E0,0,$00E2,0
    DC.W    $FFFF,$FFFE

    SECTION ecran,BSS_C
plan:   DS.B    40*256

;=== diagonale-solution
START:
    BSR     prendre
    LEA     plan,A0
    MOVE.L  A0,D0
    LEA     cop_plans,A1
    MOVE.W  D0,6(A1)
    SWAP    D0
    MOVE.W  D0,2(A1)
    MOVEQ   #0,D0           ; x = y = D0
.point:
    MOVE.W  D0,D1
    MULU    #40,D1
    MOVE.W  D0,D2
    LSR.W   #3,D2
    ADD.W   D2,D1
    MOVE.W  D0,D3
    NOT.B   D3
    BSET    D3,0(A0,D1.W)
    ADDQ.W  #1,D0
    CMP.W   #100,D0
    BNE.S   .point
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$8380,$96(A5)
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS
    INCLUDE "amiga-systeme.s"

    SECTION chip,DATA_C
copper:
    DC.W    $008E,$2C81,$0090,$2CC1,$0092,$0038,$0094,$00D0
    DC.W    $0102,$0000,$0104,$0024,$0108,$0000,$010A,$0000
    DC.W    $0180,$0000,$0182,$0FFF
    DC.W    $0100,$1200
cop_plans:
    DC.W    $00E0,0,$00E2,0
    DC.W    $FFFF,$FFFE

    SECTION ecran,BSS_C
plan:   DS.B    40*256

;=== bandes-exemple
START:
    BSR     prendre
    LEA     plan1,A0
    LEA     plan2,A1
    MOVE.L  A0,D0           ; the two pointers in the copper list
    LEA     cop_plans,A2
    MOVE.W  D0,6(A2)
    SWAP    D0
    MOVE.W  D0,2(A2)
    MOVE.L  A1,D0
    MOVE.W  D0,14(A2)
    SWAP    D0
    MOVE.W  D0,10(A2)
    MOVE.W  #255,D7         ; 256 lines
.ligne:
    MOVEQ   #9,D6           ; bytes 10 to 19 of plane 1: x = 80 to 159
.b1:
    MOVE.B  #$FF,10(A0,D6.W)
    MOVE.B  #$FF,30(A0,D6.W) ; bytes 30 to 39: x = 240 to 319
    DBF     D6,.b1
    MOVEQ   #19,D6          ; bytes 20 to 39 of plane 2: x = 160 to 319
.b2:
    MOVE.B  #$FF,20(A1,D6.W)
    DBF     D6,.b2
    LEA     40(A0),A0       ; next line in each plane
    LEA     40(A1),A1
    DBF     D7,.ligne
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$8380,$96(A5)
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS
    INCLUDE "amiga-systeme.s"

    SECTION chip,DATA_C
copper:
    DC.W    $008E,$2C81,$0090,$2CC1,$0092,$0038,$0094,$00D0
    DC.W    $0102,$0000,$0104,$0024,$0108,$0000,$010A,$0000
    DC.W    $0180,$0000,$0182,$0F00 ; colors 0 and 1: black, red
    DC.W    $0184,$00F0,$0186,$000F ; colors 2 and 3: green, blue
    DC.W    $0100,$2200             ; BPLCON0: 2 planes
cop_plans:
    DC.W    $00E0,0,$00E2,0         ; plane 1
    DC.W    $00E4,0,$00E6,0         ; plane 2
    DC.W    $FFFF,$FFFE

    SECTION ecran,BSS_C
plan1:  DS.B    40*256
plan2:  DS.B    40*256

;=== bandes-inverse-solution
START:
    BSR     prendre
    LEA     plan1,A0
    LEA     plan2,A1
    MOVE.L  A0,D0
    LEA     cop_plans,A2
    MOVE.W  D0,6(A2)
    SWAP    D0
    MOVE.W  D0,2(A2)
    MOVE.L  A1,D0
    MOVE.W  D0,14(A2)
    SWAP    D0
    MOVE.W  D0,10(A2)
    MOVE.W  #255,D7         ; 256 lines
.ligne:
    MOVEQ   #9,D6           ; plane 1: colors 3 and 1, bytes 0 to 9...
.b1:
    MOVE.B  #$FF,0(A0,D6.W)
    MOVE.B  #$FF,20(A0,D6.W) ; ... and bytes 20 to 29
    DBF     D6,.b1
    MOVEQ   #19,D6          ; plane 2: colors 3 and 2, bytes 0 to 19
.b2:
    MOVE.B  #$FF,0(A1,D6.W)
    DBF     D6,.b2
    LEA     40(A0),A0
    LEA     40(A1),A1
    DBF     D7,.ligne
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$8380,$96(A5)
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS
    INCLUDE "amiga-systeme.s"

    SECTION chip,DATA_C
copper:
    DC.W    $008E,$2C81,$0090,$2CC1,$0092,$0038,$0094,$00D0
    DC.W    $0102,$0000,$0104,$0024,$0108,$0000,$010A,$0000
    DC.W    $0180,$0000,$0182,$0F00 ; colors 0 and 1: black, red
    DC.W    $0184,$00F0,$0186,$000F ; colors 2 and 3: green, blue
    DC.W    $0100,$2200             ; BPLCON0: 2 planes
cop_plans:
    DC.W    $00E0,0,$00E2,0         ; plane 1
    DC.W    $00E4,0,$00E6,0         ; plane 2
    DC.W    $FFFF,$FFFE

    SECTION ecran,BSS_C
plan1:  DS.B    40*256
plan2:  DS.B    40*256

;=== couleur-prediction
START:
    MOVEQ   #0,D0
    BSET    #0,D0           ; the pixel has its bit set in plane 1...
    BSET    #2,D0           ; ... and in plane 3, not in plane 2
    MOVE.L  D0,D1
    ADD.L   D1,D1           ; 2 × n
    ADD.L   #$DFF180,D1     ; the address of its color register
    RTS

;=== carre2-depart
; 2-plane screen. Draw a 32 × 32 square in color 2 (green), top left corner
; at (64, 64).
START:
    BSR     prendre
    LEA     plan1,A0
    LEA     plan2,A1
    MOVE.L  A0,D0
    LEA     cop_plans,A2
    MOVE.W  D0,6(A2)
    SWAP    D0
    MOVE.W  D0,2(A2)
    MOVE.L  A1,D0
    MOVE.W  D0,14(A2)
    SWAP    D0
    MOVE.W  D0,10(A2)

    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$8380,$96(A5)
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS
    INCLUDE "amiga-systeme.s"

    SECTION chip,DATA_C
copper:
    DC.W    $008E,$2C81,$0090,$2CC1,$0092,$0038,$0094,$00D0
    DC.W    $0102,$0000,$0104,$0024,$0108,$0000,$010A,$0000
    DC.W    $0180,$0000,$0182,$0F00,$0184,$00F0,$0186,$000F
    DC.W    $0100,$2200
cop_plans:
    DC.W    $00E0,0,$00E2,0
    DC.W    $00E4,0,$00E6,0
    DC.W    $FFFF,$FFFE

    SECTION ecran,BSS_C
plan1:  DS.B    40*256
plan2:  DS.B    40*256

;=== carre2-solution
START:
    BSR     prendre
    LEA     plan1,A0
    LEA     plan2,A1
    MOVE.L  A0,D0
    LEA     cop_plans,A2
    MOVE.W  D0,6(A2)
    SWAP    D0
    MOVE.W  D0,2(A2)
    MOVE.L  A1,D0
    MOVE.W  D0,14(A2)
    SWAP    D0
    MOVE.W  D0,10(A2)
    LEA     64*40+64/8(A1),A2 ; color 2 = bit of plane 2 only
    MOVEQ   #31,D7          ; 32 lines
.ligne:
    MOVE.L  #$FFFFFFFF,(A2) ; 32 pixels
    LEA     40(A2),A2
    DBF     D7,.ligne
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$8380,$96(A5)
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS
    INCLUDE "amiga-systeme.s"

    SECTION chip,DATA_C
copper:
    DC.W    $008E,$2C81,$0090,$2CC1,$0092,$0038,$0094,$00D0
    DC.W    $0102,$0000,$0104,$0024,$0108,$0000,$010A,$0000
    DC.W    $0180,$0000,$0182,$0F00,$0184,$00F0,$0186,$000F
    DC.W    $0100,$2200
cop_plans:
    DC.W    $00E0,0,$00E2,0
    DC.W    $00E4,0,$00E6,0
    DC.W    $FFFF,$FFFE

    SECTION ecran,BSS_C
plan1:  DS.B    40*256
plan2:  DS.B    40*256

;=== carre3-depart
START:
    BSR     prendre
    LEA     plan1,A0
    LEA     plan2,A1
    MOVE.L  A0,D0
    LEA     cop_plans,A2
    MOVE.W  D0,6(A2)
    SWAP    D0
    MOVE.W  D0,2(A2)
    MOVE.L  A1,D0
    MOVE.W  D0,14(A2)
    SWAP    D0
    MOVE.W  D0,10(A2)
    LEA     40*40+16/8(A0),A2 ; a blue square (color 3) at (16, 40)
    MOVEQ   #15,D7
.ligne:
    MOVE.W  #$FFFF,(A2)
    LEA     40(A2),A2
    DBF     D7,.ligne
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$8380,$96(A5)
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS
    INCLUDE "amiga-systeme.s"

    SECTION chip,DATA_C
copper:
    DC.W    $008E,$2C81,$0090,$2CC1,$0092,$0038,$0094,$00D0
    DC.W    $0102,$0000,$0104,$0024,$0108,$0000,$010A,$0000
    DC.W    $0180,$0000,$0182,$0F00,$0184,$00F0,$0186,$000F
    DC.W    $0100,$2200
cop_plans:
    DC.W    $00E0,0,$00E2,0
    DC.W    $00E4,0,$00E6,0
    DC.W    $FFFF,$FFFE

    SECTION ecran,BSS_C
plan1:  DS.B    40*256
plan2:  DS.B    40*256

;=== carre3-solution
START:
    BSR     prendre
    LEA     plan1,A0
    LEA     plan2,A1
    MOVE.L  A0,D0
    LEA     cop_plans,A2
    MOVE.W  D0,6(A2)
    SWAP    D0
    MOVE.W  D0,2(A2)
    MOVE.L  A1,D0
    MOVE.W  D0,14(A2)
    SWAP    D0
    MOVE.W  D0,10(A2)
    LEA     40*40+16/8(A0),A2 ; a blue square (color 3) at (16, 40)
    LEA     40*40+16/8(A1),A3 ; color 3 = plane 1 AND plane 2
    MOVEQ   #15,D7
.ligne:
    MOVE.W  #$FFFF,(A2)
    MOVE.W  #$FFFF,(A3)
    LEA     40(A2),A2
    LEA     40(A3),A3
    DBF     D7,.ligne
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$8380,$96(A5)
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS
    INCLUDE "amiga-systeme.s"

    SECTION chip,DATA_C
copper:
    DC.W    $008E,$2C81,$0090,$2CC1,$0092,$0038,$0094,$00D0
    DC.W    $0102,$0000,$0104,$0024,$0108,$0000,$010A,$0000
    DC.W    $0180,$0000,$0182,$0F00,$0184,$00F0,$0186,$000F
    DC.W    $0100,$2200
cop_plans:
    DC.W    $00E0,0,$00E2,0
    DC.W    $00E4,0,$00E6,0
    DC.W    $FFFF,$FFFE

    SECTION ecran,BSS_C
plan1:  DS.B    40*256
plan2:  DS.B    40*256

;=== qcm-bplcon0
    MOVE.W  #$3200,$DFF100

;=== bonus-drapeau-depart
; The French flag over the whole screen: blue ($00F) from x = 0 to 105, white ($FFF) from 106 to 213,
; red ($F00) from 214 to 319. Two planes are enough.
START:
    BSR     prendre
    LEA     plan1,A0
    LEA     plan2,A1
    ; ... set the two pointers in the copper list, draw, start the Copper ...

    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS
    INCLUDE "amiga-systeme.s"

    SECTION chip,DATA_C
copper:
    DC.W    $008E,$2C81,$0090,$2CC1,$0092,$0038,$0094,$00D0
    DC.W    $0102,$0000,$0104,$0024,$0108,$0000,$010A,$0000
    DC.W    $0180,$0000,$0182,$000F,$0184,$0FFF,$0186,$0F00
    DC.W    $0100,$2200
cop_plans:
    DC.W    $00E0,0,$00E2,0
    DC.W    $00E4,0,$00E6,0
    DC.W    $FFFF,$FFFE

    SECTION ecran,BSS_C
plan1:  DS.B    40*256
plan2:  DS.B    40*256

;=== bonus-drapeau-solution
START:
    BSR     prendre
    LEA     plan1,A0
    LEA     plan2,A1
    MOVE.L  A0,D0
    LEA     cop_plans,A2
    MOVE.W  D0,6(A2)
    SWAP    D0
    MOVE.W  D0,2(A2)
    MOVE.L  A1,D0
    MOVE.W  D0,14(A2)
    SWAP    D0
    MOVE.W  D0,10(A2)
    MOVE.W  #255,D7         ; 256 identical lines
.ligne:
    LEA     type1(PC),A2    ; the model line of each plane
    LEA     type2(PC),A3
    MOVEQ   #39,D6
.octet:
    MOVE.B  (A2)+,(A0)+
    MOVE.B  (A3)+,(A1)+
    DBF     D6,.octet
    DBF     D7,.ligne
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$8380,$96(A5)
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS
; One line of the flag, byte by byte. Blue (color 1) = plane 1; white (2) = plane 2;
; red (3) = both. The boundaries x = 106 and x = 214 fall in the middle of bytes 13 and 26.
type1:  DCB.B   13,$FF          ; x = 0 to 103: blue
        DC.B    $C0             ; x = 104, 105: blue; 106 to 111: white
        DCB.B   12,$00          ; x = 112 to 207: white
        DC.B    $03             ; x = 208 to 213: white; 214, 215: red
        DCB.B   13,$FF          ; x = 216 to 319: red
type2:  DCB.B   13,$00
        DC.B    $3F
        DCB.B   12,$FF
        DC.B    $FF
        DCB.B   13,$FF
    INCLUDE "amiga-systeme.s"

    SECTION chip,DATA_C
copper:
    DC.W    $008E,$2C81,$0090,$2CC1,$0092,$0038,$0094,$00D0
    DC.W    $0102,$0000,$0104,$0024,$0108,$0000,$010A,$0000
    DC.W    $0180,$0000,$0182,$000F,$0184,$0FFF,$0186,$0F00
    DC.W    $0100,$2200
cop_plans:
    DC.W    $00E0,0,$00E2,0
    DC.W    $00E4,0,$00E6,0
    DC.W    $FFFF,$FFFE

    SECTION ecran,BSS_C
plan1:  DS.B    40*256
plan2:  DS.B    40*256

;=== rappel
START:
    MOVEA.L 4.W,A6
    MOVE.L  #400,D0
    MOVE.L  #$10002,D1      ; MEMF_CHIP + MEMF_CLEAR
    JSR     -198(A6)        ; AllocMem
    TST.L   D0
    BEQ.S   .fin
    MOVE.L  D0,D7           ; the address of the block
    MOVEA.L D0,A0
    MOVE.W  #99,D2
.remplir:
    MOVE.L  #$12345678,(A0)+
    DBRA    D2,.remplir
    MOVE.L  A0,D6
    SUB.L   D7,D6           ; the number of bytes written
    MOVEA.L D7,A1
    MOVE.L  #400,D0
    JSR     -210(A6)        ; FreeMem
.fin:
    MOVEQ   #0,D0
    RTS
