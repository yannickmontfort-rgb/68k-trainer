## Les bords de l'écran

Rien n'arrête un sprite au bord de l'écran, car la mémoire continue. À droite, le groupe qui suit
le dernier groupe d'une ligne (X = 304 à 319) est le premier groupe de la ligne d'en dessous : le
débordement réapparaît donc à gauche de l'écran, une ligne plus bas. En bas, après la ligne 199, on
écrit en dehors de l'écran, dans la mémoire qui suit, où se trouvent peut-être ton programme ou tes
données.

Il faut donc découper le sprite avant de le dessiner (*clipping*) : ne pas écrire le débordement
quand le sprite est dans la dernière colonne, réduire le nombre de lignes quand il dépasse en bas.
Dans un jeu, le plus simple est souvent d'empêcher le sprite d'aller trop loin, avec X entre 0 et
304 et Y entre 0 et 184 pour un sprite de 16 × 16, comme pour la balle du défi.

## L'effet miroir avec une table

Pour retourner un sprite horizontalement, quand un personnage change de sens, il faut inverser
l'ordre des pixels : le bit 7 de chaque octet devient le bit 0, le bit 6 le bit 1, et ainsi de
suite. Le faire bit à bit pour chaque octet de chaque image serait bien trop lent.

On calcule donc une fois pour toutes une table de 256 octets, dont la case n° n contient n
retourné ; retourner un octet ne coûte plus qu'une lecture :

```asm
    MOVEQ   #0,D0
    MOVE.B  (A2)+,D0         ; octet du dessin
    MOVE.B  0(A3,D0.W),D0    ; A3 = table : D0 = octet retourné
```

Pour un mot de 16 pixels, on retourne ses deux octets et on les échange, puisque l'octet de gauche
devient celui de droite.

Pour construire la table, on fait sortir les bits de n par la droite avec `LSR` et on les fait
entrer par la droite d'un autre registre avec `ROXL`, le flag X servant de passage entre les deux.

Cette **table précalculée** (*look-up table*) se retrouve partout dans les démos : sinus pour les
mouvements, multiplications par 160, couleurs de dégradés.
