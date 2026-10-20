# Errata du « Manuel complet de programmation assembleur 68000 » (Amiga)

Vérifié le 20/10/2026 contre Amiga Intern (Abacus, 1992), le Hardware Reference Manual, les
fichiers d'interface des bibliothèques (sources d'AROS, mêmes décalages que le Kickstart) et par
**exécution réelle** dans l'Amiga 500 simulé de 68k Trainer (`tests/platforms/amiga/`,
`tests/contenu-parcours.test.ts`). Le texte du manuel a été extrait du PDF : certaines colonnes
sont mélangées, les remarques portent sur le sens des programmes.

| § | Ce que dit le manuel | Ce qui est juste | Gravité |
|---|---|---|---|
| 4 | `moveq #36,d0` avant `OpenLibrary` (intuition, « v36 = Kickstart 2.0 ») | Sur un A500 en Kickstart 1.3 (version 34), une version minimale de 36 est **refusée** : OpenLibrary renvoie 0. Pour un A500, demander 0 (ou 33, 34). Le manuel le dit, mais ne prévient pas que l'exemple échoue sur la machine visée. | Piège |
| 5 squelette | `or.w #$8000,OldDMA` puis `move.w OldDMA(a5),DMACON(a5)` | Le `OR` modifie la variable `OldDMA`, mais l'écriture lit `OldDMA(a5)`, c'est-à-dire **A5 + l'adresse de la variable** : n'importe quoi. Juste : `move.w OldDMA,d0` / `or.w #$8000,d0` / `move.w d0,DMACON(a5)` (même chose pour INTENA, avec `$C000`). | **Bug** |
| 5 squelette | Restaure DMACON et INTENA, puis Permit | Il manque la remise de la **liste Copper du système** (`gb_copinit`, 38 octets après la base de graphics, dans COP1LC puis COPJMP1) : l'écran reste celui du programme. Il manque aussi LoadView, OwnBlitter/WaitBlit/DisownBlitter, et la sauvegarde du vecteur $6C si on l'utilise. Voir `content/fichiers/amiga-systeme.s`. | **Bug** |
| 5 squelette | Pas d'`OpenLibrary` de graphics.library | Nécessaire pour LoadView, WaitTOF, WaitBlit et pour retrouver gb_copinit. | Incomplet |
| 6 ex. 1 | Somme de 1 à 10 dans D2 avec `subq`/`cmp`/`bgt` | Juste (D2 = 55 = $37), mais l'énoncé annonce « une boucle DBF » qui n'est pas utilisée. | Mineur |
| 6 ex. 2 | Ne modifie que le premier WAIT de la barre (`CopWaitLine`) | Le second WAIT reste en `$31` : dès que la barre descend, il est déjà dépassé et le noir revient aussitôt, la barre disparaît. Il faut déplacer les deux WAIT (version corrigée : chapitre 6, exercice « La barre qui disparaît »). | **Bug** |
| 6 ex. 2 | La routine `VBL_UpdateBar` n'est appelée nulle part | Il faut l'appeler une fois par image (attente du faisceau ou routine d'interruption de niveau 3, vecteur $6C). | Incomplet |
| 6 ex. 3 | `move.l BufferPtr(pc),a1` | Juste, mais `move.l d0,BufferPtr` écrit dans le programme : possible ici (le programme est en RAM), à éviter si le code est en ROM ou partagé. | Remarque |
| 3 | Copper : « SKIP saute l'instruction suivante si le balayage a dépassé la position » | Juste. | — |

Vérifiés justes : ExecBase en `$4` ; OpenLibrary = −552, Forbid = −132, Permit = −138, AllocMem
= −198, FreeMem = −210 ; MEMF_CHIP = 2, MEMF_CLEAR = $10000 ; bouton gauche = bit 6 de `$BFE001` ;
COLOR00 = `$DFF180` ; fin de liste Copper `$FFFF,$FFFE` ; DMACONR = `$002`, INTENAR = `$01C`.

Les décalages de la table d'*Amiga Machine Language* (Abacus) sont faux pour quelques fonctions
(dos : Delay −198 et non −162, IoErr −132 et non −108 ; graphics : LoadRGB4 −192, SetRGB4 −288,
SetAPen −342, OwnBlitter −456, DisownBlitter −462) : vérifiés contre les fichiers d'interface.

L'ancienne fiche « Amiga : Custom Chips et techniques de démo » (version 0.1) donnait 9 adresses
de registres fausses et inversait les deux CIA : corrigée.
