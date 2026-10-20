; Codes du chapitre 8 « Sprites et entrées ». Les programmes incluent content/fichiers/amiga-systeme.s.

;=== sprite-exemple
START:
    BSR     prendre
    BSR     ecran           ; l'écran et les sprites (en bas du programme) s'affichent
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS

; Affiche le plan à rayures ; le sprite 0 = « sprite », les autres = la liste vide
ecran:
    LEA     plan,A0         ; le décor : des rayures horizontales
    MOVE.W  #256/8-1,D7
.bande:
    MOVEQ   #40*4/4-1,D6
.plein:
    MOVE.L  #$FFFFFFFF,(A0)+
    DBF     D6,.plein
    LEA     40*4(A0),A0     ; 4 lignes pleines, 4 vides
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
    MOVE.L  #vide,D0        ; sprites 2 à 7 : la liste vide
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
    DC.W    $0180,$0000,$0182,$0444 ; le décor : noir et gris foncé
    DC.W    $01A2,$0F00,$01A4,$0FF0,$01A6,$0FFF ; COLOR17-19 : rouge, jaune, blanc
    DC.W    $0100,$1200
cop_plans:
    DC.W    $00E0,0,$00E2,0
cop_sprites:
    DC.W    $0120,0,$0122,0,$0124,0,$0126,0,$0128,0,$012A,0,$012C,0,$012E,0
    DC.W    $0130,0,$0132,0,$0134,0,$0136,0,$0138,0,$013A,0,$013C,0,$013E,0
    DC.W    $FFFF,$FFFE
vide:   DC.W    0,0

; Une balle de 16 x 16 : bord blanc (couleur 3), intérieur rouge (couleur 1)
sprite:
    DC.W    $7C72,$8C01     ; x = 100, y = 80 (voir le cours)
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
    LSL.W   #8,D0           ; VSTART dans l'octet fort
    MOVE.W  D2,D4
    LSR.W   #1,D4
    MOVE.B  D4,D0           ; HSTART / 2 dans l'octet faible : le premier mot
    MOVE.W  D3,D1
    ADD.W   #16,D1          ; VSTOP
    LSL.W   #8,D1
    AND.W   #1,D2
    OR.W    D2,D1           ; bit 0 de HSTART : le second mot
    RTS

;=== placer-depart
; Le carré rouge doit apparaître en x = 100, y = 80. Le second mot est juste ; complète le premier.
START:
    BSR     prendre
    BSR     ecran           ; l'écran et les sprites (en bas du programme) s'affichent
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS

; Affiche le plan à rayures ; le sprite 0 = « sprite », les autres = la liste vide
ecran:
    LEA     plan,A0         ; le décor : des rayures horizontales
    MOVE.W  #256/8-1,D7
.bande:
    MOVEQ   #40*4/4-1,D6
.plein:
    MOVE.L  #$FFFFFFFF,(A0)+
    DBF     D6,.plein
    LEA     40*4(A0),A0     ; 4 lignes pleines, 4 vides
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
    MOVE.L  #vide,D0        ; sprites 2 à 7 : la liste vide
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
    DC.W    $0180,$0000,$0182,$0444 ; le décor : noir et gris foncé
    DC.W    $01A2,$0F00,$01A4,$0FF0,$01A6,$0FFF ; COLOR17-19 : rouge, jaune, blanc
    DC.W    $0100,$1200
cop_plans:
    DC.W    $00E0,0,$00E2,0
cop_sprites:
    DC.W    $0120,0,$0122,0,$0124,0,$0126,0,$0128,0,$012A,0,$012C,0,$012E,0
    DC.W    $0130,0,$0132,0,$0134,0,$0136,0,$0138,0,$013A,0,$013C,0,$013E,0
    DC.W    $FFFF,$FFFE
vide:   DC.W    0,0

; Un carré plein de 16 x 16 en couleur 1 (DATA = $FFFF, DATB = 0)
sprite:
    DC.W    $0000,$8C01  ; <- le premier mot : x = 100, y = 80
    DCB.L   16,$FFFF0000
    DC.W    0,0

    SECTION ecran,BSS_C
