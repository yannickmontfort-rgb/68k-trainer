## Numbered bytes

To the 68000, memory is a long row of bytes, each one identified by its address, from `$000000` to
`$FFFFFF`, which makes 16 MB. A word takes up two consecutive bytes, a long word four.

## Most significant byte first

The 68000 stores a number in the order you write it, with the most significant byte at the lowest
address. After `MOVE.L #$12345678,$2000`, memory contains:

| Address | $2000 | $2001 | $2002 | $2003 |
|---|---|---|---|---|
| Content | `$12` | `$34` | `$56` | `$78` |

## Words and longs at even addresses

The 68000 always reads and writes words and long words at an **even** address. At an odd address,
it stops on an address error: [[atari:three bombs on the Atari ST|amiga:Guru Meditation #00000003 on the Amiga]].
Bytes, on the other hand, can sit at any address.

## Storing data in the program

Directives are not 68000 instructions but orders given to the assembler, which stores values or
reserves space in the program.

| Directive | Effect | Example |
|---|---|---|
| `DC.B` `DC.W` `DC.L` | stores values | `TABLE: DC.W 10,20,30` |
| `DS.B` `DS.W` `DS.L` | reserves space, set to zero | `TAMPON: DS.B 80` |
| `EVEN` | moves on to the next even address | after a text |

A text is written between apostrophes and often ends with a 0, as in
`DC.B '[[atari:ATARI|amiga:AMIGA]]',0`. Since it can take up an odd number of bytes, you put `EVEN`
right after it so that what follows lands on an even address again. The exercise about the lone
label shows what happens when you forget it.

:::atari
## The Atari ST memory

| Addresses | Content |
|---|---|
| `$000000`–`$0003FF` | exception vectors |
| `$000400`–`$0007FF` | TOS system variables |
| `$000800`–… | free memory: your program, its data, the stack |
| `$0F8000`–`$0FFFFF` | the screen of a 1040 ST (32,000 bytes) |
| `$FC0000`–`$FEFFFF` | TOS, in ROM |
| `$FF8000`–`$FFFFFF` | hardware registers: video, palette, sound |
:::
:::amiga
## The Amiga 500 memory

| Addresses | Content |
|---|---|
| `$000000`–`$0003FF` | exception vectors; at `$4`, the address of ExecBase |
| `$000400`–`$07FFFF` | Chip RAM (512 KB): everything the chips read, screens and sounds included |
| `$C00000`–`$C7FFFF` | Slow RAM (512 KB expansion), invisible to the chips |
| `$BFD000`–`$BFEF01` | the two CIAs: mouse, joystick, keyboard, timers |
| `$DFF000`–`$DFF1FF` | the custom chips: screen, Copper, Blitter, sound |
| `$FC0000`–`$FFFFFF` | Kickstart, in ROM |

Unlike the ST, the Amiga's screen has no fixed address: only address `$4` is fixed, and it leads to
ExecBase, from which you can find the rest of the system.
:::
