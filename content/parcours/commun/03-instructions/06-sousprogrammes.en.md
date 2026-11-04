## Calling and returning

A subroutine is a piece of code that you call from several places, the equivalent of a function.

| Instruction | Effect |
|---|---|
| `BSR label` | pushes the return address, that of the next instruction, then jumps |
| `JSR address` | the same, to any address (`JSR (A0)`…) |
| `RTS` | pops the return address and jumps to it |

[[atari:TOS|amiga:The Amiga's CLI]] does exactly this with your program: it calls it, and your
final `RTS` returns to it. When one subroutine calls another, the return addresses pile up and
each one returns to the right place.

## Passing parameters

The simplest and fastest way is to pass parameters in registers, noting at the top of the
subroutine what it expects ("Input: D0.W = …") and what it returns ("Output: D0.L = …").

You can also pass them on the stack: the caller pushes them before the `BSR`, and inside the
subroutine, since the return address is at the top, the last parameter pushed is at `4(SP)`. On
return, the caller cleans up the stack with `ADDQ.L #n,SP` or `LEA n(SP),SP`.[[atari: TOS system
calls work this way.|amiga: AmigaOS libraries, on the other hand, take their parameters in
registers, as you will see in chapter 4.]]

## Not damaging the caller's registers

A subroutine that uses registers for its calculations can spoil the work of whoever called it. So
it saves them on the stack on entry and restores them on exit, with `MOVEM` (*MOVE Multiple*).

```asm
SOUSPROG:
    MOVEM.L D1-D3/A0,-(SP)  ; save D1, D2, D3 and A0
    ; ... work ...
    MOVEM.L (SP)+,D1-D3/A0  ; restore the same list
    RTS
```

`D1-D3` means D1, D2 and D3, and `/` separates groups. The list must be the same on entry and on
exit, otherwise the stack goes out of balance and `RTS` goes off anywhere.

:::atari
TOS follows a convention that many programmers adopt too: it preserves D3-D7 and A3-A6, but may
change D0-D2 and A0-A2, the scratch registers.
:::
:::amiga
Amiga libraries follow a convention that many programmers adopt too: they preserve D2-D7 and
A2-A6, may change D0, D1, A0 and A1, the scratch registers, and return their result in D0.
:::
