; Code for chapter 2, "68000 architecture".
; Each block ";=== name" is referenced in chapitre.json as "@code.s#name".

;=== unites-exemple
START:
    MOVE.L  #$12345678,D0   ; the whole long word
    MOVE.B  #$FF,D0         ; low byte only
    MOVE.W  #$ABCD,D0       ; low word only
    MOVE.L  #-1,D1          ; -1 on 32 bits
    MOVE.B  #%10100011,D2   ; a value written in binary
    RTS

;=== unites-prediction
START:
    MOVE.L  #$11223344,D0
    MOVE.B  #$AA,D0
    MOVE.W  #$BBCC,D0
    MOVEQ   #-1,D1
    RTS

;=== unites-completer-depart
START:
    MOVE.B  #%0000,D0       ; <- write 15 in binary
    RTS

;=== unites-completer-solution
START:
    MOVE.B  #%1111,D0
    RTS

;=== unites-octet-depart
START:
    MOVE.L  #$12345678,D3   ; do not touch this line
    ; a single instruction here

    RTS

;=== unites-octet-solution
START:
    MOVE.L  #$12345678,D3
    MOVE.B  #$FF,D3
    RTS

;=== unites-bases-depart
; D1, D2 and D3 must all be 200:
; in decimal in D1, in hexadecimal in D2, in binary in D3
START:

    RTS

;=== unites-bases-solution
START:
    MOVE.L  #200,D1
    MOVE.L  #$C8,D2
    MOVE.L  #%11001000,D3
    RTS

;=== memoire-exemple
START:
    MOVE.L  #$12345678,$2000    ; store a long word at $2000
    MOVE.B  $2000,D0            ; read the byte at $2000
    MOVE.B  $2003,D1            ; read the byte at $2003
    MOVE.W  $2002,D2            ; read the word at $2002
    RTS

;=== memoire-prediction
START:
    MOVE.B  VALEURS,D0
    MOVE.W  VALEURS,D1
    MOVE.L  VALEURS,D2
    RTS
VALEURS:
    DC.B    $01,$02,$03,$04

;=== memoire-even-depart
; Goal: D0 = 1040 (the name of the Atari model)
START:
    MOVE.W  NOMBRE,D0
    RTS
TEXTE:  DC.B    'ST',0
NOMBRE:
        DC.W    1040

;=== memoire-even-solution
START:
    MOVE.W  NOMBRE,D0
    RTS
TEXTE:  DC.B    'ST',0
        EVEN
NOMBRE:
        DC.W    1040

;=== memoire-ecrire-depart
; Store the word $ABCD at address $3000,
; then copy its MOST SIGNIFICANT byte into D1
START:

    RTS

;=== memoire-ecrire-solution
START:
    MOVE.W  #$ABCD,$3000
    MOVE.B  $3000,D1
    RTS

;=== memoire-inverser-depart
START:
    MOVE.W  #$1234,$3000    ; do not touch this line
    ; swap the two bytes of the word at $3000: it must become $3412

    RTS

;=== memoire-inverser-solution
START:
    MOVE.W  #$1234,$3000
    MOVE.B  $3000,D0        ; D0.B = $12
    MOVE.B  $3001,$3000     ; the low byte moves up
    MOVE.B  D0,$3001        ; the old high byte moves down
    RTS

;=== registres-exemple
START:
    MOVE.L  #$FFFFFFFF,D0
    MOVE.W  #$0001,D0       ; only the low word changes
    MOVEA.W #$1234,A0       ; sign extension, bit 15 = 0
    MOVEA.W #$8000,A1       ; sign extension, bit 15 = 1
    LEA     [[atari:$F8000,A2       ; the screen address|amiga:$DFF000,A2      ; the custom chips address]]
    RTS

;=== registres-prediction
START:
    MOVEQ   #-2,D1
    MOVE.B  #5,D1
    MOVEA.W #$FFF0,A0
    RTS

;=== registres-corriger-depart
; Goal: A0 = 1
START:
    MOVE.B  #1,A0
    RTS

;=== registres-corriger-solution
START:
    MOVEA.L #1,A0
    RTS

;=== registres-ecran-depart
; Put the screen address in A0: $F8000
START:

    RTS

;=== registres-ecran-solution
START:
    LEA     $F8000,A0
    RTS

;=== registres-extension-depart
; With ONE .W instruction, put $FFFFFFF0 in A1
START:

    RTS

;=== registres-extension-solution
START:
    MOVEA.W #$FFF0,A1
    RTS

;=== sr-exemple
START:
    MOVEQ   #0,D0           ; zero result
    MOVE.B  #$80,D1         ; bit 7 at 1
    MOVE.B  #$7F,D2         ; +127
    ADD.B   #1,D2           ; 127 + 1, on a signed byte...
    MOVE.B  #$FF,D3         ; 255
    ADD.B   #1,D3           ; 255 + 1, on a byte...
    RTS

;=== sr-prediction
START:
    MOVE.B  #3,D0
    SUB.B   #5,D0
    RTS

;=== sr-completer-depart
START:
    MOVE.W  #5,D0
    SUB.W   #0,D0           ; <- replace 0 so that the Z flag is 1
    RTS

