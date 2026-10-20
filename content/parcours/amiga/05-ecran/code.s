; Codes du chapitre 5 « L'écran et les puces custom ».
; Les programmes qui prennent la main incluent content/fichiers/amiga-systeme.s.

;=== raster-exemple
START:
    LEA     $DFF000,A5      ; A5 = les puces
.image:
    CMP.B   #$80,$06(A5)    ; VHPOSR : le faisceau est-il à la ligne $80 ?
    BNE.S   .image
    MOVE.W  #$0F00,$180(A5) ; COLOR00 = rouge
.bas:
    CMP.B   #$90,$06(A5)    ; ligne $90 ?
    BNE.S   .bas
    MOVE.W  #$005A,$180(A5) ; COLOR00 = le bleu du Workbench
    BTST    #6,$BFE001      ; bouton gauche de la souris enfoncé ?
    BNE.S   .image          ; non : image suivante
    RTS

;=== setclr-prediction
START:
    LEA     $DFF000,A5
    MOVE.W  #$0040,$96(A5)  ; DMACON : bit 15 à 0, donc le bit 6 (Blitter) passe à 0
    MOVE.W  $02(A5),D0      ; DMACONR
    AND.W   #$07FF,D0       ; seulement les bits des canaux
    MOVE.W  #$8040,$96(A5)  ; bit 15 à 1 : le bit 6 repasse à 1
    MOVE.W  $02(A5),D1
    AND.W   #$07FF,D1
    RTS

;=== verte-depart
START:
    LEA     $DFF000,A5
.image:
    CMP.B   #$00,$06(A5)    ; <- la bande commence à la ligne $A0
    BNE.S   .image
    MOVE.W  #$0000,$180(A5) ; <- vert vif
.bas:
    CMP.B   #$B0,$06(A5)
    BNE.S   .bas
    MOVE.W  #$005A,$180(A5)
    BTST    #6,$BFE001
    BNE.S   .image
    RTS

;=== verte-solution
START:
    LEA     $DFF000,A5
.image:
    CMP.B   #$A0,$06(A5)    ; la bande commence à la ligne $A0
    BNE.S   .image
    MOVE.W  #$00F0,$180(A5) ; vert vif
.bas:
    CMP.B   #$B0,$06(A5)
    BNE.S   .bas
    MOVE.W  #$005A,$180(A5)
    BTST    #6,$BFE001
    BNE.S   .image
    RTS

;=== fin-bande-depart
START:
    LEA     $DFF000,A5
.image:
    CMP.B   #$70,$06(A5)
    BNE.S   .image
    MOVE.W  #$0FF0,$180(A5) ; jaune
.bas:
    CMP.B   #$78,$06(A5)
    BNE.S   .bas
    MOVE.W  #$0FF0,$180(A5)
    BTST    #6,$BFE001
    BNE.S   .image
    RTS

;=== fin-bande-solution
START:
    LEA     $DFF000,A5
.image:
    CMP.B   #$70,$06(A5)
    BNE.S   .image
    MOVE.W  #$0FF0,$180(A5) ; jaune
.bas:
    CMP.B   #$78,$06(A5)
    BNE.S   .bas
    MOVE.W  #$005A,$180(A5) ; fin de la bande : le bleu revient
    BTST    #6,$BFE001
    BNE.S   .image
    RTS

;=== deux-bandes-depart
; Une bande rouge de la ligne $60 à $68, une bande jaune de $C0 à $C8,
; à chaque image, jusqu'au clic gauche.
START:
    LEA     $DFF000,A5

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
    RTS

;=== prendre-exemple
; Le squelette complet : prendre la main, afficher notre liste Copper, rendre la main.
START:
    BSR     prendre         ; A5 = $DFF000, tout est coupé
    MOVE.L  #copper,$80(A5) ; COP1LC : notre liste
    MOVE.W  D0,$88(A5)      ; COPJMP1 : le Copper y saute
    MOVE.W  #$8280,$96(A5)  ; DMACON : SET + DMAEN + COPEN
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
    MOVE.L  34(A6),sys_vue      ; gb_ActiView : la vue affichée par le système
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
    MOVE.L  $6C.W,sys_niveau3   ; vecteur de niveau 3
    MOVE.W  #$7FFF,$9A(A5)      ; INTENA : tout coupé
    MOVE.W  #$7FFF,$9C(A5)      ; INTREQ : demandes effacées
    MOVE.W  #$7FFF,$96(A5)      ; DMACON : tout coupé
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
    JSR     -222(A6)            ; LoadView(ancienne vue)
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
    DC.W    $0100,$0200     ; BPLCON0 : aucun plan
    DC.W    $0180,$0F80     ; COLOR00 : orange
    DC.W    $9007,$FFFE     ; WAIT ligne $90
    DC.W    $0180,$0008     ; COLOR00 : bleu nuit
    DC.W    $FFFF,$FFFE     ; fin

