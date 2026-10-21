---
title: "Ligne A et GEM (AES/VDI)"
source: "cours_asm_68000.pdf — Le Féroce Lapin, Volume 2, cours 7 à 9 (adapté) ; Atari ST Profibuch ; documentation Line-A et GEM d'Atari. Complétée et corrigée le 21/10/2026."
themes: ["graphisme", "gem"]
---

# Ligne A et GEM (AES/VDI)

> Le GEM est vaste : cette fiche donne l'architecture et les appels de base, assez pour écrire un
> premier programme. Pour une fonction précise, la référence reste la documentation d'Atari (Bible
> ST, Profibuch, Atari Compendium).

> **Le simulateur de 68k Trainer ne simule ni la Ligne A ni le GEM** : les exemples ci-dessous
> s'assemblent, mais se lancent dans un vrai TOS, avec le bouton **« Essayer dans Hatari »**
> (EmuTOS fournit la Ligne A et le GEM).

## La Ligne A : un mécanisme du 68000 exploité par le TOS

Tout mot d'instruction qui commence par `$A` (`$A000` à `$AFFF`) n'est **pas une instruction
68000** : le processeur déclenche une exception et saute au **vecteur 10** (adresse `$28`). C'est un
mécanisme générique du 68000 (« émulateur ligne A ») ; l'Atari ST y branche ses **primitives
graphiques de bas niveau**, les mêmes que celles qu'utilise le VDI du GEM. (Sur l'Amiga, ce
vecteur ne sert à rien de tel : un `$Axxx` y provoque une erreur.)

Les fonctions se notent comme des données, puisque l'assembleur ne connaît pas d'instruction
`$Axxx` :

```asm
        DC.W    $A000           ; Ligne A n° 0 : initialisation
```

| Code | Fonction | Code | Fonction |
|---|---|---|---|
| `$A000` | initialisation (rend les adresses utiles) | `$A008` | texte (*textblt*) |
| `$A001` | allumer un pixel | `$A009` | montrer la souris |
| `$A002` | lire un pixel | `$A00A` | cacher la souris |
| `$A003` | tracer une ligne | `$A00B` | changer la forme de la souris |
| `$A004` | tracer une ligne horizontale | `$A00C` | effacer un sprite |
| `$A005` | rectangle plein | `$A00D` | dessiner un sprite |
| `$A006` | polygone plein (une ligne) | `$A00E` | copier une surface (*copy raster*) |
| `$A007` | copie de bloc (*bitblt*) | `$A00F` | remplissage (*seed fill*) |

**`$A000` d'abord** : il rend dans **A0** (et D0) l'adresse des **variables de la Ligne A**, dans A1
la table des polices, dans A2 la table des routines. Les paramètres passent par ces variables et
par des tableaux dont elles contiennent l'adresse :

| Décalage | Variable | Rôle |
|---|---|---|
| 0 | `PLANES` | nombre de plans de l'écran |
| 2 | `WIDTH` | octets par ligne |
| 4 | `CONTRL` | adresse du tableau de contrôle |
| 8 | `INTIN` | adresse des paramètres entiers |
| 12 | `PTSIN` | adresse des coordonnées (paires x, y) |
| 16 / 20 | `INTOUT` / `PTSOUT` | adresses des résultats |
| 24-30 | `COLBIT0`-`COLBIT3` | couleur de tracé, un bit par plan |
| 32 | `LSTLIN` | dernier point d'une ligne : 0 = tracé, −1 = non |
| 34 | `LNMASK` | motif de la ligne (`$FFFF` = trait plein) |
| 36 | `WMODE` | mode d'écriture (0 remplacement, 1 transparent, 2 OU exclusif, 3 transparent inversé) |
| 38-44 | `X1`, `Y1`, `X2`, `Y2` | extrémités d'une ligne ou coins d'un rectangle |

