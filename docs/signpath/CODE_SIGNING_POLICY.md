# Code signing policy

> Brouillon prêt pour SignPath Foundation, **à ne publier qu'une fois la candidature acceptée** :
> le copier alors à la racine du dépôt et le lier depuis le README et la page des releases.

Free code signing provided by [SignPath.io](https://about.signpath.io), certificate by
[SignPath Foundation](https://signpath.org).

## What is signed

The Windows releases of 68k Trainer published on
<https://github.com/yannickmontfort-rgb/68k-trainer/releases>:

- the installer `68k Trainer Setup x.y.z.exe`;
- the portable executable `68k Trainer x.y.z.exe`.

Every signed binary is built by GitHub Actions from the source code of this repository, at the
tagged commit of the release. Nothing built outside this pipeline is signed.

## Team roles

| Role | Members |
|---|---|
| Committers and reviewers | [Yannick Montfort](https://github.com/yannickmontfort-rgb) |
| Approvers | [Yannick Montfort](https://github.com/yannickmontfort-rgb) |

Changes from contributors outside the team are reviewed by a team member before being merged.
Every signing request is approved manually by an approver.

## Privacy policy

This program will not transfer any information to other networked systems unless specifically
requested by the user or the person installing or operating it.

68k Trainer works entirely offline. Learner profiles, progress and code drafts are stored only on
the local computer, in the application's data folder (`%APPDATA%\trainer-68k` on Windows).
