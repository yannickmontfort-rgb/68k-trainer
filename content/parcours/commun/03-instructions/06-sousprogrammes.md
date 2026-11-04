## Appeler et revenir

Un sous-programme est un morceau de code que l'on appelle depuis plusieurs endroits, l'équivalent
d'une fonction.

| Instruction | Effet |
|---|---|
| `BSR etiquette` | empile l'adresse de retour, celle de l'instruction qui suit, puis saute |
| `JSR adresse` | pareil, vers n'importe quelle adresse (`JSR (A0)`…) |
| `RTS` | dépile l'adresse de retour et y saute |

[[atari:Le TOS|amiga:Le CLI de l'Amiga]] fait exactement cela avec ton programme : il l'appelle, et ton
`RTS` final revient chez lui. Quand un sous-programme en appelle un autre, les adresses de retour
s'empilent et chacun revient au bon endroit.

## Passer des paramètres

Le plus simple et le plus rapide est de passer les paramètres dans des registres, en notant en tête
du sous-programme ce qu'il attend (« Entrée : D0.W = … ») et ce qu'il renvoie (« Sortie : D0.L =
… »).

On peut aussi les passer par la pile : l'appelant les empile avant le `BSR`, et dans le
sous-programme, comme l'adresse de retour est au sommet, le dernier paramètre empilé se trouve en
`4(SP)`. Au retour, l'appelant nettoie la pile avec `ADDQ.L #n,SP` ou `LEA n(SP),SP`.[[atari: Les
appels système du TOS fonctionnent ainsi.|amiga: Les bibliothèques de l'AmigaOS, elles, prennent
leurs paramètres dans des registres, comme on le verra au chapitre 4.]]

## Ne pas abîmer les registres de l'appelant

Un sous-programme qui se sert de registres pour ses calculs peut casser le travail de celui qui
l'appelle. Il les sauvegarde donc sur la pile en entrant et les restaure en sortant, avec `MOVEM`
(*MOVE Multiple*).

```asm
SOUSPROG:
    MOVEM.L D1-D3/A0,-(SP)  ; sauvegarde D1, D2, D3 et A0
    ; ... travail ...
    MOVEM.L (SP)+,D1-D3/A0  ; restaure la même liste
    RTS
```

`D1-D3` désigne D1, D2 et D3, et `/` sépare les groupes. La liste doit être la même à l'entrée et à
la sortie, sinon la pile se déséquilibre et `RTS` part n'importe où.

:::atari
Le TOS suit une convention que beaucoup de programmeurs adoptent aussi : il préserve D3-D7 et
A3-A6, mais peut modifier D0-D2 et A0-A2, les registres de travail.
:::
:::amiga
Les bibliothèques de l'Amiga suivent une convention que beaucoup de programmeurs adoptent aussi :
elles préservent D2-D7 et A2-A6, peuvent modifier D0, D1, A0 et A1, les registres de travail, et
rendent leur résultat dans D0.
:::
