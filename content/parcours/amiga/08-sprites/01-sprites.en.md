## Eight hardware sprites

A **sprite** is a small drawing that Denise lays over the picture without touching the bitplanes,
so you neither have to erase it nor save the background under it. The Amiga has 8 of them,
numbered 0 to 7, each 16 pixels wide in low resolution and as tall as you like. The Workbench mouse
pointer is sprite 0.

## The format of a sprite

A sprite is a list of words in Chip RAM:

```asm
sprite:
    DC.W    $6050,$7000     ; two control words: position and height
    DC.W    %0000011111100000,%0000000000000000 ; line 1: DATA, DATB
    DC.W    %0001111111111000,%0000011111100000 ; line 2
    ; ... one pair of words per line ...
    DC.W    0,0             ; end of the sprite
```

For each line, the two words DATA and DATB give 2 bits per pixel, hence 3 colors plus
transparency:

| DATB | DATA | Pixel |
|---|---|---|
| 0 | 0 | transparent: you see the picture underneath |
| 0 | 1 | sprite color 1 |
| 1 | 0 | color 2 |
| 1 | 1 | color 3 |

Sprites come in pairs that share their colors: sprites 0 and 1 use `COLOR17`, `COLOR18` and
`COLOR19`, sprites 2 and 3 `COLOR21` to `23`, 4 and 5 `COLOR25` to `27`, 6 and 7 `COLOR29` to
`31`.

## The control words

Positions are counted like those of the beam, in the manner of DIWSTRT: the standard display
starts at line `$2C` and at horizontal position `$81`.

| Word | Bits 15-8 | Bits 7-0 |
|---|---|---|
| first (SPRxPOS) | the 8 low bits of the start line, VSTART | the 8 high bits of the horizontal position, HSTART ÷ 2 |
| second (SPRxCTL) | the 8 low bits of the end line, VSTOP (the line after the last one) | bit 2 = bit 8 of VSTART, bit 1 = bit 8 of VSTOP, bit 0 = bit 0 of HSTART |

For a 16-line sprite placed at (x, y) in the standard display:

```
HSTART = $81 + x        VSTART = $2C + y        VSTOP = VSTART + 16
```

## Displaying and moving it

The sprite DMA (bit 5 of DMACON, SPREN) reads each sprite from its pointer `SPRxPT`: `$120` for
sprite 0, `$124` for sprite 1, and so on up to `$13C`. Like the bitplane pointers, these pointers
move forward during the frame, and the copper list resets them every frame. A sprite you do not
use must point to an empty list, two words at 0, otherwise it displays whatever it finds in
memory.

To move a sprite, you rewrite its two control words once per frame, and the drawing does not
change: this is what makes sprites so cheap.

## In front or behind

`BPLCON2` sets the priority between the sprites and the bitplanes. With `$0024`, all the sprites go
in front of the picture; with 0, the picture goes in front of them, except where it is in color 0.
Between two sprites, the lower number is in front.
