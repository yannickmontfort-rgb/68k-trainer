; Codes du chapitre 1 « Démarrer ».
; Chaque bloc commence par une ligne « ;=== nom » et est référencé dans chapitre.json par
; « @code.s#nom ». Tous les blocs sont assemblés et exécutés par tests/contenu-parcours.test.ts.

;=== premier
; Mon premier programme
START:
    MOVE.W  #5,D0       ; D0 reçoit 5
    MOVE.W  #3,D1       ; D1 reçoit 3
    ADD.W   D1,D0       ; D0 = D0 + D1
    RTS                 ; retour au TOS

;=== predire-sub
START:
    MOVE.W  #10,D0
    MOVE.W  #4,D1
    SUB.W   D1,D0
    RTS

;=== completer-depart
START:
    MOVE.W  #0,D0       ; <- remplace 0 par la bonne valeur
    ADD.W   #2,D0
    RTS

;=== completer-solution
START:
    MOVE.W  #7,D0
    ADD.W   #2,D0
    RTS

;=== ordonner-entete
; Objectif : D2 = (6 + 2) x 5 = 40
START:

;=== ecrire-depart
; Place 100 dans D1, 25 dans D2, puis D1 - D2 dans D1
START:

    RTS

;=== ecrire-solution
START:
    MOVE.W  #100,D1
    MOVE.W  #25,D2
    SUB.W   D2,D1
    RTS

;=== autonome-depart
; D0 = 3 x (4 + 5), sans instruction de multiplication
START:

    RTS

;=== autonome-solution
START:
    MOVE.W  #4,D0
    ADD.W   #5,D0       ; D0 = 9
    MOVE.W  D0,D1       ; on garde 9 dans D1
    ADD.W   D1,D0       ; D0 = 18
    ADD.W   D1,D0       ; D0 = 27
    RTS

;=== bug-logique
; Objectif : D0 = 2 x (3 + 4) = 14
START:
    MOVE.W  #3,D0
    ADD.W   #4,D0       ; D0 = 7
    MOVE.W  D0,D1       ; copie de D0 dans D1
    ADD.W   D1,D1       ; on double... mais quel registre ?
    RTS

;=== corriger-syntaxe-depart
; Objectif : D2 = 5 + 7 = 12
START:
    MOVE.W  #5,D2
    ADDD.W  #7,D2
    RTS

;=== corriger-syntaxe-solution
; Objectif : D2 = 5 + 7 = 12
START:
    MOVE.W  #5,D2
    ADD.W   #7,D2
    RTS

;=== corriger-logique-depart
; Objectif : D3 = 10 + 20 = 30
START:
    MOVE.W  #10,D3
    MOVE.W  #20,D4
    ADD.W   D3,D4
    RTS

;=== corriger-logique-solution
; Objectif : D3 = 10 + 20 = 30
START:
    MOVE.W  #10,D3
    MOVE.W  #20,D4
    ADD.W   D4,D3
    RTS

;=== corriger-diese-depart
; Objectif : D5 = $1000 + 1 = $1001
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
; Peins le fond de l'écran en rouge
START:

    RTS

;=== bonus-fond-solution
START:
    MOVE.W  #$700,$FF8240   ; couleur 0 (le fond) = rouge
    RTS
