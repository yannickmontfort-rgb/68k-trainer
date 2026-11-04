---
title: "La pile et les sous-programmes"
source: "cours_asm_68000.pdf — Le Féroce Lapin, Volume 1, cours 6-7 (adapté) ; M68000PRM (Motorola). Complétée et corrigée le 21/10/2026."
themes: ["sous-programmes", "pile"]
---

# La pile et les sous-programmes

## Le principe de la pile (LIFO)

La pile est une zone de mémoire qu'on gère sans retenir d'adresse pour chaque donnée : on empile
(*push*) et on dépile (*pop*), et le dernier élément empilé est toujours le premier ressorti, comme
dans une pile d'assiettes. C'est une structure **LIFO** (*Last In, First Out*).

On n'a donc aucune adresse à gérer et aucune place à réserver pour une donnée temporaire. En
contrepartie, la gestion doit être rigoureuse, car empiler et dépiler dans le mauvais ordre ou avec
la mauvaise taille corrompt sans bruit tout ce qui suit sur la pile.

## Le pointeur de pile : A7 / SP

Le registre A7 est réservé à la pile : c'est le *Stack Pointer* (SP), qui pointe en permanence sur
la dernière donnée empilée. La pile descend vers les adresses basses, si bien qu'empiler fait
diminuer SP. Il existe deux A7 physiques, `USP` pour le mode utilisateur et `SSP` pour le mode
superviseur, et le processeur prend automatiquement le bon.

On empile et on dépile avec deux modes d'adressage :

```asm
        MOVE.L  D0,-(SP)        ; SP -= 4, puis écrit D0 à l'adresse SP : « push »
        MOVE.L  (SP)+,D0        ; lit D0 à l'adresse SP, puis SP += 4 : « pop »
        MOVE.W  D1,-(SP)        ; un mot : SP -= 2
        MOVE.W  (SP)+,D1
```

Empiler un `.B` décrémente quand même SP de 2, pour que la pile reste sur une adresse paire. Ce
n'est vrai que pour A7 : un autre registre d'adresse employé de la même façon n'avance que d'un
octet.

## Appel de sous-programme : BSR / JSR / RTS

```asm
        BSR     AJOUTE          ; empile l'adresse de l'instruction SUIVANTE, puis saute à AJOUTE
        ; ... le programme reprend ici après le RTS ...

AJOUTE: ADD.L   D1,D0
        RTS                     ; dépile l'adresse de retour et y retourne
```

- `BSR` (*Branch to SubRoutine*) appelle de façon relative au PC, ce qui garde le code relogeable :
  `BSR.S` pour un sous-programme proche (±126 octets), `BSR` (mot) jusqu'à ±32 Ko.
- `JSR` (*Jump to SubRoutine*) appelle par une adresse effective : `JSR (A0)` pour une adresse
  calculée ou une table de sauts, `JSR -552(A6)` pour une bibliothèque Amiga, `JSR ETIQUETTE(PC)`.
- `RTS` (*ReTurn from Subroutine*) dépile 4 octets dans le PC. `RTR` dépile en plus le CCR, s'il a
  été empilé par `MOVE SR,-(SP)`, et `RTE` sert à sortir d'une exception (voir plus bas).

Un appel ne sauvegarde que l'adresse de retour. Si la routine modifie D0-D7 ou A0-A6, ces registres
restent modifiés au retour, puisqu'il n'existe pas de variable locale automatique en assembleur.
C'est au programmeur de sauvegarder ce qui doit survivre à l'appel, et de noter en commentaire ce
que la routine reçoit, rend et modifie.

### Sauvegarder des registres : MOVEM

`MOVEM` (*MOVE Multiple registers*) transfère plusieurs registres en une seule instruction :

```asm
        MOVEM.L D0-D2/A0-A1,-(SP)       ; sauve D0, D1, D2, A0 et A1 (5 x 4 = 20 octets)
        ; ... travail ...
        MOVEM.L (SP)+,D0-D2/A0-A1       ; restaure exactement la MÊME liste
```

- On écrit la **même liste** à l'entrée et à la sortie. `MOVEM` range toujours les registres dans un
  ordre fixe en mémoire, D0 à l'adresse la plus basse jusqu'à A7, quel que soit l'ordre dans lequel
  on écrit la liste.
