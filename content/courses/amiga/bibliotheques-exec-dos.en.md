---
title: "Amiga: the exec, dos, graphics and intuition libraries (reference)"
source: "Amiga ROM Kernel Reference Manual; .conf files from the AROS sources (offsets checked); Amiga Intern (Abacus). Sheet created on 10/21/2026."
themes: ["systeme", "bibliotheques"]
---

# Amiga: the exec, dos, graphics and intuition libraries

> The calling principle (A6 = base, `JSR offset(A6)`, destroyed registers) is explained in
> [the system sheet](systeme-et-hardware.md). The offsets below are those of Kickstart 1.3 and
> later, checked against the AROS sources, because some books of the time, *Amiga Intern* among
> them, give a few wrong ones.

Every call returns its result in D0 and **destroys D0, D1, A0 and A1**; A6 must hold the base of
the right library, exec's being ExecBase, read at `$4`. Functions marked ★ are simulated by 68k
Trainer; the others need a real system (WinUAE with AROS).

## exec.library (base: `MOVEA.L 4.W,A6`)

| Offset | Function | Parameters | Result / note |
|---|---|---|---|
| −30 | `Supervisor(routine)` ★ | A5 = routine | runs the routine in supervisor mode; it ends with `RTE` |
| −120 | `Disable()` ★ | | turns off interrupts (nestable: as many `Enable` calls) |
| −126 | `Enable()` ★ | | |
| −132 | `Forbid()` ★ | | no more task switching (nestable: as many `Permit` calls) |
| −138 | `Permit()` ★ | | |
| −162 | `SetIntVector(n, interrupt)` | D0 = interrupt no., A1 = Interrupt structure | D0 = old one |
| −168 | `AddIntServer(n, interrupt)` ★ | D0, A1 | adds a server (e.g. no. 5 = VBL) |
| −174 | `RemIntServer(n, interrupt)` ★ | D0, A1 | |
| −198 | `AllocMem(size, type)` ★ | D0 = bytes, D1 = `MEMF_…` | D0 = address, 0 on failure |
| −210 | `FreeMem(address, size)` ★ | A1, D0 = **same** size | |
| −216 | `AvailMem(type)` ★ | D1 = `MEMF_…` | D0 = free bytes |
| −294 | `FindTask(name)` ★ | A1 = name, 0 = self | D0 = task |
| −306 | `SetSignal(new, mask)` ★ | D0, D1 | D0 = old signals |
| −318 | `Wait(signals)` ★ | D0 = mask | sleeps until one of the signals; D0 = signals received |
| −324 | `Signal(task, signals)` | A1, D0 | |
| −330 | `AllocSignal(n)` | D0 = desired no. (−1 = any) | D0 = no., −1 on failure |
| −372 | `GetMsg(port)` | A0 = port | D0 = message, 0 if none |
| −378 | `ReplyMsg(message)` | A1 | |
| −384 | `WaitPort(port)` | A0 | waits for a message to arrive |
| −408 | `OldOpenLibrary(name)` ★ | A1 | like `OpenLibrary(name, 0)` |
| −414 | `CloseLibrary(base)` ★ | A1 | |
| −444 | `OpenDevice(name, unit, request, flags)` | A0, D0, A1, D1 | D0 = 0 on success |
| −450 | `CloseDevice(request)` | A1 | |
| −456 | `DoIO(request)` | A1 | synchronous input/output |
| −522 | `RawDoFmt(format, data, routine, buffer)` ★ | A0, A1, A2, A3 | `printf`-style formatting (`%d`, `%x`, `%s`…) |
| −534 | `TypeOfMem(address)` ★ | A1 | D0 = `MEMF_CHIP`, `MEMF_FAST`… |
| −552 | `OpenLibrary(name, version)` ★ | A1, D0 = minimum version | D0 = base, 0 on failure |
| −624 | `CopyMem(source, destination, size)` ★ | A0, A1, D0 | |
| −630 | `CopyMemQuick(source, destination, size)` ★ | A0, A1, D0 | addresses and size multiples of 4 |
| −636 | `CacheClearU()` | | flushes the caches of 68020+ (Kickstart 2.0 and later) |

The `MEMF_…` memory types add up: `MEMF_PUBLIC` = `$1`, `MEMF_CHIP` = `$2`, `MEMF_FAST` = `$4`,
`MEMF_CLEAR` = `$10000` (filled with zeros), and `MEMF_LARGEST` = `$20000`, which makes `AvailMem`
return the largest block.

ExecBase fields: `LIB_VERSION` (+20, word), `ThisTask` (+276), `AttnFlags` (+296, word: bit 0 =
68010 or later, bit 1 = 68020 or later), `VBlankFrequency` (+530, byte: 50 in PAL).

## dos.library (open `"dos.library"`)

The dos functions take their parameters in D1, D2, D3, and their files and locks are BPTRs.

