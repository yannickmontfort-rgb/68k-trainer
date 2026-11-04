## The exception vector table

The first kilobyte of memory (`$000000`–`$0003FF`) holds 256 vectors of 4 bytes, and each one is
the address of the routine to run when the matching exception occurs. Vector no. n is therefore at
address **n × 4**.

| No. | Address | Exception |
|---|---|---|
| 2 | `$008` | bus error |
| 3 | `$00C` | address error |
| 4 | `$010` | illegal instruction |
| 5 | `$014` | division by zero |
| 8 | `$020` | privilege violation |
| 9 | `$024` | trace (debugger single-stepping) |
| 28 | `$070` | VBL: level 4 interrupt, at every screen refresh (50 or 60 times a second) |
| 32 to 47 | `$080`–`$0BC` | TRAP #0 to TRAP #15 (TRAP #1 at `$084`, #13 at `$0B4`, #14 at `$0B8`) |
| 64 to 79 | `$100`–`$13C` | MFP 68901 interrupts (keyboard at `$118`, Timer B at `$120`…) |

When TOS displays bombs, it draws as many as the exception number.

## What the 68000 does during an exception

The 68000 copies SR, switches to supervisor mode (S = 1) and turns trace mode off. It then pushes
the PC (4 bytes) onto the supervisor stack, then the old SR (2 bytes); for bus and address errors,
it pushes 8 more bytes, including the faulty address. Finally it reads the vector and jumps to the
address it finds there.

The routine ends with **`RTE`** (*ReTurn from Exception*), which pops SR and PC: the processor gets
back exactly the state it was in before, user mode included.

For a `TRAP` or a division by zero, the pushed PC is that of the next instruction, so that after
`RTE` the program carries on. For an illegal instruction or a privilege violation, it is the
address of the faulty instruction.

## Installing your own routine: Setexec

You could write directly into the table, in supervisor mode, but the clean way is the BIOS
function 5, `Setexec(number, address)`. It installs the routine and returns the old vector in D0,
which you keep to put it back before quitting.

```asm
    PEA     MAROUTINE       ; new address
    MOVE.W  #35,-(SP)       ; vector 35 = TRAP #3
    MOVE.W  #5,-(SP)        ; BIOS 5: Setexec
    TRAP    #13
    ADDQ.L  #8,SP           ; 4 + 2 + 2 bytes
    MOVE.L  D0,ANCIEN       ; old routine, to restore at the end of the program
```

With the address `-1`, Setexec reads the vector without changing it.

This is how games install their VBL or keyboard routines, and how debuggers such as MONST
intercept errors.
