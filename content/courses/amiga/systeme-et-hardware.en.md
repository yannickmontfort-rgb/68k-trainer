---
title: "Amiga: from the system to the hardware"
source: "Guide to Mastering 68000 Assembly on the Amiga (provided by Yannick, 2026-08); Amiga ROM Kernel Reference Manual, AROS sources. Expanded and corrected on 10/21/2026."
themes: ["systeme", "hardware", "outillage"]
---

# Amiga: from the system to the hardware

## Two ways to program the Amiga

On the Amiga, you can go through AmigaOS, stored in ROM in the Kickstart, whose Exec kernel has
offered preemptive multitasking since 1985; you can also program "to the metal", writing directly
to the registers of the **custom chips**, from `$DFF000` on.

| | System (libraries) | Hardware ("metal") |
|---|---|---|
| Target | library functions (exec, dos, graphics…) | direct registers `$DFFxxx`, CIA `$BFxxxx` |
| Portability | high (A500 to A4000, AROS) | low (depends on the OCS/ECS/AGA chipset) |
| Performance | controlled (multitasking goes on) | maximum |
| Typical use | utilities, Shell tools, Workbench applications | demos, games, effects |
| Multitasking | preserved | suspended for the duration of the program, then **given back** |

The two combine: a well-behaved "metal" program asks the system for the machine (`Forbid`,
`OwnBlitter`, `LoadView(0)`…), then gives it back in exactly the state it found it in, as
[the chips sheet](demos-et-custom-chips.md) explains in detail.

## Development environment

- **68k Trainer** simulates an Amiga 500 (68000, OCS, simplified Kickstart 1.3, PAL): part of
  exec, dos and graphics, and all the custom chips. The debugger shows the chip registers, and
  "Export for the Amiga" produces a real AmigaDOS executable (*hunk* format).
- **WinUAE with AROS**, installed by 68k Trainer from the "Emulators" tab, is a 68020 Amiga with
  the free AROS Kickstart, where the "Try in WinUAE" button runs your programs on a real system.
  AROS requires a 68020, on which, as from the 68010 on, the vector table can be moved (VBR).
- **With a real Kickstart**, sold with Amiga Forever, you configure WinUAE as an Amiga 500 (68000,
  Kickstart 1.3, 512 KB of Chip RAM + 512 KB of "Slow RAM" at `$C00000`). Do not check
  "Immediate Blitter": the Blitter becomes instantaneous there, which hides missing waits for the
  end of the Blitter that would crash a real machine.
- **ASM-One / AsmPro, Devpac Amiga, vasm** are the assemblers of the time and of today.

## Memory types

| Memory | Seen by | Note |
|---|---|---|
| **Chip RAM** | the 68000 **and** the custom chips | required for everything the chips read: bitplanes, copper lists, sprites, sounds, Blitter data |
| **Fast RAM** | the 68000 only | faster: the 68000 never waits for the chips there |
| **Slow RAM** (`$C00000`, A501 expansion) | the 68000 only | on the chip bus, so as slow as Chip RAM |
| ROM (`$F80000`-`$FFFFFF`) | | the Kickstart |

A buffer meant for the chips but allocated in Fast RAM does not crash the system: the chips simply
read something else, and the bug stays silent. So you ask for Chip RAM explicitly:

```asm
        MOVEA.L 4.W,A6          ; ExecBase
        MOVE.L  #10240,D0       ; size in bytes
        MOVE.L  #$10002,D1      ; MEMF_CHIP ($2) + MEMF_CLEAR ($10000): Chip RAM filled with 0
        JSR     -198(A6)        ; AllocMem → D0 = address, 0 on failure
        TST.L   D0
        BEQ     PAS_DE_MEMOIRE  ; always test it
        MOVE.L  D0,TAMPON
        ; ...
        MOVEA.L TAMPON,A1       ; at the end: FreeMem(address, SAME size)
        MOVE.L  #10240,D0
        JSR     -210(A6)
```

In an executable, `SECTION name,DATA_C` (or `BSS_C`, `CODE_C`) asks the loader to place the
section in Chip RAM, which is the simplest way for fixed data such as an image or a copper list.

## ExecBase and the Node structure

Address `$4` holds the address of ExecBase. It is the **only fixed address** in the system, and
everything else, libraries, tasks and memory, is found from it.

The system keeps its libraries, tasks, ports and devices in doubly linked lists of *nodes*, and
every system structure starts with the 14 bytes of a node:

