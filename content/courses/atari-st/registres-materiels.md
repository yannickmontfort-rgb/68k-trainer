---
title: "Atari ST : registres matériels et carte mémoire (référence)"
source: "Atari ST Hardware Register Listing ; Atari ST Profibuch ; documentation du YM2149 (Yamaha) ; registres du simulateur de 68k Trainer. Fiche créée le 21/10/2026."
themes: ["materiel", "reference"]
---

# Atari ST : registres matériels et carte mémoire

> Fiche de référence (ST/STF, avec les ajouts du STE signalés). Tous ces registres ne sont
> accessibles qu'en **mode superviseur** (voir [la fiche TOS](trap-et-systeme.md)) : en mode
> utilisateur, y toucher provoque une erreur de bus (2 bombes). Écrire les adresses sur 32 bits
> (`$FFFF8240`) garde le programme valable sur le TT et le Falcon.

## Carte mémoire

| Adresses | Contenu |
|---|---|
| `$000000`-`$0003FF` | table des vecteurs du 68000 (les 8 premiers octets sont lus dans la ROM au démarrage) |
| `$000400`-`$0007FF` | variables système du TOS (`_v_bas_ad` en `$44E`, `_vbclock` en `$462`, `_hz_200` en `$4BA`…) |
| `$000800`-fin de la RAM | mémoire libre, programmes ; l'écran est tout en haut de la RAM (`$F8000` sur 1 Mo) |
| `$E00000`-`$EFFFFF` | ROM du TOS 1.06 et plus (STE) — `$FC0000` pour les TOS 1.00 à 1.04 |
| `$FA0000`-`$FBFFFF` | cartouche |
| `$FF8000`-`$FFFFFF` | registres matériels |

## Registres matériels

| Adresse | Registre | Rôle |
|---|---|---|
| `$FFFF8001` | configuration mémoire | taille des bancs de RAM (réglée par le TOS) |
| `$FFFF8201` / `$FFFF8203` | base vidéo, octets haut / moyen | adresse de l'écran affiché (bits 23-8) |
| `$FFFF820D` | base vidéo, octet bas (STE) | |
| `$FFFF8205` / `07` / `09` | compteur vidéo (lecture) | adresse en cours de lecture par le Shifter |
| `$FFFF820A` | synchronisation | bit 1 : 1 = 50 Hz, 0 = 60 Hz |
| `$FFFF820F` / `$FFFF8265` | largeur de ligne en plus / défilement fin au pixel (STE) | défilement matériel |
| `$FFFF8240`-`$FFFF825E` | palette | 16 couleurs `$0RVB` (3 bits par composante ; 4 sur STE) |
| `$FFFF8260` | résolution | 0 = basse, 1 = moyenne, 2 = haute |
| `$FFFF8604` / `$FFFF8606` | contrôleur DMA | disquette et disque dur |
| `$FFFF8800` | YM2149 : sélection / lecture | n° du registre à lire ou écrire |
| `$FFFF8802` | YM2149 : écriture | valeur pour le registre sélectionné |
| `$FFFF8900`-`$FFFF893F` | son DMA (STE) | échantillons 8 bits stéréo |
| `$FFFF8A00`-`$FFFF8A3C` | Blitter (STE, Mega ST) | copies de blocs |
| `$FFFFFA01`-`$FFFFFA2F` | MFP 68901 | interruptions, timers (voir [la fiche du MFP](interruptions-mfp68901.md)) |
| `$FFFFFC00` / `$FFFFFC02` | ACIA clavier : contrôle / données | dialogue avec le processeur du clavier (IKBD) |
| `$FFFFFC04` / `$FFFFFC06` | ACIA MIDI : contrôle / données | |

## Le son : le YM2149

