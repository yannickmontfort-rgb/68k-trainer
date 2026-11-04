## Bitplanes

The Amiga's image is made of **bitplanes**. A plane is an area of Chip RAM where each bit is a
pixel: for a 320 × 256 screen, a line is 320 bits, that is 40 bytes, and the whole plane
40 × 256 = 10,240 bytes. With a single plane, each pixel is 0 or 1, and takes color 0 (`COLOR00`)
or color 1 (`COLOR01`). Each plane is a separate block, whose lines follow one another, whereas on
the Atari ST the planes of a group of 16 pixels are interleaved word by word in a single screen
area.

## Finding a pixel

Pixel (x, y) of a plane with 40 bytes per line is in the byte

> address = start of the plane + y × 40 + x ÷ 8

and it is bit number 7 − (x mod 8) of that byte, since the leftmost pixel is bit 7.

```asm
    ; D0 = x, D1 = y, A0 = the plane: sets the pixel
    MULU    #40,D1
    MOVE.W  D0,D2
    LSR.W   #3,D2           ; x ÷ 8
    ADD.W   D2,D1           ; D1 = y × 40 + x ÷ 8
    NOT.B   D0              ; 7 − (x mod 8): BSET only keeps the 3 low bits
    BSET    D0,0(A0,D1.W)
```

## The screen settings

To display a plane, you set several registers:

| Register | Standard value | Role |
|---|---|---|
| `BPLCON0` (`$100`) | `$1200` | bits 14-12 = number of planes (here 1), bit 15 = high resolution, bit 9 = color |
| `BPLCON1` (`$102`) | `0` | fine delay of the planes (horizontal scrolling) |
| `BPLCON2` (`$104`) | `$24` | priorities between planes and sprites |
| `DIWSTRT`, `DIWSTOP` (`$08E`, `$090`) | `$2C81`, `$2CC1` | the image window: from line `$2C` to `$12C`, 320 pixels wide |
| `DDFSTRT`, `DDFSTOP` (`$092`, `$094`) | `$0038`, `$00D0` | when Agnus fetches the data for each line |
| `BPL1MOD`, `BPL2MOD` (`$108`, `$10A`) | `0` | bytes to skip at the end of each line (odd planes, even planes) |
| `BPL1PTH`… (`$0E0`…) | the address of the plane | where Agnus reads plane 1 (then `$0E4` for plane 2, etc.) |

These values give the classic 320 × 256 PAL low-resolution screen.

## Why the Copper sets the pointers

During the display, Agnus moves `BPL1PT` forward as the lines are read, so that at the end of the
image it points past the plane. It must therefore be reset to the start on every frame, and that
is the Copper's job, since it reads its list again on every frame:

```asm
copper:
    DC.W    $00E0,0         ; BPL1PTH: high half of the plane's address
    DC.W    $00E2,0         ; BPL1PTL: low half
    DC.W    $0100,$1200     ; BPLCON0: 1 plane, color
    DC.W    $FFFF,$FFFE     ; end of the list
```

The program writes the two words of the address into the list before starting the Copper:

```asm
    MOVE.L  #plan,D0
    MOVE.W  D0,copper+6     ; low half into the MOVE to BPL1PTL
    SWAP    D0
    MOVE.W  D0,copper+2     ; high half into the MOVE to BPL1PTH
```

Since the chips only read Chip RAM, on a real Amiga you store the copper list and the plane in a
`SECTION name,DATA_C`, or `BSS_C` for an empty area.