| Offset | Type | Name | Description |
|---|---|---|---|
| 0 | APTR | `LN_SUCC` | next node |
| 4 | APTR | `LN_PRED` | previous node |
| 8 | UBYTE | `LN_TYPE` | type (1 = task, 4 = message port, 9 = library, 13 = process) |
| 9 | BYTE | `LN_PRI` | priority (−128 to 127; the scheduler picks the highest) |
| 10 | APTR | `LN_NAME` | address of the name (e.g. `"exec.library"`) |

A few useful ExecBase fields: `LIB_VERSION` (word at +20: 34 for Kickstart 1.3, 37 for 2.04, 40
for 3.1), `ThisTask` (+276: the current task), `AttnFlags` (word at +296: the processor; bit 0 =
68010 or later, bit 1 = 68020 or later).

## Calling a system function: negative offsets

A library is a block of memory: its data sits at positive offsets from its base address, and its
functions at **negative offsets**, in a table of 6-byte `JMP` instructions. You put the base
address in A6, the parameters in the expected registers, then call `JSR offset(A6)`:

```asm
        MOVEA.L 4.W,A6          ; ExecBase in A6
        LEA     DOSNOM(PC),A1   ; name of the library
        MOVEQ   #33,D0          ; minimum version (33 = Kickstart 1.2); 0 = any
        JSR     -552(A6)        ; OpenLibrary → D0 = library base, 0 on failure
        TST.L   D0
        BEQ.S   ECHEC
        MOVEA.L D0,A6           ; DOSBase in A6
        JSR     -60(A6)         ; Output() → D0 = the Shell output
        MOVE.L  D0,D1           ; dos: parameters in D1, D2, D3…
        LEA     TEXTE(PC),A0
        MOVE.L  A0,D2
        MOVEQ   #FIN-TEXTE,D3   ; length
        JSR     -48(A6)         ; Write(output, text, length)
        MOVEA.L A6,A1
        MOVEA.L 4.W,A6
        JSR     -414(A6)        ; CloseLibrary(DOSBase)
        MOVEQ   #0,D0           ; return code: 0 = all is well
        RTS
ECHEC:  MOVEQ   #20,D0          ; 20 = serious failure
        RTS

DOSNOM: DC.B    'dos.library',0
TEXTE:  DC.B    'Bonjour Amiga !',10
FIN:
        EVEN
```

- The first 4 entries of every library (`-6`, `-12`, `-18`, `-24`: Open, Close, Expunge,
  reserved) are used by the system, and the first function of its own is at `-30`.
- Every call **destroys `D0`, `D1`, `A0` and `A1`**, the result arriving in D0; the other
  registers are preserved, A6 included.
- The offsets of common functions are in [the libraries sheet](bibliotheques-exec-dos.md).

## Starting from the Shell or the Workbench

A program receives control through a plain `JSR`, and it ends with `RTS` with a **return code in
D0**: 0 = OK, 5 = warning, 10 = error, 20 = failure. An AmigaDOS script stops as soon as a code
reaches its limit (`FailAt`, 10 by default), so a forgotten D0, which holds anything at all, can
stop the script that started the program.

- Started from the Shell (CLI), the program finds the address of the argument line in A0 and its
  length in D0; `Output()` is the Shell window.
- Started from the Workbench, through its icon, it has no output window (`Output()` is 0), and a
  startup message (*WBStartup*) waits for it on the process port. It must fetch it at the start
  (`WaitPort`, `GetMsg` on `pr_MsgPort`, +92 in the Process structure) and reply to it at the end
  (`Forbid` then `ReplyMsg`), otherwise the Workbench never releases it. The `pr_CLI` field (+172)
  says where you came from: it is 0 when the program was started by the Workbench.

The Amiga export of 68k Trainer adds this startup code on its own, and the program works from the
Shell as well as from an icon, a console window then opening for its output.

## Messages and signals (the basis of multitasking)

Tasks communicate through messages sent to ports, and the arrival of a message wakes the task
through a signal. The cycle is always the same: the task sleeps in `WaitPort` (or `Wait` on the
port's signal) without using any time, fetches the message with `GetMsg`, processes it, then
returns it with `ReplyMsg`. If it forgets **`ReplyMsg`**, the sender never gets its structure back,
which leads to a memory leak or a deadlock.

A system program never busy-waits, with a loop that tests constantly, because that steals all the
processor time from the other tasks. To wait, you call dos's `Delay(n)` (*n* fiftieths of a
second) or graphics's `WaitTOF` (one frame).

