## Dix-sept registres de 32 bits (et un PC)

Les registres sont de petites cases mémoire **à l'intérieur** du processeur : y accéder est bien
plus rapide que d'aller en mémoire. Le 68000 en a deux familles.

### Les registres de données : D0 à D7

Ils servent aux calculs : additions, comparaisons, opérations logiques… Ils acceptent les trois
tailles `.B`, `.W` et `.L`, et une opération en `.B` ou `.W` ne modifie que leur partie basse.

### Les registres d'adresse : A0 à A7

Ils servent de **pointeurs** : ils contiennent l'adresse d'une donnée en mémoire. Ils ont trois
particularités :

1. **Pas d'octet** : `MOVE.B D0,A1` est refusé par l'assembleur.
2. **Une opération en `.W` remplit tout le registre**, avec **extension de signe** : le bit 15 est
   recopié dans les bits 16 à 31.

   ```asm
       MOVEA.W #$1234,A0   ; A0 = $00001234
       MOVEA.W #$8000,A1   ; A1 = $FFFF8000 (bit 15 à 1 : recopié vers le haut)
   ```

3. **Les flags ne bougent pas** : `MOVEA`, `ADDA`, `SUBA` ne modifient pas le registre d'état.

Pour charger une adresse, on utilise `MOVEA.L #adresse,An` ou, plus souvent, **`LEA`** (*Load
Effective Address*) : `LEA $2000,A0` met l'adresse `$2000` dans A0.

### A7 : le pointeur de pile

A7 est aussi appelé **SP** (*Stack Pointer*). Il pointe sur le sommet de la pile (voir la notion
« La pile »). Il en existe en réalité **deux** : un pour le mode utilisateur (USP), un pour le
mode superviseur (SSP). Le 68000 utilise automatiquement le bon selon son mode.

### Le compteur de programme : PC

Le **PC** (*Program Counter*) contient l'adresse de la **prochaine instruction** à exécuter. Après
chaque instruction, il avance ; un saut (`BRA`, `BSR`, `JMP`…) le modifie. Tu le vois avancer
dans le panneau de pas à pas.
