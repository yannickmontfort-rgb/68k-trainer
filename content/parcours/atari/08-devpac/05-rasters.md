## Changer de couleur en cours d'image

Le Shifter lit la palette au début de chaque ligne qu'il affiche. Si un programme change une couleur
pendant que l'image se dessine, le haut de l'écran garde l'ancienne teinte et le bas prend la
nouvelle : c'est le principe des **rasters**, ces barres de couleur qui défilent dans les démos, et
qui montrent bien plus de 16 couleurs sur un même écran.

Encore faut-il changer la couleur au bon moment, à une ligne précise, image après image. C'est le
travail du Timer B du MFP.

## Le Timer B compte les lignes

Le Timer B a un mode où il ne compte pas le temps mais des événements, et sur le ST chaque fin de
ligne affichée en est un. En mode 8, rangé dans son registre de contrôle TBCR, il retire 1 à son
compteur à chaque ligne et déclenche son interruption quand il arrive à 0. Il recharge alors tout
seul sa valeur de départ, rangée dans TBDR, et recommence.

| Adresse | Registre | Rôle |
|---|---|---|
| `$FFFFFA1B` | TBCR | contrôle : 0 arrête le timer, 8 lui fait compter les lignes |
| `$FFFFFA21` | TBDR | le nombre de lignes avant l'interruption |
| `$FFFFFA07` | IERA | bit 0 : interruption du Timer B autorisée |
| `$FFFFFA13` | IMRA | bit 0 : interruption du Timer B démasquée |
| `$FFFFFA0F` | ISRA | bit 0 à remettre à 0 à la fin de la routine |
| `$120` | vecteur | l'adresse de la routine du Timer B |

## Le schéma d'un programme à rasters

À chaque image, la routine de la VBL remet la couleur du haut de l'écran, arrête le Timer B, range
dans TBDR le nombre de lignes avant le premier changement et le relance en mode 8, puis se chaîne à
la VBL du TOS. La routine du Timer B, appelée à chaque passage à 0, change la couleur, met à 0 le
bit 0 de ISRA pour signaler au MFP que l'interruption est traitée, et rend la main par `RTE`.

L'installation et le retrait se font en superviseur, par `Supexec`, comme pour la VBL : on garde
les vecteurs `$70` et `$120` du système, on autorise et démasque le Timer B, et en partant on
arrête le timer et on rend tout comme on l'a trouvé, couleur du fond comprise.

Dans 68k Trainer, les rasters se voient en « Temps réel », et la vérification d'un exercice
regarde l'image affichée, ligne par ligne.
