## La VBL, sans attente active

`attendre_vbl` occupe le 68000 à regarder le faisceau, et il ne fait rien d'autre pendant ce temps.
Paula fait mieux : au début de chaque image, elle demande une interruption, la **VBL** (*Vertical
BLank*, bit 5 de `INTREQ`, nommé VERTB). Le 68000 s'interrompt, exécute une routine, puis revient
là où il en était.

Sur l'Amiga, la VBL est une interruption de niveau 3, comme celles du Copper (COPER, bit 4) et du
Blitter (BLIT, bit 6), et le 68000 trouve l'adresse de la routine dans le vecteur `$6C`.

## Installer sa routine

Après `prendre`, qui a noté l'ancien vecteur, on installe sa routine et on autorise
l'interruption :

```asm
    MOVE.L  #vbl,$6C.W      ; le vecteur de niveau 3
    MOVE.W  #$C020,$9A(A5)  ; INTENA : SET + INTEN + VERTB
```

## Écrire la routine

```asm
vbl:
    MOVEM.L D0-D7/A0-A6,-(SP)   ; ne rien abîmer : le programme principal a été interrompu
    ; ... le travail de l'image ...
    MOVE.W  #$0020,$DFF09C      ; INTREQ : la demande VERTB est traitée
    MOVEM.L (SP)+,D0-D7/A0-A6
    RTE                         ; retour d'exception
```

La routine sauvegarde les registres qu'elle utilise et les restaure, puisqu'elle interrompt le
programme principal n'importe où. Elle **efface sa demande** dans `INTREQ`, avec le bit 15 à 0 et
le bit 5 à 1 ; sinon Paula la maintient, et dès le `RTE` le 68000 repart dans la routine, encore et
encore, sans que le programme principal tourne plus jamais. Elle se termine enfin par `RTE`, et non
par `RTS`, pour récupérer aussi le registre d'état empilé.

Sur les Amiga plus rapides (68020 et plus), on écrit souvent deux fois dans `INTREQ`, car la
première écriture peut ne pas être arrivée à Paula quand le `RTE` s'exécute. Sur un A500, une fois
suffit.

`rendre` remet le vecteur `$6C` du système, et c'est pour cela que `prendre` l'avait noté.

**Sur un Amiga 1200 ou 4000.** À partir du 68010, le processeur a un registre VBR qui dit où se
trouve la table des vecteurs. Le système la range souvent en Fast RAM, et écrire en `$6C` ne sert
alors plus à rien : la routine n'est jamais appelée. `prendre` s'en occupe pour toi en ramenant la
table en `$0` sur un 68010 ou plus, le temps du programme, et `rendre` la remet en place. Sur un
A500 (68000), le problème n'existe pas. (Vérifié dans WinUAE avec le Kickstart AROS en 68020.)

## Le Copper déclenche une interruption

Le Copper peut écrire dans `INTREQ` (`$09C`), qui est au-dessus de `$80` : `DC.W $009C,$8010`
demande l'interruption COPER au moment précis où le Copper arrive à cette ligne de la liste. La
routine de niveau 3 regarde alors `INTREQR` pour savoir qui l'a appelée :

```asm
    BTST    #4,$DFF01F      ; bit 4 de INTREQR : le Copper ?
    BNE.S   .copper
```
