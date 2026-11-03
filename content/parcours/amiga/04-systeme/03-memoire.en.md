## Chip RAM, Fast RAM

The Amiga has two kinds of memory. **Chip RAM**, 512 KB starting at `$000000` on an A500, is
shared between the 68000 and the custom chips: everything the chips must read, the image to
display, the Copper lists, the sounds, the graphics for the Blitter, must be there. Fast RAM, on
the other hand, is visible only to the 68000. On an A500, the 512 KB expansion card, at `$C00000`,
is not really fast and is called Slow RAM, but it is just as invisible to the chips.

An image stored outside Chip RAM does not crash the machine: the chips simply read something
else, and the screen shows garbage. It is a classic bug, and a silent one.

## Asking for memory: AllocMem

A program does not choose by itself where to store its data, it asks exec for it:

```asm
    MOVEA.L 4.W,A6
    MOVE.L  #10240,D0       ; D0 = the size, in bytes
    MOVE.L  #$10002,D1      ; D1 = the type: MEMF_CHIP + MEMF_CLEAR
    JSR     -198(A6)        ; AllocMem: D0 = the address of the block, or 0
    TST.L   D0
    BEQ     plusdememoire
    MOVE.L  D0,tampon
```

The type is a sum of flags:

| Flag | Value | Meaning |
|---|---|---|
| `MEMF_ANY` | 0 | any kind (Fast RAM preferred) |
| `MEMF_PUBLIC` | 1 | can be shared with other tasks |
| `MEMF_CHIP` | 2 | Chip RAM required |
| `MEMF_FAST` | 4 | Fast RAM required |
| `MEMF_CLEAR` | `$10000` | filled with zeros |

`AllocMem` returns 0 when there is not enough memory left, so you must test D0.

## Giving memory back: FreeMem

Exec frees nothing on its own, even when your program ends: every block you received must be
given back with `FreeMem(address, size)(A1, D0)` (−210), **with exactly the same size**.

```asm
    MOVEA.L tampon,A1
    MOVE.L  #10240,D0
    MOVEA.L 4.W,A6
    JSR     -210(A6)        ; FreeMem
```

Giving the same block back twice, or passing the wrong size, damages the free memory lists, and a
real Amiga stops on a Guru Meditation #81000009. Forgetting to give a block back crashes nothing,
but that memory stays lost until the next reboot.

## How much is left?

`AvailMem(type)(D1)` (−216) returns in D0 the number of free bytes of the requested type. With
`MEMF_LARGEST` (`$20000`) added, it returns the size of the largest contiguous block, the one that
matters when reserving a whole screen.

## In 68k Trainer

The program is loaded at `$1000`, in Chip RAM. `AllocMem` gives free Chip RAM starting at
`$40000`, and Slow RAM starting at `$C00000` when you do not ask for `MEMF_CHIP`.