```asm
; Allumer le pixel (160, 100) en couleur 1, puis tracer une ligne en couleur 3
        DC.W    $A000           ; A0 = variables de la Ligne A
        MOVEA.L A0,A5           ; A5 les garde (la Ligne A détruit D0-D2/A0-A2)
        MOVEA.L 8(A5),A1        ; INTIN
        MOVE.W  #1,(A1)         ; INTIN[0] = couleur
        MOVEA.L 12(A5),A1       ; PTSIN
        MOVE.W  #160,(A1)       ; PTSIN[0] = x
        MOVE.W  #100,2(A1)      ; PTSIN[1] = y
        DC.W    $A001           ; allumer le pixel

        MOVE.W  #1,24(A5)       ; couleur 3 = %0011 : COLBIT0 = 1, COLBIT1 = 1
        MOVE.W  #1,26(A5)
        CLR.W   28(A5)          ; COLBIT2 = 0
        CLR.W   30(A5)          ; COLBIT3 = 0
        MOVE.W  #$FFFF,34(A5)   ; trait plein
        CLR.W   36(A5)          ; mode remplacement
        MOVE.W  #-1,32(A5)      ; LSTLIN
        MOVE.W  #10,38(A5)      ; X1
        MOVE.W  #10,40(A5)      ; Y1
        MOVE.W  #300,42(A5)     ; X2
        MOVE.W  #190,44(A5)     ; Y2
        DC.W    $A003           ; tracer la ligne
```

> **Ces tableaux sont partagés avec le GEM** — un appel GEM entre deux appels Ligne A peut écraser
> leur contenu. Toujours les remplir juste avant chaque appel.

> La Ligne A a été déclarée « à ne plus utiliser » par Atari à partir du TT (elle ne gère pas les
> cartes graphiques) ; elle reste pratique sur ST pour la souris et les primitives rapides.

## Le GEM : AES + VDI

Le GEM s'appelle par **`TRAP #2`**, avec dans **D0** le numéro de la partie appelée et dans **D1**
l'adresse d'un **bloc de paramètres** (une liste d'adresses de tableaux) :

| Partie | D0 | Rôle | Bloc de paramètres (adresses de…) |
|---|---|---|---|
| **AES** (*Application Environment System*) | `$C8` (200) | fenêtres, menus, boîtes de dialogue, événements | `CONTROL`, `GLOBAL`, `INT_IN`, `INT_OUT`, `ADDR_IN`, `ADDR_OUT` |
| **VDI** (*Virtual Device Interface*) | `$73` (115) | dessin indépendant du périphérique : lignes, cercles, texte | `CONTRL`, `INTIN`, `PTSIN`, `INTOUT`, `PTSOUT` |

Pour l'AES, le tableau `CONTROL` décrit l'appel : `CONTROL[0]` = numéro de la fonction, puis le
nombre d'éléments de `INT_IN`, `INT_OUT`, `ADDR_IN` et `ADDR_OUT`. Le résultat principal est dans
`INT_OUT[0]`.

| Fonction AES | N° | CONTROL | Entrées | Résultat |
|---|---|---|---|---|
| `appl_init` | 10 | 10, 0, 1, 0, 0 | — | `INT_OUT[0]` = identifiant de l'application (−1 = échec) |
| `appl_exit` | 19 | 19, 0, 1, 0, 0 | — | |
| `form_alert` | 52 | 52, 1, 1, 1, 0 | `INT_IN[0]` = bouton par défaut, `ADDR_IN[0]` = texte | `INT_OUT[0]` = bouton cliqué (1 à 3) |
| `graf_handle` | 77 | 77, 0, 5, 0, 0 | — | `INT_OUT[0]` = numéro du périphérique VDI de l'écran |
| `evnt_multi` | 25 | 25, 16, 7, 1, 0 | événements attendus… | événement survenu |

**Un premier programme GEM** : une boîte d'alerte.

```asm
        SECTION TEXT
DEBUT:  LEA     CONTROL,A3
        MOVE.W  #10,(A3)        ; appl_init : s'annoncer au GEM
        CLR.W   2(A3)           ; 0 entier en entrée
        MOVE.W  #1,4(A3)        ; 1 entier en sortie
        CLR.L   6(A3)           ; 0 adresse en entrée, 0 en sortie
        BSR     AES

        MOVE.W  #52,(A3)        ; form_alert
        MOVE.W  #1,2(A3)        ; 1 entier en entrée : le bouton par défaut
        MOVE.W  #1,4(A3)        ; 1 entier en sortie : le bouton choisi
        MOVE.W  #1,6(A3)        ; 1 adresse en entrée : le texte
        CLR.W   8(A3)
        MOVE.W  #1,INT_IN       ; bouton 1 par défaut
        MOVE.L  #ALERTE,ADDR_IN
        BSR     AES             ; attend le clic ; INT_OUT[0] = bouton cliqué

        MOVE.W  #19,(A3)        ; appl_exit
        CLR.W   2(A3)
        MOVE.W  #1,4(A3)
        CLR.L   6(A3)
        BSR     AES

        CLR.W   -(SP)           ; Pterm0
        TRAP    #1

AES:    MOVE.L  #AES_PB,D1      ; adresse du bloc de paramètres
        MOVE.W  #$C8,D0         ; AES
        TRAP    #2
        RTS

        SECTION DATA
AES_PB: DC.L    CONTROL,GLOBAL,INT_IN,INT_OUT,ADDR_IN,ADDR_OUT
ALERTE: DC.B    '[1][Bonjour depuis le GEM !|Seconde ligne][ OK | Annuler ]',0
        EVEN

        SECTION BSS
CONTROL:  DS.W  5
GLOBAL:   DS.W  15
INT_IN:   DS.W  16
INT_OUT:  DS.W  7
ADDR_IN:  DS.L  2
ADDR_OUT: DS.L  1
```

Le texte d'une alerte suit le format `[icône][ligne 1|ligne 2…][bouton 1|bouton 2…]` : icône 0
(aucune), 1 (point d'exclamation), 2 (point d'interrogation) ou 3 (stop) ; 5 lignes de 30
caractères et 3 boutons au plus.

Pour le **VDI**, on demande d'abord à l'AES le numéro du périphérique écran (`graf_handle`), puis
on ouvre un **poste de travail virtuel** (`v_opnvwk`, VDI 100) qui rend son propre numéro dans
`CONTRL[6]` ; chaque appel VDI met ce numéro dans `CONTRL[6]`, le numéro de fonction dans
`CONTRL[0]`, et le nombre de points et d'entiers fournis dans `CONTRL[1]` et `CONTRL[3]`. Exemples :
`v_pline` (6, ligne brisée), `v_gtext` (8, texte), `v_circle` (11, sous-fonction 4), `v_clsvwk`
(101, fermeture).

**Concepts clés du modèle GEM** :
- **Identifiant d'application** — rendu par `appl_init` à chaque application (programme principal
  ou accessoire de bureau, `.ACC`) ; un programme GEM commence par `appl_init` et finit par
  `appl_exit`.
