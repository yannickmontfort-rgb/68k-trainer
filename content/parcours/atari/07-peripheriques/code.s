; Codes du chapitre 7 « Clavier, joystick et son » (mode utilisateur).

;=== touches-exemple
START:
.attente:
    MOVE.W  #8,-(SP)        ; Cnecin : attend une touche, sans écho
    TRAP    #1
    ADDQ.L  #2,SP
    CMP.B   #$1B,D0         ; code ASCII d'Échap ?
    BEQ.S   QUITTER
    SWAP    D0              ; le code clavier passe dans le mot faible
    CMP.B   #$50,D0         ; flèche bas ?
    BEQ.S   BAS
    BRA.S   .attente        ; autre touche : on recommence
BAS:
    PEA     TEXTE(PC)       ; Cconws : affiche « bas »
    MOVE.W  #9,-(SP)
    TRAP    #1
    ADDQ.L  #6,SP
    BRA.S   START
QUITTER:
    CLR.W   -(SP)
    TRAP    #1

TEXTE:
    DC.B    'bas ',0

;=== cnecin-prediction
START:
    MOVE.W  #8,-(SP)        ; Cnecin
    TRAP    #1
    ADDQ.L  #2,SP
    MOVE.L  D0,D1
    SWAP    D1
    CLR.W   -(SP)
    TRAP    #1

;=== echap-depart
; Le programme compte dans D7 les touches tapées AVANT Échap, puis s'arrête.
; Complète le test d'Échap.
START:
    MOVEQ   #0,D7
.attente:
    MOVE.W  #8,-(SP)        ; Cnecin
    TRAP    #1
    ADDQ.L  #2,SP
    ; si la touche est Échap (code ASCII $1B), va à FIN

    ADDQ.W  #1,D7
    BRA.S   .attente
FIN:
    CLR.W   -(SP)
    TRAP    #1

;=== echap-solution
START:
    MOVEQ   #0,D7
.attente:
    MOVE.W  #8,-(SP)
    TRAP    #1
    ADDQ.L  #2,SP
    CMP.B   #$1B,D0         ; Échap ?
    BEQ.S   FIN
    ADDQ.W  #1,D7
    BRA.S   .attente
FIN:
    CLR.W   -(SP)
    TRAP    #1

;=== hautbas-depart
; Affiche « H » pour la flèche haut, « B » pour la flèche bas ; ignore les autres
; touches ; Échap termine le programme.
START:

    CLR.W   -(SP)
    TRAP    #1

;=== hautbas-solution
START:
.attente:
    MOVE.W  #8,-(SP)        ; Cnecin
    TRAP    #1
    ADDQ.L  #2,SP
    CMP.B   #$1B,D0         ; Échap : fin
    BEQ.S   FIN
    SWAP    D0              ; code clavier
    MOVEQ   #'H',D1
    CMP.B   #$48,D0         ; flèche haut
    BEQ.S   AFFICHER
    MOVEQ   #'B',D1
    CMP.B   #$50,D0         ; flèche bas
    BEQ.S   AFFICHER
    BRA.S   .attente
AFFICHER:
    MOVE.W  D1,-(SP)        ; Cconout(caractère)
    MOVE.W  #2,-(SP)
    TRAP    #1
    ADDQ.L  #4,SP
    BRA.S   START
FIN:
    CLR.W   -(SP)
    TRAP    #1

;=== swap-depart
; Le programme doit afficher « B » à chaque flèche bas, et s'arrêter sur Échap.
; Il ne réagit jamais à la flèche bas : pourquoi ?
START:
.attente:
    MOVE.W  #8,-(SP)        ; Cnecin
    TRAP    #1
    ADDQ.L  #2,SP
    CMP.B   #$1B,D0         ; Échap ?
    BEQ.S   FIN
    CMP.B   #$50,D0         ; flèche bas ?
    BNE.S   .attente
    MOVE.W  #'B',-(SP)      ; Cconout
    MOVE.W  #2,-(SP)
    TRAP    #1
    ADDQ.L  #4,SP
    BRA.S   .attente
