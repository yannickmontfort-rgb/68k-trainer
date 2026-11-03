; Code for chapter 7, "The Blitter". The programs include content/fichiers/amiga-systeme.s.

;=== copie-exemple
START:
    BSR     prendre
    BSR     ecran           ; the one-plane screen (at the bottom of the program) is displayed
    BSR     attendre_blitter ; is the Blitter free?
    MOVE.L  #$01000000,$40(A5)  ; BLTCON0 = $0100: channel D only, minterm 0; BLTCON1 = 0
    MOVE.L  #plan,$54(A5)   ; BLTDPT: the start of the plane
    MOVE.W  #0,$66(A5)      ; BLTDMOD: clear everything, skipping nothing
    MOVE.W  #(256<<6)|20,$58(A5) ; BLTSIZE: 256 lines of 20 words. Off it goes.
    BSR     attendre_blitter
    MOVE.L  #$09F00000,$40(A5)  ; BLTCON0 = $09F0: channels A and D, D = A; BLTCON1 = 0
    MOVE.L  #-1,$44(A5)     ; BLTAFWM = BLTALWM = $FFFF: nothing masked
    MOVE.L  #bloc,$50(A5)   ; BLTAPT: the source, the block
    MOVE.L  #plan+100*40+64/8,$54(A5) ; BLTDPT: (64, 100) in the plane
    MOVE.W  #0,$64(A5)      ; BLTAMOD: the block is in one piece
    MOVE.W  #40-4,$66(A5) ; BLTDMOD: 40 - 4 bytes to skip at each line of the screen
    MOVE.W  #(16<<6)|2,$58(A5) ; BLTSIZE: 16 lines of 2 words, and off it goes
    BSR     attendre_blitter
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS

; Displays the plane (320 x 256, white on black) and turns on the Blitter's DMA
ecran:
    MOVE.L  #plan,D0
    MOVE.W  D0,cop_plans+6
    SWAP    D0
    MOVE.W  D0,cop_plans+2
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$83C0,$96(A5)  ; DMAEN + BPLEN + COPEN + BLTEN
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

; A solid 32 x 16 block (2 words per line)
bloc:   DCB.L   16,$FFFFFFFF

    SECTION ecran,BSS_C
plan:   DS.B    40*256

;=== bltsize-prediction
START:
    MOVE.W  #20,D0          ; 20 lines
    LSL.W   #6,D0           ; into bits 15-6
    OR.W    #4,D0           ; 4 words wide (64 pixels)
    MOVEQ   #0,D1
    MOVE.W  #40,D1          ; a screen with 40 bytes per line...
    SUB.W   #4*2,D1         ; ... minus the 8 bytes of the block
    RTS

;=== modulo-depart
START:
    BSR     prendre
    BSR     ecran           ; the one-plane screen (at the bottom of the program) is displayed
    BSR     attendre_blitter
    MOVE.L  #$09F00000,$40(A5)  ; BLTCON0 = $09F0: channels A and D, D = A; BLTCON1 = 0
    MOVE.L  #-1,$44(A5)     ; BLTAFWM = BLTALWM = $FFFF: nothing masked
    MOVE.L  #bloc,$50(A5)   ; BLTAPT: the source, the block
    MOVE.L  #plan+100*40+64/8,$54(A5) ; BLTDPT: (64, 100) in the plane
    MOVE.W  #0,$64(A5)      ; BLTAMOD: the block is in one piece
    MOVE.W  #0,$66(A5) ; BLTDMOD       ; <- the screen's modulo
    MOVE.W  #(16<<6)|2,$58(A5) ; BLTSIZE: 16 lines of 2 words, and off it goes
    BSR     attendre_blitter
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS

; Displays the plane (320 x 256, white on black) and turns on the Blitter's DMA
ecran:
    MOVE.L  #plan,D0
    MOVE.W  D0,cop_plans+6
    SWAP    D0
    MOVE.W  D0,cop_plans+2
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$83C0,$96(A5)  ; DMAEN + BPLEN + COPEN + BLTEN
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

; A solid 32 x 16 block (2 words per line)
bloc:   DCB.L   16,$FFFFFFFF

    SECTION ecran,BSS_C
plan:   DS.B    40*256

;=== modulo-solution
START:
    BSR     prendre
    BSR     ecran           ; the one-plane screen (at the bottom of the program) is displayed
    BSR     attendre_blitter
    MOVE.L  #$09F00000,$40(A5)  ; BLTCON0 = $09F0: channels A and D, D = A; BLTCON1 = 0
    MOVE.L  #-1,$44(A5)     ; BLTAFWM = BLTALWM = $FFFF: nothing masked
    MOVE.L  #bloc,$50(A5)   ; BLTAPT: the source, the block
    MOVE.L  #plan+100*40+64/8,$54(A5) ; BLTDPT: (64, 100) in the plane
    MOVE.W  #0,$64(A5)      ; BLTAMOD: the block is in one piece
    MOVE.W  #40-4,$66(A5) ; BLTDMOD: 40 - 4 bytes to skip
    MOVE.W  #(16<<6)|2,$58(A5) ; BLTSIZE: 16 lines of 2 words, and off it goes
    BSR     attendre_blitter
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS

; Displays the plane (320 x 256, white on black) and turns on the Blitter's DMA
ecran:
    MOVE.L  #plan,D0
    MOVE.W  D0,cop_plans+6
    SWAP    D0
    MOVE.W  D0,cop_plans+2
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$83C0,$96(A5)  ; DMAEN + BPLEN + COPEN + BLTEN
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

; A solid 32 x 16 block (2 words per line)
bloc:   DCB.L   16,$FFFFFFFF

    SECTION ecran,BSS_C
plan:   DS.B    40*256

;=== presse-depart
START:
    BSR     prendre
    BSR     ecran           ; the one-plane screen (at the bottom of the program) is displayed
    MOVE.L  #$01000000,$40(A5)  ; clear the whole plane
    MOVE.L  #plan,$54(A5)
    MOVE.W  #0,$66(A5)
    MOVE.W  #(256<<6)|20,$58(A5)
    MOVE.L  #$09F00000,$40(A5)  ; then copy the block
    MOVE.L  #-1,$44(A5)
    MOVE.L  #bloc,$50(A5)
    MOVE.L  #plan+40*40+128/8,$54(A5)
    MOVE.W  #0,$64(A5)
    MOVE.W  #36,$66(A5)
    MOVE.W  #(16<<6)|2,$58(A5)
    BSR     attendre_blitter
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS

; Displays the plane (320 x 256, white on black) and turns on the Blitter's DMA
ecran:
    MOVE.L  #plan,D0
    MOVE.W  D0,cop_plans+6
    SWAP    D0
    MOVE.W  D0,cop_plans+2
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$83C0,$96(A5)  ; DMAEN + BPLEN + COPEN + BLTEN
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

; A solid 32 x 16 block (2 words per line)
bloc:   DCB.L   16,$FFFFFFFF

    SECTION ecran,BSS_C
plan:   DS.B    40*256

;=== presse-solution
START:
    BSR     prendre
    BSR     ecran           ; the one-plane screen (at the bottom of the program) is displayed
    MOVE.L  #$01000000,$40(A5)  ; clear the whole plane
    MOVE.L  #plan,$54(A5)
    MOVE.W  #0,$66(A5)
    MOVE.W  #(256<<6)|20,$58(A5)
    BSR     attendre_blitter ; the Blitter must have finished clearing
    MOVE.L  #$09F00000,$40(A5)  ; then copy the block
    MOVE.L  #-1,$44(A5)
    MOVE.L  #bloc,$50(A5)
    MOVE.L  #plan+40*40+128/8,$54(A5)
    MOVE.W  #0,$64(A5)
    MOVE.W  #36,$66(A5)
    MOVE.W  #(16<<6)|2,$58(A5)
    BSR     attendre_blitter
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS

