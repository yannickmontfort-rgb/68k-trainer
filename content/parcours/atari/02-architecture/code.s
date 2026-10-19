; Codes du chapitre 2 « Architecture du 68000 ».
; Chaque bloc « ;=== nom » est référencé dans chapitre.json par « @code.s#nom ».

;=== unites-exemple
START:
    MOVE.L  #$12345678,D0   ; mot long entier
    MOVE.B  #$FF,D0         ; octet faible seulement
    MOVE.W  #$ABCD,D0       ; mot faible seulement
    MOVE.L  #-1,D1          ; -1 sur 32 bits
    MOVE.B  #%10100011,D2   ; une valeur écrite en binaire
    RTS

;=== unites-prediction
START:
    MOVE.L  #$11223344,D0
    MOVE.B  #$AA,D0
    MOVE.W  #$BBCC,D0
    MOVEQ   #-1,D1
    RTS

;=== unites-completer-depart
START:
    MOVE.B  #%0000,D0       ; <- écris 15 en binaire
    RTS

;=== unites-completer-solution
START:
    MOVE.B  #%1111,D0
    RTS

;=== unites-octet-depart
START:
    MOVE.L  #$12345678,D3   ; ne touche pas à cette ligne
    ; une seule instruction ici

    RTS

;=== unites-octet-solution
START:
    MOVE.L  #$12345678,D3
    MOVE.B  #$FF,D3
    RTS

;=== unites-bases-depart
; D1, D2 et D3 doivent valoir 200 :
; en décimal dans D1, en hexadécimal dans D2, en binaire dans D3
START:

    RTS

;=== unites-bases-solution
START:
    MOVE.L  #200,D1
    MOVE.L  #$C8,D2
    MOVE.L  #%11001000,D3
    RTS

;=== memoire-exemple
START:
    MOVE.L  #$12345678,$2000    ; range un mot long en $2000
    MOVE.B  $2000,D0            ; lit l'octet en $2000
    MOVE.B  $2003,D1            ; lit l'octet en $2003
    MOVE.W  $2002,D2            ; lit le mot en $2002
    RTS

;=== memoire-prediction
START:
    MOVE.B  VALEURS,D0
    MOVE.W  VALEURS,D1
    MOVE.L  VALEURS,D2
    RTS
VALEURS:
    DC.B    $01,$02,$03,$04

