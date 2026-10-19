## Lire les bombes

Quand un programme plante, le TOS affiche des **bombes** : leur nombre est le **numéro du
vecteur** de l'exception (chapitre 4). Les plus fréquentes :

| Bombes | Exception | Cause habituelle |
|---|---|---|
| 2 | erreur de bus | accès au matériel ou aux vecteurs en mode utilisateur, adresse sans mémoire |
| 3 | erreur d'adresse | accès en mot ou mot long à une adresse **impaire** |
| 4 | instruction illégale | le processeur exécute des données (saut au mauvais endroit, pile abîmée) |
| 5 | division par zéro | DIVU/DIVS par 0 |
| 8 | violation de privilège | instruction réservée au superviseur en mode utilisateur |

## Le cadre de pile d'une erreur de bus ou d'adresse

Pour ces deux exceptions, le 68000 empile **7 mots** d'informations précieuses, que MONST (et le
TOS, après les bombes, en mémoire) permettent de lire :

| Décalage depuis SP | Taille | Contenu |
|---|---|---|
| 0 | mot | mot d'état : bit 4 = lecture (1) ou écriture (0), bit 3 = 0 si c'était la lecture d'une instruction, bits 2-0 = type d'accès |
| 2 | long | **l'adresse fautive** |
| 6 | mot | le premier mot de l'**instruction en cause** |
| 8 | mot | SR au moment de la faute |
| 10 | long | le PC empilé : **quelques octets après** le début de l'instruction en cause |

L'adresse fautive dit souvent tout : impaire → oubli d'un `EVEN` ; `$FFFF8240` en mode utilisateur
→ il manquait `Supexec` ; une valeur folle → un registre d'adresse jamais initialisé.

Pour les autres exceptions, le cadre est plus simple : SR (mot) puis PC (long).

## La méthode

1. **Reproduire** : quelles instructions mènent au plantage ?
2. **Approcher** : un **point d'arrêt** (clic dans la marge, à gauche des numéros de ligne) un peu
   avant l'endroit suspect, puis « Jusqu'au bout » : l'exécution s'arrête dessus.
3. **Observer** pas à pas : registres, pile, mémoire, et la vue **Désassemblage**, qui montre ce que
   le processeur va **vraiment** exécuter (même hors de ton programme).
4. **Comprendre avant de corriger** : une seule hypothèse à la fois.

Sur un vrai 68000, le **mode trace** (bit T du SR) déclenche une exception (vecteur `$24`) après
chaque instruction : c'est ainsi que MONST fait son pas à pas.

## Les pièges classiques

- **Mot fort « sale »** : `MOVE.W` ne change que le mot faible ; un `ADDA.L` ou un `CMP.L` qui
  suit utilise aussi le mot fort, resté quelconque (`MOVEQ #0` avant, ou `.W` partout).
- **Pile déséquilibrée** : autant de registres restaurés que sauvegardés, autant d'octets retirés
  qu'empilés pour les paramètres ; sinon, `RTS` repart à une adresse folle.
- **`#` oublié** : `MOVE.W 5,D0` lit la **mémoire** à l'adresse 5.
- **Signé ou non signé** : `BGT`, `BLT`, `BGE`, `BLE` comparent des nombres **signés** ; pour des
  adresses ou des valeurs de 0 à 65 535, il faut `BHI`, `BCS` (`BLO`), `BCC` (`BHS`), `BLS`.
- **DBF fait N + 1 tours** : pour 4 éléments, on charge 3.
- **Oubli d'`EVEN`** après des `DC.B` : la donnée suivante peut tomber à une adresse impaire.
