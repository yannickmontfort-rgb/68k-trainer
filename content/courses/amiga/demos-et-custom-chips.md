---
title: "Amiga : Custom Chips et techniques de démo"
source: "Amiga : Maîtrise de la Programmation Système et des Démos (fourni par Yannick, 2026-08)"
themes: ["hardware", "graphisme", "demo"]
---

# Amiga : Custom Chips et techniques de démo

> Complète [systeme-et-hardware.md](systeme-et-hardware.md) (bases système/mémoire déjà couvertes
> là-bas) en se concentrant sur les puces graphiques/son et les techniques classiques de la scène
> démo Amiga.

## Le Kickstart : multitâche préemptif dès 1985

Contrairement aux systèmes qui chargent leur OS en RAM, l'Amiga stocke son système d'exploitation
(le **Kickstart**, version 1.3 pour l'Amiga 500) directement en **ROM**. Il est **multitâche
préemptif** — une caractéristique remarquable pour une machine domestique de cette époque.

**Types de mémoire** :
- **Chip RAM** (512 Ko typique sur A500) — seule mémoire visible par les Custom Chips, utilisée pour
  graphismes/son.
- **Fast RAM** — plus rapide, accessible uniquement par le 68000 ; permet au CPU de travailler sans
  être ralenti par les accès des puces graphiques à la Chip RAM.
- **ROM** — contient le Kickstart.

## Denise : bitplanes et palette

L'écran est composé de **bitplanes** superposés — chaque bitplane est une carte de bits qui,
combinée aux autres, détermine la couleur de chaque pixel. *n* bitplanes → 2ⁿ couleurs (5 bitplanes
= 32 couleurs, ou mode *Halfbrite*).

| Registre | Rôle |
|---|---|
| `$DFF180`, `$DFF182`, ... | couleurs de la palette (écriture seule), 32 couleurs choisies parmi 4096 |
| `$DFF0E0`-`0F6` (BPLxPTH/L) | adresses des bitplanes en Chip RAM |
| `$DFF100` (BPLCON0) | nombre de bitplanes, résolution, HAM, double playfield |
| `$DFF102` (BPLCON1) | décalage horizontal des bitplanes (scrolling matériel) |
| `$DFF08E`/`$DFF090` (DIWSTRT/DIWSTOP) | début/fin de la fenêtre d'affichage (overscan) |

## Le Copper : coprocesseur synchronisé au raster

Le **Copper** exécute une liste d'instructions (essentiellement `MOVE` et `WAIT`) en parfaite
synchronisation avec le faisceau balayant l'écran (50 Hz en PAL) — il peut lire les registres de
position du raster (`VPOS`/`VHPOS`) et modifier n'importe quel registre Amiga à une ligne précise.
C'est ce qui permet les dégradés de couleur ou les changements d'adresse de bitplane pour un
scrolling différentiel.

| Registre | Rôle |
|---|---|
| `$DFF080`/`$DFF082` (COP1LCH/L) | pointeur vers la liste Copper principale (`$DFF088`, COPJMP1, la relance) |
| `$DFF096` (DMACON) | active/désactive les canaux DMA (Copper, Bitplanes, ...) ; relecture dans DMACONR (`$DFF002`) |

## Le Blitter : opérations rapides sur les bits

Combine jusqu'à 3 sources (A, B, C) via des opérations logiques (AND/OR/XOR) vers une destination
(D), bien plus vite que le 68000 seul — utilisé pour le scrolling, le tracé de lignes, le
remplissage et les effets 3D. Voir [systeme-et-hardware.md](systeme-et-hardware.md#le-blitter-et-le-tracé-de-lignes)
pour le mode "Single Bit" et le fill inclusif/exclusif. Registres clés : `BLTCON0`/`BLTCON1`
(`$DFF040`/`042`, contrôle), pointeurs `BLTxPT` (`$DFF048`-`056`), modulos (`$DFF060`-`066`), données
`BLTCDAT`/`BLTBDAT`/`BLTADAT` (`$DFF070`-`074`), `BLTSIZE` (`$DFF058`, qui lance le travail).

## Sprites

8 sprites matériels sur A500, organisés par paires (0&1, 2&3...) pour obtenir des couleurs
supplémentaires — une paire affiche jusqu'à 16 couleurs. Positionnables au pixel près, sans affecter
le playfield ; leurs données (en Chip RAM) sont lues par le Copper.

## Techniques classiques de démo

- **Double buffering** — deux écrans en mémoire, l'un affiché pendant que l'autre se dessine ;
  l'échange se fait une fois le dessin terminé, pour éviter tout déchirement d'image visible.
- **Sinus scrolling** — texte défilant horizontalement avec une ondulation verticale, obtenue via
  une table de sinus précalculée appliquant un décalage vertical par tranche.
- **Arithmétique à point fixe** — le 68000 ne gère que des entiers ; pour des calculs "décimaux"
  (zoom, rotation), on réserve une partie fixe des bits d'un entier pour la partie fractionnaire
  (ex : 16 bits entiers + 16 bits fractionnaires).
- **Color cycling** — rotation rapide d'un groupe de couleurs dans la palette pour simuler une
  animation (eau, néon...) quasiment gratuite en calcul.
- **Plasma (RGB)** — couleur calculée par pixel en fonction de (x, y), souvent via des fonctions
  trigonométriques, combinée à un color cycling.
- **Extra Halfbrite (EHB)** — mode spécial doublant le nombre de couleurs affichées (64 au lieu de
  32 pour 6 bitplanes) en ajoutant une version à luminosité réduite de chaque couleur de palette.
- **Dual Playfield** — deux playfields superposés avec priorités distinctes (gérées via des bits de
  `BPLCON2`) pour un effet de profondeur.

## Interruptions

Gérées via `INTENA` (*Interrupt Enable*) et `INTREQ` (*Interrupt Request*) — indispensables pour
synchroniser une routine sur la fin d'un balayage raster ou réagir à un événement clavier sans
attente active.

## Les puces CIA (Complex Interface Adapter)

Deux puces CIA gèrent souris, clavier, timers et lecteur de disquette : **CIA A** (`$BFE001`) et
**CIA B** (`$BFD000`). Leurs registres sont sur 8 bits, souvent **actifs à l'état bas** (1 par
défaut, passent à 0 quand l'événement survient — ex: bouton souris pressé). Registres notables :
`PA`/`PB` (E/S parallèles), `SDR` (registre série, utilisé pour le clavier sur CIA A), `ICR`
(contrôle des interruptions), `TA`/`TB` (timers).

## Contexte historique : piratage et scène démo

Section culturelle, pas technique : l'essor des disquettes vierges bon marché à l'ère 16 bits
(Amiga, Atari ST) a entraîné un piratage massif, avec des jeux protégés par des pistes anormales
(illisibles par les copieurs standards). Les intros ajoutées par les groupes de crack pour
revendiquer leur travail (les "cracktros") ont progressivement évolué en démos autonomes de plus en
plus sophistiquées — c'est l'origine de la scène démo Amiga.

> Fiche corrigée le 20/10/2026 : adresses des registres vérifiées dans Amiga Intern (Abacus) et le
> Hardware Reference Manual (voir docs/errata_manuel_amiga.md). Le parcours guidé Amiga va plus loin.
