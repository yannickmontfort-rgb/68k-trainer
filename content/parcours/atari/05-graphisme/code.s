; Codes du chapitre 5 « Graphisme et framebuffer » (mode utilisateur).

;=== pixel-exemple
START:
    MOVE.W  #2,-(SP)        ; XBIOS 2 : Physbase
    TRAP    #14
    ADDQ.L  #2,SP
    MOVEA.L D0,A0           ; A0 = début de l'écran
    MOVE.W  #100,D4         ; Y = 100
    MULU    #160,D4         ; Y x 160 = début de la ligne
    ADDA.L  D4,A0
    MOVE.W  #37,D1          ; X = 37
    MOVE.W  D1,D2
    LSR.W   #4,D2           ; X / 16 = numéro du groupe de 16 pixels
    LSL.W   #3,D2           ; x 8 octets par groupe
    ADDA.W  D2,A0           ; A0 = plan 0 du groupe
    AND.W   #15,D1          ; X mod 16 = rang du pixel dans le groupe
    MOVE.W  #15,D3
    SUB.W   D1,D3           ; numéro du bit (15 = pixel de gauche)
    MOVE.W  #1,D5
    LSL.W   D3,D5           ; masque : un seul bit à 1
    OR.W    D5,(A0)         ; allume le pixel dans le plan 0 : couleur 1
    CLR.W   -(SP)
    TRAP    #1

;=== prediction-adresse
START:
    LEA     $F8000+100*160+160/16*8,A0
    MOVE.W  #160,D1
    AND.W   #15,D1
    MOVE.W  #15,D2
    SUB.W   D1,D2
    CLR.W   -(SP)
    TRAP    #1

;=== couleur3-depart
; Le pixel (0, 0) doit prendre la couleur 3 (%0011)
START:
    MOVE.W  #2,-(SP)        ; Physbase
    TRAP    #14
    ADDQ.L  #2,SP
    MOVEA.L D0,A0           ; A0 = groupe des 16 premiers pixels
    OR.W    #$8000,(A0)     ; plan 0 : bit 15 (pixel de gauche) à 1
    ; quel autre plan faut-il modifier ?

    CLR.W   -(SP)
    TRAP    #1

;=== couleur3-solution
START:
    MOVE.W  #2,-(SP)
    TRAP    #14
    ADDQ.L  #2,SP
    MOVEA.L D0,A0
    OR.W    #$8000,(A0)     ; plan 0
    OR.W    #$8000,2(A0)    ; plan 1
    CLR.W   -(SP)
    TRAP    #1

;=== ligne-depart
; Trace sur la ligne Y = 10 un trait de 32 pixels (X = 0 à 31) en couleur 1
START:

    CLR.W   -(SP)
    TRAP    #1

;=== ligne-solution
START:
    MOVE.W  #2,-(SP)
    TRAP    #14
    ADDQ.L  #2,SP
    MOVEA.L D0,A0
    LEA     10*160(A0),A0   ; début de la ligne 10
    MOVE.W  #$FFFF,(A0)     ; plan 0 du 1er groupe : pixels 0 à 15
    MOVE.W  #$FFFF,8(A0)    ; plan 0 du 2e groupe : pixels 16 à 31
    CLR.W   -(SP)
    TRAP    #1

;=== pset-depart
; Dessine le pixel (37, 10) en couleur 5 avec la routine PSET du manuel.
; La routine contient DEUX erreurs. Trouve-les avec le pas à pas.
START:
    MOVE.W  #2,-(SP)        ; Physbase
    TRAP    #14
    ADDQ.L  #2,SP
    MOVE.L  D0,SCREEN_BASE
    MOVE.W  #37,D1          ; X
    MOVE.W  #10,D4          ; Y
    MOVE.W  #5,D2           ; couleur
    BSR     PSET
    CLR.W   -(SP)
    TRAP    #1

; PSET : D1.W = X (0-319), D4.W = Y (0-199), D2.W = couleur (0-15)
PSET:
    MOVEM.L D0-D6/A0-A1,-(SP)
    LEA     SCREEN_BASE,A0
    MOVE.L  (A0),A0
    MULU.W  #160,D4
    ADDA.L  D4,A0           ; A0 pointe au début de la ligne Y
    MOVE.W  D1,D0
    LSR.W   #1,D0           ; D0 = X / 2
    ANDI.W  #$FFFE,D0       ; « aligner sur une adresse paire »
    ADDA.L  D0,A0           ; A0 pointe sur les 4 mots du groupe
    ANDI.W  #15,D1
    MOVE.W  #15,D3
    SUB.W   D1,D3           ; numéro du bit
    MOVE.W  #1,D5
    LSL.W   D3,D5           ; masque du pixel
    MOVE.W  D5,D6
    NOT.W   D6              ; masque inversé
    AND.W   D6,(A0)         ; plan 0
    LSR.W   #1,D2
    BCC.S   .BP1
    OR.W    D5,(A0)
.BP1:
    AND.W   D6,2(A0)        ; plan 1
    LSR.W   #1,D2
    BCC.S   .BP2
    OR.W    D5,2(A0)
.BP2:
    AND.W   D6,4(A0)        ; plan 2
    LSR.W   #1,D2
    BCC.S   .BP3
    OR.W    D5,4(A0)
.BP3:
    AND.W   D6,6(A0)        ; plan 3
    LSR.W   #1,D2
    BCC.S   .DONE
    OR.W    D5,6(A0)
