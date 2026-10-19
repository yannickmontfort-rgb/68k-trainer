; Codes du chapitre 8 « Devpac en profondeur, débogage avancé et bonnes pratiques ».

;=== sections-exemple
; Un programme en trois sections : code, données, réservations.
    SECTION TEXT
START:
    LEA     MESSAGE,A0      ; dans la section DATA
    LEA     TAMPON,A1       ; dans la section BSS
.copie:
    MOVE.B  (A0)+,(A1)+     ; copie le message dans le tampon
    BNE.S   .copie          ; jusqu'à l'octet nul (copié lui aussi)
    PEA     TAMPON          ; Cconws affiche la copie
    MOVE.W  #9,-(SP)
    TRAP    #1
    ADDQ.L  #6,SP
    CLR.W   -(SP)
    TRAP    #1

    SECTION DATA
MESSAGE:
    DC.B    'Trois sections !',0

    SECTION BSS
TAMPON:
    DS.B    64              ; 64 octets à zéro, qui ne prennent pas de place dans le .PRG

;=== rs-prediction
; Une structure « vaisseau » décrite avec RS
    RSRESET
POS_X:  RS.W    1
POS_Y:  RS.W    1
VIES:   RS.B    1
TAILLE: RS.B    0
START:
    MOVE.W  #VIES,D0
    MOVE.W  #TAILLE,D1
    LEA     VAISSEAU,A0
    MOVE.B  #3,VIES(A0)
    MOVE.B  VIES(A0),D2
    CLR.W   -(SP)
    TRAP    #1

VAISSEAU:
    DS.B    TAILLE

;=== equ-depart
; Le programme affiche NB_ETOILES étoiles... mais la constante n'est pas définie.
; Définis-la avec EQU pour qu'il en affiche 5.
START:
    MOVE.W  #NB_ETOILES-1,D7
.etoile:
    MOVE.W  #'*',-(SP)      ; Cconout
    MOVE.W  #2,-(SP)
    TRAP    #1
    ADDQ.L  #4,SP
    DBF     D7,.etoile
    CLR.W   -(SP)
    TRAP    #1

;=== equ-solution
NB_ETOILES EQU 5
START:
    MOVE.W  #NB_ETOILES-1,D7
.etoile:
    MOVE.W  #'*',-(SP)
    MOVE.W  #2,-(SP)
    TRAP    #1
    ADDQ.L  #4,SP
    DBF     D7,.etoile
    CLR.W   -(SP)
    TRAP    #1

;=== macro-depart
; Écris la macro AFFICHE, qui affiche avec Cconws le texte dont l'étiquette est donnée
; en paramètre (\1). Le programme l'utilise déjà trois fois : définis-la au-dessus.
START:
    AFFICHE BONJOUR
    AFFICHE ET
    AFFICHE AUREVOIR
    CLR.W   -(SP)
    TRAP    #1

BONJOUR:  DC.B  'Bonjour',0
ET:       DC.B  ' et ',0
AUREVOIR: DC.B  'au revoir',0

;=== macro-solution
AFFICHE MACRO
    PEA     \1              ; \1 = le premier paramètre de la macro
    MOVE.W  #9,-(SP)        ; Cconws
    TRAP    #1
    ADDQ.L  #6,SP
    ENDM

START:
    AFFICHE BONJOUR
    AFFICHE ET
    AFFICHE AUREVOIR
    CLR.W   -(SP)
    TRAP    #1

BONJOUR:  DC.B  'Bonjour',0
ET:       DC.B  ' et ',0
AUREVOIR: DC.B  'au revoir',0

;=== image-exemple
; Affiche l'image Degas LOGO.PI1, incluse dans le programme par INCBIN.
START:
    PEA     IMAGE+2         ; la palette : 16 mots après le mot de résolution
    MOVE.W  #6,-(SP)        ; XBIOS 6 : Setpalette
    TRAP    #14
    ADDQ.L  #6,SP
    MOVE.W  #2,-(SP)        ; Physbase
    TRAP    #14
    ADDQ.L  #2,SP
    MOVEA.L D0,A1
    LEA     IMAGE+34,A0     ; les 32 000 octets de l'écran
    MOVE.W  #32000/4-1,D7
