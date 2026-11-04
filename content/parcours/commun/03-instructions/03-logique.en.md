## Logical operations and masks

Logical operations work bit by bit. With a well-chosen value, the mask, they change some bits
without touching the others, which is used everywhere in graphics on the
[[atari:Atari ST|amiga:Amiga]], where each bit is a piece of a pixel.

| Instruction | Rule for each bit | With a mask |
|---|---|---|
| `AND` | 1 if both bits are 1 | clears the bits that are 0 in the mask |
| `OR` | 1 if at least one bit is 1 | sets the bits that are 1 in the mask |
| `EOR` | 1 if the two bits differ | flips the bits that are 1 in the mask |
| `NOT` | flips every bit | |

```asm
    AND.B   #%00001111,D0   ; keep the 4 low bits, clear the others
    OR.B    #%10000000,D0   ; set bit 7
    EOR.B   #%00000001,D0   ; flip bit 0
```

## Shifts and rotations

| Instruction | Effect | Use |
|---|---|---|
| `LSL #n,Dn` | shifts left, 0s come in on the right | × 2ⁿ unsigned |
| `LSR #n,Dn` | shifts right, 0s come in on the left | ÷ 2ⁿ unsigned |
| `ASL #n,Dn` | like LSL, but V reports a change of sign | × 2ⁿ signed |
| `ASR #n,Dn` | shifts right, copying the sign bit | ÷ 2ⁿ signed |
| `ROL` / `ROR` | the bit that goes out comes back in on the other side | working with bit patterns |

The last bit shifted out goes into C, and also into X for shifts. The shift count is an immediate
value from 1 to 8 or a data register, as in `LSL.W D1,D0`.

Since a small shift takes fewer than 15 clock cycles, against about 70 for `MULU`, you often
multiply with shifts: × 10 is × 8 plus × 2.

## Testing and changing a bit

| Instruction | Effect |
|---|---|
| `BTST #n,dst` | tests bit n |
| `BSET #n,dst` | tests, then sets the bit to 1 |
| `BCLR #n,dst` | tests, then clears the bit to 0 |
| `BCHG #n,dst` | tests, then flips the bit |

On a data register, n goes from 0 to 31; in memory, the operation works on a byte and n goes from
0 to 7. After the test, Z is 1 when the tested bit is **0**, which often surprises people the first
time.
