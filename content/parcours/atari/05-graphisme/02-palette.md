## Un numéro de couleur n'est pas une couleur

Les 4 bits d'un pixel ne donnent pas une couleur mais un numéro, de 0 à 15. La vraie couleur est
lue dans la **palette**, 16 registres matériels de 16 bits situés de `$FF8240` (couleur 0) à
`$FF825E` (couleur 15).

Chaque registre code une couleur au format `$0RVB`, un chiffre hexadécimal pour le rouge, le vert
et le bleu. Sur un ST (STF), chaque composante va de 0 à 7, sur 3 bits, ce qui donne 8 × 8 × 8 =
512 couleurs possibles, dont 16 à l'écran en même temps.

| Valeur | Couleur |
|---|---|
| `$000` | noir |
| `$700` | rouge vif |
| `$070` | vert vif |
| `$007` | bleu vif |
| `$770` | jaune |
| `$777` | blanc |

Le STE ajoute un quatrième bit par composante (4 096 couleurs), rangé de façon particulière pour
rester compatible. 68k Trainer simule un STF, qui ignore les bits en trop comme la vraie machine.

La couleur 0 est celle du fond et du bord de l'écran.

## Changer la palette

Setcolor (XBIOS 7) change une couleur et Setpalette (XBIOS 6) les 16 d'un coup, sans passer en
superviseur. Écrire directement à partir de `$FF8240` est plus rapide, mais demande le mode
superviseur, puisque ce sont des registres matériels.

## Changer une couleur sans redessiner

Changer une couleur de la palette change en même temps tous les pixels qui portent ce numéro, sans
toucher à un seul octet de l'écran. Les démos s'en servent sans cesse pour faire défiler des
dégradés, clignoter un motif ou fondre l'image au noir, bien plus vite qu'en redessinant.
