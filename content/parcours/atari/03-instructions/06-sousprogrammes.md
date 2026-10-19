## Appeler et revenir

Un **sous-programme** est un morceau de code qu'on appelle depuis plusieurs endroits (l'équivalent
d'une fonction).

| Instruction | Effet |
|---|---|
| `BSR etiquette` | **empile l'adresse de retour** (l'instruction qui suit le BSR), puis saute |
| `JSR adresse` | pareil, mais l'adresse peut être n'importe où (`JSR (A0)`…) |
| `RTS` | **dépile** l'adresse de retour et y saute |

C'est exactement ce que fait le TOS avec ton programme : il l'appelle, et ton `RTS` final revient
chez lui. Un sous-programme peut en appeler un autre : les adresses de retour s'empilent, et
chacun revient au bon endroit grâce à la pile.

## Passer des paramètres

- **Par registres** : le plus simple et le plus rapide. On documente en tête du sous-programme ce
  qu'il attend (« Entrée : D0.W = … ») et ce qu'il renvoie (« Sortie : D0.L = … »).
- **Par la pile** : l'appelant empile les paramètres avant le `BSR`. Dans le sous-programme,
  l'adresse de retour est au sommet (`(SP)`), donc le dernier paramètre empilé est en `4(SP)`.
  **Après** le retour, l'appelant **nettoie la pile** (`ADDQ.L #n,SP` ou `LEA n(SP),SP`). Les
  appels système du TOS fonctionnent ainsi.

## Ne pas abîmer les registres de l'appelant

Un sous-programme qui modifie des registres « pour ses calculs » peut casser le travail de celui
qui l'appelle. On sauvegarde donc ces registres sur la pile à l'entrée et on les restaure à la
sortie, avec **MOVEM** (*MOVE Multiple*) :

```asm
SOUSPROG:
    MOVEM.L D1-D3/A0,-(SP)  ; sauvegarde D1, D2, D3 et A0
    ; ... travail ...
    MOVEM.L (SP)+,D1-D3/A0  ; restaure (même liste)
    RTS
```

`D1-D3` désigne D1, D2 et D3 ; `/` sépare les groupes. La liste doit être **la même** à l'entrée et
à la sortie, sinon la pile est déséquilibrée et le `RTS` part dans le décor.

Le TOS suit d'ailleurs une convention : il préserve **D3-D7 et A3-A6**, mais peut modifier
D0-D2 et A0-A2 (les registres « de travail »). Beaucoup de programmeurs adoptent la même règle.