.DONE:
    MOVEM.L (SP)+,D0-D6/A0-A1
    RTS

    EVEN
SCREEN_BASE:
    DC.L    0

;=== pset-solution
START:
    MOVE.W  #2,-(SP)
    TRAP    #14
    ADDQ.L  #2,SP
    MOVE.L  D0,SCREEN_BASE
    MOVE.W  #37,D1
    MOVE.W  #10,D4
    MOVE.W  #5,D2
    BSR     PSET
    CLR.W   -(SP)
    TRAP    #1

PSET:
    MOVEM.L D0-D6/A0-A1,-(SP)
    LEA     SCREEN_BASE,A0
    MOVE.L  (A0),A0
    MULU.W  #160,D4
    ADDA.L  D4,A0
    MOVE.W  D1,D0
    LSR.W   #1,D0
    ANDI.W  #$FFF8,D0       ; correction 1 : aligner sur un groupe de 8 octets
    ADDA.W  D0,A0           ; correction 2 : seul le mot faible de D0 est valable
    ANDI.W  #15,D1
    MOVE.W  #15,D3
    SUB.W   D1,D3
    MOVE.W  #1,D5
    LSL.W   D3,D5
    MOVE.W  D5,D6
    NOT.W   D6
    AND.W   D6,(A0)
    LSR.W   #1,D2
    BCC.S   .BP1
    OR.W    D5,(A0)
.BP1:
    AND.W   D6,2(A0)
    LSR.W   #1,D2
    BCC.S   .BP2
    OR.W    D5,2(A0)
.BP2:
    AND.W   D6,4(A0)
    LSR.W   #1,D2
    BCC.S   .BP3
    OR.W    D5,4(A0)
.BP3:
    AND.W   D6,6(A0)
    LSR.W   #1,D2
    BCC.S   .DONE
    OR.W    D5,6(A0)
.DONE:
    MOVEM.L (SP)+,D0-D6/A0-A1
    RTS

    EVEN
SCREEN_BASE:
    DC.L    0

;=== palette-exemple
START:
    MOVE.W  #2,-(SP)        ; Physbase
    TRAP    #14
    ADDQ.L  #2,SP
    MOVEA.L D0,A0
    MOVE.W  #3999,D3        ; 4000 groupes de 16 pixels
REMPLIR:
    CLR.W   (A0)+           ; plan 0 : 0
    MOVE.W  #$FFFF,(A0)+    ; plan 1 : 1
    CLR.L   (A0)+           ; plans 2 et 3 : 0
    DBRA    D3,REMPLIR      ; tout l'écran en couleur 2 (%0010)
    MOVE.W  #$007,-(SP)     ; bleu
    MOVE.W  #2,-(SP)        ; couleur n° 2
    MOVE.W  #7,-(SP)        ; XBIOS 7 : Setcolor
    TRAP    #14
    ADDQ.L  #6,SP
    CLR.W   -(SP)
    TRAP    #1

;=== palette-prediction
START:
    MOVE.W  #2,-(SP)
    TRAP    #14
    ADDQ.L  #2,SP
    MOVEA.L D0,A0
    MOVE.W  #3999,D3
REMPLIR:
    CLR.W   (A0)+
    MOVE.W  #$FFFF,(A0)+
    CLR.L   (A0)+
    DBRA    D3,REMPLIR
    MOVE.W  #$700,-(SP)
    MOVE.W  #2,-(SP)
    MOVE.W  #7,-(SP)        ; Setcolor(2, $700)
    TRAP    #14
    ADDQ.L  #6,SP
    CLR.W   -(SP)
    TRAP    #1

;=== rouge15-depart
; Avec Setcolor, donne à la couleur 15 la valeur rouge vif
START:

    CLR.W   -(SP)
    TRAP    #1

;=== rouge15-solution
START:
    MOVE.W  #$700,-(SP)
    MOVE.W  #15,-(SP)
    MOVE.W  #7,-(SP)
    TRAP    #14
    ADDQ.L  #6,SP
    CLR.W   -(SP)
    TRAP    #1

;=== remplir15-depart
; Remplis tout l'écran avec la couleur 15 (%1111)
START:

    CLR.W   -(SP)
    TRAP    #1

;=== remplir15-solution
START:
    MOVE.W  #2,-(SP)
    TRAP    #14
    ADDQ.L  #2,SP
    MOVEA.L D0,A0
    MOVE.W  #7999,D3        ; 32 000 octets = 8 000 mots longs
REMPLIR:
    MOVE.L  #-1,(A0)+       ; tous les bits de tous les plans à 1
    DBRA    D3,REMPLIR
    CLR.W   -(SP)
    TRAP    #1

;=== bonus-carre-depart
; Dessine en haut à gauche un carré plein de 16 x 16 pixels en couleur 4
START:

    CLR.W   -(SP)
    TRAP    #1

;=== bonus-carre-solution
START:
    MOVE.W  #2,-(SP)
    TRAP    #14
    ADDQ.L  #2,SP
    MOVEA.L D0,A0
    MOVE.W  #15,D3          ; 16 lignes
LIGNE:
    MOVE.W  #$FFFF,4(A0)    ; couleur 4 = %0100 : plan 2 seulement
    LEA     160(A0),A0      ; ligne suivante
    DBRA    D3,LIGNE
    CLR.W   -(SP)
    TRAP    #1
