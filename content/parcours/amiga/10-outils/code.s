; Codes du chapitre 10 « Outils, exécutable et démo ».

;=== intro-exemple
; Une petite intro : un dégradé, une barre qui rebondit (routine VBL), une balle (sprite 0)
; et une note tenue, jusqu'au clic gauche.
START:
    BSR     prendre
    MOVE.L  #balle,D0       ; sprite 0 : la balle ; sprites 1 à 7 : la liste vide
    LEA     cop_sprites,A0
    MOVE.W  D0,6(A0)
    SWAP    D0
    MOVE.W  D0,2(A0)
    MOVE.L  #vide,D0
    LEA     8(A0),A0
    MOVEQ   #6,D7
.vides:
    MOVE.W  D0,6(A0)
    SWAP    D0
    MOVE.W  D0,2(A0)
    SWAP    D0
    ADDQ.L  #8,A0
    DBF     D7,.vides
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.L  #onde,$A0(A5)   ; une note grave, pas trop fort
    MOVE.W  #16,$A4(A5)
    MOVE.W  #508,$A6(A5)
    MOVE.W  #24,$A8(A5)
    MOVE.W  #$82A1,$96(A5)  ; DMAEN + COPEN + SPREN + AUD0EN
    MOVE.L  #vbl,$6C.W
    MOVE.W  #$C020,$9A(A5)  ; la VBL
    BSR     attendre_clic
    MOVE.W  #$0001,$96(A5)  ; silence
    BSR     rendre
    MOVEQ   #0,D0
    RTS

vbl:
    MOVEM.L D0-D1/A0,-(SP)
    MOVE.W  index,D1
    ADDQ.W  #1,D1
    AND.W   #31,D1          ; 32 positions, en boucle
    MOVE.W  D1,index
    LEA     positions(PC),A0
    MOVEQ   #0,D0
    MOVE.B  0(A0,D1.W),D0   ; la ligne de la barre
    LSL.W   #8,D0
    OR.W    #$07,D0
    MOVE.W  D0,barre
    ADD.W   #$0400,D0
    MOVE.W  D0,barre2
    ADD.W   #$0400,D0
    MOVE.W  D0,barre3
    MOVE.W  #$0020,$DFF09C
    MOVEM.L (SP)+,D0-D1/A0
    RTE
index:  DC.W    0
positions:
    DC.B    $50,$51,$54,$59,$60,$69,$74,$81,$90,$A0,$AF,$BE,$CA,$D4,$DB,$DF
    DC.B    $E0,$DF,$DB,$D4,$CA,$BE,$AF,$A0,$90,$81,$74,$69,$60,$59,$54,$51
    INCLUDE "amiga-systeme.s"

    SECTION chip,DATA_C
copper:
    DC.W    $0100,$0200,$0104,$0024
    DC.W    $01A2,$0FFF,$01A4,$0F80,$01A6,$0FF0 ; les couleurs de la balle
cop_sprites:
    DC.W    $0120,0,$0122,0,$0124,0,$0126,0,$0128,0,$012A,0,$012C,0,$012E,0
    DC.W    $0130,0,$0132,0,$0134,0,$0136,0,$0138,0,$013A,0,$013C,0,$013E,0
    DC.W    $0180,$0003
    DC.W    $3007,$FFFE,$0180,$0005 ; un ciel dégradé
    DC.W    $3807,$FFFE,$0180,$0007
    DC.W    $4007,$FFFE,$0180,$0009
barre:
    DC.W    $5007,$FFFE,$0180,$0F00 ; la barre : rouge, orange, jaune
barre2:
    DC.W    $5407,$FFFE,$0180,$0F80
barre3:
    DC.W    $5807,$FFFE,$0180,$0FF0
    DC.W    $5C07,$FFFE,$0180,$0009 ; après la barre (ce WAIT est souvent déjà passé : le ciel reprend)
    DC.W    $FFFF,$FFFE
vide:   DC.W    0,0
balle:
    DC.W    $40A0,$5001
    DC.W    %0000011111100000,%0000000000000000
    DC.W    %0001111111111000,%0000000000000000
    DC.W    %0011111111111100,%0000011000000000
    DC.W    %0111111111111110,%0000111100000000
    DC.W    %0111111111111110,%0000011000000000
    DC.W    %1111111111111111,%0000000000000000
    DC.W    %1111111111111111,%0000000000000000
    DC.W    %1111111111111111,%0000000000000000
    DC.W    %1111111111111111,%0000000000000000
    DC.W    %1111111111111111,%0000000000000000
    DC.W    %1111111111111111,%0000000000000000
    DC.W    %0111111111111110,%0000000000000000
    DC.W    %0111111111111110,%0000000000000000
    DC.W    %0011111111111100,%0000000000000000
    DC.W    %0001111111111000,%0000000000000000
    DC.W    %0000011111100000,%0000000000000000
    DC.W    0,0
onde:   DCB.B   16,60
        DCB.B   16,-60

;=== retour-prediction
START:
    MOVEQ   #20,D0          ; le code de retour
    RTS

