---
title: "Good practices for 68000 assembly programming"
source: "Manual of Good Practices for 68000 Assembly Programming (provided by Yannick, 2026-08). Expanded and corrected on 10/21/2026."
themes: ["style", "conventions"]
---

# Good practices for 68000 assembly programming

Assembly offers none of the safeguards of a high-level language, so rigor in layout and conventions
is not a matter of taste: it is what prevents costly mistakes and keeps a program maintainable.

## 1. Code organization and naming

You clearly separate code from data in sections:
- `SECTION TEXT` (or `CODE`) for instructions;
- `SECTION DATA` for initialized data (`DC.B`/`DC.W`/`DC.L`), whose value is known at assembly
  time;
- `SECTION BSS` for uninitialized variables (`DS.B`/`DS.W`/`DS.L`), whose space is reserved in
  memory at load time and filled with zeros, without taking up room in the executable file;
- on the Amiga, you add `_C` (`SECTION image,DATA_C`) for whatever the chips must read: copper
  lists, bitplanes, sprites, sounds (see [the Amiga sheet](../amiga/systeme-et-hardware.md)).

The `EVEN` directive ensures that what follows starts on an even address. It is essential after a
string or a `DC.B` of odd length, before any `.W`/`.L` data or any instruction, since the 68000
reads words and longs only at even addresses.

Every line keeps the same structure, with columns aligned by tabs:
```
Label       Mnemonic.size       source,destination   ; comment
```
The label starts in the first column or ends with `:`. An instruction never starts in the first
column, otherwise the assembler takes it for a label.

Explicit names, `DEBUT_IMAGE`, `NOUVELLE_PALETTE`, `FIN_JEU` rather than `X`, `Y`, `AX1`, already
document the program. You choose one language, French or English, and stick to it everywhere.
Local labels (`.boucle`, attached to the preceding global label) save you from inventing
`BOUCLE1`, `BOUCLE2`…

Constants are named with `EQU` rather than leaving magic numbers in the code:

```asm
LARGEUR     EQU     320
HAUTEUR     EQU     200
PALETTE     EQU     $FFFF8240       ; color 0 on the Atari ST

        MOVE.W  #LARGEUR*HAUTEUR/2-1,D7 ; the assembler computes the expression
        MOVE.W  #$0700,PALETTE          ; red
```

A comment says why, not what: `ADDQ.L #4,A0 ; move to the next element (4 bytes)` helps the
reader, while `ADDQ.L #4,A0 ; add 4 to A0` teaches nothing. Every subroutine starts with a header
that says what it does, what it receives, what it returns and what it modifies.

```asm
; MULTIPLIE — D0.L = D0.W x D1.W (unsigned)
; Input: D0.W, D1.W     Output: D0.L     Modifies: D0 only
MULTIPLIE:
        MULU    D1,D0
        RTS
```

## 2. Disciplined use of registers

The data registers (D0-D7) are 32 bits wide and are used in slices:

| Access | Scope |
|---|---|
| `.B` | 8 low-order bits |
| `.W` | 16 low-order bits |
| `.L` | 32 bits (whole register) |

An operation on a slice modifies only that slice: after `MOVE.L #$AAAAAAAA,D1` then
`MOVE.W #$5678,D1`, D1 holds `$AAAA5678`. Before loading a byte or a word that you will then use
as `.L`, as an index for example, you therefore clear the register with `MOVEQ #0,D1`.

The address registers (A0-A6) behave differently, which is a frequent source of errors:

| | Data registers (Dn) | Address registers (An) |
|---|---|---|
| `.B` operation | allowed | **forbidden** (assembly error) |
| `.W` write | only the low word changes | **the whole register**, with **sign extension** |
| `.W` read | only the low word is read | only the low word is read |
| Flags | modified | **not modified** (`MOVEA`, `ADDA`, `SUBA`) |

The classic trap: `MOVEA.W #$8234,A0` gives `$FFFF8234`, not `$00008234`. An address such as
`$8000` mistakenly extended to `$FFFF8000` points to a completely different area.

From the start of the program, you set usage conventions and follow them everywhere, for example
D0 for the result, D7 as the loop counter, A0/A1 for source and destination. On the Amiga, A6
holds the base of the library being called and every system call destroys D0-D1/A0-A1; on the
Atari ST, TOS destroys D0-D2/A0-A2.

