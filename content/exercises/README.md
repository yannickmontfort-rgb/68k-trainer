# Format des exercices

Le contenu (cours et exercices) est organisé par **parcours** (`track`), déclarés dans
[content/tracks.json](../tracks.json) : `general` (68000 générique), `atari-st`, `amiga`.
Chaque parcours a son propre sous-dossier dans `content/courses/<track>/` et
`content/exercises/<track>/`.

Dans `content/exercises/<track>/`, chaque niveau est un fichier JSON `niveau-N-<theme>.json` :

```jsonc
{
  "level": 1,
  "title": "Transfert et adressage",
  "exercises": [
    {
      "id": "general-l1-e1",              // identifiant GLOBALEMENT unique (préfixé par le track),
                                            // utilisé par ProgressState.completedExerciseIds
      "title": "Premier transfert",
      "statement": "Énoncé affiché à l'utilisateur (Markdown autorisé).",
      "hints": ["Indice 1 (affiché en premier)", "Indice 2 (plus explicite)"],
      "courseRef": "registres-et-memoire.md",   // fiche de cours, RELATIVE à content/courses/<même track>/
      "starterCode": "    ORG $1000\nSTART:\n\n",  // code pré-rempli dans l'éditeur
      "check": {
        "type": "registers",             // seul type supporté pour l'instant
        "maxSteps": 200,                 // garde-fou : nb max de step() avant d'abandonner (pas de HALT requis aux niveaux 1-3)
        "expected": { "D0": "$0000002A" } // registres à vérifier après exécution (D0-D7, A0-A7), valeurs en hexa 32 bits
      }
    }
  ]
}
```

**Convention d'id** : toujours préfixer par le nom du track (`general-`, `atari-st-`, `amiga-`) —
`ProgressState.completedExerciseIds` est une liste plate partagée entre tous les parcours, donc les
ids doivent être uniques globalement, pas seulement dans un fichier.

**Non implémenté côté appli** (à faire en même temps que le panneau "Exercice") : le composant qui
charge ces fichiers, assemble `starterCode` + la solution de l'utilisateur, exécute jusqu'à
`maxSteps` ou un `TRAP #15` (D0=9, halt), puis compare le `CpuSnapshot.d`/`a` obtenu à `expected`,
**ainsi que le sélecteur de parcours** (aucune UI ne lit encore `tracks.json`). Ce README documente
le format attendu ; considérez-le comme une proposition à valider en même temps que ce panneau, pas
encore comme un contrat gravé dans le marbre.

**Niveaux prévus par parcours** :
- `general` : 1 transfert/adressage, 2 arithmétique/logique, 3 branchements, 4 boucles,
  5 sous-programmes/pile, 6 (bonus) TRAP.
- `atari-st` / `amiga` : structure à définir une fois le contenu de cours en place (probablement
  organisée par thème système plutôt que par niveau de difficulté — TRAP/GEMDOS, macros, etc. pour
  Atari ST).

**Limite connue à garder en tête** : l'émulateur CPU de ce trainer est un 68000 générique — il
n'émule ni le matériel Atari ST (GEM, adresses $FF8xxx, MFP68901) ni celui de l'Amiga (chips custom,
Exec). Les exercices `atari-st`/`amiga` devront donc rester conceptuels (lecture de code, quiz,
explication d'un comportement) plutôt que "assemble et vérifie l'état des registres" tant que
l'émulateur ne simule pas ce matériel — à trancher avec Yannick avant d'écrire ces exercices.
