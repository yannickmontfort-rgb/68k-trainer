## Les quatre champs d'une ligne

Une ligne d'assembleur 68000 se lit de gauche à droite, en quatre champs séparés par des espaces ou
des tabulations.

```asm
BOUCLE: ADD.W   D1,D0       ; ajoute D1 à D0
```

| Champ | Ici | Rôle |
|---|---|---|
| étiquette | `BOUCLE:` | donne un nom à l'adresse de cette ligne ; elle commence en première colonne, et le `:` est facultatif sous Devpac |
| mnémonique | `ADD.W` | l'instruction et sa taille : `.B` (8 bits), `.W` (16 bits) ou `.L` (32 bits) ; sans taille, c'est `.W` |
| opérandes | `D1,D0` | la source puis la destination : `ADD.W D1,D0` fait D0 ← D0 + D1 |
| commentaire | `; ajoute…` | l'assembleur ignore tout ce qui suit `;`, ainsi qu'une ligne qui commence par `*` |

Une instruction ne commence jamais en première colonne, sinon l'assembleur la prendrait pour une
étiquette : on la décale toujours d'au moins un espace.

## Écrire des nombres

Un même nombre s'écrit en décimal (`42`), en hexadécimal (`$2A`) ou en binaire (`%101010`).

Le `#` placé devant indique une valeur **immédiate**, c'est-à-dire le nombre lui-même. Sans `#`, le
nombre est une adresse, et l'instruction va chercher ce qui est rangé en mémoire à cet endroit.

```asm
    MOVE.W  #$2000,D0   ; D0 reçoit le nombre $2000
    MOVE.W  $2000,D0    ; D0 reçoit le mot rangé à l'adresse $2000
```

Le `#` oublié est une erreur sournoise, car le programme s'assemble quand même mais ne fait pas du
tout ce qu'on croit.

## Début et fin d'un programme

Sous Devpac, un programme commence simplement à sa première ligne ; 68k Trainer le charge à
l'adresse `$1000`.

:::atari
Il se termine par `RTS` (*ReTurn from Subroutine*) : le TOS a lancé ton programme comme un
sous-programme, et `RTS` lui rend la main. On verra plus tard la fin officielle, avec l'appel
système `Pterm0`.
:::
:::amiga
Il se termine par `RTS` (*ReTurn from Subroutine*) : le CLI, la fenêtre de commandes de l'Amiga, a
lancé ton programme comme un sous-programme, et `RTS` lui rend la main. C'est la vraie fin d'un
programme AmigaDOS, et D0 contient alors son code de retour, 0 quand tout va bien.
:::
