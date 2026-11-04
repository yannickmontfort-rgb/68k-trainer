; Code for chapter 8, "Devpac in depth, advanced debugging and good practices".

;=== sections-exemple
; A program in three sections: code, data, reservations.
    SECTION TEXT
START:
    LEA     MESSAGE,A0      ; in the DATA section
    LEA     TAMPON,A1       ; in the BSS section
.copie:
    MOVE.B  (A0)+,(A1)+     ; copy the message into the buffer
    BNE.S   .copie          ; up to the null byte (copied too)
    PEA     TAMPON          ; Cconws displays the copy
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
    DS.B    64              ; 64 bytes at zero, which take no room in the .PRG

;=== rs-prediction
; A "ship" structure described with RS
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
; The program displays NB_ETOILES stars... but the constant is not defined.
; Define it with EQU so that it displays 5 of them.
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
; Write the AFFICHE macro, which displays with Cconws the text whose label is given
; as a parameter (\1). The program already uses it three times: define it above.
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
    PEA     \1              ; \1 = the first parameter of the macro
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
; Display the Degas picture LOGO.PI1, included in the program by INCBIN.
START:
    PEA     IMAGE+2         ; the palette: 16 words after the resolution word
    MOVE.W  #6,-(SP)        ; XBIOS 6: Setpalette
    TRAP    #14
    ADDQ.L  #6,SP
    MOVE.W  #2,-(SP)        ; Physbase
    TRAP    #14
    ADDQ.L  #2,SP
    MOVEA.L D0,A1
    LEA     IMAGE+34,A0     ; the 32,000 bytes of the screen
    MOVE.W  #32000/4-1,D7
.copie:
    MOVE.L  (A0)+,(A1)+
    DBF     D7,.copie
    CLR.W   -(SP)
    TRAP    #1

    SECTION DATA
IMAGE:
    INCBIN  "LOGO.PI1"      ; 32,034 bytes: resolution, palette, screen

;=== image-depart
; Display the picture LOGO.PI1: its palette (with Setpalette), then its 32,000 bytes
; of screen copied to the address returned by Physbase.
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
; The first 28 bytes of a .PRG file: its header.
START:
    LEA     ENTETE(PC),A0
    MOVE.W  (A0),D0         ; the "magic number"
    MOVE.L  2(A0),D1        ; size of the TEXT section
    MOVE.L  10(A0),D2       ; size of the BSS section
    CLR.W   -(SP)
    TRAP    #1

ENTETE:
    DC.W    $601A           ; magic number
    DC.L    $24             ; TEXT size
    DC.L    $10             ; DATA size
    DC.L    $100            ; BSS size
    DC.L    0               ; size of the symbol table
    DC.L    0               ; reserved
    DC.L    0               ; load flags
    DC.W    0               ; 0 = a relocation table follows

;=== prg-depart
; Your first real program: display "Bonjour, Atari !", wait for a key,
; then return to TOS. Then export it as a .PRG.
START:

    CLR.W   -(SP)
    TRAP    #1

;=== prg-solution
START:
    PEA     TEXTE(PC)       ; Cconws
    MOVE.W  #9,-(SP)
    TRAP    #1
    ADDQ.L  #6,SP
    MOVE.W  #8,-(SP)        ; Cnecin: wait for a key
    TRAP    #1
    ADDQ.L  #2,SP
    CLR.W   -(SP)           ; Pterm0: back to the desktop
    TRAP    #1

TEXTE:
    DC.B    'Bonjour, Atari !',0

;=== cadre-exemple
; An intercepted address error: read the frame the 68000 has pushed.
START:
    PEA     ERREUR(PC)      ; Setexec(3, ERREUR): our routine for the address error
    MOVE.W  #3,-(SP)
    MOVE.W  #5,-(SP)
    TRAP    #13
    ADDQ.L  #8,SP
    LEA     $2001,A0        ; an odd address...
    MOVE.W  (A0),D0         ; ... read as a word: address error
    CLR.W   -(SP)           ; (never reached)
    TRAP    #1

; ERREUR: called in supervisor mode; the stack holds the exception frame
ERREUR:
    MOVE.W  (SP),D4         ; status word: read or write, access type
    MOVE.L  2(SP),D5        ; faulting address
    MOVE.W  6(SP),D6        ; first word of the offending instruction
    MOVE.W  8(SP),D3        ; SR at the time of the fault
    MOVE.L  10(SP),D7       ; pushed PC (near the offending instruction)
    CLR.W   -(SP)           ; end the program
    TRAP    #1

