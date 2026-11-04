; Codes du chapitre 9 « Ligne A et GEM » (mode utilisateur).
; Chaque bloc « ;=== nom » est référencé dans chapitre.json par « @code.s#nom ».

;=== rappel
START:
    LEA     TABLE,A0        ; deux mots rangés dans la section DATA
    MOVE.W  (A0)+,D1
    ADD.W   (A0),D1
    LEA     RESULTAT,A1     ; un mot réservé dans la section BSS
    MOVE.W  D1,(A1)
    MOVE.W  #160/16*8,D2    ; décalage du groupe de 16 pixels qui contient X = 160
    CLR.W   -(SP)
    TRAP    #1
    SECTION DATA
TABLE:  DC.W    30,12
    SECTION BSS
RESULTAT: DS.W  1

;=== lignea-exemple
START:
    DC.W    $A000           ; A0 = adresse des variables de la Ligne A
    MOVEA.L A0,A5           ; A5 les garde : la Ligne A peut modifier D0-D2 et A0-A2
    MOVEA.L 8(A5),A1        ; INTIN
    MOVE.W  #1,(A1)         ; couleur 1
    MOVEA.L 12(A5),A1       ; PTSIN
    MOVE.W  #160,(A1)       ; x
    MOVE.W  #100,2(A1)      ; y
    DC.W    $A001           ; allume le pixel (160, 100)
    MOVE.W  #1,24(A5)       ; couleur 3 = %0011 : COLBIT0 = 1
    MOVE.W  #1,26(A5)       ;                     COLBIT1 = 1
    CLR.W   28(A5)          ;                     COLBIT2 = 0
    CLR.W   30(A5)          ;                     COLBIT3 = 0
    MOVE.W  #$FFFF,34(A5)   ; LN_MASK : trait plein
    CLR.W   36(A5)          ; WRT_MODE : remplacement
    MOVE.W  #10,38(A5)      ; X1
    MOVE.W  #10,40(A5)      ; Y1
    MOVE.W  #300,42(A5)     ; X2
    MOVE.W  #190,44(A5)     ; Y2
    DC.W    $A003           ; trace la ligne
    CLR.W   -(SP)
    TRAP    #1

;=== lignea-prediction
START:
    DC.W    $A000
    MOVEA.L A0,A5
    MOVEA.L 8(A5),A1        ; INTIN
    MOVE.W  #6,(A1)         ; couleur 6
    MOVEA.L 12(A5),A1       ; PTSIN
    MOVE.W  #20,(A1)
    MOVE.W  #30,2(A1)
    DC.W    $A001           ; pixel (20, 30)
    MOVEA.L 12(A5),A1
    MOVE.W  #20,(A1)
    MOVE.W  #30,2(A1)
    DC.W    $A002           ; relit le pixel (20, 30)
    MOVE.W  D0,D3
    MOVEA.L 12(A5),A1
    MOVE.W  #21,(A1)
    DC.W    $A002           ; relit le pixel (21, 30)
    MOVE.W  D0,D4
    CLR.W   -(SP)
    TRAP    #1

;=== pixel-depart
; Allume le pixel (100, 50) en couleur 2
START:
    DC.W    $A000
    MOVEA.L A0,A5
    MOVEA.L 8(A5),A1        ; INTIN
    MOVE.W  #2,(A1)         ; couleur 2
    ; les coordonnées vont dans PTSIN

    DC.W    $A001
    CLR.W   -(SP)
    TRAP    #1

;=== pixel-solution
START:
    DC.W    $A000
    MOVEA.L A0,A5
    MOVEA.L 8(A5),A1
    MOVE.W  #2,(A1)
    MOVEA.L 12(A5),A1       ; PTSIN
    MOVE.W  #100,(A1)       ; x
    MOVE.W  #50,2(A1)       ; y
    DC.W    $A001
    CLR.W   -(SP)
    TRAP    #1

;=== ordonner-entete
START:
    DC.W    $A000
    MOVEA.L A0,A5
    MOVEA.L 8(A5),A1        ; un pixel de couleur 7 en (50, 60)
    MOVE.W  #7,(A1)
    MOVEA.L 12(A5),A1
    MOVE.W  #50,(A1)
    MOVE.W  #60,2(A1)
    DC.W    $A001

