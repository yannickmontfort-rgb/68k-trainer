## Changing color mid-frame

The Shifter reads the palette at the start of each line it displays. If a program changes a color
while the frame is being drawn, the top of the screen keeps the old shade and the bottom takes the
new one: that is the principle of **rasters**, the scrolling color bars of demos, which show far
more than 16 colors on a single screen.

You still have to change the color at the right moment, on a precise line, frame after frame. That
is the job of the MFP's Timer B.

## Timer B counts lines

Timer B has a mode in which it counts events rather than time, and on the ST each end of a
displayed line is one. In mode 8, stored in its control register TBCR, it subtracts 1 from its
counter at each line and triggers its interrupt when it reaches 0. It then reloads its starting
value by itself, stored in TBDR, and starts again.

| Address | Register | Role |
|---|---|---|
| `$FFFFFA1B` | TBCR | control: 0 stops the timer, 8 makes it count lines |
| `$FFFFFA21` | TBDR | the number of lines before the interrupt |
| `$FFFFFA07` | IERA | bit 0: Timer B interrupt enabled |
| `$FFFFFA13` | IMRA | bit 0: Timer B interrupt unmasked |
| `$FFFFFA0F` | ISRA | bit 0 to clear at the end of the routine |
| `$120` | vector | the address of the Timer B routine |

## The outline of a raster program

At each frame, the VBL routine restores the color of the top of the screen, stops Timer B, stores
in TBDR the number of lines before the first change and restarts it in mode 8, then chains to the
TOS VBL. The Timer B routine, called each time the counter reaches 0, changes the color, clears
bit 0 of ISRA to tell the MFP the interrupt has been handled, and returns with `RTE`.

Installing and removing are done in supervisor mode, through `Supexec`, as for the VBL: you keep
the system's `$70` and `$120` vectors, you enable and unmask Timer B, and when leaving you stop the
timer and give everything back as you found it, background color included.

In 68k Trainer, rasters show in "Real time", and the check of an exercise looks at the displayed
frame, line by line.