; Displays the plane (320 x 256, white on black) and turns on the Blitter's DMA
ecran:
    MOVE.L  #plan,D0
    MOVE.W  D0,cop_plans+6
    SWAP    D0
    MOVE.W  D0,cop_plans+2
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$83C0,$96(A5)  ; DMAEN + BPLEN + COPEN + BLTEN
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

; A solid 32 x 16 block (2 words per line)
bloc:   DCB.L   16,$FFFFFFFF

    SECTION ecran,BSS_C
plan:   DS.B    40*256

;=== effacer-depart
; The background is white. With the Blitter, clear the rectangle x = 32 to 95, y = 50 to 99.
START:
    BSR     prendre
    BSR     ecran           ; the one-plane screen (at the bottom of the program) is displayed
    LEA     plan,A0         ; the background: the whole plane at 1 (white)
    MOVE.W  #40*256/4-1,D7
.fond:
    MOVE.L  #$FFFFFFFF,(A0)+
    DBF     D7,.fond
    ; Clears (color 0) the rectangle x = 32 to 95, y = 50 to 99, with the Blitter

    BSR     attendre_blitter
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS

; Displays the plane (320 x 256, white on black) and turns on the Blitter's DMA
ecran:
    MOVE.L  #plan,D0
    MOVE.W  D0,cop_plans+6
    SWAP    D0
    MOVE.W  D0,cop_plans+2
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$83C0,$96(A5)  ; DMAEN + BPLEN + COPEN + BLTEN
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

;=== effacer-solution
START:
    BSR     prendre
    BSR     ecran           ; the one-plane screen (at the bottom of the program) is displayed
    LEA     plan,A0         ; the background: the whole plane at 1 (white)
    MOVE.W  #40*256/4-1,D7
.fond:
    MOVE.L  #$FFFFFFFF,(A0)+
    DBF     D7,.fond
    BSR     attendre_blitter
    MOVE.L  #$01000000,$40(A5)  ; channel D only, minterm 0
    MOVE.L  #plan+50*40+32/8,$54(A5) ; the corner (32, 50)
    MOVE.W  #40-8,$66(A5)   ; 64 pixels = 8 bytes per line, 32 to skip
    MOVE.W  #(50<<6)|4,$58(A5) ; 50 lines of 4 words
    BSR     attendre_blitter
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS

; Displays the plane (320 x 256, white on black) and turns on the Blitter's DMA
ecran:
    MOVE.L  #plan,D0
    MOVE.W  D0,cop_plans+6
    SWAP    D0
    MOVE.W  D0,cop_plans+2
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$83C0,$96(A5)  ; DMAEN + BPLEN + COPEN + BLTEN
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

;=== ou-exemple
START:
    BSR     prendre
    BSR     ecran           ; the one-plane screen (at the bottom of the program) is displayed
    LEA     plan,A0         ; the background: vertical stripes (4 pixels out of 8)
    MOVE.W  #40*256/4-1,D7
.fond:
    MOVE.L  #$0F0F0F0F,(A0)+
    DBF     D7,.fond
    BSR     attendre_blitter
    MOVE.L  #$0BFA0000,$40(A5)  ; BLTCON0 = $0BFA: channels A, C, D; D = A OR C
    MOVE.L  #-1,$44(A5)
    MOVE.L  #bloc,$50(A5)   ; A: the block
    MOVE.L  #plan+100*40+64/8,D0
    MOVE.L  D0,$48(A5)      ; C: the background, where the block is put
    MOVE.L  D0,$54(A5)      ; D: at the same place
    MOVE.W  #0,$64(A5)      ; BLTAMOD
    MOVE.W  #36,$60(A5)     ; BLTCMOD
    MOVE.W  #36,$66(A5)     ; BLTDMOD: C and D go through the screen together
    MOVE.W  #(16<<6)|2,$58(A5)
    BSR     attendre_blitter
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS

; Displays the plane (320 x 256, white on black) and turns on the Blitter's DMA
ecran:
    MOVE.L  #plan,D0
    MOVE.W  D0,cop_plans+6
    SWAP    D0
    MOVE.W  D0,cop_plans+2
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$83C0,$96(A5)  ; DMAEN + BPLEN + COPEN + BLTEN
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

; A 32 x 16 drawing: a frame (solid edge, empty inside)
bloc:   DC.L    $FFFFFFFF
        DCB.L   14,$80000001
        DC.L    $FFFFFFFF

    SECTION ecran,BSS_C
plan:   DS.B    40*256

;=== minterm-prediction
START:
    MOVE.B  #$F0,D0         ; A
    EOR.B   #$AA,D0         ; A EOR C
    MOVE.B  #$F0,D1         ; A
    AND.B   #$CC,D1         ; A AND B
    MOVE.B  #$F0,D2
    NOT.B   D2              ; NOT A
    AND.B   #$AA,D2         ; NOT A AND C
    OR.B    D2,D1           ; (A AND B) OR (NOT A AND C)
    RTS

;=== inverser-depart
; With the Blitter, invert the area x = 64 to 127, y = 64 to 95 (on the striped background).
START:
    BSR     prendre
    BSR     ecran           ; the one-plane screen (at the bottom of the program) is displayed
    LEA     plan,A0         ; the background: vertical stripes (4 pixels out of 8)
    MOVE.W  #40*256/4-1,D7
.fond:
    MOVE.L  #$0F0F0F0F,(A0)+
    DBF     D7,.fond
    BSR     attendre_blitter
    MOVE.L  #$03000000,$40(A5) ; BLTCON0: channels C and D, and the minterm   ; <- D = NOT C
    MOVE.L  #plan+64*40+64/8,D0
    MOVE.L  D0,$48(A5)      ; C: the area
    MOVE.L  D0,$54(A5)      ; D: the same area
    MOVE.W  #40-8,$60(A5)
    MOVE.W  #40-8,$66(A5)
    MOVE.W  #(32<<6)|4,$58(A5) ; 64 x 32 pixels
    BSR     attendre_blitter
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS

; Displays the plane (320 x 256, white on black) and turns on the Blitter's DMA
ecran:
    MOVE.L  #plan,D0
    MOVE.W  D0,cop_plans+6
    SWAP    D0
    MOVE.W  D0,cop_plans+2
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$83C0,$96(A5)  ; DMAEN + BPLEN + COPEN + BLTEN
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

;=== inverser-solution
START:
    BSR     prendre
    BSR     ecran           ; the one-plane screen (at the bottom of the program) is displayed
    LEA     plan,A0         ; the background: vertical stripes (4 pixels out of 8)
    MOVE.W  #40*256/4-1,D7
.fond:
    MOVE.L  #$0F0F0F0F,(A0)+
    DBF     D7,.fond
    BSR     attendre_blitter
    MOVE.L  #$03550000,$40(A5) ; BLTCON0: channels C and D, and the minterm: $55 = NOT $AA
    MOVE.L  #plan+64*40+64/8,D0
    MOVE.L  D0,$48(A5)      ; C: the area
    MOVE.L  D0,$54(A5)      ; D: the same area
    MOVE.W  #40-8,$60(A5)
    MOVE.W  #40-8,$66(A5)
    MOVE.W  #(32<<6)|4,$58(A5) ; 64 x 32 pixels
    BSR     attendre_blitter
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS

; Displays the plane (320 x 256, white on black) and turns on the Blitter's DMA
ecran:
    MOVE.L  #plan,D0
    MOVE.W  D0,cop_plans+6
    SWAP    D0
    MOVE.W  D0,cop_plans+2
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$83C0,$96(A5)  ; DMAEN + BPLEN + COPEN + BLTEN
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

