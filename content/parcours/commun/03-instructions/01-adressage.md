## MOVE

Une bonne part d'un programme en assembleur consiste à déplacer des données, d'un registre à un
autre, de la mémoire vers un registre ou d'une adresse à une autre. C'est le travail de `MOVE`,
qui positionne N et Z selon la valeur copiée et met V et C à 0.

```text
    MOVE.taille  source,destination
```

## Les modes d'adressage

Le mode d'adressage indique où le 68000 doit trouver un opérande. Il en connaît une douzaine, que
presque toutes les instructions acceptent.

| Mode | Syntaxe | Exemple | L'opérande est… |
|---|---|---|---|
| registre de données | `Dn` | `MOVE.W D1,D0` | le contenu de D1 |
| registre d'adresse | `An` | `MOVEA.L A0,A1` | le contenu de A0 |
| immédiat | `#valeur` | `MOVE.W #100,D0` | la valeur 100 elle-même |
| absolu | `adresse` | `MOVE.W $2000,D0` | le mot rangé à l'adresse $2000 |
| indirect | `(An)` | `MOVE.W (A0),D0` | le mot à l'adresse contenue dans A0 |
| indirect postincrémenté | `(An)+` | `MOVE.W (A0)+,D0` | idem, puis A0 avance de la taille lue |
| indirect prédécrémenté | `-(An)` | `MOVE.W D0,-(A1)` | A1 recule d'abord, puis on écrit à l'adresse A1 |
| indirect avec déplacement | `d16(An)` | `MOVE.W 4(A0),D0` | le mot à l'adresse A0 + 4, sans changer A0 |
| indirect indexé | `d8(An,Xn)` | `MOVE.W 0(A0,D1.W),D0` | le mot à l'adresse A0 + D1 |
| relatif au PC | `d16(PC)` | `MOVE.W TABLE(PC),D0` | une donnée du programme, repérée par rapport au PC |

Les modes indirects font la force du 68000, car un registre d'adresse y sert de pointeur que l'on
promène dans un tableau : `(A0)+` parcourt une table élément par élément, `d16(An)` lit un champ à
une position fixe, et `d8(An,Dn.W)` accède à `TABLE[i]` quand l'indice est dans un registre de
données.

La destination ne peut être ni une valeur immédiate, puisque `MOVE.W D0,#5` n'a pas de sens, ni
une adresse relative au PC.

## La famille de MOVE

| Instruction | Rôle | Remarque |
|---|---|---|
| `MOVEA` | MOVE vers un registre d'adresse | pas de `.B`, extension de signe en `.W`, flags intacts |
| `MOVEQ #n,Dn` | charge vite un petit nombre | de −128 à 127, toujours en `.L`, seulement vers un Dn |
| `CLR` | met à zéro | `CLR.L D0` |
| `LEA ea,An` | charge une adresse, pas la donnée qui s'y trouve | `LEA TABLE,A0` |
| `EXG Rx,Ry` | échange deux registres | |
| `SWAP Dn` | échange les deux mots d'un registre de données | |
