## Devpac, l'atelier des codeurs du ST

Sur un vrai ST, ou dans l'émulateur Hatari, l'outil de référence est Devpac 2, de HiSoft. Son
éditeur et assembleur, GENST, assemble le source avec Alt+A et produit, si on le choisit dans les
options, un fichier .PRG sur disquette. Son débogueur, MONST, offre le pas à pas (Ctrl+Z), les
points d'arrêt et des fenêtres pour les registres (Alt+1), le désassemblage (Alt+2) et la mémoire
(Alt+3) ; le débogueur de 68k Trainer en reprend l'idée.

L'assembleur de 68k Trainer suit les règles de Devpac, et il est vérifié octet par octet contre
l'assembleur vasm en mode Devpac : ce que tu écris ici s'assemble là-bas.

## Les sections

Un programme TOS est rangé en trois **sections** :

| Section | Contenu | Dans le fichier .PRG ? |
|---|---|---|
| `SECTION TEXT` | le code | oui |
| `SECTION DATA` | les données initialisées (`DC.B`, `DC.W`, `DC.L`, `INCBIN`) | oui |
| `SECTION BSS` | les réservations (`DS.B`, `DS.W`, `DS.L`) | non : seule leur taille est notée |

Au chargement, le TOS place les trois sections bout à bout en mémoire et remplit la BSS de zéros.
Un tampon de 64 Ko en BSS ne coûte donc rien sur la disquette, et c'est là qu'on range les écrans
de travail, les tables calculées au démarrage et les variables. On peut alterner les sections autant
qu'on veut, l'assembleur regroupe tout ce qui appartient à la même.

## Constantes et structures

`EQU` donne un nom à une valeur, comme `LARGEUR EQU 320` : le programme devient lisible, et la
valeur ne s'écrit qu'à un seul endroit.

`RS` (*reserve structure*) calcule des décalages sans rien réserver. Chaque `RS.W 1` avance un
compteur de 2, chaque `RS.B 1` de 1, et l'étiquette prend la valeur du compteur avant qu'il
avance ; `RSRESET` le remet à 0. On décrit ainsi les champs d'un objet, utilisés ensuite comme
déplacements : `MOVE.W POS_X(A0),D0`.

## Macros

Une **macro** est un morceau de code nommé, recopié à chaque utilisation, dont les paramètres
s'appellent `\1`, `\2`, et ainsi de suite :

```asm
AFFICHE MACRO
    PEA     \1
    MOVE.W  #9,-(SP)        ; Cconws
    TRAP    #1
    ADDQ.L  #6,SP
    ENDM

    AFFICHE BONJOUR         ; devient les 4 lignes, avec BONJOUR à la place de \1
```

Une macro est définie avant sa première utilisation. Contrairement à un sous-programme, elle ne
coûte ni `BSR` ni `RTS`, mais chaque utilisation recopie son code.

## Inclure des fichiers

`INCLUDE "fichier.s"` insère un autre source à cet endroit, des macros ou des constantes par
exemple, et `INCBIN "image.pi1"` insère tel quel un fichier binaire : une image, une musique, une
police de caractères.

Une image Degas basse résolution (`.PI1`) fait 32 034 octets : un mot de résolution (0), les 16
couleurs de sa palette (32 octets), puis les 32 000 octets de l'écran. Pour l'afficher, on appelle
`Setpalette` sur IMAGE+2, puis on copie IMAGE+34 vers l'écran.

Dans 68k Trainer, INCLUDE et INCBIN lisent le dossier des fichiers fournis avec l'application, où
se trouve `LOGO.PI1`.