;=== cookie-depart
; The "cookie-cut": A = the mask, B = the drawing, C = the background, D = the background.
START:
    BSR     prendre
    BSR     ecran           ; the one-plane screen (at the bottom of the program) is displayed
    LEA     plan,A0         ; the background: vertical stripes (4 pixels out of 8)
    MOVE.W  #40*256/4-1,D7
.fond:
    MOVE.L  #$0F0F0F0F,(A0)+
    DBF     D7,.fond
    ; Put the drawing at (64, 80) with its mask, without damaging the stripes around it.

    BSR     attendre_blitter
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS

; Displays the plane (320 x 256, white on black) and turns on the Blitter's DMA
ecran:
    MOVE.L  #plan,D0
    MOVE.W  D0,cop_plans+6
    SWAP    D0
    MOVE.W  D0,cop_plans+2
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$83C0,$96(A5)  ; DMAEN + BPLEN + COPEN + BLTEN
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

; The mask (A): a 16 x 16 square. The drawing (B): left half white, right half black.
masque: DCB.W   16,$FFFF
dessin: DCB.W   16,$FF00

    SECTION ecran,BSS_C
plan:   DS.B    40*256

;=== cookie-solution
START:
    BSR     prendre
    BSR     ecran           ; the one-plane screen (at the bottom of the program) is displayed
    LEA     plan,A0         ; the background: vertical stripes (4 pixels out of 8)
    MOVE.W  #40*256/4-1,D7
.fond:
    MOVE.L  #$0F0F0F0F,(A0)+
    DBF     D7,.fond
    BSR     attendre_blitter
    MOVE.L  #$0FCA0000,$40(A5)  ; the 4 channels; D = (A AND B) OR (NOT A AND C)
    MOVE.L  #-1,$44(A5)
    MOVE.L  #masque,$50(A5) ; A: the mask
    MOVE.L  #dessin,$4C(A5) ; B: the drawing
    MOVE.L  #plan+80*40+64/8,D0
    MOVE.L  D0,$48(A5)      ; C: the background
    MOVE.L  D0,$54(A5)      ; D: the same place
    MOVE.W  #0,$64(A5)      ; A and B: in one piece
    MOVE.W  #0,$62(A5)
    MOVE.W  #38,$60(A5)     ; C and D: 40 - 2 bytes
    MOVE.W  #38,$66(A5)
    MOVE.W  #(16<<6)|1,$58(A5) ; 16 lines of one word
    BSR     attendre_blitter
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS

; Displays the plane (320 x 256, white on black) and turns on the Blitter's DMA
ecran:
    MOVE.L  #plan,D0
    MOVE.W  D0,cop_plans+6
    SWAP    D0
    MOVE.W  D0,cop_plans+2
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$83C0,$96(A5)  ; DMAEN + BPLEN + COPEN + BLTEN
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

; The mask (A): a 16 x 16 square. The drawing (B): left half white, right half black.
masque: DCB.W   16,$FFFF
dessin: DCB.W   16,$FF00

    SECTION ecran,BSS_C
plan:   DS.B    40*256

;=== decalage-exemple
START:
    BSR     prendre
    BSR     ecran           ; the one-plane screen (at the bottom of the program) is displayed
    BSR     attendre_blitter
    MOVE.W  #37,D0         ; x
    MOVE.W  D0,D1
    AND.W   #15,D1          ; the shift: x mod 16
    ROR.W   #4,D1           ; into bits 15-12
    OR.W    #$09F0,D1       ; channels A and D, D = A
    MOVE.W  D1,$40(A5)      ; BLTCON0
    MOVE.W  #0,$42(A5)      ; BLTCON1
    MOVE.W  #$FFFF,$44(A5)  ; BLTAFWM
    MOVE.W  #$0000,$46(A5)  ; BLTALWM: the extra word is emptied
    MOVE.L  #carre,$50(A5)
    LSR.W   #4,D0           ; x / 16: the word number...
    ADD.W   D0,D0           ; ... in bytes
    LEA     plan+60*40,A0
    ADDA.W  D0,A0
    MOVE.L  A0,$54(A5)
    MOVE.W  #-2,$64(A5)     ; BLTAMOD: one word too many was read
    MOVE.W  #40-4,$66(A5)   ; BLTDMOD: 2 words per line
    MOVE.W  #(16<<6)|2,$58(A5)
    BSR     attendre_blitter
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS

; Displays the plane (320 x 256, white on black) and turns on the Blitter's DMA
ecran:
    MOVE.L  #plan,D0
    MOVE.W  D0,cop_plans+6
    SWAP    D0
    MOVE.W  D0,cop_plans+2
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$83C0,$96(A5)  ; DMAEN + BPLEN + COPEN + BLTEN
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

; A solid 16 x 16 square (1 word per line)
carre:  DCB.W   16,$FFFF

    SECTION ecran,BSS_C
plan:   DS.B    40*256

;=== decalage-prediction
START:
    MOVE.W  #100,D0         ; x
    MOVE.W  D0,D1
    AND.W   #15,D1          ; the shift
    MOVE.W  D0,D2
    LSR.W   #4,D2
    ADD.W   D2,D2           ; the byte of the first word
    MOVE.W  D1,D3
    ROR.W   #4,D3
    OR.W    #$09F0,D3       ; BLTCON0
    RTS

;=== ash-depart
; Put the 16 x 16 square at x = 70, y = 100.
START:
    BSR     prendre
    BSR     ecran           ; the one-plane screen (at the bottom of the program) is displayed
    BSR     attendre_blitter
    MOVE.W  #$09F0,$40(A5)  ; <- BLTCON0: the shift of A is missing
    MOVE.W  #0,$42(A5)
    MOVE.W  #$FFFF,$44(A5)
    MOVE.W  #$0000,$46(A5)
    MOVE.L  #carre,$50(A5)
    MOVE.L  #plan+100*40+64/8,$54(A5) ; the word that contains x = 70
    MOVE.W  #-2,$64(A5)
    MOVE.W  #40-4,$66(A5)
    MOVE.W  #(16<<6)|2,$58(A5)
    BSR     attendre_blitter
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS

; Displays the plane (320 x 256, white on black) and turns on the Blitter's DMA
ecran:
    MOVE.L  #plan,D0
    MOVE.W  D0,cop_plans+6
    SWAP    D0
    MOVE.W  D0,cop_plans+2
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$83C0,$96(A5)  ; DMAEN + BPLEN + COPEN + BLTEN
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

; A solid 16 x 16 square (1 word per line)
carre:  DCB.W   16,$FFFF

    SECTION ecran,BSS_C
plan:   DS.B    40*256

;=== ash-solution
START:
    BSR     prendre
    BSR     ecran           ; the one-plane screen (at the bottom of the program) is displayed
    BSR     attendre_blitter
    MOVE.W  #$69F0,$40(A5)  ; BLTCON0: shift 70 mod 16 = 6
    MOVE.W  #0,$42(A5)
    MOVE.W  #$FFFF,$44(A5)
    MOVE.W  #$0000,$46(A5)
    MOVE.L  #carre,$50(A5)
    MOVE.L  #plan+100*40+64/8,$54(A5) ; the word that contains x = 70
    MOVE.W  #-2,$64(A5)
    MOVE.W  #40-4,$66(A5)
    MOVE.W  #(16<<6)|2,$58(A5)
    BSR     attendre_blitter
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS

; Displays the plane (320 x 256, white on black) and turns on the Blitter's DMA
ecran:
    MOVE.L  #plan,D0
    MOVE.W  D0,cop_plans+6
    SWAP    D0
    MOVE.W  D0,cop_plans+2
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$83C0,$96(A5)  ; DMAEN + BPLEN + COPEN + BLTEN
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

; A solid 16 x 16 square (1 word per line)
carre:  DCB.W   16,$FFFF

    SECTION ecran,BSS_C
plan:   DS.B    40*256

