---
title: "Registers, memory, and binary/hexadecimal"
source: "cours_asm_68000.pdf — Le Féroce Lapin, Volume 1, lessons 2 to 4 (adapted); M68000PRM (Motorola). Expanded and corrected on 10/21/2026."
themes: ["transfert", "adressage"]
---

# Registers, memory, and binary/hexadecimal

## Counting in binary and hexadecimal

A computer knows only two states, current flows or it does not, written `1` and `0`: this is the
**bit** (*binary digit*). With *n* bits, you can encode 2ⁿ combinations.

| Bits | Combinations | Unsigned values | Signed values (two's complement) |
|---|---|---|---|
| 1 | 2 | 0 to 1 | — |
| 4 | 16 | 0 to 15 | — |
| 8 | 256 | 0 to 255 | −128 to 127 |
| 16 | 65,536 | 0 to 65,535 | −32,768 to 32,767 |
| 32 | 4,294,967,296 | 0 to 4,294,967,295 | −2,147,483,648 to 2,147,483,647 |

Bits are grouped into packets, each with its own name:

- 1 bit = bit
- 4 bits = nibble
- 8 bits = byte, size `.B`
- 16 bits = word, size `.W`
- 32 bits = long word, size `.L`

Written in binary, a number quickly becomes unreadable, since a word already takes 16 digits. So
you group the bits by four and write each group in **hexadecimal**, base 16, with the digits `0-9`
followed by `A-F` for 10 to 15. One hexadecimal digit is worth 4 bits: a byte takes 2 digits, a
word 4 and a long word 8.

A prefix in front of the number gives its base:

| Prefix | Base | Example |
|---|---|---|
| `%` | binary | `%1101` |
| `$` | hexadecimal | `$D` |
| *(none)* | decimal | `13` |

`%1101`, `$D` and 13 are therefore the same number. You can also write a character between single
quotes: `'A'` is `$41`, its ASCII code.

### Negative numbers: two's complement

The 68000 encodes signed integers in two's complement: to get −*n*, it inverts all the bits of *n*,
as `NOT` does, then adds 1, which is exactly what the `NEG` instruction does. The most significant
bit (bit 7, 15 or 31 depending on the size) serves as the sign bit, set to 1 when the number is
negative.

| Value | Byte | Word |
|---|---|---|
| 1 | `$01` | `$0001` |
| −1 | `$FF` | `$FFFF` |
| −2 | `$FE` | `$FFFE` |
| −128 | `$80` | `$FF80` |

The same bit pattern can therefore be read in two ways: `$FF` is 255 unsigned and −1 signed. The
branch you choose after a comparison decides the interpretation, `BHI`/`BCS`… for unsigned,
`BGT`/`BLT`… for signed (see [the reference](reference-meyne-hoppenot.md)).

## The 68000 registers

The 68000 has 17 32-bit registers for calculations and addresses, plus the program counter and the
status register:

- 8 data registers, `D0`-`D7`, for any values;
- 8 address registers, `A0`-`A7`, for memory addresses. `A7` is the stack pointer (`SP`) and comes
  in two copies, `USP` for user mode and `SSP` for supervisor mode, hence the count of 17;
- the PC (*Program Counter*), 32 bits of which 24 are used on the 68000, which holds the address of
  the next instruction to read;
- the SR (*Status Register*), 16 bits, which holds the flags and the state of the processor (see
  below).

Electrically, an address register and a data register are identical, but the processor itself
enforces the usage convention that sets them apart:

- In a data register, an operation on a byte or a word touches only the low part (the 8 or 16
  least significant bits), and the rest is neither read nor modified.
- An address register does not accept a byte-sized operand. As a destination, it is always written
  in full: a word is **sign-extended** to 32 bits. As a source, only the useful part (word or long)
  is read.
- Instructions that target an address register (`MOVEA`, `ADDA`, `SUBA`) do not change the flags.

To move a value into an address register, you write `MOVEA` (*MOVE Address*), and if you write
`MOVE`, the assembler makes the substitution itself.

```asm
        MOVE.L  #$12345678,D0   ; D0 = $12345678
        MOVE.B  #$AA,D0         ; only the low-order byte changes: D0 = $123456AA
        MOVE.W  #$BEEF,D0       ; only the low-order word changes: D0 = $1234BEEF

        MOVEA.L #$12345678,A0   ; A0 = $12345678 (whole register)
        MOVEA.W #$1234,A0       ; A0 = $00001234: the word is extended to 32 bits (bit 15 at 0)
        MOVEA.W #$8000,A0       ; A0 = $FFFF8000: bit 15 at 1, so 16 bits at 1 in front
```

A 32-bit register holds two words, the high-order one and the low-order one, each made of two
bytes. `SWAP Dn` exchanges the two words, and `EXT.W` / `EXT.L` extend the sign of a byte to a
word, or of a word to a long.

```asm
        MOVE.L  #$12345678,D0
        SWAP    D0              ; D0 = $56781234
        MOVE.B  #$F0,D1         ; low byte of D1 = $F0 (−16 signed)
        EXT.W   D1              ; low word of D1 = $FFF0 (still −16)
        EXT.L   D1              ; D1 = $FFFFFFF0
```

`MOVEQ #n,Dn` loads a small value, from −128 to 127, into the whole register by extending it to 32
bits; the instruction takes only 2 bytes and runs faster than `MOVE.L #n,Dn`.

## Memory as a ribbon of bytes

You can picture memory as a long ribbon of bytes in which each cell has an address, its distance
from the start of the ribbon. A word occupies 2 consecutive cells and a long occupies 4. The 68000
is **big endian**: it stores the most significant byte at the lowest address.

```asm
        MOVE.L  #$12345678,$1000 ; $1000 = $12, $1001 = $34, $1002 = $56, $1003 = $78
        MOVE.W  $1000,D0         ; D0.W = $1234 (the first two bytes)
        MOVE.B  $1003,D1         ; D1.B = $78
```

The 68000 reads or writes a word or a long only at an even address. An odd address triggers an
address error, exception no. 3, which gives 3 bombs on the Atari ST and a Guru Meditation on the
Amiga. Bytes, on the other hand, can sit at any address.

The PC is itself an address. On the 68000, the address bus is 24 bits wide, so the addressable
space is 16 MB (`$000000` to `$FFFFFF`) and the 8 high-order bits of an address are ignored.
Writing addresses on 32 bits anyway (`$FFFF8240` rather than `$FF8240`) keeps a program valid on
the 68020 and later (Atari TT/Falcon, Amiga 1200).

## The status register (Status Register / SR)

The SR is a 16-bit register whose low byte forms the CCR (*Condition Code Register*):

```
bit   15 14 13 12 11 10 9  8  7 6 5 4 3 2 1 0
      T  .  S  .  .  I2 I1 I0 . . . X N Z V C
```

| Bit | Name | Role |
|---|---|---|
| 0 | **C** (*Carry*) | carry (addition) or borrow (subtraction), last bit shifted out |
| 1 | **V** (*oVerflow*) | **signed** overflow: the result does not fit in the chosen size |
| 2 | **Z** (*Zero*) | the result is 0 |
| 3 | **N** (*Negative*) | the sign bit of the result is 1 |
| 4 | **X** (*eXtend*) | copy of C for calculations in several pieces (`ADDX`, `SUBX`, `ROXL`…) |
| 8-10 | **I2 I1 I0** | interrupt mask: only interrupts of a **higher** level are accepted (level 7 always is) |
| 13 | **S** (*Supervisor*) | 1 = supervisor mode, 0 = user mode |
| 15 | **T** (*Trace*) | 1 = exception after **each** instruction (this is how debuggers single-step) |

In user mode, you can modify only the CCR (`MOVE …,CCR`, `ANDI #…,CCR`). The 68000 lets you read
the whole SR (`MOVE SR,…`), which the 68010 and later forbid. Modifying the whole SR
(`MOVE #$2700,SR`) or executing `STOP`, `RESET` or `RTE` causes a privilege violation, exception
no. 8. You enter supervisor mode through an exception (`TRAP`, interrupt…) or through a system call
designed for it, `Super`/`Supexec` under TOS, `Supervisor`/`SuperState` under Exec.

Once in supervisor mode, `MOVE #$2700,SR` sets the mask to 7 and blocks every interrupt except
those of level 7, while `MOVE #$2300,SR` matches the normal TOS level on the Atari ST.

The details of how flags are set and of the branches that test them are in the
[Reference](reference-meyne-hoppenot.md) sheet; exceptions and processor modes are covered in the
"supervisor and vectors" chapters of the course.

> Sheet expanded and corrected on 10/21/2026 (Claude): two's complement, big endian, EXT/MOVEQ,
> flag table, processor modes.
