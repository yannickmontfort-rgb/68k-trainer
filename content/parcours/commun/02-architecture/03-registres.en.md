## Slots inside the processor

Registers are small slots inside the 68000, which it can reach much faster than memory. It has two
families of them, plus the program counter.

## D0 to D7: data

The 68000 does its calculations in the data registers, which accept all three sizes `.B`, `.W` and
`.L`.

## A0 to A7: addresses

Address registers hold the address of a piece of data in memory: they are pointers. They differ
from data registers in three ways.

- They do not accept bytes: the assembler rejects `MOVE.B D0,A1`.
- In `.W`, the whole register is filled, because the 68000 copies bit 15 into bits 16 to 31: this
  is sign extension.

  ```asm
      MOVEA.W #$1234,A0   ; A0 = $00001234
      MOVEA.W #$8000,A1   ; A1 = $FFFF8000
  ```

- `MOVEA`, `ADDA` and `SUBA` leave the flags unchanged.

To load an address, you most often use `LEA`: `LEA $2000,A0` puts `$2000` in A0. Register A7 also
acts as the stack pointer, and is then called SP.

## PC: the next instruction

The program counter, PC, holds the address of the next instruction to execute. It moves forward
after each instruction, and a jump changes it; you can watch it advance in the step-by-step view.
