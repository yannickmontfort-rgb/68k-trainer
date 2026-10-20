## Quatre voix numériques

Là où le ST a une puce qui fabrique des sons carrés, l'Amiga **joue des échantillons** : Paula lit
des octets en Chip RAM et les envoie au haut-parleur, sur **4 voies** indépendantes. Les voies 0 et
3 sortent à gauche, 1 et 2 à droite : l'Amiga est stéréo.

Un échantillon est une suite d'octets **signés** (−128 à +127) : la forme de l'onde. Avec 32 octets
qui montent puis descendent, on a une onde triangulaire ; avec 16 octets à +100 puis 16 à −100,
une onde carrée.

## Les registres d'une voie

Chaque voie a 5 registres, à partir de `$DFF0A0` pour la voie 0 (`$0B0` pour la 1, `$0C0` pour
la 2, `$0D0` pour la 3) :

| Registre | Décalage (voie 0) | Rôle |
|---|---|---|
| `AUD0LC` | `$0A0` (mot long) | l'adresse de l'échantillon, en Chip RAM |
| `AUD0LEN` | `$0A4` | sa longueur, **en mots** (octets ÷ 2) |
| `AUD0PER` | `$0A6` | la **période** : la durée d'un octet, en tops de l'horloge de Paula |
| `AUD0VOL` | `$0A8` | le **volume**, de 0 à 64 |

## La période

L'horloge de Paula tourne à **3 546 895 Hz** (Amiga PAL). Paula envoie un octet tous les
`période` tops : la fréquence d'échantillonnage vaut 3 546 895 ÷ période. Si l'échantillon contient
**un cycle** de l'onde en N octets, la note jouée a pour fréquence :

> f = 3 546 895 ÷ (période × N)    soit    période = 3 546 895 ÷ (f × N)

Pour un *la* à 440 Hz avec une onde de 32 octets : période = 3 546 895 ÷ 14 080 ≈ **252**. La
période ne peut pas descendre sous 124 (environ 28 600 octets par seconde) : au-delà, le DMA n'a
plus le temps de lire.

## Jouer, arrêter

Le DMA de la voie 0 est le bit 0 de `DMACON` (AUD0EN) ; il faut aussi DMAEN (`$0200`).

```asm
    LEA     $DFF000,A5
    MOVE.L  #onde,$A0(A5)   ; AUD0LC
    MOVE.W  #16,$A4(A5)     ; AUD0LEN : 32 octets = 16 mots
    MOVE.W  #252,$A6(A5)    ; AUD0PER : un la
    MOVE.W  #64,$A8(A5)     ; AUD0VOL : le maximum
    MOVE.W  #$8201,$96(A5)  ; DMACON : SET + DMAEN + AUD0EN, ça joue !
    ; ...
    MOVE.W  #$0001,$96(A5)  ; AUD0EN à 0 : silence
```

Une fois lancée, la voie **rejoue l'échantillon en boucle** jusqu'à ce qu'on l'arrête : c'est
parfait pour une note tenue. Pour changer de note, il suffit d'écrire une autre période ; pour un
autre volume, `AUD0VOL`, à tout moment.

Dans 68k Trainer, coche 🔊 sous l'écran et lance **🎬 Temps réel** pour entendre Paula.