plan:   DS.B    40*256

;=== placer-solution
START:
    BSR     prendre
    BSR     ecran           ; l'écran et les sprites (en bas du programme) s'affichent
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS

; Affiche le plan à rayures ; le sprite 0 = « sprite », les autres = la liste vide
ecran:
    LEA     plan,A0         ; le décor : des rayures horizontales
    MOVE.W  #256/8-1,D7
.bande:
    MOVEQ   #40*4/4-1,D6
.plein:
    MOVE.L  #$FFFFFFFF,(A0)+
    DBF     D6,.plein
    LEA     40*4(A0),A0     ; 4 lignes pleines, 4 vides
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
    MOVE.L  #vide,D0        ; sprites 2 à 7 : la liste vide
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
    DC.W    $0180,$0000,$0182,$0444 ; le décor : noir et gris foncé
    DC.W    $01A2,$0F00,$01A4,$0FF0,$01A6,$0FFF ; COLOR17-19 : rouge, jaune, blanc
    DC.W    $0100,$1200
cop_plans:
    DC.W    $00E0,0,$00E2,0
cop_sprites:
    DC.W    $0120,0,$0122,0,$0124,0,$0126,0,$0128,0,$012A,0,$012C,0,$012E,0
    DC.W    $0130,0,$0132,0,$0134,0,$0136,0,$0138,0,$013A,0,$013C,0,$013E,0
    DC.W    $FFFF,$FFFE
vide:   DC.W    0,0

; Un carré plein de 16 x 16 en couleur 1 (DATA = $FFFF, DATB = 0)
sprite:
    DC.W    $7C72,$8C01  ; VSTART = $7C, HSTART / 2 = $72
    DCB.L   16,$FFFF0000
    DC.W    0,0

    SECTION ecran,BSS_C
plan:   DS.B    40*256

;=== deplacer-depart
; Fais avancer le carré de 2 pixels par image vers la droite, 75 fois, à partir de x = 0 (y = 80).
START:
    BSR     prendre
    BSR     ecran           ; l'écran et les sprites (en bas du programme) s'affichent
    ; Fais avancer le carré de 2 pixels par image, 75 fois, à partir de x = 0, y = 80

    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS

; Affiche le plan à rayures ; le sprite 0 = « sprite », les autres = la liste vide
ecran:
    LEA     plan,A0         ; le décor : des rayures horizontales
    MOVE.W  #256/8-1,D7
.bande:
    MOVEQ   #40*4/4-1,D6
.plein:
    MOVE.L  #$FFFFFFFF,(A0)+
    DBF     D6,.plein
    LEA     40*4(A0),A0     ; 4 lignes pleines, 4 vides
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
    MOVE.L  #vide,D0        ; sprites 2 à 7 : la liste vide
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

; Place le sprite de 16 lignes en A0 au point (D0, D1) de l'image standard
placer_sprite:
    MOVEM.L D0-D3,-(SP)
    ADD.W   #$81,D0         ; HSTART
    ADD.W   #$2C,D1         ; VSTART
    MOVE.W  D1,D2
    ADD.W   #16,D2          ; VSTOP : la ligne après la dernière
    MOVEQ   #0,D3           ; les bits bas du second mot
    LSR.W   #1,D0           ; HSTART / 2 ; son bit 0 part dans X...
    ADDX.W  D3,D3           ; ... et arrive dans le bit 0 de D3
    BTST    #8,D1
    BEQ.S   .v1
    BSET    #2,D3           ; bit 8 de VSTART
.v1:
    BTST    #8,D2
    BEQ.S   .v2
    BSET    #1,D3           ; bit 8 de VSTOP
.v2:
    LSL.W   #8,D1           ; VSTART dans l'octet fort
    MOVE.B  D0,D1           ; HSTART / 2 dans l'octet faible
    MOVE.W  D1,(A0)         ; premier mot : SPRxPOS
    LSL.W   #8,D2
    MOVE.B  D3,D2
    MOVE.W  D2,2(A0)        ; second mot : SPRxCTL
    MOVEM.L (SP)+,D0-D3
    RTS
    INCLUDE "amiga-systeme.s"

    SECTION chip,DATA_C
