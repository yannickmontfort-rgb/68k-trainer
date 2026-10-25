## Trois tailles

Le 68000 travaille sur trois tailles de données. On choisit la taille avec le suffixe de
l'instruction.

| Suffixe | Nom | Bits | Non signé | Signé |
|---|---|---|---|---|
| `.B` | octet | 8 | 0 à 255 | −128 à 127 |
| `.W` | mot | 16 | 0 à 65 535 | −32 768 à 32 767 |
| `.L` | mot long | 32 | 0 à 4 294 967 295 | −2 147 483 648 à 2 147 483 647 |

Ses registres font 32 bits. Les bits se numérotent de droite à gauche, à partir de 0.

## L'hexadécimal

Un chiffre hexadécimal vaut 4 bits. Un octet s'écrit donc avec 2 chiffres, un mot avec 4, un long
avec 8. On convertit chiffre par chiffre :

```
%1010 0011  =  $A3
```

| Hexa | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | A | B | C | D | E | F |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Binaire | 0000 | 0001 | 0010 | 0011 | 0100 | 0101 | 0110 | 0111 | 1000 | 1001 | 1010 | 1011 | 1100 | 1101 | 1110 | 1111 |

## Les nombres négatifs

Un nombre est négatif quand son bit de poids fort vaut 1 : c'est le complément à deux. Sur un
octet, `$FF` vaut −1 et `$80` vaut −128.

Le processeur ne sait pas si `$FF` veut dire 255 ou −1. C'est toi qui choisis, par les
instructions que tu utilises ensuite.

## Une opération ne touche que sa taille

```asm
    MOVE.L  #$12345678,D0   ; D0 = $12345678
    MOVE.B  #$FF,D0         ; D0 = $123456FF
    MOVE.W  #$ABCD,D0       ; D0 = $1234ABCD
```

En `.B` ou en `.W`, le reste du registre ne bouge pas. Si tu relis ensuite ce registre en `.L`,
les anciens bits sont toujours là.
