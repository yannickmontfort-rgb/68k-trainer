---
title: "Programmes auto-modifiables"
source: "cours_asm_68000.pdf — Le Féroce Lapin, Volume 2, cours 6 (adapté)"
themes: ["technique-avancee"]
---

# Programmes auto-modifiables

> Technique générique de bas niveau (valable sur n'importe quel 68000, pas spécifique à l'Atari
> ST) — rangée ici parce qu'elle prolonge directement les exemples GEMDOS des fiches précédentes.

Un programme assembleur n'est, en mémoire, qu'une suite de nombres — exactement comme des
données. Rien n'empêche donc un programme d'écrire dans sa **propre zone de code** pour modifier
une instruction déjà assemblée, du moment que le résultat reste un code d'opération valide.

## Patcher un opérande immédiat

Repérer, dans le listing assemblé, à quel offset (en octets) commence l'opérande qu'on veut changer
à l'intérieur d'une instruction, puis écrire directement à `étiquette+offset` :

```asm
AFFICHE MOVEA.L #TABLEAU,A0   ; codé sur 3 words (6 octets) : $207C, puis le long TABLEAU
        MOVE.W  (A0)+,D0
        CMP.W   #$FFFF,D0
        BNE     .ICI
        MOVE.L  #TABLEAU,AFFICHE+2   ; réinitialise le pointeur embarqué dans l'instruction ci-dessus
        BRA     AFFICHE
.ICI    ADD.W   #2,AFFICHE+4          ; avance de 2 (taille d'un word) le SEUL le mot bas de l'adresse patchée
        ...
        RTS
```

- `AFFICHE+2` cible le second *word* de l'instruction `MOVEA.L #xxx,A0` (le premier word, `AFFICHE+0`,
  contient l'opcode `$207C` lui-même ; l'adresse immédiate — un long — commence juste après).
- Ce n'est plus la peine de garder un pointeur séparé en mémoire (`PTN_TAB`) : l'instruction
  **est** le pointeur.
- **Piège** : une désynchronisation d'un seul octet dans le calcul du décalage transforme
  l'instruction patchée en autre chose — potentiellement un opcode illégal, ou pire, une instruction
  valide mais différente de celle voulue. Commenter généreusement ce genre de code est indispensable,
  puisque le listing sous les yeux n'est plus forcément ce qui s'exécute réellement.

## Remplacer une instruction entière

Deux opcodes utiles à connaître par cœur pour ce genre de bidouille :

| Instruction | Encodage |
|---|---|
| `NOP` (*No OPeration*) | `$4E71` |
| `RTS` (*Return from Subroutine*) | `$4E75` |

Écrire `$4E75` à l'adresse d'une instruction la transforme en un retour immédiat — pratique pour
"couper court" une routine sans la réécrire. `NOP` ne fait rien mais consomme un cycle, utile comme
temporisation minime.

## Échanger des versions entières de code

On peut aller plus loin et patcher un bloc entier de plusieurs instructions consécutives par un
autre bloc de code (au pire complété par des `NOP` si les tailles diffèrent) :

```asm
        LEA    VARIANTE,A0
        MOVE.W #$D240,(A0)+          ; ADD.W D0,D1
        MOVE.L #$C2FC0003,(A0)+      ; MULU.W #3,D1
        MOVE.L #$04410006,(A0)+      ; SUB.W  #6,D1

VARIANTE MULU.W D0,D1                 ; sera remplacé en mémoire par le bloc ci-dessus au runtime
         SUB.W  #8,D1
         ADD.W  #4,D0
```

Usages typiques : réduire la taille finale du programme (une seule zone mémoire sert successivement
à plusieurs variantes), accélérer une routine appelée des milliers de fois (remplacer un test par la
branche déjà résolue une fois pour toutes, plutôt que le retester à chaque appel), ou varier le
comportement d'une routine de protection.
