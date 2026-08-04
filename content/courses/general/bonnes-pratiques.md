---
title: "Bonnes pratiques de programmation en assembleur 68000"
source: "Manuel des Bonnes Pratiques de Programmation en Assembleur 68000 (fourni par Yannick, 2026-08)"
themes: ["style", "conventions"]
---

# Bonnes pratiques de programmation en assembleur 68000

L'assembleur n'offre aucun garde-fou automatique comme les langages de haut niveau — la rigueur
dans la présentation et les conventions n'est pas une simple question de goût, c'est ce qui évite
des erreurs coûteuses et rend un programme maintenable.

## 1. Organisation du code et nommage

**Sections.** Séparer clairement le code des données :
- `SECTION DATA` — données initialisées (`DC.B`/`DC.W`/`DC.L`), valeur connue à l'assemblage.
- `SECTION BSS` — variables non initialisées (`DS.B`/`DS.W`/`DS.L`) : l'espace est réservé en
  mémoire à l'exécution mais ne consomme aucune place sur le fichier exécutable.

**Alignement.** La directive `EVEN` garantit qu'une donnée ou une instruction commence sur une
adresse paire — indispensable avant tout accès `.W`/`.L`, le 68000 ne pouvant pas y accéder sur une
adresse impaire (voir aussi le format d'instruction dans
[reference-meyne-hoppenot.md](reference-meyne-hoppenot.md)).

**Format d'une ligne** — toujours la même structure, colonnes séparées par des tabulations :
```
Étiquette   Mnémonique.format   source, destination   commentaire
```
L'étiquette commence impérativement en première colonne.

**Vocabulaire anglais.** Les mnémoniques (`MOVE`, `ADD`), tailles (`BYTE`, `WORD`) et le jargon
technique sont en anglais — garder cette convention pour ses propres étiquettes et commentaires
évite les confusions.

**Noms d'étiquettes explicites** : préférer `DEBUT_IMAGE`, `NEW_PALETTE`, `END_GAME` à `X`, `Y`,
`AX1` — un nom clair est une forme d'auto-documentation.

## 2. Utilisation rigoureuse des registres

Les registres sont l'établi du processeur — les seules zones où une donnée peut réellement être
manipulée pour un calcul.

**Registres de données (D0-D7)** — 32 bits, accessibles par tranche indépendante :

| Accès | Portée |
|---|---|
| `.B` | 8 bits de poids faible |
| `.W` | 16 bits de poids faible |
| `.L` | 32 bits (registre entier) |

Une opération sur une tranche ne modifie que cette tranche : après `MOVE.L #$AAAAAAAA,D1` puis
`MOVE.W #$5678,D1`, D1 vaut `$AAAA5678` — le mot de poids fort est resté intact.

**Registres d'adresse (A0-A6)** — comportement différent, source d'erreurs fréquentes :

| | Registres de données (Dn) | Registres d'adresse (An) |
|---|---|---|
| Opération `.B` | autorisée | **interdite** (erreur d'assemblage) |
| Écriture `.W` | seul le mot faible change | **le registre entier** est affecté, avec **extension de signe** sur 32 bits |
| Lecture `.W` | seul le mot faible est lu | seul le mot faible est lu |

> **Piège classique** : `MOVE.W #$8234,A0` — le bit 15 de `$8234` est à 1, donc le résultat est
> `$FFFF8234`, pas `$00008234` comme on pourrait s'y attendre en pensant "seul le mot faible
> change" (vrai pour un registre de données, faux pour un registre d'adresse en écriture). Une
> adresse comme `$8000` étendue par erreur en `$FFFF8000` pointe vers une zone mémoire totalement
> différente — bug difficile à repérer si ce mécanisme n'est pas prévu.

**Registres à usage spécifique** : `A7`/`SP` (pointeur de pile, `A7'` en mode Superviseur), `PC`
(prochaine instruction, jamais manipulé directement), `SR` (flags C/V/Z/N/X + bits de contrôle T/S).

## 3. Gestion rigoureuse de la pile

Voir aussi [pile-et-sous-programmes.md](pile-et-sous-programmes.md) pour les mécanismes de base.
Points de discipline à retenir :

1. **Ordre inversé obligatoire** — dépiler dans l'ordre strictement inverse de l'empilage.
2. **Tailles identiques** — empiler un long et dépiler un mot décale irrémédiablement le pointeur
   et corrompt toutes les lectures suivantes.
3. **Alignement automatique** — même une opération `.B` sur la pile modifie `A7` d'une valeur
   paire (2 au minimum), pour garantir que SP ne se retrouve jamais sur une adresse impaire.
4. **Toute sous-routine qui modifie un registre doit le sauvegarder** en entrée et le restaurer en
   sortie — `MOVEM.L D0-D2/A0-A1,-(SP)` en début de routine, `MOVEM.L (SP)+,D0-D2/A0-A1` juste
   avant `RTS`.
5. **Nettoyage de la pile après appel = responsabilité de l'appelant**, pas de la routine appelée
   (`ADDQ.L`/`ADDA.L` après un `BSR`/`TRAP` qui a reçu des paramètres empilés).

**Conséquence d'un déséquilibre** : si la pile n'est pas restaurée exactement, `RTS` lira une
adresse de retour erronée et sautera n'importe où en mémoire — plantage immédiat, ou pire,
corruption silencieuse qui ne se manifeste que bien plus tard.

## 4. Branchements : préférer le relatif à l'absolu

| | Relatif | Absolu |
|---|---|---|
| Instructions | `BRA`, `BSR` | `JMP`, `JSR` |
| Code généré | **relogeable** (déplacement par rapport au PC courant) | lié à une adresse fixe en mémoire |
| Recommandation | **à utiliser par défaut** | à éviter sauf besoin spécifique |

Un programme utilisant exclusivement des branchements relatifs peut être chargé n'importe où en
mémoire sans modification — propriété indispensable dès qu'on ne contrôle pas totalement où le
système va placer le programme.

## 5. Protocole d'appel système standard

Pattern commun à respecter pour tout appel système passant des paramètres par la pile (`TRAP`
GEMDOS/BIOS/XBIOS sur Atari ST, ou équivalent ailleurs) :

1. Empiler les paramètres, **dans l'ordre attendu par la fonction**.
2. Empiler le numéro de fonction **en dernier**, juste avant l'appel.
3. Déclencher l'appel (`TRAP #n`).
4. Nettoyer immédiatement la pile au retour — `ADDQ.L` pour de petites tailles (jusqu'à 8),
   `ADDA.L` au-delà.
