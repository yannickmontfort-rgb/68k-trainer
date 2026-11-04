## Four digital voices

Where the ST has a chip that generates square sounds, the Amiga **plays samples**: Paula reads
bytes in Chip RAM and sends them to the speaker, on 4 independent channels. Channels 0 and 3 come
out on the left, 1 and 2 on the right, so the Amiga is stereo.

A sample is a sequence of signed bytes, from −128 to +127, that describes the shape of the wave:
32 bytes that rise then fall make a triangle wave, 16 bytes at +100 followed by 16 at −100 a
square wave.

## The registers of a channel

Each channel has its registers, starting at `$DFF0A0` for channel 0, `$0B0` for channel 1, `$0C0`
for channel 2 and `$0D0` for channel 3:

| Register | Offset (channel 0) | Role |
|---|---|---|
| `AUD0LC` | `$0A0` (long word) | the address of the sample, in Chip RAM |
| `AUD0LEN` | `$0A4` | its length, in words (bytes ÷ 2) |
| `AUD0PER` | `$0A6` | the period: the duration of one byte, in ticks of Paula's clock |
| `AUD0VOL` | `$0A8` | the volume, from 0 to 64 |

## The period

Paula's clock runs at 3,546,895 Hz on a PAL Amiga, and Paula sends one byte every `period` ticks:
the sampling rate is therefore 3,546,895 ÷ period. If the sample holds one cycle of the wave in N
bytes, the note played has the frequency:

> f = 3,546,895 ÷ (**period** × N)    that is    period = 3,546,895 ÷ (f × N)

For an *A* at 440 Hz with a 32-byte wave, the period is 3,546,895 ÷ 14,080 ≈ 252. It cannot go
below 124, about 28,600 bytes per second, because the DMA would no longer have time to read.

## Playing, stopping

The DMA of channel 0 is bit 0 of `DMACON`, AUD0EN, which also needs DMAEN (`$0200`).

```asm
    LEA     $DFF000,A5
    MOVE.L  #onde,$A0(A5)   ; AUD0LC
    MOVE.W  #16,$A4(A5)     ; AUD0LEN: 32 bytes = 16 words
    MOVE.W  #252,$A6(A5)    ; AUD0PER: an A
    MOVE.W  #64,$A8(A5)     ; AUD0VOL: the maximum
    MOVE.W  #$8201,$96(A5)  ; DMACON: SET + DMAEN + AUD0EN, the channel plays
    ; ...
    MOVE.W  #$0001,$96(A5)  ; AUD0EN at 0: silence
```

Once started, the channel replays the sample in a loop until you stop it, which suits a held
note. To change the note, you only need to write another period, and `AUD0VOL` changes the volume
at any time.

In 68k Trainer, tick 🔊 under the screen and start "🎬 Real time" to hear Paula.
