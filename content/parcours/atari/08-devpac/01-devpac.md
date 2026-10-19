## Devpac, l'atelier des codeurs du ST

Sur un vrai ST (ou dans l'émulateur **Hatari**), l'outil de référence est **Devpac 2** de HiSoft :

- **GENST**, l'éditeur et l'assembleur : on écrit, on assemble (Alt+A), et on choisit dans les
  options de produire un fichier **.PRG** sur disquette ;
- **MONST**, le débogueur : pas à pas (Ctrl+Z), points d'arrêt, fenêtres des registres (Alt+1), du
  désassemblage (Alt+2) et de la mémoire (Alt+3). Le débogueur de 68k Trainer en reprend l'idée.

L'assembleur de 68k Trainer suit les mêmes règles que Devpac (il est vérifié octet par octet contre
l'assembleur vasm en mode Devpac) : ce que tu écris ici s'assemble là-bas.

## Les sections

Un programme TOS est rangé en **trois sections** :

| Section | Contenu | Dans le fichier .PRG ? |
|---|---|---|
| `SECTION TEXT` | le code | oui |
| `SECTION DATA` | les données initialisées (`DC.B`, `DC.W`, `DC.L`, `INCBIN`) | oui |
| `SECTION BSS` | les réservations (`DS.B`, `DS.W`, `DS.L`) | **non** : seule leur taille est notée |

Au chargement, le TOS place les trois sections bout à bout en mémoire et **remplit la BSS de
zéros**. Un tampon de 64 Ko en BSS ne coûte donc rien sur la disquette : c'est là qu'on met les
écrans de travail, les tables calculées au démarrage, les variables.

On peut alterner les sections autant qu'on veut : l'assembleur regroupe tout ce qui appartient à
la même section.

## Constantes et structures

- **`EQU`** donne un nom à une valeur : `LARGEUR EQU 320`. Le programme devient lisible, et la
  valeur ne s'écrit qu'à un seul endroit.
- **`RS`** (*reserve structure*) calcule des décalages sans rien réserver : chaque `RS.W 1` avance
  un compteur de 2, `RS.B 1` de 1, et l'étiquette prend la valeur du compteur **avant** d'avancer.
  `RSRESET` le remet à 0. Idéal pour décrire les champs d'un objet, utilisés ensuite comme
  déplacements : `MOVE.W POS_X(A0),D0`.

## Macros

Une **macro** est un morceau de code nommé, recopié à chaque utilisation. Les paramètres
s'appellent `\1`, `\2`… :

```
AFFICHE MACRO
    PEA     \1
    MOVE.W  #9,-(SP)        ; Cconws
    TRAP    #1
    ADDQ.L  #6,SP
    ENDM

    AFFICHE BONJOUR         ; devient les 4 lignes, avec BONJOUR à la place de \1
```

Une macro doit être **définie avant** sa première utilisation. Contrairement à un sous-programme,
elle ne coûte ni `BSR` ni `RTS`, mais chaque utilisation **recopie** son code.

## Inclure des fichiers

- **`INCLUDE "fichier.s"`** insère un autre source à cet endroit (des macros, des constantes).
- **`INCBIN "image.pi1"`** insère un fichier **binaire** tel quel : une image, une musique, une
  police de caractères.

Une image **Degas** basse résolution (`.PI1`) fait 32 034 octets : un mot de résolution (0), les
**16 couleurs** de sa palette (32 octets), puis les **32 000 octets** de l'écran. Pour l'afficher :
`Setpalette` sur IMAGE+2, puis copier IMAGE+34 vers l'écran.

Dans 68k Trainer, INCLUDE et INCBIN lisent le dossier des fichiers fournis avec l'application
(on y trouve `LOGO.PI1`).
