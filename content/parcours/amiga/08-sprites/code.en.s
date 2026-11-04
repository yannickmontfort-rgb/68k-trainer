; Code for chapter 8, "Sprites and input". The programs include content/fichiers/amiga-systeme.s.

;=== sprite-exemple
START:
    BSR     prendre
    BSR     ecran           ; the screen and the sprites (at the bottom of the program) appear
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS

; Displays the striped plane; sprite 0 = "sprite", the others = the empty list
ecran:
    LEA     plan,A0         ; the background: horizontal stripes
    MOVE.W  #256/8-1,D7
.bande:
    MOVEQ   #40*4/4-1,D6
.plein:
    MOVE.L  #$FFFFFFFF,(A0)+
    DBF     D6,.plein
    LEA     40*4(A0),A0     ; 4 full lines, 4 empty ones
    DBF     D7,.bande
    MOVE.L  #plan,D0
    MOVE.W  D0,cop_plans+6
    SWAP    D0
    MOVE.W  D0,cop_plans+2
    LEA     cop_sprites,A0
    MOVE.L  #sprite,D0      ; sprite 0
    MOVE.W  D0,6(A0)
    SWAP    D0
    MOVE.W  D0,2(A0)
    MOVE.L  #vide,D0    ; sprite 1
    MOVE.W  D0,14(A0)
    SWAP    D0
    MOVE.W  D0,10(A0)
    MOVE.L  #vide,D0        ; sprites 2 to 7: the empty list
    LEA     16(A0),A0
    MOVEQ   #5,D7
.vides:
    MOVE.W  D0,6(A0)
    SWAP    D0
    MOVE.W  D0,2(A0)
    SWAP    D0
    ADDQ.L  #8,A0
    DBF     D7,.vides
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$83A0,$96(A5)  ; DMAEN + BPLEN + COPEN + SPREN
    RTS
    INCLUDE "amiga-systeme.s"

    SECTION chip,DATA_C
copper:
    DC.W    $008E,$2C81,$0090,$2CC1,$0092,$0038,$0094,$00D0
    DC.W    $0102,$0000,$0104,$0024,$0108,$0000,$010A,$0000
    DC.W    $0180,$0000,$0182,$0444 ; the background: black and dark gray
    DC.W    $01A2,$0F00,$01A4,$0FF0,$01A6,$0FFF ; COLOR17-19: red, yellow, white
    DC.W    $0100,$1200
cop_plans:
    DC.W    $00E0,0,$00E2,0
cop_sprites:
    DC.W    $0120,0,$0122,0,$0124,0,$0126,0,$0128,0,$012A,0,$012C,0,$012E,0
    DC.W    $0130,0,$0132,0,$0134,0,$0136,0,$0138,0,$013A,0,$013C,0,$013E,0
    DC.W    $FFFF,$FFFE
vide:   DC.W    0,0

; A 16 x 16 ball: white edge (color 3), red inside (color 1)
sprite:
    DC.W    $7C72,$8C01     ; x = 100, y = 80 (see the lesson)
    DC.W    %0000011111100000,%0000011111100000
    DC.W    %0001100000011000,%0001111111111000
    DC.W    %0011000000001100,%0011111111111100
    DC.W    %0110000000000110,%0111111111111110
    DC.W    %0110000000000110,%0111111111111110
    DC.W    %1100000000000011,%1111111111111111
    DC.W    %1100000000000011,%1111111111111111
    DC.W    %1100000000000011,%1111111111111111
    DC.W    %1100000000000011,%1111111111111111
    DC.W    %1100000000000011,%1111111111111111
    DC.W    %1100000000000011,%1111111111111111
    DC.W    %0110000000000110,%0111111111111110
    DC.W    %0110000000000110,%0111111111111110
    DC.W    %0011000000001100,%0011111111111100
    DC.W    %0001100000011000,%0001111111111000
    DC.W    %0000011111100000,%0000011111100000
    DC.W    0,0

    SECTION ecran,BSS_C
plan:   DS.B    40*256

;=== pos-prediction
START:
    MOVE.W  #100,D2         ; x
    MOVE.W  #80,D3          ; y
    ADD.W   #$81,D2         ; HSTART
    ADD.W   #$2C,D3         ; VSTART
    MOVE.W  D3,D0
    LSL.W   #8,D0           ; VSTART in the high byte
    MOVE.W  D2,D4
    LSR.W   #1,D4
    MOVE.B  D4,D0           ; HSTART / 2 in the low byte: the first word
    MOVE.W  D3,D1
    ADD.W   #16,D1          ; VSTOP
    LSL.W   #8,D1
    AND.W   #1,D2
    OR.W    D2,D1           ; bit 0 of HSTART: the second word
    RTS

;=== placer-depart
; The red square must appear at x = 100, y = 80. The second word is right; fill in the first.
START:
    BSR     prendre
    BSR     ecran           ; the screen and the sprites (at the bottom of the program) appear
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS

; Displays the striped plane; sprite 0 = "sprite", the others = the empty list
ecran:
    LEA     plan,A0         ; the background: horizontal stripes
    MOVE.W  #256/8-1,D7
.bande:
    MOVEQ   #40*4/4-1,D6
.plein:
    MOVE.L  #$FFFFFFFF,(A0)+
    DBF     D6,.plein
    LEA     40*4(A0),A0     ; 4 full lines, 4 empty ones
    DBF     D7,.bande
    MOVE.L  #plan,D0
    MOVE.W  D0,cop_plans+6
    SWAP    D0
    MOVE.W  D0,cop_plans+2
    LEA     cop_sprites,A0
    MOVE.L  #sprite,D0      ; sprite 0
    MOVE.W  D0,6(A0)
    SWAP    D0
    MOVE.W  D0,2(A0)
    MOVE.L  #vide,D0    ; sprite 1
    MOVE.W  D0,14(A0)
    SWAP    D0
    MOVE.W  D0,10(A0)
    MOVE.L  #vide,D0        ; sprites 2 to 7: the empty list
    LEA     16(A0),A0
    MOVEQ   #5,D7
.vides:
    MOVE.W  D0,6(A0)
    SWAP    D0
    MOVE.W  D0,2(A0)
    SWAP    D0
    ADDQ.L  #8,A0
    DBF     D7,.vides
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$83A0,$96(A5)  ; DMAEN + BPLEN + COPEN + SPREN
    RTS
    INCLUDE "amiga-systeme.s"

    SECTION chip,DATA_C
copper:
    DC.W    $008E,$2C81,$0090,$2CC1,$0092,$0038,$0094,$00D0
    DC.W    $0102,$0000,$0104,$0024,$0108,$0000,$010A,$0000
    DC.W    $0180,$0000,$0182,$0444 ; the background: black and dark gray
    DC.W    $01A2,$0F00,$01A4,$0FF0,$01A6,$0FFF ; COLOR17-19: red, yellow, white
    DC.W    $0100,$1200
