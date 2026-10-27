---
title: "68000 assembly — Reference (Meyne / Hoppenot)"
source: "assemble.pdf — P. Hoppenot (1999), based on a course by Philippe Meyne, IUT GEII Evry; expanded from the M68000PRM (Motorola) on 10/21/2026."
themes: ["transfert", "adressage", "branchements", "sous-programmes"]
---

# 68000 assembly — Reference

## I. Format of an assembly instruction

A program describes what the machine must do as a sequence of instructions, which fall into four
families:

- transfer, to read or write memory and the internal registers of the processor;
- arithmetic and logic operations: addition, multiplication, sign inversion, AND, OR, NOT, exclusive OR…;
- branching, conditional (*if \<condition\> then go to*) or unconditional (*go to*);
- subroutine calls.

Every line follows the same syntax:

```
Label       Mnemonic.format     source,destination   ; comment
```

- The label, optional, marks an instruction or a piece of data in the program.
- The mnemonic is the name of the instruction.
- The format gives the size of the data handled: `.B` byte (8 bits), `.W` word (16 bits, the
  default size if you write none), `.L` long word (32 bits).
- The source is the starting data and the destination where it ends up. On the 68000, the source
  is **on the left** and the destination on the right, the opposite of Intel processors.

```asm
DEB     MOVE.B  D0,D1           ; moves the low-order byte of D0 into D1
        NOT.B   D1              ; one's complement of the low-order byte of D1
        BRA     DEB             ; jumps to the label DEB
```

## II. Transfer instruction — Addressing modes

The transfer instruction is written `MOVE.<format> <source>,<destination>`. `MOVE` sets the N and Z
flags from the value transferred, and clears V and C.

### II.1. Register direct addressing

The data is in a register, `Dn` or `An`.

```asm
        MOVE.L  D1,D0           ; D0 receives the 32 bits of D1
        MOVE.B  D1,D0           ; only the low-order byte of D0 is modified
```

If the low byte of D1 is `$AF` and D0 held `$FA23FBED`, D0 holds `$FA23FBAF` after the `MOVE.B`:
only the last byte has changed.

### II.2. Immediate addressing

The data is written in the instruction itself, after the `#` prefix.

```asm
        MOVE.W  #523,D0         ; the low-order word of D0 receives 523 (decimal, the default base)
        MOVEQ   #-1,D1          ; "quick": -128 to 127, whole D1 = $FFFFFFFF
        ADDQ.W  #8,D2           ; "quick": 1 to 8
```

| Prefix | Base |
|---|---|
| `$` | hexadecimal |
| `%` | binary |
| *(none)* | decimal |
| `'…'` | ASCII code of the characters |

`MOVE.B #$D0,D0` moves the data `$D0`, that is 208, into register `D0`: the hexadecimal number
`$D0` has nothing to do with the register. Without `#`, on the other hand, `MOVE.W $10,D0` reads
the word stored at address `$10`, and forgetting the `#` is the most frequent mistake.

### II.3. Absolute addressing

The instruction contains the address of the data, not the data.

```asm
        MOVE.B  #$F0,$FF9001    ; writes $F0 at address $FF9001
        MOVE.W  $4000,D0        ; reads the word at address $4000
```

For a word or a long (`.W`/`.L`), the address must be even.

### II.4. Indirect addressing `(An)`

The address of the data is in an address register, which then acts as a **pointer**.

```asm
        LEA     TABLE,A3        ; A3 = address of TABLE (Load Effective Address)
        MOVE.B  D0,(A3)         ; writes the byte of D0 at the address held in A3
```

### II.5. Indirect with displacement `d16(An)`

The effective address is the contents of the register plus a fixed displacement, signed on 16 bits
(−32,768 to 32,767).

```asm
        MOVE.W  #$F14D,$70(A4)  ; effective address = A4 + $70
        MOVE.L  -4(A6),D0       ; a displacement can be negative
```

This is the natural mode for reading the fields of a structure whose start address is in A4.

### II.6. Indexed indirect `d8(An,Xn.size)`

The effective address is the sum of the address register, an index register (`Dn` or `An`) and a
displacement signed on 8 bits (−128 to 127).

