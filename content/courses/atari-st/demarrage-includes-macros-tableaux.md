---
title: "Démarrage de programme, inclusions, macros et tableaux"
source: "cours_asm_68000.pdf — Le Féroce Lapin, Volume 2, cours 3 à 5 (adapté) ; manuel de Devpac. Complétée et corrigée le 21/10/2026."
themes: ["outillage", "tableaux", "demarrage"]
---

# Démarrage de programme, inclusions, macros et tableaux

## Le fichier .PRG et la page de base

Un programme TOS (`.PRG`, `.TOS`, `.TTP`) est un fichier en trois sections :

- TEXT, le code ;
- DATA, les données initialisées (`DC.x`) ;
- BSS, les variables à zéro (`DS.x`), qui ne prennent pas de place dans le fichier.

Comme le TOS charge le programme à une adresse qu'on ne connaît pas à l'avance, le fichier contient
aussi une **table de relocation**, grâce à laquelle le TOS corrige lui-même toutes les adresses
absolues (`MOVE.L #TABLE,A0`, `DC.L ROUTINE`…).

Au lancement, le TOS place juste devant le programme une **page de base** de 256 octets, dont il
laisse l'adresse sur la pile, en `4(SP)` à la première instruction.

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

Un programme TOS reçoit au lancement toute la mémoire libre. S'il veut appeler `Malloc` ou lancer
un autre programme avec `Pexec`, il doit d'abord rendre ce qu'il n'utilise pas, avec `Mshrink`
(GEMDOS 74), en gardant 256 octets pour la page de base plus la taille de TEXT, DATA et BSS. Il
installe aussi sa propre pile, réservée dans sa section BSS.

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

La pile se remplit vers le bas (`-(SP)`), et l'étiquette `PILE` se place donc **après** la
réservation. Une pile trop petite ne plante pas forcément tout de suite : elle écrase en silence ce
qui se trouve juste avant elle en mémoire. Compte les octets empilés par les `BSR`, `MOVEM` et
`TRAP` imbriqués, et garde de la marge.

`LEA PILE,SP`, ou `MOVE.L #PILE,SP`, met dans SP l'adresse de la pile, alors que `MOVE.L PILE,SP`,
sans `#`, y mettrait le contenu des 4 octets situés à `PILE`, une erreur classique.

Un programme simple qui n'appelle ni `Malloc` ni `Pexec` peut se passer de `Mshrink`.

> Le simulateur de 68k Trainer ne gère ni `Mshrink`, ni `Malloc`, ni `Pexec` : cette routine de
> démarrage s'essaie avec le bouton « Essayer dans Hatari ».

## Inclusions : `INCLUDE` et `INCBIN`

Ces deux directives d'assembleur, qui ne sont pas des instructions 68000, gardent les sources
gérables. `INCBIN "fichier"` incorpore tel quel un fichier binaire (image, son, sprites, police) à
l'endroit de la directive. `INCLUDE "fichier.s"` incorpore un fichier source, comme un
copier-coller à l'assemblage, ce qui permet de se constituer une bibliothèque personnelle de
routines (sauvegarde de palette, routine de démarrage…) sans les retaper dans chaque programme.

```asm
        INCLUDE "macros.s"      ; définitions partagées
        SECTION DATA
IMAGE:  INCBIN  "photo.pi1"     ; Degas : résolution (2 octets), palette (32), écran (32 000)
        EVEN
```

> Dans le bac à sable de 68k Trainer, ces fichiers sont cherchés d'abord à côté du source ouvert,
> puis dans les fichiers fournis avec les cours.

Garde en tête la distinction entre la donnée et son adresse : `IMAGE INCBIN "photo.pi1"` place les
octets de l'image à l'adresse `IMAGE`, alors que `PTN_IMAGE DC.L IMAGE` place à l'adresse
`PTN_IMAGE` un pointeur vers `IMAGE`.

## Macros

Une **macro** remplace plusieurs lignes répétitives par une seule ligne « maison », que
l'assembleur développe au moment de l'assemblage. Elle n'existe pas pour le processeur :
contrairement à un sous-programme, il n'y a ni `BSR` ni `RTS`, seulement du texte recopié à chaque
utilisation.

Dans la syntaxe de Devpac, que suit l'assembleur de 68k Trainer, le nom se place en première
colonne devant `MACRO`, le corps utilise les paramètres `\1` à `\9`, et `ENDM` termine la macro.

```asm
PRINT   MACRO
        PEA     \1              ; \1 = premier paramètre
        MOVE.W  #9,-(SP)        ; Cconws
        TRAP    #1
        ADDQ.L  #6,SP
        ENDM

        PRINT   MESSAGE         ; remplacé par les 4 lignes, avec MESSAGE à la place de \1
```