FIN:
    CLR.W   -(SP)
    TRAP    #1

;=== swap-solution
START:
.attente:
    MOVE.W  #8,-(SP)
    TRAP    #1
    ADDQ.L  #2,SP
    CMP.B   #$1B,D0
    BEQ.S   FIN
    SWAP    D0              ; le code clavier est dans le mot fort : on l'amène en bas
    CMP.B   #$50,D0
    BNE.S   .attente
    MOVE.W  #'B',-(SP)
    MOVE.W  #2,-(SP)
    TRAP    #1
    ADDQ.L  #4,SP
    BRA.S   .attente
FIN:
    CLR.W   -(SP)
    TRAP    #1

;=== joy-exemple
START:
    MOVE.W  #34,-(SP)       ; XBIOS 34 : Kbdvbase
    TRAP    #14
    ADDQ.L  #2,SP
    MOVEA.L D0,A0           ; A0 = table des vecteurs du clavier
    MOVE.L  24(A0),ANCIEN   ; on garde l'ancien vecteur joystick (offset 24)
    MOVE.L  #JOY,24(A0)     ; et on installe le nôtre
.attente:
    MOVE.W  #37,-(SP)       ; Vsync
    TRAP    #14
    ADDQ.L  #2,SP
    BTST    #7,ETAT         ; bouton de tir enfoncé ?
    BEQ.S   .attente
    MOVE.W  #34,-(SP)       ; avant de quitter : remettre l'ancien vecteur
    TRAP    #14
    ADDQ.L  #2,SP
    MOVEA.L D0,A0
    MOVE.L  ANCIEN,24(A0)
    CLR.W   -(SP)
    TRAP    #1

; JOY : appelée par le TOS à chaque paquet du joystick, A0 = le paquet
JOY:
    MOVE.B  2(A0),ETAT      ; état du joystick 1 (la prise « joystick »)
    RTS

ANCIEN: DC.L    0
ETAT:   DC.B    0

;=== joyetat-prediction
START:
    MOVE.B  #$89,D0         ; un état reçu du joystick
    MOVEQ   #0,D1
    BTST    #7,D0           ; bouton de tir ?
    BEQ.S   .pasfeu
    MOVEQ   #1,D1
.pasfeu:
    AND.B   #$0F,D0         ; on ne garde que les 4 directions
    CLR.W   -(SP)
    TRAP    #1

;=== brancher-depart
; Le programme doit attendre le bouton de tir du joystick, puis afficher « Feu ! ».
; La routine JOY est prête, mais il manque une ligne : laquelle ?
START:
    MOVE.W  #34,-(SP)       ; Kbdvbase
    TRAP    #14
    ADDQ.L  #2,SP
    MOVEA.L D0,A0
    MOVE.L  24(A0),ANCIEN   ; ancien vecteur joystick
    ; il manque une ligne ici

.attente:
    MOVE.W  #37,-(SP)       ; Vsync
    TRAP    #14
    ADDQ.L  #2,SP
    BTST    #7,ETAT
    BEQ.S   .attente
    MOVE.W  #34,-(SP)
    TRAP    #14
    ADDQ.L  #2,SP
    MOVEA.L D0,A0
    MOVE.L  ANCIEN,24(A0)   ; ancien vecteur remis
    PEA     FEU(PC)         ; Cconws
    MOVE.W  #9,-(SP)
    TRAP    #1
    ADDQ.L  #6,SP
    CLR.W   -(SP)
    TRAP    #1

JOY:
    MOVE.B  2(A0),ETAT
    RTS

ANCIEN: DC.L    0
ETAT:   DC.B    0
FEU:    DC.B    'Feu !',0

