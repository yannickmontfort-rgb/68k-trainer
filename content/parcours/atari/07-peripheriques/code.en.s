; Code for chapter 7, "Keyboard, joystick and sound" (user mode).

;=== touches-exemple
START:
.attente:
    MOVE.W  #8,-(SP)        ; Cnecin: wait for a key, without echo
    TRAP    #1
    ADDQ.L  #2,SP
    CMP.B   #$1B,D0         ; ASCII code of Esc?
    BEQ.S   QUITTER
    SWAP    D0              ; the scancode moves into the low word
    CMP.B   #$50,D0         ; down arrow?
    BEQ.S   BAS
    BRA.S   .attente        ; any other key: start again
BAS:
    PEA     TEXTE(PC)       ; Cconws: display "bas"
    MOVE.W  #9,-(SP)
    TRAP    #1
    ADDQ.L  #6,SP
    BRA.S   START
QUITTER:
    CLR.W   -(SP)
    TRAP    #1

TEXTE:
    DC.B    'bas ',0

;=== cnecin-prediction
START:
    MOVE.W  #8,-(SP)        ; Cnecin
    TRAP    #1
    ADDQ.L  #2,SP
    MOVE.L  D0,D1
    SWAP    D1
    CLR.W   -(SP)
    TRAP    #1

;=== echap-depart
; The program counts in D7 the keys typed BEFORE Esc, then stops.
; Fill in the Esc test.
START:
    MOVEQ   #0,D7
.attente:
    MOVE.W  #8,-(SP)        ; Cnecin
    TRAP    #1
    ADDQ.L  #2,SP
    ; if the key is Esc (ASCII code $1B), go to FIN

    ADDQ.W  #1,D7
    BRA.S   .attente
FIN:
    CLR.W   -(SP)
    TRAP    #1

;=== echap-solution
START:
    MOVEQ   #0,D7
.attente:
    MOVE.W  #8,-(SP)
    TRAP    #1
    ADDQ.L  #2,SP
    CMP.B   #$1B,D0         ; Esc?
    BEQ.S   FIN
    ADDQ.W  #1,D7
    BRA.S   .attente
FIN:
    CLR.W   -(SP)
    TRAP    #1

;=== hautbas-depart
; Display "H" for the up arrow, "B" for the down arrow; ignore the other
; keys; Esc ends the program.
START:

    CLR.W   -(SP)
    TRAP    #1

;=== hautbas-solution
START:
.attente:
    MOVE.W  #8,-(SP)        ; Cnecin
    TRAP    #1
    ADDQ.L  #2,SP
    CMP.B   #$1B,D0         ; Esc: end
    BEQ.S   FIN
    SWAP    D0              ; scancode
    MOVEQ   #'H',D1
    CMP.B   #$48,D0         ; up arrow
    BEQ.S   AFFICHER
    MOVEQ   #'B',D1
    CMP.B   #$50,D0         ; down arrow
    BEQ.S   AFFICHER
    BRA.S   .attente
AFFICHER:
    MOVE.W  D1,-(SP)        ; Cconout(character)
    MOVE.W  #2,-(SP)
    TRAP    #1
    ADDQ.L  #4,SP
    BRA.S   START
FIN:
    CLR.W   -(SP)
    TRAP    #1

;=== swap-depart
; The program should display "B" at each down arrow, and stop on Esc.
; It never reacts to the down arrow: why?
START:
.attente:
    MOVE.W  #8,-(SP)        ; Cnecin
    TRAP    #1
    ADDQ.L  #2,SP
    CMP.B   #$1B,D0         ; Esc?
    BEQ.S   FIN
    CMP.B   #$50,D0         ; down arrow?
    BNE.S   .attente
    MOVE.W  #'B',-(SP)      ; Cconout
    MOVE.W  #2,-(SP)
    TRAP    #1
    ADDQ.L  #4,SP
    BRA.S   .attente
FIN:
    CLR.W   -(SP)
    TRAP    #1

;=== swap-solution
START:
.attente:
    MOVE.W  #8,-(SP)
    TRAP    #1
    ADDQ.L  #2,SP
    CMP.B   #$1B,D0
    BEQ.S   FIN
    SWAP    D0              ; the scancode is in the high word: bring it down
    CMP.B   #$50,D0
    BNE.S   .attente
    MOVE.W  #'B',-(SP)
    MOVE.W  #2,-(SP)
    TRAP    #1
    ADDQ.L  #4,SP
    BRA.S   .attente
FIN:
    CLR.W   -(SP)
    TRAP    #1