## Example: opening an Intuition window

```asm
        MOVEA.L 4.W,A6
        LEA     INTNOM(PC),A1
        MOVEQ   #0,D0
        JSR     -552(A6)        ; OpenLibrary("intuition.library", 0)
        MOVE.L  D0,INTBASE
        BEQ.S   .fin
        MOVEA.L D0,A6           ; IntuitionBase in A6
        LEA     FENETRE(PC),A0  ; NewWindow structure
        JSR     -204(A6)        ; OpenWindow → D0 = Window, 0 on failure
        MOVE.L  D0,WINDOWPTR
        ; ... wait for the close message on the window's port (Window+86: UserPort) ...
        MOVEA.L WINDOWPTR,A0
        JSR     -72(A6)         ; CloseWindow
        MOVEA.L A6,A1
        MOVEA.L 4.W,A6
        JSR     -414(A6)        ; CloseLibrary
.fin:   MOVEQ   #0,D0
        RTS

INTNOM: DC.B    'intuition.library',0
        EVEN                    ; always realign after a DC.B of odd length

FENETRE:                        ; NewWindow structure (48 bytes)
        DC.W    20,20           ; LeftEdge, TopEdge
        DC.W    300,100         ; Width, Height
        DC.B    0,1             ; DetailPen, BlockPen
        DC.L    $200            ; IDCMPFlags: CLOSEWINDOW
        DC.L    $F              ; Flags: SIZING, DRAGBAR, DEPTH, CLOSE (SMART refresh)
        DC.L    0               ; FirstGadget
        DC.L    0               ; CheckMark
        DC.L    TITRE           ; Title
        DC.L    0,0             ; Screen, BitMap
        DC.W    100,50,640,256  ; MinWidth, MinHeight, MaxWidth, MaxHeight
        DC.W    1               ; Type: WBENCHSCREEN

TITRE:  DC.B    'Ma fenetre',0
        EVEN
INTBASE:   DC.L 0
WINDOWPTR: DC.L 0
```

## AmigaDOS and the BCPL legacy

AmigaDOS comes from the TRIPOS system, written in BCPL, and keeps some conventions of its own from
it:

- A **BPTR**, a BCPL pointer, counts in longs: you multiply it by 4 (`LSL.L #2,D0`) to get a 68000
  address. Files (`Open`) and locks (`Lock`) are BPTRs.
- A BSTR, a BCPL string, starts with a length byte and has no terminating zero.
- The dos functions take their parameters in D1, D2, D3…, not in A0/A1 as exec does.
- A Lock is placed on a file or a directory without opening it, for `Examine` (size, date…),
  `CurrentDir`, or to check that a file exists. Every `Lock` is released with `UnLock`.

## Storage: floppy disk and bootblock

A standard Amiga floppy holds 880 KB: 80 cylinders × 2 sides × 11 sectors of 512 bytes.

The **bootblock** occupies the first 2 sectors (1,024 bytes). It starts with the signature `"DOS"`
followed by a type byte (0 = OFS), then come a checksum (long at +4), the root block number (+8,
880) and the boot code at +12, called with A6 = ExecBase and A1 = the drive's request. The sum is
obtained by adding the 256 longs with end-around carry (`ADDX`), and you choose the value at +4 so
that the full sum is `$FFFFFFFF`.

## Historical note: the CopyLock protection

Rob Northen's *CopyLock* protection relied on tracks with unusual MFM sync and on encrypted code
that deliberately triggered exceptions (trace mode, illegal instructions such as `$4AFC`) to hinder
analysis. It is mentioned here only as a historical example from the Amiga scene, not as a
technique to reproduce.

## Practice

The Amiga course of 68k Trainer turns all of this into exercises: chapter 4 covers the system
(exec, dos, messages), chapter 5 how to take over and give back the machine, then come the Copper,
the Blitter, sprites and Paula.

> Sheet expanded and corrected on 10/21/2026 (Claude): `OpenWindow` at `-204` (not `-156`),
> `DC.L title(pc)` removed, bootblock sum (`$FFFFFFFF` with end-around carry), Rob Northen,
> "Immediate Blitter" option; additions: AllocMem, ExecBase, Shell/Workbench startup, return
> codes, 68k Trainer environment.