;=== brancher-solution
START:
    MOVE.W  #34,-(SP)
    TRAP    #14
    ADDQ.L  #2,SP
    MOVEA.L D0,A0
    MOVE.L  24(A0),ANCIEN
    MOVE.L  #JOY,24(A0)     ; notre routine reçoit les paquets du joystick
.attente:
    MOVE.W  #37,-(SP)
    TRAP    #14
    ADDQ.L  #2,SP
    BTST    #7,ETAT
    BEQ.S   .attente
    MOVE.W  #34,-(SP)
    TRAP    #14
    ADDQ.L  #2,SP
    MOVEA.L D0,A0
    MOVE.L  ANCIEN,24(A0)
    PEA     FEU(PC)
    MOVE.W  #9,-(SP)
    TRAP    #1
    ADDQ.L  #6,SP
    CLR.W   -(SP)
    TRAP    #1

JOY:
    MOVE.B  2(A0),ETAT
    RTS

ANCIEN: DC.L    0
ETAT:   DC.B    0
FEU:    DC.B    'Feu !',0

;=== routine74-depart
; La routine 7.4 du manuel : on attend le bouton de tir du joystick branché sur la
; prise « joystick » (le joystick 1), puis on quitte. Le programme ne s'arrête jamais...
; et il a un second défaut, plus sournois. Corrige les deux.
START:
    BSR     INIT_JOYSTICK
.attente:
    MOVE.W  #37,-(SP)       ; Vsync
    TRAP    #14
    ADDQ.L  #2,SP
    BTST    #7,JOY_PORT1    ; bouton du joystick 1 ?
    BEQ.S   .attente
    CLR.W   -(SP)
    TRAP    #1

; INIT_JOYSTICK : active le vecteur joystick de l'IKBD
INIT_JOYSTICK:
    MOVE.W  #34,-(SP)       ; XBIOS 34 : Kbdvbase
    TRAP    #14
    ADDQ.L  #2,SP
    MOVE.L  D0,A0           ; A0 = table des vecteurs clavier
    MOVE.L  24(A0),OLD_JOY  ; sauvegarde de l'ancien vecteur (offset 24)
    MOVE.L  #JOY_HANDLER,24(A0)
    RTS

JOY_HANDLER:
    MOVE.B  1(A0),JOY_PORT1 ; « état du joystick 1 (port principal) »
    MOVE.B  2(A0),JOY_PORT0 ; « état du joystick 0 (port souris) »
    RTS

OLD_JOY:   DC.L 0
JOY_PORT0: DC.B 0
JOY_PORT1: DC.B 0

;=== routine74-solution
START:
    BSR     INIT_JOYSTICK
.attente:
    MOVE.W  #37,-(SP)
    TRAP    #14
    ADDQ.L  #2,SP
    BTST    #7,JOY_PORT1
    BEQ.S   .attente
    BSR     FIN_JOYSTICK    ; on rend au TOS son vecteur avant de quitter
    CLR.W   -(SP)
    TRAP    #1

INIT_JOYSTICK:
    MOVE.W  #34,-(SP)
    TRAP    #14
    ADDQ.L  #2,SP
    MOVE.L  D0,A0
    MOVE.L  24(A0),OLD_JOY
    MOVE.L  #JOY_HANDLER,24(A0)
    RTS

FIN_JOYSTICK:
    MOVE.W  #34,-(SP)
    TRAP    #14
    ADDQ.L  #2,SP
    MOVE.L  D0,A0
    MOVE.L  OLD_JOY,24(A0)
    RTS

JOY_HANDLER:
    MOVE.B  1(A0),JOY_PORT0 ; 1(A0) : joystick 0 (prise souris)
    MOVE.B  2(A0),JOY_PORT1 ; 2(A0) : joystick 1 (prise joystick)
    RTS

OLD_JOY:   DC.L 0
JOY_PORT0: DC.B 0
JOY_PORT1: DC.B 0

