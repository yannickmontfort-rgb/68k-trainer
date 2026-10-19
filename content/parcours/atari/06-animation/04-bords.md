## Les bords de l'écran

Rien n'arrête un sprite au bord de l'écran : la mémoire continue.

- **À droite**, le « groupe suivant » du dernier groupe d'une ligne (X = 304 à 319) est le
  **premier groupe de la ligne d'en dessous**. Le débordement réapparaît donc à gauche de l'écran,
  une ligne plus bas.
- **En bas**, après la ligne 199, on écrit en dehors de l'écran : dans la mémoire qui suit, peut-être
  ton programme ou tes données !

Il faut donc **découper** (*clipping*) le sprite avant de le dessiner : ne pas écrire le débordement
si le sprite est dans la dernière colonne, réduire le nombre de lignes s'il dépasse en bas, etc. Le
plus simple, dans un jeu, est souvent d'**empêcher** le sprite d'aller trop loin (X entre 0 et 304,
Y entre 0 et 184 pour un sprite de 16 × 16), comme on le fera pour la balle du défi.

## L'effet miroir avec une table

Pour retourner un sprite horizontalement (un personnage qui change de sens), il faut inverser
l'ordre des pixels : le bit 7 d'un octet doit devenir le bit 0, le bit 6 le bit 1, etc. Le faire bit
à bit pour chaque octet de chaque image serait bien trop lent.

L'astuce : calculer **une fois pour toutes** une **table de 256 octets** où la case n° n contient
n retourné. Ensuite, retourner un octet ne coûte qu'une lecture :

```
    MOVEQ   #0,D0
    MOVE.B  (A2)+,D0         ; octet du dessin
    MOVE.B  0(A3,D0.W),D0    ; A3 = table : D0 = octet retourné
```

Pour un mot de 16 pixels, on retourne ses deux octets **et** on les échange (l'octet de gauche
devient celui de droite).

Construire la table est un joli exercice de bits : pour chaque n, on fait sortir ses bits par la
droite (`LSR`) et on les fait rentrer par la droite d'un autre registre (`ROXL`), grâce au flag X qui
sert de « tapis roulant » entre les deux.

Cette idée de **table précalculée** (*look-up table*) est partout dans les démos : sinus pour les
mouvements, multiplications par 160, couleurs de dégradés…
