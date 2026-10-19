## Deux modes de fonctionnement

Le 68000 fonctionne dans l'un de deux modes, choisi par le bit **S** du registre d'état :

| | Mode **utilisateur** (S = 0) | Mode **superviseur** (S = 1) |
|---|---|---|
| Qui ? | les programmes lancés par le TOS | le TOS lui-même, les routines d'interruption |
| Pile | USP | SSP |
| Interdit | `MOVE …,SR`, `STOP`, `RTE`, `MOVE USP`… (violation de privilège : 8 bombes) | rien |
| Mémoire sur ST | les **vecteurs et variables système** (`$000`–`$7FF`) et les **registres matériels** (`$FF8000`+) sont protégés : erreur de bus, **2 bombes** | tout est accessible |

**À partir de ce chapitre, 68k Trainer lance tes programmes en mode utilisateur**, comme le vrai
TOS. Écrire directement dans la palette (`$FF8240`) ou lire une variable système (`$484`) provoque
donc une erreur de bus.

## Passer en superviseur le temps d'une routine : Supexec

La fonction **XBIOS 38, `Supexec`**, exécute une routine de ton programme **en mode superviseur**,
puis revient en mode utilisateur. La routine se termine par un simple `RTS`.

```asm
    PEA     ROUTINE         ; adresse de la routine
    MOVE.W  #38,-(SP)       ; XBIOS 38 : Supexec
    TRAP    #14
    ADDQ.L  #6,SP           ; 4 + 2 octets
    ; ...
ROUTINE:                    ; ici, tout est permis
    BCLR    #0,$484         ; plus de clic clavier
    RTS
```

C'est la méthode recommandée : seules les quelques instructions qui en ont besoin s'exécutent en
superviseur.

## Rester en superviseur : Super

La fonction **GEMDOS 32, `Super`**, fait basculer tout le programme :

```asm
    CLR.L   -(SP)           ; paramètre 0 : passer en superviseur
    MOVE.W  #32,-(SP)
    TRAP    #1
    ADDQ.L  #6,SP
    MOVE.L  D0,ANCIENNE_PILE ; Super renvoie l'ancienne pile superviseur : on la garde
    ; ... ici, mode superviseur
    MOVE.L  ANCIENNE_PILE,-(SP)
    MOVE.W  #32,-(SP)       ; même appel, avec l'ancienne pile : retour en utilisateur
    TRAP    #1
    ADDQ.L  #6,SP
```

Les démos et les jeux l'utilisent pour prendre le contrôle de la machine. Pour un petit accès
ponctuel, préfère `Supexec`.

## Les variables système

Le TOS range ses réglages en mémoire basse. Quelques exemples (lecture et écriture en superviseur) :

| Adresse | Nom | Contenu |
|---|---|---|
| `$484` | `conterm` | bit 0 : clic des touches ; bit 1 : répétition ; bit 2 : sonnerie de Ctrl+G |
| `$44E` | `_v_bas_ad` | adresse de l'écran logique |
| `$462` | `_vbclock` | nombre de VBL (balayages d'écran) depuis le démarrage |
| `$4BA` | `_hz_200` | compteur à 200 Hz |
