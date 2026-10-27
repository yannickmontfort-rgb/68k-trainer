; Code for chapter 3, "The basic instruction set".
; Each block ";=== name" is referenced in chapitre.json as "@code.s#name".
; The solutions of the exercises taken from version 0.1 (ref general-…) are those of their tests.

;=== adressage-exemple
START:
    LEA     SOURCE,A0       ; A0 = address of the table
    LEA     $3000,A1        ; A1 = destination address
    MOVE.W  (A0)+,(A1)+     ; copy the 1st word, then A0 and A1 move forward by 2
    MOVE.W  (A0)+,(A1)+     ; copy the 2nd word
    MOVE.W  2(A0),D0        ; read the word located 2 bytes after A0
    LEA     SOURCE,A2
    MOVEQ   #4,D1           ; index in bytes
    MOVE.W  0(A2,D1.W),D2   ; read the word at SOURCE + D1
    RTS
SOURCE: DC.W    $1111,$2222,$3333,$4444

;=== adressage-prediction
START:
    LEA     TABLE,A0
    MOVE.W  (A0)+,D0
    MOVE.W  (A0)+,D1
    MOVE.W  -(A0),D2
    RTS
TABLE:  DC.W    10,20,30

;=== sol-l1-e1
    ORG $1000
START:
    MOVE.B #$2A,D0

;=== sol-l1-e2
    ORG $1000
START:
    MOVE.W #$1234,D1
    MOVE.W D1,D2

;=== sol-l1-e3
    ORG $1000
START:
    MOVEQ #-5,D3

;=== sol-l1-e4
    ORG $1000
START:
    MOVE.W #$1234,$2000
    MOVE.W $2000,D4

;=== sol-l1-e5
    ORG $1000
START:
    LEA $3000,A0
    MOVE.W #$ABCD,(A0)
    MOVE.W (A0),D5

;=== sol-l1-e6
    ORG $1000
START:
    LEA $4000,A0
    MOVE.W #$000A,(A0)+
    MOVE.W #$0014,(A0)+
    LEA $4000,A0
    MOVE.W (A0)+,D6
    ADD.W (A0),D6

;=== copie-entete
; Copy the two long words of SOURCE to address $3000
START:

;=== copie-pied
SOURCE: DC.L    $CAFE,$BABE

;=== arith-exemple
START:
    MOVE.L  #47,D0
    DIVU    #5,D0           ; 47 / 5
    MOVE.L  D0,D1
    SWAP    D1              ; swap the two words of D1
    MOVE.W  #-3,D2
    EXT.L   D2              ; sign-extend the word to 32 bits
    MULS    #10,D2          ; -3 x 10, signed
    RTS

;=== arith-prediction
START:
    MOVE.W  #$FFFF,D0
    MOVE.W  D0,D1
    MULU    #2,D0
    MULS    #2,D1
    RTS

;=== sol-l2-e1
    ORG $1000
START:
    MOVE.W  #$1234,$2000
    MOVE.W  #$0111,$2002
    MOVE.W  $2000,D0
    ADD.W   $2002,D0
    MOVE.W  D0,$2004

;=== sol-l2-e2
    ORG $1000
START:
    MOVE.W  #9,D2
    MULU.W  #6,D2

;=== sol-l2-e5
    ORG $1000
START:
    MOVE.L  #5,D0
    NEG.L   D0
    NOT.L   D0

;=== moyenne-depart
; D0 = integer average of D1, D2 and D3
START:
    MOVE.L  #12,D1
    MOVE.L  #7,D2
    MOVE.L  #20,D3

    RTS

;=== moyenne-solution
START:
    MOVE.L  #12,D1
    MOVE.L  #7,D2
    MOVE.L  #20,D3
    MOVE.L  D1,D0
    ADD.L   D2,D0
    ADD.L   D3,D0           ; D0 = 39
    DIVU    #3,D0           ; quotient 13 in the low word, remainder 0 in the high word
    AND.L   #$FFFF,D0       ; keep only the quotient
    RTS

;=== logique-exemple
START:
    MOVE.B  #%10110110,D0
    AND.B   #%00001111,D0   ; keep the 4 low bits
    OR.B    #%10000000,D0   ; force bit 7 to 1
    EOR.B   #%00000001,D0   ; flip bit 0
    MOVE.W  #3,D1
    LSL.W   #4,D1           ; shift left by 4
    ASR.W   #1,D1           ; shift right by 1 (signed)
    BSET    #0,D1           ; set bit 0 to 1
    RTS

