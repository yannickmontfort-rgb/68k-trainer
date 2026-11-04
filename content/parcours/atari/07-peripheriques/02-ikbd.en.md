## The keyboard processor, the IKBD

The ST keyboard contains its own microprocessor, an HD6301, the **IKBD** (*Intelligent
KeyBoarD*). It watches the keys, the mouse and the two joystick ports, and sends what it sees to
the ST over a serial link:

```text
IKBD ──serial──> ACIA ($FFFC00) ──interrupt──> MFP 68901 ──level 6──> 68000
```

Each byte received triggers an interrupt (vector `$118`). TOS reads the byte at `$FFFC02` and
recognizes in it either a key code, pressed or released when bit 7 is 1, or the start of a packet,
whose header ranges from `$F6` to `$FF`: mouse (`$F8`-`$FB`), clock (`$FC`), joysticks (`$FD`,
`$FE`, `$FF`).

## The Kbdvbase table

When a packet is complete, TOS calls a routine whose address is stored in a table of 9 vectors,
returned by XBIOS 34, `Kbdvbase`:

| Offset | Vector | Called for… |
|---|---|---|
| 12 | `statvec` | IKBD status replies |
| 16 | `mousevec` | mouse packets |
| 20 | `clockvec` | the clock |
| 24 | `joyvec` | joystick packets |
| 32 | `ikbdsys` | every byte received (the heart of the system) |

By default, `joyvec` points to a plain `RTS`. To read the joystick, you install your own routine
there, which TOS calls with A0 = the address of the packet:

| Byte | Contents |
|---|---|
| `0(A0)` | the header of the last packet (`$FE`: joystick 0, `$FF`: joystick 1) |
| `1(A0)` | the state of joystick 0 (mouse port) |
| `2(A0)` | the state of joystick 1 (the "joystick" port, the one games use) |

Routine 7.4 of the manual swaps the two and reads joystick 1 at `1(A0)`; the layout above has been
checked against the source code of the free TOS, EmuTOS.

## The state of a joystick

The state fits in a byte: bit 0 up, bit 1 down, bit 2 left, bit 3 right, bit 7 fire button. Two
directions can be active at once, diagonally: `%10001001` means up, right and fire.

## An interrupt routine

`joyvec` is called during an interrupt, while the main program has been stopped between any two
of its instructions. The routine therefore stays short: it reads the state, stores it in a
variable and ends with `RTS`, since TOS does the `RTE`. It only modifies the registers TOS has
saved for it, D0-D3 and A0-A3, because all the others belong to the interrupted program.

The program that installed it **puts the old vector back before quitting**: otherwise, at the next
joystick movement, TOS would jump into the memory of a program that no longer exists, and you
would get bombs.