;=== bit15-prediction
START:
    LEA     $DFF000,A5
    MOVE.W  $02(A5),D7      ; on « sauvegarde » DMACONR
    AND.W   #$07FF,D7
    MOVE.W  D7,$96(A5)      ; et on le « rend » sans le bit 15...
    MOVE.W  $02(A5),D0
    AND.W   #$07FF,D0
    OR.W    #$8000,D7
    MOVE.W  D7,$96(A5)      ; ... puis avec le bit 15
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
    MOVE.W  $02(A5),D7      ; DMACONR sauvegardé
    MOVE.W  #$7FFF,$96(A5)  ; tout le DMA coupé
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$8280,$96(A5)  ; seulement le Copper
.clic:
    BTST    #6,$BFE001
    BNE.S   .clic
    MOVE.W  #$7FFF,$96(A5)
    MOVE.L  0(A4),$80(A5)   ; <- COP1LC : gb_copinit est à 38 octets de la base de graphics
    MOVE.W  D0,$88(A5)
    OR.W    #$8000,D7
    MOVE.W  D7,$96(A5)      ; le DMA du système
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
    MOVE.W  $02(A5),D7      ; DMACONR sauvegardé
    MOVE.W  #$7FFF,$96(A5)  ; tout le DMA coupé
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$8280,$96(A5)  ; seulement le Copper
.clic:
    BTST    #6,$BFE001
    BNE.S   .clic
    MOVE.W  #$7FFF,$96(A5)
    MOVE.L  38(A4),$80(A5)  ; COP1LC = gb_copinit
    MOVE.W  D0,$88(A5)
    OR.W    #$8000,D7
    MOVE.W  D7,$96(A5)      ; le DMA du système
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
    MOVE.W  $02(A5),D7      ; DMACONR sauvegardé
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
    MOVE.W  D7,$96(A5)      ; le DMA du système revient... vraiment ?
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
    MOVE.W  $02(A5),D7      ; DMACONR sauvegardé
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
    OR.W    #$8000,D7       ; SET : rallumer les bits qui étaient à 1
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
; Avec prendre et rendre (amiga-systeme.s) : affiche un fond orange ($F80) grâce à ta propre
; liste Copper, jusqu'au clic gauche.
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
    DC.W    $0100,$0200     ; aucun plan
    DC.W    $0180,$0F80     ; COLOR00 : orange
    DC.W    $FFFF,$FFFE

;=== plan-exemple
START:
    BSR     prendre
    LEA     plan,A0
    MOVE.L  A0,D0           ; l'adresse du plan dans la liste Copper
    LEA     cop_plans,A1
    MOVE.W  D0,6(A1)        ; BPL1PTL
    SWAP    D0
    MOVE.W  D0,2(A1)        ; BPL1PTH
    LEA     128*40(A0),A1   ; ligne 128
    MOVEQ   #9,D7           ; 10 mots longs = 40 octets = toute la ligne
.ligne:
    MOVE.L  #$FFFFFFFF,(A1)+
    DBF     D7,.ligne
    MOVEQ   #0,D0           ; la diagonale : (0,0), (1,1)... (99,99)
.diagonale:
    MOVE.W  D0,D1           ; y = x
    MULU    #40,D1
    MOVE.W  D0,D2
    LSR.W   #3,D2
    ADD.W   D2,D1           ; l'octet : y × 40 + x ÷ 8
    MOVE.W  D0,D3
    NOT.B   D3              ; le bit : 7 − (x mod 8)
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
    DC.W    $008E,$2C81,$0090,$2CC1 ; DIWSTRT, DIWSTOP : la fenêtre standard
    DC.W    $0092,$0038,$0094,$00D0 ; DDFSTRT, DDFSTOP
    DC.W    $0102,$0000,$0104,$0024 ; BPLCON1, BPLCON2
    DC.W    $0108,$0000,$010A,$0000 ; modulos
    DC.W    $0180,$0000,$0182,$0FFF ; couleur 0 noire, couleur 1 blanche
    DC.W    $0100,$1200             ; BPLCON0 : 1 plan
cop_plans:
    DC.W    $00E0,0,$00E2,0         ; BPL1PTH, BPL1PTL : posés par le programme
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
    ADD.W   D2,D1           ; l'octet
    MOVE.W  D0,D3
    NOT.B   D3
    AND.W   #7,D3           ; le numéro du bit
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
    MOVE.L  #$FFFF0000,40*20(A0) ; 16 pixels allumés sur la ligne 20
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
    DC.W    $0100,$0200             ; <- BPLCON0 : aucun plan déclaré
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
    MOVE.L  #$FFFF0000,40*20(A0) ; 16 pixels allumés sur la ligne 20
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
    DC.W    $0100,$1200             ; BPLCON0 : 1 plan
