---
title: "Démarrage de programme, inclusions, macros et tableaux"
source: "cours_asm_68000.pdf — Le Féroce Lapin, Volume 2, cours 3 à 5 (adapté) ; manuel de Devpac. Complétée et corrigée le 21/10/2026."
themes: ["outillage", "tableaux", "demarrage"]
---

# Démarrage de programme, inclusions, macros et tableaux

## Le fichier .PRG et la page de base

Un programme TOS (`.PRG`, `.TOS`, `.TTP`) est un fichier en trois sections :

- **TEXT** — le code ;
- **DATA** — les données initialisées (`DC.x`) ;
- **BSS** — les variables à zéro (`DS.x`), qui ne prennent pas de place dans le fichier.

Le fichier contient aussi une **table de relocation** : le TOS charge le programme à une adresse
inconnue à l'avance et corrige lui-même toutes les adresses absolues (`MOVE.L #TABLE,A0`,
`DC.L ROUTINE`…).

Au lancement, le TOS place juste devant le programme une **page de base** de 256 octets, dont
l'adresse est sur la pile : `4(SP)` à la première instruction.

| Offset | Contenu |
|---|---|
| `$00` | début de la zone mémoire du programme |
| `$04` | fin de cette zone |
| `$08` | adresse de la section TEXT |
| `$0C` | taille de la section TEXT |
| `$10` | adresse de la section DATA |
| `$14` | taille de la section DATA |
| `$18` | adresse de la section BSS |
| `$1C` | taille de la section BSS |
| `$24` | page de base du programme parent |
| `$2C` | adresse de l'environnement |
| `$80` | ligne de commande (un octet de longueur, puis le texte) |

## La routine de démarrage

Au lancement, un programme TOS reçoit **toute la mémoire libre**. S'il veut appeler `Malloc` ou
lancer un autre programme (`Pexec`), il doit d'abord rendre ce qu'il n'utilise pas, avec `Mshrink`
(GEMDOS 74) : taille = 256 (page de base) + TEXT + DATA + BSS. Il installe aussi sa propre pile,
réservée dans sa section BSS.

```asm
        SECTION TEXT
DEBUT:  MOVEA.L 4(SP),A5        ; A5 = page de base
        MOVE.L  $0C(A5),D0      ; taille TEXT
        ADD.L   $14(A5),D0      ; + taille DATA
        ADD.L   $1C(A5),D0      ; + taille BSS
        ADD.L   #$100,D0        ; + la page de base elle-même
        LEA     PILE,SP         ; notre pile (voir la section BSS)
        MOVE.L  D0,-(SP)        ; nouvelle taille
        MOVE.L  A5,-(SP)        ; début du bloc = la page de base
        CLR.W   -(SP)           ; paramètre réservé, toujours 0
        MOVE.W  #74,-(SP)       ; Mshrink
        TRAP    #1
        LEA     12(SP),SP

        ; ... le programme ...

        CLR.W   -(SP)           ; Pterm0
        TRAP    #1

        SECTION BSS
        DS.L    256             ; 1 Ko de pile
PILE:                           ; l'étiquette APRÈS la réservation
```

> **La pile se remplit vers le bas** (`-(SP)`) : l'étiquette `PILE` doit donc être placée **après**
> la réservation, pas avant. Une pile trop petite ne plante pas forcément tout de suite : elle
> écrase silencieusement ce qui se trouve juste avant elle en mémoire. Compter les octets empilés
> par les `BSR`, `MOVEM` et `TRAP` imbriqués, et garder de la marge.

> `LEA PILE,SP` (ou `MOVE.L #PILE,SP`) met dans SP **l'adresse** de la pile. `MOVE.L PILE,SP`, sans
> `#`, y mettrait le **contenu** des 4 octets situés à `PILE` — une erreur classique.

Un programme simple qui n'appelle ni `Malloc` ni `Pexec` peut se passer de `Mshrink`.

> Le simulateur de 68k Trainer ne gère pas `Mshrink` (ni `Malloc`, ni `Pexec`) : cette routine de
> démarrage s'essaie avec le bouton **« Essayer dans Hatari »**.

## Inclusions : `INCLUDE` et `INCBIN`

Deux directives d'assembleur (pas des instructions 68000) pour garder les sources gérables :

- **`INCBIN "fichier"`** — incorpore un fichier binaire tel quel (image, son, sprites, police) à
  l'endroit de la directive.
- **`INCLUDE "fichier.s"`** — incorpore un fichier source, comme un copier-coller à l'assemblage.
  Permet de constituer une **bibliothèque personnelle** de routines réutilisables (sauvegarde de
  palette, routine de démarrage, etc.) sans les retaper dans chaque programme.

```asm
        INCLUDE "macros.s"      ; définitions partagées
        SECTION DATA
IMAGE:  INCBIN  "photo.pi1"     ; Degas : résolution (2 octets), palette (32), écran (32 000)
        EVEN
```

> Dans le bac à sable de 68k Trainer, ces fichiers sont cherchés d'abord **à côté du source
> ouvert**, puis dans les fichiers fournis avec les cours.

> Attention à la distinction adresse/contenu : `IMAGE INCBIN "photo.pi1"` place les octets de
> l'image à l'adresse `IMAGE`, alors que `PTN_IMAGE DC.L IMAGE` place à l'adresse `PTN_IMAGE` un
> **pointeur** vers `IMAGE` — bien distinguer « la donnée » de « l'adresse de la donnée ».

## Macros

Une macro remplace plusieurs lignes répétitives par une seule ligne « maison », développée par
l'assembleur au moment de l'assemblage. Elle n'existe pas pour le processeur : contrairement à un
sous-programme, il n'y a ni `BSR` ni `RTS`, juste du texte recopié à chaque utilisation.

