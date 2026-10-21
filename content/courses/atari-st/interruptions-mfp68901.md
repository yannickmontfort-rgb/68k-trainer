---
title: "Interruptions matérielles : le contrôleur MFP68901"
source: "cours_asm_68000.pdf — Le Féroce Lapin, Volume 2, cours 10 (adapté) ; MC68901 MFP (Motorola), Atari ST Hardware Register Listing. Complétée et corrigée le 21/10/2026."
themes: ["interruptions", "materiel"]
---

# Interruptions matérielles : le contrôleur MFP68901

> Prérequis : le mécanisme des exceptions et le masque d'interruption I2-I0 du SR sont dans le
> tronc commun ([registres-et-memoire.md](../general/registres-et-memoire.md),
> [pile-et-sous-programmes.md](../general/pile-et-sous-programmes.md)). Ce qui suit est propre à
> l'Atari ST.

## Les trois niveaux d'interruption du ST

| Niveau | Source | Vecteur | Usage |
|---|---|---|---|
| 2 | **HBL** — fin de chaque ligne affichée | `$68` | presque jamais utilisé (masqué par le TOS) |
| 4 | **VBL** — retour du faisceau en haut de l'écran (50 ou 60 Hz) | `$70` | synchronisation, animation |
| 6 | **MFP 68901** — 16 sources à lui seul | `$100`-`$13C` | timers, clavier, disque, imprimante |

Le TOS travaille avec le masque à **3** (`MOVE.W #$2300,SR`) : VBL et MFP passent, HBL non.

## Le MFP et ses 16 sources

Le **MFP 68901** (*Multi Function Peripheral*) est vu par le 68000 comme **une** source
d'interruption de niveau 6, mais il gère en interne **16 canaux** classés par priorité, chacun avec
son vecteur. Sur le ST, le TOS règle le registre `VR` à `$48` : les vecteurs commencent au n° 64
(`$100`), et le mode **fin d'interruption logicielle** est actif (bit S = 1).

| Canal | Source | Vecteur | Groupe / bit |
|---|---|---|---|
| 15 | détection de moniteur monochrome (GPIP 7) | `$13C` | A / 7 |
| 14 | RS-232 : indicateur d'anneau | `$138` | A / 6 |
| 13 | **Timer A** (libre : musiques, effets) | `$134` | A / 5 |
| 12 | RS-232 : tampon de réception plein | `$130` | A / 4 |
| 11 | RS-232 : erreur de réception | `$12C` | A / 3 |
| 10 | RS-232 : tampon d'émission vide | `$128` | A / 2 |
| 9 | RS-232 : erreur d'émission | `$124` | A / 1 |
| 8 | **Timer B** (compte les lignes affichées) | `$120` | A / 0 |
| 7 | contrôleur de disque (FDC/DMA) | `$11C` | B / 7 |
| 6 | **ACIA** clavier et MIDI | `$118` | B / 6 |
| 5 | **Timer C** (horloge système à 200 Hz du TOS) | `$114` | B / 5 |
| 4 | Timer D (vitesse de la RS-232) | `$110` | B / 4 |
| 3 | Blitter (Mega ST, STE) | `$10C` | B / 3 |
| 2 | RS-232 : CTS | `$108` | B / 2 |
| 1 | RS-232 : DCD | `$104` | B / 1 |
| 0 | imprimante : BUSY | `$100` | B / 0 |

## Les registres du MFP

Ils sont aux **adresses impaires** de `$FFFFFA01` à `$FFFFFA2F` (accès par octet, en superviseur).
Les registres d'interruption existent par paires : groupe **A** (canaux 8-15) et groupe **B**
(canaux 0-7) — sans rapport avec les Timers A et B.

