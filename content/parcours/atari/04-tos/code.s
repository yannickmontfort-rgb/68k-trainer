; Codes du chapitre 4 « Le TOS, TRAP et vecteurs ».
; Ces programmes tournent en MODE UTILISATEUR, comme sous le vrai TOS.

;=== bonjour
START:
    PEA     MESSAGE         ; empile l'adresse du texte (4 octets)
    MOVE.W  #9,-(SP)        ; numéro de fonction : Cconws (2 octets)
    TRAP    #1              ; appel du GEMDOS
    ADDQ.L  #6,SP           ; nettoie la pile : 4 + 2 octets
    CLR.W   -(SP)           ; Pterm0 : fin du programme
    TRAP    #1
MESSAGE:
    DC.B    'Bonjour, Atari !',13,10,0

;=== predire-cconout
START:
    MOVE.W  #'O',-(SP)
    MOVE.W  #2,-(SP)        ; Cconout
    TRAP    #1
    ADDQ.L  #4,SP
    MOVE.W  #'K',-(SP)
    MOVE.W  #2,-(SP)
    TRAP    #1
    ADDQ.L  #4,SP
    CLR.W   -(SP)
    TRAP    #1

;=== nettoyer-depart
START:
    PEA     TEXTE
    MOVE.W  #9,-(SP)
    TRAP    #1
    ; il manque une ligne ici
    RTS
TEXTE:
    DC.B    'SALUT',13,10,0

;=== nettoyer-solution
START:
    PEA     TEXTE
    MOVE.W  #9,-(SP)
    TRAP    #1
    ADDQ.L  #6,SP
    RTS
TEXTE:
    DC.B    'SALUT',13,10,0

;=== afficher-depart
; Affiche le texte 68000 (puis un retour à la ligne) et termine avec Pterm0
START:

TEXTE:
    DC.B    '68000',13,10,0

;=== afficher-solution
START:
    PEA     TEXTE
    MOVE.W  #9,-(SP)
    TRAP    #1
    ADDQ.L  #6,SP
    CLR.W   -(SP)
    TRAP    #1
TEXTE:
    DC.B    '68000',13,10,0

;=== etoiles-depart
; Affiche cinq étoiles ***** avec Cconout, dans une boucle, puis termine
START:

;=== etoiles-solution
START:
    MOVE.W  #4,D3           ; D3 : préservé par le TOS (5 tours)
BOUCLE:
    MOVE.W  #'*',-(SP)
    MOVE.W  #2,-(SP)        ; Cconout
    TRAP    #1
    ADDQ.L  #4,SP
    DBRA    D3,BOUCLE
    CLR.W   -(SP)
    TRAP    #1

;=== ordonner-pterm-entete
; Affiche la lettre A, puis termine le programme
START:

;=== supexec-exemple
START:
    PEA     ROUTINE         ; adresse de la routine à exécuter
    MOVE.W  #38,-(SP)       ; XBIOS 38 : Supexec
    TRAP    #14
    ADDQ.L  #6,SP
    CLR.W   -(SP)           ; Pterm0
    TRAP    #1
ROUTINE:                    ; exécutée en mode superviseur
    MOVE.W  #$007,$FF8240   ; couleur 0 = bleu
    BCLR    #0,$484         ; plus de clic clavier (variable conterm)
    RTS

;=== predire-bus
START:
    MOVE.W  #$007,$FF8240
    CLR.W   -(SP)
    TRAP    #1

;=== vert-depart
; Objectif : fond de l'écran vert ($070), et fin propre du programme
START:
    MOVE.W  #$070,$FF8240
    CLR.W   -(SP)
    TRAP    #1

;=== vert-solution
START:
    PEA     VERT
    MOVE.W  #38,-(SP)       ; Supexec
    TRAP    #14
    ADDQ.L  #6,SP
    CLR.W   -(SP)
    TRAP    #1
VERT:
    MOVE.W  #$070,$FF8240
    RTS

;=== setcolor-depart
; Avec Setcolor (XBIOS 7), mets la couleur 0 en jaune ($770), puis termine
START:

;=== setcolor-solution
START:
    MOVE.W  #$770,-(SP)     ; la couleur
    MOVE.W  #0,-(SP)        ; le numéro de couleur
    MOVE.W  #7,-(SP)        ; XBIOS 7 : Setcolor
    TRAP    #14
    ADDQ.L  #6,SP
    CLR.W   -(SP)
    TRAP    #1

;=== conterm-depart
; Lis la variable système conterm ($484, un octet) dans D7
START:

;=== conterm-solution
START:
    PEA     LIRE
    MOVE.W  #38,-(SP)
    TRAP    #14
    ADDQ.L  #6,SP
    CLR.W   -(SP)
    TRAP    #1
