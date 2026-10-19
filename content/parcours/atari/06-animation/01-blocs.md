## Un sprite, c'est un rectangle de mémoire

Un dessin (un personnage, une balle, une lettre) se prépare à l'avance, dans le même format que
l'écran : pour chaque groupe de 16 pixels, **4 mots** (un par plan). Un dessin de 16 × 16 pixels
occupe donc 16 lignes × 8 octets = **128 octets**.

L'afficher, c'est le **copier** dans la mémoire de l'écran, ligne par ligne. On appelle souvent
cette opération un *blit* (de *block transfer*). Le ST de base n'a pas de circuit pour le faire :
c'est le 68000 qui copie, octet après octet. Le STE ajoutera plus tard un « Blitter ».

## Le saut de ligne

Dans le dessin, les lignes se suivent. À l'écran, non : une ligne d'écran fait **160 octets**. Après
avoir copié une ligne du dessin, il faut donc sauter jusqu'à la même colonne, une ligne plus bas :

```
saut = 160 − largeur du bloc en octets
```

Pour un bloc de 16 pixels (1 groupe, 8 octets) : 152. Pour 32 pixels (16 octets) : 144.

```
    MOVEQ   #15,D7          ; 16 lignes
.ligne:
    MOVE.L  (A0)+,(A1)+     ; plans 0 et 1
    MOVE.L  (A0)+,(A1)+     ; plans 2 et 3
    LEA     160-8(A1),A1    ; saut de ligne
    DBF     D7,.ligne
```

`LEA 160-8(A1),A1` ajoute 152 à A1 sans toucher aux flags : c'est l'instruction préférée des
codeurs pour avancer un pointeur d'une valeur fixe. L'assembleur calcule `160-8` pour toi.

## Où copier ?

C'est la recette du chapitre 5 : **écran + Y × 160 + (X ÷ 16) × 8**. Tant que X est un multiple
de 16, le dessin tombe pile sur des groupes entiers et la copie est aussi simple que ci-dessus.
Pour une position au pixel près, il faudra **décaler** les bits : ce sera la notion 3.

## Copier, c'est aussi effacer

Effacer un bloc, c'est y copier des zéros (`CLR.L (A1)+`). Pour déplacer un sprite, la méthode de
base est donc : **effacer** l'ancienne position, **dessiner** la nouvelle. Si un décor se trouve
derrière, on le recopie au lieu d'effacer : on parle de **restaurer le fond**.
