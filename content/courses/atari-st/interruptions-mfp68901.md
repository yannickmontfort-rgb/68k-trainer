---
title: "Interruptions matérielles : le contrôleur MFP68901"
source: "cours_asm_68000.pdf — Le Féroce Lapin, Volume 2, cours 10 (adapté)"
themes: ["interruptions", "materiel"]
---

# Interruptions matérielles : le contrôleur MFP68901

> Prérequis : le mécanisme général d'interruption et les bits I2-I0 du SR sont couverts dans le
> tronc commun ([registres-et-memoire.md](../general/registres-et-memoire.md)). Ce qui suit est
> spécifique à la puce d'interruption/E-S de l'Atari ST.

Le **MFP68901** (*Multi Function Peripheral*) est un circuit annexe géré par le 68000 comme une
seule source d'interruption de **niveau 6**, mais qui gère en interne **16 sous-niveaux**
d'interruption qui lui sont propres, chacun avec sa propre adresse de vecteur (`$100` à `$13C` sur
ST). C'est via ce circuit que sont gérées, entre autres, les timers (A/B/C/D) et diverses
interruptions clavier/souris/son.

## Les registres du MFP

Les 16 niveaux du MFP sont répartis en deux groupes de 8 : **A** (niveaux 8-15) et **B**
(niveaux 0-7) — sans rapport avec les Timers A/B. Chaque groupe a sa propre série de registres, un
bit par niveau d'interruption :

| Registre | Rôle |
|---|---|
| `IERA`/`IERB` (*Interrupt Enable*) | bit à 0 = interruption totalement désactivée |
| `IMRA`/`IMRB` (*Interrupt Mask*) | bit à 0 = interruption **masquée temporairement** (autorisée mais ignorée pour l'instant — utile pour qu'une routine se protège elle-même d'une interruption de priorité inférieure pendant son exécution) |
| `IPRA`/`IPRB` (*Interrupt Pending*) | mis à 1 par le MFP quand une interruption survient mais attend son tour ; peut être remis à 0 manuellement pour l'annuler |
| `ISRA`/`ISRB` (*Interrupt in Service*) | bit à 1 = interruption en cours de traitement |
| `VR` (*Vector Register*) | bit 3 seulement utile ici : choisit entre mode *Automatic End of Interrupt* (par défaut) et *Software End of Interrupt* |

**Automatic vs Software End of Interrupt** : en mode automatique, le bit `ISR` correspondant
retombe à 0 dès le début du traitement — une interruption de même niveau peut alors en interrompre
une autre déjà en cours. En mode logiciel, c'est à la routine de remettre elle-même son bit `ISR` à
0 (typiquement en tout dernier, juste avant `RTE`) — tant qu'elle ne l'a pas fait, aucune autre
interruption de priorité inférieure ou égale ne peut la couper.

## Installer sa propre routine sur un timer

Schéma général (illustré ici avec le Timer A, vecteur `$134`) :

1. Passer en mode Superviseur (nécessaire pour toucher au SR et aux registres du MFP).
2. Bloquer les interruptions (`MOVE.W #$2700,SR`) le temps de la manipulation.
3. **Sauvegarder** l'ancien contenu de `IERA/IERB/IMRA/IMRB/VR` et l'ancienne adresse du vecteur —
   indispensable pour tout restaurer proprement en quittant le programme.
4. Installer sa propre routine à l'adresse du vecteur (`MOVE.L #MA_ROUTINE,$134`).
5. Activer/démasquer précisément le bit du timer concerné dans `IERA`/`IMRA`.
6. Redescendre le SR au niveau normal du ST (`$2300`) pour réautoriser les interruptions.

```asm
        MOVE.W  #$2700,SR              ; bloque toutes les interruptions le temps de préparer
        MOVE.B  $FFFFFA07,ANC_IERA     ; sauvegarde l'état courant (à restaurer en quittant)
        ; ... idem IERB, IMRA, IMRB, VR ...
        MOVE.L  $134,ANC_TIMEA          ; sauvegarde l'ancienne routine du Timer A
        MOVE.L  #MY_TIMEA,$134          ; installe la nôtre
        ; ... régler les bits IER/IMR pour n'autoriser QUE l'interruption voulue ...
        MOVE.W  #$2300,SR               ; réautorise les interruptions au niveau normal du ST

MY_TIMEA:
        MOVEM.L D0-A6,-(SP)   ; sauver TOUS les registres utilisés : on ne sait jamais ce qu'on interrompt
        ; ... traitement ...
        BCLR    #5,ISRA        ; si mode Software End of Interrupt : signale la fin du traitement
        MOVEM.L (SP)+,D0-A6
        RTE                     ; retour d'exception, pas RTS
```

> **En quittant le programme, tout restaurer dans l'ordre inverse** (registres MFP + adresse du
> vecteur d'origine) — sans quoi la routine reste active en mémoire après la fin du programme et le
> système plante au prochain déclenchement du timer, pointant vers du code qui n'existe plus.

## Hors périmètre de ce trainer

Ce dernier cours du Volume 2 se termine par une bibliographie (ouvrages et magazines des années
1990, largement obsolètes aujourd'hui) — non reprise ici. Avec cette fiche, l'extraction du Volume 2
du "Cours d'assembleur 68000 sur Atari ST" par Le Féroce Lapin est terminée.
