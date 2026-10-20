## Pourquoi prendre la main ?

Pendant que ton programme tourne, le système continue de travailler : à chaque image, graphics
relance **sa** liste Copper (l'écran du Workbench), ses interruptions déplacent le pointeur de
la souris, le Blitter dessine des fenêtres… Si tu programmes les puces à côté de lui, il défait
ton travail 50 fois par seconde. C'est ce qui arrivait à la couleur du fond, au chapitre 1.

Les démos et les jeux **coupent donc le système**, font ce qu'ils veulent des puces… puis le
**rétablissent exactement** comme il était. Un programme qui oublie de le rendre laisse un Amiga
figé, écran noir, souris immobile.

## Prendre la main, proprement

1. **Ouvrir graphics.library** et noter la vue affichée (`gb_ActiView`, à 34 octets de sa base).
2. **`LoadView(0)`** (graphics, −222) puis deux fois **`WaitTOF`** (−270) : le système n'affiche
   plus rien et a fini sa dernière image.
3. **`OwnBlitter`** (−456) puis **`WaitBlit`** (−228) : le Blitter est à nous, et il a fini ce
   que le système lui avait demandé.
4. **`Forbid`** : plus d'autres tâches.
5. **Sauvegarder** `DMACONR`, `INTENAR`, `ADKCONR` et le vecteur de niveau 3 (`$6C`).
6. **Couper** : `$7FFF` dans `INTENA`, `INTREQ` et `DMACON` (bit 15 à 0 : tous les bits à 0).

Ensuite, on allume seulement ce dont on a besoin, par exemple le Copper :

```asm
    MOVE.L  #maliste,$80(A5)    ; COP1LC : l'adresse de notre liste Copper
    MOVE.W  D0,$88(A5)          ; COPJMP1 : écrire n'importe quoi ici lance le Copper
    MOVE.W  #$8280,$96(A5)      ; DMACON : SET + DMAEN + COPEN
```

## Rendre la main, à l'identique

1. Tout couper à nouveau (`$7FFF` dans `INTENA`, `INTREQ`, `DMACON`), remettre le vecteur `$6C`.
2. Remettre la liste Copper du système : son adresse est dans **`gb_copinit`**, à 38 octets de
   la base de graphics. On l'écrit dans `COP1LC`, puis on écrit dans `COPJMP1`.
3. Rallumer ce qui était allumé : **la valeur sauvegardée, avec le bit 15 à 1**.

```asm
    MOVE.W  sauve_dmacon,D0
    OR.W    #$8000,D0           ; SET : rallumer les bits qui étaient à 1
    MOVE.W  D0,$96(A5)
    MOVE.W  sauve_intena,D0
    OR.W    #$C000,D0           ; SET + INTEN, l'interrupteur général des interruptions
    MOVE.W  D0,$9A(A5)
```

4. **`LoadView`** de l'ancienne vue, deux **`WaitTOF`**, **`DisownBlitter`** (−462),
   **`Permit`**, et refermer graphics.library.

**Le piège du bit 15.** Sans le `OR.W #$8000`, le mot sauvegardé a son bit 15 à 0 : l'écrire dans
`DMACON` **éteint** les canaux du système au lieu de les rallumer. Le manuel Amiga fourni avec
68k Trainer fait d'ailleurs l'erreur dans son squelette (il ajoute `$8000` à la variable mais
écrit ensuite une autre adresse) : c'est corrigé ici, voir l'errata.

## Le fichier amiga-systeme.s

Ces deux procédures sont toujours les mêmes. 68k Trainer les fournit dans un fichier que tu peux
inclure à la fin de tes programmes, comme les démomakers incluaient leur *startup* :

```asm
    BSR     prendre             ; au retour : A5 = $DFF000, tout est coupé
    ; ... ton programme ...
    BSR     rendre              ; tout est rendu
    RTS
    INCLUDE "amiga-systeme.s"
```

Il contient aussi `attendre_vbl` (attend que le faisceau soit en bas de l'image) et
`attendre_clic` (attend un clic du bouton gauche). Son texte complet est dans l'exemple de
cette notion : lis-le une fois en entier, il n'a rien de mystérieux.

À la fin de chaque programme, 68k Trainer fait le **bilan** : Permit, Enable, mémoire, DMA,
interruptions, liste Copper, vecteur `$6C`, vue. Si quelque chose n'a pas été rendu, il te le dit.
