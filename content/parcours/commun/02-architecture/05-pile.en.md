## A stack of plates

The stack is an area of memory where the program sets values down for a while. As with a stack of
plates, you always take back the last one you put down.

Register A7, also called SP, points to the top of the stack. On the 68000, the stack grows down
towards low addresses: pushing therefore makes SP decrease.

## Push, pop

| Action | Instruction | What happens |
|---|---|---|
| push D0 | `MOVE.L D0,-(SP)` | SP moves back by 4, then D0 is written at address SP |
| pop into D1 | `MOVE.L (SP)+,D1` | the long at address SP goes into D1, then SP moves forward by 4 |

The `-` before the parenthesis means you move back first, the `+` after it that you move forward
afterwards. You will meet these two modes again in the next chapter, to walk through tables. To
keep SP even, pushing a byte still moves it down by 2.

## A balanced stack

When [[atari:TOS|amiga:the CLI]] starts your program, it puts the address to return to on the
stack, and that is what `RTS` takes back at the end. If your program has left a value on the
stack, `RTS` takes it for that return address and the processor jumps anywhere.

So before each `RTS`, you must pop as many bytes as you pushed.

## Two stacks

The 68000 actually has two stack pointers, USP for user mode and SSP for supervisor mode; A7 refers
to the one for the current mode, and the step-by-step view shows both.
