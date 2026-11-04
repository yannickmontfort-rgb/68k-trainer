## Waiting for a key: Cnecin

GEMDOS function 8, `Cnecin`, waits for a key to be typed and returns it in D0 without displaying
it, that is without echo:

```asm
    MOVE.W  #8,-(SP)        ; Cnecin
    TRAP    #1
    ADDQ.L  #2,SP
```

D0 then holds two pieces of information:

| Bits of D0 | Contents |
|---|---|
| 7-0 (low byte) | the ASCII code of the character (`'a'` = `$61`, Esc = `$1B`, Return = `$0D`) |
| 23-16 | the **scancode**, the physical number of the key |

Keys that produce no character, such as the arrows, the function keys, Help or Undo, have an ASCII
code of zero, and only their scancode lets you recognize them. To test it, you bring the high word
into the low word with `SWAP D0`, then compare the low byte:

```asm
    CMP.B   #$1B,D0         ; Esc? (ASCII code)
    BEQ     QUITTER
    SWAP    D0              ; the scancode moves to the bottom
    CMP.B   #$50,D0         ; down arrow? (scancode)
    BEQ     BAS
```

## A few ST scancodes

| Key | Code | Key | Code |
|---|---|---|---|
| Esc | `$01` | Space | `$39` |
| Return | `$1C` | Up arrow | `$48` |
| Backspace | `$0E` | Down arrow | `$50` |
| Tab | `$0F` | Left arrow | `$4B` |
| F1 … F10 | `$3B` … `$44` | Right arrow | `$4D` |

The scancode does not depend on the keyboard language: the key to the right of Tab always has code
`$10`, whether it carries an A on an AZERTY keyboard or a Q on a QWERTY one, whereas the ASCII code
follows the layout.

## Without waiting

`Cnecin` blocks the program until a key is pressed. A game would rather know whether a key is
waiting: GEMDOS 11, `Cconis`, returns −1 in D0 when a key is waiting and 0 otherwise, and you only
call `Cnecin` in the first case.

## In 68k Trainer

In the exercises, the exercise itself types keys planned in advance. In the sandbox, a click on
the ST screen hands it your keyboard, as on a real ST.
