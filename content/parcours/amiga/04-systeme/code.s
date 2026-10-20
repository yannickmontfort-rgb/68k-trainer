; Codes du chapitre 4 « Le système de l'Amiga ».
; Chaque bloc commence par une ligne « ;=== nom » et est référencé dans chapitre.json par
; « @code.s#nom ». Tous les blocs sont assemblés et exécutés par tests/contenu-parcours.test.ts.

;=== forbid-exemple
START:
    MOVEA.L 4.W,A6          ; A6 = ExecBase, la seule adresse fixe du système
    JSR     -132(A6)        ; Forbid() : plus de changement de tâche
    MOVE.B  295(A6),D0      ; TDNestCnt, le compteur des Forbid
    JSR     -138(A6)        ; Permit()
    MOVE.B  295(A6),D1
    RTS

;=== table-prediction
START:
    MOVEA.L 4.W,A6
    LEA     -552(A6),A0     ; l'entrée de OpenLibrary dans la table de sauts
    MOVE.W  (A0),D0         ; son premier mot
    MOVEQ   #0,D1
    MOVE.W  20(A6),D1       ; LIB_VERSION d'exec
    RTS

;=== forbid-depart
; Bloque le multitâche avec Forbid(), lis le compteur TDNestCnt dans D7, puis rends la main
; avec Permit()
START:
    MOVEA.L 4.W,A6
    JSR     -6(A6)          ; <- remplace -6 par le décalage de Forbid
    MOVE.B  295(A6),D7      ; TDNestCnt
    JSR     -6(A6)          ; <- remplace -6 par le décalage de Permit
    RTS

;=== forbid-solution
START:
    MOVEA.L 4.W,A6
    JSR     -132(A6)        ; Forbid
    MOVE.B  295(A6),D7      ; TDNestCnt
    JSR     -138(A6)        ; Permit
    RTS

;=== permit-depart
; Ce programme doit suspendre le multitâche le temps d'un calcul, puis rendre la main
START:
    MOVEA.L 4.W,A6
    JSR     -132(A6)        ; Forbid
    MOVEQ   #0,D0
    MOVEQ   #9,D1
.calcul:
    ADD.L   D1,D0           ; 9 + 8 + ... + 0
    JSR     -132(A6)        ; Forbid
    DBF     D1,.calcul
    JSR     -138(A6)        ; Permit
    RTS

;=== permit-solution
START:
    MOVEA.L 4.W,A6
    JSR     -132(A6)        ; Forbid
    MOVEQ   #0,D0
    MOVEQ   #9,D1
.calcul:
    ADD.L   D1,D0           ; 9 + 8 + ... + 0
    DBF     D1,.calcul
    JSR     -138(A6)        ; Permit
    RTS