;=== pile-depart
; SOMME3 should return in D0 the sum of D1, D2 and D3, without damaging D1 to D3.
; The program crashes on return from the subroutine: find out why.
START:
    MOVEQ   #10,D1
    MOVEQ   #20,D2
    MOVEQ   #30,D3
    BSR     SOMME3
    MOVE.L  D0,D7           ; the result
    CLR.W   -(SP)
    TRAP    #1

SOMME3:
    MOVEM.L D1-D3,-(SP)     ; save
    MOVE.L  D1,D0
    ADD.L   D2,D0
    ADD.L   D3,D0
    MOVEM.L (SP)+,D1-D2     ; restore
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
    MOVEM.L (SP)+,D1-D3     ; as many registers restored as saved
    RTS

;=== pieges-depart
; MAXI looks for the largest of the 4 UNSIGNED words (0 to 65,535) of the table and
; returns it in D0. Here, it should find $9000. It contains two classic mistakes.
START:
    LEA     TABLE,A0
    BSR     MAXI
    CLR.W   -(SP)
    TRAP    #1

; MAXI: A0 = table of 4 unsigned words; output: D0 = the largest
MAXI:
    MOVEQ   #0,D0
    MOVEQ   #4,D7           ; 4 words
.suivant:
    MOVE.W  (A0)+,D1
    CMP.W   D0,D1
    BLE.S   .pasplus        ; not larger: skip it
    MOVE.W  D1,D0
.pasplus:
    DBF     D7,.suivant
    RTS

TABLE:
    DC.W    $1234,$9000,$0042,$7FFF
    DC.W    $FFFF           ; (this word is not part of the table)

;=== pieges-solution
START:
    LEA     TABLE,A0
    BSR     MAXI
    CLR.W   -(SP)
    TRAP    #1

MAXI:
    MOVEQ   #0,D0
    MOVEQ   #3,D7           ; DBF makes N + 1 passes: 3 for 4 words
.suivant:
    MOVE.W  (A0)+,D1
    CMP.W   D0,D1
    BLS.S   .pasplus        ; UNSIGNED comparison: BLS, not BLE
    MOVE.W  D1,D0
.pasplus:
    DBF     D7,.suivant
    RTS

TABLE:
    DC.W    $1234,$9000,$0042,$7FFF
    DC.W    $FFFF

;=== registre-depart
; The program adds into D3 the 5 words of TABLE, doubled by the subroutine
; DOUBLE: the total should be 2 x (1 + 2 + 3 + 4 + 5) = 30. But DOUBLE damages a
; register of the caller: protect it (without changing the main program).
START:
    LEA     TABLE,A0
    MOVEQ   #0,D3           ; the total
    MOVEQ   #4,D4
.suivant:
    MOVE.W  (A0)+,D0
    BSR     DOUBLE
    ADD.W   D0,D3
    DBF     D4,.suivant
    CLR.W   -(SP)
    TRAP    #1

; DOUBLE: D0.W = D0.W x 2
DOUBLE:
    MOVE.W  D0,D3           ; D3 serves as an intermediate
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

; DOUBLE: D0.W = D0.W x 2 (all other registers are preserved)
DOUBLE:
    MOVE.L  D3,-(SP)        ; save what we are going to use
    MOVE.W  D0,D3
    ADD.W   D3,D0
    MOVE.L  (SP)+,D3        ; and give it back
    RTS

TABLE:
    DC.W    1,2,3,4,5

;=== chainer-depart
; Install your own VBL routine at $70: it counts the frames in COMPTEUR, then
; continues to the TOS VBL routine (it is said to "chain"). The main
; program waits for 10 frames, puts the old vector back, and quits.
START:

    CLR.W   -(SP)
    TRAP    #1

ANCIEN:   DC.L  0
COMPTEUR: DC.W  0

;=== chainer-solution
START:
    PEA     INSTALLER(PC)   ; $70 is protected: Supexec
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
    MOVE.L  $70.W,ANCIEN    ; keep the old vector
    MOVE.L  #MAVBL,$70.W
    RTS

RETIRER:
    MOVE.L  ANCIEN,$70.W    ; and give it back before leaving
    RTS

MAVBL:
    ADDQ.W  #1,COMPTEUR
    MOVE.L  ANCIEN(PC),-(SP) ; push the address of the old routine...
    RTS                     ; ... and RTS jumps there: that routine does the RTE

ANCIEN:   DC.L  0
COMPTEUR: DC.W  0