copper:
    DC.W    $008E,$2C81,$0090,$2CC1,$0092,$0038,$0094,$00D0
    DC.W    $0102,$0000,$0104,$0024,$0108,$0000,$010A,$0000
    DC.W    $0180,$0000,$0182,$0444 ; le décor : noir et gris foncé
    DC.W    $01A2,$0F00,$01A4,$0FF0,$01A6,$0FFF ; COLOR17-19 : rouge, jaune, blanc
    DC.W    $0100,$1200
cop_plans:
    DC.W    $00E0,0,$00E2,0
cop_sprites:
    DC.W    $0120,0,$0122,0,$0124,0,$0126,0,$0128,0,$012A,0,$012C,0,$012E,0
    DC.W    $0130,0,$0132,0,$0134,0,$0136,0,$0138,0,$013A,0,$013C,0,$013E,0
    DC.W    $FFFF,$FFFE
vide:   DC.W    0,0

; Un carré plein de 16 x 16 en couleur 1 (DATA = $FFFF, DATB = 0)
sprite:
    DC.W    $7C40,$8C01
    DCB.L   16,$FFFF0000
    DC.W    0,0

    SECTION ecran,BSS_C
plan:   DS.B    40*256

;=== deplacer-solution
START:
    BSR     prendre
    BSR     ecran           ; l'écran et les sprites (en bas du programme) s'affichent
    LEA     sprite,A0
    MOVEQ   #0,D0           ; x
    MOVE.W  #80,D1          ; y
    MOVEQ   #74,D7          ; 75 images
.image:
    BSR     attendre_vbl
    ADDQ.W  #2,D0
    BSR     placer_sprite
    DBF     D7,.image
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS

; Affiche le plan à rayures ; le sprite 0 = « sprite », les autres = la liste vide
ecran:
    LEA     plan,A0         ; le décor : des rayures horizontales
    MOVE.W  #256/8-1,D7
.bande:
    MOVEQ   #40*4/4-1,D6
.plein:
    MOVE.L  #$FFFFFFFF,(A0)+
    DBF     D6,.plein
    LEA     40*4(A0),A0     ; 4 lignes pleines, 4 vides
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
    MOVE.L  #vide,D0        ; sprites 2 à 7 : la liste vide
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

; Place le sprite de 16 lignes en A0 au point (D0, D1) de l'image standard
placer_sprite:
    MOVEM.L D0-D3,-(SP)
    ADD.W   #$81,D0         ; HSTART
    ADD.W   #$2C,D1         ; VSTART
    MOVE.W  D1,D2
    ADD.W   #16,D2          ; VSTOP : la ligne après la dernière
    MOVEQ   #0,D3           ; les bits bas du second mot
    LSR.W   #1,D0           ; HSTART / 2 ; son bit 0 part dans X...
    ADDX.W  D3,D3           ; ... et arrive dans le bit 0 de D3
    BTST    #8,D1
    BEQ.S   .v1
    BSET    #2,D3           ; bit 8 de VSTART
.v1:
    BTST    #8,D2
    BEQ.S   .v2
    BSET    #1,D3           ; bit 8 de VSTOP
.v2:
    LSL.W   #8,D1           ; VSTART dans l'octet fort
    MOVE.B  D0,D1           ; HSTART / 2 dans l'octet faible
    MOVE.W  D1,(A0)         ; premier mot : SPRxPOS
    LSL.W   #8,D2
    MOVE.B  D3,D2
    MOVE.W  D2,2(A0)        ; second mot : SPRxCTL
    MOVEM.L (SP)+,D0-D3
    RTS
    INCLUDE "amiga-systeme.s"

    SECTION chip,DATA_C