;=== logique-prediction
START:
    MOVE.W  #-8,D0
    MOVE.W  D0,D1
    LSR.W   #1,D0
    ASR.W   #1,D1
    RTS

;=== sol-l2-e3
    ORG $1000
START:
    MOVE.W  #$F0F0,D0
    AND.W   #$0FF0,D0
    OR.W    #$000F,D0
    EOR.W   #$FFFF,D0

;=== sol-l2-e4
    ORG $1000
START:
    MOVE.W  #3,D0
    ASL.W   #4,D0
    LSR.W   #1,D0

;=== fois10-depart
; D0 = 7 x 10, with shifts and additions (no MULU)
START:
    MOVE.W  #7,D0

    RTS

;=== fois10-solution
START:
    MOVE.W  #7,D0
    MOVE.W  D0,D1
    LSL.W   #3,D0           ; D0 = 7 x 8
    ADD.W   D1,D1           ; D1 = 7 x 2
    ADD.W   D1,D0           ; D0 = 7 x 8 + 7 x 2 = 70
    RTS

;=== branchements-exemple
START:
    MOVE.W  #-5,D1
    MOVE.W  #3,D2
    CMP.W   D2,D1           ; compute D1 - D2, keep only the flags
    BGT     D1PLUSGRAND     ; jump if D1 > D2 (signed comparison)
    MOVE.W  D2,D0           ; else: D0 = D2
    BRA     FIN
D1PLUSGRAND:
    MOVE.W  D1,D0
FIN:
    RTS

;=== signe-moins5
START:
    MOVE.B  #-5,D1
    MOVEQ   #0,D0
    TST.B   D1
    BEQ     ZERO
    BMI     NEGATIF
    MOVE.L  #100,D0
    BRA     FIN
NEGATIF:
    MOVE.L  #200,D0
    BRA     FIN
ZERO:
    MOVE.L  #300,D0
FIN:
    RTS

;=== signe-zero
START:
    MOVE.B  #0,D1
    MOVEQ   #0,D0
    TST.B   D1
    BEQ     ZERO
    BMI     NEGATIF
    MOVE.L  #100,D0
    BRA     FIN
NEGATIF:
    MOVE.L  #200,D0
    BRA     FIN
ZERO:
    MOVE.L  #300,D0
FIN:
    RTS

;=== signe-200
START:
    MOVE.B  #200,D1
    MOVEQ   #0,D0
    TST.B   D1
    BEQ     ZERO
    BMI     NEGATIF
    MOVE.L  #100,D0
    BRA     FIN
NEGATIF:
    MOVE.L  #200,D0
    BRA     FIN
ZERO:
    MOVE.L  #300,D0
FIN:
    RTS

;=== sol-l3-e1
    ORG $1000
START:
    MOVE.L  #$FFFFFFF6,D1
    TST.L   D1
    BMI     NEGATIF
    MOVEQ   #0,D0
    BRA     FIN
NEGATIF:
    MOVEQ   #1,D0
FIN:

;=== sol-l3-e2
    ORG $1000
START:
    MOVE.L  #21,D1
    MOVE.L  #30,D2
    CMP.L   D1,D2
    BGT     D2GRAND
    MOVE.L  D1,D0
    BRA     FIN
D2GRAND:
    MOVE.L  D2,D0
FIN:

;=== sol-l3-e3
    ORG $1000
START:
    MOVE.L  #5,D3
    BTST    #0,D3
    BEQ     BITZERO
    MOVE.L  #$FF,D0
    BRA     FIN
BITZERO:
    MOVE.L  #0,D0
FIN:

;=== nonsigne-depart
; D1 and D2 are UNSIGNED bytes (from 0 to 255).
; Goal: D0 = the greater of the two.
START:
    MOVE.B  #200,D1
    MOVE.B  #100,D2
    CMP.B   D2,D1
    BGT     D1GRAND
    MOVE.B  D2,D0
    BRA     FIN
D1GRAND:
    MOVE.B  D1,D0
FIN:
    RTS

;=== nonsigne-solution
; D1 and D2 are UNSIGNED bytes (from 0 to 255).
; Goal: D0 = the greater of the two.
START:
    MOVE.B  #200,D1
    MOVE.B  #100,D2
    CMP.B   D2,D1
    BHI     D1GRAND
    MOVE.B  D2,D0
    BRA     FIN
D1GRAND:
    MOVE.B  D1,D0
FIN:
    RTS

;=== boucles-exemple
START:
    LEA     TEXTE,A0
    MOVEQ   #0,D0           ; character counter
