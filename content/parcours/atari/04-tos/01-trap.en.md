## TOS, a library of services

TOS (*The Operating System*) is the Atari ST's system, burned into ROM. It offers hundreds of
ready-made functions, to display text, read the keyboard, open a file or change the resolution,
and you call them with the **`TRAP`** instruction. This `TRAP` triggers an exception: the processor
switches to supervisor mode and jumps into TOS.

| Call | Layer | Example functions |
|---|---|---|
| `TRAP #1` | GEMDOS: files, memory, console | Cconws (display a text), Cnecin (read a key), Pterm0 (end) |
| `TRAP #2` | GEM (AES/VDI): windows, menus, drawing | — |
| `TRAP #13` | BIOS: low-level input and output | Bconout (send a character), Setexec (change a vector) |
| `TRAP #14` | XBIOS: the Atari hardware | Physbase (screen address), Setcolor (color), Supexec |

## Passing parameters on the stack

TOS reads its parameters from the stack. So you push the parameters from last to first, then the
function number (a word), you execute `TRAP #n`, and on return you clean up the stack by adding
the number of bytes pushed to SP.

```asm
    PEA     MESSAGE         ; parameter: the address of the text (PEA pushes 4 bytes)
    MOVE.W  #9,-(SP)        ; GEMDOS function no. 9: Cconws (2 bytes)
    TRAP    #1              ; call the GEMDOS
    ADDQ.L  #6,SP           ; 4 + 2 = 6 bytes to remove
```

`PEA` (*Push Effective Address*) pushes an address: this is how you pass the address of a text or
of a table.

**Cleaning up the stack is your job.** If you forget it, the stack gets out of balance and the
next `RTS` jumps anywhere. Up to 8 bytes, you write `ADDQ.L #n,SP`, and beyond that
`LEA n(SP),SP`.

## What TOS returns and what it damages

The function returns its value in D0. TOS preserves D3-D7 and A3-A6, but may modify D0-D2 and
A0-A2: after a system call, do not count on these registers any more.

## A few useful functions

| Function | Call | Parameters (pushed before the number) | To clean up |
|---|---|---|---|
| `Pterm0()` | GEMDOS 0 | — | (the program ends) |
| `Cconout(c)` | GEMDOS 2 | `MOVE.W #'A',-(SP)` | 4 |
| `Cnecin()` | GEMDOS 8 | —; D0: ASCII code in the low-order byte, key code in bits 16-23 | 2 |
| `Cconws(text)` | GEMDOS 9 | `PEA TEXTE` (text ending with 0) | 6 |
| `Bconout(2,c)` | BIOS 3 | `MOVE.W #'A',-(SP)` then `MOVE.W #2,-(SP)` (2 = screen) | 6 |
| `Physbase()` | XBIOS 2 | —; D0 = address of the displayed screen | 2 |
| `Setcolor(n,c)` | XBIOS 7 | `MOVE.W #color,-(SP)` then `MOVE.W #n,-(SP)` | 6 |

From now on, our programs end with `Pterm0`, which hands control back to TOS without returning:

```asm
    CLR.W   -(SP)           ; push 0: function Pterm0
    TRAP    #1              ; the GEMDOS ends the program
```

In 68k Trainer, the displayed text appears in the Text output area of the step-by-step panel, and
the codes `13,10` (carriage return, line feed) move to the next line.
