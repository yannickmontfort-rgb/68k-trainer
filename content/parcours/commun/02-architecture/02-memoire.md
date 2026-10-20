## La mémoire : une longue rangée d'octets

Pour le 68000, la mémoire est une suite d'**octets numérotés** : chaque octet a une **adresse**,
de `$000000` à `$FFFFFF` (bus d'adresse de 24 bits, soit 16 Mo adressables). Un mot occupe deux
octets consécutifs, un mot long quatre.

## Le poids fort d'abord (*big endian*)

Le 68000 range les nombres **dans l'ordre où on les lit** : l'octet de poids fort à l'adresse la
plus basse. Après `MOVE.L #$12345678,$2000` :

| Adresse | $2000 | $2001 | $2002 | $2003 |
|---|---|---|---|---|
| Contenu | `$12` | `$34` | `$56` | `$78` |

(Les processeurs Intel des PC font l'inverse : ils sont *little endian*.)

## La règle d'or : mots et longs à une adresse paire

Un mot (`.W`) ou un mot long (`.L`) doit **toujours** être lu ou écrit à une adresse **paire**.
Sinon, le 68000 déclenche une **erreur d'adresse** (exception n° 3) : [[atari:sur un Atari ST, trois bombes
s'affichent|amiga:sur un Amiga, c'est le Guru
Meditation #00000003]] et le programme est arrêté. Les octets (`.B`), eux, peuvent être à n'importe quelle
adresse.

## Ranger des données dans le programme

Les **directives** ne sont pas des instructions du 68000 : ce sont des ordres donnés à
l'assembleur.

| Directive | Effet | Exemple |
|---|---|---|
| `DC.B` / `DC.W` / `DC.L` | *Define Constant* : range des valeurs dans le programme | `TABLE: DC.W 10,20,30` |
| `DS.B` / `DS.W` / `DS.L` | *Define Storage* : réserve de la place (mise à zéro) | `BUFFER: DS.B 80` |
| `EVEN` | avance à la prochaine adresse **paire** | après un texte en `DC.B` |

Une chaîne de caractères s'écrit entre apostrophes : `DC.B '[[atari:ATARI|amiga:AMIGA]]',0` (le 0 final marque la fin
du texte). Elle peut faire un nombre impair d'octets. Que se passe-t-il pour ce qui suit ?

- **Devpac aligne automatiquement** les instructions et les données en `.W` ou `.L` qui suivent :
  il ajoute un octet nul et affiche un **avertissement**. 68k Trainer fait de même.
- **Mais une étiquette seule sur sa ligne n'est pas déplacée !** Dans l'exemple ci-dessous,
  `VALEUR` vaut une adresse **impaire**, alors que le `DC.W` a été aligné juste après :

  ```asm
  TEXTE:  DC.B    '[[atari:ST|amiga:KS]]',0      ; 3 octets
  VALEUR:                     ; étiquette seule : adresse impaire !
          DC.W    [[atari:1040|amiga:500]]        ; aligné, lui, sur l'adresse paire suivante
  ```

  Un `MOVE.W VALEUR,D0` lit alors à une adresse impaire : erreur d'adresse, [[atari:trois bombes|amiga:Guru #00000003]].

La parade : placer **`EVEN`** après chaque texte en `DC.B`. C'est clair à la lecture, ça évite le
piège de l'étiquette seule, et ça marche avec tous les assembleurs (certains, sur ST ou sur Amiga,
n'alignent rien du tout).

:::atari
## La carte mémoire de l'Atari ST

| Adresses | Contenu |
|---|---|
| `$000000`–`$0003FF` | table des **vecteurs d'exception** |
| `$000400`–`$0007FF` | **variables système** du TOS |
| `$000800`–… | mémoire libre : ton programme, ses données, la pile |
| `$0F8000`–`$0FFFFF` | l'**écran** (32 000 octets) sur un 1040 ST |
| `$FC0000`–`$FEFFFF` | le **TOS** en ROM (lecture seule) |
| `$FF8000`–`$FFFFFF` | les **registres matériels** : vidéo, palette, son… |
:::
:::amiga
## La carte mémoire de l'Amiga 500

| Adresses | Contenu |
|---|---|
| `$000000`–`$0003FF` | table des **vecteurs d'exception** ; en `$4`, l'adresse d'**ExecBase** |
| `$000400`–`$07FFFF` | la **Chip RAM** (512 Ko) : système, programmes, et tout ce que lisent les puces (écrans, sons) |
| `$C00000`–`$C7FFFF` | la **Slow RAM** (extension de 512 Ko sous la trappe), invisible pour les puces |
| `$BFD000`–`$BFEF01` | les deux **CIA** : souris, joystick, clavier, timers |
| `$DFF000`–`$DFF1FF` | les **puces custom** (Agnus, Denise, Paula) : écran, Copper, Blitter, son… |
| `$FC0000`–`$FFFFFF` | le **Kickstart** en ROM (lecture seule) |

Contrairement au ST, l'écran n'a pas d'adresse fixe : le système le place où il veut en Chip RAM,
et c'est ExecBase, en `$4`, qui mène à tout le reste.
:::
