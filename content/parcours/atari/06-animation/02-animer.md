## 50 images par seconde

Le Shifter relit l'écran 50 fois par seconde sur un ST européen. Entre deux images, le faisceau du
moniteur remonte en haut de l'écran, c'est le retour vertical, et le ST le signale par une
interruption, la **VBL** (*Vertical BLank*, vecteur `$70`, niveau 4).

Pour animer proprement, on cale le programme sur ce rythme, une étape de l'animation par image. La
fonction XBIOS 37, `Vsync`, attend justement la prochaine VBL :

```asm
    MOVE.W  #37,-(SP)       ; Vsync
    TRAP    #14
    ADDQ.L  #2,SP
```

Dans 68k Trainer, le bouton « Temps réel » exécute le programme à la vitesse d'un vrai ST, et tu
vois l'animation comme sur un moniteur ; en pas à pas, un `Vsync` passe d'un seul clic.

## Le budget d'une image

Un ST tourne à 8 MHz, donc une image dure 160 256 cycles d'horloge : c'est tout le temps dont tu
disposes pour effacer, calculer et redessiner. Une instruction simple prend 4 cycles, et chaque
accès à la mémoire en ajoute 4 par mot. Le débogueur affiche le compteur de cycles sous le registre
d'état.

Effacer tout l'écran avec une boucle `CLR.L (A0)+` / `DBF` coûte environ 8 000 × 22 = 176 000
cycles, soit plus d'une image : c'est pourquoi les jeux n'effacent que ce qui bouge.

## Le scintillement et le double tampon

Si l'on efface puis redessine sur l'écran affiché, le faisceau peut passer au mauvais moment et
montrer le sprite à moitié effacé, et l'image scintille. La solution classique est le **double
tampon** : on réserve deux écrans, on dessine sur celui qu'on ne voit pas (l'écran *logique*), puis
on demande au Shifter d'afficher celui qu'on vient de finir (l'écran *physique*) et on attend la
VBL, pour que l'échange ait lieu pendant le retour du faisceau. À l'image suivante, les rôles
s'inversent.

L'échange se fait avec XBIOS 5, `Setscreen(logique, physique, résolution)`, où −1 laisse une valeur
inchangée :

```asm
    MOVE.W  #-1,-(SP)       ; résolution : inchangée
    MOVE.L  D0,-(SP)        ; écran physique (affiché)
    MOVE.L  D0,-(SP)        ; écran logique (où le TOS dessine)
    MOVE.W  #5,-(SP)        ; Setscreen
    TRAP    #14
    LEA     12(SP),SP
```

## Un écran commence sur un multiple de 256

Le Shifter d'un ST ne mémorise que deux octets de l'adresse de l'écran (`$FF8201` et `$FF8203`,
les bits 23-16 et 15-8) : l'octet de poids faible vaut toujours 0, et un écran doit donc commencer
à une adresse multiple de 256. Pour en être sûr, on réserve 256 octets de plus et on arrondit
l'adresse :

```asm
    MOVE.L  #ECRANS+255,D0
    CLR.B   D0              ; multiple de 256 au-dessus de ECRANS
    ; ...
    SECTION BSS
ECRANS: DS.B    32000+256
```

Si on l'oublie, le Shifter arrondit lui-même vers le bas, et l'image apparaît décalée.
