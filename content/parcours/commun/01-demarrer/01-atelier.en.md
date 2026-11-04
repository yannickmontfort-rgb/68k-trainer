## What the 68000 really understands

The Motorola 68000 in [[atari:the Atari ST|amiga:the Amiga]] understands nothing but numbers: every
instruction it executes is a binary code stored in memory. The word `$303C`, for instance, means to
it "load a 16-bit value into register D0".

Since writing these codes by hand would be exhausting, we write the program in assembly language,
using easy-to-remember names called mnemonics:

```asm
    MOVE.W  #5,D0       ; put 5 in register D0
```

A program, the assembler, then translates this text into machine code. Each instruction line
becomes one machine code and nothing else, which makes assembly both very direct and very
demanding.

:::atari
## The workshop, on a real ST and here

| On an Atari ST (Devpac 2) | In 68k Trainer |
|---|---|
| GENST: editor and assembler | the 68k Trainer editor and assembler, using Devpac syntax |
| MONST: step-by-step debugger | the Step-by-step panel: registers, status register, stack, memory, screen |
| TOS, the Atari's operating system | a simulated TOS: the main system calls, the memory and the screen of a 1040 STF |

The simulated 68000 executes the same machine code as the real one: what you write here also runs
on an Atari ST or in Hatari.
:::
:::amiga
## The workshop, on a real Amiga and here

| On an Amiga (Devpac 2 or ASM-One) | In 68k Trainer |
|---|---|
| GenAm or ASM-One: editor and assembler | the 68k Trainer editor and assembler, using Devpac syntax |
| MonAm or the ASM-One debugger | the Step-by-step panel: registers, status register, stack, memory, screen, chips |
| Kickstart in ROM and AmigaOS | a simulated Kickstart 1.3: exec, dos, graphics and the chips of an Amiga 500 |

The simulated 68000 executes the same machine code as the real one: what you write here also runs
on an Amiga or in WinUAE and FS-UAE.
:::

## How to work through the course

Each topic starts with a short lesson, followed by a worked example that you run step by step
while reading the explanation of each line. Then comes a prediction, where you read a program and
guess what it will do before running it, and finally exercises that leave you more and more on
your own: fill in (●○○), guided (●●○), then on your own (●●●).

Each chapter ends with a quiz. The ★ bonus challenges are optional and do not count towards your
progress.
