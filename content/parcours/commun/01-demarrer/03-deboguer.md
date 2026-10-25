## Deux sortes d'erreurs

La première est l'erreur d'assemblage : l'assembleur refuse ton texte, à cause d'une instruction mal
orthographiée (`MOVX`), d'une taille impossible (`MOVE.B D0,A1`) ou d'un registre qui n'existe pas
(`D8`). La ligne fautive est soulignée en rouge et un message en français explique le problème ;
c'est l'erreur la plus facile à corriger.

La seconde est l'erreur d'exécution : le programme s'assemble, mais il fait autre chose que ce que
tu voulais. Soit le résultat est faux, et c'est une erreur de logique, soit le processeur s'arrête
sur une exception.

:::atari
Sur un vrai Atari, une exception non prévue affiche des bombes à l'écran, et leur nombre indique la
cause.

| Bombes | Exception | Cause typique |
|---|---|---|
| 2 | erreur de bus | accès à une zone protégée, comme le matériel en mode utilisateur |
| 3 | erreur d'adresse | mot ou mot long lu ou écrit à une adresse impaire |
| 4 | instruction illégale | le processeur exécute des données : `RTS` oublié, pile abîmée |
:::
:::amiga
Sur un vrai Amiga, une exception non prévue affiche la boîte rouge clignotante « Software Failure —
Guru Meditation #0000000N.xxxxxxxx », où N est le numéro de l'exception.

| Guru | Exception | Cause typique |
|---|---|---|
| `#00000003` | erreur d'adresse | mot ou mot long lu ou écrit à une adresse impaire |
| `#00000004` | instruction illégale | le processeur exécute des données : `RTS` oublié, pile abîmée |
| `#00000005` | division par zéro | `DIVU` ou `DIVS` par 0 |
| `#00000008` | violation de privilège | instruction réservée au superviseur, comme `MOVE … ,SR` ou `STOP` |
:::

Dans 68k Trainer, le programme s'arrête sur l'instruction en cause, avec un message qui explique ce
qui s'est passé.

## Une méthode en trois temps

Changer des lignes au hasard jusqu'à ce que le programme marche fait perdre du temps et n'apprend
rien. On procède plutôt en trois temps.

1. On pose une hypothèse : « D0 devrait valoir 14 et il vaut 7, l'addition s'est sans doute faite
   sur le mauvais registre. »
2. On inspecte en pas à pas, où les registres qui viennent de changer s'allument en jaune, pour
   trouver la première ligne où la réalité s'écarte de ce qu'on attendait.
3. On corrige cette ligne seulement, puis on relance pour vérifier.

Prends l'habitude de prédire ce que fait chaque ligne avant d'appuyer sur « Pas » : c'est ainsi que
l'erreur saute aux yeux.
