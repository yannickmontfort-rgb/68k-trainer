---
title: "Amiga : du système au hardware"
source: "Guide de Maîtrise de l'Assembleur 68000 sur Amiga (fourni par Yannick, 2026-08)"
themes: ["systeme", "hardware", "outillage"]
---

# Amiga : du système au hardware

## Deux façons de programmer l'Amiga

L'Amiga propose une dualité structurante : programmer "au métal" (accès direct aux registres
matériels des Custom Chips à `$DFFxxx`) ou passer par l'AmigaOS (Kickstart), dont le noyau Exec
offre dès 1985 un multitâche préemptif et des bibliothèques haut niveau.

| | Hardware ("metal") | Système (Kickstart/ROM) |
|---|---|---|
| Cible | registres directs `$DFFxxx` | fonctions en ROM |
| Portabilité | faible (dépend du chipset OCS/ECS/AGA) | élevée (abstraction par bibliothèques) |
| Performance | maximale | contrôlée (latence multitâche) |
| Usage type | démos, jeux, effets graphiques | utilitaires, GUI |
| Multitâche | souvent suspendu | préservé |

## Environnement de développement

- **WinUAE** (émulateur) — configuration "Amiga 500 standard" : CPU 68000 (Cycle Exact), Kickstart
  1.3, 512 Ko Chip RAM + 512 Ko Slow RAM (`$C00000`). **Ne jamais cocher "Wait for Blitter"** :
  cette option rend les opérations du Blitter instantanées dans l'émulateur, masquant des bugs de
  synchronisation qui feraient planter le code sur une vraie machine (le CPU y est souvent plus
  rapide que le Blitter).
- **ASM One** — éditeur/assembleur/débogueur intégré. `WO` (Write Object) génère un exécutable
  Workbench ; `WB` (Write Binary) génère un binaire brut (utile pour des données de piste par
  exemple).

## Mémoire segmentée et structure Node

**Chip RAM** est la seule mémoire visible par les Custom Chips — un buffer destiné au Blitter
alloué en Fast/Slow RAM ne fait pas planter le système, mais le Blitter travaillera sur des données
fantômes ou ne fera rien du tout (bug silencieux, pas de crash).

Tout le système repose sur des listes chaînées de **Node** — c'est ainsi qu'Exec gère bibliothèques,
tâches et périphériques. Les 14 premiers octets de toute structure système :

| Offset | Type | Nom | Description |
|---|---|---|---|
| 0 | APTR | `LN_SUCC` | pointeur vers le nœud suivant |
| 4 | APTR | `LN_PRED` | pointeur vers le nœud précédent |
| 8 | UBYTE | `LN_TYPE` | type de structure (9 = Library, 1 = Task) |
| 9 | BYTE | `LN_PRI` | priorité (ordonnanceur) |
| 10 | APTR | `LN_NAME` | pointeur vers le nom (ex: `"exec.library"`) |

**L'adresse `$4` (ExecBase)** est le point d'ancrage universel : la seule adresse fixe du système,
qui permet de retrouver toutes les autres ressources dans une carte mémoire par ailleurs entièrement
dynamique.

## Appeler une fonction système : offsets négatifs

Les bibliothèques Kickstart exposent leurs données à des offsets positifs, mais leurs **fonctions à
des offsets négatifs** depuis l'adresse de base de la bibliothèque, chargée dans **A6** :

```asm
        move.l  $4,a6               ; ExecBase dans A6
        lea     intName(pc),a1      ; nom de la bibliothèque à ouvrir
        moveq   #0,d0               ; version 0 = dernière version disponible
        jsr     -552(a6)            ; OpenLibrary() : $-552 est un offset fixe et documenté
        move.l  d0,intBase          ; sauvegarde la base retournée (0 si l'ouverture échoue)
```

> Les 4 premières entrées de toute bibliothèque (`-6`, `-12`, `-18`, `-24`) sont réservées par le
> système (Open/Close/Expunge/Reserved) — jamais à réutiliser pour ses propres fonctions.

**Registres corrompus par un appel système** : après tout `JSR -offset(A6)`, considérer `D0-D1` et
`A0-A1` comme corrompus (convention "scratch registers") — sauvegarder ce qui doit survivre ailleurs
avant l'appel.

## Messages et signaux (base du multitâche)

