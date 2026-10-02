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
        "type": "registers",             // "registers" | "memory" | "output" — voir ci-dessous
        "maxSteps": 200,                 // garde-fou : nb max de step() avant d'abandonner (pas de HALT requis aux niveaux 1-3)
        "expected": { "D0": "$0000002A" } // forme selon "type", voir ci-dessous
      }
    }
  ]
}
```

## Types de vérification (`check.type`)

Implémentés dans `src/shared/checkResult.ts` (`evaluateCheck`), appelé par
`src/renderer/src/checker.ts` après assemblage + exécution.

- **`"registers"`** — `expected` : clé = `"D0"`..`"D7"` | `"A0"`..`"A7"` | `"PC"`, valeur = mot de
  32 bits en hexa (`"$0000002A"`).
- **`"memory"`** — `expected` : clé = adresse hexa avec suffixe de taille optionnel
  (`"$FF8240"`, `"$FF8240.B"`, `"$FF8240.L"` — `.W` par défaut si omis), valeur = contenu attendu à
  cette adresse, en hexa. Pensé pour les registres mappés en mémoire (palette Atari ST, puces
  custom Amiga...).
- **`"output"`** — `expected` : une seule clé `"output"`, valeur = chaîne exacte attendue dans
  `cpu.output` (pas de l'hexa) — rempli aujourd'hui par `TRAP #15` (tâche 13, `general`), et par les
  futurs équivalents GEMDOS/AmigaOS des parcours `atari-st`/`amiga`.

**Convention d'id** : toujours préfixer par le nom du track (`general-`, `atari-st-`, `amiga-`) —
`ProgressState.completedExerciseIds` est une liste plate partagée entre tous les parcours, donc les
ids doivent être uniques globalement, pas seulement dans un fichier.

**Niveaux prévus par parcours** :
- `general` : 1 transfert/adressage, 2 arithmétique/logique, 3 branchements, 4 boucles,
  5 sous-programmes/pile (tous complets), 6 (bonus) TRAP — pas encore fait.
- `atari-st` / `amiga` : structure à définir une fois les premiers blocs de plateforme écrits (voir
  ci-dessous) — probablement organisée par thème système plutôt que par niveau de difficulté.

## Matériel Atari ST / Amiga : point d'extension `Platform`

L'émulateur CPU (`src/cpu/cpu.ts`) reste un 68000 générique — il ne connaît rien de GEM, GEMDOS,
AmigaOS ou des puces custom. Il expose en revanche un point d'extension optionnel,
`src/cpu/platform.ts` (interface `Platform`, hooks `onTrap`/`onLineA`/`onJsr`/`onMemoryWrite`),
que chaque machine peut implémenter par petits blocs indépendants (voir le plan
[docs/PLAN-emulateurs.md](../../docs/PLAN-emulateurs.md) — palette Atari ST, GEMDOS texte, ExecBase Amiga, etc.).

`src/renderer/src/platformForTrack.ts` fait le lien entre un `track` et sa `Platform` — aujourd'hui
la palette d'AST-1 pour `atari-st`, rien encore pour `amiga` (qui se comporte donc comme `general`).
Chaque bloc de plateforme implémenté viendra le compléter, sans changer le reste du schéma ci-dessus — le check
type `"memory"` en particulier existe déjà précisément pour ce cas (ex. vérifier qu'écrire dans un
registre de palette produit la bonne valeur), avant même que la plateforme correspondante existe.
