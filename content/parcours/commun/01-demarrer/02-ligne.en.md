## The four fields of a line

A line of 68000 assembly reads from left to right, in four fields separated by spaces or tabs.

```asm
BOUCLE: ADD.W   D1,D0       ; add D1 to D0
```

| Field | Here | Role |
|---|---|---|
| label | `BOUCLE:` | gives a name to the address of this line; it starts in the first column, and the `:` is optional in Devpac |
| mnemonic | `ADD.W` | the instruction and its size: `.B` (8 bits), `.W` (16 bits) or `.L` (32 bits); with no size, it is `.W` |
| operands | `D1,D0` | the source, then the destination: `ADD.W D1,D0` does D0 ← D0 + D1 |
| comment | `; add…` | the assembler ignores everything after `;`, as well as any line that starts with `*` |

An instruction never starts in the first column, or the assembler would take it for a label: you
always indent it by at least one space.

## Writing numbers

The same number can be written in decimal (`42`), in hexadecimal (`$2A`) or in binary (`%101010`).

A `#` in front marks an **immediate** value, that is, the number itself. Without `#`, the number is
an address, and the instruction fetches whatever is stored in memory at that location.

```asm
    MOVE.W  #$2000,D0   ; D0 receives the number $2000
    MOVE.W  $2000,D0    ; D0 receives the word stored at address $2000
```

A forgotten `#` is a treacherous mistake, because the program still assembles but does something
quite different from what you think.

## Start and end of a program

In Devpac, a program simply starts at its first line; 68k Trainer loads it at address `$1000`.

:::atari
It ends with `RTS` (*ReTurn from Subroutine*): TOS started your program as a subroutine, and `RTS`
hands control back to it. Later you will see the official way to end, with the `Pterm0` system
call.
:::
:::amiga
It ends with `RTS` (*ReTurn from Subroutine*): the CLI, the Amiga's command window, started your
program as a subroutine, and `RTS` hands control back to it. This is the real end of an AmigaDOS
program, and D0 then holds its return code, 0 when all went well.
:::
