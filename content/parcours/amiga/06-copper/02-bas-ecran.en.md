## Lines beyond 255

The PAL image has 313 lines, but WAIT only compares **8 bits** of the line and therefore only sees
numbers 0 to 255. Lines 256 to 312 carry the same numbers as lines 0 to 56: a `DC.W $1007,$FFFE`
waits for line `$10`, at the very top of the image, and its condition stays met for the whole rest
of the image.

The classic trick is to wait first for the end of line 255:

```asm
    DC.W    $FFDF,$FFFE     ; wait for the end of line 255 (position $DE)
    DC.W    $1007,$FFFE     ; now, $10 means line $110 (272)
    DC.W    $0180,$0F00
```

After line 255, the 8-bit counter starts again from 0, and the Copper does wait for line
256 + `$10`. The standard image (`DIWSTOP` = `$2CC1`) ends at line `$12C` (300), so its last 44
lines are below line 255.

## Comparing only some bits

The second word of a WAIT is a mask, whose bits 14-8 apply to the line and bits 7-1 to the
horizontal position. With `$FFFE`, everything is compared. With `$80FE`, you only compare bit 7 of the
line, which is always compared anyway, and the position: such a WAIT is met on every line from the
requested position onward, which is useful to repeat an effect but calls for caution.

Bit 15 (*Blitter Finish Disable*), when it is 0, also makes the WAIT wait for the Blitter to
finish.

## SKIP

`SKIP` has the same form as WAIT, with bit 0 of the second word at 1: if the beam has already
passed the position, the Copper skips the next instruction. Combined with a write to `COPJMP1` or
`COPJMP2`, it allows loops in the copper list, which are rarely used.
