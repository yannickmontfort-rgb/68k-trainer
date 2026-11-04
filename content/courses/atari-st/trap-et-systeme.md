---
title: "TRAP, GEMDOS/BIOS/XBIOS et reprogrammation des vecteurs"
source: "cours_asm_68000.pdf — Le Féroce Lapin, Volume 2, cours 2 (adapté) ; Atari ST Profibuch, documentation EmuTOS. Complétée et corrigée le 21/10/2026."
themes: ["trap", "systeme"]
---

# TRAP, GEMDOS/BIOS/XBIOS et reprogrammation des vecteurs

> La notion de vecteur d'exception et le mécanisme de `TRAP` sont dans le tronc commun, voir
> [pile-et-sous-programmes.md](../general/pile-et-sous-programmes.md). Cette fiche porte sur ce qui
> est propre au TOS, le système d'exploitation de l'Atari ST, et sur ses conventions d'appel.

## Les trois familles d'appels système

Le TOS offre ses services par trois `TRAP`, chacun avec ses fonctions numérotées :

| Trap | Famille | Rôle |
|---|---|---|
| `TRAP #1` | **GEMDOS** | console, fichiers, mémoire, fin du programme (proche du MS-DOS) |
| `TRAP #13` | **BIOS** | entrées/sorties de base : caractères, disques, vecteurs |
| `TRAP #14` | **XBIOS** | extensions propres au ST : écran, palette, son, clavier, superviseur |

`TRAP #2` sert au GEM, voir [la fiche Ligne A et GEM](ligne-a-et-gem.md).

On empile les paramètres du dernier au premier, puis le numéro de fonction sur un mot, avant
d'exécuter le `TRAP` ; au retour, c'est **l'appelant qui rend la place** prise sur la pile. Le
résultat arrive dans D0, où un nombre négatif signale une erreur.

```asm
        PEA     MESSAGE(PC)     ; paramètre : adresse de la chaîne (4 octets)
        MOVE.W  #9,-(SP)        ; fonction GEMDOS 9 : Cconws (2 octets)
        TRAP    #1
        ADDQ.L  #6,SP           ; rend les 4 + 2 octets empilés

        CLR.W   -(SP)           ; fonction 0 : Pterm0, fin du programme (ne revient pas)
        TRAP    #1

MESSAGE DC.B    'Bonjour !',13,10,0
        EVEN
```

Une chaîne TOS se termine par un octet nul, et le passage à la ligne s'écrit `13,10` : retour
chariot, puis saut de ligne.

## Les fonctions les plus utiles

