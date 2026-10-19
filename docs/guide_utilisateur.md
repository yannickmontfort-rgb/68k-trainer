# 68k Trainer — guide de l'utilisateur

68k Trainer apprend l'assembleur du **Motorola 68000** en programmant un **Atari ST simulé**.
Pas besoin de vrai ST, ni d'émulateur, ni de Devpac : tout est dans l'application.

## Installer

Deux versions Windows, au choix :

- **`68k Trainer Setup x.y.z.exe`** : un installeur classique (raccourci sur le bureau) ;
- **`68k Trainer x.y.z.exe`** : la version **portable**, qui se lance sans installation (par
  exemple depuis une clé USB).

L'application n'est pas signée : au premier lancement, Windows SmartScreen peut afficher « Windows
a protégé votre ordinateur ». Clique sur **Informations complémentaires**, puis **Exécuter quand
même**.

## Les écrans

| Onglet | À quoi il sert |
|---|---|
| **Parcours** | Le cours guidé, chapitre par chapitre. C'est là qu'on commence. |
| **Bac à sable** | Un éditeur libre pour essayer tes propres programmes, avec l'écran de l'Atari. |
| **Fiches** | Les fiches de référence de la première version (registres, pile, GEMDOS, Ligne A, MFP…). |
| **Exercices libres** | Les exercices de la première version, rangés par niveau. |
| **À propos** | Version, crédits, remise à zéro de la progression. |

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

## Le panneau de pas à pas

| Zone | Contenu |
|---|---|
| Écran | L'écran de l'Atari en basse résolution (320 × 200, 16 couleurs), quand l'exercice l'utilise |
| Registres | D0-D7, A0-A7, PC, et les deux piles USP et SSP |
| Registre d'état | SR en hexadécimal, puis ses bits : T, S, masque d'interruption, X N Z V C |
| Pile | Les six mots longs au sommet de la pile (le premier est pointé par A7) |
| Mémoire | 128 octets à partir de l'adresse choisie ; les octets qui viennent d'être écrits s'allument |
| Sortie texte | Ce que le programme a affiché (Cconws, Cconout…) |

## La machine simulée

- Un **68000** complet : toutes les instructions sauf les calculs BCD (ABCD, SBCD, NBCD), les
  modes utilisateur et superviseur, les exceptions (bombes), les interruptions.
- Un **Atari 1040 STF** : 1 Mo de mémoire, écran en `$F8000`, palette de 512 couleurs, zones
  protégées en mode utilisateur.
- Un **TOS simulé** : les fonctions les plus utiles du GEMDOS (Cconws, Cconout, Cnecin, Pterm0,
  Super…), du BIOS (Bconout, Setexec…) et du XBIOS (Physbase, Setcolor, Setpalette, Supexec…).
- L'assembleur, écrit pour 68k Trainer, est **compatible Devpac**. Un programme sans `ORG` est
  chargé en `$1000`, avec de vraies sections `TEXT`, `DATA` et `BSS` (dans cet ordre en mémoire, comme
  sous TOS). Macros, `REPT`, `IF…`, `RS`, `INCLUDE` et `INCBIN` sont pris en charge. Comme Devpac, l'assembleur assemble exactement ce que tu écris (aucune instruction remplacée par une autre) et aligne automatiquement les instructions et les données `.W`/`.L` sur une adresse paire, avec un avertissement. Une étiquette seule sur sa ligne n'est pas déplacée : pense à `EVEN`.

## Exporter vers un vrai Atari (ou Hatari)

Le bouton **Exporter .PRG** (bac à sable, et exercices réussis) fabrique un vrai programme TOS.
Lance-le dans l'émulateur [Hatari](https://hatari-emu.org) ou copie-le sur la disquette ou le
disque d'un vrai ST. Pense à terminer ton programme par `Pterm0` (`CLR.W -(SP)` puis `TRAP #1`)
pour revenir proprement au bureau.

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
