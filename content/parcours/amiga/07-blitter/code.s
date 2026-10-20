; Codes du chapitre 7 « Le Blitter ». Les programmes incluent content/fichiers/amiga-systeme.s.

;=== copie-exemple
START:
    BSR     prendre
    BSR     ecran           ; l'écran d'un plan (en bas du programme) s'affiche
    BSR     attendre_blitter ; le Blitter est-il libre ?
    MOVE.L  #$01000000,$40(A5)  ; BLTCON0 = $0100 : canal D seul, minterm 0 ; BLTCON1 = 0
    MOVE.L  #plan,$54(A5)   ; BLTDPT : le début du plan
    MOVE.W  #0,$66(A5)      ; BLTDMOD : on efface tout, sans rien sauter
    MOVE.W  #(256<<6)|20,$58(A5) ; BLTSIZE : 256 lignes de 20 mots. C'est parti !
    BSR     attendre_blitter
    MOVE.L  #$09F00000,$40(A5)  ; BLTCON0 = $09F0 : canaux A et D, D = A ; BLTCON1 = 0
    MOVE.L  #-1,$44(A5)     ; BLTAFWM = BLTALWM = $FFFF : rien de masqué
    MOVE.L  #bloc,$50(A5)   ; BLTAPT : la source, le bloc
    MOVE.L  #plan+100*40+64/8,$54(A5) ; BLTDPT : (64, 100) dans le plan
    MOVE.W  #0,$64(A5)      ; BLTAMOD : le bloc est d'un seul tenant
    MOVE.W  #40-4,$66(A5) ; BLTDMOD : 40 - 4 octets à sauter à chaque ligne de l'écran
    MOVE.W  #(16<<6)|2,$58(A5) ; BLTSIZE : 16 lignes de 2 mots, et c'est parti
    BSR     attendre_blitter
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS

; Affiche le plan (320 x 256, blanc sur noir) et allume le DMA du Blitter
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

; Un bloc plein de 32 x 16 (2 mots par ligne)
bloc:   DCB.L   16,$FFFFFFFF

    SECTION ecran,BSS_C
plan:   DS.B    40*256

;=== bltsize-prediction
START:
    MOVE.W  #20,D0          ; 20 lignes
    LSL.W   #6,D0           ; dans les bits 15-6
    OR.W    #4,D0           ; 4 mots de large (64 pixels)
    MOVEQ   #0,D1
    MOVE.W  #40,D1          ; un écran de 40 octets par ligne...
    SUB.W   #4*2,D1         ; ... moins les 8 octets du bloc
    RTS

;=== modulo-depart
START:
    BSR     prendre
    BSR     ecran           ; l'écran d'un plan (en bas du programme) s'affiche
    BSR     attendre_blitter
    MOVE.L  #$09F00000,$40(A5)  ; BLTCON0 = $09F0 : canaux A et D, D = A ; BLTCON1 = 0
    MOVE.L  #-1,$44(A5)     ; BLTAFWM = BLTALWM = $FFFF : rien de masqué
    MOVE.L  #bloc,$50(A5)   ; BLTAPT : la source, le bloc
    MOVE.L  #plan+100*40+64/8,$54(A5) ; BLTDPT : (64, 100) dans le plan
    MOVE.W  #0,$64(A5)      ; BLTAMOD : le bloc est d'un seul tenant
    MOVE.W  #0,$66(A5) ; BLTDMOD       ; <- le modulo de l'écran
    MOVE.W  #(16<<6)|2,$58(A5) ; BLTSIZE : 16 lignes de 2 mots, et c'est parti
    BSR     attendre_blitter
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS

; Affiche le plan (320 x 256, blanc sur noir) et allume le DMA du Blitter
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

; Un bloc plein de 32 x 16 (2 mots par ligne)
bloc:   DCB.L   16,$FFFFFFFF

    SECTION ecran,BSS_C
plan:   DS.B    40*256

;=== modulo-solution
START:
    BSR     prendre
    BSR     ecran           ; l'écran d'un plan (en bas du programme) s'affiche
    BSR     attendre_blitter
    MOVE.L  #$09F00000,$40(A5)  ; BLTCON0 = $09F0 : canaux A et D, D = A ; BLTCON1 = 0
    MOVE.L  #-1,$44(A5)     ; BLTAFWM = BLTALWM = $FFFF : rien de masqué
    MOVE.L  #bloc,$50(A5)   ; BLTAPT : la source, le bloc
    MOVE.L  #plan+100*40+64/8,$54(A5) ; BLTDPT : (64, 100) dans le plan
    MOVE.W  #0,$64(A5)      ; BLTAMOD : le bloc est d'un seul tenant
    MOVE.W  #40-4,$66(A5) ; BLTDMOD : 40 - 4 octets à sauter
    MOVE.W  #(16<<6)|2,$58(A5) ; BLTSIZE : 16 lignes de 2 mots, et c'est parti
    BSR     attendre_blitter
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS

; Affiche le plan (320 x 256, blanc sur noir) et allume le DMA du Blitter
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

; Un bloc plein de 32 x 16 (2 mots par ligne)
bloc:   DCB.L   16,$FFFFFFFF

    SECTION ecran,BSS_C
plan:   DS.B    40*256

;=== presse-depart
START:
    BSR     prendre
    BSR     ecran           ; l'écran d'un plan (en bas du programme) s'affiche
    MOVE.L  #$01000000,$40(A5)  ; effacer tout le plan
    MOVE.L  #plan,$54(A5)
    MOVE.W  #0,$66(A5)
    MOVE.W  #(256<<6)|20,$58(A5)
    MOVE.L  #$09F00000,$40(A5)  ; puis copier le bloc
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

; Affiche le plan (320 x 256, blanc sur noir) et allume le DMA du Blitter
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

; Un bloc plein de 32 x 16 (2 mots par ligne)
bloc:   DCB.L   16,$FFFFFFFF

    SECTION ecran,BSS_C