La communication inter-tâches suit un cycle strict : `Wait` (la tâche s'endort) → `GetMsg`
(réception) → `ReplyMsg` (réponse). **Oublier `ReplyMsg` est une faute grave** : l'expéditeur ne
peut alors jamais récupérer/libérer la structure du message — fuite de mémoire garantie.

## Exemple : ouvrir une fenêtre Intuition

```asm
; --- Ouverture d'une fenêtre simple sur le Workbench ---
        move.l  $4,a6
        lea     intName(pc),a1
        moveq   #0,d0
        jsr     -552(a6)             ; OpenLibrary
        move.l  d0,intBase

        move.l  d0,a6                ; IntuitionBase dans A6
        lea     nw_struct(pc),a0     ; structure NewWindow
        jsr     -156(a6)             ; OpenWindow
        move.l  d0,windowPtr
        rts

intName:    dc.b "intuition.library",0
        even                          ; toujours aligner sur adresse paire après un DC.B de taille impaire

nw_struct:                            ; structure NewWindow
        dc.w 20,20                    ; LeftEdge, TopEdge
        dc.w 300,100                  ; Width, Height
        dc.b 0,1                      ; DetailPen, BlockPen
        dc.l $200                     ; IDCMP_CLOSEWINDOW
        dc.l $F                       ; Flags (SmartRefresh, WindowClose, ...)
        dc.l 0                        ; FirstGadget
        dc.l 0                        ; CheckMark
        dc.l title(pc)                ; WindowTitle
        dc.l 0,0                      ; Screen, BitMap
        dc.w 100,50,640,256           ; Min/Max Width/Height
        dc.w 1                        ; Type (WBENCHSCREEN)

title:      dc.b "Ma Fenetre",0
        even
intBase:    dc.l 0
windowPtr:  dc.l 0
```

## Le Blitter et le tracé de lignes

Le **Blitter** est un coprocesseur travaillant en parallèle du 68000, excellent pour l'algorithme de
**Bresenham** (tracé de lignes) et le remplissage de zones via les registres `BLTCON0`/`BLTCON1`.

Deux modes de remplissage (*Area Fill*) :
- **Inclusive Fill** — remplit et conserve le bord.
- **Exclusive Fill** — remplit mais efface le bord (indispensable pour éviter des artefacts quand
  plusieurs polygones sont adjacents).

> **Piège du mode "Single Bit"** : pour tracer des lignes destinées à être remplies, le mode
> "Single Bit" du Blitter est obligatoire. Si une ligne horizontale contient deux pixels adjacents,
> la logique de remplissage (basée sur un XOR) active le remplissage au premier pixel puis le
> désactive immédiatement au second — un "trou" apparaît dans la forme.

## AmigaDOS et le format BCPL

AmigaDOS hérite du langage BCPL, avec des contraintes propres :
- **BPTR** — un pointeur BCPL pointe vers des mots de 32 bits ; pour l'utiliser comme adresse
  68000 normale, le multiplier par 4 (`LSL.L #2,D0`).
- **BSTR** — contrairement aux chaînes C (terminées par zéro), une BSTR **commence** par un octet
  de longueur.
- **Lock** — obtient un descripteur sur un fichier sans l'ouvrir, pour l'utiliser avec `Examine`
  (taille, date...).

## Stockage : disquette et bootblock

Une disquette Amiga standard : 880 Ko (80 cylindres × 2 faces × 11 secteurs de 512 octets).

Le **bootblock** occupe les 2 premiers secteurs de la piste 0 : signature `"DOS\0"` (4 octets), une
somme de contrôle sur les 1024 octets (la somme de tous les mots de 32 bits doit être nulle après
ajustement), puis le système saute à l'offset **+12** pour exécuter le code de boot.

## Note historique : la protection CopyLock

La protection *CopyLock* (Rob Norten) reposait sur des pistes à densité anormale (MFM) et déclenchait
volontairement des exceptions (instructions illégales comme `$4AFC`) pour passer en mode superviseur
et gêner le traçage — mentionné ici comme exemple historique de la scène Amiga, pas comme technique à
reproduire.

## Exercices suggérés par la source (non encore formalisés dans la banque)

1. **Débutant** — allouer 512 octets en Chip RAM (`AllocMem`), y écrire `$DEADBEEF`, libérer
   proprement (`FreeMem`).
2. **Intermédiaire** — ouvrir une fenêtre Intuition ; dans une boucle `Wait`, changer la couleur de
   fond (`$DFF180`) à chaque réception d'un message `VANILLAKEY`.
3. **Avancé** — tracer un triangle au Blitter en mode "Single Bit", puis "Exclusive Fill" en mode
   "Descending" pour le remplir.
