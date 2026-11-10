# Code signing policy

Free code signing provided by [SignPath.io](https://about.signpath.io), certificate by
[SignPath Foundation](https://signpath.org).

> Status: the application to SignPath Foundation is in progress. Until it is accepted, the Windows
> releases are not signed yet.

## What is signed

The Windows releases of 68k Trainer (standard edition) published on
<https://github.com/yannickmontfort-rgb/68k-trainer/releases>:

- the installer `68k Trainer 2 Setup x.y.z.exe` (and its uninstaller);
- the portable executable `68k Trainer 2 x.y.z.exe`.

(GitHub shows the spaces in these file names as dots, for example `68k.Trainer.2.Setup.2.0.1.exe`.)

Every signed binary is built by GitHub Actions from the source code of this repository, at the
tagged commit of the release. Nothing built outside this pipeline is signed.

The **offline edition** (`68k Trainer 2 Setup x.y.z complet.exe`, `68k Trainer 2 x.y.z complet.exe`)
bundles third-party emulator packages (Hatari, WinUAE, EmuTOS, AROS and the `capsimg.dll` library
required by Hatari). It is **not signed**. The Linux (`.AppImage`, `.deb`) and macOS (`.dmg`)
packages are not covered by this policy.

## Team roles

| Role | Members |
|---|---|
| Authors (committers) and reviewers | [Yannick Montfort](https://github.com/yannickmontfort-rgb) |
| Approvers | [Yannick Montfort](https://github.com/yannickmontfort-rgb) |

Changes from contributors outside the team are reviewed by a team member before being merged.
Every signing request is approved manually by an approver.

## Privacy policy

This program will not transfer any information to other networked systems unless specifically
requested by the user or the person installing or operating it.

68k Trainer never sends any data. Its only network access is the download of a study emulator,
when the user asks for it (checkbox in the installer, or "Install" button in the Emulators tab):

| Package | Downloaded from |
|---|---|
| Hatari (with EmuTOS) | <https://framagit.org/hatari/releases> |
| WinUAE | <https://download.abime.net/winuae/releases/> |
| AROS (free Amiga system) | the releases of this repository |

Each package is checked against a SHA-256 hash pinned in the source code before being installed.
These downloads are plain file requests to the sites above (no account, no data sent by 68k Trainer);
they are subject to those sites' own privacy policies. The emulators themselves, once installed,
run offline. Links in the About page (project page, donations) open in the user's own web browser,
only when clicked.

Learner profiles, progress and code drafts are stored only on the local computer, in the
application's data folder (`%APPDATA%\trainer-68k-2` on Windows); the emulators are installed in
`%LOCALAPPDATA%\68k Trainer`, and their shared folders in `Documents\68k Trainer`.