;=== la-exemple
START:
    PEA     JOUER(PC)       ; Supexec : le YM2149 est du matériel (superviseur)
    MOVE.W  #38,-(SP)
    TRAP    #14
    ADDQ.L  #6,SP
    MOVEQ   #49,D7          ; une seconde : 50 images
.attente:
    MOVE.W  #37,-(SP)       ; Vsync
    TRAP    #14
    ADDQ.L  #2,SP
    DBF     D7,.attente
    PEA     SILENCE(PC)
    MOVE.W  #38,-(SP)
    TRAP    #14
    ADDQ.L  #6,SP
    CLR.W   -(SP)
    TRAP    #1

JOUER:
    LEA     $FFFF8800.W,A0  ; (A0) : choix du registre ; 2(A0) : sa valeur
    MOVE.B  #0,(A0)         ; registre 0 : période de la voie A, octet faible
    MOVE.B  #$1C,2(A0)
    MOVE.B  #1,(A0)         ; registre 1 : octet fort -> période $11C = 284
    MOVE.B  #$01,2(A0)
    MOVE.B  #7,(A0)         ; registre 7 : le mixeur
    MOVE.B  #%11111110,2(A0) ; seul le son carré de la voie A est actif (0 = actif)
    MOVE.B  #8,(A0)         ; registre 8 : volume de la voie A
    MOVE.B  #15,2(A0)       ; au maximum
    RTS

SILENCE:
    MOVE.B  #8,$FFFF8800.W  ; volume de la voie A...
    MOVE.B  #0,$FFFF8802.W  ; ... à 0
    RTS

;=== frequence-prediction
START:
    MOVE.L  #2000000,D0     ; horloge du YM2149 : 2 MHz
    DIVU    #16*568,D0      ; fréquence = 2 MHz / (16 x période)
    CLR.W   -(SP)
    TRAP    #1

;=== mixeur-depart
; La voie B doit jouer un la (période 284) au volume maximum, avec son carré
; et sans bruit. On n'entend rien : corrige la valeur du mixeur.
START:
    PEA     JOUER(PC)       ; Supexec
    MOVE.W  #38,-(SP)
    TRAP    #14
    ADDQ.L  #6,SP
    CLR.W   -(SP)
    TRAP    #1

JOUER:
    LEA     $FFFF8800.W,A0
    MOVE.B  #2,(A0)         ; période de la voie B
    MOVE.B  #$1C,2(A0)
    MOVE.B  #3,(A0)
    MOVE.B  #$01,2(A0)
    MOVE.B  #9,(A0)         ; volume de la voie B
    MOVE.B  #15,2(A0)
    MOVE.B  #7,(A0)         ; mixeur
    MOVE.B  #%11111111,2(A0)
    RTS

;=== mixeur-solution
START:
    PEA     JOUER(PC)
    MOVE.W  #38,-(SP)
    TRAP    #14
    ADDQ.L  #6,SP
    CLR.W   -(SP)
    TRAP    #1

JOUER:
    LEA     $FFFF8800.W,A0
    MOVE.B  #2,(A0)
    MOVE.B  #$1C,2(A0)
    MOVE.B  #3,(A0)
    MOVE.B  #$01,2(A0)
    MOVE.B  #9,(A0)
    MOVE.B  #15,2(A0)
    MOVE.B  #7,(A0)
    MOVE.B  #%11111101,2(A0) ; bit 1 à 0 : son carré de la voie B actif
    RTS

;=== accord-depart
; Joue un accord de la majeur : voie A = la (période 284), voie B = do# (225),
; voie C = mi (190), les trois au volume 12, sons carrés seuls (pas de bruit).
START:
    PEA     ACCORD(PC)      ; Supexec
    MOVE.W  #38,-(SP)
    TRAP    #14
    ADDQ.L  #6,SP
    CLR.W   -(SP)
    TRAP    #1

ACCORD:

    RTS