;=== nimporte-depart
; With the Blitter, put the 16 x 16 square (label carre) at x = 123, y = 40.
START:
    BSR     prendre
    BSR     ecran           ; the one-plane screen (at the bottom of the program) is displayed
    ; Puts the square at x = 123, y = 40

    BSR     attendre_blitter
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS

; Displays the plane (320 x 256, white on black) and turns on the Blitter's DMA
ecran:
    MOVE.L  #plan,D0
    MOVE.W  D0,cop_plans+6
    SWAP    D0
    MOVE.W  D0,cop_plans+2
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$83C0,$96(A5)  ; DMAEN + BPLEN + COPEN + BLTEN
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

; A solid 16 x 16 square (1 word per line)
carre:  DCB.W   16,$FFFF

    SECTION ecran,BSS_C
plan:   DS.B    40*256

;=== nimporte-solution
START:
    BSR     prendre
    BSR     ecran           ; the one-plane screen (at the bottom of the program) is displayed
    BSR     attendre_blitter
    MOVE.W  #123,D0         ; x
    MOVE.W  D0,D1
    AND.W   #15,D1          ; the shift: x mod 16
    ROR.W   #4,D1           ; into bits 15-12
    OR.W    #$09F0,D1       ; channels A and D, D = A
    MOVE.W  D1,$40(A5)      ; BLTCON0
    MOVE.W  #0,$42(A5)      ; BLTCON1
    MOVE.W  #$FFFF,$44(A5)  ; BLTAFWM
    MOVE.W  #$0000,$46(A5)  ; BLTALWM: the extra word is emptied
    MOVE.L  #carre,$50(A5)
    LSR.W   #4,D0           ; x / 16: the word number...
    ADD.W   D0,D0           ; ... in bytes
    LEA     plan+40*40,A0
    ADDA.W  D0,A0
    MOVE.L  A0,$54(A5)
    MOVE.W  #-2,$64(A5)     ; BLTAMOD: one word too many was read
    MOVE.W  #40-4,$66(A5)   ; BLTDMOD: 2 words per line
    MOVE.W  #(16<<6)|2,$58(A5)
    BSR     attendre_blitter
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS

; Displays the plane (320 x 256, white on black) and turns on the Blitter's DMA
ecran:
    MOVE.L  #plan,D0
    MOVE.W  D0,cop_plans+6
    SWAP    D0
    MOVE.W  D0,cop_plans+2
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$83C0,$96(A5)  ; DMAEN + BPLEN + COPEN + BLTEN
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

; A solid 16 x 16 square (1 word per line)
carre:  DCB.W   16,$FFFF

    SECTION ecran,BSS_C
plan:   DS.B    40*256

;=== lignes-exemple
START:
    BSR     prendre
    BSR     ecran           ; the one-plane screen (at the bottom of the program) is displayed
    MOVE.W  #160,D0         ; a star: 8 lines from the center (160, 128)
    MOVE.W  #128,D1
    MOVE.W  #300,D2
    MOVE.W  #128,D3
    BSR     ligne
    MOVE.W  #160,D0
    MOVE.W  #128,D1
    MOVE.W  #260,D2
    MOVE.W  #28,D3
    BSR     ligne
    MOVE.W  #160,D0
    MOVE.W  #128,D1
    MOVE.W  #160,D2
    MOVE.W  #8,D3
    BSR     ligne
    MOVE.W  #160,D0
    MOVE.W  #128,D1
    MOVE.W  #60,D2
    MOVE.W  #40,D3
    BSR     ligne
    MOVE.W  #160,D0
    MOVE.W  #128,D1
    MOVE.W  #20,D2
    MOVE.W  #140,D3
    BSR     ligne
    MOVE.W  #160,D0
    MOVE.W  #128,D1
    MOVE.W  #90,D2
    MOVE.W  #250,D3
    BSR     ligne
    MOVE.W  #160,D0
    MOVE.W  #128,D1
    MOVE.W  #170,D2
    MOVE.W  #250,D3
    BSR     ligne
    MOVE.W  #160,D0
    MOVE.W  #128,D1
    MOVE.W  #290,D2
    MOVE.W  #200,D3
    BSR     ligne
    BSR     attendre_blitter
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS

; Displays the plane (320 x 256, white on black) and turns on the Blitter's DMA
ecran:
    MOVE.L  #plan,D0
    MOVE.W  D0,cop_plans+6
    SWAP    D0
    MOVE.W  D0,cop_plans+2
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$83C0,$96(A5)  ; DMAEN + BPLEN + COPEN + BLTEN
    RTS

; Draws a line from (D0,D1) to (D2,D3) in the plane (40 bytes per line). Changes D0-D6 and A0.
ligne:
    LEA     plan,A0
    MOVEQ   #0,D4           ; the octant, bit by bit
    SUB.W   D0,D2           ; dx = x2 - x1
    BPL.S   .dx
    NEG.W   D2
    MOVEQ   #1,D5           ; to the left
    BRA.S   .y
.dx:
    MOVEQ   #0,D5           ; to the right
.y:
    SUB.W   D1,D3           ; dy = y2 - y1
    BPL.S   .dy
    NEG.W   D3
    MOVEQ   #1,D6           ; upward
    BRA.S   .octant
.dy:
    MOVEQ   #0,D6           ; downward
.octant:
    CMP.W   D3,D2
    BLT.S   .vertical
    BSET    #4,D4           ; wider than tall: SUD, the "sometimes" step is vertical
    TST.W   D6
    BEQ.S   .h1
    BSET    #3,D4           ; SUL: this step goes up
.h1:
    TST.W   D5
    BEQ.S   .calcul
    BSET    #2,D4           ; AUL: the "always" step goes to the left
    BRA.S   .calcul
.vertical:
    TST.W   D5
    BEQ.S   .v1
    BSET    #3,D4           ; SUL: the "sometimes" step (horizontal) goes to the left
.v1:
    TST.W   D6
    BEQ.S   .v2
    BSET    #2,D4           ; AUL: the "always" step (vertical) goes up
.v2:
    EXG     D2,D3           ; D2 = dmax, D3 = dmin
.calcul:
    MULU    #40,D1          ; the address of the starting word
    ADDA.L  D1,A0
    MOVE.W  D0,D1
    LSR.W   #3,D1
    AND.W   #$FFFE,D1
    ADDA.W  D1,A0
    AND.W   #15,D0          ; the starting bit in this word...
    ROR.W   #4,D0           ; ... into bits 15-12 of BLTCON0
    OR.W    #$0BCA,D0       ; channels A, C, D; minterm $CA
    LSL.W   #2,D3           ; 4 dmin
    ADD.W   D2,D2           ; 2 dmax
    MOVE.W  D3,D5
    SUB.W   D2,D5           ; 4 dmin - 2 dmax
    BPL.S   .signe
    BSET    #6,D4           ; SIGN
.signe:
    MOVE.W  D3,D6
    SUB.W   D2,D6
    SUB.W   D2,D6           ; 4 dmin - 4 dmax
    BSET    #0,D4           ; LINE: line mode
    LSR.W   #1,D2
    ADDQ.W  #1,D2           ; dmax + 1 points
    LSL.W   #6,D2
    ADDQ.W  #2,D2           ; BLTSIZE
    BSR     attendre_blitter
    MOVE.W  D0,$40(A5)      ; BLTCON0
    MOVE.W  D4,$42(A5)      ; BLTCON1
    MOVE.L  #-1,$44(A5)     ; BLTAFWM, BLTALWM
    MOVE.W  #$8000,$74(A5)  ; BLTADAT: one point
    MOVE.W  #$FFFF,$72(A5)  ; BLTBDAT: solid line
    MOVE.W  D3,$62(A5)      ; BLTBMOD = 4 dmin
    MOVE.W  D6,$64(A5)      ; BLTAMOD = 4 (dmin - dmax)
    MOVE.W  D5,$52(A5)      ; BLTAPTL = 4 dmin - 2 dmax
    MOVE.W  #40,$60(A5)     ; BLTCMOD
    MOVE.W  #40,$66(A5)     ; BLTDMOD
    MOVE.L  A0,$48(A5)      ; BLTCPT
    MOVE.L  A0,$54(A5)      ; BLTDPT
    MOVE.W  D2,$58(A5)      ; BLTSIZE: off it goes
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