```asm
        MOVE.L  D7,$70(A2,D1.L) ; A2 + D1 + $70
        MOVE.W  0(A0,D0.W),D2   ; D0.W sign-extended to 32 bits before the addition
```

The index is given as `.W`, sign-extended, or as `.L`, never as `.B`. Since the displacement counts
in bytes, the index must be 2 × *i* to reach the *i*-th word of an array.

### II.7. Postincrement indirect `(An)+`

The effective address is in the register, which the processor increases after the access by the
size of the data: 1 for `.B`, 2 for `.W`, 4 for `.L`, and 2 for a `.B` on A7.

```asm
        NOT.B   (A3)+           ; uses A3, then A3 += 1
        NOT.L   (A3)+           ; uses A3, then A3 += 4
        MOVE.W  (A0)+,(A1)+     ; copies a word and advances both pointers
```

This mode is used to walk through arrays and to pop (`(SP)+`).

### II.8. Predecrement indirect `-(An)`

The processor decreases the register by the size of the data before the access. This mode is used
to push (`-(SP)`) and to walk through an array backward.

### II.9. PC-relative addressing `d16(PC)` and `d8(PC,Xn)`

The address is computed from the program counter, so the code stays correct wherever it is loaded
in memory: it is **relocatable**. The assembler computes the displacement itself.

```asm
        LEA     MESSAGE(PC),A0  ; A0 = address of MESSAGE, with no absolute address
        MOVE.W  TABLE(PC,D0.W),D1 ; indexed read from a nearby table
```

PC-relative mode is allowed only as a source, for reading: `MOVE.W D0,VAR(PC)` is rejected.

### II.10. Sign extension of short addresses

The 68000 addresses 16 MB, on 24 bits (its pins run from A23 to A1, and UDS/LDS select the byte). An absolute address encoded on 16 bits, the short `.W`
form that gives a shorter and faster instruction, is sign-extended:

```asm
        NOT.L   $7000.W         ; encoded $7000 → address $00007000 (bit 15 at 0: filled with 0s)
        NOT.L   $FFFFF000.W     ; encoded $F000 → address $FFFFF000, i.e. $FFF000 on 24 bits
```

So you write the address as it will be after extension. The short form reaches only
`$0000`-`$7FFF` and `$FFFF8000`-`$FFFFFFFF`, and the assembler rejects `$F000.W`, which would be
ambiguous. This is what lets a short address reach both the bottom of memory (vectors, system
variables) and the top, where the Atari ST hardware registers live (`$FF8000`-`$FFFFFF`).

An index register `Dn.W` is sign-extended too, so an index of `$8000` or more becomes negative: for
large arrays, you use `Dn.L`.

## III. Branch instructions

| | Unconditional | Conditional |
|---|---|---|
| PC-relative | `BRA` | `Bcc`, `DBcc` |
| Effective address | `JMP` | — |

### III.1. Unconditional branch

```asm
        BRA     ETIQUETTE       ; relative: PC ← PC + displacement
        JMP     (A0)            ; to the address held in A0 (jump table)
```

`BRA.S` encodes the displacement on 8 bits (±126 bytes), `BRA` (or `BRA.W`) on 16 bits (±32 KB).
`JMP ETIQUETTE` with an absolute address is not relocatable, and `BRA` is preferred.

### III.2. Conditional branch

The conditional branch expresses the structure *if \<condition\> then \<action\>*.

#### III.2.1. The condition code register (CCR)

The CCR is the low-order byte of the status register SR:

| bit | 4 | 3 | 2 | 1 | 0 |
|---|---|---|---|---|---|
| name | X | N | Z | V | C |
| meaning | Extend | Negative | Zero | Signed overflow (oVerflow) | Carry / borrow (Carry) |

These flags are set by arithmetic and logic instructions, by `MOVE` (N, Z), `CMP`, `TST`, and by
`BTST` (Z only). Instructions that target an address register (`MOVEA`, `ADDA`, `SUBA`), `LEA`,
`MOVEM`… do not change them, while `SWAP` sets N and Z.

On the 68000, **C is 1 when a subtraction or a comparison had to borrow**, that is, when the
destination was smaller than the source as unsigned values.

