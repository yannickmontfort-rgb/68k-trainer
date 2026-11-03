## Waiting: Delay

`Delay(ticks)(D1)` (dos.library, −198) puts your program to sleep for `ticks` fiftieths of a
second, so `Delay(50)` waits one second. Meanwhile, the processor works for the other tasks,
whereas an empty loop would keep it busy for nothing.

```asm
    MOVEA.L dosbase,A6
    MOVEQ   #50,D1
    JSR     -198(A6)        ; Delay(50): one second
```

## Displaying a number: RawDoFmt

Write only writes characters: to display the value of a register, you must first convert it into
text. Exec does this with `RawDoFmt` (−522), which fills in a template (*format*):

| Register | Role |
|---|---|
| A0 | the format, a 0-terminated text, for example `'Score : %ld',10,0` |
| A1 | the data: the values to insert, stored one after the other in memory |
| A2 | a small routine called for each character produced (in D0) |
| A3 | a free register for that routine, usually the address of the output buffer |

The usual routine stores each character in the buffer and moves forward:

```asm
ranger: MOVE.B  D0,(A3)+
        RTS
```

The format codes:

| Code | Data read | Displays |
|---|---|---|
| `%d` | a word (16 bits) | a signed number |
| `%ld` | a long word (32 bits) | a signed number |
| `%u`, `%lu` | word / long word | an unsigned number |
| `%x`, `%lx` | word / long word | in hexadecimal |
| `%s` | a long word: the address of a text | that text |
| `%c` | a word | a character |

You can give a width: `%5ld` right-aligns on 5 characters, `%04lx` pads with zeros. Without the
`l`, **RawDoFmt reads a word**: if the data is a long word, it only reads its high half, and
often displays 0.

The text produced ends with a 0. Like every exec function, RawDoFmt returns A3 as it was, so to
know the length of the text before `Write`, you count its characters up to the 0.
