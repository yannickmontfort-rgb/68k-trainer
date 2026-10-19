# Inventaire des sources — 68k Trainer

Fait le 19/10/2026 (session Claude Code). **Les originaux n'ont pas été touchés** : ce dossier
contient des **copies** triées. Les originaux restent dans `Logiciels_Projets/Sources/`
(manuels, revue de littérature, `Sources Philippe/`) et dans `Odin/90_Pièces jointes/` (cours du
Féroce Lapin, polycopié de Philippe Meyne).

> ⚠️ Ces sources ne vont **pas** dans le dépôt GitHub (futur dépôt public) : plusieurs sont sous
> droits (livre Abacus, cours EPITA, manuel Motorola, Devpac). Le logiciel n'en contient que des
> **reformulations**, avec la source citée.

## Organisation

```
Tri_68k-trainer/
  atari/    spécifique Atari ST
  amiga/    spécifique Amiga
  commun/   68000 générique (valable sur les deux machines) + pédagogie
  _texte/   extraction texte des PDF (pour chercher et vérifier)
```

## Tableau des sources

| Source | Dossier | Contenu | Fiabilité | Chapitres du parcours Atari |
|---|---|---|---|---|
| Manuel Atari ST **v2** (`manuel_assembleur_68000_atari_st-v2.pdf`) | atari | 7 modules ; module 7 = 3 exercices corrigés + routines PSET/POINT, déplacement au pixel, joystick | ⚠️ synthèse générée (NotebookLM, « 35 cours vidéo ») : **plusieurs bugs**, voir [ERRATA](errata_manuel_atari_v2.md) | 1, 2, 4 à 8 |
| Manuel Atari ST v1 | atari | Mêmes modules, plus détaillé sur la pile (1.5), les vecteurs (2.1) et la table GEMDOS/BIOS/XBIOS (2.3) | Vecteurs et exemple de pile vérifiés justes | 2, 4 |
| Cours du **Féroce Lapin** (`cours_asm_68000_Feroce_Lapin.pdf`) | atari | 7 cours + annexes : numération, mémoire, registres, MOVE, adressage, pile, TRAP, Devpac/MONST, Ligne A, GEM, MFP | Cours historique écrit par un humain (années 90), fiable | 1, 2, 3, 4 |
| **EPITA** — David Bouchet, cours ch. 1 + TP 1 à 10 avec corrigés | commun | Initiation complète : structure d'un source, registres, directives, **tous les modes d'adressage**, branchements signés/non signés, DBRA, pile, MOVEM, sous-programmes, jeu d'instructions ; TP : prédiction de boucles, valeur absolue, calculatrice, Space Invaders | Très fiable, très pédagogique | **3** (jeu d'instructions), 1 |
| M68000PRM (Motorola) | commun (dans EPITA) | Référence officielle de chaque instruction et de ses flags | Référence | vérification de tout |
| EASy68K Quick Reference, d68k | commun (dans EPITA) | Aide-mémoire des instructions | Fiable | 3 |
| Polycopié **Philippe Meyne** (IUT GEII Évry) | commun | 9 pages : modes d'adressage, branchements conditionnels | Fiable | 3 |
| **MarkeyJester** — Motorola 68000 Beginner's Tutorial (site aspiré) | commun | Tutoriel générique très progressif (orienté Mega Drive) | Fiable | 3 |
| Revue de littérature (`Revue_Litterature_Fusion.docx`) | commun | Fondements pédagogiques (charge cognitive, exemples résolus, lecture/traçage, débogage) | — | tout le parcours |
| `notation_hexadecimale.txt` | commun | Extrait sur l'hexadécimal | — | 2 |
| Manuel Amiga | amiga | Synthèse générée, même style que les manuels Atari | ⚠️ à vérifier comme le manuel Atari | Phase 5 |
| Abacus — *Amiga Machine Language* | amiga | Livre (anglais) | Fiable, sous droits | Phase 5 |
| Cours RamJam (italien/anglais, ADF + version papier + sources) | amiga/Philippe | Cours Amiga complet | Fiable | Phase 5 |
| Stash of Code (Desire ONE, Scoopex ONE/TWO/THREE), Haujobb framework | amiga/Philippe/Cours ASM | Making-of d'intros et cracktros Amiga, en français | Fiable | Phase 5 |
| Cours ASM 1-12 (ADF), FunxASM, Tutos_asm, bootblocks, ANT clavier | amiga/Philippe/Cours ASM | Disquettes de cours Amiga, scans d'*Amiga News Tech* | Non examinés en détail (ADF) | Phase 5 |
| Cracktro sources, CoderAid, Devpac 2 (**version Amiga**, ADF) | amiga/Philippe | Sources de démos, outils | — | Phase 5 / bonus |

### Non copiés (hors sujet pour un public débutant)

Restés à leur place dans `Sources Philippe/___ASM 68x_Coding_/` : **Cours Cracking** (tutoriels de
déplombage), **Win32 Remakes**, **FixedExe**, **text editors for asm**, `rj-mkc.exe`, images GIF.

### Sources « notebook KLM »

Aucun fichier de ce nom trouvé. Les deux manuels Atari se décrivent comme une « synthèse des
35 cours vidéo et guides écrits » : ils semblent **être** la sortie du notebook (NotebookLM). Ils
ont été repris de façon critique : chaque affirmation technique utilisée dans le logiciel a été
vérifiée (M68000PRM, cours du Féroce Lapin, exécution réelle dans le simulateur), et les erreurs
sont listées dans l'errata.

## Couverture par chapitre et trous à combler

| Chapitre du parcours | Sources | Trous |
|---|---|---|
| 1. Démarrer (outils, premier programme) | Manuel module 6 (trop tard), Féroce Lapin cours 1-2 | Le simulateur remplace Devpac/MONST : chapitre **rédigé par Claude** `[À RELIRE]` |
| 2. Architecture et notions fondamentales | Manuel module 1, Féroce Lapin, EPITA II | Exercices de conversion binaire/hexa et de lecture de registres à **créer** |
| 3. Jeu d'instructions, flags, branchements, boucles | EPITA (cœur), Meyne, MarkeyJester, exercices `general` de la v0.1 | **Lacune du manuel comblée** par EPITA + exercices v0.1 ; QCM et prédictions à créer |
| 4. TOS, TRAP et vecteurs | Manuel module 2 (v1 plus complet), Féroce Lapin | Exemples GEMDOS testés dans le simulateur ; exercice 2 du module 7 (Supexec) |
| 5. Graphisme et framebuffer | Manuel module 3, exercice 1 et PSET/POINT du module 7 | PSET **bogué** dans le manuel → devient un exercice « à corriger » |
| 6. Animation et sprites | Manuel module 4, routine 7.3 | Routine 7.3 **fausse** (débordement perdu) → à réécrire |
| 7. Clavier, joystick, son | Manuel module 5, exercice 3 et routine 7.4 | Interruption IKBD/joystick et son AY : pas encore simulés |
| 8. Devpac approfondi, débogage, bonnes pratiques | Manuel module 6 | Peu de matière : à compléter |