;=== carre-lignes-depart
; Draw the outline of the square with corners (50, 50) and (150, 150) using the routine ligne.
START:
    BSR     prendre
    BSR     ecran           ; the one-plane screen (at the bottom of the program) is displayed
    ; The outline of the square (50, 50) - (150, 150): four calls to ligne

    BSR     attendre_blitter
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS

; Displays the plane (320 x 256, white on black) and turns on the Blitter's DMA
ecran:
    MOVE.L  #plan,D0
    MOVE.W  D0,cop_plans+6
    SWAP    D0
    MOVE.W  D0,cop_plans+2
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$83C0,$96(A5)  ; DMAEN + BPLEN + COPEN + BLTEN
    RTS

; Draws a line from (D0,D1) to (D2,D3) in the plane (40 bytes per line). Changes D0-D6 and A0.
ligne:
    LEA     plan,A0
    MOVEQ   #0,D4           ; the octant, bit by bit
    SUB.W   D0,D2           ; dx = x2 - x1
    BPL.S   .dx
    NEG.W   D2
    MOVEQ   #1,D5           ; to the left
    BRA.S   .y
.dx:
    MOVEQ   #0,D5           ; to the right
.y:
    SUB.W   D1,D3           ; dy = y2 - y1
    BPL.S   .dy
    NEG.W   D3
    MOVEQ   #1,D6           ; upward
    BRA.S   .octant
.dy:
    MOVEQ   #0,D6           ; downward
.octant:
    CMP.W   D3,D2
    BLT.S   .vertical
    BSET    #4,D4           ; wider than tall: SUD, the "sometimes" step is vertical
    TST.W   D6
    BEQ.S   .h1
    BSET    #3,D4           ; SUL: this step goes up
.h1:
    TST.W   D5
    BEQ.S   .calcul
    BSET    #2,D4           ; AUL: the "always" step goes to the left
    BRA.S   .calcul
.vertical:
    TST.W   D5
    BEQ.S   .v1
    BSET    #3,D4           ; SUL: the "sometimes" step (horizontal) goes to the left
.v1:
    TST.W   D6
    BEQ.S   .v2
    BSET    #2,D4           ; AUL: the "always" step (vertical) goes up
.v2:
    EXG     D2,D3           ; D2 = dmax, D3 = dmin
.calcul:
    MULU    #40,D1          ; the address of the starting word
    ADDA.L  D1,A0
    MOVE.W  D0,D1
    LSR.W   #3,D1
    AND.W   #$FFFE,D1
    ADDA.W  D1,A0
    AND.W   #15,D0          ; the starting bit in this word...
    ROR.W   #4,D0           ; ... into bits 15-12 of BLTCON0
    OR.W    #$0BCA,D0       ; channels A, C, D; minterm $CA
    LSL.W   #2,D3           ; 4 dmin
    ADD.W   D2,D2           ; 2 dmax
    MOVE.W  D3,D5
    SUB.W   D2,D5           ; 4 dmin - 2 dmax
    BPL.S   .signe
    BSET    #6,D4           ; SIGN
.signe:
    MOVE.W  D3,D6
    SUB.W   D2,D6
    SUB.W   D2,D6           ; 4 dmin - 4 dmax
    BSET    #0,D4           ; LINE: line mode
    LSR.W   #1,D2
    ADDQ.W  #1,D2           ; dmax + 1 points
    LSL.W   #6,D2
    ADDQ.W  #2,D2           ; BLTSIZE
    BSR     attendre_blitter
    MOVE.W  D0,$40(A5)      ; BLTCON0
    MOVE.W  D4,$42(A5)      ; BLTCON1
    MOVE.L  #-1,$44(A5)     ; BLTAFWM, BLTALWM
    MOVE.W  #$8000,$74(A5)  ; BLTADAT: one point
    MOVE.W  #$FFFF,$72(A5)  ; BLTBDAT: solid line
    MOVE.W  D3,$62(A5)      ; BLTBMOD = 4 dmin
    MOVE.W  D6,$64(A5)      ; BLTAMOD = 4 (dmin - dmax)
    MOVE.W  D5,$52(A5)      ; BLTAPTL = 4 dmin - 2 dmax
    MOVE.W  #40,$60(A5)     ; BLTCMOD
    MOVE.W  #40,$66(A5)     ; BLTDMOD
    MOVE.L  A0,$48(A5)      ; BLTCPT
    MOVE.L  A0,$54(A5)      ; BLTDPT
    MOVE.W  D2,$58(A5)      ; BLTSIZE: off it goes
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

;=== carre-lignes-solution
START:
    BSR     prendre
    BSR     ecran           ; the one-plane screen (at the bottom of the program) is displayed
    MOVE.W  #50,D0
    MOVE.W  #50,D1
    MOVE.W  #150,D2
    MOVE.W  #50,D3
    BSR     ligne           ; the top
    MOVE.W  #150,D0
    MOVE.W  #50,D1
    MOVE.W  #150,D2
    MOVE.W  #150,D3
    BSR     ligne           ; the right
    MOVE.W  #150,D0
    MOVE.W  #150,D1
    MOVE.W  #50,D2
    MOVE.W  #150,D3
    BSR     ligne           ; the bottom
    MOVE.W  #50,D0
    MOVE.W  #150,D1
    MOVE.W  #50,D2
    MOVE.W  #50,D3
    BSR     ligne           ; the left
    BSR     attendre_blitter
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS

; Displays the plane (320 x 256, white on black) and turns on the Blitter's DMA
ecran:
    MOVE.L  #plan,D0
    MOVE.W  D0,cop_plans+6
    SWAP    D0
    MOVE.W  D0,cop_plans+2
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$83C0,$96(A5)  ; DMAEN + BPLEN + COPEN + BLTEN
    RTS

; Draws a line from (D0,D1) to (D2,D3) in the plane (40 bytes per line). Changes D0-D6 and A0.
ligne:
    LEA     plan,A0
    MOVEQ   #0,D4           ; the octant, bit by bit
    SUB.W   D0,D2           ; dx = x2 - x1
    BPL.S   .dx
    NEG.W   D2
    MOVEQ   #1,D5           ; to the left
    BRA.S   .y
.dx:
    MOVEQ   #0,D5           ; to the right
.y:
    SUB.W   D1,D3           ; dy = y2 - y1
    BPL.S   .dy
    NEG.W   D3
    MOVEQ   #1,D6           ; upward
    BRA.S   .octant
.dy:
    MOVEQ   #0,D6           ; downward
.octant:
    CMP.W   D3,D2
    BLT.S   .vertical
    BSET    #4,D4           ; wider than tall: SUD, the "sometimes" step is vertical
    TST.W   D6
    BEQ.S   .h1
    BSET    #3,D4           ; SUL: this step goes up
.h1:
    TST.W   D5
    BEQ.S   .calcul
    BSET    #2,D4           ; AUL: the "always" step goes to the left
    BRA.S   .calcul
.vertical:
    TST.W   D5
    BEQ.S   .v1
    BSET    #3,D4           ; SUL: the "sometimes" step (horizontal) goes to the left
.v1:
    TST.W   D6
    BEQ.S   .v2
    BSET    #2,D4           ; AUL: the "always" step (vertical) goes up
.v2:
    EXG     D2,D3           ; D2 = dmax, D3 = dmin
