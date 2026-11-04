## Trois tailles

Le 68000 travaille sur trois tailles de données, que l'on choisit avec le suffixe de l'instruction.
Ses registres font 32 bits, et leurs bits se numérotent de droite à gauche à partir de 0.

| Suffixe | Nom | Bits | Non signé | Signé |
|---|---|---|---|---|
| `.B` | octet | 8 | 0 à 255 | −128 à 127 |
| `.W` | mot | 16 | 0 à 65 535 | −32 768 à 32 767 |
| `.L` | mot long | 32 | 0 à 4 294 967 295 | −2 147 483 648 à 2 147 483 647 |

## L'hexadécimal

Un chiffre hexadécimal représente exactement 4 bits : un octet s'écrit donc avec deux chiffres, un
mot avec quatre et un mot long avec huit, et l'on passe du binaire à l'hexadécimal chiffre par
chiffre.

```
%1010 0011  =  $A3
```

| Hexa | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | A | B | C | D | E | F |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Binaire | 0000 | 0001 | 0010 | 0011 | 0100 | 0101 | 0110 | 0111 | 1000 | 1001 | 1010 | 1011 | 1100 | 1101 | 1110 | 1111 |

## Les nombres négatifs

Le 68000 code les nombres signés en complément à deux : un nombre est négatif quand son bit de
poids fort vaut 1. Sur un octet, `$FF` vaut ainsi −1 et `$80` vaut −128.

Le processeur ne sait pas si `$FF` signifie 255 ou −1 ; c'est toi qui le décides, par les
instructions que tu utilises ensuite.

## Une opération ne touche que sa taille

Quand une instruction travaille en `.B` ou en `.W` sur un registre de données, seule la partie
basse du registre change et le reste est conservé.

```asm
    MOVE.L  #$12345678,D0   ; D0 = $12345678
    MOVE.B  #$FF,D0         ; D0 = $123456FF
    MOVE.W  #$ABCD,D0       ; D0 = $1234ABCD
```

Si tu relis ensuite ce registre en `.L`, ses anciens bits sont toujours là : c'est une erreur
classique.