copper:
    DC.W    $008E,$2C81,$0090,$2CC1,$0092,$0038,$0094,$00D0
    DC.W    $0102,$0000,$0104,$0024,$0108,$0000,$010A,$0000
    DC.W    $0180,$0000,$0182,$0444 ; le décor : noir et gris foncé
    DC.W    $01A2,$0F00,$01A4,$0FF0,$01A6,$0FFF ; COLOR17-19 : rouge, jaune, blanc
    DC.W    $0100,$1200
cop_plans:
    DC.W    $00E0,0,$00E2,0
cop_sprites:
    DC.W    $0120,0,$0122,0,$0124,0,$0126,0,$0128,0,$012A,0,$012C,0,$012E,0
    DC.W    $0130,0,$0132,0,$0134,0,$0136,0,$0138,0,$013A,0,$013C,0,$013E,0
    DC.W    $FFFF,$FFFE
vide:   DC.W    0,0

; Un carré plein de 16 x 16 en couleur 1 (DATA = $FFFF, DATB = 0)
sprite:
    DC.W    $7C40,$8C01
    DCB.L   16,$FFFF0000
    DC.W    0,0

    SECTION ecran,BSS_C
plan:   DS.B    40*256

;=== deux-couleurs-depart
; Dessine le sprite : 8 lignes en couleur 1 (rouge), puis 8 lignes en couleur 3 (blanc).
START:
    BSR     prendre
    BSR     ecran           ; l'écran et les sprites (en bas du programme) s'affichent
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS

; Affiche le plan à rayures ; le sprite 0 = « sprite », les autres = la liste vide
ecran:
    LEA     plan,A0         ; le décor : des rayures horizontales
    MOVE.W  #256/8-1,D7
.bande:
    MOVEQ   #40*4/4-1,D6
.plein:
    MOVE.L  #$FFFFFFFF,(A0)+
    DBF     D6,.plein
    LEA     40*4(A0),A0     ; 4 lignes pleines, 4 vides
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
    MOVE.L  #vide,D0        ; sprites 2 à 7 : la liste vide
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
    DC.W    $0180,$0000,$0182,$0444 ; le décor : noir et gris foncé
    DC.W    $01A2,$0F00,$01A4,$0FF0,$01A6,$0FFF ; COLOR17-19 : rouge, jaune, blanc
    DC.W    $0100,$1200
cop_plans:
    DC.W    $00E0,0,$00E2,0
cop_sprites:
    DC.W    $0120,0,$0122,0,$0124,0,$0126,0,$0128,0,$012A,0,$012C,0,$012E,0
    DC.W    $0130,0,$0132,0,$0134,0,$0136,0,$0138,0,$013A,0,$013C,0,$013E,0
    DC.W    $FFFF,$FFFE
vide:   DC.W    0,0

; Le haut du carré en couleur 1 (rouge), le bas en couleur 3 (blanc)
sprite:
    DC.W    $7C72,$8C01
    DCB.L   16,$00000000    ; <- 8 lignes rouges, puis 8 lignes blanches
    DC.W    0,0

    SECTION ecran,BSS_C
plan:   DS.B    40*256

;=== deux-couleurs-solution
START:
    BSR     prendre
    BSR     ecran           ; l'écran et les sprites (en bas du programme) s'affichent
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS

; Affiche le plan à rayures ; le sprite 0 = « sprite », les autres = la liste vide
ecran:
    LEA     plan,A0         ; le décor : des rayures horizontales
    MOVE.W  #256/8-1,D7
.bande:
    MOVEQ   #40*4/4-1,D6
.plein:
    MOVE.L  #$FFFFFFFF,(A0)+
    DBF     D6,.plein
    LEA     40*4(A0),A0     ; 4 lignes pleines, 4 vides
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
    MOVE.L  #vide,D0        ; sprites 2 à 7 : la liste vide
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
    DC.W    $0180,$0000,$0182,$0444 ; le décor : noir et gris foncé
    DC.W    $01A2,$0F00,$01A4,$0FF0,$01A6,$0FFF ; COLOR17-19 : rouge, jaune, blanc
    DC.W    $0100,$1200
cop_plans:
    DC.W    $00E0,0,$00E2,0