cop_plans:
    DC.W    $00E0,0,$00E2,0
cop_sprites:
    DC.W    $0120,0,$0122,0,$0124,0,$0126,0,$0128,0,$012A,0,$012C,0,$012E,0
    DC.W    $0130,0,$0132,0,$0134,0,$0136,0,$0138,0,$013A,0,$013C,0,$013E,0
    DC.W    $FFFF,$FFFE
vide:   DC.W    0,0

; A filled 16 x 16 square in color 1 (DATA = $FFFF, DATB = 0)
sprite:
    DC.W    $0000,$8C01  ; <- the first word: x = 100, y = 80
    DCB.L   16,$FFFF0000
    DC.W    0,0

    SECTION ecran,BSS_C
plan:   DS.B    40*256

;=== placer-solution
START:
    BSR     prendre
    BSR     ecran           ; the screen and the sprites (at the bottom of the program) appear
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS

; Displays the striped plane; sprite 0 = "sprite", the others = the empty list
ecran:
    LEA     plan,A0         ; the background: horizontal stripes
    MOVE.W  #256/8-1,D7
.bande:
    MOVEQ   #40*4/4-1,D6
.plein:
    MOVE.L  #$FFFFFFFF,(A0)+
    DBF     D6,.plein
    LEA     40*4(A0),A0     ; 4 full lines, 4 empty ones
    DBF     D7,.bande
    MOVE.L  #plan,D0
    MOVE.W  D0,cop_plans+6
    SWAP    D0
    MOVE.W  D0,cop_plans+2
    LEA     cop_sprites,A0
    MOVE.L  #sprite,D0      ; sprite 0
    MOVE.W  D0,6(A0)
    SWAP    D0
    MOVE.W  D0,2(A0)
    MOVE.L  #vide,D0    ; sprite 1
    MOVE.W  D0,14(A0)
    SWAP    D0
    MOVE.W  D0,10(A0)
    MOVE.L  #vide,D0        ; sprites 2 to 7: the empty list
    LEA     16(A0),A0
    MOVEQ   #5,D7
.vides:
    MOVE.W  D0,6(A0)
    SWAP    D0
    MOVE.W  D0,2(A0)
    SWAP    D0
    ADDQ.L  #8,A0
    DBF     D7,.vides
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$83A0,$96(A5)  ; DMAEN + BPLEN + COPEN + SPREN
    RTS
    INCLUDE "amiga-systeme.s"

    SECTION chip,DATA_C
copper:
    DC.W    $008E,$2C81,$0090,$2CC1,$0092,$0038,$0094,$00D0
    DC.W    $0102,$0000,$0104,$0024,$0108,$0000,$010A,$0000
    DC.W    $0180,$0000,$0182,$0444 ; the background: black and dark gray
    DC.W    $01A2,$0F00,$01A4,$0FF0,$01A6,$0FFF ; COLOR17-19: red, yellow, white
    DC.W    $0100,$1200
cop_plans:
    DC.W    $00E0,0,$00E2,0
cop_sprites:
    DC.W    $0120,0,$0122,0,$0124,0,$0126,0,$0128,0,$012A,0,$012C,0,$012E,0
    DC.W    $0130,0,$0132,0,$0134,0,$0136,0,$0138,0,$013A,0,$013C,0,$013E,0
    DC.W    $FFFF,$FFFE
vide:   DC.W    0,0

; A filled 16 x 16 square in color 1 (DATA = $FFFF, DATB = 0)
sprite:
    DC.W    $7C72,$8C01  ; VSTART = $7C, HSTART / 2 = $72
    DCB.L   16,$FFFF0000
    DC.W    0,0

    SECTION ecran,BSS_C
plan:   DS.B    40*256

;=== deplacer-depart
; Move the square right by 2 pixels per frame, 75 times, starting from x = 0 (y = 80).
START:
    BSR     prendre
    BSR     ecran           ; the screen and the sprites (at the bottom of the program) appear
    ; Move the square by 2 pixels per frame, 75 times, starting from x = 0, y = 80

    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS

; Displays the striped plane; sprite 0 = "sprite", the others = the empty list
ecran:
    LEA     plan,A0         ; the background: horizontal stripes
    MOVE.W  #256/8-1,D7
.bande:
    MOVEQ   #40*4/4-1,D6
.plein:
    MOVE.L  #$FFFFFFFF,(A0)+
    DBF     D6,.plein
    LEA     40*4(A0),A0     ; 4 full lines, 4 empty ones
    DBF     D7,.bande
    MOVE.L  #plan,D0
    MOVE.W  D0,cop_plans+6
    SWAP    D0
    MOVE.W  D0,cop_plans+2
    LEA     cop_sprites,A0
    MOVE.L  #sprite,D0      ; sprite 0
    MOVE.W  D0,6(A0)
    SWAP    D0
    MOVE.W  D0,2(A0)
    MOVE.L  #vide,D0    ; sprite 1
    MOVE.W  D0,14(A0)
    SWAP    D0
    MOVE.W  D0,10(A0)
    MOVE.L  #vide,D0        ; sprites 2 to 7: the empty list
    LEA     16(A0),A0
    MOVEQ   #5,D7
.vides:
    MOVE.W  D0,6(A0)
    SWAP    D0
    MOVE.W  D0,2(A0)
    SWAP    D0
    ADDQ.L  #8,A0
    DBF     D7,.vides
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$83A0,$96(A5)  ; DMAEN + BPLEN + COPEN + SPREN
    RTS

; Places the 16-line sprite at A0 at point (D0, D1) of the standard display
placer_sprite:
    MOVEM.L D0-D3,-(SP)
    ADD.W   #$81,D0         ; HSTART
    ADD.W   #$2C,D1         ; VSTART
    MOVE.W  D1,D2
    ADD.W   #16,D2          ; VSTOP: the line after the last one
    MOVEQ   #0,D3           ; the low bits of the second word
    LSR.W   #1,D0           ; HSTART / 2; its bit 0 goes into X...
    ADDX.W  D3,D3           ; ... and lands in bit 0 of D3
    BTST    #8,D1
    BEQ.S   .v1
    BSET    #2,D3           ; bit 8 of VSTART
.v1:
    BTST    #8,D2
    BEQ.S   .v2
    BSET    #1,D3           ; bit 8 of VSTOP
.v2:
    LSL.W   #8,D1           ; VSTART in the high byte
    MOVE.B  D0,D1           ; HSTART / 2 in the low byte
    MOVE.W  D1,(A0)         ; first word: SPRxPOS
    LSL.W   #8,D2
    MOVE.B  D3,D2
    MOVE.W  D2,2(A0)        ; second word: SPRxCTL
    MOVEM.L (SP)+,D0-D3
    RTS
    INCLUDE "amiga-systeme.s"

    SECTION chip,DATA_C
