# Rapport de session — 68k Trainer V3 → version 1.0.0 (19/10/2026)

Session menée en autonomie sur **DARTHVADER**, d'après la roadmap V3 privée
(`Logiciels_Projets/Roadmaps/Roadmap_ClaudeCode_68kTrainer_V3.md`).

| | |
|---|---|
| Branche | `v3` (19 commits) ; `main` reste en 0.2.1, `version-0.2` garde la 0.2.x avec vasm |
| Version | **1.0.0** (pas encore taguée) |
| Tests | **433 tests** (431 verts + 2 Hatari facultatifs) et le typecheck ; comparaison complète avec vasm verte |
| Binaires Windows | `Nextcloud/Logiciels_Projets/68k-Trainer_binaires/` |

## 1. Ce qui a été fait, phase par phase

### Phase 0 — contenu validé
Badges « à relire » retirés, modèles d'*issue* GitHub pour signaler une erreur de cours.

### Phase 1 — notre propre assembleur
- **Assembleur 68000 maison** (`src/asm/`, TypeScript, sans dépendance), compatible Devpac et
  **identique octet par octet à `vasm -devpac`** sur tout le contenu et une matrice de toutes les
  instructions et modes d'adressage. Sections TEXT/DATA/BSS, macros, REPT, IF, RS, INCLUDE, INCBIN.
- **Messages d'erreur en français**, soulignés à la colonne près, avec suggestions
  (`MOVX` → « MOVE ? »). Avertissements pédagogiques : alignement, `#` oublié, étiquette seule
  restée à une adresse impaire.
- **Export .PRG** : vérifié pour de vrai dans Hatari 2.6.1 + EmuTOS.
- **Désassembleur** : relit un .PRG et redonne un source Devpac réassemblable à l'identique.
  En ligne de commande : `npm run asm` et `npm run desasm`.
- **L'application n'utilise plus vasm** : plus d'exécutable externe, ce qui débloque Linux, macOS
  et SignPath. vasm ne sert plus qu'aux tests de comparaison.

### Phase 4 — le simulateur grandit, et les chapitres 6 à 8
- **Temps** : compteur de cycles, **VBL à 50 Hz** (routine du TOS en vrai code 68000 en ROM,
  `_vblqueue`, `Vsync` qui attend vraiment), bouton **🎬 Temps réel** (8 MHz, 50 images/s).
- **MFP 68901** : interruptions, timers, timer C à 200 Hz, timer B en comptage de lignes → les
  **rasters** s'affichent (palette lue ligne par ligne).
- **Clavier IKBD et joysticks** : le clavier du PC est envoyé au ST quand on clique sur l'écran ;
  joystick aux flèches + Espace ou à la manette (API Gamepad). Les exercices utilisent des
  événements programmés.
- **Son YM2149** : 3 voies, bruit, enveloppes, rendu Web Audio en temps réel ; Giaccess, Dosound,
  cloche Ctrl+G.
- **Débogueur** : points d'arrêt (clic dans la marge), vue désassemblage, panneau « Vecteurs et
  matériel ».
- Correction du processeur : les adresses effectives restent sur 32 bits (`PEA -1.W` empile bien
  `$FFFFFFFF`).
- **Chapitre 6** (animation, double tampon, sprites au pixel près, miroir), **chapitre 7**
  (clavier, joystick, son, mélodie sous VBL), **chapitre 8** (sections, macros, INCBIN d'une image
  Degas, .PRG, cadre de pile, pièges classiques, bonnes pratiques, défi final : une intro avec logo,
  rasters et musique). Tous les codes sont exécutés par les tests.
- **Fin de parcours** : attestation de progression et **certificat en PDF** (nom, date, chapitres,
  scores des QCM).

### Phase 2 — multiplateforme
Polices de repli, menu macOS, chemins par système dans le guide, **icône** (une puce 68000 et la
bombe du ST), cibles **AppImage + .deb** (Linux) et **.dmg universel** (macOS 11+), workflows
GitHub Actions (tests sur les trois systèmes ; paquets à chaque tag).