;=== joy-exemple
START:
    MOVE.W  #34,-(SP)       ; XBIOS 34: Kbdvbase
    TRAP    #14
    ADDQ.L  #2,SP
    MOVEA.L D0,A0           ; A0 = table of keyboard vectors
    MOVE.L  24(A0),ANCIEN   ; keep the old joystick vector (offset 24)
    MOVE.L  #JOY,24(A0)     ; and install ours
.attente:
    MOVE.W  #37,-(SP)       ; Vsync
    TRAP    #14
    ADDQ.L  #2,SP
    BTST    #7,ETAT         ; fire button pressed?
    BEQ.S   .attente
    MOVE.W  #34,-(SP)       ; before quitting: put the old vector back
    TRAP    #14
    ADDQ.L  #2,SP
    MOVEA.L D0,A0
    MOVE.L  ANCIEN,24(A0)
    CLR.W   -(SP)
    TRAP    #1

; JOY: called by TOS for each joystick packet, A0 = the packet
JOY:
    MOVE.B  2(A0),ETAT      ; state of joystick 1 (the "joystick" port)
    RTS

ANCIEN: DC.L    0
ETAT:   DC.B    0

;=== joyetat-prediction
START:
    MOVE.B  #$89,D0         ; a state received from the joystick
    MOVEQ   #0,D1
    BTST    #7,D0           ; fire button?
    BEQ.S   .pasfeu
    MOVEQ   #1,D1
.pasfeu:
    AND.B   #$0F,D0         ; keep only the 4 directions
    CLR.W   -(SP)
    TRAP    #1

;=== brancher-depart
; The program should wait for the joystick fire button, then display "Feu !".
; The JOY routine is ready, but one line is missing: which one?
START:
    MOVE.W  #34,-(SP)       ; Kbdvbase
    TRAP    #14
    ADDQ.L  #2,SP
    MOVEA.L D0,A0
    MOVE.L  24(A0),ANCIEN   ; old joystick vector
    ; a line is missing here

.attente:
    MOVE.W  #37,-(SP)       ; Vsync
    TRAP    #14
    ADDQ.L  #2,SP
    BTST    #7,ETAT
    BEQ.S   .attente
    MOVE.W  #34,-(SP)
    TRAP    #14
    ADDQ.L  #2,SP
    MOVEA.L D0,A0
    MOVE.L  ANCIEN,24(A0)   ; old vector put back
    PEA     FEU(PC)         ; Cconws
    MOVE.W  #9,-(SP)
    TRAP    #1
    ADDQ.L  #6,SP
    CLR.W   -(SP)
    TRAP    #1

JOY:
    MOVE.B  2(A0),ETAT
    RTS

ANCIEN: DC.L    0
ETAT:   DC.B    0
FEU:    DC.B    'Feu !',0

;=== brancher-solution
START:
    MOVE.W  #34,-(SP)
    TRAP    #14
    ADDQ.L  #2,SP
    MOVEA.L D0,A0
    MOVE.L  24(A0),ANCIEN
    MOVE.L  #JOY,24(A0)     ; our routine receives the joystick packets
.attente:
    MOVE.W  #37,-(SP)
    TRAP    #14
    ADDQ.L  #2,SP
    BTST    #7,ETAT
    BEQ.S   .attente
    MOVE.W  #34,-(SP)
    TRAP    #14
    ADDQ.L  #2,SP
    MOVEA.L D0,A0
    MOVE.L  ANCIEN,24(A0)
    PEA     FEU(PC)
    MOVE.W  #9,-(SP)
    TRAP    #1
    ADDQ.L  #6,SP
    CLR.W   -(SP)
    TRAP    #1

JOY:
    MOVE.B  2(A0),ETAT
    RTS

ANCIEN: DC.L    0
ETAT:   DC.B    0
FEU:    DC.B    'Feu !',0

;=== routine74-depart
; Routine 7.4 of the manual: wait for the fire button of the joystick plugged into
; the "joystick" port (joystick 1), then quit. The program never stops...
; and it has a second, sneakier flaw. Fix both.
START:
    BSR     INIT_JOYSTICK
.attente:
    MOVE.W  #37,-(SP)       ; Vsync
    TRAP    #14
    ADDQ.L  #2,SP
    BTST    #7,JOY_PORT1    ; button of joystick 1?
    BEQ.S   .attente
    CLR.W   -(SP)
    TRAP    #1