- `MOVEM` ne modifie pas les flags, ce qui permet de restaurer les registres juste avant un `RTS`
  sans perdre le résultat d'un test fait juste avant.
- `MOVEM.W` vers des registres étend le signe de chaque mot sur 32 bits.

### Passer des paramètres

Il y a trois façons usuelles, de la plus simple à la plus générale :

1. Par les registres, ce qui est le plus rapide : « entrée D0 = valeur, A0 = adresse ; sortie D0 ».
2. Par une zone mémoire, une structure de paramètres dont on passe l'adresse dans un registre.
3. Par la pile, en empilant les valeurs avant le `BSR`, comme le font le TOS (GEMDOS/BIOS/XBIOS) et
   les compilateurs C :

```asm
        MOVE.W  #$1452,-(SP)    ; paramètre 1 (mot  : 2 octets)
        MOVE.L  #$54854,-(SP)   ; paramètre 2 (long : 4 octets)
        BSR     BIDOUILLE
        ADDQ.L  #6,SP           ; l'appelant rend la place : 2 + 4 = 6 octets
```

Après l'appel, l'appelant remet SP dans l'état où il était en lui ajoutant la taille totale des
paramètres empilés, avec `ADDQ.L #n,SP` jusqu'à 8, `LEA n(SP),SP` ou `ADDA.L #n,SP` au-delà. Sinon la
pile reste décalée et un `RTS` plus loin repartira à une adresse fausse.

Dans le sous-programme, on lit les paramètres sans les dépiler, par un déplacement depuis SP, en
comptant tout ce qui a été empilé après eux : l'adresse de retour (4 octets) et les registres
sauvegardés.

Dans cet exemple complet, deux nombres passés par la pile sont additionnés et la somme revient dans
D0 :

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

Pour réserver de la place sur la pile le temps d'une routine, le 68000 a deux instructions faites
pour cela. `LINK A6,#-n` empile A6, copie SP dans A6, qui devient le **cadre** (*frame pointer*),
puis réserve *n* octets ; `UNLK A6` défait le tout.

```asm
CALCUL: LINK    A6,#-8                  ; 8 octets de variables locales : -8(A6) à -1(A6)
        MOVE.L  8(A6),D0                ; 1er paramètre : 4 (ancien A6) + 4 (retour) = 8
        MOVE.L  D0,-4(A6)               ; variable locale n° 1
        ; ...
        UNLK    A6                      ; SP = A6, puis dépile l'ancien A6
        RTS
```

Avec un cadre, les déplacements des paramètres (`8(A6)`, `12(A6)`…) ne changent plus quand la
routine empile d'autres valeurs, et c'est la convention des compilateurs C. Sur l'Amiga, A6 sert de
base aux bibliothèques, et on utilise donc plutôt `LINK A5`.

## Les exceptions : la pile utilisée par le processeur

Une exception est un appel de sous-programme que déclenche le processeur lui-même, sur une
interruption matérielle, une erreur (adresse impaire, instruction illégale, division par zéro) ou
une instruction `TRAP #0-15`. Le 68000 :

1. passe en mode superviseur, donc sur la pile `SSP` ;
2. empile le PC (4 octets) puis le SR (2 octets), soit 6 octets au total, davantage pour les erreurs
   de bus et d'adresse, et toujours 8 octets ou plus sur les 68010 et suivants ;
3. lit l'adresse de la routine dans la table des vecteurs, en mémoire basse, où le vecteur *n* se
   trouve à l'adresse *n* × 4.

La routine se termine par `RTE` (*ReTurn from Exception*), qui dépile le SR et le PC, et jamais par
`RTS`, qui ne dépilerait que 4 octets et laisserait la pile et le mode faux.

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

L'usage de ces vecteurs dépend de la machine. Sur l'Atari ST, `TRAP #1`, `#13` et `#14` sont le
GEMDOS, le BIOS et le XBIOS (voir [la fiche TOS](../atari-st/trap-et-systeme.md)) ; sur l'Amiga, on
appelle le système par `JSR` dans les bibliothèques et non par `TRAP`
(voir [la fiche système Amiga](../amiga/systeme-et-hardware.md)).

> Fiche complétée et corrigée le 21/10/2026 (Claude) : exemple de passage par la pile recalculé,
> MOVEM, LINK/UNLK, exceptions et table des vecteurs.
