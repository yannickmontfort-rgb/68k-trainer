[Version française](README.md)

# 68k Trainer

Learn **Motorola 68000** assembly by programming a simulated **Atari ST** or **Amiga 500**, step
by step. To our knowledge, it is the first tool that brings the two machines together.

- Two **guided courses**, organised chapter by chapter, with a **shared core** (chapters 1 to 3, the
  68000): **Atari ST** in 9 chapters (TOS, screen, animation, keyboard, joystick, sound, Devpac, Line-A and GEM) and
  **Amiga** in 10 chapters (Exec and libraries, custom chips, Copper, Blitter, sprites, Paula,
  AmigaDOS executable). The machine is chosen in the profile. Progress
  bar, "resume where I left off", progress report and certificate as a PDF.
- For each topic: a lesson, a **worked example run step by step** (with an explanation of
  each line), a **prediction** exercise, **levelled exercises** (fill in, guided,
  on your own, fix, put in order), and at the end of each chapter a **quiz** and
  optional **bonus challenges**.
- A complete **68000 emulator** (exceptions, supervisor mode, interrupts, cycle counter) and
  a simulated **Atari 1040 STF**: low-resolution screen, palette and rasters, 50 Hz VBL, MFP
  68901, IKBD keyboard and joysticks, YM2149 sound chip, TOS (GEMDOS, BIOS, XBIOS), bombs.
  **Real-time** mode at the speed of a real ST, with sound.
- A simulated **Amiga 500** (OCS, PAL): Copper, Blitter (area, fill, lines), bitplanes,
  sprites, Paula, CIA, mouse, joystick, keyboard, and a simulated Kickstart 1.3 (ExecBase at `$4`,
  real jump tables, exec, dos, graphics), Guru Meditation included.
- A **debugger**: step by step, breakpoints, disassembly, stack, memory, hardware.
- Its **own 68000 assembler**, Devpac-compatible (checked byte for byte against vasm), a
  **disassembler**, **export to .PRG** (Hatari, real ST) and to an **AmigaDOS executable**
  (WinUAE, FS-UAE, real Amiga).
- **Emulators for study** installed on demand (Windows): **Hatari** with EmuTOS and
  **WinUAE** with the free AROS Kickstart, no copyrighted ROM; a shared folder in
  Documents, and a **"Try in the emulator"** button.
- A **sandbox** that is a real editor (open, save, `INCLUDE` next to the source), and
  **reference sheets** (68000, TOS, MFP, Line-A and GEM, Amiga libraries and chips).

The teaching choices are based on research: worked examples, then help withdrawn step by step,
one difficulty at a time, reading and predicting before writing, explicit teaching of
debugging.

## ☕ Support the project

68k Trainer is free and open source. If you want to support its development (new chapters,
the Linux and macOS versions of the emulators…), you can make a donation through PayPal:
**[paypal.me/YMONTFORT](https://paypal.me/YMONTFORT)**. Thank you!

## Found a mistake?

The lessons and exercises are there to be improved: a wrong explanation, an impossible
exercise, a typo? [Open an *issue*](../../issues/new/choose) (template "Erreur dans un cours ou un
exercice", error in a lesson or an exercise). Corrections proposed by *pull request* are also welcome: the
content format is described in [content/parcours/README.md](content/parcours/README.md) (in French).

## Using

See the [user guide](docs/guide_utilisateur.md) (in French).

## Developing

```bash
npm install
npm run dev        # starts the application in development mode
npm test           # tests: emulator, simulated TOS, and real execution of all the content
npm run typecheck
npm run dist:win   # Windows: installer + portable version (lightweight: emulators downloaded) in dist/
npm run dist:win:complet # Windows: the same with Hatari and WinUAE bundled (downloads the packages)
npm run dist:linux # Linux: AppImage + .deb (run it on Linux)
npm run dist:mac   # macOS: universal .dmg (run it on macOS)
```

> If the application does not open from a terminal started by an Electron-based tool, the
> `ELECTRON_RUN_AS_NODE` variable may be set: remove it before `npm run dev`.

| Folder | Contents |
|---|---|
| `src/cpu/` | 68000 emulator (`cpu.ts`, `exceptions.ts`, extension point `platform.ts`) |
| `src/platforms/atari-st/` | Atari ST: simulated TOS, VBL, MFP, IKBD, YM2149, screen, palette |
| `src/platforms/amiga/` | Amiga 500: custom chips, Copper, Blitter, sprites, Paula, CIA, simulated Kickstart |
| `src/asm/` | Devpac-compatible assembler, .PRG and AmigaDOS hunk formats, disassembler (no dependencies) |
| `src/shared/` | course model, progress calculation, exercise checking |
| `src/renderer/` | user interface (TypeScript without a framework, Monaco editor) |
| `content/parcours/` | the `commun/` (shared), `atari/` and `amiga/` courses: one folder per chapter (`chapitre.json`, `.md` lessons, `code.s` code) |
| `content/fichiers/` | files for INCLUDE and INCBIN (including `amiga-systeme.s`: taking over and handing back the system) |
| `content/courses/`, `content/exercises/` | sheets and exercises from version 0.1 |
| `docs/` | status review, source inventory, manual errata, emulator plan, reports (in French) |

The content format is described in [content/parcours/README.md](content/parcours/README.md) (in French).
Every example, solution and prediction is **assembled and run** by
`tests/contenu-parcours.test.ts`: wrong content makes the tests fail.

The packages for the three systems are built by GitHub Actions on each `vX.Y.Z` tag
(`.github/workflows/release.yml`), and the tests run on Windows, Linux and macOS.

## Licence

Free software under the **GNU GPL v3 or later** ([LICENSE](LICENSE)). Third-party components: see
[THIRD_PARTY.md](THIRD_PARTY.md).

## Command-line tools

The assembler and the disassembler (`src/asm/`, no dependencies) also work outside the application:

```bash
npm run asm -- programme.s              # → programme.prg (TOS executable)
npm run asm -- programme.s --bin        # → flat binary
npm run desasm -- PROGRAMME.PRG -o p.s  # → Devpac source that reassembles to the identical binary
```

## Credits

Developed by Yannick Montfort with Claude (Anthropic). Lessons rewritten from Féroce Lapin's
68000 assembly course on the Atari ST, David Bouchet's course (EPITA), Philippe Meyne's course notes
(IUT d'Évry) and the Motorola M68000PRM manual; Amiga course written from Amiga
Intern (Abacus), La Bible de l'Amiga, the Hardware Reference Manual and the AROS sources.
