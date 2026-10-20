; Codes du chapitre 6 « Le Copper ». Les programmes incluent content/fichiers/amiga-systeme.s.

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
    DC.W    $0100,$0200     ; aucun plan : tout l'écran est en couleur 0
    DC.W    $0180,$0000     ; noir en haut
    DC.W    $6007,$FFFE,$0180,$0002 ; ligne $60 : un bleu très sombre
    DC.W    $6407,$FFFE,$0180,$0004
    DC.W    $6807,$FFFE,$0180,$0006
    DC.W    $6C07,$FFFE,$0180,$0008
    DC.W    $7007,$FFFE,$0180,$000A
    DC.W    $7407,$FFFE,$0180,$000C
    DC.W    $7807,$FFFE,$0180,$000E
    DC.W    $7C07,$FFFE,$0180,$022F ; le bleu s'éclaircit
    DC.W    $8007,$FFFE,$0180,$044F
    DC.W    $8407,$FFFE,$0180,$066F
    DC.W    $8807,$FFFE,$0180,$088F
    DC.W    $8C07,$FFFE,$0180,$0AAF
    DC.W    $9007,$FFFE,$0180,$0CCF
    DC.W    $9407,$FFFE,$0180,$0FFF ; blanc à partir de la ligne $94
    DC.W    $FFFF,$FFFE     ; fin de la liste