`\0` est remplacé par la taille écrite après le nom de la macro (`COPIE.L` donne `L`). `\@` donne un
nombre différent à chaque utilisation, ce qui est indispensable pour une étiquette dans une macro
utilisée plusieurs fois. Une macro peut aussi en appeler une autre.

```asm
ATTENDS MACRO                   ; ATTENDS n : boucle d'attente de n tours
        MOVE.W  #\1-1,D0
.att\@  DBRA    D0,.att\@       ; une étiquette unique par utilisation
        ENDM

        ATTENDS 100
        ATTENDS 200             ; pas de conflit : les étiquettes sont .att1 et .att2 (par exemple)
```

À trop abuser des macros, on ne voit plus ce que le processeur exécute vraiment, et le programme
grossit puisque le corps est recopié à chaque fois. On les réserve aux séquences vraiment
répétitives, comme les appels système.

L'**assemblage conditionnel**, avec `IFEQ`, `IFNE`, `IFD`… `ELSE` … `ENDC`, n'assemble un bloc que
si une condition est vraie, pour une version de démonstration ou des options de débogage :

```asm
DEBUG   EQU     1
        IFNE    DEBUG           ; assemblé seulement si DEBUG <> 0
        MOVE.W  #$0070,$FFFF8240 ; fond vert pendant la mise au point
        ENDC
```

## Tableaux : adressage indexé

L'adressage indexé avec déplacement, `d8(An,Dn.taille)`, sert à parcourir un tableau : `An` pointe
le début du tableau, `Dn` sert d'indice et `d` est un décalage fixe optionnel, de −128 à 127.

```asm
        LEA     TABLEAU,A0
        ; D0.W contient l'indice (0, 1, 2, ...)
        ADD.W   D0,D0           ; x 2 : un mot = 2 octets (plus rapide que MULU #2,D0)
        MOVE.W  0(A0,D0.W),D1   ; D1 = le D0-ième mot du tableau
```

Le déplacement **compte toujours en octets**, quelle que soit la taille des éléments, d'où la
multiplication de l'indice par 2 pour un mot ou par 4 pour un long (`LSL.W #2,D0`). L'oublier est
une erreur classique : le programme marche par accident sur les indices pairs, puis plante en
erreur d'adresse (3 bombes) sur les indices impairs. Un tableau d'octets n'a pas ce problème.

Une **table de sauts** (*jump table*) est un tableau d'adresses de routines, qui remplace une
longue cascade de comparaisons par un simple indice :

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

La variante relogeable se passe d'adresses absolues et range des déplacements, sur un mot, depuis
le début de la table :

```asm
        ADD.W   D0,D0           ; indice x 2
        MOVE.W  SAUTS(PC,D0.W),D0
        JMP     SAUTS(PC,D0.W)  ; saute à SAUTS + déplacement lu

SAUTS:  DC.W    TOUT_VERT-SAUTS
        DC.W    TOUT_BLEU-SAUTS
        DC.W    QUITTER-SAUTS
```

Pour chercher un code dans une liste terminée par une valeur sentinelle (`$FFFF`), on la parcourt
en parallèle d'une liste de routines :

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

Une étiquette qui commence par un point, comme `.ici`, est une étiquette locale, rattachée à
l'étiquette globale précédente : on peut donc réutiliser `.ici` dans plusieurs routines sans
collision de noms.

Dans un **tableau à deux dimensions**, comme une image de 320 × 200 en octets, l'élément (x, y) se
trouve à `y × 320 + x`. Une table précalculée des débuts de ligne évite la multiplication. Comme
199 × 320 dépasse 32 767, la table range des mots longs, et l'index se fait en `.L` : un index en
`.W` serait étendu en signe et donnerait une adresse fausse dès la ligne 103.

```asm
        ADD.W   D1,D1
        ADD.W   D1,D1           ; y x 4 (table de mots longs)
        MOVE.L  LIGNES(PC,D1.W),D1 ; D1 = y x 320, lu dans la table
        AND.L   #$FFFF,D0       ; x sur 32 bits
        ADD.L   D0,D1           ; + x
        MOVE.B  0(A0,D1.L),D2   ; l'octet (x, y)
        RTS

LIGNES:
Y       SET     0
        REPT    200
        DC.L    Y*320
Y       SET     Y+1
        ENDR
```

`REPT n` … `ENDR` répète un bloc à l'assemblage, et `SET`, contrairement à `EQU`, permet de
redéfinir un symbole à chaque tour.

> Fiche complétée et corrigée le 21/10/2026 (Claude) : `LEA PILE,SP` au lieu de `MOVE.L PILE,A7`,
> macros selon la syntaxe Devpac, `\@`, assemblage conditionnel, table de sauts relogeable,
> tableaux à deux dimensions.
