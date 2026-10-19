; Codes du chapitre 6 « Animation, sprites et décalage au pixel » (mode utilisateur).

;=== copie-exemple
START:
    MOVE.W  #2,-(SP)        ; Physbase : adresse de l'écran
    TRAP    #14
    ADDQ.L  #2,SP
    MOVEA.L D0,A1
    LEA     50*160+8*8(A1),A1 ; destination : ligne 50, 9e groupe (X = 128)
    LEA     SPRITE,A0       ; source : le dessin, 16 lignes de 8 octets
    MOVEQ   #15,D7          ; 16 lignes
.ligne:
    MOVE.L  (A0)+,(A1)+     ; plans 0 et 1
    MOVE.L  (A0)+,(A1)+     ; plans 2 et 3
    LEA     160-8(A1),A1    ; saut jusqu'à la même colonne, ligne suivante
    DBF     D7,.ligne
    CLR.W   -(SP)
    TRAP    #1

; Un carré de 16 x 16 : bord en couleur 3 (plans 0 et 1), intérieur en couleur 4 (plan 2)
SPRITE:
    DC.W    $FFFF,$FFFF,$0000,$0000
    REPT    14
    DC.W    $8001,$8001,$7FFE,$0000
    ENDR
    DC.W    $FFFF,$FFFF,$0000,$0000

;=== saut-prediction
START:
    LEA     $10000,A1       ; une destination quelconque
    MOVEQ   #1,D7           ; deux lignes d'un bloc de 32 pixels (16 octets)
.ligne:
    CLR.L   (A1)+
    CLR.L   (A1)+
    CLR.L   (A1)+
    CLR.L   (A1)+
    LEA     160-16(A1),A1
    DBF     D7,.ligne
    CLR.W   -(SP)
    TRAP    #1

;=== saut-depart
; Copie un bloc de 32 x 8 pixels (couleur 1) en haut à gauche de la ligne 20.
; Le saut de ligne est faux : corrige-le.
START:
    MOVE.W  #2,-(SP)        ; Physbase
    TRAP    #14
    ADDQ.L  #2,SP
    MOVEA.L D0,A1
    LEA     20*160(A1),A1   ; début de la ligne 20
    LEA     BLOC,A0
    MOVEQ   #7,D7           ; 8 lignes
.ligne:
    MOVE.L  (A0)+,(A1)+     ; 1er groupe : plans 0 et 1
    MOVE.L  (A0)+,(A1)+     ;              plans 2 et 3
    MOVE.L  (A0)+,(A1)+     ; 2e groupe
    MOVE.L  (A0)+,(A1)+
    LEA     0(A1),A1        ; <- le saut de ligne : remplace 0 par la bonne valeur
    DBF     D7,.ligne
    CLR.W   -(SP)
    TRAP    #1

BLOC:
    REPT    8
    DC.W    $FFFF,0,0,0,$FFFF,0,0,0
    ENDR

;=== saut-solution
START:
    MOVE.W  #2,-(SP)
    TRAP    #14
    ADDQ.L  #2,SP
    MOVEA.L D0,A1
    LEA     20*160(A1),A1
    LEA     BLOC,A0
    MOVEQ   #7,D7
.ligne:
    MOVE.L  (A0)+,(A1)+
    MOVE.L  (A0)+,(A1)+
    MOVE.L  (A0)+,(A1)+
    MOVE.L  (A0)+,(A1)+
    LEA     160-16(A1),A1   ; 160 octets par ligne - 16 octets copiés
    DBF     D7,.ligne
    CLR.W   -(SP)
    TRAP    #1

BLOC:
    REPT    8
    DC.W    $FFFF,0,0,0,$FFFF,0,0,0
    ENDR

;=== effacer-depart
; Le programme remplit l'écran en couleur 15. Efface ensuite (couleur 0) le rectangle
; X = 64 à 95, Y = 20 à 39 : 32 pixels de large (2 groupes), 20 lignes de haut.
START:
    MOVE.W  #2,-(SP)        ; Physbase
    TRAP    #14
    ADDQ.L  #2,SP
    MOVEA.L D0,A0
    MOVEA.L D0,A1           ; A1 garde l'adresse de l'écran
    MOVE.W  #7999,D7
