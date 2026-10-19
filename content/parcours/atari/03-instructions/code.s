; Codes du chapitre 3 « Jeu d'instructions de base ».
; Chaque bloc « ;=== nom » est référencé dans chapitre.json par « @code.s#nom ».
; Les solutions des exercices repris de la version 0.1 (ref general-…) sont celles de leurs tests.

;=== adressage-exemple
START:
    LEA     SOURCE,A0       ; A0 = adresse de la table
    LEA     $3000,A1        ; A1 = adresse de destination
    MOVE.W  (A0)+,(A1)+     ; copie le 1er mot, puis A0 et A1 avancent de 2
    MOVE.W  (A0)+,(A1)+     ; copie le 2e mot
    MOVE.W  2(A0),D0        ; lit le mot situé 2 octets après A0
    LEA     SOURCE,A2
    MOVEQ   #4,D1           ; indice en octets
    MOVE.W  0(A2,D1.W),D2   ; lit le mot en SOURCE + D1
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
; Copie les deux mots longs de SOURCE à l'adresse $3000
START:

;=== copie-pied
SOURCE: DC.L    $CAFE,$BABE

;=== arith-exemple
START:
    MOVE.L  #47,D0
    DIVU    #5,D0           ; 47 / 5
    MOVE.L  D0,D1
    SWAP    D1              ; échange les deux mots de D1
    MOVE.W  #-3,D2
    EXT.L   D2              ; étend le signe du mot sur 32 bits
    MULS    #10,D2          ; -3 x 10, en signé
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
; D0 = moyenne entière de D1, D2 et D3
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
    DIVU    #3,D0           ; quotient 13 dans le mot faible, reste 0 dans le mot fort
    AND.L   #$FFFF,D0       ; on ne garde que le quotient
    RTS

;=== logique-exemple
START:
    MOVE.B  #%10110110,D0
    AND.B   #%00001111,D0   ; garde les 4 bits faibles
    OR.B    #%10000000,D0   ; force le bit 7 à 1
    EOR.B   #%00000001,D0   ; inverse le bit 0
    MOVE.W  #3,D1
    LSL.W   #4,D1           ; décale de 4 vers la gauche
    ASR.W   #1,D1           ; décale de 1 vers la droite (signé)
    BSET    #0,D1           ; met le bit 0 à 1
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
; D0 = 7 x 10, avec des décalages et des additions (pas de MULU)
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
    CMP.W   D2,D1           ; calcule D1 - D2, ne garde que les flags
    BGT     D1PLUSGRAND     ; saute si D1 > D2 (comparaison signée)
    MOVE.W  D2,D0           ; sinon : D0 = D2
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
; D1 et D2 sont des octets NON signés (de 0 à 255).
; Objectif : D0 = le plus grand des deux.
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
; D1 et D2 sont des octets NON signés (de 0 à 255).
; Objectif : D0 = le plus grand des deux.
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
    MOVEQ   #0,D0           ; compteur de caractères
BOUCLE:
    TST.B   (A0)+           ; caractère nul ? (et A0 avance)
    BEQ     FIN
    ADDQ.L  #1,D0
    BRA     BOUCLE
FIN:
    RTS
TEXTE:  DC.B    'ATARI',0

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
; Objectif : D0 = 2 + 2 + 2 + 2 + 2 = 10
START:

;=== espaces-depart
; D0 = nombre d'espaces dans TEXTE
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
    BSR     CARRE           ; appelle le sous-programme
    MOVE.W  D0,D3
    RTS

; CARRE : D0.L = D0.W x D0.W
; Ne modifie aucun autre registre.
CARRE:
    MOVEM.L D1,-(SP)        ; sauvegarde D1
    MOVE.W  D0,D1
    MULU    D1,D0
    MOVEM.L (SP)+,D1        ; restaure D1
    RTS

;=== sousprog-prediction
START:
    MOVE.L  SP,D6
    BSR     SOUSPROG
    RTS
SOUSPROG:
    MOVE.L  SP,D7
    SUB.L   D7,D6           ; D6 = SP avant l'appel - SP dans le sous-programme
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

; VALABS : D0.L = valeur absolue de D0.L
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
    BPL     POSITIF         ; déjà positif : rien à faire
    NEG.L   D0
POSITIF:
    RTS

;=== bilan-syntaxe-depart
; Objectif : D0 = somme des 4 mots de TABLE = 100
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
; Objectif : D0 = somme des 4 mots de TABLE = 100
START:
    LEA     TABLE,A0
    MOVEQ   #0,D0
    MOVE.W  #4,D1           ; 4 valeurs à additionner
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
    MOVE.W  #3,D1           ; DBRA fait N+1 tours : 3 pour 4 valeurs
BOUCLE:
    ADD.W   (A0)+,D0
    DBRA    D1,BOUCLE
    RTS
TABLE:  DC.W    10,20,30,40
AUTRE:  DC.W    1000

;=== bilan-max-depart
; D0.W = la plus grande valeur (signée) de TABLE, qui contient 6 mots
START:

    RTS
TABLE:  DC.W    12,-7,45,3,45,-100

;=== bilan-max-solution
START:
    LEA     TABLE,A0
    MOVE.W  (A0)+,D0        ; le premier est le maximum provisoire
    MOVE.W  #4,D1           ; 5 valeurs restantes : 4 + 1 tours
BOUCLE:
    MOVE.W  (A0)+,D2
    CMP.W   D0,D2
    BLE     SUIVANT         ; D2 <= D0 : rien à faire
    MOVE.W  D2,D0
SUIVANT:
    DBRA    D1,BOUCLE
    RTS
TABLE:  DC.W    12,-7,45,3,45,-100

;=== qcm-cmp
    MOVE.W  #5,D1
    CMP.W   #9,D1
    ; quelle instruction saute ?

;=== qcm-dbra
    MOVEQ   #0,D1
    MOVE.W  #4,D0
BOUCLE:
    ADDQ.W  #1,D1
    DBRA    D0,BOUCLE

;=== bonus-bits-depart
; D0 = nombre de bits à 1 dans le mot D1
START:
    MOVE.W  #$F0F1,D1

    RTS

;=== bonus-bits-solution
START:
    MOVE.W  #$F0F1,D1
    MOVEQ   #0,D0
    MOVE.W  #15,D2          ; 16 bits à examiner
BOUCLE:
    LSR.W   #1,D1           ; le bit qui sort va dans C
    BCC     ZERO
    ADDQ.W  #1,D0
ZERO:
    DBRA    D2,BOUCLE
    RTS

;=== bonus-fibo-depart
; D0 = F(20), le 20e terme de la suite de Fibonacci
; (F(1) = 1, F(2) = 1, puis chaque terme est la somme des deux précédents)
START:

    RTS

;=== bonus-fibo-solution
START:
    MOVEQ   #0,D1           ; F(0)
    MOVEQ   #1,D0           ; F(1)
    MOVE.W  #18,D2          ; 19 tours pour aller de F(1) à F(20)
BOUCLE:
    MOVE.L  D0,D3
    ADD.L   D1,D0           ; terme suivant
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
    ; sauvegarde D1 ici
    MOVEQ   #0,D1           ; le sous-programme se sert de D1 pour ses calculs
    ; restaure D1 ici
    RTS
FIN:
