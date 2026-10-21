---
title: "Amiga : du système au hardware"
source: "Guide de Maîtrise de l'Assembleur 68000 sur Amiga (fourni par Yannick, 2026-08) ; Amiga ROM Kernel Reference Manual, sources d'AROS. Complétée et corrigée le 21/10/2026."
themes: ["systeme", "hardware", "outillage"]
---

# Amiga : du système au hardware

## Deux façons de programmer l'Amiga

L'Amiga propose une dualité structurante : passer par l'**AmigaOS** (Kickstart en ROM), dont le
noyau **Exec** offre dès 1985 un multitâche préemptif, ou programmer « au métal » en écrivant
directement dans les registres des **puces custom** (`$DFF000` et suivants).

| | Système (bibliothèques) | Hardware (« metal ») |
|---|---|---|
| Cible | fonctions des bibliothèques (exec, dos, graphics…) | registres directs `$DFFxxx`, CIA `$BFxxxx` |
| Portabilité | élevée (A500 à A4000, AROS) | faible (dépend du chipset OCS/ECS/AGA) |
| Performance | contrôlée (le multitâche continue) | maximale |
| Usage type | utilitaires, outils du Shell, applications Workbench | démos, jeux, effets |
| Multitâche | préservé | suspendu le temps du programme, puis **rendu** |

Les deux se combinent : un programme « metal » bien élevé **demande** la machine au système
(`Forbid`, `OwnBlitter`, `LoadView(0)`…), puis la lui **rend** dans l'état exact où il l'a trouvée
(voir [la fiche des puces](demos-et-custom-chips.md)).

## Environnement de développement

- **68k Trainer** — simule un Amiga 500 (68000, OCS, Kickstart 1.3 simplifié, PAL) : exec, dos et
  graphics en partie, toutes les puces custom. Le débogueur montre les registres des puces, et
  « Exporter pour l'Amiga » produit un vrai exécutable AmigaDOS (format *hunk*).
- **WinUAE avec AROS** — installé par 68k Trainer (onglet « Émulateurs ») : un Amiga 68020 avec le
  Kickstart libre AROS, pour essayer ses programmes sur un vrai système (bouton « Essayer dans
  WinUAE »). AROS demande un 68020, sur lequel la table des vecteurs peut être déplacée (VBR).
- **Avec un vrai Kickstart** (vendu avec Amiga Forever) : configurer WinUAE en Amiga 500 (68000,
  Kickstart 1.3, 512 Ko de Chip RAM + 512 Ko de « Slow RAM » en `$C00000`). **Ne pas cocher
  « Immediate Blitter »** : le Blitter y devient instantané, ce qui masque les oublis d'attente de
  fin du Blitter qui planteraient une vraie machine.
- **ASM-One / AsmPro, Devpac Amiga, vasm** — les assembleurs de l'époque et d'aujourd'hui.

## Les types de mémoire

| Mémoire | Vue par | Remarque |
|---|---|---|
| **Chip RAM** | le 68000 **et** les puces custom | obligatoire pour tout ce que les puces lisent : bitplanes, listes Copper, sprites, sons, données du Blitter |
| **Fast RAM** | le 68000 seul | plus rapide : le 68000 n'y attend jamais les puces |
| **Slow RAM** (`$C00000`, extension A501) | le 68000 seul | sur le bus des puces, donc aussi lente que la Chip |
| ROM (`$F80000`-`$FFFFFF`) | | le Kickstart |

Un tampon pour les puces alloué en Fast RAM ne fait pas planter le système : les puces liront
simplement **autre chose** (bug silencieux). On demande donc explicitement de la Chip RAM :

```asm
        MOVEA.L 4.W,A6          ; ExecBase
        MOVE.L  #10240,D0       ; taille en octets
        MOVE.L  #$10002,D1      ; MEMF_CHIP ($2) + MEMF_CLEAR ($10000) : Chip RAM remplie de 0
        JSR     -198(A6)        ; AllocMem → D0 = adresse, 0 si échec
        TST.L   D0
        BEQ     PAS_DE_MEMOIRE  ; toujours tester !
        MOVE.L  D0,TAMPON
        ; ...
        MOVEA.L TAMPON,A1       ; à la fin : FreeMem(adresse, MÊME taille)
        MOVE.L  #10240,D0
        JSR     -210(A6)
```

Dans un exécutable, `SECTION nom,DATA_C` (ou `BSS_C`, `CODE_C`) demande au chargeur de placer la
section en Chip RAM — c'est le plus simple pour des données fixes (image, liste Copper).

## ExecBase et la structure Node

**L'adresse `$4` contient l'adresse d'ExecBase** : c'est la **seule adresse fixe** du système ; tout
le reste (bibliothèques, tâches, mémoire) se retrouve à partir d'elle.

Tout le système repose sur des **listes doublement chaînées** de *nodes* : bibliothèques, tâches,
ports, périphériques. Les 14 premiers octets de toute structure système :

