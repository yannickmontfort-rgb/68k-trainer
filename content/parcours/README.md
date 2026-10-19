# Format du parcours guidé

```
content/parcours/<parcours>/parcours.json        titre, plateforme, liste ordonnée des dossiers de chapitres
content/parcours/<parcours>/<chapitre>/chapitre.json
content/parcours/<parcours>/<chapitre>/*.md       textes des cours (référencés par "fichier")
```

Types TypeScript de référence : [src/shared/parcours.ts](../../src/shared/parcours.ts).

## Hiérarchie

**parcours → chapitres → notions → contenus**, plus pour chaque chapitre un **QCM** de fin et des
**défis bonus** facultatifs (hors pourcentage).

| Contenu (`type`) | Écran | Terminé quand… |
|---|---|---|
| `cours` | texte Markdown, code coloré | l'apprenant clique « J'ai lu » |
| `exemple` | exemple corrigé exécuté pas à pas, explication de chaque ligne | le programme va au bout |
| `prediction` | lire un code et prédire registres/flags, puis vérifier en exécutant | les réponses sont validées |
| `exercice` | `variante` : `completer`, `ecrire`, `corriger`, `ordonner` ; `niveau` 1 à 3 | « Vérifier » réussit |

Champs communs : `id` (**globalement unique**, préfixé par le parcours : c'est la clé de
progression), `titre`, `aRelire` (contenu rédigé par Claude, à relire), `nonTeste`, `source`.

## Exercices

- `codeDepart`, `solution`, `check` (même format que les exercices de la v0.1, voir
  [content/exercises/README.md](../exercises/README.md), plus le type `pixels` : `"x,y": "couleur"`).
- `ordonner` : `entete`, `lignes` (dans le BON ordre, l'écran les mélange), `pied`.
- `ref` : reprend un exercice de la v0.1 par son id (même progression).
- `machine` : `{ "modeUtilisateur": true }` pour démarrer en mode utilisateur comme sous le TOS,
  `{ "touches": [{ "ascii": 27, "scancode": 1 }] }` pour simuler le clavier, `{ "ecran": true }`
  pour afficher l'écran Atari.

## Prédictions et QCM

Question : `enonce`, `code` (facultatif), `choix`, `bonne` (indice), `explication`.
`verification` (prédictions) : état attendu après exécution (`"D0": "$0000002A"`, `"Z": "1"`,
`"$3000.W": "$1234"`), contrôlé par les tests pour garantir que la bonne réponse est vraie.
Seuil de réussite d'un QCM : `seuil` (0,7 par défaut).

## Vérification automatique

`tests/contenu-parcours.test.ts` assemble et exécute **tout** : chaque solution doit passer son
`check`, chaque exemple doit aller au bout sans exception, chaque `verification` doit être vraie,
et un code de départ « à compléter / à corriger » ne doit pas être déjà juste.
