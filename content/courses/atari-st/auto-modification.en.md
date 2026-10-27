---
title: "Self-modifying programs"
source: "cours_asm_68000.pdf — Le Féroce Lapin, Volume 2, lesson 6 (adapted); M68000PRM and MC68030 User's Manual (Motorola). Completed and corrected on October 21, 2026."
themes: ["technique-avancee"]
---

# Self-modifying programs

> The technique works on any 68000, not only on the Atari ST. It was a favorite of demos and copy
> protections; today, it mostly helps you **understand** what a program in memory really is.

In memory, a program is only a sequence of numbers, exactly like data. Nothing therefore stops a
program from writing into its own code area to modify an instruction that has already been
assembled, as long as the result remains a valid operation code.

## Reading the encoding of an instruction

The 68k Trainer debugger shows the bytes of each instruction, as MONST or the `npm run desasm`
disassembler do. Here are a few common encodings:

| Instruction | Encoding | Size |
|---|---|---|
| `NOP` | `$4E71` | 2 bytes |
| `RTS` | `$4E75` | 2 bytes |
| `RTE` | `$4E73` | 2 bytes |
| `ILLEGAL` | `$4AFC` | 2 bytes |
| `MOVEQ #n,D0` | `$70nn` | 2 bytes |
| `BRA.S` displacement *d* | `$60dd` | 2 bytes |
| `MOVEA.L #address,A0` | `$207C` followed by the 4-byte address | 6 bytes |
| `MOVE.W #value,D0` | `$303C` followed by the 2-byte value | 4 bytes |

## Patching an immediate operand

You find the offset, in bytes, at which the operand to change begins inside the instruction, then
you write directly to `label+offset`:

```asm
AFFICHE MOVEA.L #TABLEAU,A0     ; 6 bytes: $207C, then the address of TABLEAU (AFFICHE+2)
        MOVE.W  (A0),D0         ; reads the current element
        CMP.W   #$FFFF,D0       ; end of the table?
        BNE.S   .suivant
        MOVE.L  #TABLEAU,AFFICHE+2 ; yes: resets the embedded pointer to the start
        BRA.S   AFFICHE
.suivant ADDQ.L #2,AFFICHE+2    ; moves the pointer forward INSIDE the instruction (one word further)
        ; ... use D0 ...
        RTS
```

The first word, `AFFICHE+0`, is the `$207C` opcode itself, and `AFFICHE+2` refers to the immediate
address of `MOVEA.L #xxx,A0`, a long. The instruction thus becomes the pointer, with no separate
variable. You modify the whole long (`ADDQ.L #2,AFFICHE+2`), because adding 2 to the low word of
the address alone would leave the high word unchanged if the table crossed a 64 KB boundary.

The trap lies in precision: an error of a single byte in the offset turns the patched instruction
into something else, an illegal opcode or, worse, a valid but different instruction. Comment
generously, since the listing in front of you is no longer what runs.

## Replacing a whole instruction

Writing `$4E75` (`RTS`) at the start of a routine turns it into an immediate return, which cuts the
routine off without rewriting it; `$4E71` (`NOP`) neutralizes a 2-byte instruction.

```asm
        MOVE.W  #$4E75,ROUTINE  ; from now on, BSR ROUTINE returns at once
        MOVE.W  #$4E71,TEST     ; this word no longer does anything (2 bytes)
```

`NOP` does nothing but takes 4 cycles, and it is the shortest possible delay.

## Swapping whole versions of code

You can replace a block of several instructions with another block of the **same size**, padded
with `NOP`s if needed:

```asm
        LEA     VARIANTE,A0
        MOVE.W  #$D240,(A0)+    ; ADD.W  D0,D1        (2 bytes)
        MOVE.L  #$C2FC0003,(A0)+ ; MULU.W #3,D1       (4 bytes)
        MOVE.L  #$04410006,(A0)+ ; SUBI.W #6,D1       (4 bytes)

VARIANTE MULU.W D0,D1           ; 2 bytes: replaced by ADD.W D0,D1
        SUB.W   #8,D1           ; 4 bytes: replaced by MULU.W #3,D1
        ADD.W   #4,D0           ; 4 bytes: replaced by SUBI.W #6,D1
```

The same code area can thus serve several variants in turn. A routine called thousands of times can
also settle a test once and for all instead of repeating it on every call, and demos built on the
fly a drawing routine tailored to one specific shape.

## The trap of processors with a cache

The 68000 of the ST, the STE and the Amiga 500 fetches each instruction from memory again, so a
modification takes effect immediately. From the 68020 onward (Atari TT and Falcon, Amiga 1200 and
4000, the 68020 Amiga of WinUAE with AROS), an **instruction cache** keeps a copy of recently
executed code, and the processor may execute the old version of the modified instruction.

You then have to flush the cache after the modification:

- on the Amiga, with exec's `CacheClearU()` (`JSR -636(A6)`, Kickstart 2.0 and later);
- on the Atari TT or Falcon, in supervisor mode, by writing to the `CACR` register with `MOVEC`, an
  instruction that does not exist on the 68000.

> Self-modifying code is also incompatible with the protected memory of modern systems. Keep it for
> the cases where it really brings something, and always comment it.

> Sheet completed and corrected on October 21, 2026 (Claude): `ADDQ.L #2,AFFICHE+2` on the whole
> long, `NOP` in 4 cycles, common encodings, cache of the 68020 and later.
