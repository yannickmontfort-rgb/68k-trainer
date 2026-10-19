# Rapport de session — mise à jour 68k Trainer (19/10/2026)

Session menée en autonomie sur **DARTHVADER**, d'après
`Logiciels_Projets/Roadmaps/Roadmap_ClaudeCode_68kTrainer.md` et tes décisions du 19/10 :
- **point 3** : bloc exceptions et écran Atari tôt ;
- **point 6** : périmètre réduit ;
- **point 5** : vérifier le manuel v2, reformuler les cours, vasm accepté ;
- la barre de progression façon OpenClassrooms, suggérée par les copains.

| | |
|---|---|
| Point de départ | tag `v0.1-avant-roadmap` (version 0.1.1), poussé sur GitHub avant tout changement |
| Branche | `feature/maj-68ktrainer`, une vingtaine de commits, rien sur `main` |
| Version | **0.2.0** |
| Binaires | `Nextcloud/Logiciels_Projets/68k-Trainer_binaires/` : installeur + version portable |
| Tests | **297 tests verts** (56 au départ), plus le typecheck |

## 1. Ce qui a été fait

### Émulateur (point 3)

- **Bloc exceptions** dans le cœur 68000 :
  - registre d'état complet (T, S, masque d'interruption) ;
  - mode superviseur avec deux piles USP/SSP ;
  - table des vecteurs ;
  - erreur d'adresse (accès impair) et erreur de bus, avec le vrai cadre de pile de 14 octets ;
  - violation de privilège ;
  - division par zéro, CHK, TRAPV, Ligne A/F ;
  - interruptions (niveaux, masque, STOP) ;
  - RTE.
- **Arrêt « bombes »** : sans routine installée, le programme s'arrête sur l'instruction fautive avec un message pour débutant et le nombre de bombes du TOS.
- **Instructions ajoutées** : EXT, Scc, LINK/UNLK, ADDX/SUBX/NEGX, CMPM, MOVEP, TAS, RTR, MOVE vers/depuis SR/CCR, MOVE USP, ORI/ANDI/EORI vers SR/CCR, décalages en mémoire.
- **Corrections** : flag V de ASL ; DIVU/DIVS en dépassement laissent le registre intact. Seul le BCD (ABCD/SBCD/NBCD) manque encore.
- **Atari 1040 STF simulé** :
  - TOS simulé : GEMDOS (Cconws, Cconout, Cnecin, Cconis, Super, Pterm0/Pterm…), BIOS (Bconout, Setexec…), XBIOS (Physbase, Setscreen, Setcolor, Setpalette, Random, Kbdvbase, Vsync, **Supexec**) ;
  - carte mémoire réaliste ;
  - mode utilisateur avec protection (vecteurs, variables système, matériel : 2 bombes) ;
  - retour au TOS par un `RTS` final.
- **Écran** : la basse résolution est affichée dans un canvas, avec la palette réelle.

### Interface et progression (phase 1)

- **Modèle de contenu** : parcours → chapitres → notions → contenus (cours, exemple corrigé, prédiction, exercice), avec un QCM et des défis bonus par chapitre. Champ `plateforme` (`atari`, `amiga`, `commun`).
- **Progression v2**, stockée en local :
  - cours lus, exemples parcourus, prédictions répondues, exercices réussis ;
  - meilleur score des QCM, dernière position.
  - Une progression de la v0.1 reste lisible : les 19 exercices de la v0.1 gardent leurs identifiants.
- **Écran Parcours** :
  - barre globale (pourcentage et chapitres terminés) ;
  - bandeau par chapitre : Cours ✓ / Exemples / Prédictions / Exercices x/y / QCM ✓ ;
  - sommaire latéral avec l'état de chaque notion (○ ◐ ●) ;
  - bouton **Reprendre / Continuer** ;
  - bonus comptés à part.
