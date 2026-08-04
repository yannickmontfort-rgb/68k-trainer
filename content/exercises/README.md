# Format des exercices

Chaque niveau est un fichier JSON `niveau-N-<theme>.json` dans ce dossier, avec la forme :

```jsonc
{
  "level": 1,
  "title": "Transfert et adressage",
  "exercises": [
    {
      "id": "l1-e1",                     // identifiant stable, utilisé par ProgressState.completedExerciseIds
      "title": "Premier transfert",
      "statement": "Énoncé affiché à l'utilisateur (Markdown autorisé).",
      "hints": ["Indice 1 (affiché en premier)", "Indice 2 (plus explicite)"],
      "courseRef": "registres-et-memoire.md",   // fiche de cours à proposer en lien depuis l'exercice
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

**Non implémenté côté appli** (à faire en même temps que le panneau "Exercice") : le composant qui
charge ces fichiers, assemble `starterCode` + la solution de l'utilisateur, exécute jusqu'à
`maxSteps` ou un `TRAP #15` (D0=9, halt), puis compare le `CpuSnapshot.d`/`a` obtenu à `expected`.
Ce README documente le format attendu ; considérez-le comme une proposition à valider en même
temps que ce panneau, pas encore comme un contrat gravé dans le marbre.

**Niveaux prévus** : 1 transfert/adressage, 2 arithmétique/logique, 3 branchements, 4 boucles,
5 sous-programmes/pile, 6 (bonus) TRAP.