plan:   DS.B    40*256

;=== presse-solution
START:
    BSR     prendre
    BSR     ecran           ; l'écran d'un plan (en bas du programme) s'affiche
    MOVE.L  #$01000000,$40(A5)  ; effacer tout le plan
    MOVE.L  #plan,$54(A5)
    MOVE.W  #0,$66(A5)
    MOVE.W  #(256<<6)|20,$58(A5)
    BSR     attendre_blitter ; le Blitter doit avoir fini d'effacer
    MOVE.L  #$09F00000,$40(A5)  ; puis copier le bloc
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

; Affiche le plan (320 x 256, blanc sur noir) et allume le DMA du Blitter
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

; Un bloc plein de 32 x 16 (2 mots par ligne)
bloc:   DCB.L   16,$FFFFFFFF

    SECTION ecran,BSS_C
plan:   DS.B    40*256

;=== effacer-depart
; Le fond est blanc. Efface avec le Blitter le rectangle x = 32 à 95, y = 50 à 99.
START:
    BSR     prendre
    BSR     ecran           ; l'écran d'un plan (en bas du programme) s'affiche
    LEA     plan,A0         ; le fond : tout le plan à 1 (blanc)
    MOVE.W  #40*256/4-1,D7
.fond:
    MOVE.L  #$FFFFFFFF,(A0)+
    DBF     D7,.fond
    ; Efface (couleur 0) le rectangle x = 32 à 95, y = 50 à 99, avec le Blitter

    BSR     attendre_blitter
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS

; Affiche le plan (320 x 256, blanc sur noir) et allume le DMA du Blitter
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
    BSR     ecran           ; l'écran d'un plan (en bas du programme) s'affiche
    LEA     plan,A0         ; le fond : tout le plan à 1 (blanc)
    MOVE.W  #40*256/4-1,D7
.fond:
    MOVE.L  #$FFFFFFFF,(A0)+
    DBF     D7,.fond
    BSR     attendre_blitter
    MOVE.L  #$01000000,$40(A5)  ; canal D seul, minterm 0
    MOVE.L  #plan+50*40+32/8,$54(A5) ; le coin (32, 50)
    MOVE.W  #40-8,$66(A5)   ; 64 pixels = 8 octets par ligne, 32 à sauter
    MOVE.W  #(50<<6)|4,$58(A5) ; 50 lignes de 4 mots
    BSR     attendre_blitter
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS

; Affiche le plan (320 x 256, blanc sur noir) et allume le DMA du Blitter
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
    BSR     ecran           ; l'écran d'un plan (en bas du programme) s'affiche
    LEA     plan,A0         ; le fond : des rayures verticales (4 pixels sur 8)
    MOVE.W  #40*256/4-1,D7
.fond:
    MOVE.L  #$0F0F0F0F,(A0)+
    DBF     D7,.fond
    BSR     attendre_blitter
    MOVE.L  #$0BFA0000,$40(A5)  ; BLTCON0 = $0BFA : canaux A, C, D ; D = A OU C
    MOVE.L  #-1,$44(A5)
    MOVE.L  #bloc,$50(A5)   ; A : le bloc
    MOVE.L  #plan+100*40+64/8,D0
    MOVE.L  D0,$48(A5)      ; C : le fond, à l'endroit où l'on pose
    MOVE.L  D0,$54(A5)      ; D : au même endroit
    MOVE.W  #0,$64(A5)      ; BLTAMOD
    MOVE.W  #36,$60(A5)     ; BLTCMOD
    MOVE.W  #36,$66(A5)     ; BLTDMOD : C et D parcourent l'écran ensemble
    MOVE.W  #(16<<6)|2,$58(A5)
    BSR     attendre_blitter
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS

; Affiche le plan (320 x 256, blanc sur noir) et allume le DMA du Blitter
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

; Un dessin de 32 x 16 : un cadre (bord plein, intérieur vide)
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
    AND.B   #$CC,D1         ; A ET B
    MOVE.B  #$F0,D2
    NOT.B   D2              ; NON A
    AND.B   #$AA,D2         ; NON A ET C
    OR.B    D2,D1           ; (A ET B) OU (NON A ET C)
    RTS

;=== inverser-depart
; Inverse avec le Blitter la zone x = 64 à 127, y = 64 à 95 (sur le fond à rayures).
START:
    BSR     prendre
    BSR     ecran           ; l'écran d'un plan (en bas du programme) s'affiche
    LEA     plan,A0         ; le fond : des rayures verticales (4 pixels sur 8)
    MOVE.W  #40*256/4-1,D7
.fond:
    MOVE.L  #$0F0F0F0F,(A0)+
    DBF     D7,.fond
    BSR     attendre_blitter
    MOVE.L  #$03000000,$40(A5) ; BLTCON0 : canaux C et D, et le minterm   ; <- D = NON C
    MOVE.L  #plan+64*40+64/8,D0
    MOVE.L  D0,$48(A5)      ; C : la zone
    MOVE.L  D0,$54(A5)      ; D : la même zone
    MOVE.W  #40-8,$60(A5)
    MOVE.W  #40-8,$66(A5)
    MOVE.W  #(32<<6)|4,$58(A5) ; 64 x 32 pixels
    BSR     attendre_blitter
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS

; Affiche le plan (320 x 256, blanc sur noir) et allume le DMA du Blitter
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
    BSR     ecran           ; l'écran d'un plan (en bas du programme) s'affiche
    LEA     plan,A0         ; le fond : des rayures verticales (4 pixels sur 8)
    MOVE.W  #40*256/4-1,D7
.fond:
    MOVE.L  #$0F0F0F0F,(A0)+
    DBF     D7,.fond
    BSR     attendre_blitter
    MOVE.L  #$03550000,$40(A5) ; BLTCON0 : canaux C et D, et le minterm : $55 = NON $AA
    MOVE.L  #plan+64*40+64/8,D0
    MOVE.L  D0,$48(A5)      ; C : la zone
    MOVE.L  D0,$54(A5)      ; D : la même zone
    MOVE.W  #40-8,$60(A5)
    MOVE.W  #40-8,$66(A5)
    MOVE.W  #(32<<6)|4,$58(A5) ; 64 x 32 pixels
    BSR     attendre_blitter
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS

; Affiche le plan (320 x 256, blanc sur noir) et allume le DMA du Blitter
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
; Le « cookie-cut » : A = le masque, B = le dessin, C = le décor, D = le décor.
START:
    BSR     prendre
    BSR     ecran           ; l'écran d'un plan (en bas du programme) s'affiche
    LEA     plan,A0         ; le fond : des rayures verticales (4 pixels sur 8)
    MOVE.W  #40*256/4-1,D7
.fond:
    MOVE.L  #$0F0F0F0F,(A0)+
    DBF     D7,.fond
    ; Pose le dessin en (64, 80) avec son masque, sans abîmer les rayures autour.

    BSR     attendre_blitter
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS

; Affiche le plan (320 x 256, blanc sur noir) et allume le DMA du Blitter
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

; Le masque (A) : un carré de 16 x 16. Le dessin (B) : moitié gauche blanche, moitié droite noire.
masque: DCB.W   16,$FFFF
dessin: DCB.W   16,$FF00

    SECTION ecran,BSS_C
plan:   DS.B    40*256

;=== cookie-solution
START:
    BSR     prendre
    BSR     ecran           ; l'écran d'un plan (en bas du programme) s'affiche
    LEA     plan,A0         ; le fond : des rayures verticales (4 pixels sur 8)
    MOVE.W  #40*256/4-1,D7
.fond:
    MOVE.L  #$0F0F0F0F,(A0)+
    DBF     D7,.fond
    BSR     attendre_blitter
    MOVE.L  #$0FCA0000,$40(A5)  ; les 4 canaux ; D = (A ET B) OU (NON A ET C)
    MOVE.L  #-1,$44(A5)
    MOVE.L  #masque,$50(A5) ; A : le masque
    MOVE.L  #dessin,$4C(A5) ; B : le dessin
    MOVE.L  #plan+80*40+64/8,D0
    MOVE.L  D0,$48(A5)      ; C : le décor
    MOVE.L  D0,$54(A5)      ; D : le même endroit
    MOVE.W  #0,$64(A5)      ; A et B : d'un seul tenant
    MOVE.W  #0,$62(A5)
    MOVE.W  #38,$60(A5)     ; C et D : 40 - 2 octets
    MOVE.W  #38,$66(A5)
    MOVE.W  #(16<<6)|1,$58(A5) ; 16 lignes d'un mot
    BSR     attendre_blitter
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS

; Affiche le plan (320 x 256, blanc sur noir) et allume le DMA du Blitter
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

; Le masque (A) : un carré de 16 x 16. Le dessin (B) : moitié gauche blanche, moitié droite noire.
masque: DCB.W   16,$FFFF
dessin: DCB.W   16,$FF00

    SECTION ecran,BSS_C
plan:   DS.B    40*256

;=== decalage-exemple
START:
    BSR     prendre
    BSR     ecran           ; l'écran d'un plan (en bas du programme) s'affiche
    BSR     attendre_blitter
    MOVE.W  #37,D0         ; x
    MOVE.W  D0,D1
    AND.W   #15,D1          ; le décalage : x mod 16
    ROR.W   #4,D1           ; dans les bits 15-12
    OR.W    #$09F0,D1       ; canaux A et D, D = A
    MOVE.W  D1,$40(A5)      ; BLTCON0
    MOVE.W  #0,$42(A5)      ; BLTCON1
    MOVE.W  #$FFFF,$44(A5)  ; BLTAFWM
    MOVE.W  #$0000,$46(A5)  ; BLTALWM : le mot de plus est vidé
    MOVE.L  #carre,$50(A5)
    LSR.W   #4,D0           ; x / 16 : le numéro du mot...
    ADD.W   D0,D0           ; ... en octets
    LEA     plan+60*40,A0
    ADDA.W  D0,A0
    MOVE.L  A0,$54(A5)
    MOVE.W  #-2,$64(A5)     ; BLTAMOD : on a lu un mot de trop
    MOVE.W  #40-4,$66(A5)   ; BLTDMOD : 2 mots par ligne
    MOVE.W  #(16<<6)|2,$58(A5)
    BSR     attendre_blitter
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS

; Affiche le plan (320 x 256, blanc sur noir) et allume le DMA du Blitter
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

; Un carré plein de 16 x 16 (1 mot par ligne)
carre:  DCB.W   16,$FFFF

    SECTION ecran,BSS_C
plan:   DS.B    40*256

;=== decalage-prediction
START:
    MOVE.W  #100,D0         ; x
    MOVE.W  D0,D1
    AND.W   #15,D1          ; le décalage
    MOVE.W  D0,D2
    LSR.W   #4,D2
    ADD.W   D2,D2           ; l'octet du premier mot
    MOVE.W  D1,D3
    ROR.W   #4,D3
    OR.W    #$09F0,D3       ; BLTCON0
    RTS

;=== ash-depart
; Pose le carré de 16 x 16 en x = 70, y = 100.
START:
    BSR     prendre
    BSR     ecran           ; l'écran d'un plan (en bas du programme) s'affiche
    BSR     attendre_blitter
    MOVE.W  #$09F0,$40(A5)  ; <- BLTCON0 : il manque le décalage de A
    MOVE.W  #0,$42(A5)
    MOVE.W  #$FFFF,$44(A5)
    MOVE.W  #$0000,$46(A5)
    MOVE.L  #carre,$50(A5)
    MOVE.L  #plan+100*40+64/8,$54(A5) ; le mot qui contient x = 70
    MOVE.W  #-2,$64(A5)
    MOVE.W  #40-4,$66(A5)
    MOVE.W  #(16<<6)|2,$58(A5)
    BSR     attendre_blitter
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS

