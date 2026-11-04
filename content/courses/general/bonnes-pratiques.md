---
title: "Bonnes pratiques de programmation en assembleur 68000"
source: "Manuel des Bonnes Pratiques de Programmation en Assembleur 68000 (fourni par Yannick, 2026-08). Complétée et corrigée le 21/10/2026."
themes: ["style", "conventions"]
---

# Bonnes pratiques de programmation en assembleur 68000

L'assembleur n'offre aucun des garde-fous d'un langage de haut niveau, si bien que la rigueur dans
la présentation et les conventions n'est pas une affaire de goût : c'est elle qui évite les erreurs
coûteuses et garde un programme maintenable.

## 1. Organisation du code et nommage

On sépare clairement le code des données en sections :
- `SECTION TEXT` (ou `CODE`) pour les instructions ;
- `SECTION DATA` pour les données initialisées (`DC.B`/`DC.W`/`DC.L`), dont la valeur est connue à
  l'assemblage ;
- `SECTION BSS` pour les variables non initialisées (`DS.B`/`DS.W`/`DS.L`), dont l'espace est
  réservé en mémoire au chargement et rempli de zéros, sans prendre de place dans le fichier
  exécutable ;
- sur l'Amiga, on ajoute `_C` (`SECTION image,DATA_C`) pour ce que les puces doivent lire : listes
  Copper, bitplanes, sprites, sons (voir [la fiche Amiga](../amiga/systeme-et-hardware.md)).

La directive `EVEN` garantit que ce qui suit commence sur une adresse paire. Elle est indispensable
après une chaîne ou un `DC.B` de longueur impaire, avant toute donnée `.W`/`.L` ou toute
instruction, puisque le 68000 ne lit mots et longs qu'à des adresses paires.

Chaque ligne garde la même structure, avec des colonnes alignées par des tabulations :
```
Étiquette   Mnémonique.taille   source,destination   ; commentaire
```
L'étiquette commence en première colonne ou se termine par `:`. Une instruction ne commence jamais
en première colonne, sinon l'assembleur la prend pour une étiquette.

