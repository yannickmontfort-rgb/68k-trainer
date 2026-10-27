## A loop is a jump backwards

To repeat an action, the program goes back as long as a condition is true. You can count the
iterations yourself and branch:

```asm
    MOVE.W  #10,D0      ; 10 iterations
BOUCLE:
    ; ... the work to repeat ...
    SUBQ.W  #1,D0       ; one iteration fewer
    BNE     BOUCLE      ; go round again as long as D0 is not zero
```

## DBRA, the 68000's loop

`DBRA Dn,label` (*Decrement and Branch*, also written `DBF`) subtracts 1 from the low word of Dn,
then jumps to the label, unless Dn.W has just reached −1 (`$FFFF`): the loop then stops and the
program carries on.

```asm
    MOVE.W  #9,D0       ; 9 + 1 = 10 iterations
BOUCLE:
    ; ... the work to repeat ...
    DBRA    D0,BOUCLE
```

Since the loop stops at −1 and not at 0, it runs **N + 1 times** when the counter starts at N: for
10 iterations, you therefore start at 9. This is the most common off-by-one error on the 68000.

The `DBcc` variants, such as `DBEQ` or `DBNE`, also stop the loop as soon as condition cc is true,
which is useful when searching for an element.

## Walking through a string

A string ends with a zero byte, and you walk through it with a postincremented pointer until that
0.

```asm
    LEA     TEXTE,A0
BOUCLE:
    MOVE.B  (A0)+,D1    ; read a character and move on
    BEQ     FIN         ; MOVE has set Z: it was the final 0
    ; ... process character D1 ...
    BRA     BOUCLE
FIN:
```

`MOVE` already sets the flags, so there is no need for a `TST` after it.
