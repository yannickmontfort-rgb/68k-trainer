---
title: "Program startup, includes, macros and tables"
source: "cours_asm_68000.pdf — Le Féroce Lapin, Volume 2, lessons 3 to 5 (adapted); Devpac manual. Completed and corrected on October 21, 2026."
themes: ["outillage", "tableaux", "demarrage"]
---

# Program startup, includes, macros and tables

## The .PRG file and the basepage

A TOS program (`.PRG`, `.TOS`, `.TTP`) is a file in three sections:

- TEXT, the code;
- DATA, the initialized data (`DC.x`);
- BSS, the zeroed variables (`DS.x`), which take up no space in the file.

Since TOS loads the program at an address that is not known in advance, the file also contains a
**relocation table**, which TOS uses to fix up all the absolute addresses itself
(`MOVE.L #TABLE,A0`, `DC.L ROUTINE`…).

At launch, TOS places a 256-byte **basepage** just in front of the program, and leaves its address
on the stack, at `4(SP)` on the first instruction.

| Offset | Contents |
|---|---|
| `$00` | start of the program's memory area |
| `$04` | end of this area |
| `$08` | address of the TEXT section |
| `$0C` | size of the TEXT section |
| `$10` | address of the DATA section |
| `$14` | size of the DATA section |
| `$18` | address of the BSS section |
| `$1C` | size of the BSS section |
| `$24` | basepage of the parent program |
| `$2C` | address of the environment |
| `$80` | command line (one length byte, then the text) |

## The startup routine

A TOS program receives all the free memory at launch. If it wants to call `Malloc` or launch
another program with `Pexec`, it must first give back what it does not use, with `Mshrink`
(GEMDOS 74), keeping 256 bytes for the basepage plus the size of TEXT, DATA and BSS. It also sets
up its own stack, reserved in its BSS section.

```asm
        SECTION TEXT
DEBUT:  MOVEA.L 4(SP),A5        ; A5 = basepage
        MOVE.L  $0C(A5),D0      ; TEXT size
        ADD.L   $14(A5),D0      ; + DATA size
        ADD.L   $1C(A5),D0      ; + BSS size
        ADD.L   #$100,D0        ; + the basepage itself
        LEA     PILE,SP         ; our stack (see the BSS section)
        MOVE.L  D0,-(SP)        ; new size
        MOVE.L  A5,-(SP)        ; start of the block = the basepage
        CLR.W   -(SP)           ; reserved parameter, always 0
        MOVE.W  #74,-(SP)       ; Mshrink
        TRAP    #1
        LEA     12(SP),SP

        ; ... the program ...

        CLR.W   -(SP)           ; Pterm0
        TRAP    #1

        SECTION BSS
        DS.L    256             ; 1 KB of stack
PILE:                           ; the label AFTER the reservation
```

The stack fills downward (`-(SP)`), so the `PILE` label goes **after** the reservation. A stack
that is too small does not necessarily crash right away: it silently overwrites whatever lies just
before it in memory. Count the bytes pushed by nested `BSR`, `MOVEM` and `TRAP` calls, and keep
some margin.

`LEA PILE,SP`, or `MOVE.L #PILE,SP`, puts the address of the stack into SP, whereas
`MOVE.L PILE,SP`, without `#`, would put there the contents of the 4 bytes located at `PILE`, a
classic mistake.

A simple program that calls neither `Malloc` nor `Pexec` can do without `Mshrink`.

> The 68k Trainer simulator handles neither `Mshrink`, nor `Malloc`, nor `Pexec`: this startup
> routine can be tried with the "Try in Hatari" button.

## Includes: `INCLUDE` and `INCBIN`

These two assembler directives, which are not 68000 instructions, keep sources manageable.
`INCBIN "file"` embeds a binary file as is (image, sound, sprites, font) at the place of the
directive. `INCLUDE "file.s"` embeds a source file, like a copy and paste at assembly time, which
lets you build a personal library of routines (palette saving, startup routine…) without retyping
them in every program.

```asm
        INCLUDE "macros.s"      ; shared definitions
        SECTION DATA
IMAGE:  INCBIN  "photo.pi1"     ; Degas: resolution (2 bytes), palette (32), screen (32,000)
        EVEN
```

> In the 68k Trainer sandbox, these files are looked for first next to the open source, then in
> the files supplied with the lessons.

Keep in mind the distinction between the data and its address: `IMAGE INCBIN "photo.pi1"` places
the bytes of the image at address `IMAGE`, whereas `PTN_IMAGE DC.L IMAGE` places at address
`PTN_IMAGE` a pointer to `IMAGE`.

## Macros

A **macro** replaces several repetitive lines with a single "home-made" line, which the assembler
expands at assembly time. It does not exist for the processor: unlike a subroutine, there is
neither `BSR` nor `RTS`, only text copied in at each use.

In Devpac syntax, which the 68k Trainer assembler follows, the name goes in the first column in
front of `MACRO`, the body uses the parameters `\1` to `\9`, and `ENDM` ends the macro.

