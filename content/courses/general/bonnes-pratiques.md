---
title: "Bonnes pratiques de programmation en assembleur 68000"
source: "Manuel des Bonnes Pratiques de Programmation en Assembleur 68000 (fourni par Yannick, 2026-08). Complétée et corrigée le 21/10/2026."
themes: ["style", "conventions"]
---

# Bonnes pratiques de programmation en assembleur 68000

L'assembleur n'offre aucun garde-fou automatique comme les langages de haut niveau — la rigueur
dans la présentation et les conventions n'est pas une simple question de goût, c'est ce qui évite
des erreurs coûteuses et rend un programme maintenable.

## 1. Organisation du code et nommage

**Sections.** Séparer clairement le code des données :
- `SECTION TEXT` (ou `CODE`) — les instructions.
- `SECTION DATA` — données initialisées (`DC.B`/`DC.W`/`DC.L`), valeur connue à l'assemblage.
- `SECTION BSS` — variables non initialisées (`DS.B`/`DS.W`/`DS.L`) : l'espace est réservé en
  mémoire au chargement (rempli de zéros) mais ne prend aucune place dans le fichier exécutable.
- Sur l'Amiga, ajouter `_C` (`SECTION image,DATA_C`) pour ce que les puces doivent lire : listes
  Copper, bitplanes, sprites, sons (voir [la fiche Amiga](../amiga/systeme-et-hardware.md)).

**Alignement.** La directive `EVEN` garantit que ce qui suit commence sur une adresse paire —
indispensable après une chaîne ou un `DC.B` de longueur impaire, avant toute donnée `.W`/`.L` ou
toute instruction (le 68000 ne lit mots et longs qu'à des adresses paires).

**Format d'une ligne** — toujours la même structure, colonnes alignées par des tabulations :
```
Étiquette   Mnémonique.taille   source,destination   ; commentaire
```
L'étiquette commence en première colonne (ou se termine par `:`) ; une instruction ne commence
**jamais** en première colonne, sinon l'assembleur la prend pour une étiquette.

**Noms explicites** : `DEBUT_IMAGE`, `NOUVELLE_PALETTE`, `FIN_JEU` plutôt que `X`, `Y`, `AX1` — un
nom clair est une forme d'auto-documentation. Choisir une langue (français ou anglais) et s'y tenir
dans tout le programme. Les **étiquettes locales** (`.boucle`, rattachées à l'étiquette globale
précédente) évitent d'inventer `BOUCLE1`, `BOUCLE2`…

**Constantes nommées** avec `EQU` plutôt que des nombres magiques :

```asm
LARGEUR     EQU     320
HAUTEUR     EQU     200
PALETTE     EQU     $FFFF8240       ; couleur 0 de l'Atari ST

        MOVE.W  #LARGEUR*HAUTEUR/2-1,D7 ; l'assembleur calcule l'expression
        MOVE.W  #$0700,PALETTE          ; rouge
```

**Commenter le pourquoi, pas le quoi** : `ADDQ.L #4,A0 ; passe à l'élément suivant (4 octets)`
est utile, `ADDQ.L #4,A0 ; ajoute 4 à A0` ne l'est pas. Chaque sous-programme commence par un
en-tête : ce qu'il fait, ce qu'il reçoit, ce qu'il rend, ce qu'il modifie.

```asm
; MULTIPLIE — D0.L = D0.W x D1.W (non signé)
; Entrée : D0.W, D1.W     Sortie : D0.L     Modifie : D0 seulement
MULTIPLIE:
        MULU    D1,D0
        RTS
```

## 2. Utilisation rigoureuse des registres

**Registres de données (D0-D7)** — 32 bits, accessibles par tranche :

| Accès | Portée |
|---|---|
| `.B` | 8 bits de poids faible |
| `.W` | 16 bits de poids faible |
| `.L` | 32 bits (registre entier) |

Une opération sur une tranche ne modifie que cette tranche : après `MOVE.L #$AAAAAAAA,D1` puis
`MOVE.W #$5678,D1`, D1 vaut `$AAAA5678`. Penser à **effacer le registre** (`MOVEQ #0,D1`) avant d'y
charger un octet ou un mot qu'on utilisera ensuite en `.L` (comme indice, par exemple).

**Registres d'adresse (A0-A6)** — comportement différent, source d'erreurs fréquentes :

| | Registres de données (Dn) | Registres d'adresse (An) |
|---|---|---|
| Opération `.B` | autorisée | **interdite** (erreur d'assemblage) |
| Écriture `.W` | seul le mot faible change | **le registre entier**, avec **extension de signe** |
| Lecture `.W` | seul le mot faible est lu | seul le mot faible est lu |
| Flags | modifiés | **pas modifiés** (`MOVEA`, `ADDA`, `SUBA`) |

> **Piège classique** : `MOVEA.W #$8234,A0` donne `$FFFF8234`, pas `$00008234`. Une adresse comme
> `$8000` étendue par erreur en `$FFFF8000` pointe vers une zone totalement différente.

**Conventions d'usage** à fixer dès le début du programme et à respecter partout, par exemple :
D0 pour le résultat, D7 comme compteur de boucle, A0/A1 pour source et destination. Sur l'Amiga,
A6 contient la base de la bibliothèque appelée et D0-D1/A0-A1 sont détruits par tout appel système ;
sur l'Atari ST, D0-D2/A0-A2 sont détruits par le TOS.

## 3. Gestion rigoureuse de la pile

Voir aussi [pile-et-sous-programmes.md](pile-et-sous-programmes.md) pour les mécanismes de base.

1. **Ordre inversé et liste identique** — dépiler dans l'ordre strictement inverse de l'empilage ;
   avec `MOVEM`, écrire la même liste à l'entrée et à la sortie.
2. **Tailles identiques** — empiler un long et dépiler un mot décale le pointeur et corrompt toutes
   les lectures suivantes.
3. **Toute routine qui modifie un registre qu'elle n'annonce pas le sauvegarde** —
   `MOVEM.L D2-D7/A2-A6,-(SP)` à l'entrée, `MOVEM.L (SP)+,D2-D7/A2-A6` juste avant `RTS`.
4. **Nettoyer la pile après un appel = responsabilité de l'appelant** (`ADDQ.L #n,SP` après un `BSR`
   ou un `TRAP` qui a reçu des paramètres empilés).
5. **Une seule sortie** par routine si possible : un `RTS` au milieu d'une routine qui a sauvegardé
   des registres saute la restauration.

**Conséquence d'un déséquilibre** : si la pile n'est pas restaurée exactement, `RTS` lit une
adresse de retour erronée et saute n'importe où — plantage immédiat, ou pire, corruption silencieuse
qui ne se manifeste que bien plus tard. Le pas à pas du débogueur, en surveillant `A7`, le révèle.

## 4. Code relogeable : préférer le relatif au PC

Un programme TOS ou AmigaDOS est chargé à une adresse **inconnue à l'avance**. Le système corrige
les adresses absolues au chargement (table de relocation), mais un code entièrement relatif est
plus court, plus rapide et marche même recopié ailleurs en mémoire.

| | Relatif au PC | Absolu |
|---|---|---|
| Sauts | `BRA`, `BSR`, `Bcc`, `JMP x(PC)` | `JMP x`, `JSR x` |
| Accès aux données | `LEA x(PC),A0`, `MOVE.W x(PC),D0` | `LEA x,A0`, `MOVE.W x,D0` |
| Relocation | inutile | nécessaire |

Limite : le 68000 n'accepte **pas** de destination relative au PC (`MOVE.W D0,x(PC)` est
interdit) — pour écrire dans une variable, passer par un registre d'adresse :
`LEA x(PC),A0` puis `MOVE.W D0,(A0)`.

