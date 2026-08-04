---
title: "Démarrage de programme, inclusions, macros et tableaux"
source: "cours_asm_68000.pdf — Le Féroce Lapin, Volume 2, cours 3 à 5 (adapté)"
themes: ["outillage", "tableaux", "demarrage"]
---

# Démarrage de programme, inclusions, macros et tableaux

## La routine de démarrage et la "page de base"

Au lancement, un programme TOS reçoit **toute la mémoire libre** — il doit la rendre avant de
travailler proprement, sans quoi il empêche tout autre programme de tourner. Le système décrit le
programme via une **page de base**, une petite en-tête en mémoire :

| Offset | Contenu |
|---|---|
| `$08` | adresse de début de la section TEXTE (code) |
| `$0C` | taille de la section TEXTE |
| `$10` | adresse de début de la section DATA |
| `$14` | taille de la section DATA |
| `$18` | adresse de début de la section BSS |
| `$1C` | taille de la section BSS |

Une routine de démarrage standard : récupère l'adresse de la page de base, additionne les 3
tailles (+ 256 octets pour la page de base elle-même), et appelle **`Mshrink()`** (fonction GEMDOS
n°74) pour rendre le surplus de mémoire — puis installe sa propre pile via `MOVE.L PILE,A7` sur une
zone réservée dans la section BSS (`DS.B`/`DS.L`).

> **Piège classique et instructif : la pile doit être réservée AVANT son étiquette**, puisqu'elle se
> remplit par adressage pré-décrémenté (`-(SP)`) — l'étiquette `PILE` doit donc être placée **après**
> la réservation (`DS.B <taille> \n PILE DS.L 1`), pas avant. Une pile trop petite ne plante pas
> forcément tout de suite : elle écrase silencieusement ce qui se trouve juste avant elle en mémoire
> (une variable, ou pire, le code d'une routine) — un bug très difficile à diagnostiquer si on ne
> pense pas à vérifier la taille réellement nécessaire (compter les octets empilés par chaque
> `MOVEM`/`BSR`/`TRAP` imbriqués).

## Inclusions : `INCLUDE` et `INCBIN`

Deux directives d'assembleur (pas des instructions 68000) pour garder les sources gérables :

- **`INCBIN "fichier"`** — incorpore un fichier binaire tel quel (image, son, sprites, ou un bout de
  programme déjà assemblé) à l'endroit de la directive.
- **`INCLUDE "fichier.s"`** — incorpore un fichier source, comme un copier-coller à l'assemblage.
  Permet de constituer une **bibliothèque personnelle** de routines réutilisables (sauvegarde de
  palette, routine de démarrage, etc.) sans les retaper dans chaque programme — un gain de temps
  énorme même si l'assemblage lui-même devient plus lent.

> Attention à la distinction adresse/contenu avec `INCBIN` : `IMAGE INCBIN "photo.pi1"` place les
> octets de l'image à l'adresse `IMAGE`, alors que `PTN_IMAGE DC.L IMAGE` place, à l'adresse
> `PTN_IMAGE`, un pointeur *vers* `IMAGE` — bien distinguer "la donnée" de "l'adresse de la donnée".

## Macros

Une macro remplace plusieurs lignes répétitives par une seule instruction "maison", développée par
l'assembleur au moment de l'assemblage (elle n'existe pas pour le processeur — contrairement à un
sous-programme, il n'y a ni `BSR` ni `RTS`, juste du texte recopié tel quel) :

```asm
PRINT   MACRO   ADR_TXT
        MOVE.L  \1,-(SP)   ; \1 = premier paramètre passé à la macro
        MOVE.W  #9,-(SP)
        TRAP    #1
        ADDQ.L  #6,SP
        ENDM

        PRINT   #MESSAGE   ; remplacé par les 4 lignes ci-dessus à l'assemblage
```

- La syntaxe exacte (`MACRO`/`ENDM`, `\1`/`\2`...) **dépend de l'assembleur** — vérifier la syntaxe
  supportée par vasm plutôt que de recopier celle-ci telle quelle.
- Une macro peut en appeler une autre.
- Revers de la médaille : à trop en abuser, on perd l'avantage principal de l'assembleur (un petit
  nombre d'instructions à retenir) — à réserver aux séquences vraiment répétitives.

## Tableaux : adressage indexé

L'adressage indexé avec déplacement (`d(An,Dn.taille)`) sert à parcourir un tableau : `An` pointe le
début du tableau, `Dn` sert d'indice, `d` est un décalage fixe optionnel (utile par exemple pour
choisir entre deux moitiés d'un même tableau selon une condition).

```asm
        LEA     TABLEAU,A0
        ; D0 contient l'indice (0, 1, 2, ...)
        MULU    #2,D0            ; un mot = 2 octets : l'indice doit être multiplié par la taille d'un élément
        MOVE.W  0(A0,D0.W),D1     ; charge le D0-ième mot du tableau dans D1
```

> **Le déplacement compte toujours en octets**, quelle que soit la taille des éléments du tableau —
> d'où la multiplication par 2 (mot) ou 4 (long) de l'indice avant de l'utiliser. Oublier ce
> `MULU` est une source d'erreur classique : le programme "marche" par accident sur les indices pairs
> puis plante en "erreur d'adresse" sur les indices impairs (accès à un mot sur une adresse impaire).
> Un tableau d'**octets**, lui, n'a pas ce problème (`MOVE.B`, pas de multiplication nécessaire).

**Table de sauts** (jump table) — un tableau d'adresses de routines, pour remplacer une longue
cascade de comparaisons par un simple indice :

```asm
        LEA     TABLEAU,A0
        MOVE.L  0(A0,D0.W),A0   ; D0 déjà multiplié par 4 (un pointeur = un long)
        JSR     (A0)             ; saute à la routine choisie par l'indice

TABLEAU DC.L    TOUT_VERT
        DC.L    TOUT_BLEU
        DC.L    QUITTER
        ; ...
```

**Recherche dans une liste non contiguë** (parallèle à une table de sauts, avec une valeur
sentinelle `$FFFF` marquant la fin) :

```asm
        LEA   TAB_CODE,A0
        LEA   TAB_ROUTINE,A1
.ICI    MOVE.W  (A0)+,D0
        CMP.W   #$FFFF,D0
        BEQ     DEBUT             ; fin de liste, code non reconnu
        MOVE.L  (A1)+,A2
        CMP.W   D0,D7             ; D7 = code à rechercher
        BNE     .ICI
        JSR     (A2)
```

> **Label local** : un label précédé d'un point (`.ICI`) est rattaché au label global précédent —
> on peut donc réutiliser `.ICI` dans plusieurs routines du même fichier sans collision de noms.

## Hors périmètre de ce trainer

Reste à extraire : l'auto-modification de code (cours 6), la Ligne A et le GEM/AES/VDI (cours 7-9),
les interruptions du MFP68901 (cours 10). Voir aussi la remarque sur les exercices non vérifiables
automatiquement dans [content/exercises/README.md](../../exercises/README.md).
