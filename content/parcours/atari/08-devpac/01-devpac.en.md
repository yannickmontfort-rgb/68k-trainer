## Devpac, the ST coders' workshop

On a real ST, or in the Hatari emulator, the reference tool is Devpac 2, by HiSoft. Its editor and
assembler, GENST, assembles the source with Alt+A and produces, if you choose it in the options, a
.PRG file on floppy disk. Its debugger, MONST, offers stepping (Ctrl+Z), breakpoints and windows
for the registers (Alt+1), the disassembly (Alt+2) and the memory (Alt+3); the 68k Trainer
debugger borrows the idea.

The 68k Trainer assembler follows Devpac's rules, and it is checked byte by byte against the vasm
assembler in Devpac mode: what you write here assembles over there.

## Sections

A TOS program is laid out in three **sections**:

| Section | Contents | In the .PRG file? |
|---|---|---|
| `SECTION TEXT` | the code | yes |
| `SECTION DATA` | initialized data (`DC.B`, `DC.W`, `DC.L`, `INCBIN`) | yes |
| `SECTION BSS` | reservations (`DS.B`, `DS.W`, `DS.L`) | no: only their size is recorded |

When loading, TOS places the three sections end to end in memory and fills the BSS with zeros. A
64 KB buffer in the BSS therefore costs nothing on the floppy, and that is where you keep work
screens, tables computed at startup and variables. You can switch between sections as often as you
like; the assembler groups together everything that belongs to the same one.

## Constants and structures

`EQU` gives a name to a value, as in `LARGEUR EQU 320`: the program becomes readable, and the
value is written in a single place.

`RS` (*reserve structure*) computes offsets without reserving anything. Each `RS.W 1` moves a
counter forward by 2, each `RS.B 1` by 1, and the label takes the value of the counter before it
moves; `RSRESET` sets it back to 0. This is how you describe the fields of an object, then used as
displacements: `MOVE.W POS_X(A0),D0`.

## Macros

A **macro** is a named piece of code, copied at each use, whose parameters are called `\1`, `\2`,
and so on:

```asm
AFFICHE MACRO
    PEA     \1
    MOVE.W  #9,-(SP)        ; Cconws
    TRAP    #1
    ADDQ.L  #6,SP
    ENDM

    AFFICHE BONJOUR         ; becomes the 4 lines, with BONJOUR in place of \1
```

A macro is defined before its first use. Unlike a subroutine, it costs neither a `BSR` nor an
`RTS`, but each use copies its code.

## Including files

`INCLUDE "fichier.s"` inserts another source at that point, macros or constants for example, and
`INCBIN "image.pi1"` inserts a binary file as is: a picture, a piece of music, a font.

A low-resolution Degas picture (`.PI1`) is 32,034 bytes long: a resolution word (0), the 16 colors
of its palette (32 bytes), then the 32,000 bytes of the screen. To display it, you call
`Setpalette` on IMAGE+2, then copy IMAGE+34 to the screen.

In 68k Trainer, INCLUDE and INCBIN read the folder of files supplied with the application, where
`LOGO.PI1` lives.
