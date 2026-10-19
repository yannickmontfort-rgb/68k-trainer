## 50 images par seconde

Le Shifter relit l'écran **50 fois par seconde** (sur un ST européen). Entre deux images, le
faisceau du moniteur remonte en haut de l'écran : c'est le **retour vertical**, et le ST le signale
par une interruption, la **VBL** (*Vertical BLank*, vecteur `$70`, niveau 4).

Pour animer proprement, on synchronise son programme sur ce rythme : **une étape de l'animation
par image**. La fonction **XBIOS 37, `Vsync`**, attend justement la prochaine VBL :

```
    MOVE.W  #37,-(SP)       ; Vsync
    TRAP    #14
    ADDQ.L  #2,SP
```

Dans 68k Trainer, le bouton **🎬 Temps réel** exécute le programme à la vitesse d'un vrai ST : tu vois
l'animation comme sur un moniteur. Le pas à pas, lui, passe un `Vsync` d'un seul clic.

## Le budget d'une image

Un ST tourne à 8 MHz : une image dure **160 256 cycles** d'horloge. C'est tout le temps dont tu
disposes pour effacer, calculer et redessiner. Une instruction simple prend 4 cycles, un accès à la
mémoire 4 de plus par mot. Le débogueur affiche le compteur de cycles sous le registre d'état :
regarde-le avancer !

Ordre de grandeur : effacer **tout** l'écran avec une boucle `CLR.L (A0)+` / `DBF` coûte environ
8 000 × 22 = 176 000 cycles… **plus d'une image**. Voilà pourquoi les jeux n'effacent que ce qui
bouge.

## Le scintillement, et le double tampon

Si l'on efface puis redessine **sur l'écran affiché**, le faisceau peut passer au mauvais moment
et montrer le sprite à moitié effacé : l'image **scintille**. La solution classique est le
**double tampon** :

1. on réserve **deux écrans** ;
2. on dessine sur celui qu'on **ne voit pas** (l'écran *logique*) ;
3. on demande au Shifter d'afficher celui qu'on vient de finir (l'écran *physique*), puis on
   attend la VBL : l'échange a lieu pendant le retour du faisceau ;
4. on recommence en inversant les rôles.

L'échange se fait avec **XBIOS 5, `Setscreen(logique, physique, résolution)`** (−1 = inchangé) :

```
    MOVE.W  #-1,-(SP)       ; résolution : inchangée
    MOVE.L  D0,-(SP)        ; écran physique (affiché)
    MOVE.L  D0,-(SP)        ; écran logique (où le TOS dessine)
    MOVE.W  #5,-(SP)        ; Setscreen
    TRAP    #14
    LEA     12(SP),SP
```

## Un écran commence sur un multiple de 256

Le Shifter d'un ST ne mémorise que **deux octets** de l'adresse de l'écran (`$FF8201` et
`$FF8203`, les bits 23-16 et 15-8) : l'octet de poids faible vaut toujours 0. Un écran doit donc
commencer à une adresse **multiple de 256**. Pour en être sûr, on réserve 256 octets de plus et on
arrondit l'adresse :

```
    MOVE.L  #ECRANS+255,D0
    CLR.B   D0              ; multiple de 256 au-dessus de ECRANS
    ...
    SECTION BSS
ECRANS: DS.B    32000+256
```

Si on l'oublie, le Shifter arrondit lui-même… **vers le bas**, et affiche une image décalée.
