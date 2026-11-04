## MOVE

A large part of an assembly program consists of moving data around, from one register to another,
from memory to a register or from one address to another. That is the job of `MOVE`, which sets N
and Z according to the value copied and clears V and C.

```text
    MOVE.size  source,destination
```

## Addressing modes

The addressing mode tells the 68000 where to find an operand. It knows about a dozen of them, and
almost every instruction accepts them.

| Mode | Syntax | Example | The operand is… |
|---|---|---|---|
| data register | `Dn` | `MOVE.W D1,D0` | the contents of D1 |
| address register | `An` | `MOVEA.L A0,A1` | the contents of A0 |
| immediate | `#value` | `MOVE.W #100,D0` | the value 100 itself |
| absolute | `address` | `MOVE.W $2000,D0` | the word stored at address $2000 |
| indirect | `(An)` | `MOVE.W (A0),D0` | the word at the address held in A0 |
| indirect with postincrement | `(An)+` | `MOVE.W (A0)+,D0` | the same, then A0 moves forward by the size read |
| indirect with predecrement | `-(An)` | `MOVE.W D0,-(A1)` | A1 moves back first, then the write goes to address A1 |
| indirect with displacement | `d16(An)` | `MOVE.W 4(A0),D0` | the word at address A0 + 4, without changing A0 |
| indirect with index | `d8(An,Xn)` | `MOVE.W 0(A0,D1.W),D0` | the word at address A0 + D1 |
| PC-relative | `d16(PC)` | `MOVE.W TABLE(PC),D0` | data in the program, located relative to the PC |

The indirect modes are the strength of the 68000, because in them an address register acts as a
pointer that you move through a table: `(A0)+` walks through a table one element at a time,
`d16(An)` reads a field at a fixed position, and `d8(An,Dn.W)` reaches `TABLE[i]` when the index is
in a data register.

The destination can be neither an immediate value, since `MOVE.W D0,#5` makes no sense, nor a
PC-relative address.

## The MOVE family

| Instruction | Role | Note |
|---|---|---|
| `MOVEA` | MOVE to an address register | no `.B`, sign extension in `.W`, flags untouched |
| `MOVEQ #n,Dn` | quickly loads a small number | from −128 to 127, always in `.L`, only to a Dn |
| `CLR` | sets to zero | `CLR.L D0` |
| `LEA ea,An` | loads an address, not the data stored there | `LEA TABLE,A0` |
| `EXG Rx,Ry` | swaps two registers | |
| `SWAP Dn` | swaps the two words of a data register | |
