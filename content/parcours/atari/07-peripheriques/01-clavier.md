## Attendre une touche : Cnecin

La fonction GEMDOS 8, `Cnecin`, attend qu'une touche soit tapée et la renvoie dans D0 sans
l'afficher, c'est-à-dire sans écho :

```asm
    MOVE.W  #8,-(SP)        ; Cnecin
    TRAP    #1
    ADDQ.L  #2,SP
```

D0 contient alors deux informations :

| Bits de D0 | Contenu |
|---|---|
| 7-0 (octet faible) | le code ASCII du caractère (`'a'` = `$61`, Échap = `$1B`, Entrée = `$0D`) |
| 23-16 | le **code clavier** (*scancode*), numéro physique de la touche |

Les touches qui ne produisent pas de caractère, comme les flèches, les touches de fonction, Help ou
Undo, ont un code ASCII nul, et seul leur code clavier permet de les reconnaître. Pour le tester, on
amène le mot fort dans le mot faible avec `SWAP D0`, puis on compare l'octet faible :

```asm
    CMP.B   #$1B,D0         ; Échap ? (code ASCII)
    BEQ     QUITTER
    SWAP    D0              ; le code clavier passe en bas
    CMP.B   #$50,D0         ; flèche bas ? (code clavier)
    BEQ     BAS
```

## Quelques codes clavier du ST

| Touche | Code | Touche | Code |
|---|---|---|---|
| Échap | `$01` | Espace | `$39` |
| Entrée (Return) | `$1C` | Flèche haut | `$48` |
| Retour arrière | `$0E` | Flèche bas | `$50` |
| Tab | `$0F` | Flèche gauche | `$4B` |
| F1 … F10 | `$3B` … `$44` | Flèche droite | `$4D` |

Le code clavier ne dépend pas de la langue du clavier : la touche à droite de Tab a toujours le code
`$10`, qu'elle porte un A en AZERTY ou un Q en QWERTY, alors que le code ASCII suit la disposition.

## Sans attendre

`Cnecin` bloque le programme jusqu'à la frappe. Un jeu veut plutôt savoir si une touche est en
attente : GEMDOS 11, `Cconis`, renvoie −1 dans D0 quand une touche attend et 0 sinon, et l'on
n'appelle `Cnecin` que dans le premier cas.

## Dans 68k Trainer

Dans les exercices, l'exercice tape lui-même des touches prévues à l'avance. Dans le bac à sable,
un clic sur l'écran du ST lui donne ton clavier, comme sur un vrai ST.
