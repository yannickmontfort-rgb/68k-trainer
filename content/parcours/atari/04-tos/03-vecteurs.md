## La table des vecteurs d'exception

Le premier kilo-octet de la mémoire (`$000000`–`$0003FF`) contient **256 vecteurs** de 4 octets.
Chacun est l'**adresse de la routine** à exécuter quand une exception survient. Le vecteur n° n
est à l'adresse **n × 4**.

| N° | Adresse | Exception |
|---|---|---|
| 2 | `$008` | erreur de bus |
| 3 | `$00C` | erreur d'adresse |
| 4 | `$010` | instruction illégale |
| 5 | `$014` | division par zéro |
| 8 | `$020` | violation de privilège |
| 9 | `$024` | trace (pas à pas des débogueurs) |
| 28 | `$070` | **VBL** : interruption de niveau 4, à chaque balayage d'écran (50 ou 60 fois par seconde) |
| 32 à 47 | `$080`–`$0BC` | **TRAP #0 à TRAP #15** (TRAP #1 en `$084`, #13 en `$0B4`, #14 en `$0B8`) |
| 64 à 79 | `$100`–`$13C` | interruptions du MFP 68901 (clavier en `$118`, Timer B en `$120`…) |

Quand le TOS affiche des **bombes**, il en dessine autant que le numéro de l'exception.

## Ce que fait le 68000 lors d'une exception

1. Il copie SR, puis passe en **superviseur** (S = 1) et coupe le mode trace.
2. Il **empile** sur la pile superviseur le **PC** (4 octets), puis l'**ancien SR** (2 octets).
   (Pour les erreurs de bus et d'adresse, il empile 8 octets de plus : adresse fautive, etc.)
3. Il lit le vecteur et **saute** à l'adresse trouvée.

La routine se termine par **`RTE`** (*ReTurn from Exception*) : elle dépile SR et PC. Le
processeur retrouve exactement son état d'avant, mode utilisateur compris.

Pour un `TRAP` ou une division par zéro, le PC empilé est celui de l'instruction **suivante** :
après `RTE`, le programme continue. Pour une instruction illégale ou une violation de privilège,
c'est l'adresse de l'instruction **fautive**.

## Installer sa propre routine : Setexec

On pourrait écrire directement dans la table (en superviseur), mais la façon propre est la
fonction **BIOS 5, `Setexec(numéro, adresse)`**. Elle installe la routine et **renvoie dans D0
l'ancien vecteur**, qu'il faut garder pour le remettre en place avant de quitter.

```asm
    PEA     MAROUTINE       ; nouvelle adresse
    MOVE.W  #35,-(SP)       ; vecteur 35 = TRAP #3
    MOVE.W  #5,-(SP)        ; BIOS 5 : Setexec
    TRAP    #13
    ADDQ.L  #8,SP           ; 4 + 2 + 2 octets
    MOVE.L  D0,ANCIEN       ; ancienne routine, à restaurer en fin de programme
```

Avec l'adresse `-1`, Setexec se contente de **lire** le vecteur sans le changer.

C'est ainsi que les jeux installent leurs routines de VBL ou de clavier, et que les débogueurs
comme MONST interceptent les erreurs.
