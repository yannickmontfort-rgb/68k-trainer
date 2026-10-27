---
title: "TRAP, GEMDOS/BIOS/XBIOS and reprogramming vectors"
source: "cours_asm_68000.pdf — Le Féroce Lapin, Volume 2, lesson 2 (adapted); Atari ST Profibuch, EmuTOS documentation. Completed and corrected on October 21, 2026."
themes: ["trap", "systeme"]
---

# TRAP, GEMDOS/BIOS/XBIOS and reprogramming vectors

> The notion of exception vector and the `TRAP` mechanism belong to the common core, see
> [pile-et-sous-programmes.md](../general/pile-et-sous-programmes.md). This sheet covers what is
> specific to TOS, the operating system of the Atari ST, and its calling conventions.

## The three families of system calls

TOS offers its services through three `TRAP`s, each with its own numbered functions:

| Trap | Family | Role |
|---|---|---|
| `TRAP #1` | **GEMDOS** | console, files, memory, program termination (close to MS-DOS) |
| `TRAP #13` | **BIOS** | basic input/output: characters, disks, vectors |
| `TRAP #14` | **XBIOS** | ST-specific extensions: screen, palette, sound, keyboard, supervisor |

`TRAP #2` is used by GEM, see [the Line A and GEM sheet](ligne-a-et-gem.md).

You push the parameters from last to first, then the function number as a word, before executing
the `TRAP`; on return, **the caller gives back the space** taken on the stack. The result arrives in
D0, where a negative number signals an error.

```asm
        PEA     MESSAGE(PC)     ; parameter: address of the string (4 bytes)
        MOVE.W  #9,-(SP)        ; GEMDOS function 9: Cconws (2 bytes)
        TRAP    #1
        ADDQ.L  #6,SP           ; gives back the 4 + 2 bytes pushed

        CLR.W   -(SP)           ; function 0: Pterm0, end of the program (does not return)
        TRAP    #1

MESSAGE DC.B    'Bonjour !',13,10,0
        EVEN
```

A TOS string ends with a null byte, and a line break is written `13,10`: carriage return, then line
feed.

## The most useful functions

| Call | Function | Parameters (pushed in reverse order) | Result |
|---|---|---|---|
| GEMDOS 0 | `Pterm0()` | — | end of the program, code 0 |
| GEMDOS 1 | `Cconin()` | — | D0.L: key (ASCII code in the low byte, scan code in the high word), with echo |
| GEMDOS 2 | `Cconout(c)` | `c.W` | displays a character |
| GEMDOS 7 | `Crawcin()` | — | like Cconin, without echo |
| GEMDOS 8 | `Cnecin()` | — | without echo, but Ctrl+C interrupts |
| GEMDOS 9 | `Cconws(string)` | `string.L` | displays a 0-terminated string |
| GEMDOS 11 | `Cconis()` | — | D0 = −1 if a key is waiting, 0 otherwise |
| GEMDOS 32 | `Super(stack)` | `stack.L` (0 = keep the same one) | switches to supervisor mode, returns the old supervisor stack in D0 |
| GEMDOS 60 | `Fcreate(name, attr)` | `attr.W`, `name.L` | D0 = file handle |
| GEMDOS 61 | `Fopen(name, mode)` | `mode.W` (0 read, 1 write, 2 both), `name.L` | D0 = file handle |
| GEMDOS 62 | `Fclose(handle)` | `handle.W` | |
| GEMDOS 63 | `Fread(handle, n, buffer)` | `buffer.L`, `n.L`, `handle.W` | D0 = bytes read |
| GEMDOS 64 | `Fwrite(handle, n, buffer)` | `buffer.L`, `n.L`, `handle.W` | D0 = bytes written |
| GEMDOS 72 | `Malloc(n)` | `n.L` (−1 = ask for the free space) | D0 = address, 0 on failure |
| GEMDOS 73 | `Mfree(address)` | `address.L` | |
| GEMDOS 74 | `Mshrink(0, base, size)` | `size.L`, `base.L`, `0.W` | gives back unneeded memory (startup) |
| GEMDOS 76 | `Pterm(code)` | `code.W` | end of the program with a return code |
| BIOS 3 | `Bconout(dev, c)` | `c.W`, `dev.W` (2 = screen) | |
| BIOS 5 | `Setexec(n, address)` | `address.L` (−1 = read only), `n.W` | D0 = old address of vector *n* |
| XBIOS 2 / 3 | `Physbase()` / `Logbase()` | — | D0 = address of the displayed / drawing screen |
| XBIOS 4 | `Getrez()` | — | D0 = 0 low, 1 medium, 2 high resolution |
| XBIOS 5 | `Setscreen(log, phys, rez)` | `rez.W`, `phys.L`, `log.L` (−1 = leave unchanged) | |
| XBIOS 6 | `Setpalette(palette)` | `palette.L` (16 words) | |
| XBIOS 7 | `Setcolor(n, color)` | `color.W` (−1 = read), `n.W` | D0 = old color |
| XBIOS 37 | `Vsync()` | — | waits for the next vertical blank (VBL) |
| XBIOS 38 | `Supexec(routine)` | `routine.L` | runs a routine in supervisor mode (it ends with `RTS`) |

To wait for a key and keep it in D7:

```asm
        MOVE.W  #7,-(SP)        ; Crawcin: waits for a key, without echo
        TRAP    #1
        ADDQ.L  #2,SP
        MOVE.L  D0,D7           ; low byte = ASCII code, high word = scan code
```

