---
title: "Programmation graphique bas niveau : le framebuffer"
source: "Manuel Technique : Programmation Graphique Bas Niveau sur Atari ST (fourni par Yannick, 2026-08) ; Atari ST Hardware Register Listing. Complétée et corrigée le 21/10/2026."
themes: ["graphisme", "framebuffer"]
---

# Programmation graphique bas niveau : le framebuffer

> Complète [ligne-a-et-gem.md](ligne-a-et-gem.md) : ici on manipule directement la mémoire vidéo,
> sans passer par la Ligne A ni le GEM — pour comprendre ce qu'il y a « sous » ces API, ou pour des
> routines critiques en performance.

## Localiser le framebuffer

L'écran de l'Atari ST est une zone de **32 000 octets** en mémoire vive, lue en permanence par le
circuit vidéo (le *Shifter*). Son adresse n'est **pas fixe** : elle dépend de la quantité de
mémoire et de la version du TOS (`$F8000` sur un 1040 STF). On la demande au XBIOS :

```asm
        MOVE.W  #3,-(SP)        ; XBIOS 3 : Logbase, l'écran où l'on dessine
        TRAP    #14
        ADDQ.L  #2,SP
        MOVEA.L D0,A3           ; A3 = début de l'écran
```

`Physbase()` (XBIOS 2) donne l'écran **affiché** ; les deux sont égaux sauf en double tampon.
`Setscreen()` (XBIOS 5) les change. L'adresse doit être un multiple de 256 sur le STF (multiple de 2
sur le STE).

## Les trois résolutions

| Résolution | Pixels | Couleurs | Plans de bits | Octets par ligne |
|---|---|---|---|---|
| Basse (0) | 320 × 200 | 16 | 4 | 160 |
| Moyenne (1) | 640 × 200 | 4 | 2 | 160 |
| Haute (2) | 640 × 400 | 2 (monochrome) | 1 | 80 |

Les trois occupent 32 000 octets. Le **numéro de couleur** d'un pixel s'écrit avec autant de bits
qu'il y a de plans : 4 bits (0 à 15) en basse résolution.

## Haute résolution monochrome (640 × 400)

Mode le plus simple pour débuter : **1 pixel = 1 bit**.

- 400 lignes de **80 octets** → 400 × 80 = **32 000 octets**.
- Chaque ligne de 640 pixels se subdivise en **40 groupes de 16 pixels**, chacun dans un **mot**.

**Adresse du mot** contenant le pixel (x, y) :

```
adresse = début_écran + y × 80 + (x / 16) × 2
```

Par défaut, l'écran monochrome affiche **noir sur blanc** : bit à 0 = blanc (fond), bit à 1 = noir.

**Big endian**, à deux niveaux : le bit de poids fort (bit 15) d'un mot correspond au pixel le plus
à **gauche** du groupe de 16, et l'octet de poids fort du mot est à l'adresse la plus basse. Cette
cohérence avec le 68000 permet de manipuler des bandes de 16 pixels à la vitesse maximale du bus.

## Basse résolution (320 × 200, 16 couleurs) : les plans entrelacés

C'est la résolution des jeux et des démos, et celle du simulateur de 68k Trainer. Chaque groupe de
**16 pixels** occupe **4 mots consécutifs** (8 octets), un par **plan** :

```
octets 0-1 : plan 0  (bit 0 du numéro de couleur des 16 pixels)
octets 2-3 : plan 1  (bit 1)
octets 4-5 : plan 2  (bit 2)
octets 6-7 : plan 3  (bit 3)
```

Un pixel dont la couleur vaut 5 (`%0101`) a son bit à 1 dans les plans 0 et 2, à 0 dans les plans 1
et 3. Une ligne compte 20 groupes × 8 octets = **160 octets**.

```
adresse du groupe = début_écran + y × 160 + (x / 16) × 8
bit dans chaque mot = 15 − (x mod 16)
```

```asm
; Remplit les 16 premiers pixels de la première ligne avec la couleur 5 (%0101)
        MOVE.W  #$FFFF,(A3)     ; plan 0 : tous les bits à 1
        CLR.W   2(A3)           ; plan 1 : tous à 0
        MOVE.W  #$FFFF,4(A3)    ; plan 2 : tous à 1
        CLR.W   6(A3)           ; plan 3 : tous à 0
```

En **moyenne résolution**, même principe avec 2 plans : 2 mots (4 octets) par groupe de 16 pixels.

## La palette

Le ST affiche 16 couleurs (basse résolution) choisies parmi **512** (STF) ou 4 096 (STE). Les 16
registres de couleur sont des mots en `$FFFF8240` à `$FFFF825E` (accessibles en superviseur) :

```
mot de couleur : %0000 0RRR 0VVV 0BBB   ($0RVB, chaque composante de 0 à 7)
$0000 noir  $0777 blanc  $0700 rouge  $0070 vert  $0007 bleu  $0770 jaune
```

Sur le STE, le bit 3 de chaque composante ajoute un demi-niveau (16 niveaux). La couleur 0 est
aussi celle de la **bordure** de l'écran.