| Offset | Type | Nom | Description |
|---|---|---|---|
| 0 | APTR | `LN_SUCC` | nœud suivant |
| 4 | APTR | `LN_PRED` | nœud précédent |
| 8 | UBYTE | `LN_TYPE` | type (1 = tâche, 4 = port de messages, 9 = bibliothèque, 13 = processus) |
| 9 | BYTE | `LN_PRI` | priorité (−128 à 127 ; l'ordonnanceur prend la plus haute) |
| 10 | APTR | `LN_NAME` | adresse du nom (ex : `"exec.library"`) |

Quelques champs d'ExecBase utiles : `LIB_VERSION` (mot en +20 : 34 pour le Kickstart 1.3, 37 pour
le 2.04, 40 pour le 3.1), `ThisTask` (+276 : la tâche en cours), `AttnFlags` (mot en +296 : le
processeur ; bit 0 = 68010 ou plus, bit 1 = 68020 ou plus).

## Appeler une fonction système : décalages négatifs

Une bibliothèque est un bloc de mémoire : ses **données** sont aux décalages **positifs** depuis son
adresse de base, et ses **fonctions** aux décalages **négatifs** (une table de `JMP` de 6 octets).
On met l'adresse de base dans **A6**, les paramètres dans les registres prévus, puis
`JSR décalage(A6)` :

```asm
        MOVEA.L 4.W,A6          ; ExecBase dans A6
        LEA     DOSNOM(PC),A1   ; nom de la bibliothèque
        MOVEQ   #33,D0          ; version minimale (33 = Kickstart 1.2) ; 0 = n'importe laquelle
        JSR     -552(A6)        ; OpenLibrary → D0 = base de la bibliothèque, 0 si échec
        TST.L   D0
        BEQ.S   ECHEC
        MOVEA.L D0,A6           ; DOSBase dans A6
        JSR     -60(A6)         ; Output() → D0 = la sortie du Shell
        MOVE.L  D0,D1           ; dos : paramètres dans D1, D2, D3…
        LEA     TEXTE(PC),A0
        MOVE.L  A0,D2
        MOVEQ   #FIN-TEXTE,D3   ; longueur
        JSR     -48(A6)         ; Write(sortie, texte, longueur)
        MOVEA.L A6,A1
        MOVEA.L 4.W,A6
        JSR     -414(A6)        ; CloseLibrary(DOSBase)
        MOVEQ   #0,D0           ; code de retour : 0 = tout va bien
        RTS
ECHEC:  MOVEQ   #20,D0          ; 20 = échec grave
        RTS

DOSNOM: DC.B    'dos.library',0
TEXTE:  DC.B    'Bonjour Amiga !',10
FIN:
        EVEN
```

- Les 4 premières entrées de toute bibliothèque (`-6`, `-12`, `-18`, `-24` : Open, Close, Expunge,
  réservée) servent au système ; la première fonction propre est en `-30`.
- **Registres détruits par tout appel** : `D0`, `D1`, `A0`, `A1` (le résultat est dans D0). Les autres
  sont préservés — A6 compris.
- Les décalages des fonctions courantes sont dans [la fiche des bibliothèques](bibliotheques-exec-dos.md).

## Lancement depuis le Shell ou le Workbench

Un programme reçoit le contrôle par un simple `JSR` : il se termine par **`RTS`** avec un **code de
retour dans D0** (0 = bon, 5 = avertissement, 10 = erreur, 20 = échec). Un script AmigaDOS s'arrête
si un code atteint sa limite (`FailAt`, 10 par défaut) : un D0 oublié, qui contient n'importe quoi,
peut donc arrêter le script qui a lancé le programme.

- **Depuis le Shell (CLI)** : A0 pointe sur la ligne d'arguments, D0 en donne la longueur ; `Output()`
  est la fenêtre du Shell.
- **Depuis le Workbench (icône)** : pas de fenêtre de sortie (`Output()` vaut 0), et un **message
  de démarrage** (*WBStartup*) attend sur le port du processus. Le programme doit le récupérer au
  début (`WaitPort`, `GetMsg` sur `pr_MsgPort`, +92 dans la structure Process) et y répondre à la fin
  (`Forbid` puis `ReplyMsg`) — sinon le Workbench ne libère jamais le programme. On sait d'où l'on
  vient par `pr_CLI` (+172) : 0 = lancé par le Workbench.