;=== wait-prediction
START:
    MOVE.W  #$9007,D0       ; le premier mot d'un WAIT
    LSR.W   #8,D0           ; la ligne attendue
    SUB.W   #$2C,D0         ; moins la première ligne de l'image standard
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
    DC.W    $6007,$FFFE,$0180,$00F0 ; ligne $60 : vert
    DC.W    $7007,$FFFE,$0180,$0000 ; ligne $70 : noir
    DC.W    $0007,$FFFE,$0180,$000F ; <- ligne $A0 : bleu
    DC.W    $B007,$FFFE,$0180,$0000 ; ligne $B0 : noir
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
    DC.W    $6007,$FFFE,$0180,$00F0 ; ligne $60 : vert
    DC.W    $7007,$FFFE,$0180,$0000 ; ligne $70 : noir
    DC.W    $A007,$FFFE,$0180,$000F ; ligne $A0 : bleu
    DC.W    $B007,$FFFE,$0180,$0000 ; ligne $B0 : noir
    DC.W    $FFFF,$FFFE

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
    DC.W    $5007,$FFFE,$0180,$0F00 ; ligne $50 : rouge
    DC.W    $8006,$FFFE,$0180,$0FF0 ; ligne $80 : jaune
    DC.W    $B007,$FFFE,$0180,$0000 ; ligne $B0 : noir
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
    DC.W    $5007,$FFFE,$0180,$0F00 ; ligne $50 : rouge
    DC.W    $8007,$FFFE,$0180,$0FF0 ; ligne $80 : jaune (bit 0 à 1 : c'est un WAIT)
    DC.W    $B007,$FFFE,$0180,$0000 ; ligne $B0 : noir
    DC.W    $FFFF,$FFFE

;=== drapeau-depart
; Le drapeau allemand en trois bandes horizontales : noir en haut, rouge ($F00) à partir de
; la ligne $80, or ($FC0) à partir de la ligne $D5.
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
    DC.W    $0180,$0000             ; noir
    DC.W    $8007,$FFFE,$0180,$0F00 ; rouge
    DC.W    $D507,$FFFE,$0180,$0FC0 ; or
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
    DC.W    $F007,$FFFE,$0180,$0300 ; ligne $F0 : rouge sombre
    DC.W    $FFDF,$FFFE             ; fin de la ligne 255 : le compteur 8 bits repart de 0
    DC.W    $0807,$FFFE,$0180,$0600 ; ligne $108
    DC.W    $1007,$FFFE,$0180,$0900 ; ligne $110
    DC.W    $1807,$FFFE,$0180,$0C00 ; ligne $118
    DC.W    $2007,$FFFE,$0180,$0F00 ; ligne $120
    DC.W    $2C07,$FFFE,$0180,$0000 ; ligne $12C : la fin de l'image standard
    DC.W    $FFFF,$FFFE

;=== ligne256-prediction
START:
    MOVE.W  #$2C,D0         ; la ligne d'un WAIT placé après $FFDF,$FFFE
    ADD.W   #256,D0         ; le compteur du Copper est reparti de 0 à la ligne 256
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
                                    ; <- il manque une attente ici
    DC.W    $1007,$FFFE,$0180,$00F0 ; ligne $110 : vert, jusqu'en bas
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
    DC.W    $FFDF,$FFFE             ; attendre la fin de la ligne 255
    DC.W    $1007,$FFFE,$0180,$00F0 ; ligne $110 : vert, jusqu'en bas
    DC.W    $FFFF,$FFFE

;=== barre-exemple
START:
    BSR     prendre
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$8280,$96(A5)
    MOVE.W  #$40,D0         ; la ligne du haut de la barre
.image:
    BSR     attendre_vbl    ; une fois par image, sous l'image visible
    BSR     placer
    ADDQ.W  #1,D0           ; une ligne plus bas à l'image suivante
    CMP.W   #$F0,D0
    BLS.S   .encore
    MOVE.W  #$40,D0         ; arrivée en bas : on repart en haut
.encore:
    BTST    #6,$BFE001
    BNE.S   .image
    BSR     rendre
    MOVEQ   #0,D0
    RTS

; Place la barre à la ligne D0 (de $40 à $F0)
placer:
    MOVE.W  D0,D1
    LSL.W   #8,D1           ; la ligne dans l'octet fort
    OR.W    #$07,D1         ; position $06, bit 0 à 1 : un WAIT
    MOVE.W  D1,barre
    ADD.W   #$0800,D1       ; 8 lignes plus bas
    MOVE.W  D1,fin_barre
    RTS
    INCLUDE "amiga-systeme.s"

    SECTION chip,DATA_C
copper:
    DC.W    $0100,$0200,$0180,$0000
barre:
    DC.W    $4007,$FFFE,$0180,$0F00 ; le haut de la barre : rouge
fin_barre:
    DC.W    $4807,$FFFE,$0180,$0000 ; le bas : noir
    DC.W    $FFFF,$FFFE

;=== wait-mot-prediction
START:
    MOVE.W  #$50,D0         ; la ligne voulue
    MOVE.W  D0,D1
    LSL.W   #8,D1
    OR.W    #$07,D1         ; le WAIT du haut
    MOVE.W  D1,D2
    ADD.W   #$0800,D2       ; le WAIT du bas
    RTS

;=== disparait-depart
; La barre doit descendre d'une ligne par image pendant 30 images, à partir de la ligne $40,
; puis rester en place jusqu'au clic. Mais elle disparaît !
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
    ADD.W   #$0800,D1       ; le bas de la barre suit, 8 lignes plus bas
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
; Fais descendre la barre de 2 lignes par image, 60 fois, à partir de la ligne $40.
; Elle doit finir de la ligne $B8 à $C0, puis rester en place jusqu'au clic.
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
    MOVEQ   #59,D7          ; 60 images
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
    MOVE.L  #vbl,$6C.W      ; notre routine de niveau 3
    MOVE.W  #$C020,$9A(A5)  ; INTENA : SET + INTEN + VERTB
    BSR     attendre_clic   ; le programme principal ne fait rien d'autre
    BSR     rendre          ; remet aussi le vecteur $6C du système
    MOVEQ   #0,D0
    RTS

vbl:
    MOVEM.L D0-D1,-(SP)
    MOVE.W  ligne,D0
    ADDQ.W  #1,D0           ; la barre descend
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
    MOVE.W  #$0020,$DFF09C  ; INTREQ : la VBL est traitée
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
; Une routine VBL compte les images. Le programme attend qu'elle en ait compté 50,
; puis range le compteur dans D7. Mais il attend pour toujours...
START:
    BSR     prendre
    MOVE.L  #vbl,$6C.W
    MOVE.W  #$0000,$9A(A5)  ; <- INTENA : autoriser la VBL (et l'interrupteur général)
.attente:
    CMP.W   #50,compteur
    BLO.S   .attente
    MOVE.W  compteur,D7
    BSR     rendre
    MOVEQ   #0,D0           ; code de retour pour le Shell : tout va bien
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
    MOVE.W  #$C020,$9A(A5)  ; INTENA : SET + INTEN + VERTB
.attente:
    CMP.W   #50,compteur
    BLO.S   .attente
    MOVE.W  compteur,D7
    BSR     rendre
    MOVEQ   #0,D0           ; code de retour pour le Shell : tout va bien
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
    CMP.W   #100,compteur   ; deux secondes
    BLO.S   .attente
    BSR     rendre
    MOVEQ   #0,D0
    RTS

vbl:
    MOVE.L  D0,-(SP)
    ADDQ.W  #1,compteur
    MOVE.W  compteur,D0
    AND.W   #$0F,D0         ; une couleur qui change à chaque image
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
    CMP.W   #100,compteur   ; deux secondes
    BLO.S   .attente
    BSR     rendre
    MOVEQ   #0,D0
    RTS

vbl:
    MOVE.L  D0,-(SP)
    ADDQ.W  #1,compteur
    MOVE.W  compteur,D0
    AND.W   #$0F,D0         ; une couleur qui change à chaque image
    MOVE.W  D0,couleur
    MOVE.W  #$0020,$DFF09C  ; INTREQ : demande traitée
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
; Installe une routine VBL qui compte les images dans « compteur ». Le programme principal
; attend que le compteur atteigne 100, le range dans D7, puis rend la main.
START:
    BSR     prendre

    BSR     rendre
    MOVEQ   #0,D0           ; code de retour pour le Shell : tout va bien
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
    MOVEQ   #0,D0           ; code de retour pour le Shell : tout va bien
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
; Une barre bleue de 8 lignes rebondit en suivant la table « positions » (32 lignes de départ),
; une position par image, pendant 80 images ; puis elle reste en place jusqu'au clic.
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
    MOVEQ   #0,D6           ; l'index dans la table
    MOVEQ   #79,D7          ; 80 images
    LEA     positions(PC),A0
.image:
    BSR     attendre_vbl
    MOVEQ   #0,D0
    MOVE.B  0(A0,D6.W),D0   ; la ligne de cette image
    LSL.W   #8,D0
    OR.W    #$07,D0
    MOVE.W  D0,barre
    ADD.W   #$0800,D0
    MOVE.W  D0,fin_barre
    ADDQ.W  #1,D6
    AND.W   #31,D6          ; après la 32e position, on revient au début
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