.copie:
    MOVE.L  (A0)+,(A1)+
    DBF     D7,.copie
    CLR.W   -(SP)
    TRAP    #1

    SECTION DATA
IMAGE:
    INCBIN  "LOGO.PI1"      ; 32 034 octets : résolution, palette, écran

;=== image-depart
; Affiche l'image LOGO.PI1 : sa palette (avec Setpalette), puis ses 32 000 octets
; d'écran recopiés à l'adresse renvoyée par Physbase.
START:

    CLR.W   -(SP)
    TRAP    #1

    SECTION DATA
IMAGE:
    INCBIN  "LOGO.PI1"

;=== image-solution
START:
    PEA     IMAGE+2
    MOVE.W  #6,-(SP)
    TRAP    #14
    ADDQ.L  #6,SP
    MOVE.W  #2,-(SP)
    TRAP    #14
    ADDQ.L  #2,SP
    MOVEA.L D0,A1
    LEA     IMAGE+34,A0
    MOVE.W  #32000/4-1,D7
.copie:
    MOVE.L  (A0)+,(A1)+
    DBF     D7,.copie
    CLR.W   -(SP)
    TRAP    #1

    SECTION DATA
IMAGE:
    INCBIN  "LOGO.PI1"

;=== entete-prediction
; Les 28 premiers octets d'un fichier .PRG : son en-tête.
START:
    LEA     ENTETE(PC),A0
    MOVE.W  (A0),D0         ; le « nombre magique »
    MOVE.L  2(A0),D1        ; taille de la section TEXT
    MOVE.L  10(A0),D2       ; taille de la section BSS
    CLR.W   -(SP)
    TRAP    #1

ENTETE:
    DC.W    $601A           ; nombre magique
    DC.L    $24             ; taille TEXT
    DC.L    $10             ; taille DATA
    DC.L    $100            ; taille BSS
    DC.L    0               ; taille de la table des symboles
    DC.L    0               ; réservé
    DC.L    0               ; drapeaux de chargement
    DC.W    0               ; 0 = une table de relocation suit

;=== prg-depart
; Ton premier vrai programme : affiche « Bonjour, Atari ! », attends une touche,
; puis rends la main au TOS. Ensuite, exporte-le en .PRG !
START:

    CLR.W   -(SP)
    TRAP    #1

;=== prg-solution
START:
    PEA     TEXTE(PC)       ; Cconws
    MOVE.W  #9,-(SP)
    TRAP    #1
    ADDQ.L  #6,SP
    MOVE.W  #8,-(SP)        ; Cnecin : attend une touche
    TRAP    #1
    ADDQ.L  #2,SP
    CLR.W   -(SP)           ; Pterm0 : retour au bureau
    TRAP    #1

TEXTE:
    DC.B    'Bonjour, Atari !',0

;=== cadre-exemple
; Une erreur d'adresse interceptée : on lit le cadre que le 68000 a empilé.
START:
    PEA     ERREUR(PC)      ; Setexec(3, ERREUR) : notre routine pour l'erreur d'adresse
    MOVE.W  #3,-(SP)
    MOVE.W  #5,-(SP)
    TRAP    #13
    ADDQ.L  #8,SP
    LEA     $2001,A0        ; une adresse impaire...
    MOVE.W  (A0),D0         ; ... lue en mot : erreur d'adresse !
    CLR.W   -(SP)           ; (jamais atteint)
    TRAP    #1