;=== disable-depart
; Appelle Disable deux fois, puis Enable deux fois. Après chaque appel, range IDNestCnt
; (l'octet en 294(A6)) : dans D4, D5, D6 puis D7.
START:
    MOVEA.L 4.W,A6

    RTS

;=== disable-solution
START:
    MOVEA.L 4.W,A6
    JSR     -120(A6)        ; Disable : IDNestCnt passe de -1 à 0
    MOVE.B  294(A6),D4
    JSR     -120(A6)        ; Disable : 1
    MOVE.B  294(A6),D5
    JSR     -126(A6)        ; Enable : 0, les interruptions restent coupées
    MOVE.B  294(A6),D6
    JSR     -126(A6)        ; Enable : -1, elles reviennent
    MOVE.B  294(A6),D7
    RTS

;=== bonjour-exemple
START:
    MOVEA.L 4.W,A6          ; exec
    LEA     dosnom(PC),A1
    MOVEQ   #0,D0           ; n'importe quelle version
    JSR     -552(A6)        ; OpenLibrary("dos.library", 0)
    TST.L   D0
    BEQ.S   .fin            ; pas de dos.library : on s'arrête
    MOVEA.L D0,A6           ; A6 = DOSBase
    JSR     -60(A6)         ; Output() : la fenêtre du CLI
    MOVE.L  D0,D1           ; D1 = la poignée
    LEA     texte(PC),A0
    MOVE.L  A0,D2           ; D2 = le texte
    MOVEQ   #fin-texte,D3   ; D3 = sa longueur
    JSR     -48(A6)         ; Write
    MOVEA.L A6,A1
    MOVEA.L 4.W,A6
    JSR     -414(A6)        ; CloseLibrary(DOSBase)
.fin:
    MOVEQ   #0,D0           ; code de retour : tout va bien
    RTS
dosnom: DC.B    'dos.library',0
texte:  DC.B    'Bonjour Amiga !',10
fin:
    EVEN

;=== version-prediction
START:
    MOVEA.L 4.W,A6
    LEA     gfxnom(PC),A1
    MOVEQ   #36,D0          ; version 36 minimum (Kickstart 2.0)
    JSR     -552(A6)
    MOVE.L  D0,D6
    LEA     gfxnom(PC),A1
    MOVEQ   #33,D0          ; version 33 minimum (Kickstart 1.2)
    JSR     -552(A6)
    MOVE.L  D0,D7
    MOVEA.L D7,A1
    JSR     -414(A6)
    RTS
gfxnom: DC.B    'graphics.library',0
    EVEN

;=== longueur-depart
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
    MOVEQ   #4,D3           ; <- la longueur du texte
    JSR     -48(A6)
    MOVEA.L A6,A1
    MOVEA.L 4.W,A6
    JSR     -414(A6)
    MOVEQ   #0,D0
    RTS
dosnom: DC.B    'dos.library',0
texte:  DC.B    'Bonjour Amiga !',10
fin:
    EVEN

;=== longueur-solution
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
    MOVEQ   #fin-texte,D3   ; l'assembleur compte pour nous : 16
    JSR     -48(A6)
    MOVEA.L A6,A1
    MOVEA.L 4.W,A6
    JSR     -414(A6)
    MOVEQ   #0,D0
    RTS
dosnom: DC.B    'dos.library',0
texte:  DC.B    'Bonjour Amiga !',10
fin:
    EVEN

;=== poignee-depart
START:
    MOVEA.L 4.W,A6
    LEA     dosnom(PC),A1
    MOVEQ   #0,D0
    JSR     -552(A6)
    MOVEA.L D0,A6
    JSR     -60(A6)         ; Output()
    LEA     texte(PC),A0
    MOVE.L  A0,D2
    MOVEQ   #fin-texte,D3
    JSR     -48(A6)         ; Write
    MOVEA.L A6,A1
    MOVEA.L 4.W,A6
    JSR     -414(A6)
    MOVEQ   #0,D0
    RTS
dosnom: DC.B    'dos.library',0
texte:  DC.B    'Amiga 500',10
fin:
    EVEN

;=== poignee-solution
START:
    MOVEA.L 4.W,A6
    LEA     dosnom(PC),A1
    MOVEQ   #0,D0
    JSR     -552(A6)
    MOVEA.L D0,A6
    JSR     -60(A6)         ; Output()
    MOVE.L  D0,D1           ; la poignée doit être dans D1
    LEA     texte(PC),A0
    MOVE.L  A0,D2
    MOVEQ   #fin-texte,D3
    JSR     -48(A6)         ; Write
    MOVEA.L A6,A1
    MOVEA.L 4.W,A6
    JSR     -414(A6)
    MOVEQ   #0,D0
    RTS
dosnom: DC.B    'dos.library',0
texte:  DC.B    'Amiga 500',10
fin:
    EVEN

;=== ordonner-entete
; Remets dans l'ordre l'ouverture de dos.library : le programme doit afficher « OK ».
START:

;=== ordonner-pied
    JSR     -60(A6)
    MOVE.L  D0,D1
    LEA     texte(PC),A0
    MOVE.L  A0,D2
    MOVEQ   #3,D3
    JSR     -48(A6)
    MOVEQ   #0,D0
    RTS
dosnom: DC.B    'dos.library',0
texte:  DC.B    'OK',10
    EVEN

;=== deux-lignes-depart
; Affiche deux lignes dans le CLI :
;   Ligne 1
;   Ligne 2
START:

    RTS
dosnom: DC.B    'dos.library',0
    EVEN

;=== deux-lignes-solution
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
    MOVEQ   #0,D0
    RTS
dosnom: DC.B    'dos.library',0
texte:  DC.B    'Ligne 1',10,'Ligne 2',10
fin:
    EVEN

;=== memoire-exemple
START:
    MOVEA.L 4.W,A6
    MOVE.L  #1000,D0        ; 1000 octets
    MOVE.L  #$10002,D1      ; MEMF_CHIP + MEMF_CLEAR
    JSR     -198(A6)        ; AllocMem
    TST.L   D0
    BEQ.S   .fin            ; plus de mémoire : on s'arrête
    MOVEA.L D0,A2           ; A2 = le bloc (A2 n'est pas modifié par exec)
    MOVE.L  #$12345678,(A2) ; on s'en sert
    MOVE.L  (A2),D7
    MOVEA.L A2,A1           ; FreeMem(bloc, 1000)
    MOVE.L  #1000,D0
    JSR     -210(A6)
.fin:
    MOVEQ   #0,D0
    RTS

;=== availmem-prediction
START:
    MOVEA.L 4.W,A6
    MOVEQ   #2,D1           ; MEMF_CHIP
    JSR     -216(A6)        ; AvailMem
    MOVE.L  D0,D6           ; Chip RAM libre avant
    MOVE.L  #4000,D0
    MOVEQ   #2,D1
    JSR     -198(A6)        ; AllocMem(4000, MEMF_CHIP)
    MOVEA.L D0,A2
    MOVEQ   #2,D1
    JSR     -216(A6)
    MOVE.L  D6,D7
    SUB.L   D0,D7           ; ce qui a disparu
    MOVEA.L A2,A1
    MOVE.L  #4000,D0
    JSR     -210(A6)        ; FreeMem
    RTS

;=== drapeaux-depart
; Réserve 512 octets de Chip RAM remplis de zéros, écris $CAFE dans leur premier mot,
; relis-le dans D7, puis rends le bloc.
START:
    MOVEA.L 4.W,A6
    MOVE.L  #512,D0
    MOVE.L  #0,D1           ; <- le type : Chip RAM, remplie de zéros
    JSR     -198(A6)
    MOVEA.L D0,A2
    MOVE.W  #$CAFE,(A2)
    MOVE.W  (A2),D7
    MOVE.L  A2,D6           ; D6 = l'adresse du bloc
    MOVEA.L A2,A1
    MOVE.L  #512,D0
    JSR     -210(A6)
    RTS

;=== drapeaux-solution
START:
    MOVEA.L 4.W,A6
    MOVE.L  #512,D0
    MOVE.L  #$10002,D1      ; MEMF_CHIP ($2) + MEMF_CLEAR ($10000)
    JSR     -198(A6)
    MOVEA.L D0,A2
    MOVE.W  #$CAFE,(A2)
    MOVE.W  (A2),D7
    MOVE.L  A2,D6           ; D6 = l'adresse du bloc
    MOVEA.L A2,A1
    MOVE.L  #512,D0
    JSR     -210(A6)
    RTS

;=== freemem-depart
START:
    MOVEA.L 4.W,A6
    MOVE.L  #320,D0
    MOVE.L  #$10002,D1
    JSR     -198(A6)        ; AllocMem(320, MEMF_CHIP|MEMF_CLEAR)
    MOVEA.L D0,A2
    MOVE.B  #1,100(A2)
    MOVEA.L A2,A1
    MOVE.L  #300,D0
    JSR     -210(A6)        ; FreeMem
    MOVEQ   #0,D0
    RTS

;=== freemem-solution
START:
    MOVEA.L 4.W,A6
    MOVE.L  #320,D0
    MOVE.L  #$10002,D1
    JSR     -198(A6)        ; AllocMem(320, MEMF_CHIP|MEMF_CLEAR)
    MOVEA.L D0,A2
    MOVE.B  #1,100(A2)
    MOVEA.L A2,A1
    MOVE.L  #320,D0         ; la même taille qu'à l'AllocMem
    JSR     -210(A6)        ; FreeMem
    MOVEQ   #0,D0
    RTS

;=== table-depart
; Réserve 256 octets de Chip RAM, remplis-les avec 0, 1, 2... 255, fais-en la somme dans D7,
; puis rends le bloc.
START:

    RTS

;=== table-solution
START:
    MOVEA.L 4.W,A6
    MOVE.L  #256,D0
    MOVEQ   #2,D1           ; MEMF_CHIP
    JSR     -198(A6)
    TST.L   D0
    BEQ.S   .fin
    MOVEA.L D0,A2
    MOVEA.L A2,A0
    MOVEQ   #0,D1           ; la valeur à écrire
    MOVE.W  #255,D2
.remplir:
    MOVE.B  D1,(A0)+
    ADDQ.B  #1,D1
    DBF     D2,.remplir
    MOVEA.L A2,A0
    MOVEQ   #0,D7
    MOVEQ   #0,D1
    MOVE.W  #255,D2
.somme:
    MOVE.B  (A0)+,D1
    ADD.L   D1,D7
    DBF     D2,.somme
    MOVEA.L A2,A1
    MOVE.L  #256,D0
    JSR     -210(A6)
.fin:
    RTS

;=== decompte-exemple
START:
    MOVEA.L 4.W,A6
    LEA     dosnom(PC),A1
    MOVEQ   #0,D0
    JSR     -552(A6)
    MOVEA.L D0,A5           ; A5 = DOSBase
    MOVEQ   #3,D7           ; on compte à partir de 3
.boucle:
    MOVE.W  D7,nombre       ; la donnée de %d est un MOT
    LEA     format(PC),A0
    LEA     nombre(PC),A1
    LEA     ranger(PC),A2
    LEA     tampon,A3
    MOVEA.L 4.W,A6
    JSR     -522(A6)        ; RawDoFmt : tampon = « 3... »
    BSR.S   afficher
    MOVEA.L A5,A6
    MOVEQ   #50,D1
    JSR     -198(A6)        ; Delay(50) : une seconde
    SUBQ.W  #1,D7
    BNE.S   .boucle
    LEA     final(PC),A3
    BSR.S   afficher
    MOVEA.L A5,A1
    MOVEA.L 4.W,A6
    JSR     -414(A6)
    MOVEQ   #0,D0
    RTS
; Écrit le texte terminé par 0 qui commence en A3
afficher:
    MOVEA.L A3,A0
    MOVEQ   #-1,D3
.compte:
    ADDQ.L  #1,D3
    TST.B   (A0)+
    BNE.S   .compte
    MOVEA.L A5,A6
    JSR     -60(A6)
    MOVE.L  D0,D1
    MOVE.L  A3,D2
    JSR     -48(A6)
    RTS
ranger: MOVE.B  D0,(A3)+    ; un caractère de plus dans le tampon
    RTS
dosnom: DC.B    'dos.library',0
format: DC.B    '%d...',10,0
final:  DC.B    'Décollage !',10,0
    EVEN
nombre: DC.W    0
tampon: DS.B    40

;=== score-depart
; Affiche « Score : 1500 » (puis un retour à la ligne) dans le CLI, à partir de la valeur
; rangée en mémoire à l'étiquette score.
START:
    MOVEA.L 4.W,A6
    LEA     dosnom(PC),A1
    MOVEQ   #0,D0
    JSR     -552(A6)
    MOVEA.L D0,A5           ; A5 = DOSBase

    MOVEQ   #0,D0
    RTS
ranger: MOVE.B  D0,(A3)+
    RTS
dosnom: DC.B    'dos.library',0
format: DC.B    'Score : %ld',10,0
    EVEN
score:  DC.L    1500
tampon: DS.B    40

;=== score-solution
START:
    MOVEA.L 4.W,A6
    LEA     dosnom(PC),A1
    MOVEQ   #0,D0
    JSR     -552(A6)
    MOVEA.L D0,A5           ; A5 = DOSBase
    LEA     format(PC),A0
    LEA     score(PC),A1
    LEA     ranger(PC),A2
    LEA     tampon,A3
    JSR     -522(A6)        ; RawDoFmt
    MOVEA.L A3,A0           ; longueur du texte produit
    MOVEQ   #-1,D3
.compte:
    ADDQ.L  #1,D3
    TST.B   (A0)+
    BNE.S   .compte
    MOVEA.L A5,A6
    JSR     -60(A6)
    MOVE.L  D0,D1
    MOVE.L  A3,D2
    JSR     -48(A6)
    MOVEQ   #0,D0
    RTS
ranger: MOVE.B  D0,(A3)+
    RTS
dosnom: DC.B    'dos.library',0
format: DC.B    'Score : %ld',10,0
    EVEN
score:  DC.L    1500
tampon: DS.B    40

;=== mot-long-depart
START:
    MOVEA.L 4.W,A6
    LEA     dosnom(PC),A1
    MOVEQ   #0,D0
    JSR     -552(A6)
    MOVEA.L D0,A5
    LEA     format(PC),A0
    LEA     valeur(PC),A1
    LEA     ranger(PC),A2
    LEA     tampon,A3
    JSR     -522(A6)
    MOVEA.L A3,A0
    MOVEQ   #-1,D3
.compte:
    ADDQ.L  #1,D3
    TST.B   (A0)+
    BNE.S   .compte
    MOVEA.L A5,A6
    JSR     -60(A6)
    MOVE.L  D0,D1
    MOVE.L  A3,D2
    JSR     -48(A6)
    MOVEQ   #0,D0
    RTS
ranger: MOVE.B  D0,(A3)+
    RTS
dosnom: DC.B    'dos.library',0
format: DC.B    'Octets libres : %d',10,0
    EVEN
valeur: DC.L    250000
tampon: DS.B    40

;=== mot-long-solution
START:
    MOVEA.L 4.W,A6
    LEA     dosnom(PC),A1
    MOVEQ   #0,D0
    JSR     -552(A6)
    MOVEA.L D0,A5
    LEA     format(PC),A0
    LEA     valeur(PC),A1
    LEA     ranger(PC),A2
    LEA     tampon,A3
    JSR     -522(A6)
    MOVEA.L A3,A0
    MOVEQ   #-1,D3
.compte:
    ADDQ.L  #1,D3
    TST.B   (A0)+
    BNE.S   .compte
    MOVEA.L A5,A6
    JSR     -60(A6)
    MOVE.L  D0,D1
    MOVE.L  A3,D2
    JSR     -48(A6)
    MOVEQ   #0,D0
    RTS
ranger: MOVE.B  D0,(A3)+
    RTS
dosnom: DC.B    'dos.library',0
format: DC.B    'Octets libres : %ld',10,0
    EVEN
valeur: DC.L    250000
tampon: DS.B    40

;=== qcm-version
    MOVEA.L 4.W,A6
    LEA     nom(PC),A1
    MOVEQ   #37,D0
    JSR     -552(A6)

;=== bonus-prenom-depart
; Demande le prénom, puis réponds « Bonjour <prénom> ! »
START:

    RTS
dosnom:  DC.B   'dos.library',0
question: DC.B  'Ton prénom ? '
finq:
debut:   DC.B   'Bonjour '
find:
    EVEN
tampon:  DS.B   80

;=== bonus-prenom-solution
START:
    MOVEA.L 4.W,A6
    LEA     dosnom(PC),A1
    MOVEQ   #0,D0
    JSR     -552(A6)
    MOVEA.L D0,A6           ; A6 = DOSBase pour tout le programme
    JSR     -60(A6)
    MOVE.L  D0,D5           ; D5 = la sortie (D2-D7 sont préservés par dos)
    JSR     -54(A6)
    MOVE.L  D0,D6           ; D6 = l'entrée
    MOVE.L  D5,D1           ; la question
    MOVE.L  #question,D2
    MOVEQ   #finq-question,D3
    JSR     -48(A6)
    MOVE.L  D6,D1           ; lire une ligne
    MOVE.L  #tampon,D2
    MOVEQ   #80,D3
    JSR     -42(A6)
    MOVE.L  D0,D7           ; longueur lue, avec le 10 final
    SUBQ.L  #1,D7           ; sans le 10
    MOVE.L  D5,D1           ; « Bonjour »
    MOVE.L  #debut,D2
    MOVEQ   #find-debut,D3
    JSR     -48(A6)
    LEA     tampon,A0       ; on remplace le 10 par « ! » et on remet le 10
    MOVE.B  #' ',0(A0,D7.L)
    MOVE.B  #'!',1(A0,D7.L)
    MOVE.B  #10,2(A0,D7.L)
    MOVE.L  D5,D1
    MOVE.L  #tampon,D2
    MOVE.L  D7,D3
    ADDQ.L  #3,D3
    JSR     -48(A6)
    MOVEA.L A6,A1
    MOVEA.L 4.W,A6
    JSR     -414(A6)
    MOVEQ   #0,D0
    RTS
dosnom:  DC.B   'dos.library',0
question: DC.B  'Ton prénom ? '
finq:
debut:   DC.B   'Bonjour '
find:
    EVEN
tampon:  DS.B   80
