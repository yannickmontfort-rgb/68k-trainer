## Jumping

`BRA label` (*BRanch Always*) makes the program jump to the label by giving the PC its new
address. Without jumps, instructions run in order; with jumps, you can write choices and loops.

## Compare, then branch on the flags

A conditional branch `Bcc` only jumps if a condition on the flags is true, so you prepare the flags
just before: `CMP.t src,dst` computes dst − src without storing the result, and `TST.t dst`
compares dst with zero.

```asm
    CMP.W   D2,D1       ; compare D1 with D2 (computes D1 - D2)
    BGT     PLUSGRAND   ; jump if D1 > D2
```

Read `CMP src,dst` followed by `Bcc` as "if dst *condition* src".

## Signed or unsigned

Since the processor does not know whether your numbers are signed, it is up to you to choose the
right condition.

| Condition | Unsigned | Signed |
|---|---|---|
| dst > src | `BHI` | `BGT` |
| dst ≥ src | `BCC` (or `BHS`) | `BGE` |
| dst < src | `BCS` (or `BLO`) | `BLT` |
| dst ≤ src | `BLS` | `BLE` |

Other conditions do not depend on the sign:

| Instruction | Jumps if… | Flag tested |
|---|---|---|
| `BEQ` | equal, or zero result | Z = 1 |
| `BNE` | not equal, or non-zero | Z = 0 |
| `BMI` | negative | N = 1 |
| `BPL` | positive or zero | N = 0 |
| `BVS` / `BVC` | overflow, or not | V |

The byte `$C8`, for example, is 200 unsigned but −56 signed: compared with 100, it is greater for
`BHI` and smaller for `BGT`.

## Writing an "if… else…"

```asm
    CMP.W   D2,D1
    BGT     ALORS       ; condition true: jump to the THEN block
    MOVE.W  D2,D0       ; ELSE block
    BRA     FINSI       ; jump over THEN
ALORS:
    MOVE.W  D1,D0
FINSI:
```

Without the `BRA FINSI`, the program would run both blocks one after the other.

`BRA.S` and `Bcc.S` are short forms, slightly faster, for a jump of −128 to +127 bytes; without
`.S`, the assembler picks the form that fits.