; ERREUR : appelée en superviseur ; la pile contient le cadre de l'exception
ERREUR:
    MOVE.W  (SP),D4         ; mot d'état : lecture ou écriture, type d'accès
    MOVE.L  2(SP),D5        ; adresse fautive
    MOVE.W  6(SP),D6        ; premier mot de l'instruction en cause
    MOVE.W  8(SP),D3        ; SR au moment de la faute
    MOVE.L  10(SP),D7       ; PC empilé (près de l'instruction en cause)
    CLR.W   -(SP)           ; on termine le programme
    TRAP    #1

;=== pile-depart
; SOMME3 doit renvoyer dans D0 la somme de D1, D2 et D3, sans abîmer D1 à D3.
; Le programme plante au retour du sous-programme : trouve pourquoi.
START:
    MOVEQ   #10,D1
    MOVEQ   #20,D2
    MOVEQ   #30,D3
    BSR     SOMME3
    MOVE.L  D0,D7           ; le résultat
    CLR.W   -(SP)
    TRAP    #1

SOMME3:
    MOVEM.L D1-D3,-(SP)     ; sauvegarde
    MOVE.L  D1,D0
    ADD.L   D2,D0
    ADD.L   D3,D0
    MOVEM.L (SP)+,D1-D2     ; restauration
    RTS

;=== pile-solution
START:
    MOVEQ   #10,D1
    MOVEQ   #20,D2
    MOVEQ   #30,D3
    BSR     SOMME3
    MOVE.L  D0,D7
    CLR.W   -(SP)
    TRAP    #1

SOMME3:
    MOVEM.L D1-D3,-(SP)
    MOVE.L  D1,D0
    ADD.L   D2,D0
    ADD.L   D3,D0
    MOVEM.L (SP)+,D1-D3     ; autant de registres restaurés que sauvegardés
    RTS

;=== pieges-depart
; MAXI cherche le plus grand des 4 mots NON SIGNÉS (0 à 65 535) de la table et le
; renvoie dans D0. Ici, il devrait trouver $9000. Il contient deux erreurs classiques.
START:
    LEA     TABLE,A0
    BSR     MAXI
    CLR.W   -(SP)
    TRAP    #1

; MAXI : A0 = table de 4 mots non signés ; sortie : D0 = le plus grand
MAXI:
    MOVEQ   #0,D0
    MOVEQ   #4,D7           ; 4 mots
.suivant:
    MOVE.W  (A0)+,D1
    CMP.W   D0,D1
    BLE.S   .pasplus        ; pas plus grand : on passe
    MOVE.W  D1,D0
.pasplus:
    DBF     D7,.suivant
    RTS

TABLE:
    DC.W    $1234,$9000,$0042,$7FFF
    DC.W    $FFFF           ; (ce mot ne fait pas partie de la table)

;=== pieges-solution
START:
    LEA     TABLE,A0
    BSR     MAXI
    CLR.W   -(SP)
    TRAP    #1

MAXI:
    MOVEQ   #0,D0
    MOVEQ   #3,D7           ; DBF fait N + 1 tours : 3 pour 4 mots
.suivant:
    MOVE.W  (A0)+,D1
    CMP.W   D0,D1
    BLS.S   .pasplus        ; comparaison NON signée : BLS, pas BLE
    MOVE.W  D1,D0
.pasplus:
    DBF     D7,.suivant
    RTS

TABLE:
    DC.W    $1234,$9000,$0042,$7FFF
    DC.W    $FFFF

;=== registre-depart
; Le programme additionne dans D3 les 5 mots de TABLE, doublés par le sous-programme
; DOUBLE : le total devrait être 2 x (1 + 2 + 3 + 4 + 5) = 30. Mais DOUBLE abîme un
; registre de l'appelant : protège-le (sans changer le programme principal).
START:
    LEA     TABLE,A0
    MOVEQ   #0,D3           ; le total
    MOVEQ   #4,D4
.suivant:
    MOVE.W  (A0)+,D0
    BSR     DOUBLE
    ADD.W   D0,D3
    DBF     D4,.suivant
    CLR.W   -(SP)
    TRAP    #1

; DOUBLE : D0.W = D0.W x 2
DOUBLE:
    MOVE.W  D0,D3           ; D3 sert d'intermédiaire
    ADD.W   D3,D0
    RTS

TABLE:
    DC.W    1,2,3,4,5

;=== registre-solution
START:
    LEA     TABLE,A0
    MOVEQ   #0,D3
    MOVEQ   #4,D4
.suivant:
    MOVE.W  (A0)+,D0
    BSR     DOUBLE
    ADD.W   D0,D3
    DBF     D4,.suivant
    CLR.W   -(SP)
    TRAP    #1

; DOUBLE : D0.W = D0.W x 2 (tous les autres registres sont préservés)
DOUBLE:
    MOVE.L  D3,-(SP)        ; on sauvegarde ce qu'on va utiliser
    MOVE.W  D0,D3
    ADD.W   D3,D0
    MOVE.L  (SP)+,D3        ; et on le rend
    RTS

TABLE:
    DC.W    1,2,3,4,5

;=== chainer-depart
; Installe en $70 ta propre routine VBL : elle compte les images dans COMPTEUR, puis
; continue vers la routine VBL du TOS (on dit qu'elle se « chaîne »). Le programme
; principal attend 10 images, remet l'ancien vecteur, et quitte.
START:

    CLR.W   -(SP)
    TRAP    #1

ANCIEN:   DC.L  0
COMPTEUR: DC.W  0

;=== chainer-solution
START:
    PEA     INSTALLER(PC)   ; $70 est protégé : Supexec
    MOVE.W  #38,-(SP)
    TRAP    #14
    ADDQ.L  #6,SP
.attente:
    MOVE.W  #37,-(SP)       ; Vsync
    TRAP    #14
    ADDQ.L  #2,SP
    CMP.W   #10,COMPTEUR
    BLT.S   .attente
    PEA     RETIRER(PC)
    MOVE.W  #38,-(SP)
    TRAP    #14
    ADDQ.L  #6,SP
    CLR.W   -(SP)
    TRAP    #1

INSTALLER:
    MOVE.L  $70.W,ANCIEN    ; on garde l'ancien vecteur
    MOVE.L  #MAVBL,$70.W
    RTS

RETIRER:
    MOVE.L  ANCIEN,$70.W    ; et on le rend avant de partir
    RTS

MAVBL:
    ADDQ.W  #1,COMPTEUR
    MOVE.L  ANCIEN(PC),-(SP) ; on empile l'adresse de l'ancienne routine...
    RTS                     ; ... et RTS y saute : c'est elle qui fera le RTE

ANCIEN:   DC.L  0
COMPTEUR: DC.W  0

;=== intro-depart
; Défi final : une petite intro façon démo. Affiche le logo LOGO.PI1, ajoute des barres
; de couleur (rasters, avec le timer B) et une petite musique jouée sous VBL. La touche
; Espace termine le programme, après avoir tout remis en place.
START:

    CLR.W   -(SP)
    TRAP    #1

    SECTION DATA
IMAGE:
    INCBIN  "LOGO.PI1"

;=== intro-solution
START:
    PEA     IMAGE+2         ; palette du logo
    MOVE.W  #6,-(SP)        ; Setpalette
    TRAP    #14
    ADDQ.L  #6,SP
    MOVE.W  #2,-(SP)        ; Physbase
    TRAP    #14
    ADDQ.L  #2,SP
    MOVEA.L D0,A1
    LEA     IMAGE+34,A0
    MOVE.W  #32000/4-1,D7
.copie:
    MOVE.L  (A0)+,(A1)+
    DBF     D7,.copie
    PEA     INSTALLER(PC)
    MOVE.W  #38,-(SP)       ; Supexec
    TRAP    #14
    ADDQ.L  #6,SP
.boucle:
    MOVE.W  #37,-(SP)       ; Vsync
    TRAP    #14
    ADDQ.L  #2,SP
    MOVE.W  #11,-(SP)       ; Cconis : une touche attend ?
    TRAP    #1
    ADDQ.L  #2,SP
    TST.L   D0
    BEQ.S   .boucle
    MOVE.W  #8,-(SP)        ; Cnecin : on la lit
    TRAP    #1
    ADDQ.L  #2,SP
    CMP.B   #' ',D0         ; Espace ?
    BNE.S   .boucle
    PEA     RETIRER(PC)
    MOVE.W  #38,-(SP)
    TRAP    #14
    ADDQ.L  #6,SP
    CLR.W   -(SP)
    TRAP    #1

INSTALLER:
    MOVE.L  $70.W,ANCIENVBL
    MOVE.L  #VBL,$70.W
    MOVE.L  $120.W,ANCIENTB
    MOVE.L  #TIMERB,$120.W
    CLR.B   $FFFFFA1B.W     ; timer B arrêté pour l'instant
    BSET    #0,$FFFFFA07.W  ; IERA : interruption du timer B autorisée
    BSET    #0,$FFFFFA13.W  ; IMRA : et non masquée
    MOVE.B  #7,$FFFF8800.W  ; mixeur : son carré de la voie A
    MOVE.B  #%11111110,$FFFF8802.W
    RTS

RETIRER:
    CLR.B   $FFFFFA1B.W     ; timer B arrêté
    BCLR    #0,$FFFFFA07.W
    BCLR    #0,$FFFFFA13.W
    MOVE.L  ANCIENVBL,$70.W ; vecteurs rendus
    MOVE.L  ANCIENTB,$120.W
    MOVE.B  #8,$FFFF8800.W  ; silence
    CLR.B   $FFFF8802.W
    MOVE.W  IMAGE+2+2*2,$FFFF8244.W ; couleur 2 d'origine
    RTS

; VBL : relance les rasters pour la nouvelle image, fait avancer la musique, puis le TOS
VBL:
    MOVEM.L D0-D1/A0,-(SP)
    CLR.B   $FFFFFA1B.W     ; timer B arrêté...
    MOVE.B  #100,$FFFFFA21.W ; ... 100 lignes avant la première barre
    MOVE.B  #8,$FFFFFA1B.W  ; ... puis il compte les lignes
    CLR.W   RASTER
    BSR     MUSIQUE
    MOVEM.L (SP)+,D0-D1/A0
    MOVE.L  ANCIENVBL(PC),-(SP) ; chaîner vers la VBL du TOS
    RTS

; TIMERB : toutes les 2 lignes, une nouvelle teinte pour la couleur 2 (la bande du bas)
TIMERB:
    MOVEM.L D0/A0,-(SP)
    MOVE.W  RASTER(PC),D0
    LEA     COULEURS(PC),A0
    MOVE.W  0(A0,D0.W),$FFFF8244.W
    ADDQ.W  #2,D0
    CMP.W   #2*25,D0
    BLO.S   .suite
    MOVEQ   #0,D0
.suite:
    MOVE.W  D0,RASTER
    CLR.B   $FFFFFA1B.W     ; prochaine interruption dans 2 lignes
    MOVE.B  #2,$FFFFFA21.W
    MOVE.B  #8,$FFFFFA1B.W
    MOVEM.L (SP)+,D0/A0
    BCLR    #0,$FFFFFA0F.W  ; fin d'interruption (ISRA, bit du timer B)
    RTE

; MUSIQUE : une note toutes les 12 images, 8 notes en boucle
MUSIQUE:
    SUBQ.W  #1,ATTENTE
    BGT.S   .fin
    MOVE.W  #12,ATTENTE
    MOVE.W  RANG,D0
    ADDQ.W  #1,RANG
    AND.W   #7,D0
    ADD.W   D0,D0
    LEA     NOTES(PC),A0
    MOVE.W  0(A0,D0.W),D1
    MOVE.B  #0,$FFFF8800.W
    MOVE.B  D1,$FFFF8802.W
    LSR.W   #8,D1
    MOVE.B  #1,$FFFF8800.W
    MOVE.B  D1,$FFFF8802.W
    MOVE.B  #8,$FFFF8800.W
    MOVE.B  #12,$FFFF8802.W
.fin:
    RTS

ANCIENVBL: DC.L 0
ANCIENTB:  DC.L 0
RASTER:    DC.W 0
RANG:      DC.W 0
ATTENTE:   DC.W 0
NOTES:     DC.W 284,253,225,213,190,213,225,253
COULEURS:  DC.W $100,$200,$300,$400,$500,$600,$700,$710,$720,$730,$740,$750,$760
           DC.W $770,$670,$570,$470,$370,$270,$170,$071,$072,$073,$074,$075

    SECTION DATA
IMAGE:
    INCBIN  "LOGO.PI1"