| Adresse | Registre | Rôle |
|---|---|---|
| `$FFFFFA01` | `GPIP` | état des 8 lignes d'entrée (bit 0 = BUSY imprimante, bit 4 = ACIA, bit 5 = disque, bit 7 = moniteur) |
| `$FFFFFA07` / `$FFFFFA09` | `IERA` / `IERB` | **autorisation** : bit à 0 = le canal est ignoré complètement |
| `$FFFFFA0B` / `$FFFFFA0D` | `IPRA` / `IPRB` | **en attente** : mis à 1 quand l'événement survient ; écrire un 0 l'annule |
| `$FFFFFA0F` / `$FFFFFA11` | `ISRA` / `ISRB` | **en service** : la routine du canal est en cours |
| `$FFFFFA13` / `$FFFFFA15` | `IMRA` / `IMRB` | **masque** : bit à 0 = l'événement est noté (IPR) mais ne déclenche pas d'interruption |
| `$FFFFFA17` | `VR` | numéro du premier vecteur (bits 7-4), bit 3 = fin d'interruption logicielle |
| `$FFFFFA19` | `TACR` | contrôle du Timer A |
| `$FFFFFA1B` | `TBCR` | contrôle du Timer B |
| `$FFFFFA1D` | `TCDCR` | contrôle des Timers C (bits 6-4) et D (bits 2-0) |
| `$FFFFFA1F` | `TADR` | donnée du Timer A (valeur de départ du compte à rebours) |
| `$FFFFFA21` | `TBDR` | donnée du Timer B |
| `$FFFFFA23` / `$FFFFFA25` | `TCDR` / `TDDR` | données des Timers C et D |

**Fin d'interruption logicielle** (mode du TOS) : le bit `ISR` du canal passe à 1 au début du
traitement et **reste** à 1 tant que la routine ne l'a pas effacé elle-même. Pendant ce temps,
aucun canal de priorité inférieure ou égale ne peut l'interrompre. Une routine MFP doit donc
**effacer son bit ISR** juste avant `RTE` — sinon plus aucune interruption de même priorité ou
inférieure n'arrive (le clavier et l'horloge se figent). En mode automatique (bit 3 de `VR` à 0),
le bit `ISR` retombe tout seul, et une interruption peut s'interrompre elle-même.

## Les timers

Chaque timer décompte à partir de la valeur de son registre de données (1 à 256, 0 valant 256) ; à
zéro, il déclenche son interruption et repart. L'horloge des timers est de **2,4576 MHz**, divisée
par un **prédiviseur** choisi dans le registre de contrôle :

| Valeur (bits 2-0) | Mode |
|---|---|
| 0 | timer arrêté |
| 1 / 2 / 3 / 4 | délai, ÷ 4 / ÷ 10 / ÷ 16 / ÷ 50 |
| 5 / 6 / 7 | délai, ÷ 64 / ÷ 100 / ÷ 200 |
| 8 (Timers A et B) | **comptage d'événements** sur une entrée externe |

**Fréquence** = 2 457 600 / prédiviseur / donnée. Exemple : ÷ 200 et donnée 246 → environ 50 Hz.

Le **Timer B** en mode comptage d'événements compte les **fins de ligne** affichées : avec la
donnée *n*, il interrompt toutes les *n* lignes. C'est la base des **rasters** (changement de
couleur au milieu de l'écran) des démos du ST.

## Installer sa propre routine sur un timer

Schéma général, illustré avec le Timer A (canal 13, vecteur `$134`, bit 5 du groupe A) :

1. Passer en mode superviseur (`Super` ou `Supexec`).
2. Bloquer les interruptions (`MOVE.W #$2700,SR`) le temps de la manipulation.
3. **Sauvegarder** l'ancien vecteur et les registres qu'on va modifier (`IERA`, `IMRA`, `TACR`,
   `TADR`) — indispensable pour tout restaurer en quittant.
4. Installer sa routine dans le vecteur, régler le timer, puis autoriser **et** démasquer son canal.
5. Revenir au niveau normal du TOS (`MOVE.W #$2300,SR`).

