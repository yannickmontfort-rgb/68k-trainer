## Paula recopie, puis prévient

Quand le DMA d'une voie démarre, Paula recopie `AUDxLC` et `AUDxLEN` dans ses compteurs internes,
commence à jouer et demande aussitôt l'**interruption** de la voie : bits 7 à 10 de `INTREQ`, AUD0
à AUD3, au niveau 4. Cette demande signifie qu'elle a noté l'adresse et la longueur, et qu'on peut
préparer la suite.

À la fin du bloc, Paula recommence avec les valeurs que `AUDxLC` et `AUDxLEN` ont à ce moment-là,
et redemande l'interruption. En écrivant le bloc suivant dès que la demande arrive, on enchaîne
donc des morceaux de son sans aucun trou.

## Un son joué une seule fois

Un bruitage, un tir ou une explosion, ne doit s'entendre qu'une fois. On profite de la première
demande pour donner à la voie un bloc suivant minuscule et silencieux, qu'elle rejouera en boucle
sans qu'on l'entende.

```asm
    MOVE.W  #$0080,$9C(A5)  ; effacer une vieille demande AUD0
    MOVE.W  #$8201,$96(A5)  ; jouer
.note:
    BTST    #7,$1F(A5)      ; INTREQR, bit 7 : Paula a noté le bloc ?
    BEQ.S   .note
    MOVE.L  #silence,$A0(A5); le bloc suivant : un mot de zéros...
    MOVE.W  #1,$A4(A5)      ; ... d'un mot
    ; ...
silence: DC.W   0
```

Il n'y a même pas besoin d'une routine d'interruption : il suffit de regarder le bit dans
`INTREQR`. Les lecteurs de musique, eux, installent une vraie routine (vecteur `$70`, niveau 4)
ou utilisent un timer de la CIA-B, réglé à 50 Hz, pour avancer dans la partition.

## Le filtre

Un filtre passe-bas adoucit le son de l'Amiga 500. Il dépend du bit 1 de `$BFE001` (CIA-A), qui
commande aussi la diode d'alimentation : à 0, le filtre est actif et la diode brille ; à 1, le
filtre est coupé et la diode faiblit. Les démos le coupent souvent pour un son plus brillant, et
la diode clignote alors au rythme des musiques qui jouent avec.