;=== ordonner-pied
    CLR.W   -(SP)
    TRAP    #1

;=== cadre-depart
; Trace un cadre en couleur 1 : de (20, 20) à (299, 179)
START:
    DC.W    $A000
    MOVEA.L A0,A5
    MOVE.W  #1,24(A5)
    CLR.W   26(A5)
    CLR.W   28(A5)
    CLR.W   30(A5)
    MOVE.W  #$FFFF,34(A5)
    CLR.W   36(A5)
    ; quatre lignes : le haut, la droite, le bas, la gauche

    CLR.W   -(SP)
    TRAP    #1

;=== cadre-solution
START:
    DC.W    $A000
    MOVEA.L A0,A5
    MOVE.W  #1,24(A5)
    CLR.W   26(A5)
    CLR.W   28(A5)
    CLR.W   30(A5)
    MOVE.W  #$FFFF,34(A5)
    CLR.W   36(A5)
    LEA     COINS,A4        ; X1, Y1, X2, Y2 de chaque côté
    MOVEQ   #3,D7
.cote:
    MOVE.L  (A4)+,38(A5)    ; X1 et Y1 d'un coup
    MOVE.L  (A4)+,42(A5)    ; X2 et Y2
    DC.W    $A003
    DBF     D7,.cote
    CLR.W   -(SP)
    TRAP    #1
COINS:  DC.W    20,20,299,20,299,20,299,179,299,179,20,179,20,179,20,20

;=== eventail-depart
; Trace 8 lignes de (160, 100) vers les points de la table BOUTS, en couleur 5
START:
    DC.W    $A000
    MOVEA.L A0,A5
    MOVE.W  #1,24(A5)       ; couleur 5 = %0101
    CLR.W   26(A5)
    MOVE.W  #1,28(A5)
    CLR.W   30(A5)
    MOVE.W  #$FFFF,34(A5)
    CLR.W   36(A5)

    CLR.W   -(SP)
    TRAP    #1
    SECTION DATA
BOUTS:  DC.W    0,0,160,0,319,0,319,100,319,199,160,199,0,199,0,100

;=== eventail-solution
START:
    DC.W    $A000
    MOVEA.L A0,A5
    MOVE.W  #1,24(A5)
    CLR.W   26(A5)
    MOVE.W  #1,28(A5)
    CLR.W   30(A5)
    MOVE.W  #$FFFF,34(A5)
    CLR.W   36(A5)
    LEA     BOUTS,A4
    MOVEQ   #7,D7           ; 8 lignes
.ligne:
    MOVE.W  #160,38(A5)     ; X1 : le centre
    MOVE.W  #100,40(A5)     ; Y1
    MOVE.L  (A4)+,42(A5)    ; X2 et Y2 : le bout suivant
    DC.W    $A003
    DBF     D7,.ligne
    CLR.W   -(SP)
    TRAP    #1
    SECTION DATA
BOUTS:  DC.W    0,0,160,0,319,0,319,100,319,199,160,199,0,199,0,100

;=== gem-exemple
START:
    LEA     CONTROL,A3
    MOVE.W  #10,(A3)        ; appl_init : s'annoncer au GEM
    CLR.W   2(A3)           ; aucun entier en entrée
    MOVE.W  #1,4(A3)        ; un entier en sortie
    CLR.L   6(A3)           ; aucune adresse en entrée ni en sortie
    BSR     AES
    MOVE.W  #52,(A3)        ; form_alert
    MOVE.W  #1,2(A3)        ; un entier en entrée : le bouton par défaut
    MOVE.W  #1,4(A3)        ; un entier en sortie : le bouton cliqué
    MOVE.W  #1,6(A3)        ; une adresse en entrée : le texte
    CLR.W   8(A3)
    MOVE.W  #1,INT_IN
    MOVE.L  #ALERTE,ADDR_IN
    BSR     AES
    MOVE.W  INT_OUT,D7      ; le bouton cliqué
    MOVE.W  #19,(A3)        ; appl_exit
    CLR.W   2(A3)
    MOVE.W  #1,4(A3)
    CLR.L   6(A3)
    BSR     AES
    CLR.W   -(SP)
    TRAP    #1
