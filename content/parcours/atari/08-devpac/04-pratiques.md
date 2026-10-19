## Des conventions de registres

Le TOS garantit qu'un appel système (GEMDOS, BIOS, XBIOS) **préserve D3 à D7 et A3 à A6** ; il
peut modifier D0 à D2 et A0 à A2 (D0 contient souvent le résultat). Les codeurs du ST ont pris la
même habitude pour leurs propres sous-programmes :

- **D0-D2 / A0-A2** : registres de travail, que tout sous-programme peut écraser ;
- **D3-D7 / A3-A6** : registres « durables » ; un sous-programme qui en a besoin les **sauvegarde**
  (`MOVEM.L D3-D4/A3,-(SP)`) et les **rend** avant `RTS`.

## Commenter les entrées et les sorties

Au-dessus de chaque sous-programme, trois lignes évitent des heures de débogage :

```
; DESSINER : dessine le carré en X = D5 dans la bande pointée par A6
; Entrées : D5.W = X (0-304), A6 = début de la bande
; Sortie  : rien ; modifie D0-D2/A0
```

## Rendre ce qu'on a pris

Un programme est un invité : il doit laisser la machine **comme il l'a trouvée**.

- Tout **vecteur** détourné (`$70`, `$118`, Kbdvbase, file VBL…) est **sauvegardé** à l'installation
  et **remis** avant de quitter.
- Les **registres matériels** changés (timers du MFP, palette, écran, son) sont remis dans leur
  état : le bureau GEM n'aime pas les couleurs de ta démo !
- On quitte par **Pterm0** (ou Pterm), jamais en laissant le processeur courir dans le vide.

## Se chaîner plutôt que remplacer

Quand on remplace une routine d'interruption (la VBL en `$70`, par exemple), le TOS ne fait plus
son propre travail (compteurs, file VBL, palette demandée…). La bonne pratique est de **se
chaîner** : faire son travail, puis sauter à l'ancienne routine, qui terminera par `RTE` :

```
MAVBL:
    ADDQ.W  #1,COMPTEUR
    MOVE.L  ANCIEN(PC),-(SP)  ; adresse de l'ancienne routine sur la pile...
    RTS                       ; ... RTS y « revient » : c'est un saut
```

## Le superviseur, juste le temps nécessaire

Le mode superviseur lève toutes les protections : une erreur y fait plus de dégâts. On n'y passe
donc que pour ce qui l'exige (vecteurs, variables système, matériel), en regroupant ces accès dans
de **petites routines appelées par `Supexec`**, et le reste du programme tourne en mode utilisateur.

## Un plan type

```
START:      initialisations (Supexec : sauvegarder, installer)
BOUCLE:     Vsync, lire le clavier/joystick, calculer, dessiner
            ... jusqu'à la touche de sortie
FIN:        Supexec : tout remettre en place
            Pterm0
```