;=== accord-solution
START:
    PEA     ACCORD(PC)
    MOVE.W  #38,-(SP)
    TRAP    #14
    ADDQ.L  #6,SP
    CLR.W   -(SP)
    TRAP    #1

ACCORD:
    MOVE.L  #$00001C00,$FFFF8800.W ; registre 0 = $1C (en un seul MOVE.L : choix + valeur)
    MOVE.L  #$01000100,$FFFF8800.W ; registre 1 = $01  -> voie A : 284
    MOVE.L  #$0200E100,$FFFF8800.W ; registre 2 = $E1
    MOVE.L  #$03000000,$FFFF8800.W ; registre 3 = 0    -> voie B : 225
    MOVE.L  #$0400BE00,$FFFF8800.W ; registre 4 = $BE
    MOVE.L  #$05000000,$FFFF8800.W ; registre 5 = 0    -> voie C : 190
    MOVE.L  #$0700F800,$FFFF8800.W ; mixeur : %11111000, 3 sons carrés
    MOVE.L  #$08000C00,$FFFF8800.W ; volumes à 12
    MOVE.L  #$09000C00,$FFFF8800.W
    MOVE.L  #$0A000C00,$FFFF8800.W
    RTS

;=== melodie-depart
; Joue les 4 notes de NOTES (périodes de la voie A), 10 images chacune, depuis une
; routine placée dans la file des routines VBL (_vblqueue, en $456). Après la 4e note,
; la routine coupe le son (volume 0) et met FINI à -1 ; le programme principal attend
; FINI, retire la routine de la file et quitte.
START:

    CLR.W   -(SP)
    TRAP    #1

NOTES:   DC.W    284,253,225,213    ; la, si, do#, ré
RANG:    DC.W    0                  ; numéro de la prochaine note
ATTENTE: DC.W    0                  ; images restantes pour la note en cours
FINI:    DC.B    0

;=== melodie-solution
START:
    PEA     INSTALLER(PC)   ; $456 est protégé : Supexec
    MOVE.W  #38,-(SP)
    TRAP    #14
    ADDQ.L  #6,SP
.attente:
    MOVE.W  #37,-(SP)       ; Vsync
    TRAP    #14
    ADDQ.L  #2,SP
    TST.B   FINI
    BEQ.S   .attente
    PEA     RETIRER(PC)
    MOVE.W  #38,-(SP)
    TRAP    #14
    ADDQ.L  #6,SP
    CLR.W   -(SP)
    TRAP    #1

INSTALLER:
    MOVE.B  #7,$FFFF8800.W
    MOVE.B  #%11111110,$FFFF8802.W ; voie A : son carré seul
    MOVEA.L $456.W,A0       ; _vblqueue : adresse de la file
    MOVE.L  #MELODIE,(A0)   ; 1re place de la file (vide au départ)
    RTS

RETIRER:
    MOVEA.L $456.W,A0
    CLR.L   (A0)
    RTS

; MELODIE : appelée par le TOS à chaque VBL, en superviseur
MELODIE:
    TST.B   FINI
    BNE.S   .fin
    SUBQ.W  #1,ATTENTE
    BGT.S   .fin            ; la note en cours continue
    MOVE.W  #10,ATTENTE
    MOVE.W  RANG,D0
    CMP.W   #4,D0
    BEQ.S   .stop
    ADD.W   D0,D0           ; table de mots : rang x 2
    LEA     NOTES,A0
    MOVE.W  0(A0,D0.W),D1   ; période de la note
    LEA     $FFFF8800.W,A1
    MOVE.B  #0,(A1)
    MOVE.B  D1,2(A1)        ; octet faible
    LSR.W   #8,D1
    MOVE.B  #1,(A1)
    MOVE.B  D1,2(A1)        ; octet fort
    MOVE.B  #8,(A1)
    MOVE.B  #15,2(A1)       ; volume
    ADDQ.W  #1,RANG
