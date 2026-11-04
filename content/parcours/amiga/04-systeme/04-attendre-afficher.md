## Attendre : Delay

`Delay(ticks)(D1)` (dos.library, −198) endort ton programme pendant `ticks` cinquantièmes de
seconde, si bien que `Delay(50)` attend une seconde. Pendant ce temps, le processeur travaille pour
les autres tâches, alors qu'une boucle vide le garderait pour rien.

```asm
    MOVEA.L dosbase,A6
    MOVEQ   #50,D1
    JSR     -198(A6)        ; Delay(50) : une seconde
```

## Afficher un nombre : RawDoFmt

Write n'écrit que des caractères : pour afficher la valeur d'un registre, il faut d'abord la
convertir en texte. Exec le fait avec `RawDoFmt` (−522), qui remplit un modèle (*format*) :

| Registre | Rôle |
|---|---|
| A0 | le format, un texte terminé par 0, par exemple `'Score : %ld',10,0` |
| A1 | les données : les valeurs à placer, rangées les unes après les autres en mémoire |
| A2 | une petite routine appelée pour chaque caractère produit (dans D0) |
| A3 | un registre libre pour cette routine, en général l'adresse du tampon de sortie |

La routine habituelle range chaque caractère dans le tampon et avance :

```asm
ranger: MOVE.B  D0,(A3)+
        RTS
```

Les codes du format :

| Code | Donnée lue | Affiche |
|---|---|---|
| `%d` | un mot (16 bits) | un nombre signé |
| `%ld` | un mot long (32 bits) | un nombre signé |
| `%u`, `%lu` | mot / mot long | un nombre non signé |
| `%x`, `%lx` | mot / mot long | en hexadécimal |
| `%s` | un mot long : l'adresse d'un texte | ce texte |
| `%c` | un mot | un caractère |

On peut préciser une largeur : `%5ld` cadre à droite sur 5 caractères, `%04lx` complète avec des
zéros. Sans le `l`, **RawDoFmt lit un mot** : si la donnée est un mot long, il n'en lit que la
moitié haute, et affiche souvent 0.

Le texte produit se termine par un 0. Comme toute fonction d'exec, RawDoFmt rend A3 tel qu'il était,
et pour connaître la longueur du texte avant `Write`, on compte donc ses caractères jusqu'au 0.