.calcul:
    MULU    #40,D1          ; the address of the starting word
    ADDA.L  D1,A0
    MOVE.W  D0,D1
    LSR.W   #3,D1
    AND.W   #$FFFE,D1
    ADDA.W  D1,A0
    AND.W   #15,D0          ; the starting bit in this word...
    ROR.W   #4,D0           ; ... into bits 15-12 of BLTCON0
    OR.W    #$0BCA,D0       ; channels A, C, D; minterm $CA
    LSL.W   #2,D3           ; 4 dmin
    ADD.W   D2,D2           ; 2 dmax
    MOVE.W  D3,D5
    SUB.W   D2,D5           ; 4 dmin - 2 dmax
    BPL.S   .signe
    BSET    #6,D4           ; SIGN
.signe:
    MOVE.W  D3,D6
    SUB.W   D2,D6
    SUB.W   D2,D6           ; 4 dmin - 4 dmax
    BSET    #0,D4           ; LINE: line mode
    LSR.W   #1,D2
    ADDQ.W  #1,D2           ; dmax + 1 points
    LSL.W   #6,D2
    ADDQ.W  #2,D2           ; BLTSIZE
    BSR     attendre_blitter
    MOVE.W  D0,$40(A5)      ; BLTCON0
    MOVE.W  D4,$42(A5)      ; BLTCON1
    MOVE.L  #-1,$44(A5)     ; BLTAFWM, BLTALWM
    MOVE.W  #$8000,$74(A5)  ; BLTADAT: one point
    MOVE.W  #$FFFF,$72(A5)  ; BLTBDAT: solid line
    MOVE.W  D3,$62(A5)      ; BLTBMOD = 4 dmin
    MOVE.W  D6,$64(A5)      ; BLTAMOD = 4 (dmin - dmax)
    MOVE.W  D5,$52(A5)      ; BLTAPTL = 4 dmin - 2 dmax
    MOVE.W  #40,$60(A5)     ; BLTCMOD
    MOVE.W  #40,$66(A5)     ; BLTDMOD
    MOVE.L  A0,$48(A5)      ; BLTCPT
    MOVE.L  A0,$54(A5)      ; BLTDPT
    MOVE.W  D2,$58(A5)      ; BLTSIZE: off it goes
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

;=== remplir-exemple
START:
    BSR     prendre
    BSR     ecran           ; the one-plane screen (at the bottom of the program) is displayed
    LEA     plan+60*40,A0   ; two vertical edges, x = 40 and x = 200, lines 60 to 159
    MOVEQ   #99,D7
.bord:
    BSET    #7-(40&7),40/8(A0)
    BSET    #7-(200&7),200/8(A0)
    LEA     40(A0),A0
    DBF     D7,.bord
    BSR     attendre_blitter
    MOVE.L  #$09F0000A,$40(A5) ; BLTCON0 = $09F0 (D = A); BLTCON1 = $000A: IFE (inclusive fill) + DESC
    MOVE.L  #-1,$44(A5)
    MOVE.L  #plan+159*40+38,D0  ; the LAST word of the area (descending mode)
    MOVE.L  D0,$50(A5)      ; A: the area
    MOVE.L  D0,$54(A5)      ; D: the same area
    MOVE.W  #0,$64(A5)
    MOVE.W  #0,$66(A5)
    MOVE.W  #(100<<6)|20,$58(A5) ; 100 whole lines
    BSR     attendre_blitter
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS

; Displays the plane (320 x 256, white on black) and turns on the Blitter's DMA
ecran:
    MOVE.L  #plan,D0
    MOVE.W  D0,cop_plans+6
    SWAP    D0
    MOVE.W  D0,cop_plans+2
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$83C0,$96(A5)  ; DMAEN + BPLEN + COPEN + BLTEN
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

;=== remplir-depart
START:
    BSR     prendre
    BSR     ecran           ; the one-plane screen (at the bottom of the program) is displayed
    LEA     plan+60*40,A0   ; two vertical edges, x = 40 and x = 200, lines 60 to 159
    MOVEQ   #99,D7
.bord:
    BSET    #7-(40&7),40/8(A0)
    BSET    #7-(200&7),200/8(A0)
    LEA     40(A0),A0
    DBF     D7,.bord
    BSR     attendre_blitter
    MOVE.L  #$09F00002,$40(A5) ; BLTCON0 = $09F0 (D = A); BLTCON1: <- DESC only, the fill is missing
    MOVE.L  #-1,$44(A5)
    MOVE.L  #plan+159*40+38,D0  ; the LAST word of the area (descending mode)
    MOVE.L  D0,$50(A5)      ; A: the area
    MOVE.L  D0,$54(A5)      ; D: the same area
    MOVE.W  #0,$64(A5)
    MOVE.W  #0,$66(A5)
    MOVE.W  #(100<<6)|20,$58(A5) ; 100 whole lines
    BSR     attendre_blitter
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS

; Displays the plane (320 x 256, white on black) and turns on the Blitter's DMA
ecran:
    MOVE.L  #plan,D0
    MOVE.W  D0,cop_plans+6
    SWAP    D0
    MOVE.W  D0,cop_plans+2
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$83C0,$96(A5)  ; DMAEN + BPLEN + COPEN + BLTEN
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

;=== remplir-solution
START:
    BSR     prendre
    BSR     ecran           ; the one-plane screen (at the bottom of the program) is displayed
    LEA     plan+60*40,A0   ; two vertical edges, x = 40 and x = 200, lines 60 to 159
    MOVEQ   #99,D7
.bord:
    BSET    #7-(40&7),40/8(A0)
    BSET    #7-(200&7),200/8(A0)
    LEA     40(A0),A0
    DBF     D7,.bord
    BSR     attendre_blitter
    MOVE.L  #$09F0000A,$40(A5) ; BLTCON0 = $09F0 (D = A); BLTCON1 = IFE + DESC
    MOVE.L  #-1,$44(A5)
    MOVE.L  #plan+159*40+38,D0  ; the LAST word of the area (descending mode)
    MOVE.L  D0,$50(A5)      ; A: the area
    MOVE.L  D0,$54(A5)      ; D: the same area
    MOVE.W  #0,$64(A5)
    MOVE.W  #0,$66(A5)
    MOVE.W  #(100<<6)|20,$58(A5) ; 100 whole lines
    BSR     attendre_blitter
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS

; Displays the plane (320 x 256, white on black) and turns on the Blitter's DMA
ecran:
    MOVE.L  #plan,D0
    MOVE.W  D0,cop_plans+6
    SWAP    D0
    MOVE.W  D0,cop_plans+2
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$83C0,$96(A5)  ; DMAEN + BPLEN + COPEN + BLTEN
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

;=== qcm-cookie
    MOVE.W  #$0FCA,$DFF040

;=== bonus-triangle-depart
; A solid triangle: two edges in SING mode, then the Blitter's fill.
START:
    BSR     prendre
    BSR     ecran           ; the one-plane screen (at the bottom of the program) is displayed
    ; The solid triangle (160, 40), (60, 200), (260, 200): its two slanted edges with bord,
    ; then a fill

    BSR     attendre_blitter
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS

; Displays the plane (320 x 256, white on black) and turns on the Blitter's DMA
ecran:
    MOVE.L  #plan,D0
    MOVE.W  D0,cop_plans+6
    SWAP    D0
    MOVE.W  D0,cop_plans+2
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$83C0,$96(A5)  ; DMAEN + BPLEN + COPEN + BLTEN
    RTS

; Draws an edge from (D0,D1) to (D2,D3): a single point per line (SING), in exclusive OR ($4A).
bord:
    LEA     plan,A0
    MOVEQ   #0,D4           ; the octant, bit by bit
    SUB.W   D0,D2           ; dx = x2 - x1
    BPL.S   .dx
    NEG.W   D2
    MOVEQ   #1,D5           ; to the left
    BRA.S   .y