; Affiche le plan (320 x 256, blanc sur noir) et allume le DMA du Blitter
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

; Un carré plein de 16 x 16 (1 mot par ligne)
carre:  DCB.W   16,$FFFF

    SECTION ecran,BSS_C
plan:   DS.B    40*256

;=== ash-solution
START:
    BSR     prendre
    BSR     ecran           ; l'écran d'un plan (en bas du programme) s'affiche
    BSR     attendre_blitter
    MOVE.W  #$69F0,$40(A5)  ; BLTCON0 : décalage 70 mod 16 = 6
    MOVE.W  #0,$42(A5)
    MOVE.W  #$FFFF,$44(A5)
    MOVE.W  #$0000,$46(A5)
    MOVE.L  #carre,$50(A5)
    MOVE.L  #plan+100*40+64/8,$54(A5) ; le mot qui contient x = 70
    MOVE.W  #-2,$64(A5)
    MOVE.W  #40-4,$66(A5)
    MOVE.W  #(16<<6)|2,$58(A5)
    BSR     attendre_blitter
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS

; Affiche le plan (320 x 256, blanc sur noir) et allume le DMA du Blitter
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

; Un carré plein de 16 x 16 (1 mot par ligne)
carre:  DCB.W   16,$FFFF

    SECTION ecran,BSS_C
plan:   DS.B    40*256

;=== nimporte-depart
; Pose le carré de 16 x 16 (étiquette carre) en x = 123, y = 40, avec le Blitter.
START:
    BSR     prendre
    BSR     ecran           ; l'écran d'un plan (en bas du programme) s'affiche
    ; Pose le carré en x = 123, y = 40

    BSR     attendre_blitter
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS

; Affiche le plan (320 x 256, blanc sur noir) et allume le DMA du Blitter
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

; Un carré plein de 16 x 16 (1 mot par ligne)
carre:  DCB.W   16,$FFFF

    SECTION ecran,BSS_C
plan:   DS.B    40*256

;=== nimporte-solution
START:
    BSR     prendre
    BSR     ecran           ; l'écran d'un plan (en bas du programme) s'affiche
    BSR     attendre_blitter
    MOVE.W  #123,D0         ; x
    MOVE.W  D0,D1
    AND.W   #15,D1          ; le décalage : x mod 16
    ROR.W   #4,D1           ; dans les bits 15-12
    OR.W    #$09F0,D1       ; canaux A et D, D = A
    MOVE.W  D1,$40(A5)      ; BLTCON0
    MOVE.W  #0,$42(A5)      ; BLTCON1
    MOVE.W  #$FFFF,$44(A5)  ; BLTAFWM
    MOVE.W  #$0000,$46(A5)  ; BLTALWM : le mot de plus est vidé
    MOVE.L  #carre,$50(A5)
    LSR.W   #4,D0           ; x / 16 : le numéro du mot...
    ADD.W   D0,D0           ; ... en octets
    LEA     plan+40*40,A0
    ADDA.W  D0,A0
    MOVE.L  A0,$54(A5)
    MOVE.W  #-2,$64(A5)     ; BLTAMOD : on a lu un mot de trop
    MOVE.W  #40-4,$66(A5)   ; BLTDMOD : 2 mots par ligne
    MOVE.W  #(16<<6)|2,$58(A5)
    BSR     attendre_blitter
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS

; Affiche le plan (320 x 256, blanc sur noir) et allume le DMA du Blitter
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

; Un carré plein de 16 x 16 (1 mot par ligne)
carre:  DCB.W   16,$FFFF

    SECTION ecran,BSS_C
plan:   DS.B    40*256

;=== lignes-exemple
START:
    BSR     prendre
    BSR     ecran           ; l'écran d'un plan (en bas du programme) s'affiche
    MOVE.W  #160,D0         ; une étoile : 8 lignes depuis le centre (160, 128)
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

; Affiche le plan (320 x 256, blanc sur noir) et allume le DMA du Blitter
ecran:
    MOVE.L  #plan,D0
    MOVE.W  D0,cop_plans+6
    SWAP    D0
    MOVE.W  D0,cop_plans+2
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$83C0,$96(A5)  ; DMAEN + BPLEN + COPEN + BLTEN
    RTS

; Trace une ligne de (D0,D1) à (D2,D3) dans le plan (40 octets par ligne). Modifie D0-D6 et A0.
ligne:
    LEA     plan,A0
    MOVEQ   #0,D4           ; l'octant, bit par bit
    SUB.W   D0,D2           ; dx = x2 - x1
    BPL.S   .dx
    NEG.W   D2
    MOVEQ   #1,D5           ; vers la gauche
    BRA.S   .y
.dx:
    MOVEQ   #0,D5           ; vers la droite
.y:
    SUB.W   D1,D3           ; dy = y2 - y1
    BPL.S   .dy
    NEG.W   D3
    MOVEQ   #1,D6           ; vers le haut
    BRA.S   .octant
.dy:
    MOVEQ   #0,D6           ; vers le bas
.octant:
    CMP.W   D3,D2
    BLT.S   .vertical
    BSET    #4,D4           ; plus large que haute : SUD, le pas « parfois » est vertical
    TST.W   D6
    BEQ.S   .h1
    BSET    #3,D4           ; SUL : ce pas va vers le haut
.h1:
    TST.W   D5
    BEQ.S   .calcul
    BSET    #2,D4           ; AUL : le pas « toujours » va vers la gauche
    BRA.S   .calcul
.vertical:
    TST.W   D5
    BEQ.S   .v1
    BSET    #3,D4           ; SUL : le pas « parfois » (horizontal) va vers la gauche
.v1:
    TST.W   D6
    BEQ.S   .v2
    BSET    #2,D4           ; AUL : le pas « toujours » (vertical) va vers le haut
.v2:
    EXG     D2,D3           ; D2 = dmax, D3 = dmin