;=== sr-completer-solution
START:
    MOVE.W  #5,D0
    SUB.W   #5,D0
    RTS

;=== sr-debordement-depart
; Cause a signed overflow (V = 1) with an addition in .B
START:

    RTS

;=== sr-debordement-solution
START:
    MOVE.B  #$70,D0         ; +112
    ADD.B   #$20,D0         ; +112 + 32 = 144 > 127
    RTS

;=== sr-retenue-depart
; End with C = 1 but V = 0, using an addition in .W
START:

    RTS

;=== sr-retenue-solution
START:
    MOVE.W  #$FFFF,D0       ; -1 signed, 65535 unsigned
    ADD.W   #1,D0           ; 0 with a carry; -1 + 1 = 0: no signed overflow
    RTS

;=== pile-exemple
START:
    MOVE.L  #$11111111,-(SP)    ; push a first value
    MOVE.L  #$22222222,-(SP)    ; then a second one
    MOVE.L  (SP)+,D0            ; pop...
    MOVE.L  (SP)+,D1            ; ...and pop again
    RTS

;=== pile-prediction
START:
    MOVE.L  SP,D7           ; remember SP
    MOVE.W  #1,-(SP)
    MOVE.W  #2,-(SP)
    MOVE.L  (SP)+,D1        ; pop 4 bytes at once
    SUB.L   SP,D7           ; D7 = old SP - new SP
    RTS

;=== pile-echange-depart
START:
    MOVE.L  #$AAAA,D0
    MOVE.L  #$BBBB,D1
    MOVE.L  D0,-(SP)
    MOVE.L  D1,-(SP)
    ; pop here to swap D0 and D1

    RTS

;=== pile-echange-solution
START:
    MOVE.L  #$AAAA,D0
    MOVE.L  #$BBBB,D1
    MOVE.L  D0,-(SP)
    MOVE.L  D1,-(SP)
    MOVE.L  (SP)+,D0
    MOVE.L  (SP)+,D1
    RTS

;=== pile-desequilibre-depart
; Goal: D2 = 7 + 3 = 10, and the program must end cleanly
START:
    MOVE.W  #7,D2
    MOVE.L  D2,-(SP)        ; save D2
    ADD.W   #3,D2
    RTS

;=== pile-desequilibre-solution
START:
    MOVE.W  #7,D2
    MOVE.L  D2,-(SP)        ; save D2
    ADD.W   #3,D2
    ADDQ.L  #4,SP           ; remove from the stack what we put there
    RTS

;=== pile-rotation-depart
; At the start D0 = 1, D1 = 2, D2 = 3.
; At the end you need D0 = 3, D1 = 2, D2 = 1, going through the stack.
START:
    MOVEQ   #1,D0
    MOVEQ   #2,D1
    MOVEQ   #3,D2

    RTS

;=== pile-rotation-solution
START:
    MOVEQ   #1,D0
    MOVEQ   #2,D1
    MOVEQ   #3,D2
    MOVE.L  D0,-(SP)
    MOVE.L  D1,-(SP)
    MOVE.L  D2,-(SP)
    MOVE.L  (SP)+,D0
    MOVE.L  (SP)+,D1
    MOVE.L  (SP)+,D2
    RTS

;=== qcm-flags
    MOVE.B  #$FF,D0
    ADD.B   #1,D0

;=== bonus-ligne-depart
; Light up the first 16 pixels of the screen (top left)
START:

    RTS

;=== bonus-ligne-solution
START:
    MOVE.W  #$FFFF,$F8000
    RTS
;=== bonus-ligne-depart@amiga
; Find ExecBase (address stored at $4) and read the exec version (the word at 20(A6))
START:

    RTS

;=== bonus-ligne-solution@amiga
START:
    MOVEA.L 4.W,A6          ; A6 = ExecBase
    MOVEQ   #0,D0
    MOVE.W  20(A6),D0       ; LIB_VERSION: 34 for Kickstart 1.3
    RTS
;=== memoire-even-depart@amiga
; Goal: D0 = 500 (the Amiga model)
START:
    MOVE.W  NOMBRE,D0
    RTS
TEXTE:  DC.B    'KS',0
NOMBRE:
        DC.W    500

;=== memoire-even-solution@amiga
START:
    MOVE.W  NOMBRE,D0
    RTS
TEXTE:  DC.B    'KS',0
        EVEN
NOMBRE:
        DC.W    500

;=== registres-ecran-depart@amiga
; Put the custom chips address in A5: $DFF000
START:

    RTS

;=== registres-ecran-solution@amiga
START:
    LEA     $DFF000,A5
    RTS

;=== rappel
START:
    MOVEQ   #7,D0
    ADD.W   #3,D0
    SUB.W   #10,D0
    RTS

;=== sr-negatif-depart
START:
    MOVE.W  #5,D0
    MOVE.W  #8,D1
    SUB.W   D0,D1           ; should compute 5 - 8 in D0
    RTS

;=== sr-negatif-solution
START:
    MOVE.W  #5,D0
    MOVE.W  #8,D1
    SUB.W   D1,D0
    RTS
