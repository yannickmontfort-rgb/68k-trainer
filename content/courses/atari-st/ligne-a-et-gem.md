---
title: "Ligne A et GEM (AES/VDI)"
source: "cours_asm_68000.pdf — Le Féroce Lapin, Volume 2, cours 7 à 9 (adapté, aperçu et non exhaustif)"
themes: ["graphisme", "gem"]
---

# Ligne A et GEM (AES/VDI)

> Cette fiche donne une vue d'ensemble — le GEM est vaste, et le cours source lui-même le dit :
> "levez un coin du voile", pas une référence complète. Bon point de départ pour comprendre
> l'architecture avant d'aller chercher la doc officielle (Bible ST / Livre du développeur) sur une
> fonction précise.

## La Ligne A : les primitives graphiques du 68000... pas de l'Atari

Le mnémonique `$Axxx` (poids fort `$A`) n'est **pas une instruction 68000 valide** — c'est le
68000 lui-même qui traite tout opcode commençant par `$A` comme une exception, et saute au
**vecteur 10** (adresse `$28`) pour trouver une routine de traitement. Ce mécanisme d'"émulateur
ligne A" est une fonctionnalité générique du 68000 ; c'est l'Atari ST qui l'exploite en y branchant
**16 routines graphiques de bas niveau** (numérotées 0 à 15 : point, ligne, rectangle plein,
transfert de bloc, curseur souris, sprites, etc.) — le même mécanisme aurait pu servir à autre chose
sur une autre machine 68000.

```asm
DC.W $A003   ; appelle la fonction ligne A numéro 3 (tracé de ligne) —
             ; pas une instruction reconnue par l'assembleur, juste une donnée
             ; que le 68000 interprète comme un déclencheur d'exception
```

**Les paramètres ne passent pas par la pile** (contrairement à GEMDOS/BIOS/XBIOS) mais par
**5 tableaux partagés** que la ligne A remplit/consulte à des positions précises :

| Tableau | Rôle |
|---|---|
| `CONTRL` | numéro de fonction + quelques paramètres de contrôle |
| `INT_IN` | paramètres entiers en entrée |
| `PTSIN` | coordonnées/dimensions en entrée (toujours par paires X,Y) |
| `INTOUT` | résultats entiers |
| `PTSOUT` | coordonnées en sortie |

> **Ces mêmes tableaux sont partagés avec le GEM** — un appel GEM (menu déroulant, etc.) pendant
> qu'on utilise la ligne A peut donc écraser leur contenu entre deux de vos appels. Toujours
> re-remplir les tableaux juste avant chaque appel, ne jamais supposer qu'ils gardent leur valeur.

## Le GEM : AES + VDI

Accessible via `TRAP #2`, le GEM se divise en deux parties complémentaires :

- **VDI** (*Virtual Device Interface*) — dessin indépendant du périphérique (écran, imprimante,
  table traçante...) : cercles, lignes, rectangles, texte stylisé.
- **AES** (*Application Environment System*) — les objets d'interface : fenêtres, menus, boîtes de
  dialogue, gestion des événements souris/clavier.

Comme la ligne A, les appels GEM passent par des tableaux partagés plutôt que par la pile — 6 pour
l'AES (`CONTROL`, `GLOBAL`, `INT_IN`, `INT_OUT`, `ADDR_IN`, `ADDR_OUT`), 5 pour le VDI (`CONTRL`,
`INTIN`, `PTSIN`, `INTOUT`, `PTSOUT` — attention à l'orthographe, différente de celle de la ligne A
malgré la ressemblance). Vu le nombre de paramètres et leur position exacte à respecter, les appels
GEM se font quasi systématiquement via des **macros** fournies par la bibliothèque de l'assembleur
plutôt qu'à la main.

**Concepts clés du modèle GEM** :
- **APP_ID** — numéro attribué par `APPL_INIT` à chaque application active (programme principal ou
  accessoire de bureau, ACC) ; valable seulement pour la durée de vie de l'application en mémoire.
- **HANDLE** — numéro d'identification d'une fenêtre (ou d'un périphérique VDI) obtenu à l'ouverture.
- **Boucle d'événements** — un programme GEM passe le plus clair de son temps à *attendre* un
  événement (clic, appui touche...) que le GEM lui signale par un message ; ce n'est pas du
  multitâche réel (impossible sur un simple 68000), mais plusieurs applications peuvent coexister
  et se partager l'attention de l'utilisateur.

## Pièges pratiques retenus du cours

- **Compatibilité TT/68030** : une adresse système documentée comme `$FF8800` doit être écrite
  `$FFFF8800` (32 bits complets) pour rester valide sur une machine à bus d'adresse plus large que
  le ST d'origine.
- **FDB (Form Definition Block)** : structure décrivant une surface (largeur, hauteur, nombre de
  plans) pour une copie de bloc (`Vro_cpy`). Remplie de zéros, elle désigne automatiquement l'écran
  sans avoir à en demander les caractéristiques exactes.
- **Conventions d'ergonomie** (héritées du monde Mac, reprises par convention sur ST) : les entrées
  de menu ouvrant un dialogue se terminent par "..." ; `TAB`/`Shift+TAB` navigue entre champs
  éditables d'un formulaire ; `CONTROL+X/C/V` pour couper/copier/coller. Un accessoire de bureau
  doit rester petit et discret par nature.
- **Bits inutilisés des objets de ressource** : le format d'objet GEM ne réserve que 9 bits sur 16
  pour ses flags standards — les 7 bits restants peuvent servir à stocker des données personnalisées
  (par exemple un raccourci clavier associé à cet objet).

## Hors périmètre de ce trainer

L'émulateur de ce trainer ne simule ni la ligne A, ni GEMDOS/AES/VDI — ces fiches restent donc de
la culture générale/lecture plutôt que des exercices vérifiables (voir la note dans
[content/exercises/README.md](../../exercises/README.md)). Reste à extraire : les interruptions du
MFP68901 (cours 10, dernier du Volume 2).
