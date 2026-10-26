---
title: "Programmes auto-modifiables"
source: "cours_asm_68000.pdf — Le Féroce Lapin, Volume 2, cours 6 (adapté) ; M68000PRM et MC68030 User's Manual (Motorola). Complétée et corrigée le 21/10/2026."
themes: ["technique-avancee"]
---

# Programmes auto-modifiables

> La technique vaut pour n'importe quel 68000, pas seulement pour l'Atari ST. Elle a fait les beaux
> jours des démos et des protections ; aujourd'hui, elle sert surtout à **comprendre** ce qu'est
> vraiment un programme en mémoire.

En mémoire, un programme n'est qu'une suite de nombres, exactement comme des données. Rien
n'empêche donc un programme d'écrire dans sa propre zone de code pour modifier une instruction déjà
assemblée, du moment que le résultat reste un code d'opération valide.

## Lire l'encodage d'une instruction

Le débogueur de 68k Trainer montre les octets de chaque instruction, comme MONST ou le
désassembleur `npm run desasm`. Voici quelques encodages courants :

| Instruction | Encodage | Taille |
|---|---|---|
| `NOP` | `$4E71` | 2 octets |
| `RTS` | `$4E75` | 2 octets |
| `RTE` | `$4E73` | 2 octets |
| `ILLEGAL` | `$4AFC` | 2 octets |
| `MOVEQ #n,D0` | `$70nn` | 2 octets |
| `BRA.S` déplacement *d* | `$60dd` | 2 octets |
| `MOVEA.L #adresse,A0` | `$207C` puis l'adresse sur 4 octets | 6 octets |
| `MOVE.W #valeur,D0` | `$303C` puis la valeur sur 2 octets | 4 octets |

## Patcher un opérande immédiat

On repère à quel décalage, en octets, commence l'opérande à changer dans l'instruction, puis on
écrit directement à `étiquette+décalage` :

```asm
AFFICHE MOVEA.L #TABLEAU,A0     ; 6 octets : $207C, puis l'adresse de TABLEAU (AFFICHE+2)
        MOVE.W  (A0),D0         ; lit l'élément courant
        CMP.W   #$FFFF,D0       ; fin du tableau ?
        BNE.S   .suivant
        MOVE.L  #TABLEAU,AFFICHE+2 ; oui : remet le pointeur embarqué au début
        BRA.S   AFFICHE
.suivant ADDQ.L #2,AFFICHE+2    ; avance le pointeur DANS l'instruction (un mot plus loin)
        ; ... utiliser D0 ...
        RTS
```

Le premier mot, `AFFICHE+0`, est l'opcode `$207C` lui-même, et `AFFICHE+2` désigne l'adresse
immédiate de `MOVEA.L #xxx,A0`, un long. L'instruction devient ainsi le pointeur, sans variable
séparée. On modifie le long entier (`ADDQ.L #2,AFFICHE+2`), car ajouter 2 au seul mot bas de
l'adresse laisserait le mot haut inchangé si le tableau franchissait une frontière de 64 Ko.

Le piège tient à la précision : une erreur d'un seul octet dans le décalage transforme
l'instruction patchée en autre chose, un opcode illégal ou, pire, une instruction valide mais
différente. Commente généreusement, puisque le listing que tu as sous les yeux n'est plus ce qui
s'exécute.

## Remplacer une instruction entière

Écrire `$4E75` (`RTS`) au début d'une routine la transforme en retour immédiat, ce qui coupe la
routine sans la réécrire ; `$4E71` (`NOP`) neutralise une instruction de 2 octets.

```asm
        MOVE.W  #$4E75,ROUTINE  ; désormais, BSR ROUTINE revient aussitôt
        MOVE.W  #$4E71,TEST     ; ce mot ne fait plus rien (2 octets)
```

`NOP` ne fait rien mais prend 4 cycles, et c'est la plus petite temporisation possible.

## Échanger des versions entières de code

On peut remplacer un bloc de plusieurs instructions par un autre bloc de **même taille**, complété
par des `NOP` si besoin :

```asm
        LEA     VARIANTE,A0
        MOVE.W  #$D240,(A0)+    ; ADD.W  D0,D1        (2 octets)
        MOVE.L  #$C2FC0003,(A0)+ ; MULU.W #3,D1       (4 octets)
        MOVE.L  #$04410006,(A0)+ ; SUBI.W #6,D1       (4 octets)

VARIANTE MULU.W D0,D1           ; 2 octets : remplacé par ADD.W D0,D1
        SUB.W   #8,D1           ; 4 octets : remplacé par MULU.W #3,D1
        ADD.W   #4,D0           ; 4 octets : remplacé par SUBI.W #6,D1
```

Une même zone de code peut ainsi servir successivement à plusieurs variantes. Une routine appelée
des milliers de fois peut aussi trancher un test une fois pour toutes au lieu de le refaire à
chaque appel, et les démos construisaient à la volée une routine de tracé taillée pour une forme
précise.

## Le piège des processeurs à cache

Le 68000 du ST, du STE et de l'Amiga 500 relit chaque instruction en mémoire, et une modification
prend donc effet immédiatement. À partir du 68020 (Atari TT et Falcon, Amiga 1200 et 4000, l'Amiga
68020 de WinUAE avec AROS), un **cache d'instructions** garde une copie du code récemment exécuté,
et le processeur peut exécuter l'ancienne version de l'instruction modifiée.

Il faut alors vider le cache après la modification :

- sur l'Amiga, avec `CacheClearU()` d'exec (`JSR -636(A6)`, Kickstart 2.0 et plus) ;
- sur l'Atari TT ou Falcon, en superviseur, en écrivant dans le registre `CACR` avec `MOVEC`, une
  instruction qui n'existe pas sur le 68000.

> Le code auto-modifiable est aussi incompatible avec la mémoire protégée des systèmes modernes. On
> le réserve aux cas où il apporte vraiment quelque chose, et on le commente toujours.

> Fiche complétée et corrigée le 21/10/2026 (Claude) : `ADDQ.L #2,AFFICHE+2` sur le long entier,
> `NOP` en 4 cycles, encodages courants, cache des 68020 et suivants.
