---
title: "Amiga : Custom Chips et techniques de démo"
source: "Amiga : Maîtrise de la Programmation Système et des Démos (fourni par Yannick, 2026-08) ; Amiga Hardware Reference Manual. Complétée et corrigée le 21/10/2026."
themes: ["hardware", "graphisme", "demo"]
---

# Amiga : Custom Chips et techniques de démo

> Complète [systeme-et-hardware.md](systeme-et-hardware.md) (bases du système et de la mémoire). Les
> adresses et les bits de chaque registre sont rassemblés dans
> [la fiche des registres des puces](registres-custom.md).

## Les puces de l'Amiga 500 (OCS)

| Puce | Rôle |
|---|---|
| **Agnus** | les DMA (accès direct à la Chip RAM pour les autres puces), le **Copper**, le **Blitter**, le compteur du faisceau |
| **Denise** | l'affichage : bitplanes, palette, sprites, collisions |
| **Paula** | le son (4 voies DMA), les interruptions, le lecteur de disquette, le port série, les potentiomètres |
| **CIA A et B** (8520) | timers, clavier, souris (boutons), joystick (bouton), lecteur, port parallèle |

Les registres des puces custom sont des **mots** à partir de `$DFF000` : on les adresse
habituellement par `décalage(A5)` avec `A5 = $DFF000`. Beaucoup sont en **écriture seule** : on
ne peut pas les relire (il faut garder une copie de ce qu'on y a mis).

**Registres « SET/CLR »** (`DMACON`, `INTENA`, `INTREQ`, `ADKCON`) : le bit 15 dit s'il faut
**mettre à 1** (bit 15 = 1) ou **mettre à 0** (bit 15 = 0) les autres bits écrits à 1 ; les bits à 0
ne changent pas. `MOVE.W #$7FFF,DMACON` coupe tout, `MOVE.W #$8380,DMACON` allume DMA général,
bitplanes et Copper.

## Prendre la machine, puis la rendre

Un programme qui écrit directement dans les puces doit d'abord **demander** la machine au système,
et la lui **rendre** à la fin dans l'état exact où il l'a trouvée :

1. ouvrir graphics, garder la vue affichée (`gb_ActiView`), puis `LoadView(0)` et deux `WaitTOF` ;
2. `OwnBlitter` puis `WaitBlit` ; `Forbid` (plus d'autres tâches) ;
3. **sauvegarder** `DMACONR`, `INTENAR`, `ADKCONR` et le vecteur de niveau 3 (`$6C`) ;
4. tout couper : `INTENA`, `INTREQ` et `DMACON` à `$7FFF` ;
5. … le programme …
6. à la fin, dans l'ordre inverse : tout couper, remettre le vecteur, `COP1LC` = `gb_copinit`
   (la liste Copper du système), rallumer les DMA et interruptions sauvegardés (avec le bit 15, et
   le bit 14 `INTEN` pour `INTENA`), `LoadView(ancienne vue)`, `DisownBlitter`, `Permit`.

Le fichier `amiga-systeme.s` fourni par 68k Trainer fait tout cela (`BSR prendre` / `BSR rendre`),
y compris le cas des 68010 et plus, où la table des vecteurs peut être ailleurs qu'en `$0` (registre
**VBR**) : écrire en `$6C` n'y servirait à rien.

## Denise : bitplanes et palette

L'écran est fait de **bitplanes** superposés : chaque bitplane fournit **un bit** du numéro de
couleur de chaque pixel. *n* bitplanes → 2ⁿ couleurs (1 à 5 plans : 2 à 32 couleurs). Contrairement
à l'Atari ST, chaque plan est une **image séparée** en mémoire (et non des mots entrelacés).

| Registre | Rôle |
|---|---|
| `COLOR00`-`COLOR31` (`$180`-`$1BE`) | la palette : 32 mots `$0RVB` (12 bits, 4 096 couleurs) ; `COLOR00` est aussi le fond et la bordure |
| `BPL1PT`-`BPL6PT` (`$0E0`-`$0F6`) | adresse de chaque bitplane, en Chip RAM, **à réécrire à chaque image** (par le Copper) |
| `BPLCON0` (`$100`) | nombre de plans (bits 14-12), haute résolution, HAM, double playfield, entrelacé |
| `BPLCON1` (`$102`) | retard horizontal de 0 à 15 pixels de chaque playfield (défilement fin) |
| `BPLCON2` (`$104`) | priorités entre playfields et sprites |
| `BPL1MOD` / `BPL2MOD` (`$108` / `$10A`) | octets sautés à la fin de chaque ligne (plans impairs / pairs) |
| `DIWSTRT` / `DIWSTOP` (`$08E` / `$090`) | coins de la fenêtre d'affichage |
| `DDFSTRT` / `DDFSTOP` (`$092` / `$094`) | début et fin de la lecture des données à chaque ligne |

Écran standard PAL 320 × 256 : `DIWSTRT` = `$2C81`, `DIWSTOP` = `$2CC1`, `DDFSTRT` = `$0038`,
`DDFSTOP` = `$00D0`, modulos à 0 ; 40 octets par ligne et par plan, 10 240 octets par plan.

Modes spéciaux : **Extra Half-Brite** (EHB, 6 plans) — les couleurs 32 à 63 sont les couleurs 0 à 31
à **demi-luminosité** ; **HAM** (*Hold And Modify*, 6 plans) — chaque pixel prend une des 16
premières couleurs, ou **modifie une seule composante** (rouge, vert ou bleu) de son voisin de gauche :
4 096 couleurs à l'écran.

## Le Copper : le coprocesseur du faisceau

Le **Copper** exécute une liste d'instructions en Chip RAM, **synchronisée avec le faisceau** qui
balaie l'écran (50 images par seconde en PAL, 313 lignes). Il ne connaît que trois instructions,
de deux mots chacune :

| Instruction | 1er mot | 2e mot | Effet |
|---|---|---|---|
| `MOVE` | n° du registre (décalage pair) | valeur | écrit la valeur dans un registre des puces |
| `WAIT` | position : ligne (bits 15-8), colonne (bits 7-1), bit 0 = 1 | masque, bit 0 = 0 (`$FFFE` habituel) | attend que le faisceau atteigne la position |
| `SKIP` | position, bit 0 = 1 | masque, bit 0 = 1 | saute l'instruction suivante si la position est dépassée |

La liste se termine par `$FFFF,$FFFE` (une attente impossible). Le Copper **recommence au début** de
sa liste à chaque image : c'est là qu'on remet les pointeurs de bitplanes et de sprites.

```asm
        SECTION code,CODE       ; le code d'abord : le programme démarre au début de la 1re section
        BSR     prendre         ; (amiga-systeme.s) A5 = $DFF000, tout est coupé
        LEA     LISTE,A0
        MOVE.L  A0,$80(A5)      ; COP1LC : adresse de la liste
        MOVE.W  D0,$88(A5)      ; COPJMP1 : le Copper y saute (valeur écrite sans importance)
        MOVE.W  #$8280,$96(A5)  ; DMACON : DMA général (bit 9) + Copper (bit 7)
        BSR     attendre_clic
        BSR     rendre
        MOVEQ   #0,D0
        RTS

        SECTION copper,DATA_C   ; la liste Copper DOIT être en Chip RAM
LISTE:  DC.W    $0180,$0000     ; MOVE : COLOR00 = noir
        DC.W    $6401,$FFFE     ; WAIT : ligne $64 (100)
        DC.W    $0180,$0F00     ; COLOR00 = rouge
        DC.W    $9601,$FFFE     ; WAIT : ligne $96 (150)
        DC.W    $0180,$000F     ; COLOR00 = bleu
        DC.W    $FFFF,$FFFE     ; fin de la liste

        INCLUDE "amiga-systeme.s"
```

- La position de ligne n'a que 8 bits dans un `WAIT` : pour attendre au-delà de la ligne 255
  (bas d'un écran PAL), on attend d'abord `$FFDF,$FFFE` (fin de la ligne 255), puis la ligne voulue
  moins 256.
- Un dégradé (*copper bars*, *raster bars*) n'est qu'une suite de `WAIT` + `MOVE COLOR00`.

## Le Blitter : copier et combiner des blocs

Le **Blitter** copie et combine des rectangles de mémoire (en mots) **bien plus vite** que le 68000,
en parallèle de lui. Il lit jusqu'à **3 sources** (A, B, C), les combine par une fonction logique
quelconque (le **minterm**, 8 bits), et écrit le résultat dans la destination **D**. Il sait aussi
**décaler** A et B de 0 à 15 bits (pour placer un objet au pixel près), **masquer** le premier et le
dernier mot de A, **remplir** des formes et **tracer des lignes**.

| Minterm | Résultat | Usage |
|---|---|---|
| `$F0` | D = A | copie |
| `$CC` | D = B | copie de B |
| `$AA` | D = C | recopier le fond |
| `$00` / `$FF` | D = 0 / D = 1 | effacer / remplir |
| `$CA` | D = A·B + Ā·C | **cookie-cut** : objet B découpé par le masque A, sur le fond C |
| `$3C` | D = A ⊕ B | OU exclusif |

Le travail démarre **à l'écriture de `BLTSIZE`** (hauteur × 64 + largeur en mots). Avant de
reprogrammer le Blitter, **attendre qu'il ait fini** (bit 14 `BBUSY` de `DMACONR`) : sur une vraie
machine, le 68000 va souvent plus vite que lui.

```asm
; Copier un bloc de 64 x 32 pixels (4 mots x 32 lignes) d'un écran de 40 octets par ligne
        BSR     attendre_blitter        ; (amiga-systeme.s) le Blitter a fini son travail précédent
        MOVE.L  #$09F00000,$40(A5)      ; BLTCON0/BLTCON1 : sources A et D, D = A ($F0)
        MOVE.L  #$FFFFFFFF,$44(A5)      ; BLTAFWM/BLTALWM : aucun masque
        MOVE.L  #SOURCE,$50(A5)         ; BLTAPT
        MOVE.L  #DESTINATION,$54(A5)    ; BLTDPT
        MOVE.W  #40-8,$64(A5)           ; BLTAMOD : octets sautés à chaque ligne
        MOVE.W  #40-8,$66(A5)           ; BLTDMOD
        MOVE.W  #32*64+4,$58(A5)        ; BLTSIZE : 32 lignes de 4 mots — c'est parti
```

**Remplissage** : en mode remplissage (bits `IFE`/`EFE` de `BLTCON1`, avec le mode **descendant**),
le Blitter balaie chaque ligne de droite à gauche et inverse le remplissage à chaque bit à 1
rencontré. **Inclusif** : les bords sont gardés ; **exclusif** : le bord de fin est effacé (formes
adjacentes sans double bord).

**Tracé de lignes** : en mode ligne (bit `LINE`), le Blitter trace un segment par l'algorithme de
**Bresenham**. Pour une forme à remplir ensuite, utiliser le mode « un seul point par ligne
horizontale » (bit `SING`) : deux pixels voisins sur une même ligne inverseraient deux fois le
remplissage et laisseraient un trou.

## Sprites

**8 sprites** matériels de **16 pixels de large** et de hauteur quelconque, en **3 couleurs** plus
la transparence, groupés par paires qui partagent leurs couleurs (sprites 0-1 : `COLOR17`-`19`,
2-3 : `COLOR21`-`23`, 4-5 : `COLOR25`-`27`, 6-7 : `COLOR29`-`31`). Deux sprites d'une paire peuvent
être **attachés** : ils forment un sprite de **15 couleurs** plus la transparence (`COLOR17`-`31`).

Leurs données sont lues en Chip RAM par le **DMA des sprites** (canal `SPREN` de `DMACON`) ; le
Copper se contente en général de remettre leurs pointeurs (`SPRxPT`) à chaque image. Une
structure de sprite : un mot de position (`SPRxPOS`), un mot de contrôle (`SPRxCTL`), puis deux mots
par ligne (plan 0, plan 1), et deux mots à 0 pour finir. Un sprite se déplace en ne changeant que ses
deux premiers mots : aucun redessin du décor.

## Interruptions

`INTENA` (`$09A`, lecture par `INTENAR` `$01C`) autorise les sources ; `INTREQ` (`$09C`, lecture par
`INTREQR` `$01E`) dit lesquelles ont eu lieu. Le bit 14 d'`INTENA` (`INTEN`) est l'interrupteur
général.

| Niveau | Vecteur | Sources (bit d'`INTENA`/`INTREQ`) |
|---|---|---|
| 1 | `$64` | port série : émission (0), disque : bloc fini (1), logiciel (2) |
| 2 | `$68` | **CIA A** : clavier, timers (3, `PORTS`) |
| 3 | `$6C` | **Copper** (4), **VBL** (5, `VERTB`), **Blitter** fini (6) |
| 4 | `$70` | voies audio 0 à 3 (7 à 10) |
| 5 | `$74` | port série : réception (11), disque : synchronisation (12) |
| 6 | `$78` | **CIA B** (13, `EXTER`) |

Une routine d'interruption « metal » doit **effacer elle-même sa demande** dans `INTREQ` (deux fois
de suite sur les 68020 et plus, plus rapides que la puce), puis finir par `RTE` :

```asm
NIVEAU3:
        BTST    #5,$DFF01F      ; INTREQR, octet bas : bit 5 = VBL ?
        BEQ.S   .pas_vbl
        MOVEM.L D0-D7/A0-A6,-(SP)
        ; ... le travail de chaque image ...
        MOVEM.L (SP)+,D0-D7/A0-A6
.pas_vbl:
        MOVE.W  #$0070,$DFF09C  ; INTREQ : efface Copper, VBL et Blitter (bits 4 à 6)
        MOVE.W  #$0070,$DFF09C
        RTE
```

En programmation système, on passe plutôt par `AddIntServer` (exec) : le système appelle notre
routine à chaque VBL, sans qu'on touche au vecteur.

## Les puces CIA

Deux 8520 : **CIA A** aux adresses **impaires** à partir de `$BFE001`, **CIA B** aux adresses
**paires** à partir de `$BFD000` ; leurs registres sont espacés de `$100`. Registres de 8 bits, souvent
**actifs à 0**.

| Adresse | Registre | Contenu notable |
|---|---|---|
| `$BFE001` | CIA A, `PRA` | bit 6 = bouton gauche de la souris (port 1), bit 7 = bouton du joystick (port 2), bit 1 = voyant et filtre audio |
| `$BFEC01` | CIA A, `SDR` | octet reçu du clavier |
| `$BFED01` | CIA A, `ICR` | interruptions de la CIA A |
| `$BFE401` / `$BFE501` | CIA A, timer A | |
| `$BFD100` | CIA B, `PRB` | commande des lecteurs de disquette |

Le **clavier** envoie un code par la ligne série de la CIA A : le code de la touche est l'octet de
`SDR` **inversé** puis tourné d'un bit (`NOT.B D0` puis `ROR.B #1,D0`) ; le bit 7 vaut 1 quand la
touche est relâchée. Le programme doit répondre au clavier (impulsion sur la ligne série) pour
recevoir la touche suivante.

Le **joystick** (port 2) se lit dans `JOY1DAT` (`$00C`), la souris (port 1) dans `JOY0DAT` (`$00A`) :
deux compteurs de 8 bits pour la souris ; pour le joystick, droite = bit 1, gauche = bit 9,
bas = bit 1 ⊕ bit 0, haut = bit 9 ⊕ bit 8.

## Techniques classiques de démo

- **Double buffering** — deux écrans en mémoire : on dessine dans l'un pendant que l'autre est
  affiché, puis on échange les pointeurs de bitplanes (dans la liste Copper) pendant le VBL.
- **Sinus scroll** — texte défilant horizontalement avec une ondulation verticale, par une table de
  sinus précalculée appliquée colonne par colonne (souvent au Blitter).
- **Arithmétique à virgule fixe** — le 68000 ne calcule qu'en entiers ; pour zoomer ou tourner, on
  réserve une partie des bits à la partie fractionnaire (par exemple 16 bits entiers + 16 bits
  fractionnaires), avec des tables de sinus précalculées.
- **Color cycling** — rotation d'un groupe de couleurs de la palette pour animer de l'eau ou des
  néons sans redessiner un seul pixel.
- **Copper bars et plasma** — des centaines de `MOVE COLOR` dans la liste Copper, recalculées à
  chaque image : des dégradés et des plasmas presque sans travail pour le 68000.
- **Dual playfield** — deux décors indépendants de 8 couleurs chacun (3 plans chacun), avec leurs
  propres défilements et priorités (`BPLCON2`) : la profondeur des jeux de plates-formes.
- **Défilement matériel** — `BPLCON1` pour les 15 premiers pixels, puis on avance les pointeurs de
  bitplanes de 2 octets ; un écran plus large que l'affichage et des modulos donnent un décor qui
  défile sans recopie.

## Contexte historique : piratage et scène démo

L'essor des disquettes vierges bon marché à l'ère 16 bits (Amiga, Atari ST) a entraîné un piratage
massif, et des jeux protégés par des pistes anormales. Les intros ajoutées par les groupes de crack
pour signer leur travail (les *cracktros*) ont évolué en **démos** autonomes de plus en plus
sophistiquées : c'est l'origine de la scène démo, toujours vivante aujourd'hui.

> Fiche complétée et corrigée le 21/10/2026 (Claude) : les sprites sont lus par leur DMA (pas par
> le Copper) et une paire attachée donne 15 couleurs ; EHB demande 6 plans ; ajouts : prendre/rendre
> la machine, format des instructions Copper, exemple de liste et de copie au Blitter, minterms,
> table des interruptions, clavier, joystick — à relire.
