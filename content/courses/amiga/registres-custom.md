---
title: "Amiga : registres des puces custom et des CIA (référence)"
source: "Amiga Hardware Reference Manual (3e édition) ; registres du simulateur de 68k Trainer (vérifiés). Fiche créée le 21/10/2026."
themes: ["hardware", "reference"]
---

# Amiga : registres des puces custom et des CIA

> Cette fiche vaut pour l'Amiga 500 et son chipset OCS ; les explications sont dans
> [la fiche des puces et des démos](demos-et-custom-chips.md). Les décalages partent de **`$DFF000`**.
> L marque un registre en lecture seule, É en écriture seule, et S un registre « SET/CLR », dont le
> bit 15 dit s'il faut mettre à 1 (bit 15 = 1) ou à 0 (bit 15 = 0) les bits écrits à 1.

## Contrôle général

| Décalage | Nom | | Rôle |
|---|---|---|---|
| `$002` | `DMACONR` | L | canaux DMA actifs, `BBUSY` (14), `BZERO` (13) |
| `$004` / `$006` | `VPOSR` / `VHPOSR` | L | position du faisceau : `VPOSR` bit 0 = bit 8 de la ligne ; `VHPOSR` = ligne (bits 15-8), colonne (bits 7-0) |
| `$00A` / `$00C` | `JOY0DAT` / `JOY1DAT` | L | souris (port 1) / joystick (port 2) |
| `$016` | `POTGOR` | L | bit 10 = bouton droit de la souris (0 = appuyé) |
| `$01C` / `$01E` | `INTENAR` / `INTREQR` | L | interruptions autorisées / demandées |
| `$034` | `POTGO` | É | à régler pour lire le bouton droit |
| `$096` | `DMACON` | É S | canaux DMA (voir ci-dessous) |
| `$09A` | `INTENA` | É S | interruptions autorisées |
| `$09C` | `INTREQ` | É S | demandes d'interruption (à effacer dans la routine) |
| `$09E` | `ADKCON` | É S | réglages du son et du disque |

Bits de `DMACON` : 15 SET/CLR, 14 `BBUSY` (lecture), 13 `BZERO` (lecture), 10 `BLTPRI`
(priorité au Blitter), **9 `DMAEN`** (interrupteur général), 8 `BPLEN` (bitplanes), 7 `COPEN`
(Copper), 6 `BLTEN` (Blitter), 5 `SPREN` (sprites), 4 `DSKEN` (disque), 3-0 `AUD3EN`-`AUD0EN`.

Bits d'`INTENA` / `INTREQ`, avec le niveau d'interruption entre parenthèses : 15 SET/CLR,
**14 `INTEN`** (interrupteur général, `INTENA` seulement), 13 `EXTER` (CIA B, niveau 6), 12 `DSKSYNC` (5), 11 `RBF` (5), 10-7 `AUD3`-`AUD0` (4),
6 `BLIT` (3), **5 `VERTB`** (VBL, 3), 4 `COPER` (3), 3 `PORTS` (CIA A, 2), 2 `SOFT` (1),
1 `DSKBLK` (1), 0 `TBE` (1).

## Copper

| Décalage | Nom | | Rôle |
|---|---|---|---|
| `$02E` | `COPCON` | É | bit 1 `CDANG` : autorise le Copper à écrire dans les registres du Blitter |
| `$080` / `$082` | `COP1LCH` / `COP1LCL` | É | adresse de la liste n° 1 (rechargée à chaque image) |
| `$084` / `$086` | `COP2LCH` / `COP2LCL` | É | adresse de la liste n° 2 |
| `$088` / `$08A` | `COPJMP1` / `COPJMP2` | É | écrire n'importe quoi : le Copper saute à la liste 1 / 2 |

Chaque instruction fait deux mots : `MOVE` = (registre pair, valeur), `WAIT` = (ligne << 8 +
colonne + 1, masque `$FFFE`) et `SKIP` = (position + 1, masque + 1). La liste finit par
`$FFFF,$FFFE`, et `$FFDF,$FFFE` permet de passer la ligne 255.

## Affichage (Denise)

| Décalage | Nom | | Rôle |
|---|---|---|---|
| `$08E` / `$090` | `DIWSTRT` / `DIWSTOP` | É | fenêtre d'affichage (standard PAL : `$2C81` / `$2CC1`) |
| `$092` / `$094` | `DDFSTRT` / `DDFSTOP` | É | lecture des données (basse résolution : `$0038` / `$00D0`) |
| `$0E0`-`$0F6` | `BPL1PTH`-`BPL6PTL` | É | adresses des 6 bitplanes (2 mots chacune) |
| `$100` | `BPLCON0` | É | voir ci-dessous |
| `$102` | `BPLCON1` | É | retard : playfield 2 (bits 7-4), playfield 1 (bits 3-0) |
| `$104` | `BPLCON2` | É | bit 6 = playfield 2 devant ; priorités des sprites (bits 5-0) |
| `$108` / `$10A` | `BPL1MOD` / `BPL2MOD` | É | modulos des plans impairs / pairs |
| `$180`-`$1BE` | `COLOR00`-`COLOR31` | É | palette `$0RVB` |

