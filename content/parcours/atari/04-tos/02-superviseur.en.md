## Two operating modes

The 68000 runs in one of two modes, chosen by the S bit of the status register.

| | User mode (S = 0) | Supervisor mode (S = 1) |
|---|---|---|
| Who? | the programs started by TOS | TOS itself, the interrupt routines |
| Stack | USP | SSP |
| Forbidden | `MOVE …,SR`, `STOP`, `RTE`, `MOVE USP`… (privilege violation: 8 bombs) | nothing |
| Memory on the ST | the vectors and system variables (`$000`–`$7FF`) and the hardware registers (`$FF8000`+) are protected: bus error, 2 bombs | everything is accessible |

**From this chapter on, 68k Trainer starts your programs in user mode**, as the real TOS does. A
direct write to the palette (`$FF8240`) or a read of a system variable (`$484`) therefore causes a
bus error.

## Switching to supervisor mode for one routine: Supexec

The XBIOS function 38, `Supexec`, runs a routine of your program in supervisor mode, then returns
to user mode. The routine ends with a plain `RTS`.

```asm
    PEA     ROUTINE         ; address of the routine
    MOVE.W  #38,-(SP)       ; XBIOS 38: Supexec
    TRAP    #14
    ADDQ.L  #6,SP           ; 4 + 2 bytes
    ; ...
ROUTINE:                    ; here, everything is allowed
    BCLR    #0,$484         ; no more key click
    RTS
```

This is the recommended method, because only the few instructions that need it run in supervisor
mode.

## Staying in supervisor mode: Super

The GEMDOS function 32, `Super`, switches the whole program to supervisor mode. It returns the old
supervisor stack, which you keep so that you can later return to user mode with the same call.

```asm
    CLR.L   -(SP)           ; parameter 0: switch to supervisor mode
    MOVE.W  #32,-(SP)
    TRAP    #1
    ADDQ.L  #6,SP
    MOVE.L  D0,ANCIENNE_PILE ; keep the old supervisor stack
    ; ... here, supervisor mode
    MOVE.L  ANCIENNE_PILE,-(SP)
    MOVE.W  #32,-(SP)       ; same call, with the old stack: back to user mode
    TRAP    #1
    ADDQ.L  #6,SP
```

Demos and games use it to take control of the machine; for an occasional access, `Supexec` is
enough.

## The system variables

TOS stores its settings in low memory, where you read and write them in supervisor mode.

| Address | Name | Contents |
|---|---|---|
| `$484` | `conterm` | bit 0: key click; bit 1: key repeat; bit 2: Ctrl+G bell |
| `$44E` | `_v_bas_ad` | address of the logical screen |
| `$462` | `_vbclock` | number of VBLs (screen refreshes) since startup |
| `$4BA` | `_hz_200` | 200 Hz counter |
