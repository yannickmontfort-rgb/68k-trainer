## Three sizes

The 68000 works on three sizes of data, which you choose with the instruction's suffix. Its
registers are 32 bits wide, and their bits are numbered from right to left starting at 0.

| Suffix | Name | Bits | Unsigned | Signed |
|---|---|---|---|---|
| `.B` | byte | 8 | 0 to 255 | −128 to 127 |
| `.W` | word | 16 | 0 to 65,535 | −32,768 to 32,767 |
| `.L` | long word | 32 | 0 to 4,294,967,295 | −2,147,483,648 to 2,147,483,647 |

## Hexadecimal

One hexadecimal digit stands for exactly 4 bits: a byte is therefore written with two digits, a
word with four and a long word with eight, and you go from binary to hexadecimal one digit at a
time.

```
%1010 0011  =  $A3
```

| Hex | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | A | B | C | D | E | F |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Binary | 0000 | 0001 | 0010 | 0011 | 0100 | 0101 | 0110 | 0111 | 1000 | 1001 | 1010 | 1011 | 1100 | 1101 | 1110 | 1111 |

## Negative numbers

The 68000 encodes signed numbers in two's complement: a number is negative when its most
significant bit is 1. On a byte, `$FF` is therefore −1 and `$80` is −128.

The processor does not know whether `$FF` means 255 or −1; you decide, through the instructions you
use next.

## An operation only touches its own size

When an instruction works in `.B` or `.W` on a data register, only the low part of the register
changes and the rest is kept.

```asm
    MOVE.L  #$12345678,D0   ; D0 = $12345678
    MOVE.B  #$FF,D0         ; D0 = $123456FF
    MOVE.W  #$ABCD,D0       ; D0 = $1234ABCD
```

If you then read that register back in `.L`, its old bits are still there: a classic mistake.