copper:
    DC.W    $008E,$2C81,$0090,$2CC1,$0092,$0038,$0094,$00D0
    DC.W    $0102,$0000,$0104,$0024,$0108,$0000,$010A,$0000
    DC.W    $0180,$0000,$0182,$0444 ; the background: black and dark gray
    DC.W    $01A2,$0F00,$01A4,$0FF0,$01A6,$0FFF ; COLOR17-19: red, yellow, white
    DC.W    $0100,$1200
cop_plans:
    DC.W    $00E0,0,$00E2,0
cop_sprites:
    DC.W    $0120,0,$0122,0,$0124,0,$0126,0,$0128,0,$012A,0,$012C,0,$012E,0
    DC.W    $0130,0,$0132,0,$0134,0,$0136,0,$0138,0,$013A,0,$013C,0,$013E,0
    DC.W    $FFFF,$FFFE
vide:   DC.W    0,0

; A filled 16 x 16 square in color 1 (DATA = $FFFF, DATB = 0)
sprite:
    DC.W    $7C40,$8C01
    DCB.L   16,$FFFF0000
    DC.W    0,0

    SECTION ecran,BSS_C
plan:   DS.B    40*256

;=== deplacer-solution
START:
    BSR     prendre
    BSR     ecran           ; the screen and the sprites (at the bottom of the program) appear
    LEA     sprite,A0
    MOVEQ   #0,D0           ; x
    MOVE.W  #80,D1          ; y
    MOVEQ   #74,D7          ; 75 frames
.image:
    BSR     attendre_vbl
    ADDQ.W  #2,D0
    BSR     placer_sprite
    DBF     D7,.image
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS

; Displays the striped plane; sprite 0 = "sprite", the others = the empty list
ecran:
    LEA     plan,A0         ; the background: horizontal stripes
    MOVE.W  #256/8-1,D7
.bande:
    MOVEQ   #40*4/4-1,D6
.plein:
    MOVE.L  #$FFFFFFFF,(A0)+
    DBF     D6,.plein
    LEA     40*4(A0),A0     ; 4 full lines, 4 empty ones
    DBF     D7,.bande
    MOVE.L  #plan,D0
    MOVE.W  D0,cop_plans+6
    SWAP    D0
    MOVE.W  D0,cop_plans+2
    LEA     cop_sprites,A0
    MOVE.L  #sprite,D0      ; sprite 0
    MOVE.W  D0,6(A0)
    SWAP    D0
    MOVE.W  D0,2(A0)
    MOVE.L  #vide,D0    ; sprite 1
    MOVE.W  D0,14(A0)
    SWAP    D0
    MOVE.W  D0,10(A0)
    MOVE.L  #vide,D0        ; sprites 2 to 7: the empty list
    LEA     16(A0),A0
    MOVEQ   #5,D7
.vides:
    MOVE.W  D0,6(A0)
    SWAP    D0
    MOVE.W  D0,2(A0)
    SWAP    D0
    ADDQ.L  #8,A0
    DBF     D7,.vides
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$83A0,$96(A5)  ; DMAEN + BPLEN + COPEN + SPREN
    RTS

; Places the 16-line sprite at A0 at point (D0, D1) of the standard display
placer_sprite:
    MOVEM.L D0-D3,-(SP)
    ADD.W   #$81,D0         ; HSTART
    ADD.W   #$2C,D1         ; VSTART
    MOVE.W  D1,D2
    ADD.W   #16,D2          ; VSTOP: the line after the last one
    MOVEQ   #0,D3           ; the low bits of the second word
    LSR.W   #1,D0           ; HSTART / 2; its bit 0 goes into X...
    ADDX.W  D3,D3           ; ... and lands in bit 0 of D3
    BTST    #8,D1
    BEQ.S   .v1
    BSET    #2,D3           ; bit 8 of VSTART
.v1:
    BTST    #8,D2
    BEQ.S   .v2
    BSET    #1,D3           ; bit 8 of VSTOP
.v2:
    LSL.W   #8,D1           ; VSTART in the high byte
    MOVE.B  D0,D1           ; HSTART / 2 in the low byte
    MOVE.W  D1,(A0)         ; first word: SPRxPOS
    LSL.W   #8,D2
    MOVE.B  D3,D2
    MOVE.W  D2,2(A0)        ; second word: SPRxCTL
    MOVEM.L (SP)+,D0-D3
    RTS
    INCLUDE "amiga-systeme.s"

    SECTION chip,DATA_C
copper:
    DC.W    $008E,$2C81,$0090,$2CC1,$0092,$0038,$0094,$00D0
    DC.W    $0102,$0000,$0104,$0024,$0108,$0000,$010A,$0000
    DC.W    $0180,$0000,$0182,$0444 ; the background: black and dark gray
    DC.W    $01A2,$0F00,$01A4,$0FF0,$01A6,$0FFF ; COLOR17-19: red, yellow, white
    DC.W    $0100,$1200
cop_plans:
    DC.W    $00E0,0,$00E2,0
cop_sprites:
    DC.W    $0120,0,$0122,0,$0124,0,$0126,0,$0128,0,$012A,0,$012C,0,$012E,0
    DC.W    $0130,0,$0132,0,$0134,0,$0136,0,$0138,0,$013A,0,$013C,0,$013E,0
    DC.W    $FFFF,$FFFE
vide:   DC.W    0,0

; A filled 16 x 16 square in color 1 (DATA = $FFFF, DATB = 0)
sprite:
    DC.W    $7C40,$8C01
    DCB.L   16,$FFFF0000
    DC.W    0,0

    SECTION ecran,BSS_C
plan:   DS.B    40*256

;=== deux-couleurs-depart
; Draw the sprite: 8 lines in color 1 (red), then 8 lines in color 3 (white).
START:
    BSR     prendre
    BSR     ecran           ; the screen and the sprites (at the bottom of the program) appear
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS

; Displays the striped plane; sprite 0 = "sprite", the others = the empty list
ecran:
    LEA     plan,A0         ; the background: horizontal stripes
    MOVE.W  #256/8-1,D7
.bande:
    MOVEQ   #40*4/4-1,D6
.plein:
    MOVE.L  #$FFFFFFFF,(A0)+
    DBF     D6,.plein
    LEA     40*4(A0),A0     ; 4 full lines, 4 empty ones
    DBF     D7,.bande
    MOVE.L  #plan,D0
    MOVE.W  D0,cop_plans+6
    SWAP    D0
    MOVE.W  D0,cop_plans+2
    LEA     cop_sprites,A0
    MOVE.L  #sprite,D0      ; sprite 0
    MOVE.W  D0,6(A0)
    SWAP    D0
    MOVE.W  D0,2(A0)
    MOVE.L  #vide,D0    ; sprite 1
    MOVE.W  D0,14(A0)
    SWAP    D0
    MOVE.W  D0,10(A0)
    MOVE.L  #vide,D0        ; sprites 2 to 7: the empty list
    LEA     16(A0),A0
    MOVEQ   #5,D7