Syntaxe de Devpac (et de l'assembleur de 68k Trainer) : le nom en première colonne devant `MACRO`,
les paramètres `\1` à `\9` dans le corps, `ENDM` à la fin.

```asm
PRINT   MACRO
        PEA     \1              ; \1 = premier paramètre
        MOVE.W  #9,-(SP)        ; Cconws
        TRAP    #1
        ADDQ.L  #6,SP
        ENDM

        PRINT   MESSAGE         ; remplacé par les 4 lignes, avec MESSAGE à la place de \1
```

- `\0` est remplacé par la **taille** écrite après le nom de la macro (`COPIE.L` → `L`).
- `\@` donne un nombre **différent à chaque utilisation** : indispensable pour une étiquette dans
  une macro utilisée plusieurs fois.
- Une macro peut en appeler une autre.

```asm
ATTENDS MACRO                   ; ATTENDS n : boucle d'attente de n tours
        MOVE.W  #\1-1,D0
.att\@  DBRA    D0,.att\@       ; une étiquette unique par utilisation
        ENDM

        ATTENDS 100
        ATTENDS 200             ; pas de conflit : les étiquettes sont .att1 et .att2 (par exemple)
```

> Revers de la médaille : à trop en abuser, on ne voit plus ce que le processeur exécute vraiment, et
> le programme grossit (le corps est recopié à chaque fois). À réserver aux séquences vraiment
> répétitives, comme les appels système.

**Assemblage conditionnel** — `IFEQ`/`IFNE`/`IFD`… `ELSE` … `ENDC` n'assemblent un bloc que si une
condition est vraie (version de démonstration, options de débogage) :

```asm
DEBUG   EQU     1
        IFNE    DEBUG           ; assemblé seulement si DEBUG <> 0
        MOVE.W  #$0070,$FFFF8240 ; fond vert pendant la mise au point
        ENDC
```

## Tableaux : adressage indexé

L'adressage indexé avec déplacement (`d8(An,Dn.taille)`) sert à parcourir un tableau : `An` pointe le
début du tableau, `Dn` sert d'indice, `d` est un décalage fixe optionnel (−128 à 127).

```asm
        LEA     TABLEAU,A0
        ; D0.W contient l'indice (0, 1, 2, ...)
        ADD.W   D0,D0           ; x 2 : un mot = 2 octets (plus rapide que MULU #2,D0)
        MOVE.W  0(A0,D0.W),D1   ; D1 = le D0-ième mot du tableau
```

> **Le déplacement compte toujours en octets**, quelle que soit la taille des éléments — d'où la
> multiplication de l'indice par 2 (mot) ou 4 (long, `LSL.W #2,D0`). L'oublier est une erreur
> classique : le programme « marche » par accident sur les indices pairs, puis plante en **erreur
> d'adresse** (3 bombes) sur les indices impairs. Un tableau d'**octets** n'a pas ce problème.

**Table de sauts** (*jump table*) — un tableau d'adresses de routines, pour remplacer une longue
cascade de comparaisons par un simple indice :

```asm
        LEA     ROUTINES,A0
        LSL.W   #2,D0           ; D0 = indice x 4 (une adresse = un long)
        MOVEA.L 0(A0,D0.W),A0
        JSR     (A0)            ; saute à la routine choisie

ROUTINES:
        DC.L    TOUT_VERT
        DC.L    TOUT_BLEU
        DC.L    QUITTER
```

Variante relogeable, sans adresses absolues : une table de **déplacements** (mots) depuis le début
de la table.

```asm
        ADD.W   D0,D0           ; indice x 2
        MOVE.W  SAUTS(PC,D0.W),D0
        JMP     SAUTS(PC,D0.W)  ; saute à SAUTS + déplacement lu

SAUTS:  DC.W    TOUT_VERT-SAUTS
        DC.W    TOUT_BLEU-SAUTS
        DC.W    QUITTER-SAUTS
```

**Recherche dans une liste** terminée par une valeur sentinelle (`$FFFF`), en parallèle d'une liste
de routines :

```asm
        LEA     TAB_CODE,A0
        LEA     TAB_ROUTINE,A1
.ici    MOVE.W  (A0)+,D0
        CMP.W   #$FFFF,D0
        BEQ     INCONNU         ; fin de liste : code non reconnu
        MOVEA.L (A1)+,A2
        CMP.W   D0,D7           ; D7 = code recherché
        BNE     .ici
        JSR     (A2)
```

> **Étiquette locale** : une étiquette commençant par un point (`.ici`) est rattachée à l'étiquette
> globale précédente — on peut réutiliser `.ici` dans plusieurs routines sans collision de noms.

**Tableau à deux dimensions** — une image de 320 × 200 en octets : l'élément (x, y) est à
`y × 320 + x`. On évite la multiplication par une **table précalculée** des débuts de ligne :

```asm
        ADD.W   D1,D1           ; y x 2 (table de mots)
        MOVE.W  LIGNES(PC,D1.W),D1 ; D1 = y x 320, lu dans la table
        ADD.W   D0,D1           ; + x
        MOVE.B  0(A0,D1.W),D2   ; l'octet (x, y)
        RTS

LIGNES:
Y       SET     0
        REPT    200
        DC.W    Y*320
Y       SET     Y+1
        ENDR
```

`REPT n` … `ENDR` répète un bloc à l'assemblage ; `SET` (contrairement à `EQU`) permet de redéfinir
un symbole à chaque tour.

> Fiche complétée et corrigée le 21/10/2026 (Claude) : `MOVE.L PILE,A7` remplacé par `LEA PILE,SP`,
> macros selon la syntaxe Devpac, `\@`, assemblage conditionnel, table de sauts relogeable,
> tableaux 2D — à relire.
