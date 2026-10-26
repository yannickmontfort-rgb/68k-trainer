---
title: "Programmation graphique bas niveau : le framebuffer"
source: "Manuel Technique : Programmation Graphique Bas Niveau sur Atari ST (fourni par Yannick, 2026-08) ; Atari ST Hardware Register Listing. Complétée et corrigée le 21/10/2026."
themes: ["graphisme", "framebuffer"]
---

# Programmation graphique bas niveau : le framebuffer

> Cette fiche complète [ligne-a-et-gem.md](ligne-a-et-gem.md) : on y manipule directement la
> mémoire vidéo, sans passer par la Ligne A ni le GEM, pour comprendre ce qu'il y a sous ces
> interfaces ou pour écrire des routines où chaque cycle compte.

## Localiser le framebuffer

L'écran de l'Atari ST est une zone de **32 000 octets** de mémoire vive, que le circuit vidéo, le
*Shifter*, lit en permanence. Son adresse n'est pas fixe, car elle dépend de la quantité de mémoire
et de la version du TOS (`$F8000` sur un 1040 STF), et on la demande donc au XBIOS :

```asm
        MOVE.W  #3,-(SP)        ; XBIOS 3 : Logbase, l'écran où l'on dessine
        TRAP    #14
        ADDQ.L  #2,SP
        MOVEA.L D0,A3           ; A3 = début de l'écran
```

`Physbase()` (XBIOS 2) donne l'écran affiché, qui est le même sauf en double tampon, et
`Setscreen()` (XBIOS 5) change l'un ou l'autre. L'adresse doit être un multiple de 256 sur le STF,
de 2 sur le STE.

## Les trois résolutions

| Résolution | Pixels | Couleurs | Plans de bits | Octets par ligne |
|---|---|---|---|---|
| Basse (0) | 320 × 200 | 16 | 4 | 160 |
| Moyenne (1) | 640 × 200 | 4 | 2 | 160 |
| Haute (2) | 640 × 400 | 2 (monochrome) | 1 | 80 |

Les trois occupent 32 000 octets. Le numéro de couleur d'un pixel s'écrit avec autant de bits qu'il
y a de plans, soit 4 bits (0 à 15) en basse résolution.

## Haute résolution monochrome (640 × 400)

C'est le mode le plus simple pour débuter, puisqu'un pixel y vaut un bit. Les 400 lignes de 80
octets font bien 32 000 octets, et chaque ligne de 640 pixels se découpe en 40 groupes de 16
pixels, un par mot. Le mot qui contient le pixel (x, y) se trouve à :

```
adresse = début_écran + y × 80 + (x / 16) × 2
```

Par défaut, l'écran monochrome affiche du noir sur blanc : un bit à 0 donne le blanc du fond, un bit
à 1 du noir.

Le **big endian** joue à deux niveaux : le bit de poids fort (bit 15) d'un mot correspond au pixel
le plus à gauche du groupe de 16, et l'octet de poids fort du mot est à l'adresse la plus basse.
Cette cohérence avec le 68000 permet de manipuler des bandes de 16 pixels à la vitesse maximale du
bus.

## Basse résolution (320 × 200, 16 couleurs) : les plans entrelacés

C'est la résolution des jeux et des démos, et celle du simulateur de 68k Trainer. Chaque groupe de
16 pixels occupe 4 mots consécutifs (8 octets), un par **plan** :

```
octets 0-1 : plan 0  (bit 0 du numéro de couleur des 16 pixels)
octets 2-3 : plan 1  (bit 1)
octets 4-5 : plan 2  (bit 2)
octets 6-7 : plan 3  (bit 3)
```

Un pixel de couleur 5 (`%0101`) a son bit à 1 dans les plans 0 et 2, à 0 dans les plans 1 et 3.
Une ligne compte 20 groupes de 8 octets, soit 160 octets.

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

La moyenne résolution suit le même principe avec 2 plans, donc 2 mots (4 octets) par groupe de 16
pixels.

## La palette

En basse résolution, le ST affiche 16 couleurs choisies parmi 512 sur le STF, 4 096 sur le STE. Les
16 registres de couleur sont des mots, de `$FFFF8240` à `$FFFF825E`, accessibles en superviseur :

