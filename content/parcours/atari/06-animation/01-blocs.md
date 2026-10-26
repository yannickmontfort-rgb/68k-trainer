## Un sprite est un rectangle de mémoire

Un dessin, qu'il s'agisse d'un personnage, d'une balle ou d'une lettre, se prépare à l'avance dans
le format de l'écran : 4 mots, un par plan, pour chaque groupe de 16 pixels. Un dessin de 16 × 16
pixels occupe donc 16 lignes de 8 octets, soit 128 octets.

L'afficher, c'est le copier dans la mémoire de l'écran, ligne par ligne ; on appelle cette copie un
*blit* (de *block transfer*). Le ST de base n'a pas de circuit pour la faire, c'est donc le 68000
qui copie lui-même chaque mot. Le STE ajoutera plus tard un circuit spécialisé, le Blitter.

## Le saut de ligne

Dans le dessin, les lignes se suivent, alors qu'à l'écran une ligne fait 160 octets. Après avoir
copié une ligne du dessin, il faut donc sauter jusqu'à la même colonne, une ligne plus bas, ce qui
donne le **saut de ligne** :

```text
saut = 160 − largeur du bloc en octets
```

Un bloc de 16 pixels (un groupe, 8 octets) demande un saut de 152, un bloc de 32 pixels (16 octets)
un saut de 144.

```asm
    MOVEQ   #15,D7          ; 16 lignes
.ligne:
    MOVE.L  (A0)+,(A1)+     ; plans 0 et 1
    MOVE.L  (A0)+,(A1)+     ; plans 2 et 3
    LEA     160-8(A1),A1    ; saut de ligne
    DBF     D7,.ligne
```

`LEA 160-8(A1),A1` ajoute 152 à A1 sans toucher aux flags, et c'est la façon habituelle d'avancer
un pointeur d'une valeur fixe ; l'assembleur calcule `160-8` pour toi.

## Où copier

L'adresse de départ suit la règle du chapitre 5 : écran + Y × 160 + (X ÷ 16) × 8. Tant que X est
un multiple de 16, le dessin tombe sur des groupes entiers et la copie reste aussi simple que
ci-dessus. Pour une position au pixel près, il faudra décaler les bits, ce que fait la notion 3.

## Copier, c'est aussi effacer

Effacer un bloc revient à y copier des zéros avec `CLR.L (A1)+`. Pour déplacer un sprite, on efface
donc l'ancienne position, puis on dessine la nouvelle. Quand un décor se trouve derrière, on le
recopie au lieu d'effacer : on dit qu'on restaure le fond.
