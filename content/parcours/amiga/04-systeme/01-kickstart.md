## Un système en ROM

Quand on allume un Amiga 500, son système d'exploitation est déjà là, rangé dans 256 Ko de ROM à
partir de l'adresse `$FC0000` : c'est le Kickstart, en version 1.3 sur la plupart des A500. La
disquette du Workbench n'apporte que les commandes, les icônes et le bureau.

Le Kickstart est découpé en bibliothèques (*libraries*), chacune spécialisée :

| Bibliothèque | Rôle |
|---|---|
| `exec.library` | le noyau : mémoire, tâches et multitâche, interruptions, bibliothèques |
| `dos.library` | les fichiers, la console du CLI, les délais |
| `graphics.library` | l'affichage, le Copper, le Blitter vus par le système |
| `intuition.library` | les écrans, fenêtres, menus et la souris du bureau |

## Une seule adresse fixe : $4

On appelle une fonction de bibliothèque par un `JSR`, et il faut pour cela connaître l'adresse de
la bibliothèque, sa base. Ces adresses changent d'une machine à l'autre, selon la mémoire ou la
version du Kickstart, sauf une : le mot long rangé en `$4` contient l'adresse d'**ExecBase**, la
base d'exec, et tout part de là.

```asm
    MOVEA.L 4.W,A6          ; A6 = ExecBase
```

Dans 68k Trainer, ExecBase est en `$800`, mais elle est ailleurs sur un vrai Amiga : ne recopie
jamais une adresse vue au débogueur, relis toujours `$4`.

## La table de sauts

Au-dessus de sa base, aux décalages positifs, une bibliothèque range ses données (numéro de
version, compteurs…). Au-dessous, aux décalages négatifs, elle range une table de sauts : une
instruction `JMP` de 6 octets par fonction, la première fonction utile à −30, la suivante à −36, et
ainsi de suite. Appeler `Forbid`, c'est donc sauter 132 octets sous la base d'exec :

```asm
    MOVEA.L 4.W,A6
    JSR     -132(A6)        ; Forbid()
```

Le 68000 calcule A6 − 132, y trouve un `JMP` vers la vraie routine en ROM et l'exécute, puis le
`RTS` de la routine revient après ton `JSR`. Grâce à cette table, un programme écrit pour le
Kickstart 1.3 marche encore sur les suivants : les routines ont bougé, mais leur décalage est resté
le même.

## Les règles d'appel

Toutes les bibliothèques suivent les mêmes règles. A6 contient la base de la bibliothèque appelée,
les paramètres passent dans les registres indiqués par la documentation (les *autodocs*), par
exemple `OpenLibrary(libName, version)(A1, D0)`, et le résultat revient dans D0. La fonction peut
modifier D0, D1, A0 et A1, et elle préserve tous les autres registres.

Les décalages s'écrivent souvent avec des noms, comme `_LVOForbid EQU -132` (*Library Vector
Offset*). Voici ceux d'exec :

| Fonction | Décalage | Rôle |
|---|---|---|
| `Forbid()` | −132 | interdit le changement de tâche |
| `Permit()` | −138 | l'autorise à nouveau |
| `Disable()` | −120 | coupe les interruptions |
| `Enable()` | −126 | les rétablit |
| `AllocMem(taille, type)(D0, D1)` | −198 | réserve de la mémoire |
| `FreeMem(adresse, taille)(A1, D0)` | −210 | la rend |
| `OldOpenLibrary(nom)(A1)` | −408 | ouvre une bibliothèque |
| `CloseLibrary(base)(A1)` | −414 | la ferme |
| `OpenLibrary(nom, version)(A1, D0)` | −552 | ouvre une bibliothèque d'une version minimale |

## Le multitâche, et comment le suspendre

Exec partage le temps du processeur entre plusieurs tâches, le CLI, le Workbench, ton
programme… Deux paires de fonctions le suspendent. `Forbid()` et `Permit()` empêchent les autres
tâches de tourner, mais les interruptions continuent : le clavier, la souris et la VBL marchent
toujours. `Disable()` et `Enable()` coupent toutes les interruptions, et on ne s'en sert que très
brièvement.

Ces appels s'imbriquent, car exec les compte dans ExecBase : `TDNestCnt` pour Forbid et `IDNestCnt`
pour Disable, qui valent −1 au repos. Chaque `Forbid` doit donc avoir son `Permit`, et chaque
`Disable` son `Enable`, **avant de quitter**, sinon le système reste bloqué après ton programme.
Dans 68k Trainer, un bilan te le signale à la fin.