- **Gabarits d'écrans** :
  - cours (code coloré en syntaxe Devpac) ;
  - exemple corrigé pas à pas, avec l'explication de chaque ligne ;
  - prédiction, puis « Vérifier en exécutant » ;
  - exercice en 4 variantes (compléter, écrire, corriger, remettre dans l'ordre) et 3 niveaux ;
  - QCM corrigé et expliqué ;
  - défi bonus, avec badge « facultatif ».
- **Débogueur réutilisable** : registres (changements en jaune), SR bit par bit, USP/SSP, pile, mémoire, sortie texte, écran Atari.
- **Aide** :
  - messages de vasm **reformulés en français pour débutants** ;
  - **pistes de débogage** après un échec ;
  - indices progressifs, puis solution (après tous les indices ou 3 essais) ;
  - brouillon de code gardé automatiquement.
- **Bac à sable** : même débogueur, écran, TOS simulé, case « mode utilisateur ».
- **Conservés tels quels** : les anciens écrans (Fiches, Exercices libres).

### Sources (phase 2)

- Copies triées dans `Nextcloud/Logiciels_Projets/Sources/Tri_68k-trainer/{atari,amiga,commun}`, avec l'extraction texte des PDF dans `_texte/`. **Aucun original modifié ni déplacé.**
- **Inventaire** (sources → chapitres → trous) et **errata du manuel v2**. Copies dans le dépôt : `docs/sources_inventaire.md` et `docs/errata_manuel_atari_v2.md`.

### Contenu (phase 3)

| Chapitre | Notions | Cours | Exemples | Prédictions | Exercices | QCM | Bonus |
|---|---|---|---|---|---|---|---|
| 1. Démarrer : l'atelier et ton premier programme | 2 | 3 | 2 | 2 | 7 | 10 questions | 1 |
| 2. Architecture du 68000 | 5 | 5 | 5 | 5 | 15 | 10 | 1 |
| 3. Jeu d'instructions (la lacune du manuel) | 7 | 6 | 6 | 6 | 29 (dont les 19 de la v0.1) | 12 | 2 |
| 4. Le TOS : appels système, superviseur, vecteurs | 3 | 3 | 3 | 3 | 10 | 9 | 1 |
| 5. Graphisme : écran, plans de bits, palette | 2 | 2 | 2 | 2 | 5 | 8 | 1 |
| 6. Animation, sprites — 7. Clavier, joystick, son — 8. Devpac approfondi | *esquisses : plan détaillé seulement* | | | | | | |

Au total : 19 cours, 18 exemples corrigés, 18 prédictions, 66 exercices, 49 questions de QCM et 6 défis bonus.

Les deux ajustements d'ordre de la roadmap sont appliqués :
- les outils viennent **au début** (chapitre 1) ;
- le **jeu d'instructions** est placé avant le TOS (chapitre 3).

Le module 7 est réparti dans les chapitres :
- exercice 2 (Supexec) → chapitre 4 ;
- exercice 1 et PSET → chapitre 5 ;
- exercice 3 (clavier) et routines 7.3/7.4 → esquisses des chapitres 6 et 7.

### Polish et tests (phase 4)

- Parcours joué « comme un débutant » dans la **vraie application** (pilotée par Playwright) : tout le chapitre 1, 7 exercices validés par l'interface, QCM 10/10, chapitre à 100 %. Après relance, la progression et « Reprendre » sont conservés. Captures des écrans des chapitres 3, 4 et 5, du bac à sable et des anciens écrans.
- Guide utilisateur (`docs/guide_utilisateur.md`) et `README.md`.
- Application **empaquetée testée** : contenu, vasm embarqué, version et date affichées.

## 2. Décisions prises seul, et pourquoi

1. **Les sources restent hors du dépôt**, dans `Logiciels_Projets/Sources/Tri_68k-trainer`. Le dépôt sera public, et plusieurs sources sont sous droits (Abacus, EPITA, Motorola, Devpac). Le logiciel ne contient que des reformulations, avec la source citée.
2. **Tutos de cracking, Win32 remakes, éditeurs, exécutables divers** : non copiés (hors sujet pour un public débutant). Ils restent à leur place d'origine.
3. **Seuil des QCM : 70 %**, sans pénalité pour recommencer (le champ `seuil` est réglable par chapitre).
4. **Chapitres 1 à 3 en mode superviseur, à partir du 4 en mode utilisateur** comme le vrai TOS : les débutants n'ont pas à gérer les protections avant d'avoir appris ce qu'elles sont.
5. **vasm sans alignement automatique (`-noialign`)**, comme Devpac : un `DC.B` impair provoque une vraie erreur d'adresse, ce qui rend la leçon sur `EVEN` concrète.
6. **`ORG` facultatif** (programme chargé en `$1000`) et **`TEXT` / `DATA` / `BSS` acceptés**, les sections étant mises bout à bout. C'est un compromis : la sortie binaire de vasm refuse les sections. Choix réversible : passer plus tard au format `-Ftos` (vrai .PRG relogeable).
7. **Un programme qui plante n'est jamais « réussi »**, même si ses registres sont justes. Option `terminer` : il doit aussi s'être vraiment terminé, sinon une pile déséquilibrée qui saute dans de la mémoire vide passerait inaperçue.
8. **Le code des contenus vit dans des fichiers `code.s`** (un par chapitre, blocs `;=== nom`) et non dans le JSON : lisible, assemblable tel quel, et partageable avec les copains.
9. **Chapitre de démonstration** : conservé (`content/parcours/atari/chapitre-demo/`) mais retiré du parcours.
10. **Version 0.2.0** plutôt que 0.1.2, vu l'ampleur des changements.
11. **Construction sur DARTHVADER sans le mode développeur Windows** : l'outil `winCodeSign` a été extrait à la main dans le cache d'electron-builder, sans les deux liens symboliques macOS. Ça fonctionne ; à refaire si le cache est vidé, ou bien activer le mode développeur.

## 3. Ce que les vérifications ont trouvé

**Dans le manuel v2** (détail dans l'errata) :
- La routine **PSET** a deux bugs, vérifiés dans le simulateur :
  - `ANDI.W #$FFFE` au lieu de `#$FFF8` ;
  - `ADDA.L D0,A0` avec le mot fort de D0 non nul.
- La formule `(X/16)×8 = X/2` est fausse.
- La routine **7.3** (déplacement au pixel) perd les bits débordants.
- La PSET bogguée est devenue l'exercice « Les deux erreurs de PSET » du chapitre 5.

**Dans la roadmap** : « accès mot/long à une adresse impaire = **2** bombes » est faux. C'est **3 bombes** (erreur d'adresse) ; 2 bombes = erreur de bus. Le contenu utilise les bonnes valeurs.

**Dans la v0.1** :
- L'exercice « Sauvegarder un registre sur la pile » acceptait le code de départ vide (corrigé dans le parcours).
- Les erreurs vasm « undefined symbol » (sans numéro de ligne) passaient inaperçues (corrigé).

## 4. Contenu à relire `[À RELIRE]`

**Tout le contenu des chapitres 1 à 5 a été rédigé par Claude** : 109 éléments marqués `aRelire` (contenus et défis bonus), affichés dans l'appli avec un petit badge orange « à relire ». Une fois relu, retire `"aRelire": true` du `chapitre.json` correspondant.

Ce qui mérite le plus ton œil d'enseignant :
- le ton (tutoiement), la longueur des cours et le niveau des exercices ;
- les QCM ;
- le cours sur le SR (`04-sr.md`) et le cours sur les plans de bits (`05-graphisme/01-ecran.md`).

**`[NON TESTÉ]` : rien.** Tout le code est vérifié par les tests :
- chaque exemple, solution, prédiction (via `verification`) et extrait de cours est assemblé ; tous, sauf les extraits de cours, sont aussi exécutés ;
- un code de départ « à compléter / à corriger » ne doit pas être déjà juste.

## 5. Reste à faire

1. **Chapitres 6 à 8** (esquissés). Ils demandent du simulateur :
   - l'écran animé pendant l'exécution (rafraîchi à chaque Vsync) ;
   - les interruptions MFP/IKBD (clavier, joystick) ;
   - le son AY-3-8912.
2. **Compléter les chapitres 4 et 5** : notion Ligne A (AST-4), Logbase/Setscreen, double écran.
3. **Parcours Amiga (phase 5)** : réutiliser les chapitres 1 à 3 (marqués `commun`), ajouter AMI-1 à AMI-3, corriger d'abord les adresses `$DFFxxx` de la fiche Amiga v0.1.
4. Pistes : **export d'un vrai .PRG** pour Hatari (format `-Ftos` de vasm) ; instructions BCD ; signature du code Windows.
5. Avant de rendre le dépôt public : **choisir une licence** et relire celle de vasm (gratuit pour un usage non commercial ; vérifier la redistribution du binaire), retirer les badges « à relire ».
6. Fusionner `feature/maj-68ktrainer` dans `main` après ta relecture.

## 6. Questions pour toi

1. **Seuil des QCM** : 70 % te convient-il ?
2. **Ton et niveau** : le tutoiement et la longueur des cours conviennent-ils à des ados comme à des adultes ?
3. **Mode utilisateur dès le chapitre 4** : bon moment, ou plus tôt ?
4. **Les copains** : veux-tu une version « bêta » à leur envoyer telle quelle (avec les badges « à relire »), ou après relecture ?
5. **Licence** pour le futur dépôt public : MIT, GPL, autre ?
6. **Hatari** : l'export d'un .PRG à lancer dans Hatari serait-il prioritaire pour les copains ?
7. **Sources « notebook KLM »** : je n'ai rien trouvé sous ce nom. J'en ai déduit que les manuels v1/v2 **sont** la sortie du notebook. Si d'autres fichiers existent, dis-moi où.

## 7. Réponses de Yannick (19/10/2026)

- Seuil des QCM : **70 %** confirmé.
- Envoi aux copains : **après relecture** du contenu (retirer alors les `aRelire`).
- Licence : **libre** → **GNU GPL v3 ou ultérieure** (fichier `LICENSE`, `package.json`, README,
  page À propos). vasm garde sa licence propre (non commerciale, redistribution sans
  modification autorisée) : voir `THIRD_PARTY.md`.
