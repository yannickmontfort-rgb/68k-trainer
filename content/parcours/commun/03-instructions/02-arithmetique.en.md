## Adding and subtracting

| Instruction | Effect | Note |
|---|---|---|
| `ADD.t src,dst` | dst ← dst + src | one of the two operands must be a Dn |
| `SUB.t src,dst` | dst ← dst − src | same rule |
| `ADDI` / `SUBI #n,dst` | with an immediate value | the assembler picks them for you when you write `ADD #n` |
| `ADDQ` / `SUBQ #n,dst` | value from 1 to 8 only | shorter and faster |
| `ADDA` / `SUBA` | to an address register | no flag changed |
| `NEG.t dst` | dst ← 0 − dst | changes the sign |
| `EXT.W` / `EXT.L Dn` | sign-extends a byte to a word, or a word to a long | before mixing sizes |

Additions and subtractions set all five flags, as you saw in the previous chapter.

## Multiplying

```text
    MULU    src,Dn      ; unsigned: Dn.L ← Dn.W × src.W
    MULS    src,Dn      ; signed
```

The 68000 multiplies two 16-bit words and stores the 32-bit product in the destination register,
ignoring the high words of the operands. `MULU` treats them as unsigned and `MULS` as signed, so
`$FFFF × 2` is 131,070 with `MULU` but −2 with `MULS`.

## Dividing

```text
    DIVU    src,Dn      ; Dn.L ÷ src.W, unsigned
    DIVS    src,Dn      ; signed
```

The 68000 divides the long word Dn by a word and stores the result in Dn in two pieces.

| Bits of Dn | 31 … 16 | 15 … 0 |
|---|---|---|
| Content | the remainder | the quotient |

After `DIVU #5,D0` with D0 = 47, the quotient is 9 and the remainder 2, so D0 = `$00020009`; a
`SWAP D0` moves the remainder into the low word.

A division by zero raises exception no. 5, [[atari:five bombs on an ST|amiga:Guru Meditation #00000005 on the Amiga]].
And if the quotient does not fit in 16 bits, the V flag goes to 1 and the register is left unchanged.