cop_sprites:
    DC.W    $0120,0,$0122,0,$0124,0,$0126,0,$0128,0,$012A,0,$012C,0,$012E,0
    DC.W    $0130,0,$0132,0,$0134,0,$0136,0,$0138,0,$013A,0,$013C,0,$013E,0
    DC.W    $FFFF,$FFFE
vide:   DC.W    0,0

; Le haut du carré en couleur 1 (rouge), le bas en couleur 3 (blanc)
sprite:
    DC.W    $7C72,$8C01
    DCB.L   8,$FFFF0000     ; DATA = 1, DATB = 0 : couleur 1
    DCB.L   8,$FFFFFFFF     ; DATA = 1, DATB = 1 : couleur 3
    DC.W    0,0

    SECTION ecran,BSS_C
plan:   DS.B    40*256

;=== joystick-exemple
START:
    BSR     prendre
    BSR     ecran           ; l'écran et les sprites (en bas du programme) s'affichent
    LEA     sprite,A0
    MOVE.W  #152,D4         ; x
    MOVE.W  #120,D5         ; y
.image:
    BSR     attendre_vbl
    MOVE.W  $DFF00C,D0      ; JOY1DAT : le joystick du port 2
    BTST    #1,D0           ; droite ?
    BEQ.S   .gauche
    ADDQ.W  #2,D4
.gauche:
    BTST    #9,D0           ; gauche ?
    BEQ.S   .vertical
    SUBQ.W  #2,D4
.vertical:
    MOVE.W  D0,D1
    LSR.W   #1,D1
    EOR.W   D0,D1           ; bit 0 = bas, bit 8 = haut
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
    BTST    #6,$BFE001      ; clic gauche : fini
    BNE.S   .image
    BSR     rendre
    MOVEQ   #0,D0
    RTS

; Affiche le plan à rayures ; le sprite 0 = « sprite », les autres = la liste vide
ecran:
    LEA     plan,A0         ; le décor : des rayures horizontales
    MOVE.W  #256/8-1,D7
.bande:
    MOVEQ   #40*4/4-1,D6
.plein:
    MOVE.L  #$FFFFFFFF,(A0)+
    DBF     D6,.plein
    LEA     40*4(A0),A0     ; 4 lignes pleines, 4 vides
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
    MOVE.L  #vide,D0        ; sprites 2 à 7 : la liste vide
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

; Place le sprite de 16 lignes en A0 au point (D0, D1) de l'image standard
placer_sprite:
    MOVEM.L D0-D3,-(SP)
    ADD.W   #$81,D0         ; HSTART
    ADD.W   #$2C,D1         ; VSTART
    MOVE.W  D1,D2
    ADD.W   #16,D2          ; VSTOP : la ligne après la dernière
    MOVEQ   #0,D3           ; les bits bas du second mot
    LSR.W   #1,D0           ; HSTART / 2 ; son bit 0 part dans X...
    ADDX.W  D3,D3           ; ... et arrive dans le bit 0 de D3
    BTST    #8,D1
    BEQ.S   .v1
    BSET    #2,D3           ; bit 8 de VSTART
.v1:
    BTST    #8,D2
    BEQ.S   .v2
    BSET    #1,D3           ; bit 8 de VSTOP
.v2:
    LSL.W   #8,D1           ; VSTART dans l'octet fort
    MOVE.B  D0,D1           ; HSTART / 2 dans l'octet faible
    MOVE.W  D1,(A0)         ; premier mot : SPRxPOS
    LSL.W   #8,D2
    MOVE.B  D3,D2
    MOVE.W  D2,2(A0)        ; second mot : SPRxCTL
    MOVEM.L (SP)+,D0-D3
    RTS
    INCLUDE "amiga-systeme.s"

    SECTION chip,DATA_C
