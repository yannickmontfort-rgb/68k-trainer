## Opening a library

Only the base of exec is known in advance: for the other libraries, you ask exec to open them.

```asm
    MOVEA.L 4.W,A6          ; exec
    LEA     dosnom(PC),A1   ; A1 = the name of the library
    MOVEQ   #0,D0           ; D0 = the minimum version accepted (0: any)
    JSR     -552(A6)        ; OpenLibrary: D0 = the base of dos.library, or 0
    TST.L   D0
    BEQ     erreur
    MOVE.L  D0,dosbase
    ; ...
dosnom: DC.B    'dos.library',0
```

The name is written in lowercase, with its `.library` and a final 0. If the library does not
exist, or if its version is too old, `OpenLibrary` returns 0, which is why you **always test D0**:
a program that did not would then jump to address −60, somewhere at the top of memory, and crash.

## Version numbers

The second parameter is the minimum version your program needs:

| Version | Kickstart | Machines |
|---|---|---|
| 33 | 1.2 | early A500, A2000 |
| 34 | 1.3 | most A500s |
| 36, 37 | 2.0, 2.04 | A500+, A600, A3000 |
| 39, 40 | 3.0, 3.1 | A1200, A4000 |

Many examples found on the Internet ask for version 36 or higher, which a Kickstart 1.3 refuses:
`OpenLibrary` then returns 0. For an A500, ask for 0, 33 or 34.

## Closing what you opened

Exec counts how many times each library is opened. Before quitting, you therefore give each one
back with `CloseLibrary` (exec, −414), with the base in A1:

```asm
    MOVEA.L dosbase,A1
    MOVEA.L 4.W,A6
    JSR     -414(A6)        ; CloseLibrary(dosbase)
```

## Writing in the CLI window

Your program is started from the CLI (or the *Shell*), the command window, and dos.library
provides two functions to write in it. `Output()` (−60) returns in D0 the file handle of that
window, and `Write(handle, buffer, length)(D1, D2, D3)` (−48) writes `length` bytes there starting
at address `buffer`, then returns in D0 the number of bytes written, or −1 on error.

```asm
    MOVEA.L dosbase,A6
    JSR     -60(A6)         ; Output(): D0 = the handle
    MOVE.L  D0,D1           ; D1 = the handle
    MOVE.L  #texte,D2       ; D2 = the address of the text
    MOVEQ   #fin-texte,D3   ; D3 = its length, computed by the assembler
    JSR     -48(A6)         ; Write
    ; ...
texte:  DC.B    'Bonjour !',10
fin:
```

The text does not need a final 0, since you give its length, and a line ending is written with a
single character, 10 (*line feed*). These are two differences from the Atari ST, where `Cconws`
stops at the final 0 and a line ending takes 13 then 10.

To read what the user types, `Input()` (−54) gives the handle of the CLI keyboard, and
`Read(handle, buffer, length)(D1, D2, D3)` (−42) waits for a complete line, ended by the Return
key, then returns in D0 the number of characters read, the final 10 included.