```asm
        MOVE.B  #$1,D0          ; D0 ← 1
        SUB.B   #$1,D0          ; D0 ← 0     → Z=1, N=0, V=0, C=0
        SUB.B   #$1,D0          ; D0 ← $FF   → Z=0, N=1, V=0, C=1 (borrow: 0 - 1)
```

#### III.2.2. The CMP instruction

`CMP` compares two pieces of data and sets the CCR without modifying the destination.

```
CMP.<format> <source>,<destination>   ; computes <destination> - <source>
```

```asm
        MOVE.B  #$0A,D0
        MOVE.B  #$0B,D1
        CMP.B   D1,D0           ; D0 - D1 = -1 → N=1, Z=0, V=0, C=1
        CMP.B   #$0A,D0         ; D0 - $0A = 0 → N=0, Z=1, V=0, C=0
```

The order of the operands is the first trap: `CMP.W #10,D0` followed by `BGT` reads "if D0 > 10".

`TST.<format> <ea>` compares with zero: it sets N and Z, and clears V and C.

#### III.2.3. The BTST instruction

`BTST` tests one bit of a register or of an effective address and sets only `Z`, which becomes 1
when the tested bit is 0. On a register, the bit number runs from 0 to 31; in memory, the test
applies to a byte, so to bits 0 to 7.

```asm
        BTST    #6,$BFE001      ; Amiga: left mouse button (active at 0)
        BEQ     APPUYE          ; bit at 0 → Z=1 → button pressed
```

`BSET`, `BCLR` and `BCHG` test in the same way, then set the bit to 1, clear it to 0 or invert it.

#### III.2.4. Conditional branch instructions (Bcc)

`Bcc label` is a relative branch, where `cc` stands for the condition code:

| cc | meaning | condition | use |
|---|---|---|---|
| `EQ` | equal | `Z` | all |
| `NE` | not equal | `Z̄` | all |
| `GT` | greater than | `N.V.Z̄ + N̄.V̄.Z̄` | signed |
| `GE` | greater than or equal | `N.V + N̄.V̄` | signed |
| `LT` | less than | `N.V̄ + N̄.V` | signed |
| `LE` | less than or equal | `Z + N.V̄ + N̄.V` | signed |
| `HI` | higher | `C̄.Z̄` | unsigned |
| `HS` = `CC` | higher or same (carry at 0) | `C̄` | unsigned |
| `LO` = `CS` | lower (carry at 1) | `C` | unsigned |
| `LS` | lower or same | `C + Z` | unsigned |
| `MI` | negative | `N` | |
| `PL` | positive or zero | `N̄` | |
| `VS` | overflow | `V` | |
| `VC` | no overflow | `V̄` | |

With X = `$0A` in D0 and Y = `$0B` in D1:

```asm
        CMP.B   D0,D1           ; Y - X = $01 → N=0, Z=0, V=0, C=0
        BGT     PLUS_GRAND      ; taken (Y > X signed)
        BHI     PLUS_GRAND      ; taken too (Y > X unsigned)
```

With X = `$0A` and Y = `$F0`, however, `BGT` is not taken, because `$F0` is −16 signed, while
`BHI` is, because `$F0` is 240 unsigned. The branch is what decides whether the numbers are signed.

`Scc <ea>` (*Set according to condition*) sets a byte to `$FF` if the condition is true and to
`$00` otherwise, which lets you keep the result of a test.

#### III.2.5. Test and branch: DBcc

`DBcc` combines a condition test with decrementing a counter, which makes it the loop instruction.

```
DBcc Dn,label
; if the condition is true: exit (continue after the DBcc)
; otherwise: Dn.W ← Dn.W - 1 ; if Dn.W ≠ -1 then PC ← label
```

`DBRA` (or `DBF`, whose condition is always false) gives the counted loop: to repeat *n* times, you
load **n − 1** into the counter.

```asm
        LEA     TABLE,A0
        MOVE.W  #10-1,D7        ; 10 iterations
.efface CLR.W   (A0)+
        DBRA    D7,.efface      ; D7 = 9, 8, ... 0, then -1 → exit
```

`DBEQ D0,boucle` exits either when Z = 1, the value is found, or when the counter runs out, which
gives a search with a limit:

