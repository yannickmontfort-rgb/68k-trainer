---
title: "La pile et les sous-programmes"
source: "cours_asm_68000.pdf — Le Féroce Lapin, Volume 1, cours 6-7 (adapté, contenu spécifique Atari ST/TOS/GEMDOS omis)"
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
vers le sommet de la pile. Il existe deux versions physiques d'A7 : une pour le mode utilisateur, et
`A7'`, réservée au mode superviseur.

Empiler et dépiler se font via deux modes d'adressage particuliers :

```asm
MOVE.L D0,-(SP)   ; PRÉ-décrémente SP de la taille (4 pour .L), puis écrit D0 à cette adresse : "push"
MOVE.L (SP)+,D0   ; lit D0 depuis SP, PUIS incrémente SP de la taille : "pop"
```

> **Particularité utile :** empiler un `.B` (octet) décrémente quand même SP de 2, pas de 1 — le
> 68000 ne pouvant pas accéder à une adresse impaire, la pile est toujours maintenue paire.
> (Ce n'est vrai que pour A7/SP ; un autre registre d'adresse utilisé de la même façon se
> retrouverait, lui, sur une adresse impaire.)

## Appel de sous-programme : BSR / RTS

```asm
BSR AJOUTE   ; empile l'adresse de retour (PC courant), puis saute à l'étiquette AJOUTE
...
AJOUTE  ...
        RTS  ; dépile l'adresse de retour et y revient
```

`BSR` (*Branch Sub Routine*) empile automatiquement l'adresse de retour sur la pile (4 octets),
puis `RTS` (*Return from SubRoutine*) la dépile pour reprendre l'exécution juste après le `BSR`.

> **Un sous-programme ne sauvegarde que l'adresse de retour** — rien d'autre. Si la routine
> modifie D0-D7/A0-A6, ces registres restent modifiés au retour : il n'existe pas de variable
> locale automatique en assembleur. C'est **au programmeur** de sauvegarder ce qui doit
> survivre à l'appel.

### Sauvegarder des registres : MOVEM

Sauvegarder registre par registre fonctionne, mais `MOVEM` (*MOVE Multiple registers*) transfère
plusieurs registres en une seule instruction :

```asm
MOVEM.L D0-D1/A0,-(SP)     ; empile D0, D1 et A0
...
MOVEM.L (SP)+,D0-D1/A0     ; les restaure (à faire dans l'ordre inverse de l'empilage)
```

### Passer des paramètres par la pile

On peut empiler des valeurs avant un `BSR` pour les transmettre à un sous-programme :

```asm
MOVE.W #$1452,-(SP)     ; paramètre 1 (word  → 2 octets)
MOVE.L #$54854,-(SP)    ; paramètre 2 (long  → 4 octets)
BSR    BIDOUILLE
ADDA.L #6,SP             ; nettoie la pile après l'appel : 2+4 = 6 octets à "rendre"
```

> **Après l'appel, il faut remettre SP dans l'état où il était avant** en lui ajoutant la taille totale
> des paramètres empilés (`ADDA.L #n,SP`) — sinon la pile reste décalée pour la suite du
> programme, ce qui finit par corrompre une adresse de retour plus tard.

À l'intérieur du sous-programme, une fois l'adresse de la pile recopiée dans un registre
d'adresse libre (par exemple `A0`, pour ne pas perturber SP lui-même pendant qu'on lit les
paramètres), on peut lire un paramètre empilé sans modifier le pointeur, avec un déplacement :

```asm
MOVE.L A7,A0        ; copie l'adresse de la pile dans A0
MOVE.L 16(A0),D0     ; lit un paramètre situé 16 octets plus loin sur la pile, sans bouger A0/A7
```

**Exemple complet** — additionner deux nombres passés par la pile, résultat renvoyé dans D7 :

```asm
        MOVE.L #$12345678,-(SP)   ; empile le nombre 1
        MOVE.L #$00023456,-(SP)  ; empile le nombre 2
        BSR    AJOUTE
        ADDA.L #8,SP             ; nettoie les 2 x 4 octets empilés
        MOVE.L D7,D0              ; récupère le résultat

AJOUTE  MOVEM.L D0-D1/A0,-(SP)    ; sauve les registres qu'on va utiliser
        MOVE.L  A7,A0             ; copie du pointeur de pile
        MOVE.L  16(A0),D0         ; récupère le nombre 2 (empilé en dernier → plus proche du sommet)
        MOVE.L  20(A0),D1         ; récupère le nombre 1
        ADD.L   D0,D1
        MOVE.L  D1,D7             ; résultat transmis via D7
        MOVEM.L (SP)+,D0-D1/A0    ; restaure les registres (ordre inverse de l'empilage)
        RTS
```

> Note sur les décalages 16/20 : 12 octets ont été empilés par le `MOVEM.L` d'entrée (3 registres
> × 4 octets) puis 4 octets par l'adresse de retour du `BSR`, avant même d'atteindre les
> paramètres — d'où le décalage de 16 pour le premier paramètre rencontré, 20 pour le second.

## Hors périmètre de ce trainer

Le cours original poursuit avec l'instruction `TRAP` généraliste et les appels système GEMDOS/TOS
propres à l'Atari ST (lecture clavier, accès disquette, résolution écran...). Ce trainer n'implémente
qu'un sous-ensemble minimal de `TRAP #15` façon EASy68K (affichage d'une chaîne, arrêt du
programme) — voir le code source de l'émulateur plutôt que le PDF pour la liste exacte des
services simulés.