| Offset | Function | Parameters | Result / note |
|---|---|---|---|
| −30 | `Open(name, mode)` ★ | D1 = name, D2 = 1005 (existing) / 1006 (new) / 1004 (read-write) | D0 = file, 0 on failure |
| −36 | `Close(file)` ★ | D1 | |
| −42 | `Read(file, buffer, length)` ★ | D1, D2, D3 | D0 = bytes read (0 = end, −1 = error) |
| −48 | `Write(file, buffer, length)` ★ | D1, D2, D3 | D0 = bytes written |
| −54 | `Input()` ★ | | D0 = Shell input |
| −60 | `Output()` ★ | | D0 = Shell output (0 if started from the Workbench) |
| −66 | `Seek(file, position, mode)` | D1, D2, D3 = −1 (start) / 0 (current) / 1 (end) | D0 = old position |
| −84 | `Lock(name, mode)` | D1, D2 = −2 (read) / −1 (write) | D0 = lock, 0 if missing |
| −90 | `UnLock(lock)` | D1 | |
| −102 | `Examine(lock, fib)` | D1, D2 = FileInfoBlock (260 bytes, address a multiple of 4) | D0 ≠ 0 on success |
| −132 | `IoErr()` ★ | | D0 = code of the last error |
| −150 | `LoadSeg(name)` | D1 | D0 = loaded program (BPTR) |
| −192 | `DateStamp(date)` | D1 = 3 longs | days, minutes, ticks since 1978 |
| −198 | `Delay(ticks)` ★ | D1 = 50ths of a second | waits without using processor time |
| −204 | `WaitForChar(file, timeout)` | D1, D2 = microseconds | D0 = −1 if a character arrived |
| −222 | `Execute(command, input, output)` | D1, D2, D3 | runs a Shell command |

## graphics.library (open `"graphics.library"`)

Most drawing functions work on a **RastPort**, passed in A1: it is the drawing "sheet" of a window
or a screen, which the window keeps in its `RPort` field (`Window+50`).

| Offset | Function | Parameters | Note |
|---|---|---|---|
| −60 | `Text(rp, text, length)` | A1, A0, D0 | writes at the current position |
| −66 | `SetFont(rp, font)` | A1, A0 | |
| −72 | `OpenFont(attributes)` | A0 = TextAttr | D0 = font |
| −78 | `CloseFont(font)` | A1 | |
| −192 | `LoadRGB4(viewport, colors, n)` | A0, A1 = `$0RGB` words, D0 | loads a palette |
| −198 | `InitRastPort(rp)` | A1 | |
| −222 | `LoadView(view)` ★ | A1 (0 = nothing displayed any more) | |
| −228 | `WaitBlit()` ★ | | waits for the Blitter to finish |
| −234 | `SetRast(rp, color)` | A1, D0 | fills everything |
| −240 | `Move(rp, x, y)` | A1, D0, D1 | moves the pen |
| −246 | `Draw(rp, x, y)` | A1, D0, D1 | draws a line to (x, y) |
| −270 | `WaitTOF()` ★ | | waits for the next frame (VBL) |
| −288 | `SetRGB4(viewport, n, r, g, b)` | A0, D0, D1, D2, D3 (0 to 15) | one color |
| −306 | `RectFill(rp, x1, y1, x2, y2)` | A1, D0, D1, D2, D3 | filled rectangle |
| −318 | `ReadPixel(rp, x, y)` | A1, D0, D1 | D0 = color |
| −324 | `WritePixel(rp, x, y)` | A1, D0, D1 | |
| −342 | `SetAPen(rp, color)` | A1, D0 | drawing color |
| −348 | `SetBPen(rp, color)` | A1, D0 | background color |
| −354 | `SetDrMd(rp, mode)` | A1, D0 = 0 (JAM1), 1 (JAM2), 2 (COMPLEMENT) | |
| −456 | `OwnBlitter()` ★ | | the Blitter is ours |
| −462 | `DisownBlitter()` ★ | | we give it back |

GfxBase fields: `ActiView` (+34) is the view being displayed, and `copinit` (+38) the system copper
list, to put back in `COP1LC` when you hand the machine back.

## intuition.library (open `"intuition.library"`)

| Offset | Function | Parameters | Result |
|---|---|---|---|
| −66 | `CloseScreen(screen)` | A0 | |
| −72 | `CloseWindow(window)` | A0 | |
| −96 | `DisplayBeep(screen)` ★ | A0 (0 = all) | flashes the screen |
| −198 | `OpenScreen(new_screen)` | A0 = NewScreen | D0 = Screen |
| −204 | `OpenWindow(new_window)` | A0 = NewWindow | D0 = Window |

A Window has two useful fields: `RPort` (+50), its RastPort, and `UserPort` (+86), the port where
its IDCMP messages arrive, such as a click on the close gadget or a key press.

## Example: displaying a number with RawDoFmt

```asm
        MOVEA.L 4.W,A6
        LEA     FORMAT(PC),A0   ; the format
        LEA     VALEURS(PC),A1  ; the values, in the order of the %
        LEA     RANGE(PC),A2    ; routine called for each character (D0.B)
        LEA     TAMPON,A3       ; passed to the routine in A3
        JSR     -522(A6)        ; RawDoFmt → TAMPON = "Score : 1234"
        RTS

RANGE:  MOVE.B  D0,(A3)+        ; stores the character and moves on
        RTS

FORMAT:  DC.B   'Score : %d',0  ; %d = a signed WORD (%ld for a long)
        EVEN
VALEURS: DC.W   1234
TAMPON:  DS.B   40
```

`%d` reads a **word** and `%ld` a long: if you get it wrong, all the following values are read
incorrectly.

> Sheet created on 10/21/2026 (Claude) from the simulator's checked offsets (AROS sources).
