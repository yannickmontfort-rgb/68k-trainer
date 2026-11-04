## Two kinds of errors

The first is the assembly error: the assembler rejects your text because of a misspelled
instruction (`MOVX`), an impossible size (`MOVE.B D0,A1`) or a register that does not exist (`D8`).
The faulty line is underlined in red and a message explains the problem; this is the easiest
error to fix.

The second is the runtime error: the program assembles, but it does something other than what you
wanted. Either the result is wrong, which is a logic error, or the processor stops on an
exception.

:::atari
On a real Atari, an unexpected exception shows bombs on the screen, and their number tells you the
cause.

| Bombs | Exception | Typical cause |
|---|---|---|
| 2 | bus error | access to a protected area, such as the hardware in user mode |
| 3 | address error | word or long word read or written at an odd address |
| 4 | illegal instruction | the processor is executing data: a forgotten `RTS`, a damaged stack |
:::
:::amiga
On a real Amiga, an unexpected exception shows the flashing red box "Software Failure — Guru
Meditation #0000000N.xxxxxxxx", where N is the exception number.

| Guru | Exception | Typical cause |
|---|---|---|
| `#00000003` | address error | word or long word read or written at an odd address |
| `#00000004` | illegal instruction | the processor is executing data: a forgotten `RTS`, a damaged stack |
| `#00000005` | division by zero | `DIVU` or `DIVS` by 0 |
| `#00000008` | privilege violation | an instruction reserved for supervisor mode, such as `MOVE … ,SR` or `STOP` |
:::

In 68k Trainer, the program stops on the offending instruction, with a message explaining what
happened.

## A three-step method

Changing lines at random until the program works wastes time and teaches you nothing. Instead, you
proceed in three steps.

1. Form a hypothesis: "D0 should be 14 and it is 7, so the addition was probably done on the wrong
   register."
2. Inspect step by step, where the registers that have just changed light up in yellow, to find the
   first line where reality departs from what you expected.
3. Fix that line only, then run again to check.

Get into the habit of predicting what each line does before pressing "Step": that is how the error
jumps out at you.
