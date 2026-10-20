# Plan du parcours Amiga (branche `amiga`, ouvert le 20/10/2026)

Décisions de Yannick (20/10/2026) :

- Machine simulée : **Amiga 500 OCS, Kickstart 1.3, PAL** (68000 à 7,09 MHz, 512 Ko de Chip RAM
  + 512 Ko de Slow RAM en `$C00000`).
- Style : d'abord la programmation **système** (exec, dos, graphics.library), puis **matérielle**
  façon démo (couper le système, Copper, Blitter, sprites, Paula, et rendre la main proprement).
- Chapitres 1 à 3 = **tronc commun** partagé avec l'Atari : mêmes contenus, mêmes identifiants
  (la progression compte pour les deux machines), textes et exemples adaptés à la machine.
- Export : **exécutable AmigaDOS** (format hunk), essayé dans un émulateur avec la ROM AROS libre.
- Interface : **machine choisie dans le profil** (Atari ST ou Amiga 500), changeable à tout moment.

## 1. Machine simulée (`src/platforms/amiga/`)

| Bloc | Contenu |
|---|---|
| `machine.ts` | Carte mémoire, constantes PAL (313 lignes × 227 cycles couleur, 454 cycles 68000 par ligne, 142 102 par image), adresses des registres custom |
| `custom.ts` | Registres `$DFF000-$DFF1FE` : lecture/écriture, SET/CLR (bit 15) de DMACON/INTENA/INTREQ/ADKCON, position du faisceau (VPOSR/VHPOSR), interruptions de Paula (niveaux 1 à 6, auto-vecteurs) |
| `copper.ts` | MOVE / WAIT / SKIP, COP1LC/COP2LC, COPJMP, redémarrage à chaque image, synchronisé sur le faisceau |
| `video.ts` | Denise : 1 à 6 plans (EHB), basse et haute résolution, DIW/DDF, modulos, BPLCON1 (défilement fin), double playfield, sprites (8, attachés), rendu ligne par ligne avec l'état des registres au moment où la ligne est balayée |
| `blitter.ts` | Mode zone (minterms, décalages A/B, masques, mode descendant, remplissage inclusif/exclusif) et mode ligne ; BBUSY/BZERO, interruption BLIT |
| `paula.ts` | Son : 4 voies DMA 8 bits signés, période, volume, interruptions AUDx ; échantillons pour Web Audio |
| `cia.ts` | CIA-A (`$BFE001`, souris/joystick boutons, clavier SDR, timers, TOD = VSYNC) et CIA-B (`$BFD000`, TOD = HSYNC), interruptions PORTS (2) et EXTER (6) |
| `entrees.ts` | Souris (JOY0DAT), joystick (JOY1DAT + feu sur CIA-A), bouton droit (POTGOR), clavier (codes bruts Amiga) |
| `kickstart.ts` | Kickstart simulé : ExecBase en `$4`, vraies tables de sauts (`JMP` de 6 octets) vers de petites routines « en ROM », bibliothèques exec / dos / graphics (sous-ensemble utile), console CLI (sortie texte), liste Copper du système (`gb_copinit`), serveur d'interruption VBL, lancement CLI (A0/D0, RTS final + code de retour) |
| `hunk.ts` | Export `.exe` AmigaDOS (HUNK_HEADER / CODE / RELOC32 / END, en Chip RAM) et relecture |

Tout est vérifié par des tests Vitest, contre la documentation (Hardware Reference Manual,
Amiga Intern, sources AROS pour les décalages des bibliothèques).

## 2. Application

- Abstraction « machine » côté interface : écran, son, panneau matériel du débogueur, vecteurs,
  vitesse d'horloge et export dépendent de la machine (Atari ou Amiga).
- Profil : machine choisie (création + sélecteur dans la barre du haut) ; position de reprise
  mémorisée par parcours.
- Bac à sable : machine du profil.
- Contenu commun : `content/parcours/commun/` (chapitres 1-3), adaptations par machine
  (`:::atari` / `:::amiga` dans les textes, `[[atari:…|amiga:…]]` en ligne, blocs de code
  `;=== nom@amiga`).
- Vérification d'écran Amiga : `image` (couleur affichée en `x,y` à l'image n), puces : `custom`
  (registres écrits), `son` (voies de Paula).

## 3. Parcours `amiga` (chapitres 4 à 10)

4. **Le système de l'Amiga** — Kickstart, Exec, ExecBase, bibliothèques et `JSR -offset(A6)`,
   OpenLibrary/CloseLibrary, dos.library (Output/Write), AllocMem/FreeMem, Chip/Fast RAM.
5. **L'écran et les puces custom** — `$DFF000`, plans de bits, palette 12 bits, BPLCON0, DIW/DDF,
   modulos, prendre la main proprement (Forbid, LoadView(0), WaitTOF, DMACON/INTENA) et la rendre.
6. **Le Copper** — MOVE/WAIT, dégradés, barres de couleur, attente du faisceau, VBL de niveau 3,
   double tampon, animation.
7. **Le Blitter** — copie, minterms, masques, cookie-cut, effacement, remplissage, lignes.
8. **Sprites et entrées** — sprites matériels, souris, joystick, clavier par la CIA.
9. **Paula, le son** — échantillons, périodes, volume, notes, petite musique.
10. **Outils et démo** — sections et Chip RAM, exécutable AmigaDOS, débogage, bonnes pratiques,
   défi intro / cracktro.

Chaque chapitre : cours, exemples pas à pas, prédictions, exercices (3 niveaux, 4 variantes),
QCM (70 %), bonus. Tout marqué `aRelire`, tout exécuté par `tests/contenu-parcours.test.ts`.

## 4. Hors simulation (limites assumées, signalées dans le cours)

Pas de contention DMA (le 68000 n'est jamais ralenti par les puces), Copper précis à la ligne
et à la position horizontale de WAIT mais couleurs changées au pixel près seulement au début de
ligne, pas de lecteur de disquette ni de HAM, pas de multitâche réel (une seule tâche : la
tienne).
