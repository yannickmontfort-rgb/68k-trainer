---
title: "Programmation graphique bas niveau : le framebuffer"
source: "Manuel Technique : Programmation Graphique Bas Niveau sur Atari ST (fourni par Yannick, 2026-08)"
themes: ["graphisme", "framebuffer"]
---

# Programmation graphique bas niveau : le framebuffer

> Complète [ligne-a-et-gem.md](ligne-a-et-gem.md) : ici on manipule directement la mémoire vidéo,
> sans passer par la ligne A ni le GEM — utile pour comprendre ce qu'il y a "sous" ces API, ou pour
> des routines critiques en performance.

## Localiser le framebuffer

L'adresse de base de la mémoire vidéo n'est **pas fixe** — elle dépend de la configuration système
et de la version du TOS. On l'obtient via la fonction XBIOS `Logbase()` (`TRAP #14`), à conserver
dans un registre d'adresse pour un accès rapide.

## Organisation en haute résolution monochrome (640×400)

Mode le plus simple pour débuter : **1 pixel = 1 bit**.

- 400 lignes, chacune occupant **80 octets** → framebuffer total = 400 × 80 = **32 000 octets**.
- Chaque ligne de 640 pixels se subdivise en **40 groupes de 16 pixels**, chaque groupe tenant sur
  un **word** (16 bits).

**Formule d'adressage** du mot de 16 bits contenant le pixel (x, y) :

```
Adresse_Groupe = FB_BASE + (y * 80) + ((x / 16) * 2)
```

- `y * 80` — décalage de la ligne.
- `(x / 16) * 2` — décalage du groupe de 16 pixels dans la ligne (× 2 car chaque groupe = 1 word =
  2 octets).

## Codage des couleurs et ordre des bits

Par défaut, l'Atari ST affiche en **vidéo inverse** ("mode clair") : bit à 0 = blanc, bit à 1 =
noir — l'inverse de ce qu'on pourrait intuitivement supposer.

**Big Endian**, à deux niveaux : le bit de poids fort (bit 15) d'un mot correspond au pixel le plus
à **gauche** du groupe de 16 ; et les 2 octets du mot sont eux-mêmes stockés en Big Endian en
mémoire. Cette cohérence avec l'architecture du 68000 permet de manipuler des bandes de 16 pixels à
la vitesse maximale du bus mémoire (important pour le remplissage et le dessin de fontes).

## Manipuler des pixels

**Par groupe de 16** (le plus rapide) — écrire directement un mot à l'adresse calculée :
```asm
MOVE.W #%1010101010101010,(A0)   ; motif en pointillé sur 16 pixels d'un coup
```

**Pixel par pixel**, sans toucher aux 15 autres du même groupe, via un masque :

1. Position du bit dans le groupe (Big Endian) : `position_bit = 15 - (x MOD 16)`.
2. Masque : `1 << position_bit`.
3. Application, une fois le mot lu en registre :

| Effet | Instruction | Pourquoi |
|---|---|---|
| Allumer le pixel | `OR.W masque,(A0)` | met le bit ciblé à 1 sans toucher aux autres |
| Éteindre le pixel | `AND.W ~masque,(A0)` | ET avec le masque **inversé** (le `~` est une facilité d'assembleur qui précalcule l'inversion à l'assemblage — le 68000 ne voit qu'une constante déjà calculée) |
| Inverser le pixel | `EOR.W masque,(A0)` | XOR : bascule uniquement le bit ciblé |

## Routine complète : `setpixel`

Convention d'appel : `D3.W` = X, `D4.W` = Y, `A3` = adresse de base du framebuffer (déjà obtenue
via `Logbase()`). Registres modifiés : D0, D1, A0 (à documenter en commentaire pour l'appelant).

```asm
; setpixel — allume le pixel (D3,D4) sur l'écran haute résolution
; Entrée : D3.W = X, D4.W = Y, A3 = adresse framebuffer (Logbase())
; Modifie : D0, D1, A0
setpixel:
        ; --- Étape 1 : offset de ligne = Y * 80 ---
        MOVE.W  D4,D0
        MULU    #80,D0          ; MULU est lent : à éviter dans une boucle critique si possible

        ; --- Étape 2 : offset de groupe = (X / 16) * 2, sans division ni multiplication ---
        MOVE.W  D3,D1
        LSR.W   #4,D1            ; D1 = X / 16
        LSL.W   #1,D1            ; D1 = (X / 16) * 2

        ; --- adresse finale du mot à modifier ---
        MOVE.L  A3,A0
        ADD.W   D0,A0
        ADD.W   D1,A0

        ; --- Étape 3 : masque du bit correspondant à X dans le groupe ---
        MOVE.W  D3,D1
        AND.W   #15,D1           ; D1 = X MOD 16 (ET avec 15, plus rapide qu'une division)
        MOVEQ   #15,D0
        SUB.W   D1,D0             ; D0 = 15 - (X MOD 16) = position du bit (Big Endian)
        MOVEQ   #1,D1
        LSL.W   D0,D1             ; D1 = masque = 1 << position

        ; --- Étape 4 : applique le masque ---
        OR.W    D1,(A0)
        RTS
```

> **Pourquoi éviter `MULU`/`DIVU` dans une boucle graphique** : ce sont des instructions
> microcodées, lentes comparées à un simple décalage/addition — remplacer une division par une
> puissance de 2 par un `LSR`/`LSL` était un réflexe classique d'optimisation en 68000.

> **Limite de cette routine** : appeler `setpixel` pixel par pixel (avec le coût `BSR`/`RTS` et le
> recalcul complet à chaque fois) est trop lent pour des applications critiques en performance
> (jeux). Les techniques avancées utilisent des routines spécialisées, des tables précalculées, ou
> des algorithmes de tracé (Bresenham) qui manipulent la mémoire plus directement — voir aussi la
> routine de tracé de ligne côté [ligne-a-et-gem.md](ligne-a-et-gem.md#la-ligne-a--les-primitives-graphiques-du-68000-pas-de-latari).

## Note

La source contient aussi une annexe "Concepts fondamentaux de l'assembleur 68000" (registres,
pile, processus d'assemblage) — non reprise ici car déjà couverte par le tronc commun
([registres-et-memoire.md](../general/registres-et-memoire.md),
[pile-et-sous-programmes.md](../general/pile-et-sous-programmes.md)).