;=== retour-depart
; Un programme qui se termine bien doit le dire au Shell.
START:
    MOVEA.L 4.W,A6
    LEA     dosnom(PC),A1
    MOVEQ   #0,D0
    JSR     -552(A6)
    MOVEA.L D0,A6
    JSR     -60(A6)
    MOVE.L  D0,D1
    LEA     texte(PC),A0
    MOVE.L  A0,D2
    MOVEQ   #fin-texte,D3
    JSR     -48(A6)
    MOVEA.L A6,A1
    MOVEA.L 4.W,A6
    JSR     -414(A6)
    MOVEQ   #20,D0          ; <- le code de retour : tout s'est bien passé
    RTS
dosnom: DC.B    'dos.library',0
texte:  DC.B    'Fini !',10
fin:
    EVEN

;=== retour-solution
START:
    MOVEA.L 4.W,A6
    LEA     dosnom(PC),A1
    MOVEQ   #0,D0
    JSR     -552(A6)
    MOVEA.L D0,A6
    JSR     -60(A6)
    MOVE.L  D0,D1
    LEA     texte(PC),A0
    MOVE.L  A0,D2
    MOVEQ   #fin-texte,D3
    JSR     -48(A6)
    MOVEA.L A6,A1
    MOVEA.L 4.W,A6
    JSR     -414(A6)
    MOVEQ   #0,D0           ; 0 : tout s'est bien passé
    RTS
dosnom: DC.B    'dos.library',0
texte:  DC.B    'Fini !',10
fin:
    EVEN

;=== bonus-intro-depart
; Ton intro : la balle (sprite 0) au milieu de l'écran en (152, 120), et la barre de trois
; couleurs qui suit la table « positions », une position par image, pendant 40 images ;
; puis tout reste en place jusqu'au clic. Les listes et les données sont prêtes.
START:
    BSR     prendre

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
    DC.W    $0100,$0200,$0104,$0024
    DC.W    $01A2,$0FFF,$01A4,$0F80,$01A6,$0FF0
cop_sprites:
    DC.W    $0120,0,$0122,0,$0124,0,$0126,0,$0128,0,$012A,0,$012C,0,$012E,0
    DC.W    $0130,0,$0132,0,$0134,0,$0136,0,$0138,0,$013A,0,$013C,0,$013E,0
    DC.W    $0180,$0003
barre:
    DC.W    $5007,$FFFE,$0180,$0F00
barre2:
    DC.W    $5407,$FFFE,$0180,$0F80
barre3:
    DC.W    $5807,$FFFE,$0180,$0FF0
barre4:
    DC.W    $5C07,$FFFE,$0180,$0003
    DC.W    $FFFF,$FFFE
vide:   DC.W    0,0
balle:
    DC.W    0,0             ; les mots de contrôle : à toi de les calculer
    DCB.L   16,$FFFF0000    ; un carré blanc (couleur 17)
    DC.W    0,0

;=== bonus-intro-solution
START:
    BSR     prendre
    MOVE.L  #balle,D0
    LEA     cop_sprites,A0
    MOVE.W  D0,6(A0)
    SWAP    D0
    MOVE.W  D0,2(A0)
    MOVE.L  #vide,D0
    LEA     8(A0),A0
    MOVEQ   #6,D7
.vides:
    MOVE.W  D0,6(A0)
    SWAP    D0
    MOVE.W  D0,2(A0)
    SWAP    D0
    ADDQ.L  #8,A0
    DBF     D7,.vides
    MOVE.W  #$A48C,balle    ; y = 120 : VSTART = $A4 ; x = 152 : HSTART = $119, divisé par 2 = $8C
    MOVE.W  #$B401,balle+2  ; VSTOP = $B4, bit 0 de HSTART
    MOVE.L  #copper,$80(A5)
    MOVE.W  D0,$88(A5)
    MOVE.W  #$82A0,$96(A5)  ; DMAEN + COPEN + SPREN
    LEA     positions(PC),A1
    MOVEQ   #0,D6
    MOVEQ   #39,D7
.image:
    BSR     attendre_vbl
    MOVEQ   #0,D0
    MOVE.B  0(A1,D6.W),D0
    LSL.W   #8,D0
    OR.W    #$07,D0
    MOVE.W  D0,barre
    ADD.W   #$0400,D0
    MOVE.W  D0,barre2
    ADD.W   #$0400,D0
    MOVE.W  D0,barre3
    ADD.W   #$0400,D0
    MOVE.W  D0,barre4
    ADDQ.W  #1,D6
    AND.W   #31,D6
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
    DC.W    $0100,$0200,$0104,$0024
    DC.W    $01A2,$0FFF,$01A4,$0F80,$01A6,$0FF0
cop_sprites:
    DC.W    $0120,0,$0122,0,$0124,0,$0126,0,$0128,0,$012A,0,$012C,0,$012E,0
    DC.W    $0130,0,$0132,0,$0134,0,$0136,0,$0138,0,$013A,0,$013C,0,$013E,0
    DC.W    $0180,$0003
barre:
    DC.W    $5007,$FFFE,$0180,$0F00
barre2:
    DC.W    $5407,$FFFE,$0180,$0F80
barre3:
    DC.W    $5807,$FFFE,$0180,$0FF0
barre4:
    DC.W    $5C07,$FFFE,$0180,$0003
    DC.W    $FFFF,$FFFE
vide:   DC.W    0,0
balle:
    DC.W    0,0
    DCB.L   16,$FFFF0000
    DC.W    0,0