.fin:
    RTS
.stop:
    MOVE.B  #8,$FFFF8800.W
    MOVE.B  #0,$FFFF8802.W  ; silence
    ST      FINI
    RTS

NOTES:   DC.W    284,253,225,213
RANG:    DC.W    0
ATTENTE: DC.W    0
FINI:    DC.B    0

;=== bip-depart
; Défi : déplace le carré (16 x 16, couleur 1, lignes 92 à 107, départ en X = 0) avec le
; joystick : 2 pixels par image vers la gauche ou la droite, sans sortir de l'écran
; (X entre 0 et 304). Fais « bip » quand il touche un bord. Le bouton de tir quitte.
START:

    CLR.W   -(SP)
    TRAP    #1

;=== bip-solution
START:
    MOVE.W  #2,-(SP)        ; Physbase
    TRAP    #14
    ADDQ.L  #2,SP
    MOVEA.L D0,A6
    LEA     92*160(A6),A6   ; bande du carré
    MOVE.W  #34,-(SP)       ; Kbdvbase
    TRAP    #14
    ADDQ.L  #2,SP
    MOVEA.L D0,A5
    MOVE.L  24(A5),ANCIEN
    MOVE.L  #JOY,24(A5)
    MOVEQ   #0,D5           ; X
    BSR     DESSINER
.image:
    MOVE.W  #37,-(SP)       ; Vsync
    TRAP    #14
    ADDQ.L  #2,SP
    MOVE.B  ETAT,D4
    BTST    #7,D4           ; tir : fin
    BNE.S   .fin
    MOVE.W  D5,D3           ; ancienne position
    BTST    #3,D4           ; droite ?
    BEQ.S   .pasdroite
    ADDQ.W  #2,D5
.pasdroite:
    BTST    #2,D4           ; gauche ?
    BEQ.S   .pasgauche
    SUBQ.W  #2,D5
.pasgauche:
    TST.W   D5
    BGE.S   .okgauche
    MOVEQ   #0,D5           ; bord gauche
    BSR     BIP
.okgauche:
    CMP.W   #304,D5
    BLE.S   .okdroite
    MOVE.W  #304,D5         ; bord droit
    BSR     BIP
.okdroite:
    CMP.W   D3,D5
    BEQ.S   .image          ; rien n'a bougé
    BSR     DESSINER
    BRA.S   .image
.fin:
    MOVE.L  ANCIEN,24(A5)   ; on rend son vecteur au TOS
    CLR.W   -(SP)
    TRAP    #1

; BIP : un son court, joué par le TOS (Dosound)
BIP:
    PEA     SONBIP(PC)
    MOVE.W  #32,-(SP)       ; XBIOS 32 : Dosound
    TRAP    #14
    ADDQ.L  #6,SP
    RTS

; DESSINER : efface la bande puis dessine le carré en X = D5
DESSINER:
    MOVEA.L A6,A0
    MOVE.W  #16*40-1,D0
.effacer:
    CLR.L   (A0)+
    DBF     D0,.effacer
    MOVEA.L A6,A0
    MOVE.W  D5,D0
    LSR.W   #4,D0
    LSL.W   #3,D0
    ADDA.W  D0,A0
    MOVE.W  D5,D1
    AND.W   #15,D1
    MOVE.L  #$FFFF0000,D2
    LSR.L   D1,D2
    MOVEQ   #15,D0
.ligne:
    SWAP    D2
    MOVE.W  D2,(A0)
    SWAP    D2
    MOVE.W  D2,8(A0)
    LEA     160(A0),A0
    DBF     D0,.ligne
    RTS

JOY:
    MOVE.B  2(A0),ETAT
    RTS

ANCIEN: DC.L    0
SONBIP: DC.B    0,$80,1,0,7,$FE,8,15,$FF,4,8,0,$FF,0
ETAT:   DC.B    0
