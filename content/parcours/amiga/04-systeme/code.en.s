; Code for chapter 4, "The Amiga system".
; Each block starts with a line ";=== name" and is referenced in chapitre.json as
; "@code.s#name". All the blocks are assembled and run by tests/contenu-parcours.test.ts.

;=== forbid-exemple
START:
    MOVEA.L 4.W,A6          ; A6 = ExecBase, the system's only fixed address
    JSR     -132(A6)        ; Forbid(): no more task switching
    MOVE.B  295(A6),D0      ; TDNestCnt, the Forbid counter
    JSR     -138(A6)        ; Permit()
    MOVE.B  295(A6),D1
    RTS

;=== table-prediction
START:
    MOVEA.L 4.W,A6
    LEA     -552(A6),A0     ; the OpenLibrary entry in the jump table
    MOVE.W  (A0),D0         ; its first word
    MOVEQ   #0,D1
    MOVE.W  20(A6),D1       ; exec's LIB_VERSION
    RTS

;=== forbid-depart
; Lock multitasking with Forbid(), read the TDNestCnt counter into D7, then hand control back
; with Permit()
START:
    MOVEA.L 4.W,A6
    JSR     -6(A6)          ; <- replace -6 with the offset of Forbid
    MOVE.B  295(A6),D7      ; TDNestCnt
    JSR     -6(A6)          ; <- replace -6 with the offset of Permit
    MOVEQ   #0,D0           ; return code for the Shell: all is well
    RTS

;=== forbid-solution
START:
    MOVEA.L 4.W,A6
    JSR     -132(A6)        ; Forbid
    MOVE.B  295(A6),D7      ; TDNestCnt
    JSR     -138(A6)        ; Permit
    MOVEQ   #0,D0           ; return code for the Shell: all is well
    RTS

;=== permit-depart
; This program must suspend multitasking during a calculation, then hand control back
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
; Call Disable twice, then Enable twice. After each call, store IDNestCnt
; (the byte at 294(A6)): in D4, D5, D6 then D7.
START:
    MOVEA.L 4.W,A6

    MOVEQ   #0,D0           ; return code for the Shell: all is well
    RTS

;=== disable-solution
START:
    MOVEA.L 4.W,A6
    JSR     -120(A6)        ; Disable: IDNestCnt goes from -1 to 0
    MOVE.B  294(A6),D4
    JSR     -120(A6)        ; Disable: 1
    MOVE.B  294(A6),D5
    JSR     -126(A6)        ; Enable: 0, interrupts stay off
    MOVE.B  294(A6),D6
    JSR     -126(A6)        ; Enable: -1, they come back
    MOVE.B  294(A6),D7
    MOVEQ   #0,D0           ; return code for the Shell: all is well
    RTS

;=== bonjour-exemple
START:
    MOVEA.L 4.W,A6          ; exec
    LEA     dosnom(PC),A1
    MOVEQ   #0,D0           ; any version
    JSR     -552(A6)        ; OpenLibrary("dos.library", 0)
    TST.L   D0
    BEQ.S   .fin            ; no dos.library: stop here
    MOVEA.L D0,A6           ; A6 = DOSBase
    JSR     -60(A6)         ; Output(): the CLI window
    MOVE.L  D0,D1           ; D1 = the handle
    LEA     texte(PC),A0
    MOVE.L  A0,D2           ; D2 = the text
    MOVEQ   #fin-texte,D3   ; D3 = its length
    JSR     -48(A6)         ; Write
    MOVEA.L A6,A1
    MOVEA.L 4.W,A6
    JSR     -414(A6)        ; CloseLibrary(DOSBase)
.fin:
    MOVEQ   #0,D0           ; return code: all is well
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
    MOVEQ   #4,D3           ; <- the length of the text
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
    MOVEQ   #fin-texte,D3   ; the assembler counts for us: 16
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
    MOVE.L  D0,D1           ; the handle must be in D1
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
; Put the opening of dos.library back in order: the program must display "OK".
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
; Display two lines in the CLI:
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
    MOVE.L  #1000,D0        ; 1000 bytes
    MOVE.L  #$10002,D1      ; MEMF_CHIP + MEMF_CLEAR
    JSR     -198(A6)        ; AllocMem
    TST.L   D0
    BEQ.S   .fin            ; out of memory: stop here
    MOVEA.L D0,A2           ; A2 = the block (exec does not change A2)
    MOVE.L  #$12345678,(A2) ; use it
    MOVE.L  (A2),D7
    MOVEA.L A2,A1           ; FreeMem(block, 1000)
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
    MOVE.L  D0,D6           ; free Chip RAM before
    MOVE.L  #4000,D0
    MOVEQ   #2,D1
    JSR     -198(A6)        ; AllocMem(4000, MEMF_CHIP)
    MOVEA.L D0,A2
    MOVEQ   #2,D1
    JSR     -216(A6)
    MOVE.L  D6,D7
    SUB.L   D0,D7           ; what has gone
    MOVEA.L A2,A1
    MOVE.L  #4000,D0
    JSR     -210(A6)        ; FreeMem
    RTS