.dx:
    MOVEQ   #0,D5           ; to the right
.y:
    SUB.W   D1,D3           ; dy = y2 - y1
    BPL.S   .dy
    NEG.W   D3
    MOVEQ   #1,D6           ; upward
    BRA.S   .octant
.dy:
    MOVEQ   #0,D6           ; downward
.octant:
    CMP.W   D3,D2
    BLT.S   .vertical
    BSET    #4,D4           ; wider than tall: SUD, the "sometimes" step is vertical
    TST.W   D6
    BEQ.S   .h1
    BSET    #3,D4           ; SUL: this step goes up
.h1:
    TST.W   D5
    BEQ.S   .calcul
    BSET    #2,D4           ; AUL: the "always" step goes to the left
    BRA.S   .calcul
.vertical:
    TST.W   D5
    BEQ.S   .v1
    BSET    #3,D4           ; SUL: the "sometimes" step (horizontal) goes to the left
.v1:
    TST.W   D6
    BEQ.S   .v2
    BSET    #2,D4           ; AUL: the "always" step (vertical) goes up
.v2:
    EXG     D2,D3           ; D2 = dmax, D3 = dmin
.calcul:
    MULU    #40,D1          ; the address of the starting word
    ADDA.L  D1,A0
    MOVE.W  D0,D1
    LSR.W   #3,D1
    AND.W   #$FFFE,D1
    ADDA.W  D1,A0
    AND.W   #15,D0          ; the starting bit in this word...
    ROR.W   #4,D0           ; ... into bits 15-12 of BLTCON0
    OR.W    #$0B4A,D0       ; channels A, C, D; minterm $4A: exclusive OR
    LSL.W   #2,D3           ; 4 dmin
    ADD.W   D2,D2           ; 2 dmax
    MOVE.W  D3,D5
    SUB.W   D2,D5           ; 4 dmin - 2 dmax
    BPL.S   .signe
    BSET    #6,D4           ; SIGN
.signe:
    MOVE.W  D3,D6
    SUB.W   D2,D6
    SUB.W   D2,D6           ; 4 dmin - 4 dmax
    OR.W    #$0003,D4       ; LINE + SING: a single point per line
    LSR.W   #1,D2
    ADDQ.W  #1,D2           ; dmax + 1 points
    LSL.W   #6,D2
    ADDQ.W  #2,D2           ; BLTSIZE
    BSR     attendre_blitter
    MOVE.W  D0,$40(A5)      ; BLTCON0
    MOVE.W  D4,$42(A5)      ; BLTCON1
    MOVE.L  #-1,$44(A5)     ; BLTAFWM, BLTALWM
    MOVE.W  #$8000,$74(A5)  ; BLTADAT: one point
    MOVE.W  #$FFFF,$72(A5)  ; BLTBDAT: solid line
    MOVE.W  D3,$62(A5)      ; BLTBMOD = 4 dmin
    MOVE.W  D6,$64(A5)      ; BLTAMOD = 4 (dmin - dmax)
    MOVE.W  D5,$52(A5)      ; BLTAPTL = 4 dmin - 2 dmax
    MOVE.W  #40,$60(A5)     ; BLTCMOD
    MOVE.W  #40,$66(A5)     ; BLTDMOD
    MOVE.L  A0,$48(A5)      ; BLTCPT
    MOVE.L  A0,$54(A5)      ; BLTDPT
    MOVE.W  D2,$58(A5)      ; BLTSIZE: off it goes
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

;=== bonus-triangle-solution
START:
    BSR     prendre
    BSR     ecran           ; the one-plane screen (at the bottom of the program) is displayed
    MOVE.W  #160,D0
    MOVE.W  #40,D1
    MOVE.W  #60,D2
    MOVE.W  #200,D3
    BSR     bord            ; the left edge
    MOVE.W  #160,D0
    MOVE.W  #40,D1
    MOVE.W  #260,D2
    MOVE.W  #200,D3
    BSR     bord            ; the right edge (the shared vertex cancels out: exclusive OR)
    BSR     attendre_blitter
    MOVE.L  #$09F0000A,$40(A5) ; inclusive fill, descending mode
    MOVE.L  #-1,$44(A5)
    MOVE.L  #plan+200*40+38,D0 ; last word of line 200
    MOVE.L  D0,$50(A5)
    MOVE.L  D0,$54(A5)
    MOVE.W  #0,$64(A5)
    MOVE.W  #0,$66(A5)
    MOVE.W  #(161<<6)|20,$58(A5) ; lines 40 to 200
    BSR     attendre_blitter
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS

; Displays the plane (320 x 256, white on black) and turns on the Blitter's DMA
ecran:
    MOVE.L  #plan,D0
    MOVE.W  D0,cop_plans+6
    SWAP    D0
    MOVE.W  D0,cop_plans+2
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$83C0,$96(A5)  ; DMAEN + BPLEN + COPEN + BLTEN
    RTS

; Draws an edge from (D0,D1) to (D2,D3): a single point per line (SING), in exclusive OR ($4A).
bord:
    LEA     plan,A0
    MOVEQ   #0,D4           ; the octant, bit by bit
    SUB.W   D0,D2           ; dx = x2 - x1
    BPL.S   .dx
    NEG.W   D2
    MOVEQ   #1,D5           ; to the left
    BRA.S   .y
.dx:
    MOVEQ   #0,D5           ; to the right
.y:
    SUB.W   D1,D3           ; dy = y2 - y1
    BPL.S   .dy
    NEG.W   D3
    MOVEQ   #1,D6           ; upward
    BRA.S   .octant
.dy:
    MOVEQ   #0,D6           ; downward
.octant:
    CMP.W   D3,D2
    BLT.S   .vertical
    BSET    #4,D4           ; wider than tall: SUD, the "sometimes" step is vertical
    TST.W   D6
    BEQ.S   .h1
    BSET    #3,D4           ; SUL: this step goes up
.h1:
    TST.W   D5
    BEQ.S   .calcul
    BSET    #2,D4           ; AUL: the "always" step goes to the left
    BRA.S   .calcul
.vertical:
    TST.W   D5
    BEQ.S   .v1
    BSET    #3,D4           ; SUL: the "sometimes" step (horizontal) goes to the left
.v1:
    TST.W   D6
    BEQ.S   .v2
    BSET    #2,D4           ; AUL: the "always" step (vertical) goes up
.v2:
    EXG     D2,D3           ; D2 = dmax, D3 = dmin
.calcul:
    MULU    #40,D1          ; the address of the starting word
    ADDA.L  D1,A0
    MOVE.W  D0,D1
    LSR.W   #3,D1
    AND.W   #$FFFE,D1
    ADDA.W  D1,A0
    AND.W   #15,D0          ; the starting bit in this word...
    ROR.W   #4,D0           ; ... into bits 15-12 of BLTCON0
    OR.W    #$0B4A,D0       ; channels A, C, D; minterm $4A: exclusive OR
    LSL.W   #2,D3           ; 4 dmin
    ADD.W   D2,D2           ; 2 dmax
    MOVE.W  D3,D5
    SUB.W   D2,D5           ; 4 dmin - 2 dmax
    BPL.S   .signe
    BSET    #6,D4           ; SIGN
