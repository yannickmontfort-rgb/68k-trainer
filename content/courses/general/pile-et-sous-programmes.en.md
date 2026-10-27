---
title: "The stack and subroutines"
source: "cours_asm_68000.pdf — Le Féroce Lapin, Volume 1, lessons 6-7 (adapted); M68000PRM (Motorola). Expanded and corrected on 10/21/2026."
themes: ["sous-programmes", "pile"]
---

# The stack and subroutines

## How the stack works (LIFO)

The stack is an area of memory that you manage without keeping track of an address for each piece
of data: you push and you pop, and the last item pushed is always the first one out, as in a stack
of plates. It is a **LIFO** structure (*Last In, First Out*).

So you have no address to manage and no space to reserve for temporary data. In return, the
bookkeeping must be strict, because pushing and popping in the wrong order or with the wrong size
silently corrupts everything that follows on the stack.

## The stack pointer: A7 / SP

Register A7 is reserved for the stack: it is the *Stack Pointer* (SP), which always points to the
last item pushed. The stack grows down toward low addresses, so pushing decreases SP. There are two
physical A7 registers, `USP` for user mode and `SSP` for supervisor mode, and the processor picks
the right one automatically.

You push and pop with two addressing modes:

```asm
        MOVE.L  D0,-(SP)        ; SP -= 4, then writes D0 at address SP: "push"
        MOVE.L  (SP)+,D0        ; reads D0 at address SP, then SP += 4: "pop"
        MOVE.W  D1,-(SP)        ; a word: SP -= 2
        MOVE.W  (SP)+,D1
```

Pushing a `.B` still decrements SP by 2, so that the stack stays on an even address. This holds
only for A7: another address register used the same way moves by just one byte.

## Calling a subroutine: BSR / JSR / RTS

```asm
        BSR     AJOUTE          ; pushes the address of the NEXT instruction, then jumps to AJOUTE
        ; ... the program resumes here after the RTS ...

AJOUTE: ADD.L   D1,D0
        RTS                     ; pops the return address and goes back to it
```

- `BSR` (*Branch to SubRoutine*) calls relative to the PC, which keeps the code relocatable:
  `BSR.S` for a nearby subroutine (±126 bytes), `BSR` (word) up to ±32 KB.
- `JSR` (*Jump to SubRoutine*) calls through an effective address: `JSR (A0)` for a computed
  address or a jump table, `JSR -552(A6)` for an Amiga library, `JSR ETIQUETTE(PC)`.
- `RTS` (*ReTurn from Subroutine*) pops 4 bytes into the PC. `RTR` also pops the CCR, if it was
  pushed with `MOVE SR,-(SP)`, and `RTE` is used to leave an exception (see below).

A call saves only the return address. If the routine modifies D0-D7 or A0-A6, those registers stay
modified on return, since assembly has no automatic local variables. It is up to the programmer to
save whatever must survive the call, and to note in a comment what the routine receives, returns
and modifies.

### Saving registers: MOVEM

`MOVEM` (*MOVE Multiple registers*) transfers several registers in a single instruction:

```asm
        MOVEM.L D0-D2/A0-A1,-(SP)       ; saves D0, D1, D2, A0 and A1 (5 x 4 = 20 bytes)
        ; ... work ...
        MOVEM.L (SP)+,D0-D2/A0-A1       ; restores exactly the SAME list
```

- You write the **same list** on entry and on exit. `MOVEM` always stores the registers in a fixed
  order in memory, D0 at the lowest address up to A7, whatever order you write the list in.
- `MOVEM` does not change the flags, which lets you restore the registers right before an `RTS`
  without losing the result of a test made just before.
- `MOVEM.W` to registers sign-extends each word to 32 bits.

### Passing parameters

There are three usual ways, from the simplest to the most general:

1. Through registers, which is the fastest: "input D0 = value, A0 = address; output D0".
2. Through a memory area, a parameter structure whose address you pass in a register.
3. Through the stack, by pushing the values before the `BSR`, as TOS (GEMDOS/BIOS/XBIOS) and C
   compilers do:

```asm
        MOVE.W  #$1452,-(SP)    ; parameter 1 (word: 2 bytes)
        MOVE.L  #$54854,-(SP)   ; parameter 2 (long: 4 bytes)
        BSR     BIDOUILLE
        ADDQ.L  #6,SP           ; the caller gives the space back: 2 + 4 = 6 bytes
```

