# Composants tiers

68k Trainer est distribué sous licence **GNU GPL v3 ou ultérieure** (voir [LICENSE](LICENSE)).
Les composants suivants ne sont **pas** couverts par cette licence et gardent la leur.

## vasm (`tools/vasmm68k_mot.exe`, `tools/vobjdump.exe`) — tests uniquement

Assembleur de Volker Barthelmann et Frank Wille — <http://sun.hasenbraten.de/vasm/>. Depuis la
version 1.0, **68k Trainer ne l'utilise plus et ne le distribue plus** : l'application a son
propre assembleur (`src/asm/`, GPL). vasm reste dans le dépôt, sans modification, comme
**référence pour les tests** (`tests/asm/differentiel.test.ts` vérifie que les deux produisent
les mêmes octets), un usage non commercial permis par sa licence.

## Dépendances npm

Electron, Monaco Editor, marked et les outils de construction sont sous leurs propres licences
(MIT pour la plupart), consultables dans `node_modules/<paquet>/LICENSE`.

## Contenu pédagogique

Les cours sont des reformulations originales. Les sources dont ils s'inspirent (cours du Féroce
Lapin, cours de David Bouchet / EPITA, polycopié de Philippe Meyne, manuel Motorola M68000PRM) ne
sont pas incluses dans ce dépôt.