; INIT_JOYSTICK: enable the IKBD joystick vector
INIT_JOYSTICK:
    MOVE.W  #34,-(SP)       ; XBIOS 34: Kbdvbase
    TRAP    #14
    ADDQ.L  #2,SP
    MOVE.L  D0,A0           ; A0 = table of keyboard vectors
    MOVE.L  24(A0),OLD_JOY  ; save the old vector (offset 24)
    MOVE.L  #JOY_HANDLER,24(A0)
    RTS

JOY_HANDLER:
    MOVE.B  1(A0),JOY_PORT1 ; "state of joystick 1 (main port)"
    MOVE.B  2(A0),JOY_PORT0 ; "state of joystick 0 (mouse port)"
    RTS

OLD_JOY:   DC.L 0
JOY_PORT0: DC.B 0
JOY_PORT1: DC.B 0

;=== routine74-solution
START:
    BSR     INIT_JOYSTICK
.attente:
    MOVE.W  #37,-(SP)
    TRAP    #14
    ADDQ.L  #2,SP
    BTST    #7,JOY_PORT1
    BEQ.S   .attente
    BSR     FIN_JOYSTICK    ; give TOS its vector back before quitting
    CLR.W   -(SP)
    TRAP    #1

INIT_JOYSTICK:
    MOVE.W  #34,-(SP)
    TRAP    #14
    ADDQ.L  #2,SP
    MOVE.L  D0,A0
    MOVE.L  24(A0),OLD_JOY
    MOVE.L  #JOY_HANDLER,24(A0)
    RTS

FIN_JOYSTICK:
    MOVE.W  #34,-(SP)
    TRAP    #14
    ADDQ.L  #2,SP
    MOVE.L  D0,A0
    MOVE.L  OLD_JOY,24(A0)
    RTS

JOY_HANDLER:
    MOVE.B  1(A0),JOY_PORT0 ; 1(A0): joystick 0 (mouse port)
    MOVE.B  2(A0),JOY_PORT1 ; 2(A0): joystick 1 (joystick port)
    RTS

OLD_JOY:   DC.L 0
JOY_PORT0: DC.B 0
JOY_PORT1: DC.B 0

;=== la-exemple
START:
    PEA     JOUER(PC)       ; Supexec: the YM2149 is hardware (supervisor)
    MOVE.W  #38,-(SP)
    TRAP    #14
    ADDQ.L  #6,SP
    MOVEQ   #49,D7          ; one second: 50 frames
.attente:
    MOVE.W  #37,-(SP)       ; Vsync
    TRAP    #14
    ADDQ.L  #2,SP
    DBF     D7,.attente
    PEA     SILENCE(PC)
    MOVE.W  #38,-(SP)
    TRAP    #14
    ADDQ.L  #6,SP
    CLR.W   -(SP)
    TRAP    #1

JOUER:
    LEA     $FFFF8800.W,A0  ; (A0): register select; 2(A0): its value
    MOVE.B  #0,(A0)         ; register 0: period of channel A, low byte
    MOVE.B  #$1C,2(A0)
    MOVE.B  #1,(A0)         ; register 1: high byte -> period $11C = 284
    MOVE.B  #$01,2(A0)
    MOVE.B  #7,(A0)         ; register 7: the mixer
    MOVE.B  #%11111110,2(A0) ; only the square wave of channel A is on (0 = on)
    MOVE.B  #8,(A0)         ; register 8: volume of channel A
    MOVE.B  #15,2(A0)       ; at maximum
    RTS

SILENCE:
    MOVE.B  #8,$FFFF8800.W  ; volume of channel A...
    MOVE.B  #0,$FFFF8802.W  ; ... to 0
    RTS

;=== frequence-prediction
START:
    MOVE.L  #2000000,D0     ; YM2149 clock: 2 MHz
    DIVU    #16*568,D0      ; frequency = 2 MHz / (16 x period)
    CLR.W   -(SP)
    TRAP    #1

;=== mixeur-depart
; Channel B should play an A (period 284) at maximum volume, as a square wave
; and without noise. Nothing can be heard: fix the mixer value.
START:
    PEA     JOUER(PC)       ; Supexec
    MOVE.W  #38,-(SP)
    TRAP    #14
    ADDQ.L  #6,SP
    CLR.W   -(SP)
    TRAP    #1

JOUER:
    LEA     $FFFF8800.W,A0
    MOVE.B  #2,(A0)         ; period of channel B
    MOVE.B  #$1C,2(A0)
    MOVE.B  #3,(A0)
    MOVE.B  #$01,2(A0)
    MOVE.B  #9,(A0)         ; volume of channel B
    MOVE.B  #15,2(A0)
    MOVE.B  #7,(A0)         ; mixer
    MOVE.B  #%11111111,2(A0)
    RTS

