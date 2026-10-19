## L'instruction reine : MOVE

La moitié d'un programme en assembleur consiste à **déplacer des données** : d'un registre à un
autre, de la mémoire vers un registre, d'une adresse à une autre. C'est le travail de `MOVE` :

```text
    MOVE.taille  source,destination
```

`MOVE` positionne N et Z selon la valeur copiée, et met V et C à 0.

## Les modes d'adressage

Le **mode d'adressage** dit *où* trouver un opérande. Le 68000 en a douze, et presque toutes les
instructions les acceptent. C'est ce qui le rend si agréable à programmer.

| Mode | Syntaxe | Exemple | L'opérande est… |
|---|---|---|---|
| Registre de données | `Dn` | `MOVE.W D1,D0` | le contenu de D1 |
| Registre d'adresse | `An` | `MOVEA.L A0,A1` | le contenu de A0 |
| Immédiat | `#valeur` | `MOVE.W #100,D0` | la valeur 100 elle-même |
| Absolu | `adresse` | `MOVE.W $2000,D0` | le mot rangé à l'adresse $2000 |
| Indirect | `(An)` | `MOVE.W (A0),D0` | le mot à l'adresse **contenue dans** A0 |
| Indirect postincrémenté | `(An)+` | `MOVE.W (A0)+,D0` | idem, puis A0 avance de la taille lue |
| Indirect prédécrémenté | `-(An)` | `MOVE.W D0,-(A1)` | A1 recule d'abord, puis on écrit à l'adresse A1 |
| Indirect avec déplacement | `d16(An)` | `MOVE.W 4(A0),D0` | le mot à l'adresse A0 + 4 (A0 ne change pas) |
| Indirect indexé | `d8(An,Xn)` | `MOVE.W 0(A0,D1.W),D0` | le mot à l'adresse A0 + D1 (+ 0) |
| Relatif au PC | `d16(PC)` | `MOVE.W TABLE(PC),D0` | une donnée du programme, repérée par rapport au PC |

Les modes **indirects** sont ceux qui font la puissance du 68000 : un registre d'adresse sert de
**pointeur** qu'on promène dans un tableau.

- `(A0)+` est parfait pour **parcourir** une table élément par élément ;
- `d16(An)` pour lire un champ à une position fixe (le 3ᵉ élément, l'en-tête…) ;
- `d8(An,Dn.W)` pour un accès **indexé** : `TABLE[i]`, où l'indice est dans un registre de données.

La destination ne peut jamais être une valeur immédiate (`MOVE.W D0,#5` n'a pas de sens) ni une
adresse relative au PC.

## La famille de MOVE

| Instruction | Rôle | Remarque |
|---|---|---|
| `MOVEA` | MOVE vers un registre d'adresse | pas de `.B`, extension de signe en `.W`, flags intacts |
| `MOVEQ #n,Dn` | charge rapidement un petit nombre | de −128 à 127, toujours en `.L`, uniquement vers un Dn |
| `CLR` | met à zéro | `CLR.L D0` |
| `LEA ea,An` | charge une **adresse** (pas la donnée qui s'y trouve) | `LEA TABLE,A0` |
| `EXG Rx,Ry` | échange deux registres | |
| `SWAP Dn` | échange les deux mots d'un registre de données | |