```asm
        MOVE.W  #100-1,D1       ; at most 100 bytes
.cherche CMP.B  (A0)+,D0        ; is the byte read equal to D0?
        DBEQ    D1,.cherche     ; exits if equal, or after 100 tries
```

The counter of a `DBcc` is a word, so `DBRA` does at most 65,536 iterations.

## IV. Subroutine call instruction

A subroutine call pushes the return address then branches, and `RTS` pops that address to go back
to it.

```asm
        BSR     ROUTINE         ; relative: return address pushed, PC ← PC + displacement
        JSR     (A0)            ; to a computed address
        JSR     -552(A6)        ; Amiga: library function (negative offset)
ROUTINE RTS                     ; return from subroutine
```

Subroutines make code modular and avoid repeating the same sequence. The stack, parameter passing
and saving registers are detailed in [the stack sheet](pile-et-sous-programmes.md).

## V. Instruction summary table

| Family | Instructions | Key point |
|---|---|---|
| Transfer | `MOVE`, `MOVEA`, `MOVEQ`, `MOVEM`, `MOVEP`, `LEA`, `PEA`, `EXG`, `SWAP`, `CLR` | `LEA` computes an address without reading memory; `PEA` pushes it |
| Addition | `ADD`, `ADDA`, `ADDI`, `ADDQ`, `ADDX` | `ADDX` also adds X: calculations on 64 bits or more |
| Subtraction | `SUB`, `SUBA`, `SUBI`, `SUBQ`, `SUBX`, `NEG`, `NEGX` | `NEG` = 0 − operand (two's complement) |
| Multiplication | `MULU`, `MULS` | 16 × 16 bits → 32 bits (unsigned / signed); slow (up to 70 cycles) |
| Division | `DIVU`, `DIVS` | 32 / 16 bits: quotient in the low word, remainder in the high word; division by 0 → exception |
| Comparison | `CMP`, `CMPA`, `CMPI`, `CMPM`, `TST` | `CMPM (A0)+,(A1)+` compares two memory areas |
| Logic | `AND`, `ANDI`, `OR`, `ORI`, `EOR`, `EORI`, `NOT` | `ANDI #…,CCR` / `ORI #…,SR` act on the flags |
| Shifts | `LSL`, `LSR`, `ASL`, `ASR`, `ROL`, `ROR`, `ROXL`, `ROXR` | LS = logical (0 shifted in), AS = arithmetic (keeps the sign on the right), RO = rotate, ROX = rotate through X |
| Bits | `BTST`, `BSET`, `BCLR`, `BCHG`, `TAS` | register: bit 0-31; memory: byte, bit 0-7 |
| Sign | `EXT.W`, `EXT.L` | byte → word, word → long |
| Decimal (BCD) | `ABCD`, `SBCD`, `NBCD` | two decimal digits per byte (scores, clocks) |
| Branches | `BRA`, `Bcc`, `DBcc`, `Scc`, `JMP` | see § III |
| Subroutines | `BSR`, `JSR`, `RTS`, `RTR`, `LINK`, `UNLK` | see § IV |
| System | `TRAP`, `TRAPV`, `CHK`, `RTE`, `STOP`, `RESET`, `NOP`, `ILLEGAL` | `RTE`, `STOP`, `RESET`: supervisor mode only |

Shifts accept a count of 1 to 8 as an immediate (`LSL.W #3,D0`) or of 0 to 63 in a data register
(`LSL.L D1,D0`). On a memory location, they apply only to a word, and by a single position.

```asm
        MOVE.W  #$1234,D0
        LSL.W   #4,D0           ; D0.W = $2340: one hex digit to the left (x 16)
        ROL.W   #4,D0           ; D0.W = $3402: the digit shifted out on the left comes back on the right
        MOVE.W  #-20,D1
        ASR.W   #2,D1           ; D1.W = -5: division by 4 that keeps the sign
```

> Sheet expanded and corrected on 10/21/2026 (Claude): `&` notation removed, carry of
> subtractions corrected (on the 68000, C = borrow), `DBEQ` delay loop replaced, PC-relative
> modes, `DBRA`, `Scc`, summary table.