;=== mixeur-solution
START:
    PEA     JOUER(PC)
    MOVE.W  #38,-(SP)
    TRAP    #14
    ADDQ.L  #6,SP
    CLR.W   -(SP)
    TRAP    #1

JOUER:
    LEA     $FFFF8800.W,A0
    MOVE.B  #2,(A0)
    MOVE.B  #$1C,2(A0)
    MOVE.B  #3,(A0)
    MOVE.B  #$01,2(A0)
    MOVE.B  #9,(A0)
    MOVE.B  #15,2(A0)
    MOVE.B  #7,(A0)
    MOVE.B  #%11111101,2(A0) ; bit 1 at 0: square wave of channel B on
    RTS

;=== accord-depart
; Play an A major chord: channel A = A (period 284), channel B = C# (225),
; channel C = E (190), all three at volume 12, square waves only (no noise).
START:
    PEA     ACCORD(PC)      ; Supexec
    MOVE.W  #38,-(SP)
    TRAP    #14
    ADDQ.L  #6,SP
    CLR.W   -(SP)
    TRAP    #1

ACCORD:

    RTS

;=== accord-solution
START:
    PEA     ACCORD(PC)
    MOVE.W  #38,-(SP)
    TRAP    #14
    ADDQ.L  #6,SP
    CLR.W   -(SP)
    TRAP    #1

ACCORD:
    MOVE.L  #$00001C00,$FFFF8800.W ; register 0 = $1C (in a single MOVE.L: select + value)
    MOVE.L  #$01000100,$FFFF8800.W ; register 1 = $01  -> channel A: 284
    MOVE.L  #$0200E100,$FFFF8800.W ; register 2 = $E1
    MOVE.L  #$03000000,$FFFF8800.W ; register 3 = 0    -> channel B: 225
    MOVE.L  #$0400BE00,$FFFF8800.W ; register 4 = $BE
    MOVE.L  #$05000000,$FFFF8800.W ; register 5 = 0    -> channel C: 190
    MOVE.L  #$0700F800,$FFFF8800.W ; mixer: %11111000, 3 square waves
    MOVE.L  #$08000C00,$FFFF8800.W ; volumes at 12
    MOVE.L  #$09000C00,$FFFF8800.W
    MOVE.L  #$0A000C00,$FFFF8800.W
    RTS

;=== melodie-depart
; Play the 4 notes of NOTES (periods of channel A), 10 frames each, from a
; routine placed in the queue of VBL routines (_vblqueue, at $456). After the 4th note,
; the routine cuts the sound (volume 0) and sets FINI to -1; the main program waits for
; FINI, removes the routine from the queue and quits.
START:

    CLR.W   -(SP)
    TRAP    #1

NOTES:   DC.W    284,253,225,213    ; A, B, C#, D
RANG:    DC.W    0                  ; number of the next note
ATTENTE: DC.W    0                  ; frames left for the current note
FINI:    DC.B    0

;=== melodie-solution
START:
    PEA     INSTALLER(PC)   ; $456 is protected: Supexec
    MOVE.W  #38,-(SP)
    TRAP    #14
    ADDQ.L  #6,SP
.attente:
    MOVE.W  #37,-(SP)       ; Vsync
    TRAP    #14
    ADDQ.L  #2,SP
    TST.B   FINI
    BEQ.S   .attente
    PEA     RETIRER(PC)
    MOVE.W  #38,-(SP)
    TRAP    #14
    ADDQ.L  #6,SP
    CLR.W   -(SP)
    TRAP    #1

INSTALLER:
    MOVE.B  #7,$FFFF8800.W
    MOVE.B  #%11111110,$FFFF8802.W ; channel A: square wave only
    MOVEA.L $456.W,A0       ; _vblqueue: address of the queue
    MOVE.L  #MELODIE,(A0)   ; 1st slot of the queue (empty at the start)
    RTS

RETIRER:
    MOVEA.L $456.W,A0
    CLR.L   (A0)
    RTS

; MELODIE: called by TOS at each VBL, in supervisor mode
MELODIE:
    TST.B   FINI
    BNE.S   .fin
    SUBQ.W  #1,ATTENTE
    BGT.S   .fin            ; the current note goes on
    MOVE.W  #10,ATTENTE
    MOVE.W  RANG,D0
    CMP.W   #4,D0
    BEQ.S   .stop
    ADD.W   D0,D0           ; table of words: rank x 2
    LEA     NOTES,A0
    MOVE.W  0(A0,D0.W),D1   ; period of the note
    LEA     $FFFF8800.W,A1
    MOVE.B  #0,(A1)
    MOVE.B  D1,2(A1)        ; low byte
    LSR.W   #8,D1
    MOVE.B  #1,(A1)
    MOVE.B  D1,2(A1)        ; high byte
    MOVE.B  #8,(A1)
    MOVE.B  #15,2(A1)       ; volume
    ADDQ.W  #1,RANG
