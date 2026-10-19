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
Sinon, le 68000 déclenche une **erreur d'adresse** (exception n° 3) : sur un Atari ST, trois bombes
s'affichent et le programme est arrêté. Les octets (`.B`), eux, peuvent être à n'importe quelle
adresse.

## Ranger des données dans le programme

Les **directives** ne sont pas des instructions du 68000 : ce sont des ordres donnés à
l'assembleur.

| Directive | Effet | Exemple |
|---|---|---|
| `DC.B` / `DC.W` / `DC.L` | *Define Constant* : range des valeurs dans le programme | `TABLE: DC.W 10,20,30` |
| `DS.B` / `DS.W` / `DS.L` | *Define Storage* : réserve de la place (mise à zéro) | `BUFFER: DS.B 80` |
| `EVEN` | avance à la prochaine adresse **paire** | après un texte en `DC.B` |

Une chaîne de caractères s'écrit entre apostrophes : `DC.B 'ATARI',0` (le 0 final marque la fin
du texte). Comme elle peut faire un nombre impair d'octets, on place **`EVEN`** avant toute
donnée en `.W` ou en `.L` qui la suit. L'assembleur de Devpac ne le fait pas à ta place, et
68k Trainer non plus.

## La carte mémoire de l'Atari ST

| Adresses | Contenu |
|---|---|
| `$000000`–`$0003FF` | table des **vecteurs d'exception** |
| `$000400`–`$0007FF` | **variables système** du TOS |
| `$000800`–… | mémoire libre : ton programme, ses données, la pile |
| `$0F8000`–`$0FFFFF` | l'**écran** (32 000 octets) sur un 1040 ST |
| `$FC0000`–`$FEFFFF` | le **TOS** en ROM (lecture seule) |
| `$FF8000`–`$FFFFFF` | les **registres matériels** : vidéo, palette, son… |
