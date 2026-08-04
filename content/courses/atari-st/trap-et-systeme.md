---
title: "TRAP, GEMDOS/BIOS et reprogrammation des vecteurs"
source: "cours_asm_68000.pdf — Le Féroce Lapin, Volume 2, cours 2 (adapté)"
themes: ["trap", "systeme"]
---

# TRAP, GEMDOS/BIOS et reprogrammation des vecteurs

> Prérequis : la notion de vecteur d'exception et le mécanisme général de `TRAP` sont introduits
> dans le tronc commun, voir [pile-et-sous-programmes.md](../general/pile-et-sous-programmes.md#hors-périmètre-de-ce-trainer).
> Ce qui suit est **spécifique au TOS** (le système d'exploitation de l'Atari ST) et à ses
> conventions d'appel — ça ne s'applique à aucune autre machine 68000.

## Les trois familles d'appels système

Le TOS expose ses services via trois numéros de `TRAP`, chacun avec ses propres fonctions
numérotées (passées sur la pile) :

| Trap | Famille | Exemple de fonction |
|---|---|---|
| `TRAP #1` | **GEMDOS** — gestion fichiers, console, mémoire | fonction 9 = `Cconws()` (afficher une chaîne) |
| `TRAP #13` | **BIOS** — entrées/sorties bas niveau | fonction 3 = `Bconout()` (afficher un caractère) |
| `TRAP #14` | **XBIOS** — extensions spécifiques ST (son, écran, disque) | fonction 5 = `Setexec()` (fixer un vecteur) |

Un appel typique empile ses paramètres (dans l'ordre inverse), puis le numéro de fonction, déclenche
le `TRAP`, puis nettoie la pile au retour :

```asm
MOVE.L #MESSAGE,-(SP)   ; paramètre : adresse de la chaîne à afficher
MOVE.W #9,-(SP)         ; numéro de fonction GEMDOS : Cconws
TRAP   #1                ; appel GEMDOS
ADDQ.L #6,SP             ; nettoie la pile (4 + 2 octets empilés)

MESSAGE DC.B "BONJOUR",0
```

## Reprogrammer un vecteur TRAP (Setexec)

La fonction XBIOS `Setexec()` (numéro 5) permet de **lire ou remplacer** l'adresse associée à un
vecteur d'exception matériel (pas les traps eux-mêmes, mais par exemple les vecteurs d'interruption
du type "changement de résolution").

```asm
MOVE.L #ROUGE,-(SP)   ; nouvelle adresse de routine
MOVE.W #35,-(SP)       ; numéro du vecteur à modifier
MOVE.W #5,-(SP)         ; fonction Setexec()
TRAP   #14
ADDQ.L #8,SP

ROUGE   MOVE.W #$700,$FF8240   ; couleur 0 = rouge (palette RVB, 3 bits par composante)
        RTE                     ; PAS RTS : retour d'exception, pas de sous-programme
```

> **`RTE` (Return from Exception), pas `RTS`** : une routine appelée en tant que gestionnaire de
> vecteur d'exception doit se terminer par `RTE`, car le mécanisme de retour est différent d'un
> `BSR`/`RTS` classique.

**Astuce (interception de trap)** : passer `-1` comme nouvelle adresse à `Setexec()` fait
qu'il **retourne** dans D0.L l'adresse *actuelle* du vecteur au lieu de la remplacer — ce qui permet
de sauvegarder la routine d'origine avant de la remplacer par la sienne (utile pour intercepter tous
les appels à une fonction système, y traiter un cas particulier, puis rappeler la routine d'origine
pour le reste).

## Pile et TRAP : ce qui diffère d'un simple BSR

Un `TRAP` passe le processeur en mode Superviseur : en plus de l'adresse de retour (4 octets), il
empile **aussi le Status Register** (2 octets), soit **6 octets au total** — à ne pas oublier si
l'on doit calculer un décalage pour aller lire des paramètres empilés avant le `TRAP` depuis
l'intérieur de la routine appelée (contre 4 octets seulement pour un `BSR` classique).

**Note sur l'imbrication** : un trap ne peut appeler qu'un trap "en dessous" de lui (numéro
inférieur) — depuis une routine appelée via `TRAP #1`, on peut appeler `TRAP #13`, mais pas
l'inverse. En pratique, `Cconws()` (GEMDOS) appelle en interne le BIOS pour afficher réellement les
caractères à l'écran — on peut l'observer en activant le suivi des traps ("follow traps") dans un
débogueur comme MONST.

## Registres et TRAP : attention à D2

Les routines système ne sauvegardent **pas tous les registres** avant de travailler : seuls
`D3-D7` et `A3-A6` sont préservés. **`D0`, `D1`, `D2`, `A0`, `A1`, `A2` peuvent être écrasés** par
n'importe quel appel système (D0/D1 servent d'ailleurs souvent à retourner un résultat). Ne jamais
compter sur la survie de ces registres après un `TRAP` — les sauvegarder explicitement si besoin.

On y croise aussi le terme **USP** (*User Stack Pointer*) : la pile utilisateur, distincte de la
pile superviseur (`A7'`, voir le tronc commun) utilisée pendant l'exécution de la routine système
elle-même.

## Hors périmètre de ce trainer

Ce cours continue avec les macros et l'inclusion de fichiers, les tableaux, l'auto-modification de
code, la Ligne A et le GEM (AES/VDI) — pas encore extrait dans cette fiche. L'émulateur de ce
trainer ne simule ni le TOS, ni GEMDOS/BIOS/XBIOS, ni le GEM : ce contenu reste donc pour l'instant
de la lecture/compréhension plutôt que des exercices vérifiables automatiquement (voir la note dans
[content/exercises/README.md](../../exercises/README.md)).
