; Code for chapter 4, "TOS, TRAP and vectors".
; These programs run in USER MODE, as under the real TOS.

;=== bonjour
START:
    PEA     MESSAGE         ; push the address of the text (4 bytes)
    MOVE.W  #9,-(SP)        ; function number: Cconws (2 bytes)
    TRAP    #1              ; call the GEMDOS
    ADDQ.L  #6,SP           ; clean up the stack: 4 + 2 bytes
    CLR.W   -(SP)           ; Pterm0: end of the program
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
    ; a line is missing here
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
; Display the text 68000 (then a line break) and end with Pterm0
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
; Display five stars ***** with Cconout, in a loop, then end
START:

;=== etoiles-solution
START:
    MOVE.W  #4,D3           ; D3: preserved by TOS (5 rounds)
BOUCLE:
    MOVE.W  #'*',-(SP)
    MOVE.W  #2,-(SP)        ; Cconout
    TRAP    #1
    ADDQ.L  #4,SP
    DBRA    D3,BOUCLE
    CLR.W   -(SP)
    TRAP    #1

;=== ordonner-pterm-entete
; Display the letter A, then end the program
START:

;=== supexec-exemple
START:
    PEA     ROUTINE         ; address of the routine to run
    MOVE.W  #38,-(SP)       ; XBIOS 38: Supexec
    TRAP    #14
    ADDQ.L  #6,SP
    CLR.W   -(SP)           ; Pterm0
    TRAP    #1
ROUTINE:                    ; runs in supervisor mode
    MOVE.W  #$007,$FF8240   ; color 0 = blue
    BCLR    #0,$484         ; no more key click (conterm variable)
    RTS

;=== predire-bus
START:
    MOVE.W  #$007,$FF8240
    CLR.W   -(SP)
    TRAP    #1

;=== vert-depart
; Goal: a green screen background ($070), and a clean end to the program
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
; With Setcolor (XBIOS 7), set color 0 to yellow ($770), then end
START:

;=== setcolor-solution
START:
    MOVE.W  #$770,-(SP)     ; the color
    MOVE.W  #0,-(SP)        ; the color number
    MOVE.W  #7,-(SP)        ; XBIOS 7: Setcolor
    TRAP    #14
    ADDQ.L  #6,SP
    CLR.W   -(SP)
    TRAP    #1

;=== conterm-depart
; Read the system variable conterm ($484, one byte) into D7
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
    MOVE.B  $484,D7         ; D7 is preserved by TOS
    RTS

;=== setexec-exemple
START:
    PEA     MAROUTINE       ; address of our routine
    MOVE.W  #35,-(SP)       ; vector 35 = TRAP #3 (32 + 3)
    MOVE.W  #5,-(SP)        ; BIOS 5: Setexec
    TRAP    #13
    ADDQ.L  #8,SP
    MOVEQ   #20,D0
    TRAP    #3              ; call our routine
    CLR.W   -(SP)
    TRAP    #1
MAROUTINE:                  ; runs in supervisor mode
    ADD.L   D0,D0           ; double D0
    RTE                     ; return from exception

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
    MOVE.L  2(SP),D5        ; what is stacked 2 bytes below the top
    MOVE.W  (SP),D6         ; what is on top
    RTE

;=== vecteur-depart
; Install ROUTINE on TRAP #5, then call it: D0 must be 7
START:
    PEA     ROUTINE
    MOVE.W  #0,-(SP)        ; <- the vector number of TRAP #5
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
; Intercept the division by zero: the routine sets D7 to -1,
; and the program must carry on to Pterm0 instead of crashing.
START:

    MOVEQ   #10,D3
    MOVEQ   #0,D4
    DIVU    D4,D3           ; division by zero
    CLR.W   -(SP)
    TRAP    #1

;=== divzero-solution
START:
    PEA     DIVZERO
    MOVE.W  #5,-(SP)        ; vector 5: division by zero
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
; Install on TRAP #4 a routine that adds 1 to D6.
; The program calls TRAP #4 three times: D6 must be 3.
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
; With Setpalette (XBIOS 6), install the palette PALETTE in one go
START:

    EVEN
PALETTE:
    DC.W    $000,$100,$200,$300,$400,$500,$600,$700
    DC.W    $710,$720,$730,$740,$750,$760,$770,$777

;=== bonus-palette-solution
START:
    PEA     PALETTE
    MOVE.W  #6,-(SP)        ; XBIOS 6: Setpalette
    TRAP    #14
    ADDQ.L  #6,SP
    CLR.W   -(SP)
    TRAP    #1
    EVEN
PALETTE:
    DC.W    $000,$100,$200,$300,$400,$500,$600,$700
    DC.W    $710,$720,$730,$740,$750,$760,$770,$777

;=== rappel
START:
    MOVEQ   #0,D0
    MOVE.W  #4,D1
BOUCLE:
    ADDQ.W  #3,D0
    DBRA    D1,BOUCLE
    MOVE.L  D0,D2           ; the sum
    DIVU    #6,D0
    RTS