BOUCLE:
    TST.B   (A0)+           ; zero character? (and A0 moves on)
    BEQ     FIN
    ADDQ.L  #1,D0
    BRA     BOUCLE
FIN:
    RTS
TEXTE:  DC.B    '[[atari:ATARI|amiga:AMIGA]]',0

;=== boucles-dbra
START:
    MOVEQ   #0,D1
    MOVEQ   #9,D0
BOUCLE:
    ADDQ.L  #1,D1
    DBRA    D0,BOUCLE
    RTS

;=== boucles-subq
START:
    MOVEQ   #0,D2
    MOVE.W  #3,D0
BOUCLE:
    ADDQ.L  #1,D2
    SUBQ.W  #1,D0
    BNE     BOUCLE
    RTS

;=== sol-l4-e1
    ORG $1000
START:
    MOVEQ   #0,D0
    MOVEQ   #1,D2
    MOVE.W  #4,D1
BOUCLE:
    ADD.W   D2,D0
    ADDQ.W  #1,D2
    DBRA    D1,BOUCLE

;=== sol-l4-e2
    ORG $1000
START:
    MOVE.W  #5,$5000
    MOVE.W  #-3,$5002
    MOVE.W  #0,$5004
    MOVE.W  #7,$5006
    LEA     $5000,A0
    MOVEQ   #0,D0
    MOVE.W  #3,D1
BOUCLE:
    MOVE.W  (A0)+,D2
    TST.W   D2
    BLE     PASPOSITIF
    ADDQ.W  #1,D0
PASPOSITIF:
    DBRA    D1,BOUCLE

;=== ordonner-boucle-entete
; Goal: D0 = 2 + 2 + 2 + 2 + 2 = 10
START:

;=== espaces-depart
; D0 = number of spaces in TEXTE
START:
    LEA     TEXTE,A0

    RTS
TEXTE:  DC.B    'IL ETAIT UNE FOIS',0

;=== espaces-solution
START:
    LEA     TEXTE,A0
    MOVEQ   #0,D0
BOUCLE:
    MOVE.B  (A0)+,D1
    BEQ     FIN
    CMP.B   #' ',D1
    BNE     BOUCLE
    ADDQ.L  #1,D0
    BRA     BOUCLE
FIN:
    RTS
TEXTE:  DC.B    'IL ETAIT UNE FOIS',0

;=== sousprog-exemple
START:
    MOVE.W  #7,D0
    BSR     CARRE           ; call the subroutine
    MOVE.W  D0,D3
    RTS

; CARRE: D0.L = D0.W x D0.W
; Changes no other register.
CARRE:
    MOVEM.L D1,-(SP)        ; save D1
    MOVE.W  D0,D1
    MULU    D1,D0
    MOVEM.L (SP)+,D1        ; restore D1
    RTS

;=== sousprog-prediction
START:
    MOVE.L  SP,D6
    BSR     SOUSPROG
    RTS
SOUSPROG:
    MOVE.L  SP,D7
    SUB.L   D7,D6           ; D6 = SP before the call - SP in the subroutine
    RTS

;=== sol-l5-e1
    ORG $1000
START:
    MOVEQ   #7,D0
    BSR     DOUBLE
    BRA     FIN
DOUBLE:
    ADD.W   D0,D0
    RTS
FIN:

;=== sol-l5-e2
    ORG $1000
START:
    MOVE.L  #$12345678,D1
    BSR     MODIFIE
    BRA     FIN
MODIFIE:
    MOVE.L  D1,-(SP)
    MOVEQ   #0,D1
    MOVE.L  (SP)+,D1
    RTS
FIN:

;=== sol-l5-e3
    ORG $1000
START:
    MOVE.W  #10,-(SP)
    MOVE.W  #20,-(SP)
    BSR     ADDITIONNE
    ADDA.L  #4,SP
    BRA     FIN
ADDITIONNE:
    MOVE.W  4(A7),D0
    ADD.W   6(A7),D0
    RTS
FIN:

;=== abs-depart
START:
    MOVE.L  #-42,D0
    BSR     VALABS
    MOVE.L  D0,D5           ; D5 = |-42| = 42
    RTS

; VALABS: D0.L = absolute value of D0.L
VALABS:

    RTS

;=== abs-solution
START:
    MOVE.L  #-42,D0
    BSR     VALABS
    MOVE.L  D0,D5
    RTS

VALABS:
    TST.L   D0
    BPL     POSITIF         ; already positive: nothing to do
    NEG.L   D0