Bits de `BPLCON0` : 15 `HIRES` (640 pixels), **14-12 `BPU`** (nombre de plans, 0 à 6), 11 `HOMOD`
(HAM), 10 `DBLPF` (double playfield), 9 `COLOR` (à mettre à 1), 2 `LACE` (entrelacé). Ainsi `$1200`
donne 1 plan, `$5200` 5 plans (32 couleurs) et `$6A00` 6 plans en HAM.

## Sprites

| Décalage | Nom | | Rôle |
|---|---|---|---|
| `$120`-`$13E` | `SPR0PTH`-`SPR7PTL` | É | adresses des données des 8 sprites |
| `$140` + 8 × *n* | `SPRnPOS` | É | ligne de début (bits 15-8), colonne / 2 (bits 7-0) |
| `$142` + 8 × *n* | `SPRnCTL` | É | ligne de fin (bits 15-8), bit 7 `ATTACH`, bits 2/1/0 = 9e bit de début / de fin / bit 0 de la colonne |
| `$144` / `$146` + 8 × *n* | `SPRnDATA` / `SPRnDATB` | É | les deux plans (écrits par le DMA) |

En Chip RAM, les données d'un sprite enchaînent `POS`, `CTL`, puis (plan 0, plan 1) pour chaque
ligne, et se terminent par `0, 0`.

## Blitter

| Décalage | Nom | | Rôle |
|---|---|---|---|
| `$040` | `BLTCON0` | É | décalage de A (bits 15-12), sources utilisées `USEA`-`USED` (bits 11-8), minterm (bits 7-0) |
| `$042` | `BLTCON1` | É | décalage de B (15-12), `EFE` (4), `IFE` (3), `FCI` (2), `DESC` (1, descendant), `LINE` (0) ; en mode ligne : `SING` (1) |
| `$044` / `$046` | `BLTAFWM` / `BLTALWM` | É | masques du premier / dernier mot de A |
| `$048` / `$04C` / `$050` / `$054` | `BLTCPT` / `BLTBPT` / `BLTAPT` / `BLTDPT` | É | adresses (2 mots chacune) |
| `$058` | `BLTSIZE` | É | hauteur × 64 + largeur en mots (0 = 1 024 lignes / 64 mots) : **lance** le travail |
| `$060` / `$062` / `$064` / `$066` | `BLTCMOD` / `BLTBMOD` / `BLTAMOD` / `BLTDMOD` | É | modulos en octets |
| `$070` / `$072` / `$074` | `BLTCDAT` / `BLTBDAT` / `BLTADAT` | É | données fixes (source non lue) |

Pour écrire un minterm, on combine avec les opérateurs voulus les trois constantes A = `$F0`,
B = `$CC` et C = `$AA` : `$F0` copie A, et `$CA` découpe B par le masque A sur le fond C.

## Son (Paula)

Pour la voie *n* (0 à 3), décalage `$0A0` + `$10` × *n* :

| Décalage | Nom | | Rôle |
|---|---|---|---|
| +`$0` / +`$2` | `AUDnLCH` / `AUDnLCL` | É | adresse de l'échantillon (Chip RAM, octets signés) |
| +`$4` | `AUDnLEN` | É | longueur en **mots** |
| +`$6` | `AUDnPER` | É | période : 3 546 895 / fréquence voulue (PAL) ; 124 au minimum |
| +`$8` | `AUDnVOL` | É | volume 0 à 64 |
| +`$A` | `AUDnDAT` | É | donnée (écrite par le DMA) |

Les voies 0 et 3 sortent à gauche, les voies 1 et 2 à droite. Le son démarre quand on allume le DMA
de la voie dans `DMACON`, et Paula boucle sur l'échantillon tant qu'on ne l'arrête pas.

## CIA A (`$BFE001`, adresses impaires) et CIA B (`$BFD000`, adresses paires)

Les registres sont espacés de `$100` : `PRA` (+`$000`), `PRB` (+`$100`), `DDRA` (+`$200`), `DDRB` (+`$300`),
timer A bas / haut (+`$400` / +`$500`), timer B (+`$600` / +`$700`), compteur d'événements
`TOD` (+`$800` à +`$A00`), `SDR` (+`$C00`), `ICR` (+`$D00`), `CRA` / `CRB` (+`$E00` / +`$F00`).

| Adresse | Contenu |
|---|---|
| `$BFE001` (CIA A `PRA`) | bit 7 : bouton du joystick (port 2), bit 6 : bouton gauche de la souris (port 1), bit 1 : voyant / filtre, tous trois actifs à 0 ; bit 0 : `OVL`, qui à 1 fait apparaître la ROM en `$0`, comme au démarrage |
| `$BFEC01` (CIA A `SDR`) | code du clavier (`NOT` puis `ROR.B #1`) |
| `$BFED01` (CIA A `ICR`) | lecture : quelles interruptions (bit 7 = au moins une) ; écriture : autoriser (bit 7 = 1) ou interdire |
| `$BFD100` (CIA B `PRB`) | moteur, sélection, tête et sens des lecteurs |

Les timers comptent au rythme de l'horloge E, 709 379 Hz en PAL, soit l'horloge du 68000 divisée
par 10. Les interruptions de la CIA A arrivent au niveau 2 (`PORTS`), celles de la CIA B au
niveau 6 (`EXTER`).

> Fiche créée le 21/10/2026 (Claude) à partir des registres du simulateur (vérifiés dans le Hardware
> Reference Manual).
