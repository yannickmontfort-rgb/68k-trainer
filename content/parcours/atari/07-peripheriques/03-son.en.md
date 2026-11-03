## The ST sound chip

The ST's sound comes from a Yamaha **YM2149** chip, compatible with the General Instrument
AY-3-8910/8912 mentioned in the manual. It produces 3 channels (A, B, C) of square waves, a noise
generator and a volume envelope: it is the sound of ST games and of "chiptune" music.

You control it through 16 registers, via two hardware addresses, and therefore in supervisor mode,
with `Supexec`: you write the number of the register to change at `$FF8800`, then its value at
`$FF8802`.

```asm
    MOVE.B  #8,$FFFF8800.W  ; register 8 (volume of channel A)
    MOVE.B  #15,$FFFF8802.W ; receives 15
```

A single `MOVE.L #$08000F00,$FFFF8800.W` does both at once, because the high byte goes to
`$FF8800` and the third byte to `$FF8802`.

## The registers

| Registers | Role |
|---|---|
| 0-1, 2-3, 4-5 | period of channels A, B, C (12 bits: low byte, then high) |
| 6 | noise period (5 bits) |
| 7 | mixer: bits 0-2 = square wave of A, B, C; bits 3-5 = noise on A, B, C |
| 8, 9, 10 | volume of A, B, C (0 to 15; bit 4 at 1 = follow the envelope) |
| 11-12 | envelope period |
| 13 | envelope shape |

In the **mixer**, a bit at 0 enables the source and a bit at 1 cuts it: `%11111110` enables only
the square wave of channel A. You keep bits 6 and 7 at 1, because on the ST they set ports of the
chip that serve the floppy drive and the printer.

## From period to note

The chip is clocked at 2 MHz, and the frequency of a channel is:

```text
frequency = 2,000,000 / (16 × period)        so   period = 125,000 / frequency
```

| Note | Frequency | Period |
|---|---|---|
| A (A4) | 440 Hz | 284 |
| B | 494 Hz | 253 |
| C# | 554 Hz | 225 |
| D | 587 Hz | 213 |
| E | 659 Hz | 190 |

Doubling the period lowers the note by one octave.

## Making a note last: the VBL

The chip plays on its own as long as you do not change its registers. For a melody, you have to
change notes at the right moment, and you hand that job to a routine called 50 times a second by
the VBL. The variable `_vblqueue` (`$456`) points to a queue of 8 routine addresses, and at each
VBL TOS calls (`JSR`) each of the non-zero addresses. You place your routine there in supervisor
mode, and remove it before quitting.

## The simplest way: Dosound

TOS can also play a list of commands by itself, with XBIOS 32, `Dosound(list)`. Each command is a
pair of bytes "register, value", `$FF, n` waits n fiftieths of a second and `$FF, 0` ends the
list. This is how TOS makes its Ctrl+G bell.

In 68k Trainer, you hear the sound in "Real time" mode, when the sound box below the screen is
checked.
