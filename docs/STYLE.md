# Fiche de style du contenu

Cette fiche fixe le ton des cours, exemples, exercices et QCM de 68k Trainer. Toute réécriture la
suit. Si le ton ne convient pas, on corrige cette fiche, puis on refait passer les chapitres.

## La voix de référence

Yannick a écrit lui-même le résumé du chapitre 2 :

> Le 68000 manipule des bits, des octets, des mots ainsi que des mots longs, qu'il range dans sa
> mémoire suivant la règle de l'alignement pair. Il travaille avec ses registres et résume chaque
> résultat, les flags du registre d'état. Dès qu'un programme grandit, on fait intervenir la notion
> de pile, indispensable.

Version retenue, resserrée sans changer le ton :

> Le 68000 manipule des bits, des octets, des mots et des mots longs, qu'il range en mémoire en
> respectant l'alignement pair. Il travaille avec ses registres et résume chaque résultat dans les
> flags du registre d'état. Dès qu'un programme grandit, la pile devient indispensable.

Le modèle complet est le chapitre 2 : `content/parcours/commun/02-architecture/`.

## Ce qui fait cette voix

- Des phrases liées, qui racontent ce que fait la machine : « le 68000 range », « le TOS dépose ».
  Les idées s'enchaînent par « et », « donc », « quand », « comme » ; on n'aligne pas des fragments.
- Concis veut dire sans remplissage, pas haché. Une phrase complète vaut mieux que trois bouts.
- Le tutoiement, sobre : « tu le vois dans le pas à pas », sans s'exclamer.
- Le mot juste du métier, expliqué une fois au bon moment, puis employé tel quel.

## Ce qu'on retire

- Le gras partout : on le garde pour une ou deux notions vraiment clés par cours.
- Les résumés en trois temps (« ce que…, où…, avec quoi… »), les annonces (« on va voir que… »),
  les formules creuses (« il est important de noter », « crucial », « en somme »).
- Les points d'exclamation, les « admire le résultat », les emoji décoratifs.
- Les détails qui ne servent pas l'élève à ce moment du parcours : ils vont dans une fiche de
  référence, ou dans le chapitre où ils servent.
- Les explications répétées : si l'exercice montre un piège, le cours se contente de la règle.
- Les listes exhaustives : on garde ce qui est utile ici et maintenant.

## Ce qu'on garde

- Les tableaux de référence courts (tailles, flags, carte mémoire, directives).
- Les exemples de code, les commentaires de code courts (`; D0 = $1234ABCD`).
- Les variantes `[[atari:…|amiga:…]]` et les blocs `:::atari` / `:::amiga`.
- Les `id`, les `check`, les `verification`, le code des exercices et des solutions : on ne touche
  qu'aux textes, jamais à ce que vérifient les tests.

## Les textes courts du chapitre (`chapitre.json`)

- `resume` : deux ou trois phrases liées, dans la voix ci-dessus.
- `introduction` d'un exemple ou d'une prédiction : une phrase qui dit quoi regarder.
- `explications` ligne par ligne : ce qui change et pourquoi, en une phrase.
- `conclusion` : une phrase, la règle à retenir, sans redire les explications.
- `enonce` : ce qu'il faut obtenir, avec la contrainte ; pas de mise en scène.
- `indices` : du plus vague au plus précis ; le dernier peut donner la réponse.

## Revenir sur les notions anciennes

Validé par Yannick le 25/10/2026, pour chaque chapitre à partir du deuxième :

1. Le chapitre commence par une notion « Rappel », faite d'une prédiction de trois questions : deux
   sur le chapitre précédent, une sur un chapitre plus ancien (à partir du chapitre 3). Les
   questions se font sans relire le cours ; l'introduction le dit, sans dramatiser.
2. Le QCM de fin contient deux questions sur des chapitres anciens, mêlées aux autres.
3. Au moins un exercice du chapitre oblige à réutiliser une notion ancienne, et son énoncé ne
   rappelle pas comment faire.

Une question de rappel qui porte sur du code a sa `verification`, comme les autres prédictions.