Les noms explicites, `DEBUT_IMAGE`, `NOUVELLE_PALETTE`, `FIN_JEU` plutôt que `X`, `Y`, `AX1`,
documentent déjà le programme. On choisit une langue, français ou anglais, et on s'y tient
partout. Les étiquettes locales (`.boucle`, rattachée à l'étiquette globale précédente) évitent
d'inventer `BOUCLE1`, `BOUCLE2`…

Les constantes se nomment avec `EQU` plutôt que de laisser des nombres magiques dans le code :

```asm
LARGEUR     EQU     320
HAUTEUR     EQU     200
PALETTE     EQU     $FFFF8240       ; couleur 0 de l'Atari ST

        MOVE.W  #LARGEUR*HAUTEUR/2-1,D7 ; l'assembleur calcule l'expression
        MOVE.W  #$0700,PALETTE          ; rouge
```

Un commentaire dit le pourquoi, pas le quoi : `ADDQ.L #4,A0 ; passe à l'élément suivant (4 octets)`
aide le lecteur, `ADDQ.L #4,A0 ; ajoute 4 à A0` ne lui apprend rien. Chaque sous-programme commence
par un en-tête qui dit ce qu'il fait, ce qu'il reçoit, ce qu'il rend et ce qu'il modifie.

```asm
; MULTIPLIE — D0.L = D0.W x D1.W (non signé)
; Entrée : D0.W, D1.W     Sortie : D0.L     Modifie : D0 seulement
MULTIPLIE:
        MULU    D1,D0
        RTS
```

## 2. Utilisation rigoureuse des registres

Les registres de données (D0-D7) font 32 bits et s'utilisent par tranche :

| Accès | Portée |
|---|---|
| `.B` | 8 bits de poids faible |
| `.W` | 16 bits de poids faible |
| `.L` | 32 bits (registre entier) |

Une opération sur une tranche ne modifie que cette tranche : après `MOVE.L #$AAAAAAAA,D1` puis
`MOVE.W #$5678,D1`, D1 vaut `$AAAA5678`. Avant d'y charger un octet ou un mot qu'on utilisera
ensuite en `.L`, comme indice par exemple, on efface donc le registre avec `MOVEQ #0,D1`.

Les registres d'adresse (A0-A6) se comportent autrement, ce qui est une source d'erreurs
fréquente :

| | Registres de données (Dn) | Registres d'adresse (An) |
|---|---|---|
| Opération `.B` | autorisée | **interdite** (erreur d'assemblage) |
| Écriture `.W` | seul le mot faible change | **le registre entier**, avec **extension de signe** |
| Lecture `.W` | seul le mot faible est lu | seul le mot faible est lu |
| Flags | modifiés | **pas modifiés** (`MOVEA`, `ADDA`, `SUBA`) |

Le piège classique : `MOVEA.W #$8234,A0` donne `$FFFF8234`, et non `$00008234`. Une adresse comme
`$8000` étendue par erreur en `$FFFF8000` pointe vers une tout autre zone.

On fixe dès le début du programme des conventions d'usage qu'on respecte partout, par exemple D0
pour le résultat, D7 comme compteur de boucle, A0/A1 pour la source et la destination. Sur l'Amiga,
A6 contient la base de la bibliothèque appelée et tout appel système détruit D0-D1/A0-A1 ; sur
l'Atari ST, le TOS détruit D0-D2/A0-A2.

## 3. Gestion rigoureuse de la pile

Les mécanismes de base sont dans [pile-et-sous-programmes.md](pile-et-sous-programmes.md).

1. On dépile dans l'ordre strictement inverse de l'empilage et, avec `MOVEM`, on écrit la même
   liste à l'entrée et à la sortie.
2. On dépile avec la taille qu'on a empilée : empiler un long et dépiler un mot décale le pointeur
   et fausse toutes les lectures suivantes.
3. Toute routine qui modifie un registre qu'elle n'annonce pas le sauvegarde, avec
   `MOVEM.L D2-D7/A2-A6,-(SP)` à l'entrée et `MOVEM.L (SP)+,D2-D7/A2-A6` juste avant `RTS`.
4. Nettoyer la pile après un appel revient à l'appelant (`ADDQ.L #n,SP` après un `BSR` ou un `TRAP`
   qui a reçu des paramètres empilés).
5. Une routine n'a si possible qu'une seule sortie, car un `RTS` au milieu d'une routine qui a
   sauvegardé des registres saute leur restauration.

Si la pile n'est pas restaurée exactement, `RTS` lit une adresse de retour erronée et saute
n'importe où : le programme plante aussitôt ou, pire, corrompt des données sans bruit, et l'erreur
ne se manifeste que bien plus tard. Le pas à pas du débogueur le révèle si on surveille `A7`.

## 4. Code relogeable : préférer le relatif au PC

Un programme TOS ou AmigaDOS est chargé à une adresse qu'on ne connaît pas à l'avance. Le système
corrige les adresses absolues au chargement grâce à une table de relocation, mais un code
entièrement relatif est plus court, plus rapide et marche même recopié ailleurs en mémoire.

| | Relatif au PC | Absolu |
|---|---|---|
| Sauts | `BRA`, `BSR`, `Bcc`, `JMP x(PC)` | `JMP x`, `JSR x` |
| Accès aux données | `LEA x(PC),A0`, `MOVE.W x(PC),D0` | `LEA x,A0`, `MOVE.W x,D0` |
| Relocation | inutile | nécessaire |

Le 68000 n'accepte pas de destination relative au PC (`MOVE.W D0,x(PC)` est interdit) : pour
écrire dans une variable, on passe par un registre d'adresse, `LEA x(PC),A0` puis
`MOVE.W D0,(A0)`.

## 5. Protocole d'appel système

Tout appel qui passe ses paramètres par la pile, comme les `TRAP` GEMDOS/BIOS/XBIOS de l'Atari ST,
suit les mêmes étapes :

1. empiler les paramètres du dernier au premier, dans l'ordre inverse de la documentation C ;
2. empiler le numéro de fonction en dernier, juste avant l'appel ;
3. déclencher l'appel (`TRAP #n`) ;
4. nettoyer la pile au retour, avec `ADDQ.L` jusqu'à 8 octets et `LEA n(SP),SP` au-delà ;
5. **tester le résultat** dans D0, où un nombre négatif est un code d'erreur.

Sur l'Amiga, l'appel se fait par `JSR décalage(A6)` avec les paramètres dans des registres précis.
Le résultat revient dans D0, où 0 signifie souvent l'échec (`OpenLibrary`, `AllocMem`, `Open`…), et
on teste donc D0 avant de s'en servir.

## 6. Petites optimisations sûres

| Au lieu de | Écrire | Pourquoi |
|---|---|---|
| `MOVE.L #0,D0` | `MOVEQ #0,D0` | 2 octets au lieu de 6, plus rapide |
| `ADD.L #4,A0` | `ADDQ.L #4,A0` | `ADDQ`/`SUBQ` pour 1 à 8 |
| `MULU #4,D0` | `LSL.L #2,D0` (ou `ADD.L D0,D0` deux fois) | multiplier par une puissance de 2, si le mot haut de D0 est nul (MULU ne lit que le mot bas) |
| `CMP.W #0,D0` | `TST.W D0` | plus court ; et souvent inutile, car `MOVE` positionne déjà N et Z |
| `SUBQ.W #1,D7` + `BNE` | `DBRA D7,boucle` | une instruction ; compter de *n*−1 jusqu'à −1 |
| `LEA x,A0` | `LEA x(PC),A0` | relatif, sans relocation |

Le code doit d'abord être juste, ensuite rapide. Une optimisation qui le rend obscur se commente, et
ne se justifie que dans une boucle exécutée des milliers de fois.

## 7. Toujours rendre la main proprement

On termine un programme par l'appel que prévoit le système : `Pterm0` (GEMDOS) sur l'Atari ST, et
sur l'Amiga `RTS` avec un code de retour dans D0, 0 quand tout va bien. Avant de partir, on rend
tout ce qu'on a pris, mémoire allouée, fichiers et bibliothèques ouverts, vecteurs détournés,
registres matériels modifiés (palette, interruptions, DMA de l'Amiga). Pour cela, on sauvegarde
l'état d'origine avant de le modifier, puis on le restaure dans l'ordre inverse.

> Fiche complétée et corrigée le 21/10/2026 (Claude) : constantes, en-têtes, code relogeable,
> optimisations sûres, sortie propre.
