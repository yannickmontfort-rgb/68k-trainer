## Le processeur clavier, l'IKBD

Le clavier du ST contient son propre microprocesseur, un HD6301, l'**IKBD** (*Intelligent
KeyBoarD*). Il surveille les touches, la souris et les deux prises joystick, et envoie ce qu'il
voit au ST par une liaison série :

```text
IKBD ──série──> ACIA ($FFFC00) ──interruption──> MFP 68901 ──niveau 6──> 68000
```

Chaque octet reçu déclenche une interruption (vecteur `$118`). Le TOS lit l'octet en `$FFFC02` et y
reconnaît soit un code de touche, enfoncée ou relâchée quand le bit 7 est à 1, soit le début d'un
paquet, dont l'en-tête va de `$F6` à `$FF` : souris (`$F8`-`$FB`), horloge (`$FC`), joysticks
(`$FD`, `$FE`, `$FF`).

## La table Kbdvbase

Quand un paquet est complet, le TOS appelle une routine dont l'adresse est rangée dans une table de
9 vecteurs, que renvoie XBIOS 34, `Kbdvbase` :

| Offset | Vecteur | Appelé pour… |
|---|---|---|
| 12 | `statvec` | les réponses d'état de l'IKBD |
| 16 | `mousevec` | les paquets de la souris |
| 20 | `clockvec` | l'horloge |
| 24 | `joyvec` | les paquets des joysticks |
| 32 | `ikbdsys` | chaque octet reçu (le cœur du système) |

Par défaut, `joyvec` pointe sur un simple `RTS`. Pour lire le joystick, on y installe sa propre
routine, que le TOS appelle avec A0 = l'adresse du paquet :

| Octet | Contenu |
|---|---|
| `0(A0)` | l'en-tête du dernier paquet (`$FE` : joystick 0, `$FF` : joystick 1) |
| `1(A0)` | l'état du joystick 0 (prise de la souris) |
| `2(A0)` | l'état du joystick 1 (la prise « joystick », celle des jeux) |

La routine 7.4 du manuel inverse les deux et lit le joystick 1 en `1(A0)` ; la disposition
ci-dessus est vérifiée dans le code source du TOS libre EmuTOS.

## L'état d'un joystick

L'état tient dans un octet : bit 0 haut, bit 1 bas, bit 2 gauche, bit 3 droite, bit 7 bouton de
tir. Deux directions peuvent être actives à la fois, en diagonale : `%10001001` signifie haut, droite
et tir.

## Une routine d'interruption

`joyvec` est appelée pendant une interruption, alors que le programme principal a été arrêté entre
deux instructions quelconques. La routine reste donc courte : elle lit l'état, le range dans une
variable et se termine par `RTS`, puisque c'est le TOS qui fait le `RTE`. Elle ne modifie que les
registres que le TOS a sauvegardés pour elle, D0-D3 et A0-A3, car tous les autres appartiennent au
programme interrompu.

Le programme qui l'a installée **remet l'ancien vecteur avant de quitter** : sinon, au prochain
mouvement du joystick, le TOS sauterait dans la mémoire d'un programme qui n'existe plus, et ce
seraient les bombes.