- **Handle** — numéro d'une fenêtre (AES) ou d'un poste de travail (VDI), obtenu à l'ouverture.
- **Boucle d'événements** — un programme GEM passe le plus clair de son temps à *attendre* un
  événement (clic, touche, message de fenêtre) avec `evnt_multi`. Ce n'est pas du multitâche réel,
  mais les accessoires peuvent s'activer pendant que le programme attend.
- **Ressources** (`.RSC`) — menus et boîtes de dialogue dessinés avec un éditeur de ressources,
  chargés par `rsrc_load`, plutôt que décrits à la main dans le source.

## Pièges pratiques

- **Adresses sur 32 bits** : écrire `$FFFF8800` plutôt que `$FF8800` garde le programme valable sur
  le TT et le Falcon (bus d'adresse de 32 bits).
- **FDB (*Form Definition Block*)** : structure décrivant une surface (adresse, largeur, hauteur,
  nombre de plans) pour une copie de bloc (`vro_cpyfm`). Une adresse nulle désigne l'écran.
- **Ergonomie** (conventions d'Atari, reprises du Macintosh) : les entrées de menu qui ouvrent un
  dialogue finissent par « … » ; Tab et Maj+Tab passent d'un champ éditable à l'autre ; Ctrl+X/C/V
  pour couper, copier, coller. Un accessoire reste petit et discret.
- **Bits libres des objets** : dans un arbre d'objets de ressource, le champ `ob_flags` n'utilise
  que 9 bits sur 16 ; les 7 bits restants peuvent porter une donnée personnelle (un raccourci
  clavier associé à un bouton, par exemple).

> Fiche complétée et corrigée le 21/10/2026 (Claude) : les paramètres de la Ligne A passent surtout
> par ses **variables** (rendues par `$A000`), pas seulement par 5 tableaux ; table des 16
> fonctions, exemple pixel + ligne, appel `TRAP #2` (D0/D1), premier programme GEM — à relire.
