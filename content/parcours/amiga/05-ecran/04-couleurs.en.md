## Stacking the planes

With n planes, each pixel has n bits, one in each plane, and can therefore take 2ⁿ colors. You
read its color number by taking **the bit from plane 1 as bit 0**, the one from plane 2 as bit 1,
and so on:

| Plane 3 | Plane 2 | Plane 1 | Color | Register |
|---|---|---|---|---|
| 0 | 0 | 0 | 0 | `COLOR00` (`$180`) |
| 0 | 0 | 1 | 1 | `COLOR01` (`$182`) |
| 0 | 1 | 0 | 2 | `COLOR02` (`$184`) |
| 0 | 1 | 1 | 3 | `COLOR03` (`$186`) |
| 1 | 0 | 0 | 4 | `COLOR04` (`$188`) |
| … | | | | |

The register for color n is at `$DFF180 + 2 × n`.

| Planes | Colors | Memory (320 × 256) |
|---|---|---|
| 1 | 2 | 10 KB |
| 2 | 4 | 20 KB |
| 3 | 8 | 30 KB |
| 4 | 16 | 40 KB |
| 5 | 32 | 50 KB |

The number of planes goes in bits 14-12 of `BPLCON0`: `$1200` for 1 plane, `$2200` for 2,
`$5200` for 5. Each plane has its own pointer: `BPL1PT` (`$0E0`), `BPL2PT` (`$0E4`), `BPL3PT`
(`$0E8`)…

## Drawing in color

To give a pixel color 3, you set its bit in plane 1 and in plane 2; for color 2, you set it in
plane 2 and clear it in plane 1. An erased pixel has all its bits at 0 and takes the background
color.

## Six planes and more

In low resolution, the A500 accepts up to 6 planes, with two special modes. In Extra Half-Brite,
colors 32 to 63 are colors 0 to 31 at half brightness, which gives 64 colors on screen with only
32 registers. In HAM (*Hold And Modify*, bit 11 of `BPLCON0`), planes 5 and 6 say whether the
pixel takes a color from the palette or modifies one component (red, green or blue) of the
previous pixel: all 4096 colors are on screen, at the cost of colored fringes.

In high resolution, 640 pixels wide with bit 15 of `BPLCON0`, you are limited to 4 planes.

## Why not always 32 colors?

Each plane costs 10 KB of Chip RAM. Moreover, up to 4 planes in low resolution, Agnus reads the
image during slots the 68000 does not use; beyond that, it has to take part of the 68000's Chip RAM
accesses away, and the program slows down. Games therefore often choose 4 or 5 planes.
68k Trainer does not simulate this slowdown.
