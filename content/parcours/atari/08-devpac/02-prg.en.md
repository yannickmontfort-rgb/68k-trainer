## A program for a real ST

An ST program is a .PRG file, or `.TOS` and `.TTP` depending on whether it uses the GEM desktop or
not. When you double-click it, TOS loads it into memory at a free address, which you do not know
in advance, then hands control to it.

## The header

The file starts with a 28-byte header:

| Bytes | Contents |
|---|---|
| 0-1 | `$601A`, the "magic number" |
| 2-5 | size of the TEXT section |
| 6-9 | size of the DATA section |
| 10-13 | size of the BSS section |
| 14-17 | size of the symbol table (for the debugger) |
| 18-25 | reserved, load flags |
| 26-27 | 0 if a relocation table follows |

`$601A` is the instruction `BRA.S` + 26, which jumps over the header. Then come the TEXT, the DATA,
any symbols and the relocation table.

## Relocation

In the code, `LEA MESSAGE,A0` holds the absolute address of MESSAGE, whereas that address depends
on where TOS loads the program. The assembler therefore computes the addresses as if the program
started at 0, and records in the **relocation table** the position of each long word to fix; at
load time, TOS adds the real address to each of those long words.

PC-relative addresses (`LEA MESSAGE(PC),A0`, `BSR`, `BRA`) need no relocation, because they work
at any address. Coders prefer them whenever possible: they are also shorter and faster.

## Exporting from 68k Trainer

When your program works, the "Export .PRG" button, in the sandbox and in passed exercises, builds
the file with the 68k Trainer assembler. To run it in Hatari, set up a "GEMDOS" hard disk drive on
a folder of your PC, copy the .PRG there and double-click it on the ST desktop; on a real ST, copy
it to a floppy disk or to the SD card of a drive emulator, such as an HxC or a Gotek.

The program ends with `Pterm0` (`CLR.W -(SP)` / `TRAP #1`), which returns to the desktop.

## Disassembling

68k Trainer also contains a disassembler, which reads a .PRG back and rebuilds a Devpac source
that reassembles identically. On the command line, from the project folder:
`npm run desasm -- PROGRAMME.PRG -o programme.s`. It is for studying an old program, preferably
your own.