Le générateur de son (un Yamaha YM2149, cousin de l'AY-3-8910) a **3 voies carrées** (A, B, C), un
**bruit** et une **enveloppe**, réglés par 16 registres. On sélectionne le registre en écrivant son
numéro en `$FFFF8800`, puis on écrit la valeur en `$FFFF8802` (ou on la lit en `$FFFF8800`).

| Registre | Rôle |
|---|---|
| 0 / 1 | période de la voie A (12 bits : octet bas, puis 4 bits hauts) |
| 2 / 3 | période de la voie B |
| 4 / 5 | période de la voie C |
| 6 | période du bruit (5 bits) |
| 7 | **mélangeur** : bits 0-2 = son carré A, B, C ; bits 3-5 = bruit A, B, C (**0 = actif**) ; bits 6-7 = sens des ports |
| 8 / 9 / 10 | volume des voies A, B, C (0 à 15) ; bit 4 = suivre l'enveloppe |
| 11 / 12 | période de l'enveloppe (16 bits) |
| 13 | forme de l'enveloppe |
| 14 | port A : sélection du lecteur de disquette et de la face (bits 0-2), lignes de la RS-232 et de l'imprimante |
| 15 | port B : données de l'imprimante |

**Fréquence** d'une voie = 2 000 000 / (16 × période) = 125 000 / période. Le *la* à 440 Hz : période
284.

```asm
; Un « la » sur la voie A (en superviseur)
YM      EQU     $FFFF8800
        MOVE.B  #0,YM           ; registre 0 : période de A, octet bas
        MOVE.B  #284&$FF,YM+2
        MOVE.B  #1,YM           ; registre 1 : période de A, 4 bits hauts
        MOVE.B  #284>>8,YM+2
        MOVE.B  #8,YM           ; registre 8 : volume de A
        MOVE.B  #15,YM+2
        MOVE.B  #7,YM           ; registre 7 : mélangeur
        MOVE.B  YM,D0           ; lire la valeur actuelle (le port A ne doit pas changer de sens)
        ANDI.B  #%11000000,D0   ; garder les bits 6-7 (sens des ports)
        ORI.B   #%00111110,D0   ; tout coupé sauf le son carré de A (bit 0 à 0)
        MOVE.B  D0,YM+2
```

> Le registre 14 commande aussi les lecteurs de disquette : ne jamais l'écrire au hasard. Pour jouer
> une suite de notes sans tout faire à la main, le XBIOS fournit `Dosound` (XBIOS 32), qui lit une
> liste de commandes à chaque interruption de 50 Hz.

## Le clavier, la souris et le joystick

Le clavier a son propre processeur (l'**IKBD**, un 6301), relié par une liaison série à l'**ACIA**
(`$FFFFFC00`). Il envoie :

- un **octet par touche** : son code (*scancode*), avec le bit 7 à 1 quand la touche est **relâchée** ;
- des **paquets** pour la souris (en-tête `$F8`-`$FB`, puis déplacements X et Y) et le joystick
  (en-tête `$FE`/`$FF`, puis l'état : bits 0-3 = haut, bas, gauche, droite, bit 7 = bouton).

Le TOS décode tout cela sous l'interruption de l'ACIA (canal 6 du MFP) ; un programme récupère les
paquets en détournant les routines de la table rendue par `Kbdvbase` (XBIOS 34), ou les touches par
`Crawcin` / `Bconin`.

## Les exceptions et les « bombes »

Quand une exception non prévue survient, le TOS affiche autant de **bombes** que le numéro du vecteur :

| Bombes | Cause | Erreur classique |
|---|---|---|
| 2 | erreur de bus | accès au matériel ou aux vecteurs en mode utilisateur, adresse sans mémoire |
| 3 | erreur d'adresse | mot ou long à une adresse impaire (oubli d'`EVEN`, indice non multiplié) |
| 4 | instruction illégale | saut dans des données, pile déséquilibrée |
| 5 | division par zéro | |
| 8 | violation de privilège | `MOVE #…,SR` en mode utilisateur |

> Dans le simulateur de 68k Trainer : la palette, la base vidéo, la résolution, le YM2149, le MFP et
> l'ACIA du clavier sont simulés ; le son DMA et le Blitter du STE, non (Hatari les émule, en mode
> STE).

> Fiche créée le 21/10/2026 (Claude) — à relire.