.calcul:
    MULU    #40,D1          ; l'adresse du mot de départ
    ADDA.L  D1,A0
    MOVE.W  D0,D1
    LSR.W   #3,D1
    AND.W   #$FFFE,D1
    ADDA.W  D1,A0
    AND.W   #15,D0          ; le bit de départ dans ce mot...
    ROR.W   #4,D0           ; ... dans les bits 15-12 de BLTCON0
    OR.W    #$0BCA,D0       ; canaux A, C, D ; minterm $CA
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
    BSET    #0,D4           ; LINE : le mode ligne
    LSR.W   #1,D2
    ADDQ.W  #1,D2           ; dmax + 1 points
    LSL.W   #6,D2
    ADDQ.W  #2,D2           ; BLTSIZE
    BSR     attendre_blitter
    MOVE.W  D0,$40(A5)      ; BLTCON0
    MOVE.W  D4,$42(A5)      ; BLTCON1
    MOVE.L  #-1,$44(A5)     ; BLTAFWM, BLTALWM
    MOVE.W  #$8000,$74(A5)  ; BLTADAT : un point
    MOVE.W  #$FFFF,$72(A5)  ; BLTBDAT : trait plein
    MOVE.W  D3,$62(A5)      ; BLTBMOD = 4 dmin
    MOVE.W  D6,$64(A5)      ; BLTAMOD = 4 (dmin - dmax)
    MOVE.W  D5,$52(A5)      ; BLTAPTL = 4 dmin - 2 dmax
    MOVE.W  #40,$60(A5)     ; BLTCMOD
    MOVE.W  #40,$66(A5)     ; BLTDMOD
    MOVE.L  A0,$48(A5)      ; BLTCPT
    MOVE.L  A0,$54(A5)      ; BLTDPT
    MOVE.W  D2,$58(A5)      ; BLTSIZE : c'est parti
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
; Dessine le contour du carré de coins (50, 50) et (150, 150) avec la routine ligne.
START:
    BSR     prendre
    BSR     ecran           ; l'écran d'un plan (en bas du programme) s'affiche
    ; Le contour du carré (50, 50) - (150, 150) : quatre appels à ligne

    BSR     attendre_blitter
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS

; Affiche le plan (320 x 256, blanc sur noir) et allume le DMA du Blitter
ecran:
    MOVE.L  #plan,D0
    MOVE.W  D0,cop_plans+6
    SWAP    D0
    MOVE.W  D0,cop_plans+2
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$83C0,$96(A5)  ; DMAEN + BPLEN + COPEN + BLTEN
    RTS

; Trace une ligne de (D0,D1) à (D2,D3) dans le plan (40 octets par ligne). Modifie D0-D6 et A0.
ligne:
    LEA     plan,A0
    MOVEQ   #0,D4           ; l'octant, bit par bit
    SUB.W   D0,D2           ; dx = x2 - x1
    BPL.S   .dx
    NEG.W   D2
    MOVEQ   #1,D5           ; vers la gauche
    BRA.S   .y
.dx:
    MOVEQ   #0,D5           ; vers la droite
.y:
    SUB.W   D1,D3           ; dy = y2 - y1
    BPL.S   .dy
    NEG.W   D3
    MOVEQ   #1,D6           ; vers le haut
    BRA.S   .octant
.dy:
    MOVEQ   #0,D6           ; vers le bas
.octant:
    CMP.W   D3,D2
    BLT.S   .vertical
    BSET    #4,D4           ; plus large que haute : SUD, le pas « parfois » est vertical
    TST.W   D6
    BEQ.S   .h1
    BSET    #3,D4           ; SUL : ce pas va vers le haut
.h1:
    TST.W   D5
    BEQ.S   .calcul
    BSET    #2,D4           ; AUL : le pas « toujours » va vers la gauche
    BRA.S   .calcul
.vertical:
    TST.W   D5
    BEQ.S   .v1
    BSET    #3,D4           ; SUL : le pas « parfois » (horizontal) va vers la gauche
.v1:
    TST.W   D6
    BEQ.S   .v2
    BSET    #2,D4           ; AUL : le pas « toujours » (vertical) va vers le haut
.v2:
    EXG     D2,D3           ; D2 = dmax, D3 = dmin
.calcul:
    MULU    #40,D1          ; l'adresse du mot de départ
    ADDA.L  D1,A0
    MOVE.W  D0,D1
    LSR.W   #3,D1
    AND.W   #$FFFE,D1
    ADDA.W  D1,A0
    AND.W   #15,D0          ; le bit de départ dans ce mot...
    ROR.W   #4,D0           ; ... dans les bits 15-12 de BLTCON0
    OR.W    #$0BCA,D0       ; canaux A, C, D ; minterm $CA
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
    BSET    #0,D4           ; LINE : le mode ligne
    LSR.W   #1,D2
    ADDQ.W  #1,D2           ; dmax + 1 points
    LSL.W   #6,D2
    ADDQ.W  #2,D2           ; BLTSIZE
    BSR     attendre_blitter
    MOVE.W  D0,$40(A5)      ; BLTCON0
    MOVE.W  D4,$42(A5)      ; BLTCON1
    MOVE.L  #-1,$44(A5)     ; BLTAFWM, BLTALWM
    MOVE.W  #$8000,$74(A5)  ; BLTADAT : un point
    MOVE.W  #$FFFF,$72(A5)  ; BLTBDAT : trait plein
    MOVE.W  D3,$62(A5)      ; BLTBMOD = 4 dmin
    MOVE.W  D6,$64(A5)      ; BLTAMOD = 4 (dmin - dmax)
    MOVE.W  D5,$52(A5)      ; BLTAPTL = 4 dmin - 2 dmax
    MOVE.W  #40,$60(A5)     ; BLTCMOD
    MOVE.W  #40,$66(A5)     ; BLTDMOD
    MOVE.L  A0,$48(A5)      ; BLTCPT
    MOVE.L  A0,$54(A5)      ; BLTDPT
    MOVE.W  D2,$58(A5)      ; BLTSIZE : c'est parti
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
    BSR     ecran           ; l'écran d'un plan (en bas du programme) s'affiche
    MOVE.W  #50,D0
    MOVE.W  #50,D1
    MOVE.W  #150,D2
    MOVE.W  #50,D3
    BSR     ligne           ; le haut
    MOVE.W  #150,D0
    MOVE.W  #50,D1
    MOVE.W  #150,D2
    MOVE.W  #150,D3
    BSR     ligne           ; la droite
    MOVE.W  #150,D0
    MOVE.W  #150,D1
    MOVE.W  #50,D2
    MOVE.W  #150,D3
    BSR     ligne           ; le bas
    MOVE.W  #50,D0
    MOVE.W  #150,D1
    MOVE.W  #50,D2
    MOVE.W  #50,D3
    BSR     ligne           ; la gauche
    BSR     attendre_blitter
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS

; Affiche le plan (320 x 256, blanc sur noir) et allume le DMA du Blitter
ecran:
    MOVE.L  #plan,D0
    MOVE.W  D0,cop_plans+6
    SWAP    D0
    MOVE.W  D0,cop_plans+2
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$83C0,$96(A5)  ; DMAEN + BPLEN + COPEN + BLTEN
    RTS

; Trace une ligne de (D0,D1) à (D2,D3) dans le plan (40 octets par ligne). Modifie D0-D6 et A0.
ligne:
    LEA     plan,A0
    MOVEQ   #0,D4           ; l'octant, bit par bit
    SUB.W   D0,D2           ; dx = x2 - x1
    BPL.S   .dx
    NEG.W   D2
    MOVEQ   #1,D5           ; vers la gauche
    BRA.S   .y
.dx:
    MOVEQ   #0,D5           ; vers la droite
.y:
    SUB.W   D1,D3           ; dy = y2 - y1
    BPL.S   .dy
    NEG.W   D3
    MOVEQ   #1,D6           ; vers le haut
    BRA.S   .octant
.dy:
    MOVEQ   #0,D6           ; vers le bas
.octant:
    CMP.W   D3,D2
    BLT.S   .vertical
    BSET    #4,D4           ; plus large que haute : SUD, le pas « parfois » est vertical
    TST.W   D6
    BEQ.S   .h1
    BSET    #3,D4           ; SUL : ce pas va vers le haut
.h1:
    TST.W   D5
    BEQ.S   .calcul
    BSET    #2,D4           ; AUL : le pas « toujours » va vers la gauche
    BRA.S   .calcul
.vertical:
    TST.W   D5
    BEQ.S   .v1
    BSET    #3,D4           ; SUL : le pas « parfois » (horizontal) va vers la gauche
.v1:
    TST.W   D6
    BEQ.S   .v2
    BSET    #2,D4           ; AUL : le pas « toujours » (vertical) va vers le haut
.v2:
    EXG     D2,D3           ; D2 = dmax, D3 = dmin
.calcul:
    MULU    #40,D1          ; l'adresse du mot de départ
    ADDA.L  D1,A0
    MOVE.W  D0,D1
    LSR.W   #3,D1
    AND.W   #$FFFE,D1
    ADDA.W  D1,A0
    AND.W   #15,D0          ; le bit de départ dans ce mot...
    ROR.W   #4,D0           ; ... dans les bits 15-12 de BLTCON0
    OR.W    #$0BCA,D0       ; canaux A, C, D ; minterm $CA
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
    BSET    #0,D4           ; LINE : le mode ligne
    LSR.W   #1,D2
    ADDQ.W  #1,D2           ; dmax + 1 points
    LSL.W   #6,D2
    ADDQ.W  #2,D2           ; BLTSIZE
    BSR     attendre_blitter
    MOVE.W  D0,$40(A5)      ; BLTCON0
    MOVE.W  D4,$42(A5)      ; BLTCON1
    MOVE.L  #-1,$44(A5)     ; BLTAFWM, BLTALWM
    MOVE.W  #$8000,$74(A5)  ; BLTADAT : un point
    MOVE.W  #$FFFF,$72(A5)  ; BLTBDAT : trait plein
    MOVE.W  D3,$62(A5)      ; BLTBMOD = 4 dmin
    MOVE.W  D6,$64(A5)      ; BLTAMOD = 4 (dmin - dmax)
    MOVE.W  D5,$52(A5)      ; BLTAPTL = 4 dmin - 2 dmax
    MOVE.W  #40,$60(A5)     ; BLTCMOD
    MOVE.W  #40,$66(A5)     ; BLTDMOD
    MOVE.L  A0,$48(A5)      ; BLTCPT
    MOVE.L  A0,$54(A5)      ; BLTDPT
    MOVE.W  D2,$58(A5)      ; BLTSIZE : c'est parti
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
    BSR     ecran           ; l'écran d'un plan (en bas du programme) s'affiche
    LEA     plan+60*40,A0   ; deux bords verticaux, x = 40 et x = 200, lignes 60 à 159
    MOVEQ   #99,D7
.bord:
    BSET    #7-(40&7),40/8(A0)
    BSET    #7-(200&7),200/8(A0)
    LEA     40(A0),A0
    DBF     D7,.bord
    BSR     attendre_blitter
    MOVE.L  #$09F0000A,$40(A5) ; BLTCON0 = $09F0 (D = A) ; BLTCON1 = $000A : IFE (remplissage inclusif) + DESC
    MOVE.L  #-1,$44(A5)
    MOVE.L  #plan+159*40+38,D0  ; le DERNIER mot de la zone (mode descendant)
    MOVE.L  D0,$50(A5)      ; A : la zone
    MOVE.L  D0,$54(A5)      ; D : la même zone
    MOVE.W  #0,$64(A5)
    MOVE.W  #0,$66(A5)
    MOVE.W  #(100<<6)|20,$58(A5) ; 100 lignes entières
    BSR     attendre_blitter
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS

; Affiche le plan (320 x 256, blanc sur noir) et allume le DMA du Blitter
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
    BSR     ecran           ; l'écran d'un plan (en bas du programme) s'affiche
    LEA     plan+60*40,A0   ; deux bords verticaux, x = 40 et x = 200, lignes 60 à 159
    MOVEQ   #99,D7
.bord:
    BSET    #7-(40&7),40/8(A0)
    BSET    #7-(200&7),200/8(A0)
    LEA     40(A0),A0
    DBF     D7,.bord
    BSR     attendre_blitter
    MOVE.L  #$09F00002,$40(A5) ; BLTCON0 = $09F0 (D = A) ; BLTCON1 : <- DESC seul, il manque le remplissage
    MOVE.L  #-1,$44(A5)
    MOVE.L  #plan+159*40+38,D0  ; le DERNIER mot de la zone (mode descendant)
    MOVE.L  D0,$50(A5)      ; A : la zone
    MOVE.L  D0,$54(A5)      ; D : la même zone
    MOVE.W  #0,$64(A5)
    MOVE.W  #0,$66(A5)
    MOVE.W  #(100<<6)|20,$58(A5) ; 100 lignes entières
    BSR     attendre_blitter
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS

; Affiche le plan (320 x 256, blanc sur noir) et allume le DMA du Blitter
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
    BSR     ecran           ; l'écran d'un plan (en bas du programme) s'affiche
    LEA     plan+60*40,A0   ; deux bords verticaux, x = 40 et x = 200, lignes 60 à 159
    MOVEQ   #99,D7
.bord:
    BSET    #7-(40&7),40/8(A0)
    BSET    #7-(200&7),200/8(A0)
    LEA     40(A0),A0
    DBF     D7,.bord
    BSR     attendre_blitter
    MOVE.L  #$09F0000A,$40(A5) ; BLTCON0 = $09F0 (D = A) ; BLTCON1 = IFE + DESC
    MOVE.L  #-1,$44(A5)
    MOVE.L  #plan+159*40+38,D0  ; le DERNIER mot de la zone (mode descendant)
    MOVE.L  D0,$50(A5)      ; A : la zone
    MOVE.L  D0,$54(A5)      ; D : la même zone
    MOVE.W  #0,$64(A5)
    MOVE.W  #0,$66(A5)
    MOVE.W  #(100<<6)|20,$58(A5) ; 100 lignes entières
    BSR     attendre_blitter
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS

; Affiche le plan (320 x 256, blanc sur noir) et allume le DMA du Blitter
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
; Un triangle plein : deux bords en mode SING, puis le remplissage du Blitter.
START:
    BSR     prendre
    BSR     ecran           ; l'écran d'un plan (en bas du programme) s'affiche
    ; Le triangle plein (160, 40), (60, 200), (260, 200) : ses deux bords obliques avec bord,
    ; puis un remplissage

    BSR     attendre_blitter
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS

; Affiche le plan (320 x 256, blanc sur noir) et allume le DMA du Blitter
ecran:
    MOVE.L  #plan,D0
    MOVE.W  D0,cop_plans+6
    SWAP    D0
    MOVE.W  D0,cop_plans+2
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$83C0,$96(A5)  ; DMAEN + BPLEN + COPEN + BLTEN
    RTS

; Trace un bord de (D0,D1) à (D2,D3) : un seul point par ligne (SING), en OU exclusif ($4A).
bord:
    LEA     plan,A0
    MOVEQ   #0,D4           ; l'octant, bit par bit
    SUB.W   D0,D2           ; dx = x2 - x1
    BPL.S   .dx
    NEG.W   D2
    MOVEQ   #1,D5           ; vers la gauche
    BRA.S   .y
.dx:
    MOVEQ   #0,D5           ; vers la droite
.y:
    SUB.W   D1,D3           ; dy = y2 - y1
    BPL.S   .dy
    NEG.W   D3
    MOVEQ   #1,D6           ; vers le haut
    BRA.S   .octant
.dy:
    MOVEQ   #0,D6           ; vers le bas
.octant:
    CMP.W   D3,D2
    BLT.S   .vertical
    BSET    #4,D4           ; plus large que haute : SUD, le pas « parfois » est vertical
    TST.W   D6
    BEQ.S   .h1
    BSET    #3,D4           ; SUL : ce pas va vers le haut
.h1:
    TST.W   D5
    BEQ.S   .calcul
    BSET    #2,D4           ; AUL : le pas « toujours » va vers la gauche
    BRA.S   .calcul
.vertical:
    TST.W   D5
    BEQ.S   .v1
    BSET    #3,D4           ; SUL : le pas « parfois » (horizontal) va vers la gauche
.v1:
    TST.W   D6
    BEQ.S   .v2
    BSET    #2,D4           ; AUL : le pas « toujours » (vertical) va vers le haut
.v2:
    EXG     D2,D3           ; D2 = dmax, D3 = dmin
