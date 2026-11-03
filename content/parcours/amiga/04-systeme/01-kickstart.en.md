## A system in ROM

When you switch on an Amiga 500, its operating system is already there, stored in 256 KB of ROM
starting at address `$FC0000`: this is the Kickstart, version 1.3 on most A500s. The Workbench
disk only brings the commands, the icons and the desktop.

The Kickstart is divided into libraries, each with its own specialty:

| Library | Role |
|---|---|
| `exec.library` | the kernel: memory, tasks and multitasking, interrupts, libraries |
| `dos.library` | files, the CLI console, delays |
| `graphics.library` | the display, the Copper and the Blitter as the system sees them |
| `intuition.library` | the screens, windows, menus and mouse of the desktop |

## A single fixed address: $4

On the Atari ST, you call the system through `TRAP` instructions, and their number is enough. On
the Amiga, you call a library function with a `JSR`, and for that you need to know the address of
the library, its base. These addresses change from one machine to another, depending on the memory
or the Kickstart version, except one: the long word stored at `$4` holds the address of
**ExecBase**, the base of exec, and everything starts from there.

```asm
    MOVEA.L 4.W,A6          ; A6 = ExecBase
```

In 68k Trainer, ExecBase is at `$800`, but it is somewhere else on a real Amiga: never copy an
address you saw in the debugger, always read `$4` again.

## The jump table

Above its base, at positive offsets, a library stores its data (version number, counters…).
Below it, at negative offsets, it stores a jump table: one 6-byte `JMP` instruction per function,
the first useful function at −30, the next at −36, and so on. Calling `Forbid` therefore means
jumping 132 bytes below the base of exec:

```asm
    MOVEA.L 4.W,A6
    JSR     -132(A6)        ; Forbid()
```

The 68000 computes A6 − 132, finds a `JMP` to the real routine in ROM there and executes it, then
the routine's `RTS` returns after your `JSR`. Thanks to this table, a program written for
Kickstart 1.3 still works on later versions: the routines have moved, but their offset has stayed
the same.

## The calling rules

All libraries follow the same rules. A6 holds the base of the library being called, the parameters
go in the registers given by the documentation (the *autodocs*), for example
`OpenLibrary(libName, version)(A1, D0)`, and the result comes back in D0. The function may change
D0, D1, A0 and A1, and it preserves all the other registers.

Offsets are often written with names, such as `_LVOForbid EQU -132` (*Library Vector Offset*).
Here are the ones for exec:

| Function | Offset | Role |
|---|---|---|
| `Forbid()` | −132 | forbids task switching |
| `Permit()` | −138 | allows it again |
| `Disable()` | −120 | turns off interrupts |
| `Enable()` | −126 | turns them back on |
| `AllocMem(size, type)(D0, D1)` | −198 | reserves memory |
| `FreeMem(address, size)(A1, D0)` | −210 | gives it back |
| `OldOpenLibrary(name)(A1)` | −408 | opens a library |
| `CloseLibrary(base)(A1)` | −414 | closes it |
| `OpenLibrary(name, version)(A1, D0)` | −552 | opens a library with a minimum version |

## Multitasking, and how to suspend it

Exec shares the processor's time between several tasks, the CLI, the Workbench, your program…
Two pairs of functions suspend it. `Forbid()` and `Permit()` stop the other tasks from running,
but interrupts carry on: the keyboard, the mouse and the VBL still work. `Disable()` and `Enable()`
turn off all interrupts, and you only use them very briefly.

These calls nest, because exec counts them in ExecBase: `TDNestCnt` for Forbid and `IDNestCnt` for
Disable, which are −1 at rest. Each `Forbid` must therefore have its `Permit`, and each `Disable`
its `Enable`, **before you quit**, otherwise the system stays locked after your program. In
68k Trainer, a final report tells you so at the end.
