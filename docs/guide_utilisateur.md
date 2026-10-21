# 68k Trainer — guide de l'utilisateur

68k Trainer apprend l'assembleur du **Motorola 68000** en programmant un **Atari ST** ou un
**Amiga 500** simulés. Pas besoin de vraie machine, ni d'émulateur, ni de Devpac : tout est dans
l'application. Pour aller plus loin, elle sait aussi installer deux émulateurs d'étude (Hatari et
WinUAE) et y lancer tes programmes.

## Installer

Les fichiers sont sur la page des *releases* du projet GitHub.

**Windows**, au choix :

- **`68k Trainer Setup x.y.z complet.exe`** : l'installeur avec les **émulateurs d'étude
  embarqués** (Hatari et WinUAE, environ 150 Mo) : ils s'installent sans Internet ;
- **`68k Trainer Setup x.y.z.exe`** : l'installeur **léger** (environ 100 Mo) : les émulateurs
  choisis sont téléchargés depuis leurs sites officiels au premier lancement ;
- **`68k Trainer x.y.z complet.exe`** / **`68k Trainer x.y.z.exe`** : les versions **portables**
  (sans installation, par exemple sur une clé USB) ; les émulateurs s'y installent depuis l'onglet
  **Émulateurs**.

L'installeur propose une page **« Émulateurs d'étude »** : coche Hatari (Atari ST), WinUAE
(Amiga), les deux ou aucun. Tu pourras toujours les installer ou les retirer plus tard depuis
l'onglet **Émulateurs**.

L'application n'est pas encore signée : au premier lancement, Windows SmartScreen peut afficher
« Windows a protégé votre ordinateur ». Clique sur **Informations complémentaires**, puis
**Exécuter quand même**.

**Linux**, au choix :

- le fichier **`.AppImage`** : rends-le exécutable (`chmod +x`, ou Propriétés →
  Permissions), puis double-clique dessus ; rien à installer ;
- le fichier **`.deb`** (Debian, Ubuntu, Lubuntu, Mint…) :
  `sudo apt install ./68k-Trainer-x.y.z-x64.deb` (avec le nom exact du fichier). L'application apparaît dans le menu Éducation.

