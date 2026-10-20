; Codes du chapitre 9 « Paula, le son ». Les échantillons sont en Chip RAM (SECTION son,DATA_C).

;=== la-exemple
START:
    LEA     $DFF000,A5
    MOVE.L  #onde,$A0(A5)   ; AUD0LC : l'échantillon
    MOVE.W  #16,$A4(A5)     ; AUD0LEN : 32 octets = 16 mots
    MOVE.W  #252,$A6(A5)    ; AUD0PER : 3 546 895 / (252 x 32) = 440 Hz, un la
    MOVE.W  #64,$A8(A5)     ; AUD0VOL : le maximum
    MOVE.W  #$8201,$96(A5)  ; DMACON : SET + DMAEN + AUD0EN
    MOVEQ   #49,D7          ; une seconde : 50 images
.attente:
    BSR     attendre_vbl
    DBF     D7,.attente
    MOVE.W  #$0001,$96(A5)  ; AUD0EN à 0 : silence
    MOVEQ   #0,D0
    RTS
    INCLUDE "amiga-systeme.s"

    SECTION son,DATA_C
onde:   DCB.B   16,100      ; une onde carrée : 16 octets en haut...
        DCB.B   16,-100     ; ... 16 en bas

;=== periode-prediction
START:
    MOVE.L  #3546895,D0     ; l'horloge de Paula
    DIVU    #440*32,D0      ; divisée par (fréquence x longueur de l'onde)
    AND.L   #$FFFF,D0       ; le quotient seul
    RTS

;=== volume-depart
START:
    LEA     $DFF000,A5
    MOVE.L  #onde,$A0(A5)
    MOVE.W  #16,$A4(A5)
    MOVE.W  #252,$A6(A5)
    MOVE.W  #0,$A8(A5)      ; <- le volume : le plus fort possible
    MOVE.W  #$8201,$96(A5)
    MOVEQ   #24,D7
.attente:
    BSR     attendre_vbl
    DBF     D7,.attente
    MOVE.W  #$0001,$96(A5)
    MOVEQ   #0,D0
    RTS
    INCLUDE "amiga-systeme.s"

    SECTION son,DATA_C
onde:   DCB.B   16,100
        DCB.B   16,-100

;=== volume-solution
START:
    LEA     $DFF000,A5
    MOVE.L  #onde,$A0(A5)
    MOVE.W  #16,$A4(A5)
    MOVE.W  #252,$A6(A5)
    MOVE.W  #64,$A8(A5)     ; le volume maximum : 64
    MOVE.W  #$8201,$96(A5)
    MOVEQ   #24,D7
.attente:
    BSR     attendre_vbl
    DBF     D7,.attente
    MOVE.W  #$0001,$96(A5)
    MOVEQ   #0,D0
    RTS
    INCLUDE "amiga-systeme.s"

    SECTION son,DATA_C
onde:   DCB.B   16,100
        DCB.B   16,-100

;=== muet-depart
; Lance la voie 0, attends que Paula l'ait démarrée (bit 7 de INTREQR), mets 1 dans D7, arrête.
START:
    LEA     $DFF000,A5
    MOVE.L  #onde,$A0(A5)
    MOVE.W  #16,$A4(A5)
    MOVE.W  #252,$A6(A5)
    MOVE.W  #64,$A8(A5)
    MOVE.W  #$0080,$9C(A5)  ; une vieille demande AUD0 effacée
    MOVE.W  #$0201,$96(A5)  ; DMACON : la voie 0 joue
.demarre:
    BTST    #7,$1F(A5)      ; INTREQR : Paula a démarré la voie 0 ?
    BEQ.S   .demarre
    MOVEQ   #1,D7
    MOVE.W  #$0001,$96(A5)
    RTS

    SECTION son,DATA_C
onde:   DCB.B   16,100
        DCB.B   16,-100

;=== muet-solution
START:
    LEA     $DFF000,A5
    MOVE.L  #onde,$A0(A5)
    MOVE.W  #16,$A4(A5)
    MOVE.W  #252,$A6(A5)
    MOVE.W  #64,$A8(A5)
    MOVE.W  #$0080,$9C(A5)  ; une vieille demande AUD0 effacée
    MOVE.W  #$8201,$96(A5)  ; DMACON : bit 15 à 1, sinon on éteint au lieu d'allumer
.demarre:
    BTST    #7,$1F(A5)      ; INTREQR : Paula a démarré la voie 0 ?
    BEQ.S   .demarre
    MOVEQ   #1,D7
    MOVE.W  #$0001,$96(A5)
    RTS

    SECTION son,DATA_C
onde:   DCB.B   16,100
        DCB.B   16,-100

;=== notes-depart
; Joue do (période 423), mi (336) puis sol (283) sur la voie 0, une demi-seconde chacune
; (25 images), puis arrête la voie.
START:
    LEA     $DFF000,A5

    RTS
    INCLUDE "amiga-systeme.s"

    SECTION son,DATA_C
onde:   DCB.B   16,100
        DCB.B   16,-100

;=== notes-solution
START:
    LEA     $DFF000,A5
    MOVE.L  #onde,$A0(A5)
    MOVE.W  #16,$A4(A5)
    MOVE.W  #64,$A8(A5)
    LEA     periodes(PC),A0
    MOVE.W  (A0)+,$A6(A5)   ; do
    MOVE.W  #$8201,$96(A5)
    MOVEQ   #2,D6           ; trois notes
.note:
    MOVEQ   #24,D7