LIRE:
    MOVEQ   #0,D7
    MOVE.B  $484,D7         ; D7 est préservé par le TOS
    RTS

;=== setexec-exemple
START:
    PEA     MAROUTINE       ; adresse de notre routine
    MOVE.W  #35,-(SP)       ; vecteur 35 = TRAP #3 (32 + 3)
    MOVE.W  #5,-(SP)        ; BIOS 5 : Setexec
    TRAP    #13
    ADDQ.L  #8,SP
    MOVEQ   #20,D0
    TRAP    #3              ; appelle notre routine
    CLR.W   -(SP)
    TRAP    #1
MAROUTINE:                  ; exécutée en superviseur
    ADD.L   D0,D0           ; double D0
    RTE                     ; retour d'exception

;=== predire-pile-trap
START:
    PEA     ROUTINE
    MOVE.W  #36,-(SP)       ; TRAP #4
    MOVE.W  #5,-(SP)        ; Setexec
    TRAP    #13
    ADDQ.L  #8,SP
    TRAP    #4
    CLR.W   -(SP)
    TRAP    #1
ROUTINE:
    MOVE.L  2(SP),D5        ; ce qui est empilé 2 octets sous le sommet
    MOVE.W  (SP),D6         ; ce qui est au sommet
    RTE

;=== vecteur-depart
; Installe ROUTINE sur TRAP #5, puis appelle-la : D0 doit valoir 7
START:
    PEA     ROUTINE
    MOVE.W  #0,-(SP)        ; <- le numéro du vecteur de TRAP #5
    MOVE.W  #5,-(SP)        ; Setexec
    TRAP    #13
    ADDQ.L  #8,SP
    TRAP    #5
    CLR.W   -(SP)
    TRAP    #1
ROUTINE:
    MOVEQ   #7,D0
    RTE

;=== vecteur-solution
START:
    PEA     ROUTINE
    MOVE.W  #37,-(SP)
    MOVE.W  #5,-(SP)
    TRAP    #13
    ADDQ.L  #8,SP
    TRAP    #5
    CLR.W   -(SP)
    TRAP    #1
ROUTINE:
    MOVEQ   #7,D0
    RTE

;=== divzero-depart
; Intercepte la division par zéro : la routine met D7 à -1,
; et le programme doit continuer jusqu'à Pterm0 au lieu de planter.
START:

    MOVEQ   #10,D3
    MOVEQ   #0,D4
    DIVU    D4,D3           ; division par zéro !
    CLR.W   -(SP)
    TRAP    #1

;=== divzero-solution
START:
    PEA     DIVZERO
    MOVE.W  #5,-(SP)        ; vecteur 5 : division par zéro
    MOVE.W  #5,-(SP)        ; Setexec
    TRAP    #13
    ADDQ.L  #8,SP
    MOVEQ   #10,D3
    MOVEQ   #0,D4
    DIVU    D4,D3
    CLR.W   -(SP)
    TRAP    #1
DIVZERO:
    MOVEQ   #-1,D7
    RTE

;=== compteur-depart
; Installe sur TRAP #4 une routine qui ajoute 1 à D6.
; Le programme appelle TRAP #4 trois fois : D6 doit valoir 3.
START:
    MOVEQ   #0,D6

    TRAP    #4
    TRAP    #4
    TRAP    #4
    CLR.W   -(SP)
    TRAP    #1

;=== compteur-solution
START:
    MOVEQ   #0,D6
    PEA     COMPTE
    MOVE.W  #36,-(SP)
    MOVE.W  #5,-(SP)
    TRAP    #13
    ADDQ.L  #8,SP
    TRAP    #4
    TRAP    #4
    TRAP    #4
    CLR.W   -(SP)
    TRAP    #1
COMPTE:
    ADDQ.L  #1,D6
    RTE

;=== bonus-palette-depart
; Avec Setpalette (XBIOS 6), installe la palette PALETTE en une fois
START:

    EVEN
PALETTE:
    DC.W    $000,$100,$200,$300,$400,$500,$600,$700
    DC.W    $710,$720,$730,$740,$750,$760,$770,$777

;=== bonus-palette-solution
START:
    PEA     PALETTE
    MOVE.W  #6,-(SP)        ; XBIOS 6 : Setpalette
    TRAP    #14
    ADDQ.L  #6,SP
    CLR.W   -(SP)
    TRAP    #1
    EVEN
PALETTE:
    DC.W    $000,$100,$200,$300,$400,$500,$600,$700
    DC.W    $710,$720,$730,$740,$750,$760,$770,$777