.remplir:
    MOVE.L  #-1,(A0)+
    DBF     D7,.remplir
    ; à toi : efface le rectangle (A1 = début de l'écran)

    CLR.W   -(SP)
    TRAP    #1

;=== effacer-solution
START:
    MOVE.W  #2,-(SP)
    TRAP    #14
    ADDQ.L  #2,SP
    MOVEA.L D0,A0
    MOVEA.L D0,A1
    MOVE.W  #7999,D7
.remplir:
    MOVE.L  #-1,(A0)+
    DBF     D7,.remplir
    LEA     20*160+64/16*8(A1),A1 ; ligne 20, groupe 4 (X = 64)
    MOVEQ   #19,D7          ; 20 lignes
.ligne:
    CLR.L   (A1)+           ; 2 groupes = 16 octets = 4 mots longs
    CLR.L   (A1)+
    CLR.L   (A1)+
    CLR.L   (A1)+
    LEA     160-16(A1),A1
    DBF     D7,.ligne
    CLR.W   -(SP)
    TRAP    #1

;=== descente-exemple
START:
    MOVE.W  #2,-(SP)        ; Physbase
    TRAP    #14
    ADDQ.L  #2,SP
    MOVEA.L D0,A1
    LEA     8*8(A1),A1      ; en haut de l'écran, X = 64
    MOVEQ   #59,D6          ; 60 images (une seconde un peu plus)
.image:
    BSR     CARRE           ; dessine le carré à partir de A1
    MOVE.W  #37,-(SP)       ; Vsync : attend la fin de l'image en cours
    TRAP    #14
    ADDQ.L  #2,SP
    CLR.W   (A1)            ; efface la ligne du haut du carré
    LEA     160(A1),A1      ; le carré descend d'une ligne
    DBF     D6,.image
    CLR.W   -(SP)
    TRAP    #1

; CARRE : 16 lignes de 16 pixels en couleur 1 (plan 0) à partir de A1
CARRE:
    MOVEA.L A1,A0
    MOVEQ   #15,D0
.ligne:
    MOVE.W  #$FFFF,(A0)
    LEA     160(A0),A0
    DBF     D0,.ligne
    RTS

;=== aligner-prediction
START:
    MOVE.L  #$1234F,D0      ; une adresse quelconque
    ADD.L   #255,D0
    CLR.B   D0
    CLR.W   -(SP)
    TRAP    #1

;=== double-exemple
START:
    MOVE.L  #ECRANS+255,D0  ; début de la réserve, arrondi
    CLR.B   D0              ; au multiple de 256 suivant
    MOVE.L  D0,CACHE        ; 1er écran
    ADD.L   #32000,D0       ; 32 000 = $7D00 : le 2e reste un multiple de 256
    MOVE.L  D0,VISIBLE
    MOVEQ   #0,D5           ; colonne du carré (en groupes de 16 pixels)
    MOVEQ   #19,D6          ; 20 images
.image:
    MOVEA.L CACHE,A0        ; on dessine sur l'écran qu'on ne voit pas
    BSR     DESSINER
    MOVE.L  CACHE,D0        ; échange des deux écrans
    MOVE.L  VISIBLE,CACHE
    MOVE.L  D0,VISIBLE
    MOVE.W  #-1,-(SP)       ; Setscreen(logique, physique, résolution) : résolution inchangée
    MOVE.L  D0,-(SP)        ; physique = l'écran qu'on vient de finir
    MOVE.L  D0,-(SP)        ; logique = le même
    MOVE.W  #5,-(SP)
    TRAP    #14
    LEA     12(SP),SP
    MOVE.W  #37,-(SP)       ; Vsync : l'échange a lieu pendant le retour du faisceau
    TRAP    #14
    ADDQ.L  #2,SP
    ADDQ.W  #1,D5
    DBF     D6,.image
    CLR.W   -(SP)
    TRAP    #1

; DESSINER : efface la bande des lignes 92 à 107, puis y dessine le carré en colonne D5
DESSINER:
    LEA     92*160(A0),A1
    MOVE.W  #16*40-1,D0     ; 16 lignes de 40 mots longs
.effacer:
    CLR.L   (A1)+
    DBF     D0,.effacer
    LEA     92*160(A0),A1
    MOVE.W  D5,D0
    LSL.W   #3,D0           ; 8 octets par groupe
    ADDA.W  D0,A1
    MOVEQ   #15,D0
.ligne:
    MOVE.W  #$FFFF,(A1)
    LEA     160(A1),A1
    DBF     D0,.ligne
    RTS

    SECTION BSS
ECRANS: DS.B    2*32000+256     ; deux écrans, plus de quoi arrondir l'adresse
CACHE:  DS.L    1
VISIBLE: DS.L   1

;=== aligne-depart
; On dessine un carré en haut à gauche d'un écran à nous, puis on l'affiche avec Setscreen.
; Le carré n'apparaît pas au bon endroit : pourquoi ? Corrige le programme.
START:
    LEA     MONECRAN,A0
    MOVEQ   #15,D0
.ligne:
    MOVE.W  #$FFFF,(A0)     ; carré de 16 x 16, couleur 1
    LEA     160(A0),A0
    DBF     D0,.ligne
    MOVE.W  #-1,-(SP)       ; Setscreen : résolution inchangée
    PEA     MONECRAN        ; physique : notre écran
    MOVE.L  #-1,-(SP)       ; logique : inchangé
    MOVE.W  #5,-(SP)
    TRAP    #14
    LEA     12(SP),SP
    MOVE.W  #37,-(SP)       ; Vsync
    TRAP    #14
    ADDQ.L  #2,SP
    CLR.W   -(SP)
    TRAP    #1

    SECTION BSS
    DS.B    2
MONECRAN:
    DS.B    32000

;=== aligne-solution
START:
    MOVE.L  #MONECRAN+255,D0
    CLR.B   D0              ; adresse multiple de 256
    MOVEA.L D0,A0
    MOVEA.L D0,A2           ; on la garde pour Setscreen
    MOVEQ   #15,D0
.ligne:
    MOVE.W  #$FFFF,(A0)
    LEA     160(A0),A0
    DBF     D0,.ligne
    MOVE.W  #-1,-(SP)
    MOVE.L  A2,-(SP)        ; physique : l'adresse arrondie
    MOVE.L  #-1,-(SP)
    MOVE.W  #5,-(SP)
    TRAP    #14
    LEA     12(SP),SP
    MOVE.W  #37,-(SP)
    TRAP    #14
    ADDQ.L  #2,SP
    CLR.W   -(SP)
    TRAP    #1

    SECTION BSS
    DS.B    2
MONECRAN:
    DS.B    32000+256       ; 256 octets de plus pour pouvoir arrondir

;=== dix-depart
; Fais avancer un carré de 16 x 16 (couleur 1, lignes 50 à 65) de 16 pixels vers la droite
; à chaque image, 10 fois, en partant de X = 0. À la fin, il doit être en X = 160 et
; nulle part ailleurs. Attends la VBL (Vsync) entre deux images.
START:
    MOVE.W  #2,-(SP)        ; Physbase
    TRAP    #14
    ADDQ.L  #2,SP
    MOVEA.L D0,A1
    LEA     50*160(A1),A1   ; ligne 50, X = 0

    CLR.W   -(SP)
    TRAP    #1

;=== dix-solution
START:
    MOVE.W  #2,-(SP)
    TRAP    #14
    ADDQ.L  #2,SP
    MOVEA.L D0,A1
    LEA     50*160(A1),A1
    MOVE.W  #$FFFF,D1       ; couleur 1 : on dessine
    BSR     CARRE
    MOVEQ   #9,D6           ; 10 déplacements
.image:
    MOVE.W  #37,-(SP)       ; Vsync
    TRAP    #14
    ADDQ.L  #2,SP
    MOVEQ   #0,D1           ; effacer l'ancienne position
    BSR     CARRE
    ADDQ.L  #8,A1           ; groupe suivant : 16 pixels plus à droite
    MOVE.W  #$FFFF,D1       ; dessiner la nouvelle
    BSR     CARRE
    DBF     D6,.image
    CLR.W   -(SP)
    TRAP    #1

; CARRE : écrit D1 dans le plan 0 de 16 lignes à partir de A1
CARRE:
    MOVEA.L A1,A0
    MOVEQ   #15,D0
.ligne:
    MOVE.W  D1,(A0)
    LEA     160(A0),A0
    DBF     D0,.ligne
    RTS

;=== pixel-exemple
START:
    MOVE.W  #2,-(SP)        ; Physbase
    TRAP    #14
    ADDQ.L  #2,SP
    MOVEA.L D0,A0
    LEA     10*160(A0),A0   ; ligne Y = 10
    MOVE.W  #44,D1          ; X = 44
    MOVE.W  D1,D0
    LSR.W   #4,D0           ; X / 16 = 2
    LSL.W   #3,D0           ; x 8 = 16 octets
    ADDA.W  D0,A0           ; A0 = groupe des pixels 32 à 47
    AND.W   #15,D1          ; décalage = X mod 16 = 12
    LEA     BALLE,A2
    MOVEQ   #7,D7           ; 8 lignes
.ligne:
    MOVEQ   #0,D0
    MOVE.B  (A2)+,D0        ; 8 pixels du dessin, dans les bits 7 à 0
    ROR.L   #8,D0           ; ... passés dans les bits 31 à 24
    LSR.L   D1,D0           ; décalés de 12 : ce qui déborde descend dans le mot faible
    SWAP    D0              ; mot faible = partie gauche
    OR.W    D0,(A0)         ; dans le 1er groupe (plan 0)
    SWAP    D0              ; mot faible = débordement
    OR.W    D0,8(A0)        ; dans le groupe suivant (plan 0)
    LEA     160(A0),A0
    DBF     D7,.ligne
    CLR.W   -(SP)
    TRAP    #1

BALLE:
    DC.B    $3C,$7E,$FF,$FF,$FF,$FF,$7E,$3C

;=== decalage-prediction
START:
    MOVE.L  #$FF000000,D0   ; 8 pixels allumés, tout à gauche
    MOVEQ   #12,D1          ; décalage (un décalage immédiat ne va que de 1 à 8)
    LSR.L   D1,D0
    CLR.W   -(SP)
    TRAP    #1

;=== decalage-prediction-swap
START:
    MOVE.L  #$FF000000,D0
    MOVEQ   #12,D1
    LSR.L   D1,D0
    SWAP    D0
    CLR.W   -(SP)
    TRAP    #1

;=== sprite73-depart
; Dessine la balle (8 x 8 pixels, couleur 1) en X = 44, Y = 10 avec la routine 7.3 du manuel.
; Elle s'assemble et ne plante pas... mais la balle n'apparaît pas. Trouve et corrige
; les erreurs (il y en a plusieurs, dont celle de PSET).
START:
    MOVE.W  #2,-(SP)        ; Physbase
    TRAP    #14
    ADDQ.L  #2,SP
    MOVE.L  D0,SCREEN_BASE
    MOVE.W  #44,D1          ; X
    MOVE.W  #10,D4          ; Y
    LEA     BALLE,A2
    BSR     DRAW_SPRITE_SHIFT
    CLR.W   -(SP)
    TRAP    #1

; DRAW_SPRITE_SHIFT : sprite de 8 pixels de large, 8 lignes, plan 0
; Entrées : D1.W = X (0-312), D4.W = Y (0-192), A2 = dessin
DRAW_SPRITE_SHIFT:
    LEA     SCREEN_BASE,A0
    MOVE.L  (A0),A0
    MULU.W  #160,D4
    ADDA.L  D4,A0           ; ligne Y
    MOVE.W  D1,D0
    LSR.W   #1,D0           ; D0 = X / 2
    ANDI.W  #$FFFE,D0       ; « alignement mot »
    ADDA.L  D0,A0           ; premier mot du groupe
    ANDI.W  #15,D1          ; nombre de décalages à droite
    MOVE.W  #7,D7           ; 8 lignes
.LINE_LOOP:
    MOVE.B  (A2)+,D2        ; 8 pixels du plan 0
    CLR.W   D0
    MOVE.B  D2,D0
    LSL.W   #8,D0           ; en haut du mot
    LSR.W   D1,D0           ; décalés de X mod 16
    OR.W    D0,(A0)         ; premier mot
    SWAP    D0
    OR.B    D0,8(A0)        ; « les bits débordants » dans le mot suivant
    ADDA.L  #160,A0
    DBRA    D7,.LINE_LOOP
    RTS

BALLE:
    DC.B    $3C,$7E,$FF,$FF,$FF,$FF,$7E,$3C
    EVEN
SCREEN_BASE:
    DC.L    0

;=== sprite73-solution
START:
    MOVE.W  #2,-(SP)
    TRAP    #14
    ADDQ.L  #2,SP
    MOVE.L  D0,SCREEN_BASE
    MOVE.W  #44,D1
    MOVE.W  #10,D4
    LEA     BALLE,A2
    BSR     DRAW_SPRITE_SHIFT
    CLR.W   -(SP)
    TRAP    #1

DRAW_SPRITE_SHIFT:
    LEA     SCREEN_BASE,A0
    MOVE.L  (A0),A0
    MULU.W  #160,D4
    ADDA.L  D4,A0
    MOVEQ   #0,D0           ; mot fort de D0 à zéro avant ADDA.L
    MOVE.W  D1,D0
    LSR.W   #1,D0
    ANDI.W  #$FFF8,D0       ; aligner sur le groupe de 8 octets
    ADDA.L  D0,A0
    ANDI.W  #15,D1
    MOVE.W  #7,D7
.LINE_LOOP:
    MOVEQ   #0,D0           ; on travaille sur 32 bits
    MOVE.B  (A2)+,D0
    ROR.L   #8,D0           ; les 8 pixels dans les bits 31 à 24
    LSR.L   D1,D0           ; rien n'est perdu : le débordement passe dans le mot faible
    SWAP    D0
    OR.W    D0,(A0)         ; partie gauche
    SWAP    D0
    OR.W    D0,8(A0)        ; débordement : le mot entier, pas son octet faible
    ADDA.L  #160,A0
    DBRA    D7,.LINE_LOOP
    RTS

BALLE:
    DC.B    $3C,$7E,$FF,$FF,$FF,$FF,$7E,$3C
    EVEN
SCREEN_BASE:
    DC.L    0

;=== masque-depart
; Le fond des 8 premières lignes est en couleur 2 (plan 1). On y dessine 8 pixels en
; couleur 1 (plan 0)... mais ils apparaissent en couleur 3. Ajoute UNE instruction.
START:
    MOVE.W  #2,-(SP)        ; Physbase
    TRAP    #14
    ADDQ.L  #2,SP
    MOVEA.L D0,A0
    MOVEA.L D0,A1
    MOVE.W  #8*20-1,D7      ; 8 lignes de 20 groupes
.fond:
    MOVE.W  #$FFFF,2(A1)    ; plan 1 à 1 : couleur 2
    ADDQ.L  #8,A1
    DBF     D7,.fond
    MOVE.W  #$0FF0,D2       ; le dessin : 8 pixels au milieu du 1er groupe
    MOVE.W  D2,D3
    NOT.W   D3              ; masque inversé : 0 sous le dessin, 1 ailleurs
    MOVEQ   #7,D7
.ligne:
    OR.W    D2,(A0)         ; plan 0 : allume les pixels du dessin
    ; il manque une instruction ici

    LEA     160(A0),A0
    DBF     D7,.ligne
    CLR.W   -(SP)
    TRAP    #1

;=== masque-solution
START:
    MOVE.W  #2,-(SP)
    TRAP    #14
    ADDQ.L  #2,SP
    MOVEA.L D0,A0
    MOVEA.L D0,A1
    MOVE.W  #8*20-1,D7
.fond:
    MOVE.W  #$FFFF,2(A1)
    ADDQ.L  #8,A1
    DBF     D7,.fond
    MOVE.W  #$0FF0,D2
    MOVE.W  D2,D3
    NOT.W   D3
    MOVEQ   #7,D7
.ligne:
    OR.W    D2,(A0)
    AND.W   D3,2(A0)        ; plan 1 : éteint le fond sous le dessin
    LEA     160(A0),A0
    DBF     D7,.ligne
    CLR.W   -(SP)
    TRAP    #1

;=== bord-prediction
START:
    LEA     $F8000+10*160+19*8,A0 ; dernier groupe de la ligne 10 (X = 304 à 319)
    MOVE.L  #$FF000000,D0   ; 8 pixels...
    MOVEQ   #12,D1
    LSR.L   D1,D0           ; ... dessinés en X = 304 + 12 = 316
    SWAP    D0
    OR.W    D0,(A0)
    SWAP    D0
    OR.W    D0,8(A0)        ; le « groupe suivant »
    CLR.W   -(SP)
    TRAP    #1

;=== miroir-depart
; Construis en $20000 une table de 256 octets : l'octet n° n doit contenir n « lu à
; l'envers » (bit 7 <-> bit 0, bit 6 <-> bit 1...). Exemple : n = $01 donne $80.
START:
    LEA     $20000,A0

    CLR.W   -(SP)
    TRAP    #1

;=== miroir-solution
START:
    LEA     $20000,A0
    MOVEQ   #0,D0           ; n
.suivant:
    MOVE.B  D0,D1           ; copie de n, qu'on va vider bit à bit
    MOVEQ   #0,D2           ; le miroir, construit bit à bit
    MOVEQ   #7,D3
.bit:
    LSR.B   #1,D1           ; bit de droite de n -> X (et C)
    ROXL.B  #1,D2           ; X entre par la droite du miroir
    DBF     D3,.bit
    MOVE.B  D2,(A0)+
    ADDQ.W  #1,D0
    CMP.W   #256,D0
    BNE.S   .suivant
    CLR.W   -(SP)
    TRAP    #1

;=== rebond-depart
; Défi : un carré de 16 x 16 (couleur 1, lignes 92 à 107) part de X = 0 et avance de
; 2 pixels par image vers la droite. Arrivé en X = 304 (le bord droit), il repart vers la
; gauche, et ainsi de suite. Arrête le programme après 200 images.
START:

    CLR.W   -(SP)
    TRAP    #1

;=== rebond-solution
START:
    MOVE.W  #2,-(SP)        ; Physbase
    TRAP    #14
    ADDQ.L  #2,SP
    MOVEA.L D0,A6
    LEA     92*160(A6),A6   ; début de la bande du carré
    MOVEQ   #0,D5           ; X
    MOVEQ   #2,D4           ; vitesse : +2 ou -2
    MOVE.W  #199,D6         ; 200 images
    BSR     DESSINER
.image:
    MOVE.W  #37,-(SP)       ; Vsync
    TRAP    #14
    ADDQ.L  #2,SP
    ADD.W   D4,D5           ; avancer
    CMP.W   #304,D5
    BLT.S   .pasdroite
    MOVEQ   #-2,D4          ; bord droit : demi-tour
.pasdroite:
    TST.W   D5
    BGT.S   .pasgauche
    MOVEQ   #2,D4           ; bord gauche : demi-tour
.pasgauche:
    BSR     DESSINER
    DBF     D6,.image
    CLR.W   -(SP)
    TRAP    #1

; DESSINER : efface la bande (16 lignes) puis dessine le carré en X = D5
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
    ADDA.W  D0,A0           ; groupe du bord gauche du carré
    MOVE.W  D5,D1
    AND.W   #15,D1          ; décalage
    MOVE.L  #$FFFF0000,D2
    LSR.L   D1,D2           ; 16 pixels sur deux groupes
    MOVEQ   #15,D0
.ligne:
    SWAP    D2
    MOVE.W  D2,(A0)         ; partie gauche
    SWAP    D2
    MOVE.W  D2,8(A0)        ; débordement (0 si X est un multiple de 16)
    LEA     160(A0),A0
    DBF     D0,.ligne
    RTS