.attente:
    BSR     attendre_vbl
    DBF     D7,.attente
    SUBQ.W  #1,D6
    BMI.S   .fin
    MOVE.W  (A0)+,$A6(A5)   ; la note suivante : il suffit de changer la période
    BRA.S   .note
.fin:
    MOVE.W  #$0001,$96(A5)
    MOVEQ   #0,D0
    RTS
periodes: DC.W  423,336,283
    INCLUDE "amiga-systeme.s"

    SECTION son,DATA_C
onde:   DCB.B   16,100
        DCB.B   16,-100

;=== unefois-exemple
START:
    LEA     $DFF000,A5
    MOVE.L  #bip,$A0(A5)    ; un « bip » de 1600 octets
    MOVE.W  #800,$A4(A5)
    MOVE.W  #200,$A6(A5)
    MOVE.W  #64,$A8(A5)
    MOVE.W  #$0080,$9C(A5)  ; une vieille demande AUD0 effacée
    MOVE.W  #$8201,$96(A5)  ; c'est parti
.note:
    BTST    #7,$1F(A5)      ; Paula a noté l'adresse et la longueur ?
    BEQ.S   .note
    MOVE.L  #silence,$A0(A5) ; le bloc suivant : un mot de silence...
    MOVE.W  #1,$A4(A5)      ; ... qu'elle rejouera en boucle
    MOVEQ   #24,D7          ; le bip dure 1600 x 200 x 2 cycles, moins d'une demi-seconde
.attente:
    BSR     attendre_vbl
    DBF     D7,.attente
    MOVE.W  #$0001,$96(A5)
    MOVEQ   #0,D0
    RTS
    INCLUDE "amiga-systeme.s"

    SECTION son,DATA_C
bip:
        REPT    50
        DCB.B   16,90
        DCB.B   16,-90
        ENDR
silence: DC.W   0

;=== silence-depart
START:
    LEA     $DFF000,A5
    MOVE.L  #bip,$A0(A5)
    MOVE.W  #800,$A4(A5)
    MOVE.W  #200,$A6(A5)
    MOVE.W  #64,$A8(A5)
    MOVE.W  #$0080,$9C(A5)
    MOVE.W  #$8201,$96(A5)
.note:
    BTST    #7,$1F(A5)
    BEQ.S   .note
    MOVE.L  #silence,$A0(A5)
    MOVE.W  #800,$A4(A5)    ; <- la longueur du bloc de silence
    MOVEQ   #24,D7
.attente:
    BSR     attendre_vbl
    DBF     D7,.attente
    MOVE.W  #$0001,$96(A5)
    MOVEQ   #0,D0
    RTS
    INCLUDE "amiga-systeme.s"

    SECTION son,DATA_C
bip:
        REPT    50
        DCB.B   16,90
        DCB.B   16,-90
        ENDR
silence: DC.W   0

;=== silence-solution
START:
    LEA     $DFF000,A5
    MOVE.L  #bip,$A0(A5)
    MOVE.W  #800,$A4(A5)
    MOVE.W  #200,$A6(A5)
    MOVE.W  #64,$A8(A5)
    MOVE.W  #$0080,$9C(A5)
    MOVE.W  #$8201,$96(A5)
.note:
    BTST    #7,$1F(A5)
    BEQ.S   .note
    MOVE.L  #silence,$A0(A5)
    MOVE.W  #1,$A4(A5)      ; un seul mot : le silence
    MOVEQ   #24,D7
.attente:
    BSR     attendre_vbl
    DBF     D7,.attente
    MOVE.W  #$0001,$96(A5)
    MOVEQ   #0,D0
    RTS
    INCLUDE "amiga-systeme.s"

    SECTION son,DATA_C
bip:
        REPT    50
        DCB.B   16,90
        DCB.B   16,-90
        ENDR
silence: DC.W   0

;=== qcm-dma
    MOVE.W  #$8203,$DFF096

;=== bonus-stereo-depart
; Un accord en stéréo : la (période 252) sur la voie 0 (à gauche), mi (période 336) sur la
; voie 1 (à droite). Attends que Paula ait démarré les DEUX voies (bits 7 et 8 de INTREQR),
; mets 3 dans D7, puis arrête les deux voies.
START:
    LEA     $DFF000,A5

    RTS

    SECTION son,DATA_C
onde:   DCB.B   16,100
        DCB.B   16,-100

;=== bonus-stereo-solution
START:
    LEA     $DFF000,A5
    MOVE.L  #onde,$A0(A5)   ; voie 0
    MOVE.W  #16,$A4(A5)
    MOVE.W  #252,$A6(A5)
    MOVE.W  #64,$A8(A5)
    MOVE.L  #onde,$B0(A5)   ; voie 1 : les mêmes registres, $10 plus loin
    MOVE.W  #16,$B4(A5)
    MOVE.W  #336,$B6(A5)
    MOVE.W  #64,$B8(A5)
    MOVE.W  #$0180,$9C(A5)  ; les vieilles demandes AUD0 et AUD1 effacées
    MOVE.W  #$8203,$96(A5)  ; DMAEN + AUD0EN + AUD1EN
.demarre:
    MOVE.W  $1E(A5),D0      ; INTREQR
    AND.W   #$0180,D0
    CMP.W   #$0180,D0       ; les deux voies ?
    BNE.S   .demarre
    MOVEQ   #3,D7
    MOVE.W  #$0003,$96(A5)
    RTS

    SECTION son,DATA_C
onde:   DCB.B   16,100
        DCB.B   16,-100
