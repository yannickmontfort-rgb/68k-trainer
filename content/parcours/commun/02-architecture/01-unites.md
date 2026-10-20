## Bits, octets, mots et mots longs

Le 68000 est un processeur **16/32 bits** : ses registres font 32 bits, mais il échange les données
avec la mémoire par paquets de 16 bits. Il sait travailler sur trois tailles, que l'on choisit avec
le suffixe de l'instruction :

| Suffixe | Nom | Bits | Non signé | Signé (complément à deux) |
|---|---|---|---|---|
| `.B` | octet (*byte*) | 8 | 0 à 255 | −128 à +127 |
| `.W` | mot (*word*) | 16 | 0 à 65 535 | −32 768 à +32 767 |
| `.L` | mot long (*long word*) | 32 | 0 à 4 294 967 295 | −2 147 483 648 à +2 147 483 647 |

Les bits sont numérotés **de droite à gauche**, à partir de 0 : le bit 0 est le bit de **poids
faible**, le bit 7 (ou 15, ou 31) le bit de **poids fort**.

## Pourquoi l'hexadécimal ?

Un chiffre hexadécimal représente exactement **4 bits**. Un octet s'écrit donc toujours avec deux
chiffres hexa, un mot avec quatre, un long avec huit, et la conversion se fait de tête, chiffre par
chiffre :

```
%1010 0011  =  $A3        (1010 = A, 0011 = 3)
```

| Hexa | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | A | B | C | D | E | F |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Binaire | 0000 | 0001 | 0010 | 0011 | 0100 | 0101 | 0110 | 0111 | 1000 | 1001 | 1010 | 1011 | 1100 | 1101 | 1110 | 1111 |

## Les nombres négatifs

Le 68000 code les entiers signés en **complément à deux** : un nombre est négatif quand son bit de
poids fort vaut 1. Sur un octet, `$FF` vaut −1, `$80` vaut −128 et `$7F` vaut +127. Sur un mot
long, −1 s'écrit `$FFFFFFFF`.

C'est **toi** qui décides si une valeur est signée ou non : les mêmes bits `$FF` valent 255 ou −1
selon l'instruction que tu utilises ensuite (on le verra avec les comparaisons).

## Une opération ne touche que sa taille

Quand une instruction travaille en `.B` ou en `.W` sur un registre de données, **seule la partie
basse** du registre change ; le reste est conservé :

```asm
    MOVE.L  #$12345678,D0   ; D0 = $12345678
    MOVE.B  #$FF,D0         ; D0 = $123456FF  (seul l'octet faible change)
    MOVE.W  #$ABCD,D0       ; D0 = $1234ABCD  (seul le mot faible change)
```

C'est une source d'erreurs classique : un registre « sale » dans sa partie haute donne des résultats
faux dès qu'on le réutilise en `.L`.