## 3. Disciplined stack management

The basic mechanisms are in [pile-et-sous-programmes.md](pile-et-sous-programmes.md).

1. You pop in strictly the reverse order of pushing and, with `MOVEM`, you write the same list on
   entry and on exit.
2. You pop with the size you pushed: pushing a long and popping a word shifts the pointer and
   corrupts every following read.
3. Any routine that modifies a register it does not announce saves it, with
   `MOVEM.L D2-D7/A2-A6,-(SP)` on entry and `MOVEM.L (SP)+,D2-D7/A2-A6` just before `RTS`.
4. Cleaning up the stack after a call is the caller's job (`ADDQ.L #n,SP` after a `BSR` or a
   `TRAP` that received pushed parameters).
5. A routine has, if possible, a single exit, because an `RTS` in the middle of a routine that
   saved registers skips their restoration.

If the stack is not restored exactly, `RTS` reads a wrong return address and jumps anywhere: the
program crashes immediately or, worse, silently corrupts data, and the error only shows up much
later. Stepping through in the debugger reveals it if you watch `A7`.

## 4. Relocatable code: prefer PC-relative

A TOS or AmigaDOS program is loaded at an address you cannot know in advance. The system fixes up
absolute addresses at load time with a relocation table, but fully relative code is shorter,
faster, and works even when copied elsewhere in memory.

| | PC-relative | Absolute |
|---|---|---|
| Jumps | `BRA`, `BSR`, `Bcc`, `JMP x(PC)` | `JMP x`, `JSR x` |
| Data access | `LEA x(PC),A0`, `MOVE.W x(PC),D0` | `LEA x,A0`, `MOVE.W x,D0` |
| Relocation | unnecessary | required |

The 68000 does not accept a PC-relative destination (`MOVE.W D0,x(PC)` is forbidden): to write to a
variable, you go through an address register, `LEA x(PC),A0` then `MOVE.W D0,(A0)`.

## 5. System call protocol

Any call that passes its parameters on the stack, like the GEMDOS/BIOS/XBIOS `TRAP` calls of the
Atari ST, follows the same steps:

1. push the parameters from last to first, in the reverse order of the C documentation;
2. push the function number last, just before the call;
3. trigger the call (`TRAP #n`);
4. clean up the stack on return, with `ADDQ.L` up to 8 bytes and `LEA n(SP),SP` beyond;
5. **test the result** in D0, where a negative number is an error code.

On the Amiga, the call is made with `JSR offset(A6)` with the parameters in specific registers.
The result comes back in D0, where 0 often means failure (`OpenLibrary`, `AllocMem`, `Open`…), so
you test D0 before using it.

## 6. Small, safe optimizations

| Instead of | Write | Why |
|---|---|---|
| `MOVE.L #0,D0` | `MOVEQ #0,D0` | 2 bytes instead of 6, faster |
| `ADD.L #4,A0` | `ADDQ.L #4,A0` | `ADDQ`/`SUBQ` for 1 to 8 |
| `MULU #4,D0` | `LSL.L #2,D0` (or `ADD.L D0,D0` twice) | multiply by a power of 2, if the high word of D0 is zero (MULU reads only the low word) |
| `CMP.W #0,D0` | `TST.W D0` | shorter; and often unnecessary, since `MOVE` already sets N and Z |
| `SUBQ.W #1,D7` + `BNE` | `DBRA D7,boucle` | one instruction; count from *n*−1 down to −1 |
| `LEA x,A0` | `LEA x(PC),A0` | relative, no relocation |

Code must first be correct, then fast. An optimization that makes it obscure gets a comment, and is
only justified in a loop executed thousands of times.

## 7. Always hand control back cleanly

You end a program with the call the system provides: `Pterm0` (GEMDOS) on the Atari ST, and on the
Amiga `RTS` with a return code in D0, 0 when all is well. Before leaving, you give back everything
you took: allocated memory, open files and libraries, hijacked vectors, modified hardware
registers (palette, interrupts, Amiga DMA). To do this, you save the original state before
modifying it, then restore it in reverse order.

> Sheet expanded and corrected on 10/21/2026 (Claude): constants, headers, relocatable code, safe
> optimizations, clean exit.