.vides:
    MOVE.W  D0,6(A0)
    SWAP    D0
    MOVE.W  D0,2(A0)
    SWAP    D0
    ADDQ.L  #8,A0
    DBF     D7,.vides
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$83A0,$96(A5)  ; DMAEN + BPLEN + COPEN + SPREN
    RTS
    INCLUDE "amiga-systeme.s"

    SECTION chip,DATA_C
copper:
    DC.W    $008E,$2C81,$0090,$2CC1,$0092,$0038,$0094,$00D0
    DC.W    $0102,$0000,$0104,$0024,$0108,$0000,$010A,$0000
    DC.W    $0180,$0000,$0182,$0444 ; the background: black and dark gray
    DC.W    $01A2,$0F00,$01A4,$0FF0,$01A6,$0FFF ; COLOR17-19: red, yellow, white
    DC.W    $0100,$1200
cop_plans:
    DC.W    $00E0,0,$00E2,0
cop_sprites:
    DC.W    $0120,0,$0122,0,$0124,0,$0126,0,$0128,0,$012A,0,$012C,0,$012E,0
    DC.W    $0130,0,$0132,0,$0134,0,$0136,0,$0138,0,$013A,0,$013C,0,$013E,0
    DC.W    $FFFF,$FFFE
vide:   DC.W    0,0

; The top of the square in color 1 (red), the bottom in color 3 (white)
sprite:
    DC.W    $7C72,$8C01
    DCB.L   16,$00000000    ; <- 8 red lines, then 8 white lines
    DC.W    0,0

    SECTION ecran,BSS_C
plan:   DS.B    40*256

;=== deux-couleurs-solution
START:
    BSR     prendre
    BSR     ecran           ; the screen and the sprites (at the bottom of the program) appear
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS

; Displays the striped plane; sprite 0 = "sprite", the others = the empty list
ecran:
    LEA     plan,A0         ; the background: horizontal stripes
    MOVE.W  #256/8-1,D7
.bande:
    MOVEQ   #40*4/4-1,D6
.plein:
    MOVE.L  #$FFFFFFFF,(A0)+
    DBF     D6,.plein
    LEA     40*4(A0),A0     ; 4 full lines, 4 empty ones
    DBF     D7,.bande
    MOVE.L  #plan,D0
    MOVE.W  D0,cop_plans+6
    SWAP    D0
    MOVE.W  D0,cop_plans+2
    LEA     cop_sprites,A0
    MOVE.L  #sprite,D0      ; sprite 0
    MOVE.W  D0,6(A0)
    SWAP    D0
    MOVE.W  D0,2(A0)
    MOVE.L  #vide,D0    ; sprite 1
    MOVE.W  D0,14(A0)
    SWAP    D0
    MOVE.W  D0,10(A0)
    MOVE.L  #vide,D0        ; sprites 2 to 7: the empty list
    LEA     16(A0),A0
    MOVEQ   #5,D7
.vides:
    MOVE.W  D0,6(A0)
    SWAP    D0
    MOVE.W  D0,2(A0)
    SWAP    D0
    ADDQ.L  #8,A0
    DBF     D7,.vides
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$83A0,$96(A5)  ; DMAEN + BPLEN + COPEN + SPREN
    RTS
    INCLUDE "amiga-systeme.s"

    SECTION chip,DATA_C
copper:
    DC.W    $008E,$2C81,$0090,$2CC1,$0092,$0038,$0094,$00D0
    DC.W    $0102,$0000,$0104,$0024,$0108,$0000,$010A,$0000
    DC.W    $0180,$0000,$0182,$0444 ; the background: black and dark gray
    DC.W    $01A2,$0F00,$01A4,$0FF0,$01A6,$0FFF ; COLOR17-19: red, yellow, white
    DC.W    $0100,$1200
cop_plans:
    DC.W    $00E0,0,$00E2,0
cop_sprites:
    DC.W    $0120,0,$0122,0,$0124,0,$0126,0,$0128,0,$012A,0,$012C,0,$012E,0
    DC.W    $0130,0,$0132,0,$0134,0,$0136,0,$0138,0,$013A,0,$013C,0,$013E,0
    DC.W    $FFFF,$FFFE
vide:   DC.W    0,0

; The top of the square in color 1 (red), the bottom in color 3 (white)
sprite:
    DC.W    $7C72,$8C01
    DCB.L   8,$FFFF0000     ; DATA = 1, DATB = 0: color 1
    DCB.L   8,$FFFFFFFF     ; DATA = 1, DATB = 1: color 3
    DC.W    0,0

    SECTION ecran,BSS_C
plan:   DS.B    40*256

;=== joystick-exemple
START:
    BSR     prendre
    BSR     ecran           ; the screen and the sprites (at the bottom of the program) appear
    LEA     sprite,A0
    MOVE.W  #152,D4         ; x
    MOVE.W  #120,D5         ; y
.image:
    BSR     attendre_vbl
    MOVE.W  $DFF00C,D0      ; JOY1DAT: the port 2 joystick
    BTST    #1,D0           ; right?
    BEQ.S   .gauche
    ADDQ.W  #2,D4
.gauche:
    BTST    #9,D0           ; left?
    BEQ.S   .vertical
    SUBQ.W  #2,D4
.vertical:
    MOVE.W  D0,D1
    LSR.W   #1,D1
    EOR.W   D0,D1           ; bit 0 = down, bit 8 = up
    BTST    #0,D1
    BEQ.S   .haut
    ADDQ.W  #2,D5
.haut:
    BTST    #8,D1
    BEQ.S   .placer
    SUBQ.W  #2,D5
.placer:
    MOVE.W  D4,D0
    MOVE.W  D5,D1
    BSR     placer_sprite
    BTST    #6,$BFE001      ; left click: done
    BNE.S   .image
    BSR     rendre
    MOVEQ   #0,D0
    RTS

; Displays the striped plane; sprite 0 = "sprite", the others = the empty list
ecran:
    LEA     plan,A0         ; the background: horizontal stripes
    MOVE.W  #256/8-1,D7
.bande:
    MOVEQ   #40*4/4-1,D6
