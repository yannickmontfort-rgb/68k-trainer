## La VBL, sans attente active

`attendre_vbl` occupe le 68000 à regarder le faisceau : il ne fait rien d'autre. Paula sait
mieux faire : au début de chaque image, elle **demande une interruption**, la **VBL** (*Vertical
BLank*, bit 5 de `INTREQ`, nommé VERTB). Le 68000 s'interrompt, exécute une routine, puis revient
là où il en était.

Sur l'Amiga, la VBL est une interruption de **niveau 3**, comme celles du Copper (COPER, bit 4) et
du Blitter (BLIT, bit 6). Le 68000 trouve l'adresse de la routine dans le vecteur **`$6C`**.

## Installer sa routine

Après `prendre` (qui a noté l'ancien vecteur), on installe la sienne et on autorise l'interruption :

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

Trois règles :

1. **sauvegarder** les registres utilisés, et les restaurer ;
2. **effacer la demande** dans `INTREQ` (bit 15 à 0, bit 5 à 1). Sinon, Paula la maintient : dès
   le `RTE`, le 68000 repart dans la routine, encore et encore, et le programme principal ne
   tourne plus jamais ;
3. finir par **`RTE`**, pas `RTS` : il faut aussi récupérer le registre d'état empilé.

Sur les Amiga plus rapides (68020 et plus), on écrit souvent deux fois dans `INTREQ` : la première
écriture peut ne pas être arrivée à Paula quand le `RTE` s'exécute. Sur un A500, une fois suffit.

`rendre` remet le vecteur `$6C` du système : c'est pour cela que `prendre` l'avait noté.

**Sur un Amiga 1200 ou 4000.** À partir du 68010, le processeur a un registre **VBR** qui dit où
se trouve la table des vecteurs ; le système la range souvent en Fast RAM, et écrire en `$6C` ne
sert alors plus à rien : la routine n'est jamais appelée. `prendre` s'en occupe pour toi : sur un
68010 ou plus, il ramène la table en `$0` le temps du programme, et `rendre` la remet en place.
Sur un A500 (68000), le problème n'existe pas. (Vérifié dans WinUAE avec le Kickstart AROS en
68020.)

## Le Copper déclenche une interruption

Le Copper peut écrire dans `INTREQ` (`$09C`), qui est au-dessus de `$80` : `DC.W $009C,$8010`
demande l'interruption **COPER** au moment précis où le Copper arrive à cette ligne de la liste.
La routine de niveau 3 regarde alors `INTREQR` pour savoir qui l'a appelée :

```asm
    BTST    #4,$DFF01F      ; bit 4 de INTREQR : le Copper ?
    BNE.S   .copper
```
