## Reading the bombs

When a program crashes, TOS displays bombs, whose number is the vector number of the exception
(chapter 4). The most frequent ones:

| Bombs | Exception | Usual cause |
|---|---|---|
| 2 | bus error | access to the hardware or the vectors in user mode, address with no memory |
| 3 | address error | word or long word access at an odd address |
| 4 | illegal instruction | the processor executes data (jump to the wrong place, damaged stack) |
| 5 | division by zero | DIVU/DIVS by 0 |
| 8 | privilege violation | supervisor-only instruction in user mode |

## The stack frame of a bus or address error

For these two exceptions, the 68000 pushes 7 words of information, the **stack frame**, which
MONST displays and which TOS stores in memory after the bombs:

| Offset from SP | Size | Contents |
|---|---|---|
| 0 | word | status word: bit 4 = read (1) or write (0), bit 3 = 0 if it was an instruction fetch, bits 2-0 = access type |
| 2 | long | the faulting address |
| 6 | word | the first word of the offending instruction |
| 8 | word | SR at the time of the fault |
| 10 | long | the pushed PC, a few bytes after the start of the offending instruction |

The faulting address often tells the whole story: an odd address betrays a forgotten `EVEN`,
`$FFFF8240` in user mode a missing `Supexec`, a crazy value an address register that was never
initialized. For the other exceptions, the frame is reduced to the SR (a word) followed by the PC
(a long word).

## The method

You start by reproducing the crash, to know which instructions lead to it. You then get closer to
it with a breakpoint, set with a click in the margin to the left of the line numbers, a little
before the suspicious spot: "Run to the end" stops on it. You then watch step by step the
registers, the stack, the memory and the Disassembly view, which shows what the processor is really
going to execute, even outside your program. Finally, you understand before you fix, one hypothesis
at a time.

On a real 68000, trace mode (the T bit of the SR) triggers an exception, vector `$24`, after each
instruction, and that is how MONST does its stepping.

## The classic traps

- A "dirty" high word: `MOVE.W` only changes the low word, and an `ADDA.L` or a `CMP.L` that
  follows also uses the high word, which holds anything; put a `MOVEQ #0` before, or `.W`
  everywhere.
- An unbalanced stack: as many registers restored as saved, as many bytes removed as pushed for
  the parameters, otherwise `RTS` returns to a crazy address.
- A forgotten `#`: `MOVE.W 5,D0` reads the memory at address 5.
- Signed or unsigned: `BGT`, `BLT`, `BGE`, `BLE` compare signed numbers; for addresses or values
  from 0 to 65,535, you need `BHI`, `BCS` (`BLO`), `BCC` (`BHS`), `BLS`.
- DBF makes N + 1 passes: for 4 elements, you load 3.
- A forgotten `EVEN` after `DC.B`: the next piece of data can land at an odd address.
