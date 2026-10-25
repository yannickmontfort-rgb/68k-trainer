## Des cases dans le processeur

Les registres sont des cases à l'intérieur du 68000. On y accède bien plus vite qu'à la mémoire.
Il y en a deux familles, plus le compteur de programme.

## D0 à D7 : les données

On y fait les calculs. Ils acceptent les trois tailles, `.B`, `.W` et `.L`.

## A0 à A7 : les adresses

On y range des adresses : ce sont des pointeurs. Ils diffèrent des registres de données sur trois
points.

- Pas d'octet : `MOVE.B D0,A1` est refusé.
- En `.W`, tout le registre est rempli. Le bit 15 est recopié dans les bits 16 à 31 : c'est
  l'extension de signe.

  ```asm
      MOVEA.W #$1234,A0   ; A0 = $00001234
      MOVEA.W #$8000,A1   ; A1 = $FFFF8000
  ```

- `MOVEA`, `ADDA` et `SUBA` ne changent pas les flags.

Pour charger une adresse, on utilise `LEA` : `LEA $2000,A0` met `$2000` dans A0.

A7 sert aussi de pointeur de pile. On l'appelle alors SP.

## PC : la prochaine instruction

Le PC contient l'adresse de la prochaine instruction. Il avance après chaque instruction, et un
saut le change. Regarde-le dans le pas à pas.
