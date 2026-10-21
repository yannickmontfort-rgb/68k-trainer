---
title: "La pile et les sous-programmes"
source: "cours_asm_68000.pdf — Le Féroce Lapin, Volume 1, cours 6-7 (adapté) ; M68000PRM (Motorola). Complétée et corrigée le 21/10/2026."
themes: ["sous-programmes", "pile"]
---

# La pile et les sous-programmes

## Le principe de la pile (LIFO)

La pile est une zone de mémoire gérée différemment du reste : au lieu de retenir une adresse
pour chaque donnée, on **empile** (*push*) et on **dépile** (*pop*) — toujours dans cet ordre :
le dernier élément empilé est le premier ressorti. C'est une structure **LIFO**
(*Last In, First Out*), comme une pile d'assiettes.

Avantage : pas besoin de gérer d'adresse explicite, et pas de place gaspillée pour une donnée
temporaire. Inconvénient : la gestion doit être **rigoureuse** — empiler/dépiler dans le mauvais
ordre ou avec la mauvaise taille corrompt silencieusement tout ce qui suit sur la pile.

## Le pointeur de pile : A7 / SP

Le registre **A7** est réservé à la pile — c'est le **Stack Pointer** (SP), qui pointe en permanence
sur la **dernière donnée empilée**. La pile **descend** vers les adresses basses : empiler fait
diminuer SP. Il existe deux A7 physiques : `USP` pour le mode utilisateur et `SSP` pour le mode
superviseur ; le processeur prend automatiquement le bon.

Empiler et dépiler se font avec deux modes d'adressage :

```asm
        MOVE.L  D0,-(SP)        ; SP -= 4, puis écrit D0 à l'adresse SP : « push »
        MOVE.L  (SP)+,D0        ; lit D0 à l'adresse SP, puis SP += 4 : « pop »
        MOVE.W  D1,-(SP)        ; un mot : SP -= 2
        MOVE.W  (SP)+,D1
```

