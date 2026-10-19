## Deux sortes d'erreurs

**1. L'erreur d'assemblage** : l'assembleur refuse ton texte. Une instruction mal orthographiée
(`MOVX`), une taille impossible (`MOVE.B D0,A1`), un registre qui n'existe pas (`D8`)… La ligne
fautive est soulignée en rouge et un message en français t'explique le problème. C'est l'erreur la
plus facile à corriger : lis le message, regarde la ligne.

**2. L'erreur d'exécution** : le programme s'assemble, mais il fait autre chose que ce que tu
voulais. Soit le résultat est faux (erreur de **logique**), soit le processeur s'arrête sur une
**exception**. Sur un vrai Atari, une exception non prévue affiche des **bombes** à l'écran, et
leur nombre indique la cause :

| Bombes | Exception | Cause typique |
|---|---|---|
| 2 | erreur de bus | accès à une zone protégée (le matériel, en mode utilisateur) |
| 3 | erreur d'adresse | accès à un mot (`.W`) ou un mot long (`.L`) à une adresse **impaire** |
| 4 | instruction illégale | le processeur exécute des données (programme sans `RTS`, pile abîmée…) |

Dans 68k Trainer, le programme s'arrête sur l'instruction en cause et un message t'explique ce
qui s'est passé.

## Une méthode en trois temps

Corriger au hasard jusqu'à ce que « ça marche » fait perdre beaucoup de temps et n'apprend rien.
Les bons programmeurs suivent une méthode :

1. **Hypothèse** — « D0 devrait valoir 14 à la fin, il vaut 7 : je pense que l'addition ne
   s'est pas faite sur le bon registre. »
2. **Inspection** — Lance le **pas à pas**. À chaque instruction, les registres qui viennent de
   changer s'allument en jaune. Repère **la première ligne** où la réalité s'écarte de ce que tu
   attendais.
3. **Vérification** — Corrige *cette* ligne, et seulement elle, puis relance pour vérifier.

Prends l'habitude de **prédire** ce que chaque ligne va faire avant d'appuyer sur « Pas » :
c'est comme ça que l'erreur saute aux yeux.