.plein:
    MOVE.L  #$FFFFFFFF,(A0)+
    DBF     D6,.plein
    LEA     40*4(A0),A0     ; 4 full lines, 4 empty ones
    DBF     D7,.bande
    MOVE.L  #plan,D0
    MOVE.W  D0,cop_plans+6
    SWAP    D0
    MOVE.W  D0,cop_plans+2
    LEA     cop_sprites,A0
    MOVE.L  #sprite,D0      ; sprite 0
    MOVE.W  D0,6(A0)
    SWAP    D0
    MOVE.W  D0,2(A0)
    MOVE.L  #vide,D0    ; sprite 1
    MOVE.W  D0,14(A0)
    SWAP    D0
    MOVE.W  D0,10(A0)
    MOVE.L  #vide,D0        ; sprites 2 to 7: the empty list
    LEA     16(A0),A0
    MOVEQ   #5,D7
.vides:
    MOVE.W  D0,6(A0)
    SWAP    D0
    MOVE.W  D0,2(A0)
    SWAP    D0
    ADDQ.L  #8,A0
    DBF     D7,.vides
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$83A0,$96(A5)  ; DMAEN + BPLEN + COPEN + SPREN
    RTS

; Places the 16-line sprite at A0 at point (D0, D1) of the standard display
placer_sprite:
    MOVEM.L D0-D3,-(SP)
    ADD.W   #$81,D0         ; HSTART
    ADD.W   #$2C,D1         ; VSTART
    MOVE.W  D1,D2
    ADD.W   #16,D2          ; VSTOP: the line after the last one
    MOVEQ   #0,D3           ; the low bits of the second word
    LSR.W   #1,D0           ; HSTART / 2; its bit 0 goes into X...
    ADDX.W  D3,D3           ; ... and lands in bit 0 of D3
    BTST    #8,D1
    BEQ.S   .v1
    BSET    #2,D3           ; bit 8 of VSTART
.v1:
    BTST    #8,D2
    BEQ.S   .v2
    BSET    #1,D3           ; bit 8 of VSTOP
.v2:
    LSL.W   #8,D1           ; VSTART in the high byte
    MOVE.B  D0,D1           ; HSTART / 2 in the low byte
    MOVE.W  D1,(A0)         ; first word: SPRxPOS
    LSL.W   #8,D2
    MOVE.B  D3,D2
    MOVE.W  D2,2(A0)        ; second word: SPRxCTL
    MOVEM.L (SP)+,D0-D3
    RTS
    INCLUDE "amiga-systeme.s"

    SECTION chip,DATA_C
copper:
    DC.W    $008E,$2C81,$0090,$2CC1,$0092,$0038,$0094,$00D0
    DC.W    $0102,$0000,$0104,$0024,$0108,$0000,$010A,$0000
    DC.W    $0180,$0000,$0182,$0444 ; the background: black and dark gray
    DC.W    $01A2,$0F00,$01A4,$0FF0,$01A6,$0FFF ; COLOR17-19: red, yellow, white
    DC.W    $0100,$1200
cop_plans:
    DC.W    $00E0,0,$00E2,0
cop_sprites:
    DC.W    $0120,0,$0122,0,$0124,0,$0126,0,$0128,0,$012A,0,$012C,0,$012E,0
    DC.W    $0130,0,$0132,0,$0134,0,$0136,0,$0138,0,$013A,0,$013C,0,$013E,0
    DC.W    $FFFF,$FFFE
vide:   DC.W    0,0

; A 16 x 16 ball: white edge (color 3), red inside (color 1)
sprite:
    DC.W    $7C72,$8C01     ; x = 100, y = 80 (see the lesson)
    DC.W    %0000011111100000,%0000011111100000
    DC.W    %0001100000011000,%0001111111111000
    DC.W    %0011000000001100,%0011111111111100
    DC.W    %0110000000000110,%0111111111111110
    DC.W    %0110000000000110,%0111111111111110
    DC.W    %1100000000000011,%1111111111111111
    DC.W    %1100000000000011,%1111111111111111
    DC.W    %1100000000000011,%1111111111111111
    DC.W    %1100000000000011,%1111111111111111
    DC.W    %1100000000000011,%1111111111111111
    DC.W    %1100000000000011,%1111111111111111
    DC.W    %0110000000000110,%0111111111111110
    DC.W    %0110000000000110,%0111111111111110
    DC.W    %0011000000001100,%0011111111111100
    DC.W    %0001100000011000,%0001111111111000
    DC.W    %0000011111100000,%0000011111100000
    DC.W    0,0

    SECTION ecran,BSS_C
plan:   DS.B    40*256

;=== joy-prediction
START:
    MOVE.W  #$0103,D0       ; what JOY1DAT reads
    MOVE.W  D0,D1
    LSR.W   #1,D1
    EOR.W   D0,D1
    RTS

;=== feu-depart
; Wait for the joystick button to be pressed, then put 1 in D7.
START:
.attente:
    BTST    #6,$BFE001      ; <- the joystick button bit
    BNE.S   .attente
    MOVEQ   #1,D7
    MOVEQ   #0,D0           ; return code for the Shell: all is well
    RTS

;=== feu-solution
START:
.attente:
    BTST    #7,$BFE001      ; bit 7: the joystick button (port 2)
    BNE.S   .attente
    MOVEQ   #1,D7
    MOVEQ   #0,D0           ; return code for the Shell: all is well
    RTS

;=== souris-depart
; Measure the horizontal movement of the mouse over 5 frames: the difference of the counters
; (low byte of JOY0DAT, $DFF00A), as a signed number, in D7.
START:

    MOVEQ   #0,D0           ; return code for the Shell: all is well
    RTS
    INCLUDE "amiga-systeme.s"

;=== souris-solution
START:
    MOVE.B  $DFF00B,D6      ; the low byte of JOY0DAT: the horizontal counter
    MOVEQ   #4,D5
.image:
    BSR     attendre_vbl
    DBF     D5,.image
    MOVE.B  $DFF00B,D7
    SUB.B   D6,D7           ; the difference, on 8 bits
    EXT.W   D7
    EXT.L   D7              ; signed, on 32 bits
    MOVEQ   #0,D0           ; return code for the Shell: all is well
    RTS
    INCLUDE "amiga-systeme.s"

;=== clavier-depart
; The system is shut off: read the first key yourself from CIA-A, put its code in D7
; (bits 6-0), then do the handshake and hand control back.
START:
    BSR     prendre

    BSR     rendre
    MOVEQ   #0,D0           ; return code for the Shell: all is well
    RTS
    INCLUDE "amiga-systeme.s"

;=== clavier-solution
START:
    BSR     prendre
.attente:
    BTST    #3,$BFED01      ; ICR: has a byte arrived?
    BEQ.S   .attente
    MOVE.B  $BFEC01,D0      ; SDR
    NOT.B   D0
    ROR.B   #1,D0           ; bit 7 = released, bits 6-0 = the code
    MOVEQ   #0,D7
    MOVE.B  D0,D7
    AND.B   #$7F,D7
    BSET    #6,$BFEE01      ; handshake: serial port as output...
    MOVEQ   #100,D1