.signe:
    MOVE.W  D3,D6
    SUB.W   D2,D6
    SUB.W   D2,D6           ; 4 dmin - 4 dmax
    OR.W    #$0003,D4       ; LINE + SING: a single point per line
    LSR.W   #1,D2
    ADDQ.W  #1,D2           ; dmax + 1 points
    LSL.W   #6,D2
    ADDQ.W  #2,D2           ; BLTSIZE
    BSR     attendre_blitter
    MOVE.W  D0,$40(A5)      ; BLTCON0
    MOVE.W  D4,$42(A5)      ; BLTCON1
    MOVE.L  #-1,$44(A5)     ; BLTAFWM, BLTALWM
    MOVE.W  #$8000,$74(A5)  ; BLTADAT: one point
    MOVE.W  #$FFFF,$72(A5)  ; BLTBDAT: solid line
    MOVE.W  D3,$62(A5)      ; BLTBMOD = 4 dmin
    MOVE.W  D6,$64(A5)      ; BLTAMOD = 4 (dmin - dmax)
    MOVE.W  D5,$52(A5)      ; BLTAPTL = 4 dmin - 2 dmax
    MOVE.W  #40,$60(A5)     ; BLTCMOD
    MOVE.W  #40,$66(A5)     ; BLTDMOD
    MOVE.L  A0,$48(A5)      ; BLTCPT
    MOVE.L  A0,$54(A5)      ; BLTDPT
    MOVE.W  D2,$58(A5)      ; BLTSIZE: off it goes
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


;=== rappel
START:
    MOVEQ   #0,D1
    MOVE.W  #$90,D1         ; one line of the screen
    LSL.W   #8,D1           ; into the high byte
    OR.W    #$07,D1         ; D1 = the first word of a WAIT
    MOVEQ   #10,D2          ; y = 10
    MULU    #40,D2          ; 40 bytes per line
    MOVEQ   #100,D3         ; x = 100
    LSR.W   #3,D3           ; x / 8
    ADD.W   D3,D2           ; D2 = the byte of pixel (x, y) in the plane
    MOVEQ   #0,D0
    RTS

;=== ordonner-entete
; The plane still holds an old striped image: clear it entirely with the Blitter, then put the
; 32 x 16 block at (64, 100).
START:
    BSR     prendre
    BSR     ecran           ; the one-plane screen (at the bottom of the program) is displayed
    LEA     plan,A0         ; the old image: vertical stripes
    MOVE.W  #40*256/4-1,D7
.fond:
    MOVE.L  #$0F0F0F0F,(A0)+
    DBF     D7,.fond
    BSR     attendre_blitter
    MOVE.L  #-1,$44(A5)     ; BLTAFWM = BLTALWM = $FFFF: nothing masked
    MOVE.W  #0,$64(A5)      ; BLTAMOD: the block is in one piece

;=== ordonner-pied
    BSR     attendre_blitter
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS

; Displays the plane (320 x 256, white on black) and turns on the Blitter's DMA
ecran:
    MOVE.L  #plan,D0
    MOVE.W  D0,cop_plans+6
    SWAP    D0
    MOVE.W  D0,cop_plans+2
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$83C0,$96(A5)  ; DMAEN + BPLEN + COPEN + BLTEN
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

; A solid 32 x 16 block (2 words per line)
bloc:   DCB.L   16,$FFFFFFFF

    SECTION ecran,BSS_C
plan:   DS.B    40*256

;=== ou-exclusif-solution
START:
    BSR     prendre
    BSR     ecran           ; the one-plane screen (at the bottom of the program) is displayed
    LEA     plan,A0         ; the background: vertical stripes (4 pixels out of 8)
    MOVE.W  #40*256/4-1,D7
.fond:
    MOVE.L  #$0F0F0F0F,(A0)+
    DBF     D7,.fond
    BSR     attendre_blitter
    MOVE.L  #$0B5A0000,$40(A5)  ; BLTCON0 = $0B5A: channels A, C, D; D = A EOR C
    MOVE.L  #-1,$44(A5)
    MOVE.L  #bloc,$50(A5)   ; A: the block
    MOVE.L  #plan+100*40+64/8,D0
    MOVE.L  D0,$48(A5)      ; C: the background, where the block is put
    MOVE.L  D0,$54(A5)      ; D: at the same place
    MOVE.W  #0,$64(A5)      ; BLTAMOD
    MOVE.W  #36,$60(A5)     ; BLTCMOD
    MOVE.W  #36,$66(A5)     ; BLTDMOD: C and D go through the screen together
    MOVE.W  #(16<<6)|2,$58(A5)
    BSR     attendre_blitter
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS

; Displays the plane (320 x 256, white on black) and turns on the Blitter's DMA
ecran:
    MOVE.L  #plan,D0
    MOVE.W  D0,cop_plans+6
    SWAP    D0
    MOVE.W  D0,cop_plans+2
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$83C0,$96(A5)  ; DMAEN + BPLEN + COPEN + BLTEN
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

; A 32 x 16 drawing: a frame (solid edge, empty inside)
bloc:   DC.L    $FFFFFFFF
        DCB.L   14,$80000001
        DC.L    $FFFFFFFF

    SECTION ecran,BSS_C
plan:   DS.B    40*256

;=== masque-depart
; Put the 16 x 16 square at x = 150, y = 100.
START:
    BSR     prendre
    BSR     ecran           ; the one-plane screen (at the bottom of the program) is displayed
    BSR     attendre_blitter
    MOVE.W  #$69F0,$40(A5)  ; BLTCON0: shift 6 (150 = 9 x 16 + 6), channels A and D, D = A
    MOVE.W  #0,$42(A5)      ; BLTCON1
    MOVE.W  #$FFFF,$44(A5)  ; BLTAFWM
    MOVE.W  #$FFFF,$46(A5)  ; BLTALWM
    MOVE.L  #carre,$50(A5)
    MOVE.L  #plan+100*40+18,$54(A5) ; word no. 9 of line 100, which contains x = 150
    MOVE.W  #-2,$64(A5)     ; BLTAMOD
    MOVE.W  #40-4,$66(A5)   ; BLTDMOD
    MOVE.W  #(16<<6)|2,$58(A5) ; 16 lines of 2 words
    BSR     attendre_blitter
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS

; Displays the plane (320 x 256, white on black) and turns on the Blitter's DMA
ecran:
    MOVE.L  #plan,D0
    MOVE.W  D0,cop_plans+6
    SWAP    D0
    MOVE.W  D0,cop_plans+2
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$83C0,$96(A5)  ; DMAEN + BPLEN + COPEN + BLTEN
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

; A solid 16 x 16 square (1 word per line)
carre:  DCB.W   16,$FFFF

    SECTION ecran,BSS_C
plan:   DS.B    40*256


;=== masque-solution
START:
    BSR     prendre
    BSR     ecran           ; the one-plane screen (at the bottom of the program) is displayed
    BSR     attendre_blitter
    MOVE.W  #$69F0,$40(A5)  ; BLTCON0: shift 6 (150 = 9 x 16 + 6), channels A and D, D = A
    MOVE.W  #0,$42(A5)      ; BLTCON1
    MOVE.W  #$FFFF,$44(A5)  ; BLTAFWM
    MOVE.W  #$0000,$46(A5)  ; BLTALWM: the extra word is emptied
    MOVE.L  #carre,$50(A5)
    MOVE.L  #plan+100*40+18,$54(A5) ; word no. 9 of line 100, which contains x = 150
    MOVE.W  #-2,$64(A5)     ; BLTAMOD
    MOVE.W  #40-4,$66(A5)   ; BLTDMOD
    MOVE.W  #(16<<6)|2,$58(A5) ; 16 lines of 2 words
    BSR     attendre_blitter
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS

; Displays the plane (320 x 256, white on black) and turns on the Blitter's DMA
ecran:
    MOVE.L  #plan,D0
    MOVE.W  D0,cop_plans+6
    SWAP    D0
    MOVE.W  D0,cop_plans+2
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$83C0,$96(A5)  ; DMAEN + BPLEN + COPEN + BLTEN
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

; A solid 16 x 16 square (1 word per line)
carre:  DCB.W   16,$FFFF

    SECTION ecran,BSS_C
plan:   DS.B    40*256