;=== memoire-even-depart
; Objectif : D0 = 1040 (le nom du modèle d'Atari)
START:
    MOVE.W  NOMBRE,D0
    RTS
TEXTE:  DC.B    'ST',0
NOMBRE: DC.W    1040

;=== memoire-even-solution
START:
    MOVE.W  NOMBRE,D0
    RTS
TEXTE:  DC.B    'ST',0
        EVEN
NOMBRE: DC.W    1040

;=== memoire-ecrire-depart
; Range le mot $ABCD à l'adresse $3000,
; puis copie son octet de POIDS FORT dans D1
START:

    RTS

;=== memoire-ecrire-solution
START:
    MOVE.W  #$ABCD,$3000
    MOVE.B  $3000,D1
    RTS

;=== memoire-inverser-depart
START:
    MOVE.W  #$1234,$3000    ; ne touche pas à cette ligne
    ; inverse les deux octets du mot en $3000 : il doit devenir $3412

    RTS

;=== memoire-inverser-solution
START:
    MOVE.W  #$1234,$3000
    MOVE.B  $3000,D0        ; D0.B = $12
    MOVE.B  $3001,$3000     ; l'octet faible monte
    MOVE.B  D0,$3001        ; l'ancien octet fort descend
    RTS

;=== registres-exemple
START:
    MOVE.L  #$FFFFFFFF,D0
    MOVE.W  #$0001,D0       ; seul le mot faible change
    MOVEA.W #$1234,A0       ; extension de signe, bit 15 = 0
    MOVEA.W #$8000,A1       ; extension de signe, bit 15 = 1
    LEA     $F8000,A2       ; l'adresse de l'écran
    RTS

;=== registres-prediction
START:
    MOVEQ   #-2,D1
    MOVE.B  #5,D1
    MOVEA.W #$FFF0,A0
    RTS

;=== registres-corriger-depart
; Objectif : A0 = 1
START:
    MOVE.B  #1,A0
    RTS

;=== registres-corriger-solution
START:
    MOVEA.L #1,A0
    RTS

;=== registres-ecran-depart
; Mets dans A0 l'adresse de l'écran : $F8000
START:

    RTS

;=== registres-ecran-solution
START:
    LEA     $F8000,A0
    RTS

;=== registres-extension-depart
; Avec UNE instruction de taille .W, mets $FFFFFFF0 dans A1
START:

    RTS

;=== registres-extension-solution
START:
    MOVEA.W #$FFF0,A1
    RTS

;=== sr-exemple
START:
    MOVEQ   #0,D0           ; résultat nul
    MOVE.B  #$80,D1         ; bit 7 à 1
    MOVE.B  #$7F,D2         ; +127
    ADD.B   #1,D2           ; 127 + 1, sur un octet signé...
    MOVE.B  #$FF,D3         ; 255
    ADD.B   #1,D3           ; 255 + 1, sur un octet...
    RTS

;=== sr-prediction
START:
    MOVE.B  #3,D0
    SUB.B   #5,D0
    RTS

;=== sr-completer-depart
START:
    MOVE.W  #5,D0
    SUB.W   #0,D0           ; <- remplace 0 pour que le flag Z soit à 1
    RTS

;=== sr-completer-solution
START:
    MOVE.W  #5,D0
    SUB.W   #5,D0
    RTS

;=== sr-debordement-depart
; Provoque un débordement signé (V = 1) avec une addition en .B
START:

    RTS

;=== sr-debordement-solution
START:
    MOVE.B  #$70,D0         ; +112
    ADD.B   #$20,D0         ; +112 + 32 = 144 > 127
    RTS

;=== sr-retenue-depart
; Termine avec C = 1 mais V = 0, grâce à une addition en .W
START:

    RTS

;=== sr-retenue-solution
START:
    MOVE.W  #$FFFF,D0       ; -1 en signé, 65535 en non signé
    ADD.W   #1,D0           ; 0 avec retenue ; -1 + 1 = 0 : pas de débordement signé
    RTS

;=== pile-exemple
START:
    MOVE.L  #$11111111,-(SP)    ; empile une première valeur
    MOVE.L  #$22222222,-(SP)    ; puis une seconde
    MOVE.L  (SP)+,D0            ; dépile...
    MOVE.L  (SP)+,D1            ; ...et dépile encore
    RTS

;=== pile-prediction
START:
    MOVE.L  SP,D7           ; mémorise SP
    MOVE.W  #1,-(SP)
    MOVE.W  #2,-(SP)
    MOVE.L  (SP)+,D1        ; dépile 4 octets d'un coup
    SUB.L   SP,D7           ; D7 = ancien SP - nouveau SP
    RTS

;=== pile-echange-depart
START:
    MOVE.L  #$AAAA,D0
    MOVE.L  #$BBBB,D1
    MOVE.L  D0,-(SP)
    MOVE.L  D1,-(SP)
    ; dépile ici pour échanger D0 et D1

    RTS

;=== pile-echange-solution
START:
    MOVE.L  #$AAAA,D0
    MOVE.L  #$BBBB,D1
    MOVE.L  D0,-(SP)
    MOVE.L  D1,-(SP)
    MOVE.L  (SP)+,D0
    MOVE.L  (SP)+,D1
    RTS

;=== pile-desequilibre-depart
; Objectif : D2 = 7 + 3 = 10, et le programme doit se terminer proprement
START:
    MOVE.W  #7,D2
    MOVE.L  D2,-(SP)        ; sauvegarde de D2
    ADD.W   #3,D2
    RTS

;=== pile-desequilibre-solution
START:
    MOVE.W  #7,D2
    MOVE.L  D2,-(SP)        ; sauvegarde de D2
    ADD.W   #3,D2
    ADDQ.L  #4,SP           ; on retire de la pile ce qu'on y a mis
    RTS

;=== pile-rotation-depart
; Au départ D0 = 1, D1 = 2, D2 = 3.
; À la fin, il faut D0 = 3, D1 = 2, D2 = 1, en passant par la pile.
START:
    MOVEQ   #1,D0
    MOVEQ   #2,D1
    MOVEQ   #3,D2

    RTS

;=== pile-rotation-solution
START:
    MOVEQ   #1,D0
    MOVEQ   #2,D1
    MOVEQ   #3,D2
    MOVE.L  D0,-(SP)
    MOVE.L  D1,-(SP)
    MOVE.L  D2,-(SP)
    MOVE.L  (SP)+,D0
    MOVE.L  (SP)+,D1
    MOVE.L  (SP)+,D2
    RTS

;=== qcm-flags
    MOVE.B  #$FF,D0
    ADD.B   #1,D0

;=== bonus-ligne-depart
; Allume les 16 premiers pixels de l'écran (en haut à gauche)
START:

    RTS

;=== bonus-ligne-solution
START:
    MOVE.W  #$FFFF,$F8000
    RTS
