; amiga-systeme.s : prendre la main sur le système de l'Amiga, puis la lui rendre.
; Fichier de 68k Trainer (GPL v3), expliqué au chapitre 5 du parcours Amiga.
;
;   INCLUDE "amiga-systeme.s"   à la fin du programme, puis :
;   BSR prendre         coupe le système (affichage, interruptions, DMA). Au retour : A5 = $DFF000
;   BSR rendre          rend tout au système, tel qu'il était
;   BSR attendre_vbl    attend que le faisceau arrive en bas de l'image (ligne 303)
;   BSR attendre_clic   attend un clic du bouton gauche de la souris
; Aucun registre n'est modifié (sauf A5 par prendre).

prendre:
    MOVEM.L D0-D7/A0-A6,-(SP)
    MOVEA.L 4.W,A6
    LEA     sys_gfxnom(PC),A1
    MOVEQ   #0,D0
    JSR     -552(A6)            ; OpenLibrary("graphics.library", 0)
    MOVE.L  D0,sys_gfx
    MOVEA.L D0,A6
    MOVE.L  34(A6),sys_vue      ; gb_ActiView : la vue affichée par le système
    SUBA.L  A1,A1
    JSR     -222(A6)            ; LoadView(0) : le système n'affiche plus rien
    JSR     -270(A6)            ; WaitTOF
    JSR     -270(A6)            ; WaitTOF (deux fois : les écrans entrelacés ont deux trames)
    JSR     -456(A6)            ; OwnBlitter : le Blitter est à nous
    JSR     -228(A6)            ; WaitBlit : il a fini le travail du système
    MOVEA.L 4.W,A6
    JSR     -132(A6)            ; Forbid : plus d'autres tâches
    LEA     $DFF000,A5
    MOVE.W  $02(A5),sys_dmacon  ; DMACONR : les canaux DMA du système
    MOVE.W  $1C(A5),sys_intena  ; INTENAR : ses interruptions
    MOVE.W  $10(A5),sys_adkcon  ; ADKCONR : réglages du son et du disque
    MOVE.L  $6C.W,sys_niveau3   ; vecteur de l'interruption de niveau 3 (VBL, Copper, Blitter)
    MOVE.W  #$7FFF,$9A(A5)      ; INTENA : toutes les interruptions coupées
    MOVE.W  #$7FFF,$9C(A5)      ; INTREQ : demandes en cours effacées
    MOVE.W  #$7FFF,$96(A5)      ; DMACON : tous les canaux DMA coupés
    MOVEM.L (SP)+,D0-D7/A0-A6
    LEA     $DFF000,A5
    RTS

rendre:
    MOVEM.L D0-D7/A0-A6,-(SP)
    LEA     $DFF000,A5
    MOVE.W  #$7FFF,$9A(A5)      ; d'abord tout couper
    MOVE.W  #$7FFF,$9C(A5)
    MOVE.W  #$7FFF,$96(A5)
    MOVE.L  sys_niveau3,$6C.W   ; le vecteur du système
    MOVEA.L sys_gfx,A6
    MOVE.L  38(A6),$80(A5)      ; COP1LC = gb_copinit, la liste Copper du système
    MOVE.W  D0,$88(A5)          ; COPJMP1 : le Copper y saute
    MOVE.W  sys_adkcon,D0
    OR.W    #$8000,D0           ; bit 15 = 1 : « mettre à 1 » les bits indiqués
    MOVE.W  D0,$9E(A5)          ; ADKCON
    MOVE.W  sys_dmacon,D0
    OR.W    #$8000,D0
    MOVE.W  D0,$96(A5)          ; DMACON : les canaux du système reviennent
    MOVE.W  sys_intena,D0
    OR.W    #$C000,D0           ; bit 15 (mettre à 1) et bit 14 (INTEN, l'interrupteur général)
    MOVE.W  D0,$9A(A5)          ; INTENA
    MOVEA.L sys_vue,A1
    JSR     -222(A6)            ; LoadView(ancienne vue)
    JSR     -270(A6)            ; WaitTOF
    JSR     -270(A6)
    JSR     -462(A6)            ; DisownBlitter
    MOVEA.L 4.W,A6
    JSR     -138(A6)            ; Permit
    MOVEA.L sys_gfx,A1
    JSR     -414(A6)            ; CloseLibrary(graphics)
    MOVEM.L (SP)+,D0-D7/A0-A6
    RTS

attendre_vbl:
    MOVE.L  D0,-(SP)
.pas_encore:
    MOVE.L  $DFF004,D0          ; VPOSR et VHPOSR d'un coup : ligne du faisceau dans les bits 16-8
    AND.L   #$1FF00,D0
    CMP.L   #303<<8,D0
    BNE.S   .pas_encore
.encore:
    MOVE.L  $DFF004,D0          ; puis attendre qu'il quitte la ligne 303
    AND.L   #$1FF00,D0
    CMP.L   #303<<8,D0
    BEQ.S   .encore
    MOVE.L  (SP)+,D0
    RTS

attendre_clic:
.relache:
    BTST    #6,$BFE001          ; bouton gauche : 0 = enfoncé
    BEQ.S   .relache            ; d'abord, qu'il soit relâché
.appui:
    BTST    #6,$BFE001
    BNE.S   .appui              ; puis attendre qu'on l'enfonce
    RTS

sys_gfxnom: DC.B 'graphics.library',0
    EVEN
sys_gfx:     DC.L 0
sys_vue:     DC.L 0
sys_niveau3: DC.L 0
sys_dmacon:  DC.W 0
sys_intena:  DC.W 0
sys_adkcon:  DC.W 0