```asm
MFP     EQU     $FFFFFA00

INSTALLE:                       ; en superviseur
        MOVE.W  #$2700,SR       ; plus d'interruption pendant la manipulation
        MOVE.L  $134.W,ANCIEN_TA ; ancien vecteur du Timer A
        MOVE.B  MFP+$07,ANC_IERA
        MOVE.B  MFP+$13,ANC_IMRA
        MOVE.L  #TIMER_A,$134.W ; notre routine
        CLR.B   MFP+$19         ; Timer A arrêté pendant le réglage
        MOVE.B  #246,MFP+$1F    ; donnée : 246
        MOVE.B  #7,MFP+$19      ; ÷ 200 : environ 50 interruptions par seconde
        BSET    #5,MFP+$07      ; IERA : canal 13 autorisé
        BSET    #5,MFP+$13      ; IMRA : canal 13 démasqué
        MOVE.W  #$2300,SR       ; interruptions à nouveau acceptées
        RTS

TIMER_A:
        MOVEM.L D0-D1/A0,-(SP)  ; sauver tout ce qu'on utilise : on ne sait pas ce qu'on interrompt
        ADDQ.W  #1,COMPTEUR     ; ... le traitement, court ...
        MOVEM.L (SP)+,D0-D1/A0
        BCLR    #5,MFP+$0F      ; ISRA : fin d'interruption (mode logiciel du TOS)
        RTE                     ; retour d'exception, pas RTS

DESINSTALLE:                    ; en superviseur, avant de quitter
        MOVE.W  #$2700,SR
        CLR.B   MFP+$19         ; Timer A arrêté
        MOVE.B  ANC_IERA,MFP+$07
        MOVE.B  ANC_IMRA,MFP+$13
        MOVE.L  ANCIEN_TA,$134.W
        MOVE.W  #$2300,SR
        RTS

ANCIEN_TA DC.L  0
ANC_IERA  DC.B  0
ANC_IMRA  DC.B  0
COMPTEUR  DC.W  0
```

> **En quittant le programme, tout restaurer** (registres du MFP et vecteur d'origine) — sinon la
> routine reste branchée après la fin du programme, et la machine plante au déclenchement suivant,
> en sautant dans de la mémoire qui ne contient plus notre code.

> Le TOS fournit aussi `Xbtimer(timer, contrôle, donnée, routine)` (XBIOS 31) et
> `Jenabint`/`Jdisint` (XBIOS 27/26), qui font ce réglage à notre place.

## La VBL : la routine la plus simple

Pour exécuter du code 50 fois par seconde sans toucher au MFP, le TOS appelle à chaque VBL les
routines dont l'adresse est dans sa **liste VBL** (`_vblqueue`, `$456`, avec `nvbls` entrées). Une
routine VBL est un simple sous-programme qui se termine par **`RTS`** (le TOS s'occupe du `RTE`), et
peut modifier D0-D7/A0-A6.

```asm
AJOUTE_VBL:                     ; en superviseur
        MOVEA.L $456.W,A0       ; _vblqueue : tableau de nvbls adresses
        MOVE.W  $454.W,D0       ; nvbls
        SUBQ.W  #1,D0
.cherche TST.L  (A0)+           ; une case libre vaut 0
        DBEQ    D0,.cherche
        BNE     .pleine         ; aucune case libre
        MOVE.L  #MA_VBL,-(A0)   ; s'installer dans la case trouvée
.pleine RTS

MA_VBL: ADDQ.W  #1,COMPTEUR
        RTS
```

(Penser à remettre la case à 0 avant de quitter.)

> Dans le simulateur de 68k Trainer, le MFP est simulé (registres d'interruption, Timers A à D en
> mode délai, Timer B en comptage de lignes), ainsi que la VBL et sa liste. Le parcours Atari a un
> chapitre complet sur les interruptions.

> Fiche complétée et corrigée le 21/10/2026 (Claude) : le TOS utilise la fin d'interruption
> **logicielle** (`VR` = `$48`), pas automatique ; `BCLR #5,ISRA` avec la vraie adresse ; table des
> 16 canaux, registres, timers, VBL — à relire.
