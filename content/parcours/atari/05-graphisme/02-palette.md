## Un numéro de couleur n'est pas une couleur

Les 4 bits d'un pixel ne donnent pas directement une couleur : ils donnent un **numéro**, de 0 à
15. La vraie couleur est lue dans la **palette**, 16 registres matériels de 16 bits situés de
`$FF8240` (couleur 0) à `$FF825E` (couleur 15).

Chaque registre code une couleur au format **`$0RVB`** : un chiffre hexadécimal pour le rouge, le
vert et le bleu. Sur un **ST** (STF), chaque composante va de **0 à 7** (3 bits), ce qui donne
8 × 8 × 8 = **512 couleurs possibles**, dont 16 à l'écran en même temps.

| Valeur | Couleur |
|---|---|
| `$000` | noir |
| `$700` | rouge vif |
| `$070` | vert vif |
| `$007` | bleu vif |
| `$770` | jaune |
| `$777` | blanc |

Le **STE** ajoute un quatrième bit par composante (4 096 couleurs), rangé de façon particulière
pour rester compatible : on en reparlera plus tard. 68k Trainer simule un STF : les bits en trop
sont ignorés, comme sur la vraie machine.

La **couleur 0** est celle du **fond** (et du bord de l'écran).

## Changer la palette

- **Setcolor** (XBIOS 7) change une couleur, **Setpalette** (XBIOS 6) les 16 d'un coup : pas
  besoin du mode superviseur.
- Écrire directement dans `$FF8240`… est plus rapide mais demande le mode **superviseur**
  (registres matériels).

## La magie de la palette

Changer une couleur de la palette change **instantanément tous les pixels** qui portent ce
numéro, sans toucher à un seul octet de l'écran. Les démos l'utilisent sans cesse : dégradés qui
défilent, clignotements, fondus au noir… C'est des milliers de fois plus rapide que de redessiner.
