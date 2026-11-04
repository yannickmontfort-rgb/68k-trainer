## Un processeur pour l'écran

Le **Copper** (*co-processor*) est un tout petit processeur logé dans Agnus. Il ne connaît que
trois instructions, mais il les exécute en suivant le faisceau qui balaie l'écran, sans occuper le
68000 :

- MOVE écrit une valeur dans un registre des puces ;
- WAIT attend que le faisceau atteigne une position ;
- SKIP saute l'instruction suivante si le faisceau a dépassé une position.

Son programme, la liste Copper, est rangé en Chip RAM, et chaque instruction y fait deux mots.
Agnus relance la liste depuis le début, à l'adresse contenue dans `COP1LC`, à chaque image.

## MOVE

```asm
    DC.W    $0180,$0F00     ; MOVE : $0F00 dans le registre $DFF180 (COLOR00)
```

Le premier mot est le décalage du registre, `$180` pour COLOR00. Il est toujours pair, et c'est son
bit 0 à 0 qui signale un MOVE ; le second mot est la valeur. Le Copper ne peut pas écrire dans les
registres situés sous `$80` (DMACON, le Blitter…) sauf autorisation, et une tentative l'arrête net.

## WAIT

```asm
    DC.W    $8007,$FFFE     ; WAIT : attendre la ligne $80, position horizontale $06
```

Le premier mot donne la position, avec la ligne dans l'octet fort (`$80`) et la position
horizontale dans l'octet faible. Son **bit 0 à 1** distingue un WAIT d'un MOVE : `$07` veut donc
dire « position `$06` », tout au début de la ligne, avant la partie visible. Le second mot, `$FFFE`,
demande de comparer tous les bits ; la notion suivante montre qu'on peut en ignorer certains.

Le Copper attend que le faisceau soit arrivé à cette position, ou l'ait dépassée, puis passe à
l'instruction suivante.

## La fin de la liste

```asm
    DC.W    $FFFF,$FFFE     ; attendre la ligne 255, position $FE... qui n'existe pas
```

Comme une ligne ne va pas jusqu'à la position `$FE`, le Copper attend jusqu'à la fin de l'image,
où Agnus le relance au début. C'est la fin conventionnelle de toute liste Copper.

## Un dégradé

Une suite de WAIT et de MOVE change la couleur du fond ligne après ligne :

```asm
copper:
    DC.W    $0100,$0200     ; aucun plan : tout l'écran est en couleur 0
    DC.W    $4007,$FFFE,$0180,$0001
    DC.W    $4107,$FFFE,$0180,$0002
    DC.W    $4207,$FFFE,$0180,$0003
    ; ...
    DC.W    $FFFF,$FFFE
```

Le Copper change une couleur en 4 cycles « couleur », le temps de 8 pixels, et peut donc faire des
dizaines de changements sur une même ligne. Les barres de couleur des démos, les ciels dégradés des
jeux et les écrans de plus de 32 couleurs viennent de là.

## Le lancer

```asm
    MOVE.L  #copper,$80(A5)     ; COP1LC
    MOVE.W  D0,$88(A5)          ; COPJMP1 : le Copper y saute tout de suite
    MOVE.W  #$8280,$96(A5)      ; DMACON : SET + DMAEN + COPEN
```

Sans l'écriture dans `COPJMP1`, le Copper ne prendrait la nouvelle liste qu'à l'image suivante.
