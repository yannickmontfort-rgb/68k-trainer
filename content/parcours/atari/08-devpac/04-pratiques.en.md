## Register conventions

TOS guarantees that a system call (GEMDOS, BIOS, XBIOS) preserves D3 to D7 and A3 to A6, and it
may modify D0 to D2 and A0 to A2, D0 often holding the result. ST coders took up the same habit for
their own subroutines: D0-D2 and A0-A2 are scratch registers, which any subroutine may overwrite,
whereas D3-D7 and A3-A6 are lasting registers, which a subroutine saves
(`MOVEM.L D3-D4/A3,-(SP)`) and restores before `RTS` when it uses them.

## Commenting inputs and outputs

Above each subroutine, three comment lines save hours of debugging:

```text
; DESSINER: draws the square at X = D5 in the band pointed to by A6
; Inputs: D5.W = X (0-304), A6 = start of the band
; Output: none; modifies D0-D2/A0
```

## Giving back what you took

A program leaves the machine **as it found it**. Every hijacked vector (`$70`, `$118`, Kbdvbase,
VBL queue) is saved at installation and put back before quitting. Changed hardware registers, MFP
timers, palette, screen or sound, return to their state, because the GEM desktop has no use for the
colors of your demo. And you quit with `Pterm0` or `Pterm`, never by leaving the processor running
into the void.

## Chaining rather than replacing

When you replace an interrupt routine, such as the VBL at `$70`, TOS no longer does its own work:
counters, VBL queue, requested palette. So you chain: the routine does its job, then jumps to the
old one, which will finish with `RTE`.

```asm
MAVBL:
    ADDQ.W  #1,COMPTEUR
    MOVE.L  ANCIEN(PC),-(SP)  ; address of the old routine on the stack...
    RTS                       ; ... RTS "returns" there: it is a jump
```

## Supervisor mode, only as long as needed

Supervisor mode lifts every protection, and a mistake there does more damage. You only enter it
for what requires it (vectors, system variables, hardware), grouping those accesses in small
routines called through `Supexec`, and the rest of the program runs in user mode.

## A typical outline

```text
START:      initialization (Supexec: save, install)
BOUCLE:     Vsync, read the keyboard/joystick, compute, draw
            ... until the exit key
FIN:        Supexec: put everything back
            Pterm0
```