After the call, the caller puts SP back where it was by adding the total size of the pushed
parameters, with `ADDQ.L #n,SP` up to 8, `LEA n(SP),SP` or `ADDA.L #n,SP` beyond. Otherwise the
stack stays shifted and an `RTS` further on will return to a wrong address.

In the subroutine, you read the parameters without popping them, through a displacement from SP,
counting everything pushed after them: the return address (4 bytes) and the saved registers.

In this complete example, two numbers passed on the stack are added and the sum comes back in D0:

```asm
        MOVE.L  #$12345678,-(SP)        ; number 1
        MOVE.L  #$00023456,-(SP)        ; number 2
        BSR     AJOUTE
        ADDQ.L  #8,SP                   ; gives back the 2 x 4 bytes
        RTS                             ; end of the program: D0 = $12368ACE

; AJOUTE — D0 = sum of the two longs pushed by the caller. Modifies: D0 only.
AJOUTE: MOVE.L  D1,-(SP)                ; saves D1 (4 bytes)
        MOVE.L  8(SP),D0                ; number 2: 4 (D1) + 4 (return address) = 8
        MOVE.L  12(SP),D1               ; number 1, pushed before number 2
        ADD.L   D1,D0
        MOVE.L  (SP)+,D1                ; restores D1
        RTS
```

```
SP + 0  : saved D1               ← SP during the routine
SP + 4  : return address         (pushed by BSR)
SP + 8  : number 2               (pushed last by the caller)
SP + 12 : number 1
```

### Local variables: LINK and UNLK

To reserve space on the stack for the duration of a routine, the 68000 has two instructions made
for it. `LINK A6,#-n` pushes A6, copies SP into A6, which becomes the **frame pointer**, then
reserves *n* bytes; `UNLK A6` undoes it all.

```asm
CALCUL: LINK    A6,#-8                  ; 8 bytes of local variables: -8(A6) to -1(A6)
        MOVE.L  8(A6),D0                ; 1st parameter: 4 (old A6) + 4 (return) = 8
        MOVE.L  D0,-4(A6)               ; local variable no. 1
        ; ...
        UNLK    A6                      ; SP = A6, then pops the old A6
        RTS
```

With a frame, the displacements of the parameters (`8(A6)`, `12(A6)`…) no longer change when the
routine pushes other values, and this is the convention of C compilers. On the Amiga, A6 serves as
the library base, so you use `LINK A5` instead.

## Exceptions: the stack used by the processor

An exception is a subroutine call triggered by the processor itself, on a hardware interrupt, an
error (odd address, illegal instruction, division by zero) or a `TRAP #0-15` instruction. The
68000:

1. switches to supervisor mode, and therefore to the `SSP` stack;
2. pushes the PC (4 bytes) then the SR (2 bytes), 6 bytes in all, more for bus and address errors,
   and always 8 bytes or more on the 68010 and later;
3. reads the address of the routine in the vector table, in low memory, where vector *n* sits at
   address *n* × 4.

The routine ends with `RTE` (*ReTurn from Exception*), which pops the SR and the PC, and never with
`RTS`, which would pop only 4 bytes and leave the stack and the mode wrong.

| Vector | Address | Cause |
|---|---|---|
| 2 | `$08` | bus error (access to an address with no memory) |
| 3 | `$0C` | address error (word or long at an odd address) |
| 4 | `$10` | illegal instruction |
| 5 | `$14` | division by zero |
| 6 | `$18` | `CHK` out of bounds |
| 7 | `$1C` | `TRAPV` with V = 1 |
| 8 | `$20` | privilege violation |
| 9 | `$24` | trace (T bit of the SR) |
| 10 | `$28` | "line A" (opcode `$Axxx`) |
| 11 | `$2C` | "line F" (opcode `$Fxxx`) |
| 25-31 | `$64`-`$7C` | level 1 to 7 interrupts (autovectors) |
| 32-47 | `$80`-`$BC` | `TRAP #0` to `TRAP #15` |

How these vectors are used depends on the machine. On the Atari ST, `TRAP #1`, `#13` and `#14` are
GEMDOS, the BIOS and the XBIOS (see [the TOS sheet](../atari-st/trap-et-systeme.md)); on the Amiga,
you call the system with `JSR` into the libraries and not with `TRAP`
(see [the Amiga system sheet](../amiga/systeme-et-hardware.md)).

> Sheet expanded and corrected on 10/21/2026 (Claude): stack-passing example recalculated, MOVEM,
> LINK/UNLK, exceptions and vector table.