```
mot de couleur : %0000 0RRR 0VVV 0BBB   ($0RVB, chaque composante de 0 à 7)
$0000 noir  $0777 blanc  $0700 rouge  $0070 vert  $0007 bleu  $0770 jaune
```

Sur le STE, le bit 3 de chaque composante ajoute un demi-niveau, pour 16 niveaux. La couleur 0 est
aussi celle de la bordure de l'écran.

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

Comme le bureau du TOS a besoin de sa palette, on **sauvegarde la palette** d'origine au début, en
lisant les 16 mots ou avec `Setcolor(n,-1)`, et on la restaure en quittant.

## Manipuler des pixels

Le plus rapide est de travailler par groupe de 16, en écrivant directement un mot à l'adresse
calculée :

```asm
        MOVE.W  #%1010101010101010,(A0) ; motif en pointillé sur 16 pixels d'un coup
```

Pour changer un seul pixel sans toucher aux 15 autres du groupe, on passe par un **masque** : le
bit du pixel est en position `15 − (x mod 16)`, et le masque vaut `1 << position_bit`.

| Effet | Instruction | Pourquoi |
|---|---|---|
| Allumer | `OR.W D1,(A0)` | met le bit ciblé à 1 sans toucher aux autres |
| Éteindre | `NOT.W D1` puis `AND.W D1,(A0)` | ET avec le masque **inversé** |
| Inverser | `EOR.W D1,(A0)` | OU exclusif : bascule uniquement le bit ciblé |

Avec un masque constant, l'assembleur calcule lui-même l'inversion : `ANDI.W #~%1000000000000000,(A0)`
éteint le pixel de gauche, car le `~` est évalué à l'assemblage et le 68000 ne voit qu'une
constante.

Plus simple encore, `BSET`, `BCLR` et `BCHG` sur un registre de données prennent directement le
numéro du bit.

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

`MULU` coûte jusqu'à 70 cycles. Dans une boucle critique, on le remplace par une table précalculée
des débuts de ligne (`y × 80`), ou par des décalages, puisque y × 80 = y × 64 + y × 16.

Appeler une routine par pixel, avec `BSR`, `RTS` et le recalcul complet, reste trop lent pour un
jeu. Les techniques avancées tracent directement dans la mémoire (Bresenham pour les lignes),
remplissent par mots ou par longs, ou confient le travail au **Blitter** du STE et du Mega ST.

## Double tampon et synchronisation

Pour animer sans scintillement, on dessine dans un écran caché pendant qu'un autre est affiché, puis
on échange les deux pendant le **retour du faisceau** (VBL, 50 fois par seconde en Europe) :

```asm
        MOVE.W  #-1,-(SP)       ; résolution : inchangée
        MOVE.L  ECRAN_CACHE,-(SP) ; nouvel écran physique (affiché)
        MOVE.L  #-1,-(SP)       ; écran logique : inchangé
        MOVE.W  #5,-(SP)        ; XBIOS 5 : Setscreen (pris en compte au prochain VBL)
        TRAP    #14
        LEA     12(SP),SP
        MOVE.W  #37,-(SP)       ; XBIOS 37 : Vsync, attendre ce VBL
        TRAP    #14
        ADDQ.L  #2,SP
```

Attention à l'ordre des paramètres de `Setscreen(log, phys, rez)` : on empile `rez`, puis `phys`,
puis `log`. Le second écran se réserve dans la section BSS, avec 32 000 octets plus 255 pour
l'aligner sur 256 octets.

> Dans le simulateur de 68k Trainer, l'écran est en basse résolution à l'adresse `$F8000`, la
> palette en `$FF8240` se lit dans le débogueur, et `Setscreen` comme `Vsync` sont simulés : le
> double tampon s'y essaie directement.

> Fiche complétée et corrigée le 21/10/2026 (Claude) : basse et moyenne résolutions (plans
> entrelacés), palette, double tampon ; `AND.W ~masque`, syntaxe invalide, remplacé ; routine
> `setpixel` simplifiée avec `BSET`.
