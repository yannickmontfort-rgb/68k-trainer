## Un système en ROM

Quand on allume un Amiga 500, son système d'exploitation est déjà là : il est rangé dans
**256 Ko de ROM**, à partir de l'adresse `$FC0000`. C'est le **Kickstart** (version 1.3 sur la
plupart des A500). La disquette du Workbench n'apporte que les commandes, les icônes et le bureau.

Le Kickstart est découpé en **bibliothèques** (*libraries*), chacune spécialisée :

| Bibliothèque | Rôle |
|---|---|
| `exec.library` | le noyau : mémoire, tâches et multitâche, interruptions, bibliothèques |
| `dos.library` | les fichiers, la console du CLI, les délais |
| `graphics.library` | l'affichage, le Copper, le Blitter vus par le système |
| `intuition.library` | les écrans, fenêtres, menus et la souris du bureau |

## Une seule adresse fixe : $4

Sur l'Atari ST, on appelle le système par des `TRAP`. Sur l'Amiga, on appelle les fonctions des
bibliothèques **par un `JSR`**, et pour cela il faut connaître l'adresse de la bibliothèque, sa
**base**. Ces adresses changent d'une machine à l'autre (selon la mémoire, la version du
Kickstart…). Une seule ne change jamais : le mot long rangé en **`$4`** contient l'adresse
d'**ExecBase**, la base d'exec. Tout part de là :

```asm
    MOVEA.L 4.W,A6          ; A6 = ExecBase
```

Dans 68k Trainer, ExecBase est en `$800` ; sur un vrai Amiga, elle est ailleurs. Ne recopie
jamais une adresse vue au débogueur : relis toujours `$4`.

## La table de sauts

À partir de sa base, une bibliothèque range deux choses :

- **au-dessus** de la base (décalages positifs) : ses **données** (numéro de version, compteurs…) ;
- **au-dessous** (décalages négatifs) : une **table de sauts**, une instruction `JMP` de 6 octets
  par fonction. La première fonction « utile » est à −30, la suivante à −36, et ainsi de suite.

Appeler `Forbid`, c'est donc sauter 132 octets sous la base d'exec :

```asm
    MOVEA.L 4.W,A6
    JSR     -132(A6)        ; Forbid()
```

Le 68000 calcule A6 − 132, y trouve un `JMP` vers la vraie routine en ROM, l'exécute, et le `RTS`
de la routine revient après ton `JSR`. Grâce à cette table, un programme écrit pour le Kickstart
1.3 marche encore sur les suivants : les routines ont bougé, mais leur décalage est resté le même.

## Les règles d'appel

Toutes les bibliothèques suivent les mêmes règles :

- **A6** doit contenir la base de la bibliothèque appelée ;
- les paramètres passent dans des **registres** précis, indiqués par la documentation
  (les *autodocs*). Exemple : `OpenLibrary(libName, version)(A1, D0)` ;
- le résultat revient dans **D0** ;
- la fonction peut modifier **D0, D1, A0 et A1** ; elle préserve tous les autres registres.

Les décalages s'écrivent souvent avec des noms : `_LVOForbid EQU -132` (*Library Vector Offset*).
Les voici pour exec :

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

Exec partage le temps du processeur entre plusieurs **tâches** : le CLI, le Workbench, ton
programme… Deux paires de fonctions le suspendent, et elles **s'imbriquent** : exec compte les
appels dans ExecBase (`TDNestCnt` pour Forbid, `IDNestCnt` pour Disable, qui valent −1 au repos).

- `Forbid()` / `Permit()` : plus aucune autre tâche ne tourne, mais les interruptions continuent
  (le clavier, la souris, la VBL marchent toujours) ;
- `Disable()` / `Enable()` : plus d'interruptions du tout. À n'utiliser que très brièvement.

Chaque `Forbid` doit avoir son `Permit`, chaque `Disable` son `Enable`, **avant de quitter**. Sinon
le système reste bloqué après ton programme. Dans 68k Trainer, un **bilan** te le signale à la fin.
