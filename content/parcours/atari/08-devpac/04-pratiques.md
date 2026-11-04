## Des conventions de registres

Le TOS garantit qu'un appel système (GEMDOS, BIOS, XBIOS) préserve D3 à D7 et A3 à A6, et il peut
modifier D0 à D2 et A0 à A2, D0 contenant souvent le résultat. Les codeurs du ST ont pris la même
habitude pour leurs propres sous-programmes : D0-D2 et A0-A2 sont des registres de travail, que
tout sous-programme peut écraser, alors que D3-D7 et A3-A6 sont des registres durables, qu'un
sous-programme sauvegarde (`MOVEM.L D3-D4/A3,-(SP)`) et rend avant `RTS` quand il s'en sert.

## Commenter les entrées et les sorties

Au-dessus de chaque sous-programme, trois lignes de commentaire évitent des heures de débogage :

```text
; DESSINER : dessine le carré en X = D5 dans la bande pointée par A6
; Entrées : D5.W = X (0-304), A6 = début de la bande
; Sortie  : rien ; modifie D0-D2/A0
```

## Rendre ce qu'on a pris

Un programme laisse la machine **comme il l'a trouvée**. Tout vecteur détourné (`$70`, `$118`,
Kbdvbase, file VBL) est sauvegardé à l'installation et remis avant de quitter. Les registres
matériels changés, timers du MFP, palette, écran ou son, retrouvent leur état, car le bureau GEM n'a
que faire des couleurs de ta démo. Et l'on quitte par `Pterm0` ou `Pterm`, jamais en laissant le
processeur courir dans le vide.

## Se chaîner plutôt que remplacer

Quand on remplace une routine d'interruption, comme la VBL en `$70`, le TOS ne fait plus son propre
travail : compteurs, file VBL, palette demandée. On se chaîne donc : la routine fait son travail,
puis saute à l'ancienne, qui terminera par `RTE`.

```asm
MAVBL:
    ADDQ.W  #1,COMPTEUR
    MOVE.L  ANCIEN(PC),-(SP)  ; adresse de l'ancienne routine sur la pile...
    RTS                       ; ... RTS y « revient » : c'est un saut
```

## Le superviseur, juste le temps nécessaire

Le mode superviseur lève toutes les protections, et une erreur y fait plus de dégâts. On n'y passe
que pour ce qui l'exige (vecteurs, variables système, matériel), en regroupant ces accès dans de
petites routines appelées par `Supexec`, et le reste du programme tourne en mode utilisateur.

## Un plan type

```text
START:      initialisations (Supexec : sauvegarder, installer)
BOUCLE:     Vsync, lire le clavier/joystick, calculer, dessiner
            ... jusqu'à la touche de sortie
FIN:        Supexec : tout remettre en place
            Pterm0
```