L'export Amiga de 68k Trainer ajoute ce code de démarrage tout seul : le programme marche depuis le
Shell comme depuis une icône (une fenêtre console s'ouvre alors pour sa sortie).

## Messages et signaux (base du multitâche)

Les tâches communiquent par **messages** envoyés à des **ports** ; l'arrivée d'un message réveille
la tâche par un **signal**. Le cycle est toujours le même : `WaitPort` (ou `Wait` sur le signal du
port : la tâche dort sans consommer de temps) → `GetMsg` (récupérer le message) → traiter →
`ReplyMsg` (le rendre). **Oublier `ReplyMsg` est une faute grave** : l'expéditeur ne peut jamais
récupérer sa structure — fuite de mémoire, ou blocage.

Jamais d'**attente active** (boucle qui teste en permanence) dans un programme système : elle vole
tout le temps processeur aux autres tâches. Pour patienter, `Delay(n)` de dos (*n* cinquantièmes de
seconde) ou `WaitTOF` de graphics (une image).

## Exemple : ouvrir une fenêtre Intuition

```asm
        MOVEA.L 4.W,A6
        LEA     INTNOM(PC),A1
        MOVEQ   #0,D0
        JSR     -552(A6)        ; OpenLibrary("intuition.library", 0)
        MOVE.L  D0,INTBASE
        BEQ.S   .fin
        MOVEA.L D0,A6           ; IntuitionBase dans A6
        LEA     FENETRE(PC),A0  ; structure NewWindow
        JSR     -204(A6)        ; OpenWindow → D0 = Window, 0 si échec
        MOVE.L  D0,WINDOWPTR
        ; ... attendre le message de fermeture sur le port de la fenêtre (Window+86 : UserPort) ...
        MOVEA.L WINDOWPTR,A0
        JSR     -72(A6)         ; CloseWindow
        MOVEA.L A6,A1
        MOVEA.L 4.W,A6
        JSR     -414(A6)        ; CloseLibrary
.fin:   MOVEQ   #0,D0
        RTS

INTNOM: DC.B    'intuition.library',0
        EVEN                    ; toujours réaligner après un DC.B de longueur impaire

FENETRE:                        ; structure NewWindow (48 octets)
        DC.W    20,20           ; LeftEdge, TopEdge
        DC.W    300,100         ; Width, Height
        DC.B    0,1             ; DetailPen, BlockPen
        DC.L    $200            ; IDCMPFlags : CLOSEWINDOW
        DC.L    $F              ; Flags : SIZING, DRAGBAR, DEPTH, CLOSE (rafraîchissement SMART)
        DC.L    0               ; FirstGadget
        DC.L    0               ; CheckMark
        DC.L    TITRE           ; Title
        DC.L    0,0             ; Screen, BitMap
        DC.W    100,50,640,256  ; MinWidth, MinHeight, MaxWidth, MaxHeight
        DC.W    1               ; Type : WBENCHSCREEN

TITRE:  DC.B    'Ma fenetre',0
        EVEN
INTBASE:   DC.L 0
WINDOWPTR: DC.L 0
```

## AmigaDOS et l'héritage du BCPL

AmigaDOS vient du système TRIPOS, écrit en BCPL, d'où des conventions à part :
- **BPTR** — un pointeur BCPL compte en **longs** : pour obtenir une adresse 68000, le multiplier
  par 4 (`LSL.L #2,D0`). Les fichiers (`Open`) et les verrous (`Lock`) sont des BPTR.
- **BSTR** — une chaîne BCPL **commence** par un octet de longueur (pas de zéro final).
- **Paramètres dans D1, D2, D3…** pour les fonctions de dos (et non A0/A1 comme dans exec).
- **Lock** — un « verrou » sur un fichier ou un répertoire, sans l'ouvrir : pour `Examine` (taille,
  date…), `CurrentDir`, ou vérifier qu'un fichier existe. Chaque `Lock` se libère par `UnLock`.

## Stockage : disquette et bootblock

Une disquette Amiga standard : 880 Ko (80 cylindres × 2 faces × 11 secteurs de 512 octets).

Le **bootblock** occupe les 2 premiers secteurs (1 024 octets) : la signature `"DOS"` suivie d'un
octet de type (0 = OFS), une **somme de contrôle** (long en +4), le numéro du bloc racine (+8, 880),
puis le code de démarrage en **+12**, appelé avec A6 = ExecBase et A1 = la requête du lecteur. La
somme se calcule en additionnant les 256 longs avec report de la retenue (`ADDX`) ; on choisit la
valeur en +4 pour que la somme complète vaille `$FFFFFFFF`.

## Note historique : la protection CopyLock

La protection *CopyLock* (Rob Northen) reposait sur des pistes à la synchronisation MFM
inhabituelle et sur un code chiffré qui déclenchait volontairement des exceptions (mode trace,
instructions illégales comme `$4AFC`) pour gêner l'analyse — mentionné ici comme exemple historique
de la scène Amiga, pas comme technique à reproduire.

## Pour pratiquer

Le parcours Amiga de 68k Trainer met tout cela en exercices : chapitre 4 (le système : exec, dos,
messages), chapitre 5 (prendre et rendre la machine), puis le Copper, le Blitter, les sprites et
Paula. Les exercices sont aussi dans l'onglet **Exercices libres**.

> Fiche complétée et corrigée le 21/10/2026 (Claude) : `OpenWindow` est en `-204` (et non `-156`),
> `DC.L title(pc)` n'était pas valable, somme du bootblock corrigée (`$FFFFFFFF` avec report de
> retenue), Rob Northen, option « Immediate Blitter » ; ajouts : AllocMem, ExecBase, lancement
> Shell/Workbench, codes de retour, environnement 68k Trainer — à relire.