.pause:
    DBF     D1,.pause
    BCLR    #6,$BFEE01      ; ... then as input
    BSR     rendre
    MOVEQ   #0,D0           ; return code for the Shell: all is well
    RTS
    INCLUDE "amiga-systeme.s"

;=== qcm-bouton
    BTST    #7,$BFE001
    BEQ     tir

;=== bonus-attache-depart
; Two overlapping sprites: attach sprite 1 to sprite 0 to get color 21.
START:
    BSR     prendre
    BSR     ecran           ; the screen and the sprites (at the bottom of the program) appear
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS

; Displays the striped plane; sprite 0 = "sprite", the others = the empty list
ecran:
    LEA     plan,A0         ; the background: horizontal stripes
    MOVE.W  #256/8-1,D7
.bande:
    MOVEQ   #40*4/4-1,D6
.plein:
    MOVE.L  #$FFFFFFFF,(A0)+
    DBF     D6,.plein
    LEA     40*4(A0),A0     ; 4 full lines, 4 empty ones
    DBF     D7,.bande
    MOVE.L  #plan,D0
    MOVE.W  D0,cop_plans+6
    SWAP    D0
    MOVE.W  D0,cop_plans+2
    LEA     cop_sprites,A0
    MOVE.L  #sprite,D0      ; sprite 0
    MOVE.W  D0,6(A0)
    SWAP    D0
    MOVE.W  D0,2(A0)
    MOVE.L  #sprite1,D0    ; sprite 1
    MOVE.W  D0,14(A0)
    SWAP    D0
    MOVE.W  D0,10(A0)
    MOVE.L  #vide,D0        ; sprites 2 to 7: the empty list
    LEA     16(A0),A0
    MOVEQ   #5,D7
.vides:
    MOVE.W  D0,6(A0)
    SWAP    D0
    MOVE.W  D0,2(A0)
    SWAP    D0
    ADDQ.L  #8,A0
    DBF     D7,.vides
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$83A0,$96(A5)  ; DMAEN + BPLEN + COPEN + SPREN
    RTS
    INCLUDE "amiga-systeme.s"

    SECTION chip,DATA_C
copper:
    DC.W    $008E,$2C81,$0090,$2CC1,$0092,$0038,$0094,$00D0
    DC.W    $0102,$0000,$0104,$0024,$0108,$0000,$010A,$0000
    DC.W    $0180,$0000,$0182,$0444 ; the background: black and dark gray
    DC.W    $01A2,$0F00,$01AA,$0F0F ; COLOR17 = red, COLOR21 = purple
    DC.W    $0100,$1200
cop_plans:
    DC.W    $00E0,0,$00E2,0
cop_sprites:
    DC.W    $0120,0,$0122,0,$0124,0,$0126,0,$0128,0,$012A,0,$012C,0,$012E,0
    DC.W    $0130,0,$0132,0,$0134,0,$0136,0,$0138,0,$013A,0,$013C,0,$013E,0
    DC.W    $FFFF,$FFFE
vide:   DC.W    0,0

; Sprite 0: bits 0 and 1 of the color; sprite 1 (attached): bits 2 and 3
sprite:
    DC.W    $7C72,$8C01
    DCB.L   16,$FFFF0000    ; bits 0-1 = %01
    DC.W    0,0
sprite1:
    DC.W    $7C72,$8C01         ; same position; <- bit 7 of the second word attaches this sprite to sprite 0
    DCB.L   16,$FFFF0000    ; bits 2-3 = %01
    DC.W    0,0

    SECTION ecran,BSS_C
plan:   DS.B    40*256

;=== bonus-attache-solution
START:
    BSR     prendre
    BSR     ecran           ; the screen and the sprites (at the bottom of the program) appear
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS

; Displays the striped plane; sprite 0 = "sprite", the others = the empty list
ecran:
    LEA     plan,A0         ; the background: horizontal stripes
    MOVE.W  #256/8-1,D7
.bande:
    MOVEQ   #40*4/4-1,D6
.plein:
    MOVE.L  #$FFFFFFFF,(A0)+
    DBF     D6,.plein
    LEA     40*4(A0),A0     ; 4 full lines, 4 empty ones
    DBF     D7,.bande
    MOVE.L  #plan,D0
    MOVE.W  D0,cop_plans+6
    SWAP    D0
    MOVE.W  D0,cop_plans+2
    LEA     cop_sprites,A0
    MOVE.L  #sprite,D0      ; sprite 0
    MOVE.W  D0,6(A0)
    SWAP    D0
    MOVE.W  D0,2(A0)
    MOVE.L  #sprite1,D0    ; sprite 1
    MOVE.W  D0,14(A0)
    SWAP    D0
    MOVE.W  D0,10(A0)
    MOVE.L  #vide,D0        ; sprites 2 to 7: the empty list
    LEA     16(A0),A0
    MOVEQ   #5,D7
.vides:
    MOVE.W  D0,6(A0)
    SWAP    D0
    MOVE.W  D0,2(A0)
    SWAP    D0
    ADDQ.L  #8,A0
    DBF     D7,.vides
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$83A0,$96(A5)  ; DMAEN + BPLEN + COPEN + SPREN
    RTS
    INCLUDE "amiga-systeme.s"

    SECTION chip,DATA_C
copper:
    DC.W    $008E,$2C81,$0090,$2CC1,$0092,$0038,$0094,$00D0
    DC.W    $0102,$0000,$0104,$0024,$0108,$0000,$010A,$0000
    DC.W    $0180,$0000,$0182,$0444 ; the background: black and dark gray
    DC.W    $01A2,$0F00,$01AA,$0F0F ; COLOR17 = red, COLOR21 = purple
    DC.W    $0100,$1200
cop_plans:
    DC.W    $00E0,0,$00E2,0
cop_sprites:
    DC.W    $0120,0,$0122,0,$0124,0,$0126,0,$0128,0,$012A,0,$012C,0,$012E,0
    DC.W    $0130,0,$0132,0,$0134,0,$0136,0,$0138,0,$013A,0,$013C,0,$013E,0
    DC.W    $FFFF,$FFFE
vide:   DC.W    0,0

; Sprite 0: bits 0 and 1 of the color; sprite 1 (attached): bits 2 and 3
sprite:
    DC.W    $7C72,$8C01
    DCB.L   16,$FFFF0000    ; bits 0-1 = %01
    DC.W    0,0
sprite1:
    DC.W    $7C72,$8C81         ; same position; bit 7: attached to sprite 0
    DCB.L   16,$FFFF0000    ; bits 2-3 = %01
    DC.W    0,0

    SECTION ecran,BSS_C
plan:   DS.B    40*256