```asm
        PEA     PALETTE(PC)
        MOVE.W  #6,-(SP)        ; XBIOS 6 : Setpalette (16 mots), sans passer en superviseur
        TRAP    #14
        ADDQ.L  #6,SP
        ; ... la suite du programme, qui finit par Pterm0 ...
        CLR.W   -(SP)
        TRAP    #1

PALETTE DC.W    $0000,$0700,$0070,$0007,$0770,$0707,$0077,$0777
        DC.W    $0333,$0400,$0040,$0004,$0440,$0404,$0044,$0555
```

> Toujours **sauvegarder la palette** d'origine au début (lire les 16 mots, ou `Setcolor(n,-1)`) et
> la **restaurer** en quittant : le bureau du TOS en a besoin.

## Manipuler des pixels

**Par groupe de 16** (le plus rapide) — écrire directement un mot à l'adresse calculée :

```asm
        MOVE.W  #%1010101010101010,(A0) ; motif en pointillé sur 16 pixels d'un coup
```

**Pixel par pixel**, sans toucher aux 15 autres du même groupe, avec un **masque** :

1. Position du bit dans le groupe : `position_bit = 15 − (x mod 16)`.
2. Masque : `1 << position_bit`.

| Effet | Instruction | Pourquoi |
|---|---|---|
| Allumer | `OR.W D1,(A0)` | met le bit ciblé à 1 sans toucher aux autres |
| Éteindre | `NOT.W D1` puis `AND.W D1,(A0)` | ET avec le masque **inversé** |
| Inverser | `EOR.W D1,(A0)` | OU exclusif : bascule uniquement le bit ciblé |

Avec un masque constant, l'assembleur peut calculer l'inversion : `ANDI.W #~%1000000000000000,(A0)`
éteint le pixel de gauche (le `~` est calculé à l'assemblage, le 68000 ne voit qu'une constante).

Plus simple encore : `BSET`, `BCLR` et `BCHG` sur un registre de données prennent directement le
**numéro du bit**.

## Routine complète : `setpixel` (haute résolution)

```asm
; SETPIXEL — allume le pixel (D3,D4) sur l'écran haute résolution
; Entrée : D3.W = x (0-639), D4.W = y (0-399), A3 = début de l'écran (Logbase)
; Modifie : D0, D1, A0
SETPIXEL:
        MOVE.W  D4,D0
        MULU    #80,D0          ; D0.L = y x 80 (octet de début de la ligne)
        MOVE.W  D3,D1
        LSR.W   #4,D1           ; D1 = x / 16
        ADD.W   D1,D1           ; D1 = (x / 16) x 2
        ADD.W   D1,D0           ; D0 = décalage du mot dans l'écran
        LEA     0(A3,D0.L),A0   ; A0 = adresse du mot
        MOVE.W  D3,D1
        NOT.W   D1              ; 15 - (x mod 16) = les 4 bits bas de NOT x
        ANDI.W  #15,D1          ; D1 = numéro du bit
        MOVE.W  (A0),D0
        BSET    D1,D0           ; allume ce bit
        MOVE.W  D0,(A0)
        RTS
```

> `MULU` coûte jusqu'à 70 cycles. Dans une boucle critique, on le remplace par une **table
> précalculée** des débuts de ligne (`y × 80`), ou par des décalages : y × 80 = y × 64 + y × 16.

> **Limite** : appeler une routine par pixel (avec `BSR`/`RTS` et le recalcul complet) est trop
> lent pour un jeu. Les techniques avancées tracent directement dans la mémoire (Bresenham pour les
> lignes), remplissent par mots ou par longs entiers, ou utilisent le **Blitter** du STE et du
> Mega ST.

## Double tampon et synchronisation

Pour animer sans scintillement, on dessine dans un écran caché pendant qu'un autre est affiché, puis
on échange les deux **pendant le retour du faisceau** (VBL, 50 fois par seconde en Europe) :

```asm
        MOVE.L  ECRAN_CACHE,-(SP) ; nouvel écran physique (affiché)
        MOVE.L  #-1,-(SP)       ; écran logique : inchangé
        MOVE.W  #-1,-(SP)       ; résolution : inchangée
        MOVE.W  #5,-(SP)        ; XBIOS 5 : Setscreen (pris en compte au prochain VBL)
        TRAP    #14
        LEA     12(SP),SP
        MOVE.W  #37,-(SP)       ; XBIOS 37 : Vsync, attendre ce VBL
        TRAP    #14
        ADDQ.L  #2,SP
```

(Attention à l'ordre des paramètres de `Setscreen(log, phys, rez)` : on empile `rez`, puis `phys`,
puis `log`.) Le second écran se réserve dans la section BSS (32 000 octets + 255 pour l'aligner sur
256 octets).

> Dans le simulateur de 68k Trainer, l'écran est en basse résolution à l'adresse `$F8000`, et la
> palette en `$FF8240` est visible dans le débogueur ; `Vsync` et le double tampon demandent
> Hatari (bouton « Essayer dans Hatari »).

> Fiche complétée et corrigée le 21/10/2026 (Claude) : basse et moyenne résolutions (plans
> entrelacés), palette, double tampon ; `AND.W ~masque` (syntaxe invalide) remplacé ; routine
> `setpixel` simplifiée avec `BSET` — à relire.
