# Rapport de session : le parcours Amiga (20/10/2026)

Session autonome sur DARTHVADER, branche **`amiga`** (partie de `main` = 1.0.0). Version **1.1.0**.

## Décisions de départ (Yannick)

| Question | Décision |
|---|---|
| Publier la 1.0.0 d'abord ? | Oui : `main` avancé jusqu'à `v3`, tag `v1.0.0` poussé (la CI fabrique les paquets 3 OS, en brouillon) |
| Machine simulée | Amiga 500 OCS, Kickstart 1.3, PAL |
| Style | Système (exec, dos, graphics) puis matériel (couper l'OS, Copper, Blitter, sprites, Paula, rendre la main) |
| Chapitres 1-3 | Tronc commun factorisé, mêmes identifiants de progression |
| Export | Exécutable AmigaDOS, à essayer dans un émulateur avec la ROM AROS |
| Périmètre | Parcours Amiga complet |
| Interface | Machine choisie dans le profil |

## Ce qui est fait

**La machine** (`src/platforms/amiga/`, 34 tests dédiés) :

- chipset synchronisé sur le faisceau (313 lignes × 454 cycles) : Copper MOVE/WAIT/SKIP avec
  masques et ligne > 255, COPJMP, relance à chaque image ; plans de bits 1 à 6, basse et haute
  résolution, DIW/DDF, modulos, BPLCON1, double playfield, EHB, HAM ; 8 sprites en DMA (et à la
  main), attachés, priorités BPLCON2 (vérifiées dans Amiga Intern) ; changements de couleur au
  bon endroit de la ligne ;
- Blitter : zone (minterms, décalages, masques, mode descendant, remplissage inclusif/exclusif),
  mode ligne (vérifié contre Bresenham dans les 8 octants), BBUSY/BZERO, interruption BLIT ;
  **remarque** si on relance un blit sans attendre la fin ;
- Paula (4 voies DMA, périodes, volume, interruptions AUDx, son dans l'interface) ; CIA-A/B
  (timers, TOD, ICR, port série du clavier) ; souris, joystick, boutons, clavier ;
- Kickstart 1.3 simulé : ExecBase en `$4`, vraies tables de sauts (JMP), Forbid/Permit/Disable/
  Enable et routines d'interruption en vrai code 68000, exec/dos/graphics (OpenLibrary avec
  versions, AllocMem/FreeMem/AvailMem, Write/Read/Output/Input/Delay, RawDoFmt, LoadView,
  WaitTOF, WaitBlit, AddIntServer…), écran du CLI avec pointeur de souris, Guru Meditation ;
- **bilan de sortie** : Forbid/Disable non équilibrés, mémoire non rendue, DMA, interruptions,
  liste Copper, vecteur `$6C`, vue du système.

**L'export** : `src/asm/hunk.ts`, identique octet par octet à `vasm -Fhunkexe -kick1hunks` ; un seul
hunk de code avec l'image exacte du programme, en Chip RAM si une section `_C` le demande.
L'assembleur accepte `SECTION nom,CODE|DATA|BSS[_C|_F]`.

**L'interface** : machine dans le profil (création + sélecteur en haut à droite), écran Amiga avec
la bordure, son, débogueur (faisceau, DMACON/INTENA/INTREQ, COP1LC, couleurs, CIA, remarques),
bac à sable Amiga, export. Essayé dans l'appli (Playwright) : exemple du Copper en temps réel,
exercice vérifié, aucune erreur console.

**Le contenu** : tronc commun (`content/parcours/commun/`, adaptation par `[[atari:…|amiga:…]]`,
blocs `:::amiga`, `"variantes"`, codes `nom@amiga`) ; parcours Amiga, chapitres 4 à 10 :

| Chapitre | Contenu |
|---|---|
| 4 Le système | Kickstart, ExecBase, table de sauts, OpenLibrary, CLI, AllocMem, Delay, RawDoFmt |
| 5 L'écran | registres, bit 15 SET/CLR, prendre et rendre la main, plans, couleurs |
| 6 Le Copper | MOVE/WAIT, sous la ligne 255, animation, VBL |
| 7 Le Blitter | copie, minterms, cookie-cut, décalage, lignes, remplissage |
| 8 Sprites et entrées | sprites, joystick, souris, clavier |
| 9 Paula | périodes, volume, son unique, stéréo |
| 10 Outils | hunks, sections, Guru, règles d'or, petite intro |

Chaque chapitre a ses cours, exemples expliqués ligne par ligne, prédictions, exercices (3
niveaux, 4 variantes), QCM et bonus ; **tout est marqué « à relire »** et **tout est exécuté** par
les tests (vérifications d'écran à une image donnée, clics et touches simulés). Fichier à inclure
`content/fichiers/amiga-systeme.s` (prendre, rendre, attendre_vbl, attendre_clic, attendre_blitter).

**Corrections** : `docs/errata_manuel_amiga.md` (squelette du manuel faux sur la restauration de
DMACON, liste Copper du système oubliée, exercice 2 de la barre qui disparaît, OpenLibrary v36 sur
un A500…) ; table d'offsets d'Abacus fausse pour quelques fonctions ; ancienne fiche Amiga v0.1
corrigée (9 adresses `$DFFxxx`, CIA inversées).

Tests : 811 verts (hors matrice vasm de 15 min), typecheck propre.

## À relire, à vérifier

1. **Tout le contenu Amiga** (badges « à relire ») : idéalement par un copain qui code sur Amiga.
2. Points où la simulation peut différer du vrai matériel (et qui mériteraient un essai sur un vrai
   A500 ou WinUAE) : le **mode ligne et le remplissage du Blitter** (premier point, SING + OU
   exclusif du bonus « triangle »), la **position horizontale exacte des sprites** (le vrai
   matériel a un décalage d'un pixel), l'**ordre de lecture de JOY1DAT**, le clavier (poignée de
   main simplifiée).
3. **Essai réel des exécutables exportés** : pas d'émulateur Amiga sur DARTHVADER. À faire :
   installer WinUAE (ou FS-UAE), configuration A500 + ROM AROS intégrée, un dossier du PC monté en
   DH0:, lancer l'exécutable depuis le Shell. Le format est vérifié contre vasm, mais rien n'a été
   lancé sur une vraie ROM.
4. Corrigé en passant dans l'assembleur : une étiquette posée sur la ligne d'un `REPT` n'était
   pas définie (désormais comme vasm, test `tests/asm/rept.test.ts`).

## Pour la suite

- Fusionner `amiga` dans `main` après relecture, puis tag `v1.1.0` (la CI fabrique les paquets).
- Versions natives pour vrai ST / Mega STE et pour vrai Amiga (roadmap V3, « Plus tard »).