> **Particularité utile :** empiler un `.B` décrémente quand même SP de **2** — la pile reste
> toujours sur une adresse paire. (Ce n'est vrai que pour A7 ; un autre registre d'adresse utilisé
> de la même façon avance bien d'un seul octet.)

## Appel de sous-programme : BSR / JSR / RTS

```asm
        BSR     AJOUTE          ; empile l'adresse de l'instruction SUIVANTE, puis saute à AJOUTE
        ; ... le programme reprend ici après le RTS ...

AJOUTE: ADD.L   D1,D0
        RTS                     ; dépile l'adresse de retour et y retourne
```

- `BSR` (*Branch to SubRoutine*) : appel **relatif** au PC (code relogeable). `BSR.S` pour un
  sous-programme proche (±126 octets), `BSR` (mot) jusqu'à ±32 Ko.
- `JSR` (*Jump to SubRoutine*) : appel par une **adresse effective** — `JSR (A0)` (adresse calculée,
  table de sauts), `JSR -552(A6)` (bibliothèque Amiga), `JSR ETIQUETTE(PC)`.
- `RTS` (*ReTurn from Subroutine*) dépile 4 octets dans le PC. `RTR` dépile en plus le CCR (s'il a
  été empilé par `MOVE SR,-(SP)`), `RTE` sert à sortir d'une **exception** (voir plus bas).

> **Un sous-programme ne sauvegarde que l'adresse de retour** — rien d'autre. Si la routine
> modifie D0-D7/A0-A6, ces registres restent modifiés au retour : il n'existe pas de variable
> locale automatique en assembleur. C'est **au programmeur** de sauvegarder ce qui doit
> survivre à l'appel, et de **documenter** en commentaire ce que la routine reçoit, rend et modifie.

### Sauvegarder des registres : MOVEM

`MOVEM` (*MOVE Multiple registers*) transfère plusieurs registres en une seule instruction :

```asm
        MOVEM.L D0-D2/A0-A1,-(SP)       ; sauve D0, D1, D2, A0 et A1 (5 x 4 = 20 octets)
        ; ... travail ...
        MOVEM.L (SP)+,D0-D2/A0-A1       ; restaure exactement la MÊME liste
```

- On écrit la **même liste** à l'entrée et à la sortie : `MOVEM` range toujours les registres dans un
  ordre fixe en mémoire (D0 à l'adresse la plus basse … A7), quel que soit l'ordre d'écriture de la
  liste.
- `MOVEM` **ne modifie pas les flags** : on peut donc restaurer les registres juste avant un `RTS`
  sans perdre le résultat d'un test fait juste avant.
- `MOVEM.W` vers des registres **étend le signe** de chaque mot sur 32 bits.

### Passer des paramètres

Trois façons usuelles, du plus simple au plus général :

1. **Par les registres** — le plus rapide. Exemple : « entrée D0 = valeur, A0 = adresse ; sortie D0 ».
2. **Par une zone mémoire** dont on passe l'adresse dans un registre (structure de paramètres).
3. **Par la pile** — empiler les valeurs avant le `BSR`, comme le font le TOS (GEMDOS/BIOS/XBIOS) et
   les compilateurs C :

```asm
        MOVE.W  #$1452,-(SP)    ; paramètre 1 (mot  : 2 octets)
        MOVE.L  #$54854,-(SP)   ; paramètre 2 (long : 4 octets)
        BSR     BIDOUILLE
        ADDQ.L  #6,SP           ; l'appelant rend la place : 2 + 4 = 6 octets
```

> **Après l'appel, il faut remettre SP dans l'état où il était avant** en lui ajoutant la taille
> totale des paramètres empilés — `ADDQ.L #n,SP` jusqu'à 8, `LEA n(SP),SP` ou `ADDA.L #n,SP`
> au-delà. Sinon la pile reste décalée et un `RTS` plus loin repartira à une adresse fausse.

À l'intérieur du sous-programme, on lit les paramètres **sans dépiler**, par un déplacement depuis
SP. Il faut compter tout ce qui a été empilé **après** eux : l'adresse de retour (4 octets) et les
registres sauvegardés.

**Exemple complet** — additionner deux nombres passés par la pile, résultat rendu dans D0 :

```asm
        MOVE.L  #$12345678,-(SP)        ; nombre 1
        MOVE.L  #$00023456,-(SP)        ; nombre 2
        BSR     AJOUTE
        ADDQ.L  #8,SP                   ; rend les 2 x 4 octets
        RTS                             ; fin du programme : D0 = $12368ACE

; AJOUTE — D0 = somme des deux longs empilés par l'appelant. Modifie : D0 seulement.
AJOUTE: MOVE.L  D1,-(SP)                ; sauve D1 (4 octets)
        MOVE.L  8(SP),D0                ; nombre 2 : 4 (D1) + 4 (adresse de retour) = 8
        MOVE.L  12(SP),D1               ; nombre 1, empilé avant le nombre 2
        ADD.L   D1,D0
        MOVE.L  (SP)+,D1                ; restaure D1
        RTS
```

```
SP + 0  : D1 sauvegardé          ← SP pendant la routine
SP + 4  : adresse de retour      (empilée par BSR)
SP + 8  : nombre 2               (empilé en dernier par l'appelant)
SP + 12 : nombre 1
```

### Variables locales : LINK et UNLK

Pour réserver de la place sur la pile pendant la durée d'une routine (variables locales), le 68000
a deux instructions faites pour ça. `LINK A6,#-n` empile A6, met SP dans A6 (le **cadre**, *frame
pointer*), puis réserve *n* octets ; `UNLK A6` défait tout.

```asm
CALCUL: LINK    A6,#-8                  ; 8 octets de variables locales : -8(A6) à -1(A6)
        MOVE.L  8(A6),D0                ; 1er paramètre : 4 (ancien A6) + 4 (retour) = 8
        MOVE.L  D0,-4(A6)               ; variable locale n° 1
        ; ...
        UNLK    A6                      ; SP = A6, puis dépile l'ancien A6
        RTS
```

Avec un cadre, les déplacements des paramètres (`8(A6)`, `12(A6)`…) ne changent plus quand la
routine empile d'autres valeurs : c'est la convention des compilateurs C. (Sur l'Amiga, A6 sert de
base aux bibliothèques : on y utilise plutôt `LINK A5`.)

## Les exceptions : la pile utilisée par le processeur

Une **exception** est un appel de sous-programme déclenché par le processeur lui-même : une
interruption matérielle, une erreur (adresse impaire, instruction illégale, division par zéro) ou
une instruction `TRAP #0-15`. Le 68000 :

1. passe en **mode superviseur** (pile `SSP`) ;
2. empile le **PC** (4 octets) puis le **SR** (2 octets) : **6 octets** au total (plus pour les
   erreurs de bus et d'adresse, et toujours 8 octets et plus sur les 68010 et suivants) ;
3. lit l'adresse de la routine dans la **table des vecteurs**, en mémoire basse : vecteur *n* à
   l'adresse *n* × 4.

La routine se termine par **`RTE`** (*ReTurn from Exception*), qui dépile le SR **et** le PC — jamais
par `RTS`, qui ne dépilerait que 4 octets et laisserait la pile (et le mode) faux.

| Vecteur | Adresse | Cause |
|---|---|---|
| 2 | `$08` | erreur de bus (accès à une adresse sans mémoire) |
| 3 | `$0C` | erreur d'adresse (mot ou long à une adresse impaire) |
| 4 | `$10` | instruction illégale |
| 5 | `$14` | division par zéro |
| 6 | `$18` | `CHK` hors limites |
| 7 | `$1C` | `TRAPV` avec V = 1 |
| 8 | `$20` | violation de privilège |
| 9 | `$24` | trace (bit T du SR) |
| 10 | `$28` | « ligne A » (opcode `$Axxx`) |
| 11 | `$2C` | « ligne F » (opcode `$Fxxx`) |
| 25-31 | `$64`-`$7C` | interruptions de niveau 1 à 7 (auto-vecteurs) |
| 32-47 | `$80`-`$BC` | `TRAP #0` à `TRAP #15` |

L'usage de ces vecteurs dépend de la machine : sur l'Atari ST, `TRAP #1`, `#13` et `#14` sont le
GEMDOS, le BIOS et le XBIOS (voir [la fiche TOS](../atari-st/trap-et-systeme.md)) ; sur l'Amiga, on
appelle le système par `JSR` dans les bibliothèques et non par `TRAP`
(voir [la fiche système Amiga](../amiga/systeme-et-hardware.md)).

> Fiche complétée et corrigée le 21/10/2026 (Claude) : exemple de passage par la pile recalculé,
> MOVEM, LINK/UNLK, exceptions et table des vecteurs — à relire.
