## L'AES et le VDI

Le GEM, l'interface graphique du ST avec ses fenêtres, ses menus et ses boîtes de dialogue, se
compose de deux parties. L'AES gère les fenêtres, les menus, les dialogues et les événements, tandis
que le VDI dessine des lignes, des cercles et du texte, quel que soit l'écran ou l'imprimante.

On les appelle tous deux par `TRAP #2`, avec dans D0 la partie appelée, `$C8` pour l'AES et `$73`
pour le VDI, et dans D1 l'adresse d'un **bloc de paramètres**, une liste d'adresses de tableaux.

## Un appel à l'AES

Pour l'AES, le bloc contient six adresses, celles des tableaux CONTROL, GLOBAL, INT_IN, INT_OUT,
ADDR_IN et ADDR_OUT. Le tableau CONTROL décrit l'appel : son premier mot est le numéro de la
fonction, et les quatre suivants le nombre d'éléments de INT_IN, INT_OUT, ADDR_IN et ADDR_OUT. Le
résultat principal revient dans INT_OUT[0].

| Fonction | N° | CONTROL | Rôle |
|---|---|---|---|
| `appl_init` | 10 | 10, 0, 1, 0, 0 | s'annoncer au GEM ; INT_OUT[0] = identifiant de l'application |
| `form_alert` | 52 | 52, 1, 1, 1, 0 | afficher une boîte d'alerte ; INT_OUT[0] = bouton cliqué |
| `graf_handle` | 77 | 77, 0, 5, 0, 0 | INT_OUT[0] = numéro du poste de travail VDI de l'écran |
| `appl_exit` | 19 | 19, 0, 1, 0, 0 | rendre la main au GEM |

Un programme GEM commence par `appl_init` et se termine par `appl_exit`.

## La boîte d'alerte

`form_alert` affiche une boîte avec une icône, quelques lignes de texte et jusqu'à trois boutons,
puis attend un clic et rend dans INT_OUT[0] le numéro du bouton choisi, de 1 à 3. INT_IN[0] désigne
le bouton par défaut, celui que valide la touche Entrée, et ADDR_IN[0] l'adresse du texte, qui suit
un format précis :

```text
[1][Bonjour depuis le GEM|Seconde ligne][ OK | Annuler ]
```

Le premier crochet donne l'icône : 0 pour aucune, 1 pour le point d'exclamation, 2 pour le point
d'interrogation et 3 pour le panneau stop. Le deuxième contient les lignes séparées par `|`, cinq au
plus de trente caractères, et le troisième les boutons, trois au plus.

## Ce que simule 68k Trainer

Le simulateur connaît `appl_init`, `appl_exit`, `form_alert`, `graf_handle` et `graf_mouse`. La
boîte d'alerte s'affiche dans la sortie texte, et c'est l'exercice qui choisit le bouton cliqué ;
sans indication, c'est le bouton par défaut. Le VDI et le reste de l'AES se découvrent dans Hatari.