.fin:
    RTS
.stop:
    MOVE.B  #8,$FFFF8800.W
    MOVE.B  #0,$FFFF8802.W  ; silence
    ST      FINI
    RTS

NOTES:   DC.W    284,253,225,213
RANG:    DC.W    0
ATTENTE: DC.W    0
FINI:    DC.B    0

;=== bip-depart
; Challenge: move the square (16 x 16, color 1, lines 92 to 107, starting at X = 0) with the
; joystick: 2 pixels per frame to the left or right, without leaving the screen
; (X between 0 and 304). Make a "beep" when it hits an edge. The fire button quits.
START:

    CLR.W   -(SP)
    TRAP    #1

;=== bip-solution
START:
    MOVE.W  #2,-(SP)        ; Physbase
    TRAP    #14
    ADDQ.L  #2,SP
    MOVEA.L D0,A6
    LEA     92*160(A6),A6   ; band of the square
    MOVE.W  #34,-(SP)       ; Kbdvbase
    TRAP    #14
    ADDQ.L  #2,SP
    MOVEA.L D0,A5
    MOVE.L  24(A5),ANCIEN
    MOVE.L  #JOY,24(A5)
    MOVEQ   #0,D5           ; X
    BSR     DESSINER
.image:
    MOVE.W  #37,-(SP)       ; Vsync
    TRAP    #14
    ADDQ.L  #2,SP
    MOVE.B  ETAT,D4
    BTST    #7,D4           ; fire: end
    BNE.S   .fin
    MOVE.W  D5,D3           ; old position
    BTST    #3,D4           ; right?
    BEQ.S   .pasdroite
    ADDQ.W  #2,D5
.pasdroite:
    BTST    #2,D4           ; left?
    BEQ.S   .pasgauche
    SUBQ.W  #2,D5
.pasgauche:
    TST.W   D5
    BGE.S   .okgauche
    MOVEQ   #0,D5           ; left edge
    BSR     BIP
.okgauche:
    CMP.W   #304,D5
    BLE.S   .okdroite
    MOVE.W  #304,D5         ; right edge
    BSR     BIP
.okdroite:
    CMP.W   D3,D5
    BEQ.S   .image          ; nothing moved
    BSR     DESSINER
    BRA.S   .image
.fin:
    MOVE.L  ANCIEN,24(A5)   ; give TOS its vector back
    CLR.W   -(SP)
    TRAP    #1

; BIP: a short sound, played by TOS (Dosound)
BIP:
    PEA     SONBIP(PC)
    MOVE.W  #32,-(SP)       ; XBIOS 32: Dosound
    TRAP    #14
    ADDQ.L  #6,SP
    RTS

; DESSINER: clear the band, then draw the square at X = D5
DESSINER:
    MOVEA.L A6,A0
    MOVE.W  #16*40-1,D0
.effacer:
    CLR.L   (A0)+
    DBF     D0,.effacer
    MOVEA.L A6,A0
    MOVE.W  D5,D0
    LSR.W   #4,D0
    LSL.W   #3,D0
    ADDA.W  D0,A0
    MOVE.W  D5,D1
    AND.W   #15,D1
    MOVE.L  #$FFFF0000,D2
    LSR.L   D1,D2
    MOVEQ   #15,D0
.ligne:
    SWAP    D2
    MOVE.W  D2,(A0)
    SWAP    D2
    MOVE.W  D2,8(A0)
    LEA     160(A0),A0
    DBF     D0,.ligne
    RTS

JOY:
    MOVE.B  2(A0),ETAT
    RTS

ANCIEN: DC.L    0
SONBIP: DC.B    0,$80,1,0,7,$FE,8,15,$FF,4,8,0,$FF,0
ETAT:   DC.B    0

;=== rappel
START:
    LEA     $10000,A1       ; any destination
    MOVEQ   #2,D7           ; 3 lines of a 48-pixel-wide block
.ligne:
    ADDA.W  #24,A1          ; the width of the block: 3 groups of 8 bytes
    LEA     160-24(A1),A1   ; line skip
    DBF     D7,.ligne
    CLR.W   -(SP)           ; Pterm0
    TRAP    #1