> The 68k Trainer simulator knows some of these functions: GEMDOS 0, 1, 2, 7, 8, 9, 11, 32 and 76;
> BIOS 1, 2, 3, 5 and 11; XBIOS 2 to 7, 17, 28, 32, 34, 37 and 38. Files (`Fopen`…) and memory
> (`Malloc`, `Mshrink`) need a real TOS and can be tried with the "Try in Hatari" button.

## Switching to supervisor mode

Vectors, the system variables in low memory and the hardware registers, from `$FF8000` up, can only
be reached in **supervisor mode**: in user mode, touching them triggers a bus error, the 2 bombs.
TOS offers two ways to switch:

```asm
; 1. Super(): the whole program switches to supervisor mode
        CLR.L   -(SP)           ; 0 = keep the current stack as supervisor stack
        MOVE.W  #32,-(SP)       ; Super
        TRAP    #1
        ADDQ.L  #6,SP
        MOVE.L  D0,ANCIENNE_PILE ; to give back when returning to user mode
        ; ... hardware access ...
        MOVE.L  ANCIENNE_PILE,-(SP)
        MOVE.W  #32,-(SP)       ; Super(old stack): back to user mode
        TRAP    #1
        ADDQ.L  #6,SP

; 2. Supexec(): only one routine runs in supervisor mode
        PEA     ROUGE(PC)
        MOVE.W  #38,-(SP)       ; Supexec
        TRAP    #14
        ADDQ.L  #6,SP
        CLR.W   -(SP)           ; Pterm0: without it, execution would run on into ROUGE in user mode
        TRAP    #1

ROUGE:  MOVE.W  #$0700,$FFFF8240 ; color 0 = red
        RTS                     ; a Supexec routine ends with RTS

ANCIENNE_PILE DC.L 0
```

`Supexec` is the safest for short hardware accesses, and `Super` suits a program that works in
supervisor mode for a long time, such as a demo or a game.

## Reprogramming a vector (Setexec)

The BIOS function `Setexec()`, number 5, reads or replaces the address of any exception vector,
whether it is an error, an interrupt or a trap. Vector *n* is located at address *n* × 4: 35 is
`TRAP #3` (`$8C`), 28 the VBL interrupt (`$70`), 69 Timer C (`$114`).

```asm
        PEA     MA_ROUTINE(PC)  ; new address
        MOVE.W  #35,-(SP)       ; vector 35 = TRAP #3 (address $8C)
        MOVE.W  #5,-(SP)        ; Setexec
        TRAP    #13             ; BIOS
        ADDQ.L  #8,SP
        MOVE.L  D0,ANCIEN_TRAP3 ; Setexec returns the old address: restore it when quitting

        TRAP    #3              ; calls our routine: the background turns red
        CLR.W   -(SP)           ; Pterm0 (in a real program: restore the old vector first)
        TRAP    #1

MA_ROUTINE:
        MOVE.W  #$0700,$FFFF8240 ; allowed: a TRAP runs in supervisor mode
        RTE                     ; NOT RTS: return from exception (pops SR + PC)

ANCIEN_TRAP3 DC.L 0
```

A routine called by an exception ends with **`RTE`** (*Return from Exception*), which pops the SR
and the PC, and not with `RTS`.

With `-1` as the address, `Setexec` changes nothing and only returns the current address in D0.
This is the starting point of a hook: you keep the old address, replace it with your own, handle the
cases you care about and jump to the old routine for everything else, with `MOVE.L ANCIEN,-(SP)`
then `RTS`, or a `JMP` to the saved address.

## Stack and TRAP: how it differs from a simple BSR

A `TRAP` switches the processor to supervisor mode and pushes onto the **supervisor stack** the
return address (4 bytes) and the SR (2 bytes), that is 6 bytes on the 68000 and 8 on the 68010 and
later, those of the Atari TT and Falcon. The parameters pushed by the caller stay on its own stack,
the user stack if it was in user mode, which is why TOS looks at the S bit of the pushed SR to know
where to read them.

## Registers and TRAP: watch out for D2

System calls preserve only `D3-D7` and `A3-A6`. D0 receives the result, and D1, D2, A0, A1 and A2
may be overwritten: never count on them after a `TRAP`, and save them if you need them.

## Do not call GEMDOS again at just any time

GEMDOS is not reentrant: you call it neither from an interrupt routine (VBL, MFP timer), nor from a
routine that hooks a trap of GEMDOS itself. From an interrupt, you stick to the hardware and, with
care, to a few BIOS and XBIOS calls. GEMDOS itself calls the BIOS to display characters or read
disks, as a debugger like MONST shows when you follow the traps.

## Useful system variables

TOS keeps documented variables in low memory, accessible in supervisor mode only:

| Address | Name | Contents |
|---|---|---|
| `$0044E` | `_v_bas_ad` | address of the logical screen |
| `$00454` | `nvbls` | number of entries in the VBL list |
| `$00456` | `_vblqueue` | address of the list of routines called on each VBL |
| `$00462` | `_vbclock` | VBL counter since startup |
| `$004BA` | `_hz_200` | 200 Hz counter (fine clock) |
| `$004F2` | `_sysbase` | address of the TOS header (version at `+2`) |

## Beyond the scope of this trainer

The rest of this lesson by Le Féroce Lapin (startup, includes, macros, self-modification, Line A,
GEM, MFP) is in the other Atari ST reference sheets.

> Sheet completed and corrected on October 21, 2026 (Claude): Setexec is BIOS function 5 (it was
> given as XBIOS); the nesting of traps, wrongly asserted, has given way to the non-reentrancy of
> GEMDOS; table of functions, supervisor mode, system variables.