copper:
    DC.W    $008E,$2C81,$0090,$2CC1,$0092,$0038,$0094,$00D0
    DC.W    $0102,$0000,$0104,$0024,$0108,$0000,$010A,$0000
    DC.W    $0180,$0000,$0182,$0444 ; le décor : noir et gris foncé
    DC.W    $01A2,$0F00,$01A4,$0FF0,$01A6,$0FFF ; COLOR17-19 : rouge, jaune, blanc
    DC.W    $0100,$1200
cop_plans:
    DC.W    $00E0,0,$00E2,0
cop_sprites:
    DC.W    $0120,0,$0122,0,$0124,0,$0126,0,$0128,0,$012A,0,$012C,0,$012E,0
    DC.W    $0130,0,$0132,0,$0134,0,$0136,0,$0138,0,$013A,0,$013C,0,$013E,0
    DC.W    $FFFF,$FFFE
vide:   DC.W    0,0

; Une balle de 16 x 16 : bord blanc (couleur 3), intérieur rouge (couleur 1)
sprite:
    DC.W    $7C72,$8C01     ; x = 100, y = 80 (voir le cours)
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
    MOVE.W  #$0103,D0       ; ce que lit JOY1DAT
    MOVE.W  D0,D1
    LSR.W   #1,D1
    EOR.W   D0,D1
    RTS

;=== feu-depart
; Attends que le bouton du joystick soit enfoncé, puis mets 1 dans D7.
START:
.attente:
    BTST    #6,$BFE001      ; <- le bit du bouton du joystick
    BNE.S   .attente
    MOVEQ   #1,D7
    MOVEQ   #0,D0           ; code de retour pour le Shell : tout va bien
    RTS

;=== feu-solution
START:
.attente:
    BTST    #7,$BFE001      ; bit 7 : le bouton du joystick (port 2)
    BNE.S   .attente
    MOVEQ   #1,D7
    MOVEQ   #0,D0           ; code de retour pour le Shell : tout va bien
    RTS

;=== souris-depart
; Mesure le déplacement horizontal de la souris pendant 5 images : la différence des compteurs
; (octet faible de JOY0DAT, $DFF00A), en nombre signé, dans D7.
START:

    MOVEQ   #0,D0           ; code de retour pour le Shell : tout va bien
    RTS
    INCLUDE "amiga-systeme.s"

;=== souris-solution
START:
    MOVE.B  $DFF00B,D6      ; l'octet faible de JOY0DAT : le compteur horizontal
    MOVEQ   #4,D5
.image:
    BSR     attendre_vbl
    DBF     D5,.image
    MOVE.B  $DFF00B,D7
    SUB.B   D6,D7           ; la différence, sur 8 bits
    EXT.W   D7
    EXT.L   D7              ; signée, sur 32 bits
    MOVEQ   #0,D0           ; code de retour pour le Shell : tout va bien
    RTS
    INCLUDE "amiga-systeme.s"

;=== clavier-depart
; Le système est coupé : lis toi-même la première touche à la CIA-A, mets son code dans D7
; (bits 6-0), puis fais la poignée de main et rends la main.
START:
    BSR     prendre

    BSR     rendre
    MOVEQ   #0,D0           ; code de retour pour le Shell : tout va bien
    RTS
    INCLUDE "amiga-systeme.s"

;=== clavier-solution
START:
    BSR     prendre
.attente:
    BTST    #3,$BFED01      ; ICR : un octet est arrivé ?
    BEQ.S   .attente
    MOVE.B  $BFEC01,D0      ; SDR
    NOT.B   D0
    ROR.B   #1,D0           ; bit 7 = relâchée, bits 6-0 = le code
    MOVEQ   #0,D7
    MOVE.B  D0,D7
    AND.B   #$7F,D7
    BSET    #6,$BFEE01      ; poignée de main : port série en sortie...
    MOVEQ   #100,D1
.pause:
    DBF     D1,.pause
    BCLR    #6,$BFEE01      ; ... puis en entrée
    BSR     rendre
    MOVEQ   #0,D0           ; code de retour pour le Shell : tout va bien
    RTS
    INCLUDE "amiga-systeme.s"

;=== qcm-bouton
    BTST    #7,$BFE001
    BEQ     tir