AES:
    MOVE.L  #AES_PB,D1      ; adresse du bloc de paramètres
    MOVE.W  #$C8,D0         ; l'AES
    TRAP    #2
    RTS
    SECTION DATA
AES_PB: DC.L    CONTROL,GLOBAL,INT_IN,INT_OUT,ADDR_IN,ADDR_OUT
ALERTE: DC.B    '[1][Bonjour depuis le GEM|Seconde ligne][ OK | Annuler ]',0
    EVEN
    SECTION BSS
CONTROL:  DS.W  5
GLOBAL:   DS.W  15
INT_IN:   DS.W  16
INT_OUT:  DS.W  7
ADDR_IN:  DS.L  2
ADDR_OUT: DS.L  1

;=== gem-prediction
START:
    LEA     CONTROL,A3
    MOVE.W  #52,(A3)        ; form_alert
    MOVE.W  #1,2(A3)
    MOVE.W  #1,4(A3)
    MOVE.W  #1,6(A3)
    CLR.W   8(A3)
    MOVE.W  #1,INT_IN       ; bouton 1 par défaut
    MOVE.L  #QUESTION,ADDR_IN
    MOVE.L  #AES_PB,D1
    MOVE.W  #$C8,D0
    TRAP    #2
    CMPI.W  #2,INT_OUT
    BEQ.S   .non
    PEA     OUI
    BRA.S   .affiche
.non:
    PEA     NON
.affiche:
    MOVE.W  #9,-(SP)        ; Cconws
    TRAP    #1
    ADDQ.L  #6,SP
    CLR.W   -(SP)
    TRAP    #1
    SECTION DATA
AES_PB:   DC.L  CONTROL,GLOBAL,INT_IN,INT_OUT,ADDR_IN,ADDR_OUT
QUESTION: DC.B  '[2][On continue ?][Oui|Non]',0
OUI:      DC.B  'On continue.',0
NON:      DC.B  'On arrete.',0
    EVEN
    SECTION BSS
CONTROL:  DS.W  5
GLOBAL:   DS.W  15
INT_IN:   DS.W  16
INT_OUT:  DS.W  7
ADDR_IN:  DS.L  2
ADDR_OUT: DS.L  1

;=== alerte-depart
; L'alerte doit s'afficher avec un bouton « Compris »
START:
    LEA     CONTROL,A3
    MOVE.W  #52,(A3)
    MOVE.W  #1,2(A3)
    MOVE.W  #1,4(A3)
    MOVE.W  #1,6(A3)
    CLR.W   8(A3)
    MOVE.W  #1,INT_IN
    MOVE.L  #ALERTE,ADDR_IN
    MOVE.L  #AES_PB,D1
    MOVE.W  #$C8,D0
    TRAP    #2
    CLR.W   -(SP)
    TRAP    #1
    SECTION DATA
AES_PB: DC.L    CONTROL,GLOBAL,INT_IN,INT_OUT,ADDR_IN,ADDR_OUT
ALERTE: DC.B    '[3][Disquette pleine][Compris',0
    EVEN
    SECTION BSS
CONTROL:  DS.W  5
GLOBAL:   DS.W  15
INT_IN:   DS.W  16
INT_OUT:  DS.W  7
ADDR_IN:  DS.L  2
ADDR_OUT: DS.L  1

;=== alerte-solution
START:
    LEA     CONTROL,A3
    MOVE.W  #52,(A3)
    MOVE.W  #1,2(A3)
    MOVE.W  #1,4(A3)
    MOVE.W  #1,6(A3)
    CLR.W   8(A3)
    MOVE.W  #1,INT_IN
    MOVE.L  #ALERTE,ADDR_IN
    MOVE.L  #AES_PB,D1
    MOVE.W  #$C8,D0
    TRAP    #2
    CLR.W   -(SP)
    TRAP    #1
    SECTION DATA
AES_PB: DC.L    CONTROL,GLOBAL,INT_IN,INT_OUT,ADDR_IN,ADDR_OUT
ALERTE: DC.B    '[3][Disquette pleine][Compris]',0
    EVEN
    SECTION BSS