.calcul:
    MULU    #40,D1          ; l'adresse du mot de départ
    ADDA.L  D1,A0
    MOVE.W  D0,D1
    LSR.W   #3,D1
    AND.W   #$FFFE,D1
    ADDA.W  D1,A0
    AND.W   #15,D0          ; le bit de départ dans ce mot...
    ROR.W   #4,D0           ; ... dans les bits 15-12 de BLTCON0
    OR.W    #$0B4A,D0       ; canaux A, C, D ; minterm $4A : OU exclusif
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
    OR.W    #$0003,D4       ; LINE + SING : un seul point par ligne
    LSR.W   #1,D2
    ADDQ.W  #1,D2           ; dmax + 1 points
    LSL.W   #6,D2
    ADDQ.W  #2,D2           ; BLTSIZE
    BSR     attendre_blitter
    MOVE.W  D0,$40(A5)      ; BLTCON0
    MOVE.W  D4,$42(A5)      ; BLTCON1
    MOVE.L  #-1,$44(A5)     ; BLTAFWM, BLTALWM
    MOVE.W  #$8000,$74(A5)  ; BLTADAT : un point
    MOVE.W  #$FFFF,$72(A5)  ; BLTBDAT : trait plein
    MOVE.W  D3,$62(A5)      ; BLTBMOD = 4 dmin
    MOVE.W  D6,$64(A5)      ; BLTAMOD = 4 (dmin - dmax)
    MOVE.W  D5,$52(A5)      ; BLTAPTL = 4 dmin - 2 dmax
    MOVE.W  #40,$60(A5)     ; BLTCMOD
    MOVE.W  #40,$66(A5)     ; BLTDMOD
    MOVE.L  A0,$48(A5)      ; BLTCPT
    MOVE.L  A0,$54(A5)      ; BLTDPT
    MOVE.W  D2,$58(A5)      ; BLTSIZE : c'est parti
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
    BSR     ecran           ; l'écran d'un plan (en bas du programme) s'affiche
    MOVE.W  #160,D0
    MOVE.W  #40,D1
    MOVE.W  #60,D2
    MOVE.W  #200,D3
    BSR     bord            ; le bord gauche
    MOVE.W  #160,D0
    MOVE.W  #40,D1
    MOVE.W  #260,D2
    MOVE.W  #200,D3
    BSR     bord            ; le bord droit (le sommet commun s'annule : OU exclusif)
    BSR     attendre_blitter
    MOVE.L  #$09F0000A,$40(A5) ; remplissage inclusif, mode descendant
    MOVE.L  #-1,$44(A5)
    MOVE.L  #plan+200*40+38,D0 ; dernier mot de la ligne 200
    MOVE.L  D0,$50(A5)
    MOVE.L  D0,$54(A5)
    MOVE.W  #0,$64(A5)
    MOVE.W  #0,$66(A5)
    MOVE.W  #(161<<6)|20,$58(A5) ; lignes 40 à 200
    BSR     attendre_blitter
    BSR     attendre_clic
    BSR     rendre
    MOVEQ   #0,D0
    RTS

; Affiche le plan (320 x 256, blanc sur noir) et allume le DMA du Blitter
ecran:
    MOVE.L  #plan,D0
    MOVE.W  D0,cop_plans+6
    SWAP    D0
    MOVE.W  D0,cop_plans+2
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$83C0,$96(A5)  ; DMAEN + BPLEN + COPEN + BLTEN
    RTS

; Trace un bord de (D0,D1) à (D2,D3) : un seul point par ligne (SING), en OU exclusif ($4A).
bord:
    LEA     plan,A0
    MOVEQ   #0,D4           ; l'octant, bit par bit
    SUB.W   D0,D2           ; dx = x2 - x1
    BPL.S   .dx
    NEG.W   D2
    MOVEQ   #1,D5           ; vers la gauche
    BRA.S   .y
.dx:
    MOVEQ   #0,D5           ; vers la droite
.y:
    SUB.W   D1,D3           ; dy = y2 - y1
    BPL.S   .dy
    NEG.W   D3
    MOVEQ   #1,D6           ; vers le haut
    BRA.S   .octant
.dy:
    MOVEQ   #0,D6           ; vers le bas
.octant:
    CMP.W   D3,D2
    BLT.S   .vertical
    BSET    #4,D4           ; plus large que haute : SUD, le pas « parfois » est vertical
    TST.W   D6
    BEQ.S   .h1
    BSET    #3,D4           ; SUL : ce pas va vers le haut
.h1:
    TST.W   D5
    BEQ.S   .calcul
    BSET    #2,D4           ; AUL : le pas « toujours » va vers la gauche
    BRA.S   .calcul
.vertical:
    TST.W   D5
    BEQ.S   .v1
    BSET    #3,D4           ; SUL : le pas « parfois » (horizontal) va vers la gauche
.v1:
    TST.W   D6
    BEQ.S   .v2
    BSET    #2,D4           ; AUL : le pas « toujours » (vertical) va vers le haut
.v2:
    EXG     D2,D3           ; D2 = dmax, D3 = dmin
.calcul:
    MULU    #40,D1          ; l'adresse du mot de départ
    ADDA.L  D1,A0
    MOVE.W  D0,D1
    LSR.W   #3,D1
    AND.W   #$FFFE,D1
    ADDA.W  D1,A0
    AND.W   #15,D0          ; le bit de départ dans ce mot...
    ROR.W   #4,D0           ; ... dans les bits 15-12 de BLTCON0
    OR.W    #$0B4A,D0       ; canaux A, C, D ; minterm $4A : OU exclusif
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
    OR.W    #$0003,D4       ; LINE + SING : un seul point par ligne
    LSR.W   #1,D2
    ADDQ.W  #1,D2           ; dmax + 1 points
    LSL.W   #6,D2
    ADDQ.W  #2,D2           ; BLTSIZE
    BSR     attendre_blitter
    MOVE.W  D0,$40(A5)      ; BLTCON0
    MOVE.W  D4,$42(A5)      ; BLTCON1
    MOVE.L  #-1,$44(A5)     ; BLTAFWM, BLTALWM
    MOVE.W  #$8000,$74(A5)  ; BLTADAT : un point
    MOVE.W  #$FFFF,$72(A5)  ; BLTBDAT : trait plein
    MOVE.W  D3,$62(A5)      ; BLTBMOD = 4 dmin
    MOVE.W  D6,$64(A5)      ; BLTAMOD = 4 (dmin - dmax)
    MOVE.W  D5,$52(A5)      ; BLTAPTL = 4 dmin - 2 dmax
    MOVE.W  #40,$60(A5)     ; BLTCMOD
    MOVE.W  #40,$66(A5)     ; BLTDMOD
    MOVE.L  A0,$48(A5)      ; BLTCPT
    MOVE.L  A0,$54(A5)      ; BLTDPT
    MOVE.W  D2,$58(A5)      ; BLTSIZE : c'est parti
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

