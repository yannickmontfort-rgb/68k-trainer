; Code for chapter 1, "Getting started".
; Each block starts with a line ";=== name" and is referenced in chapitre.json as
; "@code.s#name". Every block is assembled and run by tests/contenu-parcours.test.ts.

;=== premier
; My first program
START:
    MOVE.W  #5,D0       ; D0 receives 5
    MOVE.W  #3,D1       ; D1 receives 3
    ADD.W   D1,D0       ; D0 = D0 + D1
    RTS                 ; back to [[atari:TOS|amiga:the CLI]]

;=== predire-sub
START:
    MOVE.W  #10,D0
    MOVE.W  #4,D1
    SUB.W   D1,D0
    RTS

;=== completer-depart
START:
    MOVE.W  #0,D0       ; <- replace 0 with the right value
    ADD.W   #2,D0
    RTS

;=== completer-solution
START:
    MOVE.W  #7,D0
    ADD.W   #2,D0
    RTS

;=== ordonner-entete
; Goal: D2 = (6 + 2) x 5 = 40
START:

;=== ecrire-depart
; Put 100 in D1, 25 in D2, then D1 - D2 in D1
START:

    RTS

;=== ecrire-solution
START:
    MOVE.W  #100,D1
    MOVE.W  #25,D2
    SUB.W   D2,D1
    RTS

;=== autonome-depart
; D0 = 3 x (4 + 5), without a multiplication instruction
START:

    RTS

;=== autonome-solution
START:
    MOVE.W  #4,D0
    ADD.W   #5,D0       ; D0 = 9
    MOVE.W  D0,D1       ; keep 9 in D1
    ADD.W   D1,D0       ; D0 = 18
    ADD.W   D1,D0       ; D0 = 27
    RTS

;=== bug-logique
; Goal: D0 = 2 x (3 + 4) = 14
START:
    MOVE.W  #3,D0
    ADD.W   #4,D0       ; D0 = 7
    MOVE.W  D0,D1       ; copy D0 into D1
    ADD.W   D1,D1       ; double it... but which register?
    RTS

;=== corriger-syntaxe-depart
; Goal: D2 = 5 + 7 = 12
START:
    MOVE.W  #5,D2
    ADDD.W  #7,D2
    RTS

;=== corriger-syntaxe-solution
; Goal: D2 = 5 + 7 = 12
START:
    MOVE.W  #5,D2
    ADD.W   #7,D2
    RTS

;=== corriger-logique-depart
; Goal: D3 = 10 + 20 = 30
START:
    MOVE.W  #10,D3
    MOVE.W  #20,D4
    ADD.W   D3,D4
    RTS

;=== corriger-logique-solution
; Goal: D3 = 10 + 20 = 30
START:
    MOVE.W  #10,D3
    MOVE.W  #20,D4
    ADD.W   D4,D3
    RTS

;=== corriger-diese-depart
; Goal: D5 = $1000 + 1 = $1001
START:
    MOVE.W  $1000,D5
    ADDQ.W  #1,D5
    RTS

;=== corriger-diese-solution
START:
    MOVE.W  #$1000,D5
    ADDQ.W  #1,D5
    RTS

;=== predire-crash
START:
    MOVE.W  #$1234,D0
    MOVE.W  D0,$3001
    RTS

;=== qcm-addition
    MOVE.W  #8,D0
    ADD.W   #8,D0

;=== bonus-fond-depart
; Paint the screen background red
START:

    RTS

;=== bonus-fond-solution
START:
    MOVE.W  #$700,$FF8240   ; color 0 (the background) = red
    RTS
;=== bonus-fond-depart@amiga
; Paint the screen background red, until the left mouse button is clicked
START:

    RTS

;=== bonus-fond-solution@amiga
START:
.repeindre:
    MOVE.W  #$F00,$DFF180   ; COLOR00 (the background) = red
    BTST    #6,$BFE001      ; left mouse button pressed?
    BNE.S   .repeindre      ; not yet: go round again
    RTS
