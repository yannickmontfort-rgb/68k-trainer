## Debugging on the Amiga

When a program crashes on a real Amiga, the red "Software Failure" box shows the **Guru
Meditation**: `#0000000N.xxxxxxxx`. N is the number of the 68000 exception (3 for an address
error, 4 for an illegal instruction, 5 for a division by zero…), and the second part is the
address of the task. Codes that start with `8` come from exec itself: `#81000009` reports memory
freed twice.

The debuggers of the time, MonAm (with Devpac) or the one in ASM-One, let you, like 68k Trainer,
step through a program, set breakpoints, and read the registers and memory. A program that has
shut off the system, its interrupts and its DMA, however, can no longer be followed by a debugger
that relies on that system.

## The golden rules

1. Everything the chips read is in Chip RAM: copper lists, bitplanes, sprites, sounds
   (`SECTION …,DATA_C` or `BSS_C`, or `AllocMem` with `MEMF_CHIP`).
2. You wait for the Blitter before touching its registers or reading what it has written.
3. Bit 15 of DMACON, INTENA and INTREQ says whether you turn on (SET) or turn off (CLR).
4. You hand the system back exactly as you found it: DMA, interrupts, vectors, copper list, view,
   Blitter, Permit, memory, libraries.
5. An interrupt routine clears its request in INTREQ before the `RTE`.
6. No hard-coded addresses, except `$4` and the chip registers: ExecBase, the libraries and memory
   are requested from the system.
7. You do not rely on speed, because an Amiga 1200 or 4000 runs faster than an A500: you sync to
   the beam or the VBL, never to delay loops.

## What 68k Trainer does not simulate

The simulated Amiga stays simple, and its few differences from the real one change nothing for
the programs in this course:

- the Blitter does its work in one go, but stays "busy" for as long as it would really need;
- the 68000 is never slowed down by the chips reading Chip RAM;
- the Copper changes the colors at the right place on the line, but the other display registers
  are taken into account for the whole line;
- there is no floppy disk, no interlaced screen and no sprite collisions, and only one program runs
  at a time.

If a program works here but not on your machine, report it (see "About").