;=== intro-depart
; Final challenge: a small demo-style intro. Display the logo LOGO.PI1, add color
; bars (rasters, with Timer B) and a short tune played under the VBL. The Space
; key ends the program, after putting everything back in place.
START:

    CLR.W   -(SP)
    TRAP    #1

    SECTION DATA
IMAGE:
    INCBIN  "LOGO.PI1"

;=== intro-solution
START:
    PEA     IMAGE+2         ; palette of the logo
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
    MOVE.W  #11,-(SP)       ; Cconis: is a key waiting?
    TRAP    #1
    ADDQ.L  #2,SP
    TST.L   D0
    BEQ.S   .boucle
    MOVE.W  #8,-(SP)        ; Cnecin: read it
    TRAP    #1
    ADDQ.L  #2,SP
    CMP.B   #' ',D0         ; Space?
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
    CLR.B   $FFFFFA1B.W     ; Timer B stopped for now
    BSET    #0,$FFFFFA07.W  ; IERA: Timer B interrupt enabled
    BSET    #0,$FFFFFA13.W  ; IMRA: and not masked
    MOVE.B  #7,$FFFF8800.W  ; mixer: square wave on channel A
    MOVE.B  #%11111110,$FFFF8802.W
    RTS

RETIRER:
    CLR.B   $FFFFFA1B.W     ; Timer B stopped
    BCLR    #0,$FFFFFA07.W
    BCLR    #0,$FFFFFA13.W
    MOVE.L  ANCIENVBL,$70.W ; vectors given back
    MOVE.L  ANCIENTB,$120.W
    MOVE.B  #8,$FFFF8800.W  ; silence
    CLR.B   $FFFF8802.W
    MOVE.W  IMAGE+2+2*2,$FFFF8244.W ; original color 2
    RTS

; VBL: restart the rasters for the new frame, move the music forward, then TOS
VBL:
    MOVEM.L D0-D1/A0,-(SP)
    CLR.B   $FFFFFA1B.W     ; Timer B stopped...
    MOVE.B  #100,$FFFFFA21.W ; ... 100 lines before the first bar
    MOVE.B  #8,$FFFFFA1B.W  ; ... then it counts lines
    CLR.W   RASTER
    BSR     MUSIQUE
    MOVEM.L (SP)+,D0-D1/A0
    MOVE.L  ANCIENVBL(PC),-(SP) ; chain to the TOS VBL
    RTS

; TIMERB: every 2 lines, a new shade for color 2 (the bottom band)
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
    CLR.B   $FFFFFA1B.W     ; next interrupt in 2 lines
    MOVE.B  #2,$FFFFFA21.W
    MOVE.B  #8,$FFFFFA1B.W
    MOVEM.L (SP)+,D0/A0
    BCLR    #0,$FFFFFA0F.W  ; end of interrupt (ISRA, Timer B bit)
    RTE

; MUSIQUE: one note every 12 frames, 8 notes in a loop
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

;=== rappel
START:
    MOVE.W  #8,-(SP)        ; Cnecin: wait for a key
    TRAP    #1
    ADDQ.L  #2,SP
    CLR.W   -(SP)           ; Pterm0
    TRAP    #1

;=== rasters-exemple
START:
    PEA     INSTALLER(PC)
    MOVE.W  #38,-(SP)       ; Supexec: install in supervisor mode
    TRAP    #14
    ADDQ.L  #6,SP
    MOVEQ   #2,D7           ; let three frames go by
.image:
    MOVE.W  #37,-(SP)       ; Vsync
    TRAP    #14
    ADDQ.L  #2,SP
    DBF     D7,.image
    PEA     RETIRER(PC)
    MOVE.W  #38,-(SP)       ; Supexec: put everything back in place
    TRAP    #14
    ADDQ.L  #6,SP
    CLR.W   -(SP)
    TRAP    #1

INSTALLER:
    MOVE.W  $FFFF8240.W,ANCIENFOND
    MOVE.L  $70.W,ANCIENVBL ; keep the system's vectors
    MOVE.L  $120.W,ANCIENTB
    MOVE.L  #VBL,$70.W
    MOVE.L  #TIMERB,$120.W
    CLR.B   $FFFFFA1B.W     ; TBCR: Timer B stopped
    BSET    #0,$FFFFFA07.W  ; IERA: Timer B interrupt enabled
    BSET    #0,$FFFFFA13.W  ; IMRA: and unmasked
    RTS

RETIRER:
    CLR.B   $FFFFFA1B.W     ; Timer B stopped
    BCLR    #0,$FFFFFA07.W
    BCLR    #0,$FFFFFA13.W
    MOVE.L  ANCIENVBL,$70.W ; vectors given back
    MOVE.L  ANCIENTB,$120.W
    MOVE.W  ANCIENFOND,$FFFF8240.W
    RTS