## 5. Protocole d'appel système

Pattern à respecter pour tout appel qui passe des paramètres par la pile (`TRAP` GEMDOS/BIOS/XBIOS
sur l'Atari ST) :

1. Empiler les paramètres **du dernier au premier** (l'ordre inverse de la documentation C).
2. Empiler le numéro de fonction **en dernier**, juste avant l'appel.
3. Déclencher l'appel (`TRAP #n`).
4. Nettoyer la pile au retour : `ADDQ.L` jusqu'à 8 octets, `LEA n(SP),SP` au-delà.
5. **Tester le résultat** (dans D0) : un nombre négatif est un code d'erreur.

Sur l'Amiga, l'appel se fait par `JSR décalage(A6)` avec les paramètres dans des registres précis ;
le résultat est dans D0, et **0 signifie souvent l'échec** (`OpenLibrary`, `AllocMem`, `Open`…) :
tester D0 avant de s'en servir.

## 6. Petites optimisations sûres

| Au lieu de | Écrire | Pourquoi |
|---|---|---|
| `MOVE.L #0,D0` | `MOVEQ #0,D0` | 2 octets au lieu de 6, plus rapide |
| `ADD.L #4,A0` | `ADDQ.L #4,A0` | `ADDQ`/`SUBQ` pour 1 à 8 |
| `MULU #4,D0` | `LSL.L #2,D0` (ou `ADD.L D0,D0` deux fois) | multiplier par une puissance de 2 |
| `CMP.W #0,D0` | `TST.W D0` | plus court ; et souvent inutile, car `MOVE` positionne déjà N et Z |
| `SUBQ.W #1,D7` + `BNE` | `DBRA D7,boucle` | une instruction ; compter de *n*−1 jusqu'à −1 |
| `LEA x,A0` | `LEA x(PC),A0` | relatif, sans relocation |

> **D'abord juste, ensuite rapide** : une optimisation qui rend le code obscur doit être commentée,
> et ne se justifie que dans une boucle exécutée des milliers de fois.

## 7. Toujours rendre la main proprement

- Terminer un programme par l'appel prévu par le système : `Pterm0` (GEMDOS) sur l'Atari ST, `RTS`
  avec un **code de retour dans D0** (0 = tout va bien) sur l'Amiga.
- Rendre tout ce qu'on a pris : mémoire allouée, fichiers ouverts, bibliothèques ouvertes, vecteurs
  détournés, registres matériels modifiés (palette, interruptions, DMA de l'Amiga).
- Sauvegarder l'état d'origine **avant** de le modifier, et le restaurer dans l'ordre inverse.

> Fiche complétée et corrigée le 21/10/2026 (Claude) : constantes, en-têtes, code relogeable,
> optimisations sûres, sortie propre — à relire.
