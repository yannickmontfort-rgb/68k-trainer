## Le TOS, une bibliothèque de services

Le **TOS** (*The Operating System*) est le système d'exploitation de l'Atari ST, gravé en ROM. Il
offre des centaines de **fonctions** toutes prêtes : afficher du texte, lire le clavier, ouvrir un
fichier, changer la résolution… On les appelle avec l'instruction **`TRAP`**, qui déclenche une
exception : le processeur passe en mode superviseur et saute dans le TOS.

| Appel | Couche | Exemples de fonctions |
|---|---|---|
| `TRAP #1` | **GEMDOS** : fichiers, mémoire, console | Cconws (afficher un texte), Cnecin (lire une touche), Pterm0 (terminer) |
| `TRAP #2` | **GEM** (AES/VDI) : fenêtres, menus, dessin | — |
| `TRAP #13` | **BIOS** : entrées-sorties de bas niveau | Bconout (envoyer un caractère), Setexec (changer un vecteur) |
| `TRAP #14` | **XBIOS** : matériel de l'Atari | Physbase (adresse de l'écran), Setcolor (couleur), Supexec |

## Passer les paramètres par la pile

Chaque appel suit le même rituel :

1. on **empile les paramètres**, du dernier au premier ;
2. on empile le **numéro de la fonction** (un mot) ;
3. on exécute **`TRAP #n`** ;
4. on **nettoie la pile** : on ajoute à SP le nombre d'octets empilés.

```asm
    PEA     MESSAGE         ; paramètre : l'adresse du texte (PEA empile 4 octets)
    MOVE.W  #9,-(SP)        ; fonction n° 9 du GEMDOS : Cconws (2 octets)
    TRAP    #1              ; appel du GEMDOS
    ADDQ.L  #6,SP           ; 4 + 2 = 6 octets à retirer
```

`PEA` (*Push Effective Address*) empile une **adresse** : c'est la façon habituelle de passer
l'adresse d'un texte ou d'une table.

Le nettoyage est **à ta charge**. Oublie-le, et la pile se déséquilibre : le prochain `RTS`
partira dans le décor (pour 8 octets ou moins, `ADDQ.L #n,SP` ; au-delà, `LEA n(SP),SP`).

## Ce que le TOS rend et ce qu'il abîme

- La **valeur de retour** d'une fonction est toujours dans **D0**.
- Le TOS **préserve D3-D7 et A3-A6**, mais il peut **modifier D0-D2 et A0-A2**. Ne compte jamais
  sur ces registres après un appel système.

## Quelques fonctions utiles

| Fonction | Appel | Paramètres (empilés avant le numéro) | À nettoyer |
|---|---|---|---|
| `Pterm0()` | GEMDOS 0 | — | (le programme se termine) |
| `Cconout(c)` | GEMDOS 2 | `MOVE.W #'A',-(SP)` | 4 |
| `Cnecin()` | GEMDOS 8 | — ; D0 : code ASCII en poids faible, code clavier en bits 16-23 | 2 |
| `Cconws(texte)` | GEMDOS 9 | `PEA TEXTE` (texte terminé par 0) | 6 |
| `Bconout(2,c)` | BIOS 3 | `MOVE.W #'A',-(SP)` puis `MOVE.W #2,-(SP)` (2 = écran) | 6 |
| `Physbase()` | XBIOS 2 | — ; D0 = adresse de l'écran affiché | 2 |
| `Setcolor(n,c)` | XBIOS 7 | `MOVE.W #couleur,-(SP)` puis `MOVE.W #n,-(SP)` | 6 |

Désormais, nos programmes se terminent proprement avec **`Pterm0`** :

```asm
    CLR.W   -(SP)           ; empile 0 : fonction Pterm0
    TRAP    #1              ; le GEMDOS termine le programme (pas de retour)
```

Dans 68k Trainer, le texte affiché apparaît dans la zone **Sortie texte** du panneau de pas à pas.
Les codes `13,10` (retour chariot, saut de ligne) passent à la ligne.