CONTROL:  DS.W  5
GLOBAL:   DS.W  15
INT_IN:   DS.W  16
INT_OUT:  DS.W  7
ADDR_IN:  DS.L  2
ADDR_OUT: DS.L  1

;=== annuler-depart
; Bouton 1 (Enregistrer) : Pterm avec le code 0. Bouton 2 (Annuler) : Pterm avec le code 1.
START:
    LEA     CONTROL,A3
    MOVE.W  #52,(A3)
    MOVE.W  #1,2(A3)
    MOVE.W  #1,4(A3)
    MOVE.W  #1,6(A3)
    CLR.W   8(A3)
    MOVE.W  #1,INT_IN
    MOVE.L  #ALERTE,ADDR_IN
    MOVE.L  #AES_PB,D1
    MOVE.W  #$C8,D0
    TRAP    #2
    ; le bouton cliqué est dans INT_OUT

    CLR.W   -(SP)
    TRAP    #1
    SECTION DATA
AES_PB: DC.L    CONTROL,GLOBAL,INT_IN,INT_OUT,ADDR_IN,ADDR_OUT
ALERTE: DC.B    '[2][Enregistrer le dessin ?][Enregistrer|Annuler]',0
    EVEN
    SECTION BSS
CONTROL:  DS.W  5
GLOBAL:   DS.W  15
INT_IN:   DS.W  16
INT_OUT:  DS.W  7
ADDR_IN:  DS.L  2
ADDR_OUT: DS.L  1

;=== annuler-solution
START:
    LEA     CONTROL,A3
    MOVE.W  #52,(A3)
    MOVE.W  #1,2(A3)
    MOVE.W  #1,4(A3)
    MOVE.W  #1,6(A3)
    CLR.W   8(A3)
    MOVE.W  #1,INT_IN
    MOVE.L  #ALERTE,ADDR_IN
    MOVE.L  #AES_PB,D1
    MOVE.W  #$C8,D0
    TRAP    #2
    MOVE.W  INT_OUT,D0
    SUBQ.W  #1,D0           ; bouton 1 → code 0, bouton 2 → code 1
    MOVE.W  D0,-(SP)
    MOVE.W  #$4C,-(SP)      ; Pterm(code)
    TRAP    #1
    SECTION DATA
AES_PB: DC.L    CONTROL,GLOBAL,INT_IN,INT_OUT,ADDR_IN,ADDR_OUT
ALERTE: DC.B    '[2][Enregistrer le dessin ?][Enregistrer|Annuler]',0
    EVEN
    SECTION BSS
CONTROL:  DS.W  5
GLOBAL:   DS.W  15
INT_IN:   DS.W  16
INT_OUT:  DS.W  7
ADDR_IN:  DS.L  2
ADDR_OUT: DS.L  1

;=== bonus-depart
; Trace en OU exclusif une ligne horizontale (y = 100) et une ligne verticale (x = 160), en couleur 15
START:
    DC.W    $A000
    MOVEA.L A0,A5

    CLR.W   -(SP)
    TRAP    #1

;=== bonus-solution
START:
    DC.W    $A000
    MOVEA.L A0,A5
    MOVE.W  #1,24(A5)       ; couleur 15 : les quatre plans
    MOVE.W  #1,26(A5)
    MOVE.W  #1,28(A5)
    MOVE.W  #1,30(A5)
    MOVE.W  #$FFFF,34(A5)
    MOVE.W  #2,36(A5)       ; OU exclusif
    MOVE.W  #-1,32(A5)      ; LSTLIN : le dernier point est tracé lui aussi
    CLR.W   38(A5)          ; la ligne horizontale
    MOVE.W  #100,40(A5)
    MOVE.W  #319,42(A5)
    MOVE.W  #100,44(A5)
    DC.W    $A003
    MOVE.W  #160,38(A5)     ; la ligne verticale
    CLR.W   40(A5)
    MOVE.W  #160,42(A5)
    MOVE.W  #199,44(A5)
    DC.W    $A003
    CLR.W   -(SP)
    TRAP    #1
