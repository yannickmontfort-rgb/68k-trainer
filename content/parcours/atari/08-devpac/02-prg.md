## Un programme pour un vrai ST

Un programme du ST est un fichier .PRG, ou `.TOS` et `.TTP` selon qu'il utilise le bureau GEM ou
non. Quand on double-clique dessus, le TOS le charge en mémoire à une adresse libre, qu'on ne
connaît pas à l'avance, puis lui donne la main.

## L'en-tête

Le fichier commence par un en-tête de 28 octets :

| Octets | Contenu |
|---|---|
| 0-1 | `$601A`, le « nombre magique » |
| 2-5 | taille de la section TEXT |
| 6-9 | taille de la section DATA |
| 10-13 | taille de la section BSS |
| 14-17 | taille de la table des symboles (pour le débogueur) |
| 18-25 | réservé, drapeaux de chargement |
| 26-27 | 0 si une table de relocation suit |

`$601A` est l'instruction `BRA.S` + 26, qui saute par-dessus l'en-tête. Viennent ensuite le TEXT,
le DATA, les symboles éventuels et la table de relocation.

## La relocation

Dans le code, `LEA MESSAGE,A0` contient l'adresse absolue de MESSAGE, alors que cette adresse
dépend de l'endroit où le TOS charge le programme. L'assembleur calcule donc les adresses comme si
le programme commençait en 0, et note dans la **table de relocation** la position de chaque mot
long à corriger ; au chargement, le TOS ajoute l'adresse réelle à chacun de ces mots longs.

Les adresses relatives au PC (`LEA MESSAGE(PC),A0`, `BSR`, `BRA`) n'ont pas besoin de relocation,
car elles marchent à n'importe quelle adresse. Les codeurs les préfèrent quand c'est possible :
elles sont aussi plus courtes et plus rapides.

## Exporter depuis 68k Trainer

Quand ton programme fonctionne, le bouton « Exporter .PRG », dans le bac à sable et dans les
exercices réussis, fabrique le fichier avec l'assembleur de 68k Trainer. Pour le lancer dans
Hatari, configure un lecteur de disque dur « GEMDOS » sur un dossier de ton PC, copies-y le .PRG et
double-clique dessus sur le bureau du ST ; sur un vrai ST, copie-le sur une disquette ou sur la
carte SD d'un émulateur de lecteur, de type HxC ou Gotek.

Le programme se termine par `Pterm0` (`CLR.W -(SP)` / `TRAP #1`), qui rend la main au bureau.

## Désassembler

68k Trainer contient aussi un désassembleur, qui relit un .PRG et reconstitue un source Devpac
réassemblable à l'identique. En ligne de commande, depuis le dossier du projet :
`npm run desasm -- PROGRAMME.PRG -o programme.s`. Il sert à étudier un vieux programme, le tien de
préférence.
