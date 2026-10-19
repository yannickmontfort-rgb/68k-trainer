# Errata du manuel « Assembleur 68000 sur Atari ST » v2

Vérifié le 19/10/2026 contre le M68000PRM (Motorola), le cours du Féroce Lapin et par **exécution
réelle** des routines dans le simulateur de 68k Trainer (tests :
`tests/platforms/atari-st/tos.test.ts` du dépôt).

| § | Ce que dit le manuel | Ce qui est juste | Gravité |
|---|---|---|---|
| 3.2 | Groupe de 16 pixels : `(X / 16) * 8 = X / 2` | Faux en général : `(X / 16) * 8` arrondit à un multiple de 8 octets, `X / 2` non. Juste : `((X >> 4) << 3)`, ou `X / 2` puis `AND #$FFF8`. (L'exercice 1, avec X = 160, tombe juste par hasard.) | **Bug** |
| 7.2 PSET | `ANDI.W #$FFFE,D0` | `ANDI.W #$FFF8,D0` (aligner sur le groupe de 4 plans = 8 octets). Avec `$FFFE`, X = 37 donne l'octet 18 au lieu de 16 : on écrit au milieu d'un groupe, dans les mauvais plans. | **Bug** |
| 7.2 PSET | `ADDA.L D0,A0` | `ADDA.W D0,A0` (ou `MOVEQ #0,D0` avant) : le mot fort de D0 n'est jamais remis à zéro ; s'il contient l'adresse renvoyée par Physbase, A0 part à $1Exxxx. Vérifié dans le simulateur. | **Bug** |
| 7.3 | `ANDI.W #$FFFE,D0` | `#$FFF8` (même erreur que PSET) | **Bug** |
| 7.3 | `LSL.W #8,D0` / `LSR.W D1,D0` / `SWAP D0` / `OR.B D0,8(A0)` | Les bits décalés hors du mot sont **perdus** (`LSR.W`), et `SWAP` ramène un mot fort jamais initialisé (`CLR.W` n'efface que 16 bits). `OR.B` vise l'octet de poids **faible** du mot suivant alors que les pixels débordants sont à gauche, donc dans l'octet de poids fort. Juste : travailler sur 32 bits (`MOVEQ #0,D0`, octet en bits 31-24, `LSR.L D1,D0`, puis `SWAP` pour récupérer chaque moitié et `OR.W` sur `(A0)` et `8(A0)`). | **Bug** |
| 7.1 ex. 2 | Le programme principal se termine par `RTS` | Fonctionne sous TOS (retour à l'appelant de Pexec), mais `Pterm0` (`CLR.W -(SP)` / `TRAP #1`) est la fin recommandée (c'est ce que fait la v1). | Mineur |
| 7.1 ex. 2 | « désactiver le bip clavier » avec `BCLR #0,$484` | Le bit 0 de `conterm` est le **clic** des touches ; le bit 2 est la sonnerie (Ctrl+G). Formulation à préciser. | Mineur |
| 7.4 | `JOY_HANDLER` lit `1(A0)` = joystick 1, `2(A0)` = joystick 0 | **Inversé** : le paquet passé à `joyvec` contient l'en-tête en `0(A0)`, le joystick **0** (prise souris) en `1(A0)` et le joystick **1** (prise joystick) en `2(A0)`. Vérifié dans EmuTOS (`bios/aciavecs.S`, tampon `joybuf`) et dans le simulateur. La routine oublie aussi de remettre l'ancien vecteur (`OLD_JOY`) avant de quitter. | **Bug** |
| Roadmap | « accès mot/long à une adresse impaire (2 bombes) » | **3 bombes** : erreur d'adresse = vecteur 3. Deux bombes = erreur de **bus** (vecteur 2), par exemple accès au matériel en mode utilisateur. Le manuel dit bien « Exception #3 » au § 1.2. | Correction de la roadmap |
| 1.1 | Word : « valeurs de 0 à 65 535 » | Juste en non signé ; ajouter -32 768 à +32 767 en signé (le manuel le fait pour l'octet). | Mineur |
| 5.3 | « rejoueur cadencé sous l'interruption VBL (adresse $000456) » | $456 est `_vblqueue`, le **pointeur vers la liste** des routines VBL du TOS ; le vecteur VBL lui-même est $70. | Imprécis |

Vérifiés justes : vecteurs Trace $24, VBL $70 (niveau 4), TRAP #0-#15 en $80-$BC ; Supexec = XBIOS 38
($26) avec nettoyage de 6 octets ; Cnecin = GEMDOS 8, code clavier dans le mot fort ; Kbdvbase =
XBIOS 34, vecteur joystick à l'offset 24 ; AY-3-8912 en $FF8800 (sélection) / $FF8802 (écriture) ;
image Degas PI1 = 32 034 octets ; préservation D3-D7/A3-A6 par le TOS.