;=== rappel
START:
    MOVEQ   #10,D1          ; 10 lines
    LSL.W   #6,D1           ; in bits 15-6
    OR.W    #3,D1           ; 3 words wide: D1 = BLTSIZE
    MOVEQ   #0,D0
    RTS

;=== ordonner-entete
; Compute the two control words of the square for x = 100, y = 80, and store them at the head of the sprite.
START:
    BSR     prendre
    BSR     ecran           ; the screen and the sprites (at the bottom of the program) appear
    MOVE.W  #$81+100,D2     ; HSTART
    MOVE.W  #$2C+80,D3      ; VSTART

;=== ordonner-pied
    MOVE.W  D0,sprite       ; the first control word
    MOVE.W  D1,sprite+2     ; the second one
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS

; Displays the striped plane; sprite 0 = "sprite", the others = the empty list
ecran:
    LEA     plan,A0         ; the background: horizontal stripes
    MOVE.W  #256/8-1,D7
.bande:
    MOVEQ   #40*4/4-1,D6
.plein:
    MOVE.L  #$FFFFFFFF,(A0)+
    DBF     D6,.plein
    LEA     40*4(A0),A0     ; 4 full lines, 4 empty ones
    DBF     D7,.bande
    MOVE.L  #plan,D0
    MOVE.W  D0,cop_plans+6
    SWAP    D0
    MOVE.W  D0,cop_plans+2
    LEA     cop_sprites,A0
    MOVE.L  #sprite,D0      ; sprite 0
    MOVE.W  D0,6(A0)
    SWAP    D0
    MOVE.W  D0,2(A0)
    MOVE.L  #vide,D0    ; sprite 1
    MOVE.W  D0,14(A0)
    SWAP    D0
    MOVE.W  D0,10(A0)
    MOVE.L  #vide,D0        ; sprites 2 to 7: the empty list
    LEA     16(A0),A0
    MOVEQ   #5,D7
.vides:
    MOVE.W  D0,6(A0)
    SWAP    D0
    MOVE.W  D0,2(A0)
    SWAP    D0
    ADDQ.L  #8,A0
    DBF     D7,.vides
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$83A0,$96(A5)  ; DMAEN + BPLEN + COPEN + SPREN
    RTS
    INCLUDE "amiga-systeme.s"

    SECTION chip,DATA_C
copper:
    DC.W    $008E,$2C81,$0090,$2CC1,$0092,$0038,$0094,$00D0
    DC.W    $0102,$0000,$0104,$0024,$0108,$0000,$010A,$0000
    DC.W    $0180,$0000,$0182,$0444 ; the background: black and dark gray
    DC.W    $01A2,$0F00,$01A4,$0FF0,$01A6,$0FFF ; COLOR17-19: red, yellow, white
    DC.W    $0100,$1200
cop_plans:
    DC.W    $00E0,0,$00E2,0
cop_sprites:
    DC.W    $0120,0,$0122,0,$0124,0,$0126,0,$0128,0,$012A,0,$012C,0,$012E,0
    DC.W    $0130,0,$0132,0,$0134,0,$0136,0,$0138,0,$013A,0,$013C,0,$013E,0
    DC.W    $FFFF,$FFFE
vide:   DC.W    0,0

; A filled 16 x 16 square in color 1; its control words are still to be computed
sprite:
    DC.W    0,0
    DCB.L   16,$FFFF0000
    DC.W    0,0

    SECTION ecran,BSS_C
plan:   DS.B    40*256

;=== position-solution
START:
    BSR     prendre
    BSR     ecran           ; the screen and the sprites (at the bottom of the program) appear
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS

; Displays the striped plane; sprite 0 = "sprite", the others = the empty list
ecran:
    LEA     plan,A0         ; the background: horizontal stripes
    MOVE.W  #256/8-1,D7
.bande:
    MOVEQ   #40*4/4-1,D6
.plein:
    MOVE.L  #$FFFFFFFF,(A0)+
    DBF     D6,.plein
    LEA     40*4(A0),A0     ; 4 full lines, 4 empty ones
    DBF     D7,.bande
    MOVE.L  #plan,D0
    MOVE.W  D0,cop_plans+6
    SWAP    D0
    MOVE.W  D0,cop_plans+2
    LEA     cop_sprites,A0
    MOVE.L  #sprite,D0      ; sprite 0
    MOVE.W  D0,6(A0)
    SWAP    D0
    MOVE.W  D0,2(A0)
    MOVE.L  #vide,D0    ; sprite 1
    MOVE.W  D0,14(A0)
    SWAP    D0
    MOVE.W  D0,10(A0)
    MOVE.L  #vide,D0        ; sprites 2 to 7: the empty list
    LEA     16(A0),A0
    MOVEQ   #5,D7
.vides:
    MOVE.W  D0,6(A0)
    SWAP    D0
    MOVE.W  D0,2(A0)
    SWAP    D0
    ADDQ.L  #8,A0
    DBF     D7,.vides
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$83A0,$96(A5)  ; DMAEN + BPLEN + COPEN + SPREN
    RTS
    INCLUDE "amiga-systeme.s"

    SECTION chip,DATA_C
copper:
    DC.W    $008E,$2C81,$0090,$2CC1,$0092,$0038,$0094,$00D0
    DC.W    $0102,$0000,$0104,$0024,$0108,$0000,$010A,$0000
    DC.W    $0180,$0000,$0182,$0444 ; the background: black and dark gray
    DC.W    $01A2,$0F00,$01A4,$0FF0,$01A6,$0FFF ; COLOR17-19: red, yellow, white
    DC.W    $0100,$1200
cop_plans:
    DC.W    $00E0,0,$00E2,0
cop_sprites:
    DC.W    $0120,0,$0122,0,$0124,0,$0126,0,$0128,0,$012A,0,$012C,0,$012E,0
    DC.W    $0130,0,$0132,0,$0134,0,$0136,0,$0138,0,$013A,0,$013C,0,$013E,0
    DC.W    $FFFF,$FFFE
vide:   DC.W    0,0

; A filled 16 x 16 square in color 1 (DATA = $FFFF, DATB = 0)
sprite:
    DC.W    $5EA4,$6E01  ; VSTART = $5E, HSTART / 2 = $A4; VSTOP = $6E, bit 0 of HSTART = 1
    DCB.L   16,$FFFF0000
    DC.W    0,0

    SECTION ecran,BSS_C
plan:   DS.B    40*256