**macOS** (11 Big Sur ou plus récent, Mac Intel ou Apple Silicon) : ouvre le **`.dmg`** et glisse
68k Trainer dans Applications. L'application n'étant pas signée par Apple, le premier lancement se
fait par un **clic droit → Ouvrir** (puis « Ouvrir » dans la fenêtre d'avertissement).

## Les écrans

| Onglet | À quoi il sert |
|---|---|
| **Parcours** | Le cours guidé de la machine choisie : 8 chapitres pour l'Atari ST, 10 pour l'Amiga (les 3 premiers, le 68000, sont communs). C'est là qu'on commence. |
| **Bac à sable** | Un vrai éditeur pour tes propres programmes : **Ouvrir**, **Enregistrer** (Ctrl+O, Ctrl+S), assembler, exécuter pas à pas, exporter, essayer dans l'émulateur. Le bouton **Exemple** remet le programme d'exemple. |
| **Fiches** | Tous les **cours du parcours**, rangés par chapitre, à relire quand tu veux, et les **fiches de référence** (68000, TOS, MFP, Ligne A et GEM, registres matériels ; Exec, bibliothèques, puces custom de l'Amiga). |
| **Exercices libres** | Tous les **exercices du parcours** (défis bonus compris), dans l'ordre que tu veux, et des exercices d'entraînement par niveau. Un exercice réussi ici compte aussi dans le parcours. |
| **Émulateurs** | Installer, lancer ou retirer Hatari et WinUAE, ouvrir leur dossier de partage. |
| **À propos** | Version, crédits, gestion du profil. |

La machine (Atari ST ou Amiga 500) se change à tout moment en haut à droite.

## Le parcours

En haut, la **barre de progression** montre où tu en es dans tout le parcours, et le nombre de
chapitres terminés. Les **défis bonus ★** sont comptés à part : ils sont facultatifs.

À gauche, le **sommaire** liste les chapitres, leurs notions (○ pas commencée, ◐ en cours,
● terminée) et chaque étape (✓ quand elle est faite). Le bouton **Reprendre** te ramène là où tu
t'étais arrêté, même après avoir fermé l'application.

Chaque notion enchaîne plusieurs types d'étapes :

- 📖 **Cours** : lis-le, puis clique sur « J'ai lu ce cours ».
- 🧪 **Exemple corrigé** : clique sur **Pas suivant** pour exécuter une instruction à la fois.
  Sous le code, une explication te dit ce que la ligne vient de faire ; à droite, les registres
  qui ont changé s'allument en jaune.
- 🔮 **Prédiction** : lis le programme et réponds aux questions **sans l'exécuter**. Ensuite
  seulement, « Vérifier en exécutant » montre ce qui se passe vraiment.
- ✏️ **Exercice** : à compléter (niveau ●○○), guidé (●●○) ou en autonomie (●●●), parfois un
  programme bogué à corriger ou des lignes à remettre dans l'ordre. **Vérifier** assemble et
  exécute ton programme, puis compare le résultat à ce qui est attendu. En cas d'échec, des pistes
  de débogage s'affichent. Les **indices** se débloquent un par un ; la **solution** devient
  visible quand tu as vu tous les indices ou après trois essais.
- ❓ **QCM de fin de chapitre** : il faut 70 % de bonnes réponses pour valider le chapitre. Tu peux
  recommencer autant de fois que tu veux, sans pénalité.

Ton code est gardé automatiquement : si tu quittes un exercice, tu le retrouves en revenant.

Dès qu'un chapitre est validé, le bouton **📜 Attestation de progression** (en haut) fabrique un
PDF à imprimer : ton nom, la date et les chapitres validés. Quand tout le parcours est terminé, il
devient **📜 Mon certificat**.

## Le panneau de pas à pas

| Zone | Contenu |
|---|---|
| Écran | L'écran de l'Atari en basse résolution (320 × 200, 16 couleurs), quand l'exercice l'utilise |
| Registres | D0-D7, A0-A7, PC, et les deux piles USP et SSP |
| Registre d'état | SR en hexadécimal, puis ses bits : T, S, masque d'interruption, X N Z V C ; dessous, les cycles écoulés, le temps et le numéro d'image |
| Désassemblage | Les instructions à partir du PC, telles que le processeur va les lire |
| Pile | Les six mots longs au sommet de la pile (le premier est pointé par A7) |
| Mémoire | 128 octets à partir de l'adresse choisie ; les octets qui viennent d'être écrits s'allument |
| Sortie texte | Ce que le programme a affiché (Cconws, Cconout…) |
| Vecteurs et matériel | (à déplier) les vecteurs utiles, les variables système, les registres du MFP et de la puce sonore |

**Points d'arrêt** : clique dans la marge à gauche des numéros de ligne (un point rouge apparaît).
« Jusqu'au bout » et « Temps réel » s'arrêtent avant cette ligne.

**🎬 Temps réel** : exécute le programme à la vitesse d'un vrai ST (8 MHz, 50 images par seconde),
avec le son. Le bouton devient « Arrêter » ; tu peux ensuite continuer pas à pas.

**Clavier et joystick** : clique sur l'écran du ST, il reçoit alors les touches de ton clavier.
Coche « 🕹 Flèches + Espace = joystick » pour piloter le joystick avec les flèches et Espace ; une
manette branchée sur l'ordinateur marche aussi. La case « 🔊 Son » coupe ou remet le son.

## La machine simulée

- Un **68000** complet : toutes les instructions sauf les calculs BCD (ABCD, SBCD, NBCD), les
  modes utilisateur et superviseur, les exceptions (bombes), les interruptions.
- Un **Atari 1040 STF** : 1 Mo de mémoire, écran en `$F8000`, palette de 512 couleurs, zones
  protégées en mode utilisateur ; la **VBL** à 50 Hz, le **MFP 68901** (timers, interruptions,
  rasters avec le timer B), le **clavier IKBD** (touches, joysticks) et la puce sonore **YM2149**.
  Le temps est compté en cycles (approximation : 4 cycles par accès mémoire, plus les calculs
  longs).
- Un **TOS simulé** : les fonctions les plus utiles du GEMDOS (Cconws, Cconout, Cnecin, Cconis,
  Pterm0, Super…), du BIOS (Bconout, Setexec, Kbshift…) et du XBIOS (Physbase, Setscreen,
  Setpalette, Setcolor, Vsync, Supexec, Kbdvbase, Giaccess, Dosound…). Ses routines
  d'interruption (VBL, timer C, clavier) sont du vrai code 68000 en ROM, qu'on peut détourner.
- L'assembleur, écrit pour 68k Trainer, est **compatible Devpac**. Un programme sans `ORG` est
  chargé en `$1000`, avec de vraies sections `TEXT`, `DATA` et `BSS` (dans cet ordre en mémoire, comme
  sous TOS). Macros, `REPT`, `IF…`, `RS`, `INCLUDE` et `INCBIN` sont pris en charge. Comme Devpac, l'assembleur assemble exactement ce que tu écris (aucune instruction remplacée par une autre) et aligne automatiquement les instructions et les données `.W`/`.L` sur une adresse paire, avec un avertissement. Une étiquette seule sur sa ligne n'est pas déplacée : pense à `EVEN`.

## Exporter, et essayer dans un émulateur

Le bouton **Exporter** (bac à sable, et exercices réussis) fabrique un vrai programme : un `.PRG`
pour l'Atari ST, un exécutable AmigaDOS pour l'Amiga. Copie-le sur la disquette ou le disque d'une
vraie machine, ou dans le dossier de partage d'un émulateur. Sur l'Atari, termine ton programme par
`Pterm0` (`CLR.W -(SP)` puis `TRAP #1`) ; sur l'Amiga, par `RTS` avec un code de retour dans D0
(`MOVEQ #0,D0`).

Le bouton **Essayer dans Hatari / WinUAE** fait tout d'un coup : il assemble, dépose le programme
dans le dossier de partage, (re)démarre l'émulateur et y lance le programme.

## Les émulateurs d'étude

68k Trainer installe deux émulateurs libres, **réglés pour l'étude** (pas pour les jeux), avec des
systèmes libres : **aucune ROM d'origine** (TOS, Kickstart) n'est fournie, elles sont protégées par
le droit d'auteur.

| Émulateur | Machine | Système | Dossier de partage (dans tes Documents) |
|---|---|---|---|
| **Hatari** 2.6.1 | Atari ST, 1 Mo | EmuTOS | `68k Trainer\Atari` = le disque **C:** de l'Atari |
| **WinUAE** 6.0.3 | Amiga 68020 (AGA) | AROS (le Kickstart libre ; il demande un 68020) | `68k Trainer\Amiga` = le disque **PARTAGE:** de l'Amiga |

- Sur l'Atari, le programme essayé se lance dès que le bureau d'EmuTOS est prêt, puis attend une
  touche avant de revenir au bureau.
- Sur l'Amiga, AROS démarre en une vingtaine de secondes, puis le programme s'ouvre dans une fenêtre
  console qui reste affichée.
- Un seul exemplaire de chaque émulateur tourne à la fois : un nouvel essai le redémarre.
- Les émulateurs s'installent dans ton dossier utilisateur (`%LOCALAPPDATA%\68k Trainer`), sans
  droits d'administrateur ; leurs réglages sont à part de ceux d'un Hatari ou d'un WinUAE que tu
  aurais déjà. Désinstaller 68k Trainer les retire, mais garde tes dossiers de partage.
- Pour l'instant, cette installation automatique existe sous **Windows** ; sous Linux et macOS,
  installe Hatari ou FS-UAE toi-même.

## Les profils

Au lancement, l'écran **« Qui es-tu ? »** liste les profils de l'ordinateur. Chacun a sa propre
progression et ses propres brouillons de code. S'il n'y a qu'un profil sans mot de passe, il
s'ouvre directement.

- **Nouveau profil** : un prénom ou un pseudo, et un **mot de passe facultatif**. Le mot de passe
  empêche les autres d'ouvrir ton profil dans l'application ; il n'est jamais enregistré en clair.
  Ce n'est pas un coffre-fort : les fichiers restent sur le disque.
- **Changer de profil** : bouton en haut à droite.
- **Mon profil** (onglet À propos) : renommer, ajouter, changer ou retirer le mot de passe,
  remettre la progression à zéro, supprimer le profil.
- **Exporter mon profil** (onglet À propos) crée un fichier `.68kprofil` ; **Importer un profil**
  (écran « Qui es-tu ? ») le recrée sur un autre ordinateur, avec sa progression et ses brouillons.
  C'est la façon de passer de la maison au lycée.
- **Tableau de suivi** (écran « Qui es-tu ? », dès qu'il y a plusieurs profils) : la progression de
  chaque profil, chapitre par chapitre. Il ne montre ni le code ni les mots de passe.

Tout reste sur l'ordinateur : aucun compte en ligne, aucun serveur. Les données sont dans le
dossier de l'application (un dossier par profil) : `%APPDATA%\trainer-68k` sous Windows,
`~/.config/trainer-68k` sous Linux, `~/Library/Application Support/trainer-68k` sous macOS. La progression d'une version précédente est
reprise automatiquement dans un profil nommé « Moi ».
