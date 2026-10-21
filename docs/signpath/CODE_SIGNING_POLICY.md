# Code signing policy

> Brouillon prêt pour SignPath Foundation (mis à jour le 21/10/2026), **à ne publier qu'une fois la
> candidature acceptée** : le copier alors à la racine du dépôt et le lier depuis le README et la
> page des releases.

Free code signing provided by [SignPath.io](https://about.signpath.io), certificate by
[SignPath Foundation](https://signpath.org).

## What is signed

The Windows releases of 68k Trainer (standard edition) published on
<https://github.com/yannickmontfort-rgb/68k-trainer/releases>:

- the installer `68k Trainer Setup x.y.z.exe` (and its uninstaller);
- the portable executable `68k Trainer x.y.z.exe`.

Every signed binary is built by GitHub Actions from the source code of this repository, at the
tagged commit of the release. Nothing built outside this pipeline is signed.

The **offline edition** (`68k Trainer Setup x.y.z complet.exe`, `68k Trainer x.y.z complet.exe`)
bundles third-party emulator packages (Hatari, WinUAE, EmuTOS, AROS and the `capsimg.dll` library
required by Hatari). It is **not signed**.

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
run offline.
Learner profiles, progress and code drafts are stored only on the local computer, in the
application's data folder (`%APPDATA%\trainer-68k` on Windows); the emulators are installed in
`%LOCALAPPDATA%\68k Trainer`, and their shared folders in `Documents\68k Trainer`.
