---
title: "Amiga : les bibliothèques exec, dos, graphics et intuition (référence)"
source: "Amiga ROM Kernel Reference Manual ; fichiers .conf des sources d'AROS (décalages vérifiés) ; Amiga Intern (Abacus). Fiche créée le 21/10/2026."
themes: ["systeme", "bibliotheques"]
---

# Amiga : les bibliothèques exec, dos, graphics et intuition

> Fiche de référence. Le principe de l'appel (A6 = base, `JSR décalage(A6)`, registres détruits)
> est expliqué dans [la fiche système](systeme-et-hardware.md). Les décalages ci-dessous sont ceux du
> Kickstart 1.3 (et suivants) ; ils ont été vérifiés dans les sources d'AROS — certains livres de
> l'époque (dont *Amiga Intern*) en donnent quelques-uns de faux.

**Rappels** : résultat dans **D0** ; **D0, D1, A0, A1 détruits** par tout appel ; A6 doit contenir la
base de la **bonne** bibliothèque (ExecBase, lue en `$4`, pour exec). Les fonctions marquées sont
simulées par 68k Trainer ; les autres demandent un vrai système (WinUAE avec AROS).

## exec.library (base : `MOVEA.L 4.W,A6`)

| Décalage | Fonction | Paramètres | Résultat / remarque |
|---|---|---|---|
| −30 | `Supervisor(routine)` ★ | A5 = routine | exécute la routine en superviseur ; elle finit par `RTE` |
| −120 | `Disable()` ★ | | coupe les interruptions (imbricable : autant d'`Enable`) |
| −126 | `Enable()` ★ | | |
| −132 | `Forbid()` ★ | | plus de changement de tâche (imbricable : autant de `Permit`) |
| −138 | `Permit()` ★ | | |
| −162 | `SetIntVector(n, interrupt)` | D0 = n° d'interruption, A1 = structure Interrupt | D0 = ancienne |
| −168 | `AddIntServer(n, interrupt)` ★ | D0, A1 | ajoute un serveur (ex : n° 5 = VBL) |
| −174 | `RemIntServer(n, interrupt)` ★ | D0, A1 | |
| −198 | `AllocMem(taille, type)` ★ | D0 = octets, D1 = `MEMF_…` | D0 = adresse, 0 si échec |
| −210 | `FreeMem(adresse, taille)` ★ | A1, D0 = **même** taille | |
| −216 | `AvailMem(type)` ★ | D1 = `MEMF_…` | D0 = octets libres |
| −294 | `FindTask(nom)` ★ | A1 = nom, 0 = soi-même | D0 = tâche |
| −306 | `SetSignal(nouveaux, masque)` ★ | D0, D1 | D0 = anciens signaux |
| −318 | `Wait(signaux)` ★ | D0 = masque | dort jusqu'à l'un des signaux ; D0 = signaux reçus |
| −324 | `Signal(tâche, signaux)` | A1, D0 | |
| −330 | `AllocSignal(n)` | D0 = n° voulu (−1 = n'importe lequel) | D0 = n°, −1 si échec |
| −372 | `GetMsg(port)` | A0 = port | D0 = message, 0 si aucun |
| −378 | `ReplyMsg(message)` | A1 | |
| −384 | `WaitPort(port)` | A0 | attend qu'un message arrive |
| −408 | `OldOpenLibrary(nom)` ★ | A1 | comme `OpenLibrary(nom, 0)` |
| −414 | `CloseLibrary(base)` ★ | A1 | |
| −444 | `OpenDevice(nom, unité, requête, options)` | A0, D0, A1, D1 | D0 = 0 si réussi |
| −450 | `CloseDevice(requête)` | A1 | |
| −456 | `DoIO(requête)` | A1 | entrée-sortie synchrone |
| −522 | `RawDoFmt(format, données, routine, tampon)` ★ | A0, A1, A2, A3 | mise en forme façon `printf` (`%d`, `%x`, `%s`…) |
| −534 | `TypeOfMem(adresse)` ★ | A1 | D0 = `MEMF_CHIP`, `MEMF_FAST`… |
| −552 | `OpenLibrary(nom, version)` ★ | A1, D0 = version minimale | D0 = base, 0 si échec |
| −624 | `CopyMem(source, destination, taille)` ★ | A0, A1, D0 | |
| −630 | `CopyMemQuick(source, destination, taille)` ★ | A0, A1, D0 | adresses et taille multiples de 4 |
| −636 | `CacheClearU()` | | vide les caches des 68020+ (Kickstart 2.0 et plus) |

**Types de mémoire** (`MEMF_…`, à additionner) : `MEMF_PUBLIC` = `$1`, `MEMF_CHIP` = `$2`,
`MEMF_FAST` = `$4`, `MEMF_CLEAR` = `$10000` (remplie de zéros), `MEMF_LARGEST` = `$20000` (pour
`AvailMem` : le plus grand bloc).

**Champs d'ExecBase** : `LIB_VERSION` (+20, mot), `ThisTask` (+276), `AttnFlags` (+296, mot : bit 0 =
68010 ou plus, bit 1 = 68020 ou plus), `VBlankFrequency` (+530, octet : 50 en PAL).

## dos.library (ouvrir `"dos.library"`)

Les paramètres sont dans **D1, D2, D3** ; fichiers et verrous sont des BPTR.

| Décalage | Fonction | Paramètres | Résultat / remarque |
|---|---|---|---|
| −30 | `Open(nom, mode)` ★ | D1 = nom, D2 = 1005 (existant) / 1006 (nouveau) / 1004 (lecture-écriture) | D0 = fichier, 0 si échec |
| −36 | `Close(fichier)` ★ | D1 | |
| −42 | `Read(fichier, tampon, longueur)` ★ | D1, D2, D3 | D0 = octets lus (0 = fin, −1 = erreur) |
| −48 | `Write(fichier, tampon, longueur)` ★ | D1, D2, D3 | D0 = octets écrits |
| −54 | `Input()` ★ | | D0 = entrée du Shell |
| −60 | `Output()` ★ | | D0 = sortie du Shell (0 si lancé par le Workbench) |
| −66 | `Seek(fichier, position, mode)` | D1, D2, D3 = −1 (début) / 0 (courant) / 1 (fin) | D0 = ancienne position |
| −84 | `Lock(nom, mode)` | D1, D2 = −2 (lecture) / −1 (écriture) | D0 = verrou, 0 si absent |
| −90 | `UnLock(verrou)` | D1 | |
| −102 | `Examine(verrou, fib)` | D1, D2 = FileInfoBlock (260 octets, adresse multiple de 4) | D0 ≠ 0 si réussi |
| −132 | `IoErr()` ★ | | D0 = code de la dernière erreur |
| −150 | `LoadSeg(nom)` | D1 | D0 = programme chargé (BPTR) |
| −192 | `DateStamp(date)` | D1 = 3 longs | jours, minutes, tics depuis 1978 |
| −198 | `Delay(tics)` ★ | D1 = 50es de seconde | attend sans consommer de temps processeur |
| −204 | `WaitForChar(fichier, délai)` | D1, D2 = microsecondes | D0 = −1 si un caractère est arrivé |
| −222 | `Execute(commande, entrée, sortie)` | D1, D2, D3 | lance une commande du Shell |

## graphics.library (ouvrir `"graphics.library"`)

La plupart des fonctions de dessin travaillent sur un **RastPort** (A1), la « feuille » de dessin
d'une fenêtre ou d'un écran (`Window+50` : `RPort`).

| Décalage | Fonction | Paramètres | Remarque |
|---|---|---|---|
| −60 | `Text(rp, texte, longueur)` | A1, A0, D0 | écrit à la position courante |
| −66 | `SetFont(rp, police)` | A1, A0 | |
| −72 | `OpenFont(attributs)` | A0 = TextAttr | D0 = police |
| −78 | `CloseFont(police)` | A1 | |
| −192 | `LoadRGB4(viewport, couleurs, n)` | A0, A1 = mots `$0RVB`, D0 | charge une palette |
| −198 | `InitRastPort(rp)` | A1 | |
| −222 | `LoadView(vue)` ★ | A1 (0 = plus rien d'affiché) | |
| −228 | `WaitBlit()` ★ | | attend la fin du Blitter |
| −234 | `SetRast(rp, couleur)` | A1, D0 | remplit tout |
| −240 | `Move(rp, x, y)` | A1, D0, D1 | déplace le crayon |
| −246 | `Draw(rp, x, y)` | A1, D0, D1 | trace une ligne jusqu'à (x, y) |
| −270 | `WaitTOF()` ★ | | attend la prochaine image (VBL) |
| −288 | `SetRGB4(viewport, n, r, v, b)` | A0, D0, D1, D2, D3 (0 à 15) | une couleur |
| −306 | `RectFill(rp, x1, y1, x2, y2)` | A1, D0, D1, D2, D3 | rectangle plein |
| −318 | `ReadPixel(rp, x, y)` | A1, D0, D1 | D0 = couleur |
| −324 | `WritePixel(rp, x, y)` | A1, D0, D1 | |
| −342 | `SetAPen(rp, couleur)` | A1, D0 | couleur de tracé |
| −348 | `SetBPen(rp, couleur)` | A1, D0 | couleur de fond |
| −354 | `SetDrMd(rp, mode)` | A1, D0 = 0 (JAM1), 1 (JAM2), 2 (COMPLEMENT) | |
| −456 | `OwnBlitter()` ★ | | le Blitter est à nous |
| −462 | `DisownBlitter()` ★ | | on le rend |

**Champs de GfxBase** : `ActiView` (+34 : la vue affichée), `copinit` (+38 : la liste Copper du
système, à remettre dans `COP1LC` en rendant la machine).

## intuition.library (ouvrir `"intuition.library"`)

| Décalage | Fonction | Paramètres | Résultat |
|---|---|---|---|
| −66 | `CloseScreen(écran)` | A0 | |
| −72 | `CloseWindow(fenêtre)` | A0 | |
| −96 | `DisplayBeep(écran)` ★ | A0 (0 = tous) | fait clignoter l'écran |
| −198 | `OpenScreen(nouvel_écran)` | A0 = NewScreen | D0 = Screen |
| −204 | `OpenWindow(nouvelle_fenêtre)` | A0 = NewWindow | D0 = Window |

Champs utiles d'une **Window** : `RPort` (+50, son RastPort), `UserPort` (+86, le port où arrivent
ses messages IDCMP : clic sur la case de fermeture, touches…).

## Exemple : afficher un nombre avec RawDoFmt

```asm
        MOVEA.L 4.W,A6
        LEA     FORMAT(PC),A0   ; le format
        LEA     VALEURS(PC),A1  ; les valeurs, dans l'ordre des %
        LEA     RANGE(PC),A2    ; routine appelée pour chaque caractère (D0.B)
        LEA     TAMPON,A3       ; transmis à la routine dans A3
        JSR     -522(A6)        ; RawDoFmt → TAMPON = « Score : 1234 »
        RTS

RANGE:  MOVE.B  D0,(A3)+        ; range le caractère et avance
        RTS

FORMAT:  DC.B   'Score : %d',0  ; %d = un MOT signé (%ld pour un long)
        EVEN
VALEURS: DC.W   1234
TAMPON:  DS.B   40
```

> `%d` lit un **mot** et `%ld` un **long** : se tromper décale toutes les valeurs suivantes.

> Fiche créée le 21/10/2026 (Claude) à partir des décalages vérifiés du simulateur (sources d'AROS)
> — à relire.