POSITIF:
    RTS

;=== bilan-syntaxe-depart
; Goal: D0 = sum of the 4 words of TABLE = 100
START:
    LEA     TABLE,A0
    MOVEQ   #0,D0
    MOVE.W  #3,D1
BOUCLE:
    ADD.W   (A0+),D0
    DBRA    D1,BOUCL
    RTS
TABLE:  DC.W    10,20,30,40

;=== bilan-syntaxe-solution
START:
    LEA     TABLE,A0
    MOVEQ   #0,D0
    MOVE.W  #3,D1
BOUCLE:
    ADD.W   (A0)+,D0
    DBRA    D1,BOUCLE
    RTS
TABLE:  DC.W    10,20,30,40

;=== bilan-logique-depart
; Goal: D0 = sum of the 4 words of TABLE = 100
START:
    LEA     TABLE,A0
    MOVEQ   #0,D0
    MOVE.W  #4,D1           ; 4 values to add
BOUCLE:
    ADD.W   (A0)+,D0
    DBRA    D1,BOUCLE
    RTS
TABLE:  DC.W    10,20,30,40
AUTRE:  DC.W    1000

;=== bilan-logique-solution
START:
    LEA     TABLE,A0
    MOVEQ   #0,D0
    MOVE.W  #3,D1           ; DBRA makes N+1 iterations: 3 for 4 values
BOUCLE:
    ADD.W   (A0)+,D0
    DBRA    D1,BOUCLE
    RTS
TABLE:  DC.W    10,20,30,40
AUTRE:  DC.W    1000

;=== bilan-max-depart
; D0.W = the largest (signed) value of TABLE, which holds 6 words
START:

    RTS
TABLE:  DC.W    12,-7,45,3,45,-100

;=== bilan-max-solution
START:
    LEA     TABLE,A0
    MOVE.W  (A0)+,D0        ; the first one is the provisional maximum
    MOVE.W  #4,D1           ; 5 values left: 4 + 1 iterations
BOUCLE:
    MOVE.W  (A0)+,D2
    CMP.W   D0,D2
    BLE     SUIVANT         ; D2 <= D0: nothing to do
    MOVE.W  D2,D0
SUIVANT:
    DBRA    D1,BOUCLE
    RTS
TABLE:  DC.W    12,-7,45,3,45,-100

;=== qcm-cmp
    MOVE.W  #5,D1
    CMP.W   #9,D1
    ; which instruction jumps?

;=== qcm-dbra
    MOVEQ   #0,D1
    MOVE.W  #4,D0
BOUCLE:
    ADDQ.W  #1,D1
    DBRA    D0,BOUCLE

;=== bonus-bits-depart
; D0 = number of bits at 1 in the word D1
START:
    MOVE.W  #$F0F1,D1

    RTS

;=== bonus-bits-solution
START:
    MOVE.W  #$F0F1,D1
    MOVEQ   #0,D0
    MOVE.W  #15,D2          ; 16 bits to examine
BOUCLE:
    LSR.W   #1,D1           ; the bit shifted out goes into C
    BCC     ZERO
    ADDQ.W  #1,D0
ZERO:
    DBRA    D2,BOUCLE
    RTS

;=== bonus-fibo-depart
; D0 = F(20), the 20th term of the Fibonacci sequence
; (F(1) = 1, F(2) = 1, then each term is the sum of the two before it)
START:

    RTS

;=== bonus-fibo-solution
START:
    MOVEQ   #0,D1           ; F(0)
    MOVEQ   #1,D0           ; F(1)
    MOVE.W  #18,D2          ; 19 iterations to go from F(1) to F(20)
BOUCLE:
    MOVE.L  D0,D3
    ADD.L   D1,D0           ; next term
    MOVE.L  D3,D1
    DBRA    D2,BOUCLE
    RTS

;=== l5e2-depart
    ORG $1000
START:
    MOVE.L  #$12345678,D1
    BSR     MODIFIE
    BRA     FIN
MODIFIE:
    ; save D1 here
    MOVEQ   #0,D1           ; the subroutine uses D1 for its calculations
    ; restore D1 here
    RTS
FIN:
;=== l3-e1-depart-amiga
    ORG $1000
START:
    MOVEQ   #0,D0           ; at startup, the Amiga puts the length of the command line in D0
    MOVE.L  #$FFFFFFF6,D1

;=== rappel
START:
    MOVE.L  #$11223344,D0
    MOVE.W  #$FFFF,D0
    ADDQ.W  #1,D0
    RTS