```asm
PRINT   MACRO
        PEA     \1              ; \1 = first parameter
        MOVE.W  #9,-(SP)        ; Cconws
        TRAP    #1
        ADDQ.L  #6,SP
        ENDM

        PRINT   MESSAGE         ; replaced by the 4 lines, with MESSAGE in place of \1
```

`\0` is replaced by the size written after the macro name (`COPIE.L` gives `L`). `\@` gives a
different number at each use, which is essential for a label in a macro used several times. A
macro can also call another one.

```asm
ATTENDS MACRO                   ; ATTENDS n: delay loop of n turns
        MOVE.W  #\1-1,D0
.att\@  DBRA    D0,.att\@       ; a unique label per use
        ENDM

        ATTENDS 100
        ATTENDS 200             ; no conflict: the labels are .att1 and .att2 (for example)
```

If you overuse macros, you no longer see what the processor really executes, and the program grows
since the body is copied each time. Keep them for truly repetitive sequences, such as system calls.

**Conditional assembly**, with `IFEQ`, `IFNE`, `IFD`… `ELSE` … `ENDC`, assembles a block only if a
condition is true, for a demo version or debugging options:

```asm
DEBUG   EQU     1
        IFNE    DEBUG           ; assembled only if DEBUG <> 0
        MOVE.W  #$0070,$FFFF8240 ; green background during debugging
        ENDC
```

## Tables: indexed addressing

Indexed addressing with displacement, `d8(An,Dn.size)`, is used to walk through a table: `An`
points to the start of the table, `Dn` serves as the index and `d` is an optional fixed offset,
from −128 to 127.

```asm
        LEA     TABLEAU,A0
        ; D0.W holds the index (0, 1, 2, ...)
        ADD.W   D0,D0           ; x 2: one word = 2 bytes (faster than MULU #2,D0)
        MOVE.W  0(A0,D0.W),D1   ; D1 = the D0-th word of the table
```

The displacement **always counts in bytes**, whatever the size of the elements, hence the
multiplication of the index by 2 for a word or by 4 for a long (`LSL.W #2,D0`). Forgetting it is a
classic mistake: the program works by accident on even indexes, then crashes with an address error
(3 bombs) on odd indexes. A table of bytes does not have this problem.

A **jump table** is a table of routine addresses, which replaces a long cascade of comparisons with
a simple index:

```asm
        LEA     ROUTINES,A0
        LSL.W   #2,D0           ; D0 = index x 4 (one address = one long)
        MOVEA.L 0(A0,D0.W),A0
        JSR     (A0)            ; jumps to the chosen routine

ROUTINES:
        DC.L    TOUT_VERT
        DC.L    TOUT_BLEU
        DC.L    QUITTER
```

The relocatable variant does without absolute addresses and stores word displacements from the
start of the table:

```asm
        ADD.W   D0,D0           ; index x 2
        MOVE.W  SAUTS(PC,D0.W),D0
        JMP     SAUTS(PC,D0.W)  ; jumps to SAUTS + the displacement read

SAUTS:  DC.W    TOUT_VERT-SAUTS
        DC.W    TOUT_BLEU-SAUTS
        DC.W    QUITTER-SAUTS
```

To look up a code in a list terminated by a sentinel value (`$FFFF`), you walk through it in
parallel with a list of routines:

```asm
        LEA     TAB_CODE,A0
        LEA     TAB_ROUTINE,A1
.ici    MOVE.W  (A0)+,D0
        CMP.W   #$FFFF,D0
        BEQ     INCONNU         ; end of list: code not recognized
        MOVEA.L (A1)+,A2
        CMP.W   D0,D7           ; D7 = code being looked for
        BNE     .ici
        JSR     (A2)
```

A label that starts with a period, such as `.ici`, is a local label, attached to the previous
global label: you can therefore reuse `.ici` in several routines without name collisions.

In a **two-dimensional table**, such as a 320 × 200 image in bytes, element (x, y) is at
`y × 320 + x`. A precomputed table of line starts avoids the multiplication. Since 199 × 320 exceeds
32,767, the table stores long words, and the index is taken as `.L`: a `.W` index would be
sign-extended and would give a wrong address from line 103 on.

```asm
        ADD.W   D1,D1
        ADD.W   D1,D1           ; y x 4 (table of long words)
        MOVE.L  LIGNES(PC,D1.W),D1 ; D1 = y x 320, read from the table
        AND.L   #$FFFF,D0       ; x on 32 bits
        ADD.L   D0,D1           ; + x
        MOVE.B  0(A0,D1.L),D2   ; the byte (x, y)
        RTS

LIGNES:
Y       SET     0
        REPT    200
        DC.L    Y*320
Y       SET     Y+1
        ENDR
```

`REPT n` … `ENDR` repeats a block at assembly time, and `SET`, unlike `EQU`, lets you redefine a
symbol on each pass.

> Sheet completed and corrected on October 21, 2026 (Claude): `LEA PILE,SP` instead of
> `MOVE.L PILE,A7`, macros following Devpac syntax, `\@`, conditional assembly, relocatable jump
> table, two-dimensional tables.
