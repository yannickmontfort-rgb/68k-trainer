## Le processeur clavier, l'IKBD

Le clavier du ST n'est pas un simple ensemble d'interrupteurs : il contient son **propre
microprocesseur** (un HD6301), l'**IKBD** (*Intelligent KeyBoarD*). Il surveille les touches, la
souris **et les deux prises joystick**, et envoie ce qu'il voit au ST par une liaison série :

```
IKBD ──série──> ACIA ($FFFC00) ──interruption──> MFP 68901 ──niveau 6──> 68000
```

Chaque octet reçu déclenche une interruption (vecteur `$118`). Le TOS lit l'octet en `$FFFC02` et
reconnaît :

- un **code de touche** (enfoncée, ou relâchée si le bit 7 est à 1) ;
- un **paquet** qui commence par un en-tête de `$F6` à `$FF` : souris (`$F8`-`$FB`), horloge
  (`$FC`), joysticks (`$FD`, `$FE`, `$FF`)…

## La table Kbdvbase

Quand un paquet est complet, le TOS appelle une routine dont l'adresse est rangée dans une table
de 9 vecteurs, renvoyée par **XBIOS 34, `Kbdvbase`** :

| Offset | Vecteur | Appelé pour… |
|---|---|---|
| 12 | `statvec` | les réponses d'état de l'IKBD |
| 16 | `mousevec` | les paquets de la souris |
| 20 | `clockvec` | l'horloge |
| **24** | **`joyvec`** | **les paquets des joysticks** |
| 32 | `ikbdsys` | chaque octet reçu (le cœur du système) |

Par défaut, `joyvec` ne fait rien (un simple `RTS`). Pour lire le joystick, on y installe **sa
propre routine**. Le TOS l'appelle avec **A0 = l'adresse du paquet**, rangé ainsi :

| Octet | Contenu |
|---|---|
| `0(A0)` | l'en-tête du dernier paquet (`$FE` : joystick 0, `$FF` : joystick 1) |
| `1(A0)` | l'état du **joystick 0** (prise de la souris) |
| `2(A0)` | l'état du **joystick 1** (la prise « joystick », celle des jeux) |

Attention : la routine 7.4 du manuel inverse les deux (elle lit le joystick 1 en `1(A0)`). C'est
vérifié dans le code source du TOS libre EmuTOS.

## L'état d'un joystick

Un octet : **bit 0** haut, **bit 1** bas, **bit 2** gauche, **bit 3** droite, **bit 7** bouton de
tir. Deux directions peuvent être actives à la fois (diagonale) : `%10001001` = haut + droite + tir.

## Les règles d'une routine d'interruption

`joyvec` est appelée **pendant une interruption** : le programme principal a été arrêté au milieu
d'une instruction quelconque. La routine doit donc :

- être **courte** (lire l'état, le ranger dans une variable, `RTS`) ;
- ne modifier que les registres que le TOS a sauvegardés pour elle (**D0-D3 et A0-A3**) : tous les
  autres appartiennent au programme interrompu ;
- se terminer par **`RTS`** (c'est le TOS qui fait le `RTE`).

Et le programme qui l'a installée doit **remettre l'ancien vecteur avant de quitter** : sinon, au
prochain mouvement du joystick, le TOS sautera dans la mémoire d'un programme qui n'existe plus…
et ce seront les bombes.
