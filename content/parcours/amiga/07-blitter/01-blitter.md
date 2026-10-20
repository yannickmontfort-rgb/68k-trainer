## Un déménageur de mémoire

Le **Blitter** (*BLock Image Transferer*), dans Agnus, copie et combine des **blocs de mémoire**
bien plus vite que le 68000 : il lit jusqu'à trois sources, **A**, **B** et **C**, les combine
bit à bit, et écrit le résultat dans la destination **D**. Il travaille par **mots** de 16 bits,
sur un rectangle de *largeur* × *hauteur* mots, pendant que le 68000 fait autre chose.

Comme les autres puces, il ne voit que la **Chip RAM**.

## Ses registres

| Registre | Décalage | Rôle |
|---|---|---|
| `BLTCON0` | `$040` | quels canaux sont utilisés, la fonction logique (*minterm*), le décalage de A |
| `BLTCON1` | `$042` | le décalage de B, les modes (descendant, remplissage, ligne) |
| `BLTAFWM`, `BLTALWM` | `$044`, `$046` | masques du premier et du dernier mot de chaque ligne de A |
| `BLTCPT`, `BLTBPT`, `BLTAPT`, `BLTDPT` | `$048`, `$04C`, `$050`, `$054` | adresses des canaux C, B, A et D (mots longs) |
| `BLTCMOD`, `BLTBMOD`, `BLTAMOD`, `BLTDMOD` | `$060` à `$066` | modulos : octets à sauter à la fin de chaque ligne |
| `BLTSIZE` | `$058` | la taille… et **le départ** : l'écrire lance le travail |

Dans `BLTCON0`, les bits 11 à 8 allument les canaux : A = `$0800`, B = `$0400`, C = `$0200`,
D = `$0100`. L'octet du bas est la fonction logique : `$F0` veut dire « D = A ».

## BLTSIZE : la taille, et le départ

```
BLTSIZE = hauteur × 64 + largeur en mots        (hauteur ≤ 1024, largeur ≤ 64 mots)
```

La hauteur va dans les bits 15-6, la largeur dans les bits 5-0. Un bloc de 64 pixels (4 mots)
sur 20 lignes : `MOVE.W #(20<<6)|4,$58(A5)`. On l'écrit **en dernier**, quand tout est réglé.

## Les modulos

Le Blitter parcourt le rectangle ligne par ligne. À la fin de chaque ligne, il ajoute à chaque
pointeur son **modulo**. Pour un bloc de 64 pixels (8 octets) dans un écran de 40 octets par
ligne, le modulo de l'écran vaut 40 − 8 = **32**. Pour une image rangée d'un seul tenant, le
modulo vaut 0.

## Attendre la fin

Le Blitter travaille en parallèle : quand `BLTSIZE` est écrit, le 68000 continue aussitôt. Avant
de préparer le blit suivant (ou de lire le résultat), il faut **attendre qu'il ait fini** : le
bit 14 de `DMACONR` (BBUSY) reste à 1 tant qu'il travaille.

```asm
attendre_blitter:
    BTST    #6,$02(A5)      ; bit 14 de DMACONR = bit 6 de son octet fort
    BNE.S   attendre_blitter
```

(Les toutes premières Agnus avaient un défaut : on fait souvent une lecture de `DMACONR` « pour
rien » avant la boucle.) Modifier les registres du Blitter pendant qu'il travaille donne des
résultats faux ou des plantages : **68k Trainer le signale**.

Il faut aussi que son canal DMA soit allumé : `MOVE.W #$8240,$96(A5)` (SET + DMAEN + BLTEN).

## Effacer et copier

Effacer, c'est écrire des zéros : seul le canal D, et la fonction 0.

```asm
    MOVE.L  #$01000000,$40(A5)  ; BLTCON0 = $0100 (D seul, minterm 0), BLTCON1 = 0
    MOVE.L  #ecran,$54(A5)      ; BLTDPT
    MOVE.W  #0,$66(A5)          ; BLTDMOD
    MOVE.W  #(256<<6)|20,$58(A5); 256 lignes de 20 mots : tout un plan de 320 × 256
```

Copier, c'est D = A : canaux A et D, fonction `$F0`, masques à `$FFFF`.

```asm
    MOVE.L  #$09F00000,$40(A5)  ; BLTCON0 = $09F0, BLTCON1 = 0
    MOVE.L  #-1,$44(A5)         ; BLTAFWM = BLTALWM = $FFFF
```