;=== drapeaux-depart
; Reserve 512 bytes of Chip RAM filled with zeros, write $CAFE in their first word,
; read it back into D7, then give the block back.
START:
    MOVEA.L 4.W,A6
    MOVE.L  #512,D0
    MOVE.L  #0,D1           ; <- the type: Chip RAM, filled with zeros
    JSR     -198(A6)
    MOVEA.L D0,A2
    MOVE.W  #$CAFE,(A2)
    MOVE.W  (A2),D7
    MOVE.L  A2,D6           ; D6 = the address of the block
    MOVEA.L A2,A1
    MOVE.L  #512,D0
    JSR     -210(A6)
    MOVEQ   #0,D0           ; return code for the Shell: all is well
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
    MOVE.L  A2,D6           ; D6 = the address of the block
    MOVEA.L A2,A1
    MOVE.L  #512,D0
    JSR     -210(A6)
    MOVEQ   #0,D0           ; return code for the Shell: all is well
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
    MOVE.L  #320,D0         ; the same size as in AllocMem
    JSR     -210(A6)        ; FreeMem
    MOVEQ   #0,D0
    RTS

;=== table-depart
; Reserve 256 bytes of Chip RAM, fill them with 0, 1, 2... 255, add them up into D7,
; then give the block back.
START:

    MOVEQ   #0,D0           ; return code for the Shell: all is well
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
    MOVEQ   #0,D1           ; the value to write
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
    MOVEQ   #0,D0           ; return code for the Shell: all is well
    RTS

;=== decompte-exemple
START:
    MOVEA.L 4.W,A6
    LEA     dosnom(PC),A1
    MOVEQ   #0,D0
    JSR     -552(A6)
    MOVEA.L D0,A5           ; A5 = DOSBase
    MOVEQ   #3,D7           ; count down from 3
.boucle:
    MOVE.W  D7,nombre       ; the data for %d is a WORD
    LEA     format(PC),A0
    LEA     nombre(PC),A1
    LEA     ranger(PC),A2
    LEA     tampon,A3
    MOVEA.L 4.W,A6
    JSR     -522(A6)        ; RawDoFmt: buffer = "3..."
    BSR.S   afficher
    MOVEA.L A5,A6
    MOVEQ   #50,D1
    JSR     -198(A6)        ; Delay(50): one second
    SUBQ.W  #1,D7
    BNE.S   .boucle
    LEA     final(PC),A3
    BSR.S   afficher
    MOVEA.L A5,A1
    MOVEA.L 4.W,A6
    JSR     -414(A6)
    MOVEQ   #0,D0
    RTS
; Writes the 0-terminated text that starts at A3
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
ranger: MOVE.B  D0,(A3)+    ; one more character in the buffer
    RTS
dosnom: DC.B    'dos.library',0
format: DC.B    '%d...',10,0
final:  DC.B    'Décollage !',10,0
    EVEN
nombre: DC.W    0
tampon: DS.B    40

;=== decompte5-solution
START:
    MOVEA.L 4.W,A6
    LEA     dosnom(PC),A1
    MOVEQ   #0,D0
    JSR     -552(A6)
    MOVEA.L D0,A5           ; A5 = DOSBase
    MOVEQ   #5,D7           ; count down from 5
.boucle:
    MOVE.W  D7,nombre
    LEA     format(PC),A0
    LEA     nombre(PC),A1
    LEA     ranger(PC),A2
    LEA     tampon,A3
    MOVEA.L 4.W,A6
    JSR     -522(A6)        ; RawDoFmt: buffer = "T-5"
    BSR.S   afficher
    MOVEA.L A5,A6
    MOVEQ   #50,D1
    JSR     -198(A6)        ; Delay(50)
    SUBQ.W  #1,D7
    BNE.S   .boucle
    LEA     final(PC),A3
    BSR.S   afficher
    MOVEA.L A5,A1
    MOVEA.L 4.W,A6
    JSR     -414(A6)
    MOVEQ   #0,D0
    RTS
; Writes the 0-terminated text that starts at A3
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
ranger: MOVE.B  D0,(A3)+
    RTS
dosnom: DC.B    'dos.library',0
format: DC.B    'T-%d',10,0
final:  DC.B    'Décollage !',10,0
    EVEN
nombre: DC.W    0
tampon: DS.B    40

;=== score-depart
; Display "Score : 1500" (then a line feed) in the CLI, from the value
; stored in memory at the label score.
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
    MOVEA.L A3,A0           ; length of the text produced
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
; Ask for the first name, then answer "Bonjour <first name> !"
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
    MOVEA.L D0,A6           ; A6 = DOSBase for the whole program
    JSR     -60(A6)
    MOVE.L  D0,D5           ; D5 = the output (dos preserves D2-D7)
    JSR     -54(A6)
    MOVE.L  D0,D6           ; D6 = the input
    MOVE.L  D5,D1           ; the question
    MOVE.L  #question,D2
    MOVEQ   #finq-question,D3
    JSR     -48(A6)
    MOVE.L  D6,D1           ; read a line
    MOVE.L  #tampon,D2
    MOVEQ   #80,D3
    JSR     -42(A6)
    MOVE.L  D0,D7           ; length read, with the final 10
    SUBQ.L  #1,D7           ; without the 10
    MOVE.L  D5,D1           ; "Bonjour"
    MOVE.L  #debut,D2
    MOVEQ   #find-debut,D3
    JSR     -48(A6)
    LEA     tampon,A0       ; replace the 10 with "!" and put the 10 back
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

;=== rappel
START:
    MOVEQ   #0,D1
    MOVEQ   #4,D2
.boucle:
    ADD.W   D2,D1           ; 4 + 3 + 2 + 1 + 0
    DBRA    D2,.boucle
    LSL.W   #2,D1
    MOVE.L  D1,-(SP)
    MOVE.L  (SP)+,D3
    MOVEQ   #0,D0
    RTS