cop_plans:
    DC.W    $00E0,0,$00E2,0
    DC.W    $FFFF,$FFFE

    SECTION ecran,BSS_C
plan:   DS.B    40*256

;=== horizontale-depart
; Trace une ligne blanche sur toute la largeur de l'écran, à la ligne y = 100.
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
    LEA     100*40(A0),A1   ; début de la ligne 100
    MOVEQ   #39,D7          ; 40 octets
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
; Dessine la diagonale (0,0), (1,1)... (99,99) : 100 pixels blancs.
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
    MOVE.L  A0,D0           ; les deux pointeurs dans la liste Copper
    LEA     cop_plans,A2
    MOVE.W  D0,6(A2)
    SWAP    D0
    MOVE.W  D0,2(A2)
    MOVE.L  A1,D0
    MOVE.W  D0,14(A2)
    SWAP    D0
    MOVE.W  D0,10(A2)
    MOVE.W  #255,D7         ; 256 lignes
.ligne:
    MOVEQ   #9,D6           ; octets 10 à 19 du plan 1 : x = 80 à 159
.b1:
    MOVE.B  #$FF,10(A0,D6.W)
    MOVE.B  #$FF,30(A0,D6.W) ; octets 30 à 39 : x = 240 à 319
    DBF     D6,.b1
    MOVEQ   #19,D6          ; octets 20 à 39 du plan 2 : x = 160 à 319
.b2:
    MOVE.B  #$FF,20(A1,D6.W)
    DBF     D6,.b2
    LEA     40(A0),A0       ; ligne suivante dans chaque plan
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
    DC.W    $0180,$0000,$0182,$0F00 ; couleurs 0 et 1 : noir, rouge
    DC.W    $0184,$00F0,$0186,$000F ; couleurs 2 et 3 : vert, bleu
    DC.W    $0100,$2200             ; BPLCON0 : 2 plans
cop_plans:
    DC.W    $00E0,0,$00E2,0         ; plan 1
    DC.W    $00E4,0,$00E6,0         ; plan 2
    DC.W    $FFFF,$FFFE

    SECTION ecran,BSS_C
plan1:  DS.B    40*256
plan2:  DS.B    40*256

;=== couleur-prediction
START:
    MOVEQ   #0,D0
    BSET    #0,D0           ; le pixel a son bit allumé dans le plan 1...
    BSET    #2,D0           ; ... et dans le plan 3, pas dans le plan 2
    MOVE.L  D0,D1
    ADD.L   D1,D1           ; 2 × n
    ADD.L   #$DFF180,D1     ; l'adresse de son registre de couleur
    RTS

;=== carre2-depart
; Écran de 2 plans. Dessine un carré de 32 × 32 en couleur 2 (vert), coin en haut à gauche
; en (64, 64).
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
    LEA     64*40+64/8(A1),A2 ; couleur 2 = bit du plan 2 seulement
    MOVEQ   #31,D7          ; 32 lignes
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
    LEA     40*40+16/8(A0),A2 ; un carré bleu (couleur 3) en (16, 40)
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
    LEA     40*40+16/8(A0),A2 ; un carré bleu (couleur 3) en (16, 40)
    LEA     40*40+16/8(A1),A3 ; couleur 3 = plan 1 ET plan 2
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
; Le drapeau français sur tout l'écran : bleu ($00F) de x = 0 à 105, blanc ($FFF) de 106 à 213,
; rouge ($F00) de 214 à 319. Deux plans suffisent.
START:
    BSR     prendre
    LEA     plan1,A0
    LEA     plan2,A1
    ; ... pose les deux pointeurs dans la liste Copper, dessine, lance le Copper ...

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
    MOVE.W  #255,D7         ; 256 lignes identiques
.ligne:
    LEA     type1(PC),A2    ; la ligne type de chaque plan
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
; Une ligne du drapeau, octet par octet. Bleu (couleur 1) = plan 1 ; blanc (2) = plan 2 ;
; rouge (3) = les deux. Les frontières x = 106 et x = 214 tombent au milieu des octets 13 et 26.
type1:  DCB.B   13,$FF          ; x = 0 à 103 : bleu
        DC.B    $C0             ; x = 104, 105 : bleu ; 106 à 111 : blanc
        DCB.B   12,$00          ; x = 112 à 207 : blanc
        DC.B    $03             ; x = 208 à 213 : blanc ; 214, 215 : rouge
        DCB.B   13,$FF          ; x = 216 à 319 : rouge
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