| Appel | Fonction | Paramètres (empilés à l'envers) | Résultat |
|---|---|---|---|
| GEMDOS 0 | `Pterm0()` | — | fin du programme, code 0 |
| GEMDOS 1 | `Cconin()` | — | D0.L : touche (code ASCII dans l'octet bas, code clavier dans le mot haut), avec écho |
| GEMDOS 2 | `Cconout(c)` | `c.W` | affiche un caractère |
| GEMDOS 7 | `Crawcin()` | — | comme Cconin, sans écho |
| GEMDOS 8 | `Cnecin()` | — | sans écho, mais Ctrl+C interrompt |
| GEMDOS 9 | `Cconws(chaîne)` | `chaîne.L` | affiche une chaîne terminée par 0 |
| GEMDOS 11 | `Cconis()` | — | D0 = −1 si une touche attend, 0 sinon |
| GEMDOS 32 | `Super(pile)` | `pile.L` (0 = garder la même) | passe en superviseur, rend l'ancienne pile superviseur dans D0 |
| GEMDOS 60 | `Fcreate(nom, attr)` | `attr.W`, `nom.L` | D0 = numéro du fichier |
| GEMDOS 61 | `Fopen(nom, mode)` | `mode.W` (0 lecture, 1 écriture, 2 les deux), `nom.L` | D0 = numéro du fichier |
| GEMDOS 62 | `Fclose(fichier)` | `fichier.W` | |
| GEMDOS 63 | `Fread(fichier, n, tampon)` | `tampon.L`, `n.L`, `fichier.W` | D0 = octets lus |
| GEMDOS 64 | `Fwrite(fichier, n, tampon)` | `tampon.L`, `n.L`, `fichier.W` | D0 = octets écrits |
| GEMDOS 72 | `Malloc(n)` | `n.L` (−1 = demander la place libre) | D0 = adresse, 0 si échec |
| GEMDOS 73 | `Mfree(adresse)` | `adresse.L` | |
| GEMDOS 74 | `Mshrink(0, base, taille)` | `taille.L`, `base.L`, `0.W` | rend la mémoire inutile (démarrage) |
| GEMDOS 76 | `Pterm(code)` | `code.W` | fin du programme avec un code de retour |
| BIOS 3 | `Bconout(périph, c)` | `c.W`, `périph.W` (2 = écran) | |
| BIOS 5 | `Setexec(n, adresse)` | `adresse.L` (−1 = lire seulement), `n.W` | D0 = ancienne adresse du vecteur *n* |
| XBIOS 2 / 3 | `Physbase()` / `Logbase()` | — | D0 = adresse de l'écran affiché / de dessin |
| XBIOS 4 | `Getrez()` | — | D0 = 0 basse, 1 moyenne, 2 haute résolution |
| XBIOS 5 | `Setscreen(log, phys, rez)` | `rez.W`, `phys.L`, `log.L` (−1 = ne pas changer) | |
| XBIOS 6 | `Setpalette(palette)` | `palette.L` (16 mots) | |
| XBIOS 7 | `Setcolor(n, couleur)` | `couleur.W` (−1 = lire), `n.W` | D0 = ancienne couleur |
| XBIOS 37 | `Vsync()` | — | attend le prochain retour du faisceau (VBL) |
| XBIOS 38 | `Supexec(routine)` | `routine.L` | exécute une routine en superviseur (elle finit par `RTS`) |

Pour attendre une touche et la garder dans D7 :

```asm
        MOVE.W  #7,-(SP)        ; Crawcin : attend une touche, sans écho
        TRAP    #1
        ADDQ.L  #2,SP
        MOVE.L  D0,D7           ; octet bas = code ASCII, mot haut = code clavier
```

> Le simulateur de 68k Trainer connaît une partie de ces fonctions : GEMDOS 0, 1, 2, 7, 8, 9, 11,
> 32 et 76 ; BIOS 1, 2, 3, 5 et 11 ; XBIOS 2 à 7, 17, 28, 32, 34, 37 et 38. Les fichiers (`Fopen`…)
> et la mémoire (`Malloc`, `Mshrink`) demandent un vrai TOS et s'essaient avec le bouton
> « Essayer dans Hatari ».

## Passer en mode superviseur

Les vecteurs, les variables système de la mémoire basse et les registres matériels, à partir de
`$FF8000`, ne s'atteignent qu'en **mode superviseur** : en mode utilisateur, y toucher déclenche
une erreur de bus, les 2 bombes. Le TOS offre deux façons d'y passer :

```asm
; 1. Super() : tout le programme passe en superviseur
        CLR.L   -(SP)           ; 0 = garder la pile actuelle comme pile superviseur
        MOVE.W  #32,-(SP)       ; Super
        TRAP    #1
        ADDQ.L  #6,SP
        MOVE.L  D0,ANCIENNE_PILE ; à rendre en repassant en mode utilisateur
        ; ... accès au matériel ...
        MOVE.L  ANCIENNE_PILE,-(SP)
        MOVE.W  #32,-(SP)       ; Super(ancienne pile) : retour en mode utilisateur
        TRAP    #1
        ADDQ.L  #6,SP

; 2. Supexec() : seule une routine s'exécute en superviseur
        PEA     ROUGE(PC)
        MOVE.W  #38,-(SP)       ; Supexec
        TRAP    #14
        ADDQ.L  #6,SP
        CLR.W   -(SP)           ; Pterm0 : sans lui, on continuerait dans ROUGE en mode utilisateur
        TRAP    #1

ROUGE:  MOVE.W  #$0700,$FFFF8240 ; couleur 0 = rouge
        RTS                     ; une routine Supexec se termine par RTS

ANCIENNE_PILE DC.L 0
```

`Supexec` est le plus sûr pour de courts accès au matériel, et `Super` convient à un programme qui
travaille longtemps en superviseur, comme une démo ou un jeu.

## Reprogrammer un vecteur (Setexec)

La fonction BIOS `Setexec()`, la n° 5, lit ou remplace l'adresse de n'importe quel vecteur
d'exception, qu'il s'agisse d'une erreur, d'une interruption ou d'un trap. Le vecteur *n* se trouve
à l'adresse *n* × 4 : 35 est `TRAP #3` (`$8C`), 28 l'interruption VBL (`$70`), 69 le Timer C
(`$114`).

```asm
        PEA     MA_ROUTINE(PC)  ; nouvelle adresse
        MOVE.W  #35,-(SP)       ; vecteur 35 = TRAP #3 (adresse $8C)
        MOVE.W  #5,-(SP)        ; Setexec
        TRAP    #13             ; BIOS
        ADDQ.L  #8,SP
        MOVE.L  D0,ANCIEN_TRAP3 ; Setexec rend l'ancienne adresse : à remettre en quittant

        TRAP    #3              ; appelle notre routine : le fond devient rouge
        CLR.W   -(SP)           ; Pterm0 (dans un vrai programme : remettre l'ancien vecteur avant)
        TRAP    #1

MA_ROUTINE:
        MOVE.W  #$0700,$FFFF8240 ; possible : un TRAP s'exécute en superviseur
        RTE                     ; PAS RTS : retour d'exception (dépile SR + PC)

ANCIEN_TRAP3 DC.L 0
```

Une routine appelée par une exception se termine par **`RTE`** (*Return from Exception*), qui
dépile le SR et le PC, et non par `RTS`.

Avec `-1` comme adresse, `Setexec` ne modifie rien et rend seulement l'adresse actuelle dans D0.
C'est le point de départ d'un détournement : on garde l'ancienne adresse, on la remplace par la
sienne, on traite les cas qui nous intéressent et on saute à l'ancienne routine pour tout le reste,
avec `MOVE.L ANCIEN,-(SP)` puis `RTS`, ou un `JMP` vers l'adresse gardée.

## Pile et TRAP : ce qui diffère d'un simple BSR

Un `TRAP` passe le processeur en mode superviseur et empile sur la **pile superviseur** l'adresse
de retour (4 octets) et le SR (2 octets), soit 6 octets sur le 68000 et 8 sur les 68010 et
suivants, ceux de l'Atari TT et du Falcon. Les paramètres empilés par l'appelant restent sur sa
propre pile, la pile utilisateur s'il était en mode utilisateur, et c'est pourquoi le TOS regarde
le bit S du SR empilé pour savoir où les lire.

## Registres et TRAP : attention à D2

Les appels système ne préservent que `D3-D7` et `A3-A6`. D0 reçoit le résultat, et D1, D2, A0, A1
et A2 peuvent être écrasés : on ne compte jamais sur eux après un `TRAP`, et on les sauvegarde si
on en a besoin.

## Ne pas rappeler le GEMDOS n'importe quand

Le GEMDOS n'est pas réentrant : on ne l'appelle ni depuis une routine d'interruption (VBL, timer du
MFP), ni depuis une routine qui détourne un trap du GEMDOS lui-même. Depuis une interruption, on
s'en tient au matériel et, avec précaution, à quelques appels du BIOS et du XBIOS. Le GEMDOS appelle
d'ailleurs lui-même le BIOS pour afficher les caractères ou lire les disques, ce que montre un
débogueur comme MONST quand on suit les traps.

## Les variables système utiles

Le TOS tient en mémoire basse des variables documentées, accessibles en superviseur seulement :

| Adresse | Nom | Contenu |
|---|---|---|
| `$0044E` | `_v_bas_ad` | adresse de l'écran logique |
| `$00454` | `nvbls` | nombre d'entrées de la liste VBL |
| `$00456` | `_vblqueue` | adresse de la liste des routines appelées à chaque VBL |
| `$00462` | `_vbclock` | compteur de VBL depuis le démarrage |
| `$004BA` | `_hz_200` | compteur à 200 Hz (horloge fine) |
| `$004F2` | `_sysbase` | adresse de l'en-tête du TOS (version en `+2`) |

## Hors périmètre de ce trainer

La suite de ce cours du Féroce Lapin (démarrage, inclusions, macros, auto-modification, Ligne A,
GEM, MFP) se trouve dans les autres fiches de référence Atari ST.

> Fiche complétée et corrigée le 21/10/2026 (Claude) : Setexec est la fonction BIOS 5 (elle était
> donnée en XBIOS) ; l'imbrication des traps, affirmée à tort, a laissé place à la non-réentrance
> du GEMDOS ; tableau des fonctions, superviseur, variables système.
