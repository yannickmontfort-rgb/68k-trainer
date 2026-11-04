## From source to program

On a real Amiga, you write your program in ASM-One or Devpac (GenAm), and the assembler produces
an **AmigaDOS executable**: a file without an extension that you start from the Shell by typing
its name. In 68k Trainer, the "Export for the Amiga" button builds that same file.

## The "hunk" format

An AmigaDOS executable is split into **hunks**, pieces of code (`HUNK_CODE`), data (`HUNK_DATA`)
or empty space (`HUNK_BSS`). For each one, the file says which memory to load it into, Chip, Fast
or any, and gives a relocation table, the list of absolute addresses to correct. The AmigaDOS
function `LoadSeg` loads each hunk wherever it finds room, then adds the actual load address to
those addresses.

This is why an Amiga program never contains an `ORG`: it does not know in advance where it will be
in memory, and 68k Trainer refuses to export a program that has one.

## Sections and Chip RAM

The `SECTION` directives split the source into hunks:

```asm
    SECTION code,CODE           ; the program: any memory
    SECTION donnees,DATA_C      ; data in Chip RAM: copper lists, pictures, sounds
    SECTION ecran,BSS_C         ; an empty area in Chip RAM: the bitplanes
```

The `_C` suffix asks for Chip RAM, `_F` for Fast RAM. On an A500 without expansion, everything is
in Chip RAM anyway; but on an A500 with its 512 KB board, or on an A1200 with Fast RAM, a screen
stored without `_C` would be invisible to the chips.

68k Trainer puts the whole program in a single hunk, exactly as it runs it (code, data, then
empty area), and places it in Chip RAM as soon as one section has asked for it.

## Starting the program

Our programs are meant for the Shell, the CLI: they end with `RTS` and a return code in D0, 0
when all is well, 5 for a warning, 10 for an error, 20 for a failure.

Started from a Workbench icon, a program must first pick up the message that the Workbench sends
it (`WaitPort` then `GetMsg` on its process port) and return it (`ReplyMsg`) before it ends, and
it has no Shell window to write in. The "Export for the Amiga" button adds a small startup code in
front of your program that takes care of this: started from an icon, it opens a console window
(the one `Output()` returns), waits for Return at the end, then replies to the Workbench; started
from the Shell, it changes nothing.

## Trying it out

In an emulator, WinUAE (Windows) or FS-UAE (Windows, macOS, Linux), you configure an Amiga 500
with a 68000, Kickstart 1.3 and 512 KB of Chip RAM. Without a Kickstart ROM, they can use the free
AROS ROM, compatible with Kickstart 1.3 for what we do. You share a folder of the PC as the
Amiga's hard disk, and drop the executable into it.

On a real Amiga, the executable arrives on a floppy disk, a Gotek drive or a hard disk, and is
started from the Shell.
