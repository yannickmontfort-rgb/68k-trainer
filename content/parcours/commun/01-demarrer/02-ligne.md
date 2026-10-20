## Les quatre champs d'une ligne

Une ligne d'assembleur 68000 se lit de gauche à droite, en quatre champs séparés par des espaces
ou des tabulations :

```asm
BOUCLE: ADD.W   D1,D0       ; ajoute D1 à D0
```

| Champ | Ici | Rôle |
|---|---|---|
| **Étiquette** | `BOUCLE:` | Un nom pour l'adresse de cette ligne. Elle commence en **première colonne**. Le `:` est facultatif sous Devpac, mais il aide à la lecture. |
| **Mnémonique** | `ADD.W` | L'instruction, suivie de sa **taille** : `.B` (octet, 8 bits), `.W` (mot, 16 bits) ou `.L` (mot long, 32 bits). Sans taille, c'est `.W`. |
| **Opérandes** | `D1,D0` | Les données de l'instruction : la **source**, puis la **destination**. `ADD.W D1,D0` signifie « D0 ← D0 + D1 ». |
| **Commentaire** | `; ajoute…` | Tout ce qui suit `;` est ignoré par l'assembleur. Une ligne qui commence par `*` est aussi un commentaire. |

Une instruction ne commence **jamais** en première colonne (sinon l'assembleur la prendrait pour
une étiquette) : on la décale toujours d'au moins un espace.

## Écrire des nombres

| Écriture | Base | Exemple |
|---|---|---|
| `42` | décimal | quarante-deux |
| `$2A` | hexadécimal | le même nombre |
| `%101010` | binaire | encore le même |

Le **`#`** veut dire « cette valeur elle-même » (valeur **immédiate**). Sans `#`, le nombre est une
**adresse mémoire** :

```asm
    MOVE.W  #$2000,D0   ; D0 reçoit le nombre $2000
    MOVE.W  $2000,D0    ; D0 reçoit le mot rangé à l'adresse $2000
```

Oublier le `#` est l'une des erreurs les plus fréquentes : le programme s'assemble, mais il ne fait
pas du tout ce qu'on croit.

## Début et fin d'un programme

- Sous Devpac, un programme commence simplement à sa première ligne. Dans 68k Trainer, il est
  chargé à l'adresse `$1000`.
:::atari
- Il se termine par **`RTS`** (*ReTurn from Subroutine*) : le TOS a lancé ton programme comme un
  sous-programme, et `RTS` lui rend la main. Plus tard, on verra la fin « officielle » avec
  l'appel système `Pterm0`.
:::
:::amiga
- Il se termine par **`RTS`** (*ReTurn from Subroutine*) : le CLI (la fenêtre de commandes de
  l'Amiga) a lancé ton programme comme un sous-programme, et `RTS` lui rend la main. C'est la
  vraie fin d'un programme AmigaDOS : D0 contient alors son code de retour (0 = tout va bien).
:::