;=== vstop-depart
; Places the square (sprite 0, 16 lines) at x = 60, y = 100.
START:
    BSR     prendre
    BSR     ecran           ; the screen and the sprites (at the bottom of the program) appear
    MOVE.W  #$81+60,D2      ; HSTART
    MOVE.W  #$2C+100,D3     ; VSTART
    MOVE.W  D3,D0
    LSL.W   #8,D0           ; VSTART in the high byte
    MOVE.W  D2,D4
    LSR.W   #1,D4
    MOVE.B  D4,D0           ; HSTART / 2 in the low byte: the first word
    MOVE.W  D3,D1
    ADD.W   #15,D1          ; VSTOP: the last line of the square
    LSL.W   #8,D1
    AND.W   #1,D2
    OR.W    D2,D1           ; bit 0 of HSTART: the second word
    MOVE.W  D0,sprite
    MOVE.W  D1,sprite+2
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS

; Displays the striped plane; sprite 0 = "sprite", the others = the empty list
ecran:
    LEA     plan,A0         ; the background: horizontal stripes
    MOVE.W  #256/8-1,D7
.bande:
    MOVEQ   #40*4/4-1,D6
.plein:
    MOVE.L  #$FFFFFFFF,(A0)+
    DBF     D6,.plein
    LEA     40*4(A0),A0     ; 4 full lines, 4 empty ones
    DBF     D7,.bande
    MOVE.L  #plan,D0
    MOVE.W  D0,cop_plans+6
    SWAP    D0
    MOVE.W  D0,cop_plans+2
    LEA     cop_sprites,A0
    MOVE.L  #sprite,D0      ; sprite 0
    MOVE.W  D0,6(A0)
    SWAP    D0
    MOVE.W  D0,2(A0)
    MOVE.L  #vide,D0    ; sprite 1
    MOVE.W  D0,14(A0)
    SWAP    D0
    MOVE.W  D0,10(A0)
    MOVE.L  #vide,D0        ; sprites 2 to 7: the empty list
    LEA     16(A0),A0
    MOVEQ   #5,D7
.vides:
    MOVE.W  D0,6(A0)
    SWAP    D0
    MOVE.W  D0,2(A0)
    SWAP    D0
    ADDQ.L  #8,A0
    DBF     D7,.vides
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$83A0,$96(A5)  ; DMAEN + BPLEN + COPEN + SPREN
    RTS
    INCLUDE "amiga-systeme.s"

    SECTION chip,DATA_C
copper:
    DC.W    $008E,$2C81,$0090,$2CC1,$0092,$0038,$0094,$00D0
    DC.W    $0102,$0000,$0104,$0024,$0108,$0000,$010A,$0000
    DC.W    $0180,$0000,$0182,$0444 ; the background: black and dark gray
    DC.W    $01A2,$0F00,$01A4,$0FF0,$01A6,$0FFF ; COLOR17-19: red, yellow, white
    DC.W    $0100,$1200
cop_plans:
    DC.W    $00E0,0,$00E2,0
cop_sprites:
    DC.W    $0120,0,$0122,0,$0124,0,$0126,0,$0128,0,$012A,0,$012C,0,$012E,0
    DC.W    $0130,0,$0132,0,$0134,0,$0136,0,$0138,0,$013A,0,$013C,0,$013E,0
    DC.W    $FFFF,$FFFE
vide:   DC.W    0,0

; A filled 16 x 16 square in color 1; its control words are computed by the program
sprite:
    DC.W    0,0
    DCB.L   16,$FFFF0000
    DC.W    0,0

    SECTION ecran,BSS_C
plan:   DS.B    40*256

;=== vstop-solution
START:
    BSR     prendre
    BSR     ecran           ; the screen and the sprites (at the bottom of the program) appear
    MOVE.W  #$81+60,D2      ; HSTART
    MOVE.W  #$2C+100,D3     ; VSTART
    MOVE.W  D3,D0
    LSL.W   #8,D0           ; VSTART in the high byte
    MOVE.W  D2,D4
    LSR.W   #1,D4
    MOVE.B  D4,D0           ; HSTART / 2 in the low byte: the first word
    MOVE.W  D3,D1
    ADD.W   #16,D1          ; VSTOP: the line after the last one
    LSL.W   #8,D1
    AND.W   #1,D2
    OR.W    D2,D1           ; bit 0 of HSTART: the second word
    MOVE.W  D0,sprite
    MOVE.W  D1,sprite+2
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS

; Displays the striped plane; sprite 0 = "sprite", the others = the empty list
ecran:
    LEA     plan,A0         ; the background: horizontal stripes
    MOVE.W  #256/8-1,D7
.bande:
    MOVEQ   #40*4/4-1,D6
.plein:
    MOVE.L  #$FFFFFFFF,(A0)+
    DBF     D6,.plein
    LEA     40*4(A0),A0     ; 4 full lines, 4 empty ones
    DBF     D7,.bande
    MOVE.L  #plan,D0
    MOVE.W  D0,cop_plans+6
    SWAP    D0
    MOVE.W  D0,cop_plans+2
    LEA     cop_sprites,A0
    MOVE.L  #sprite,D0      ; sprite 0
    MOVE.W  D0,6(A0)
    SWAP    D0
    MOVE.W  D0,2(A0)
    MOVE.L  #vide,D0    ; sprite 1
    MOVE.W  D0,14(A0)
    SWAP    D0
    MOVE.W  D0,10(A0)
    MOVE.L  #vide,D0        ; sprites 2 to 7: the empty list
    LEA     16(A0),A0
    MOVEQ   #5,D7
.vides:
    MOVE.W  D0,6(A0)
    SWAP    D0
    MOVE.W  D0,2(A0)
    SWAP    D0
    ADDQ.L  #8,A0
    DBF     D7,.vides
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$83A0,$96(A5)  ; DMAEN + BPLEN + COPEN + SPREN
    RTS
    INCLUDE "amiga-systeme.s"

    SECTION chip,DATA_C
copper:
    DC.W    $008E,$2C81,$0090,$2CC1,$0092,$0038,$0094,$00D0
    DC.W    $0102,$0000,$0104,$0024,$0108,$0000,$010A,$0000
    DC.W    $0180,$0000,$0182,$0444 ; the background: black and dark gray
    DC.W    $01A2,$0F00,$01A4,$0FF0,$01A6,$0FFF ; COLOR17-19: red, yellow, white
    DC.W    $0100,$1200
cop_plans:
    DC.W    $00E0,0,$00E2,0
cop_sprites:
    DC.W    $0120,0,$0122,0,$0124,0,$0126,0,$0128,0,$012A,0,$012C,0,$012E,0
    DC.W    $0130,0,$0132,0,$0134,0,$0136,0,$0138,0,$013A,0,$013C,0,$013E,0
    DC.W    $FFFF,$FFFE
vide:   DC.W    0,0

; A filled 16 x 16 square in color 1; its control words are computed by the program
sprite:
    DC.W    0,0
    DCB.L   16,$FFFF0000
    DC.W    0,0

    SECTION ecran,BSS_C
plan:   DS.B    40*256