; At each frame: black background at the top, then Timer B counts 50 lines
VBL:
    MOVE.W  #$000,$FFFF8240.W
    CLR.W   BANDE
    CLR.B   $FFFFFA1B.W     ; Timer B stopped...
    MOVE.B  #50,$FFFFFA21.W ; ... TBDR: 50 lines before the first change...
    MOVE.B  #8,$FFFFFA1B.W  ; ... then TBCR: mode 8, it counts lines
    MOVE.L  ANCIENVBL(PC),-(SP) ; and the TOS VBL does its work
    RTS

; Every 50 lines: the next color for the background
TIMERB:
    MOVE.L  A0,-(SP)
    MOVE.W  D0,-(SP)
    MOVE.W  BANDE(PC),D0
    LEA     COULEURS(PC),A0
    MOVE.W  0(A0,D0.W),$FFFF8240.W
    ADDQ.W  #2,BANDE
    MOVE.W  (SP)+,D0
    MOVEA.L (SP)+,A0
    BCLR    #0,$FFFFFA0F.W  ; ISRA: end of the Timer B interrupt
    RTE

COULEURS:   DC.W    $700,$070,$007,$770,$077,$707,$777,$777
BANDE:      DC.W    0
ANCIENFOND: DC.W    0
ANCIENVBL:  DC.L    0
ANCIENTB:   DC.L    0

;=== rasters25-solution
START:
    PEA     INSTALLER(PC)
    MOVE.W  #38,-(SP)       ; Supexec: install in supervisor mode
    TRAP    #14
    ADDQ.L  #6,SP
    MOVEQ   #2,D7           ; let three frames go by
.image:
    MOVE.W  #37,-(SP)       ; Vsync
    TRAP    #14
    ADDQ.L  #2,SP
    DBF     D7,.image
    PEA     RETIRER(PC)
    MOVE.W  #38,-(SP)       ; Supexec: put everything back in place
    TRAP    #14
    ADDQ.L  #6,SP
    CLR.W   -(SP)
    TRAP    #1

INSTALLER:
    MOVE.W  $FFFF8240.W,ANCIENFOND
    MOVE.L  $70.W,ANCIENVBL ; keep the system's vectors
    MOVE.L  $120.W,ANCIENTB
    MOVE.L  #VBL,$70.W
    MOVE.L  #TIMERB,$120.W
    CLR.B   $FFFFFA1B.W     ; TBCR: Timer B stopped
    BSET    #0,$FFFFFA07.W  ; IERA: Timer B interrupt enabled
    BSET    #0,$FFFFFA13.W  ; IMRA: and unmasked
    RTS

RETIRER:
    CLR.B   $FFFFFA1B.W     ; Timer B stopped
    BCLR    #0,$FFFFFA07.W
    BCLR    #0,$FFFFFA13.W
    MOVE.L  ANCIENVBL,$70.W ; vectors given back
    MOVE.L  ANCIENTB,$120.W
    MOVE.W  ANCIENFOND,$FFFF8240.W
    RTS

; At each frame: black background at the top, then Timer B counts 50 lines
VBL:
    MOVE.W  #$000,$FFFF8240.W
    CLR.W   BANDE
    CLR.B   $FFFFFA1B.W     ; Timer B stopped...
    MOVE.B  #25,$FFFFFA21.W ; ... TBDR: 25 lines before the first change...
    MOVE.B  #8,$FFFFFA1B.W  ; ... then TBCR: mode 8, it counts lines
    MOVE.L  ANCIENVBL(PC),-(SP) ; and the TOS VBL does its work
    RTS

; Every 25 lines: the next color for the background
TIMERB:
    MOVE.L  A0,-(SP)
    MOVE.W  D0,-(SP)
    MOVE.W  BANDE(PC),D0
    LEA     COULEURS(PC),A0
    MOVE.W  0(A0,D0.W),$FFFF8240.W
    ADDQ.W  #2,BANDE
    MOVE.W  (SP)+,D0
    MOVEA.L (SP)+,A0
    BCLR    #0,$FFFFFA0F.W  ; ISRA: end of the Timer B interrupt
    RTE

COULEURS:   DC.W    $700,$070,$007,$770,$077,$707,$777,$777
BANDE:      DC.W    0
ANCIENFOND: DC.W    0
ANCIENVBL:  DC.L    0
ANCIENTB:   DC.L    0