;=== bonus-attache-depart
; Deux sprites superposés : attache le sprite 1 au sprite 0 pour obtenir la couleur 21.
START:
    BSR     prendre
    BSR     ecran           ; l'écran et les sprites (en bas du programme) s'affichent
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS

; Affiche le plan à rayures ; le sprite 0 = « sprite », les autres = la liste vide
ecran:
    LEA     plan,A0         ; le décor : des rayures horizontales
    MOVE.W  #256/8-1,D7
.bande:
    MOVEQ   #40*4/4-1,D6
.plein:
    MOVE.L  #$FFFFFFFF,(A0)+
    DBF     D6,.plein
    LEA     40*4(A0),A0     ; 4 lignes pleines, 4 vides
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
    MOVE.L  #vide,D0        ; sprites 2 à 7 : la liste vide
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
    DC.W    $0180,$0000,$0182,$0444 ; le décor : noir et gris foncé
    DC.W    $01A2,$0F00,$01AA,$0F0F ; COLOR17 = rouge, COLOR21 = violet
    DC.W    $0100,$1200
cop_plans:
    DC.W    $00E0,0,$00E2,0
cop_sprites:
    DC.W    $0120,0,$0122,0,$0124,0,$0126,0,$0128,0,$012A,0,$012C,0,$012E,0
    DC.W    $0130,0,$0132,0,$0134,0,$0136,0,$0138,0,$013A,0,$013C,0,$013E,0
    DC.W    $FFFF,$FFFE
vide:   DC.W    0,0

; Sprite 0 : les bits 0 et 1 de la couleur ; sprite 1 (attaché) : les bits 2 et 3
sprite:
    DC.W    $7C72,$8C01
    DCB.L   16,$FFFF0000    ; bits 0-1 = %01
    DC.W    0,0
sprite1:
    DC.W    $7C72,$8C01         ; même position ; <- le bit 7 du second mot attache ce sprite au sprite 0
    DCB.L   16,$FFFF0000    ; bits 2-3 = %01
    DC.W    0,0

    SECTION ecran,BSS_C
plan:   DS.B    40*256

;=== bonus-attache-solution
START:
    BSR     prendre
    BSR     ecran           ; l'écran et les sprites (en bas du programme) s'affichent
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS

; Affiche le plan à rayures ; le sprite 0 = « sprite », les autres = la liste vide
ecran:
    LEA     plan,A0         ; le décor : des rayures horizontales
    MOVE.W  #256/8-1,D7
.bande:
    MOVEQ   #40*4/4-1,D6
.plein:
    MOVE.L  #$FFFFFFFF,(A0)+
    DBF     D6,.plein
    LEA     40*4(A0),A0     ; 4 lignes pleines, 4 vides
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
    MOVE.L  #vide,D0        ; sprites 2 à 7 : la liste vide
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
    DC.W    $0180,$0000,$0182,$0444 ; le décor : noir et gris foncé
    DC.W    $01A2,$0F00,$01AA,$0F0F ; COLOR17 = rouge, COLOR21 = violet
    DC.W    $0100,$1200
cop_plans:
    DC.W    $00E0,0,$00E2,0
cop_sprites:
    DC.W    $0120,0,$0122,0,$0124,0,$0126,0,$0128,0,$012A,0,$012C,0,$012E,0
    DC.W    $0130,0,$0132,0,$0134,0,$0136,0,$0138,0,$013A,0,$013C,0,$013E,0
    DC.W    $FFFF,$FFFE
vide:   DC.W    0,0

; Sprite 0 : les bits 0 et 1 de la couleur ; sprite 1 (attaché) : les bits 2 et 3
sprite:
    DC.W    $7C72,$8C01
    DCB.L   16,$FFFF0000    ; bits 0-1 = %01
    DC.W    0,0
sprite1:
    DC.W    $7C72,$8C81         ; même position ; bit 7 : attaché au sprite 0
    DCB.L   16,$FFFF0000    ; bits 2-3 = %01
    DC.W    0,0

    SECTION ecran,BSS_C
plan:   DS.B    40*256

