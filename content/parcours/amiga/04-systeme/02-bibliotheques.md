## Ouvrir une bibliothèque

Seule la base d'exec est connue d'avance : pour les autres bibliothèques, on demande à exec de les
ouvrir.

```asm
    MOVEA.L 4.W,A6          ; exec
    LEA     dosnom(PC),A1   ; A1 = le nom de la bibliothèque
    MOVEQ   #0,D0           ; D0 = la version minimale acceptée (0 : n'importe laquelle)
    JSR     -552(A6)        ; OpenLibrary : D0 = la base de dos.library, ou 0
    TST.L   D0
    BEQ     erreur
    MOVE.L  D0,dosbase
    ; ...
dosnom: DC.B    'dos.library',0
```

Le nom s'écrit en minuscules, avec son `.library` et un 0 final. Si la bibliothèque n'existe pas,
ou si sa version est trop ancienne, `OpenLibrary` renvoie 0, et c'est pourquoi on **teste
toujours D0** : un programme qui ne le ferait pas sauterait ensuite à l'adresse −60, quelque part en
haut de la mémoire, et planterait.

## Les numéros de version

Le deuxième paramètre est la version minimale dont ton programme a besoin :

| Version | Kickstart | Machines |
|---|---|---|
| 33 | 1.2 | A500, A2000 des débuts |
| 34 | 1.3 | la plupart des A500 |
| 36, 37 | 2.0, 2.04 | A500+, A600, A3000 |
| 39, 40 | 3.0, 3.1 | A1200, A4000 |

Beaucoup d'exemples trouvés sur Internet demandent la version 36 ou plus, qu'un Kickstart 1.3
refuse : `OpenLibrary` renvoie alors 0. Pour un A500, demande 0, 33 ou 34.

## Fermer ce qu'on a ouvert

Exec compte les ouvertures de chaque bibliothèque. Avant de quitter, on rend donc chacune avec
`CloseLibrary` (exec, −414), la base dans A1 :

```asm
    MOVEA.L dosbase,A1
    MOVEA.L 4.W,A6
    JSR     -414(A6)        ; CloseLibrary(dosbase)
```

## Écrire dans la fenêtre du CLI

Ton programme est lancé depuis le CLI (ou le *Shell*), la fenêtre de commandes, et dos.library
fournit deux fonctions pour y écrire. `Output()` (−60) renvoie dans D0 la poignée (*file handle*)
de cette fenêtre, et `Write(poignée, tampon, longueur)(D1, D2, D3)` (−48) y écrit `longueur`
octets à partir de l'adresse `tampon`, puis renvoie dans D0 le nombre d'octets écrits, ou −1 en cas
d'erreur.

```asm
    MOVEA.L dosbase,A6
    JSR     -60(A6)         ; Output() : D0 = la poignée
    MOVE.L  D0,D1           ; D1 = la poignée
    MOVE.L  #texte,D2       ; D2 = l'adresse du texte
    MOVEQ   #fin-texte,D3   ; D3 = sa longueur, calculée par l'assembleur
    JSR     -48(A6)         ; Write
    ; ...
texte:  DC.B    'Bonjour !',10
fin:
```

Le texte n'a pas besoin d'un 0 final, puisqu'on donne sa longueur, et une fin de ligne s'écrit avec
un seul caractère, 10 (*line feed*).

Pour lire ce que l'utilisateur tape, `Input()` (−54) donne la poignée du clavier du CLI, et
`Read(poignée, tampon, longueur)(D1, D2, D3)` (−42) attend une ligne complète, terminée par la
touche Entrée, puis renvoie dans D0 le nombre de caractères lus, le 10 final compris.
