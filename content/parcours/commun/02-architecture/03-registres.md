## Des cases dans le processeur

Les registres sont de petites cases placées à l'intérieur du 68000, auxquelles il accède bien plus
vite qu'à la mémoire. Il en possède deux familles, auxquelles s'ajoute le compteur de programme.

## D0 à D7 : les données

Le 68000 fait ses calculs dans les registres de données, qui acceptent les trois tailles `.B`, `.W`
et `.L`.

## A0 à A7 : les adresses

Les registres d'adresse contiennent l'adresse d'une donnée en mémoire : ce sont des pointeurs. Ils
se distinguent des registres de données sur trois points.

- Ils n'acceptent pas l'octet : `MOVE.B D0,A1` est refusé par l'assembleur.
- En `.W`, tout le registre est rempli, car le 68000 recopie le bit 15 dans les bits 16 à 31 :
  c'est l'extension de signe.

  ```asm
      MOVEA.W #$1234,A0   ; A0 = $00001234
      MOVEA.W #$8000,A1   ; A1 = $FFFF8000
  ```

- `MOVEA`, `ADDA` et `SUBA` laissent les flags inchangés.

Pour charger une adresse, on utilise le plus souvent `LEA` : `LEA $2000,A0` met `$2000` dans A0.
Le registre A7 joue en plus le rôle de pointeur de pile, et on l'appelle alors SP.

## PC : la prochaine instruction

Le compteur de programme, PC, contient l'adresse de la prochaine instruction à exécuter. Il avance
après chaque instruction, et un saut le modifie ; tu le vois avancer dans le pas à pas.