### Phase 3 — SignPath
Le point bloquant (vasm, non libre) est levé. Le dossier `docs/signpath/DOSSIER_CANDIDATURE.md`
est à jour ; il reste les étapes qui te reviennent (ci-dessous).

### Retours d'utilisation de la 0.2 (`Retour utilisation.txt`), corrigés en 1.0.0
- **La solution ne se fermait pas** : bouton « Masquer la solution ».
- **Pas à pas qui « déconne »** : chaque clic sur « Pas à pas » créait une nouvelle exécution sur
  le même éditeur ; l'ancienne laissait sa ligne surlignée (deux surlignages) et les points
  d'arrêt basculaient en double. Une seule exécution désormais ; modifier le code pendant le pas à
  pas relance l'assemblage. Le « retour » qui partait dans la ROM (après `RTS` ou `Supexec`) est
  traversé d'un coup. Les soulignements rouges et jaunes des erreurs, bloqués par la politique de
  sécurité de la page, s'affichent de nouveau.
- **Plus moyen d'écrire dans l'exercice** : pas reproduit par navigation ; la cause la plus
  probable est un bug connu d'Electron sous Windows (après une boîte native `confirm`/`alert`,
  comme celle du bouton ↺, la saisie ne marche plus jusqu'au redémarrage). Les boîtes natives sont
  remplacées par des boîtes dans la page. **À revérifier de ton côté** avec la 1.0.0.

## 2. Erreurs du manuel trouvées et corrigées (voir `docs/errata_manuel_atari_v2.md`)
- **Routine 7.3** (sprite au pixel près) : alignement `$FFFE`, mot fort de D0 jamais remis à zéro,
  décalage sur 16 bits qui perd le débordement, `SWAP` sur un mot fort non préparé, `OR.B` sur le
  mauvais octet. Elle est devenue un exercice « à réparer ».
- **Routine 7.4** (joystick) : les deux joysticks sont **inversés** (`2(A0)` = joystick 1, la
  prise des jeux), vérifié dans le source d'EmuTOS ; et elle ne remet pas l'ancien vecteur.

## 3. Ce qui t'attend (dans l'ordre)
1. **Donner à GitHub le droit de pousser les workflows** : le jeton de DARTHVADER ne l'a pas,
   donc le dernier commit (les deux fichiers `.github/workflows/`) est resté **en local**. Dans un
   terminal : `gh auth refresh -h github.com -s workflow`, valide dans le navigateur, puis
   `git push origin v3` depuis le dossier du projet (ou demande-le-moi).
2. **Essayer la 1.0.0 sous Windows** (binaires dans le dossier habituel) : un chapitre 6 en
   « Temps réel », le « la » du chapitre 7 **à l'oreille** (le son n'a été vérifié que par les tests),
   le joystick au clavier dans le bac à sable, le certificat.
3. **Fusionner `v3` dans `main`** et **taguer `v1.0.0`** : GitHub construira alors les paquets
   Windows, Linux et macOS dans une release en brouillon, à relire puis publier.
4. **Linux** : sur le MacBook sous Lubuntu, essayer l'AppImage **et** le .deb de la release
   (fluidité du temps réel sur une machine ancienne).
5. **macOS** : faire essayer le .dmg à un copain avec un Mac récent (clic droit → Ouvrir).
6. **SignPath** : activer la double authentification sur GitHub, puis suivre le § 3 du dossier.

## 4. Limites connues
- Le compteur de cycles est une **approximation** (4 cycles par accès mémoire + calculs longs) :
  bon pour comprendre le budget d'une image, pas pour du code au cycle près.
- Pas de souris, pas de son numérique STE, pas de Blitter ; le BCD (ABCD, SBCD, NBCD) manque
  toujours.
- Le .dmg macOS n'est ni signé ni notarié par Apple : premier lancement par clic droit → Ouvrir.
