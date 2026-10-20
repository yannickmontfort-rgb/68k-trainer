/**
 * Code de démarrage ajouté devant un programme exporté pour l'Amiga. Lancé depuis le Shell, il
 * appelle simplement le programme (A0/D0 = ligne de commande, D0 = code de retour). Lancé par une
 * icône du Workbench, il fait ce que tout programme Workbench doit faire : récupérer le message du
 * Workbench (WaitPort + GetMsg), ouvrir une fenêtre console qui devient sa sortie (Output() et
 * Input() la renvoient), attendre Entrée à la fin pour qu'on ait le temps de lire, puis répondre
 * au Workbench (Forbid + ReplyMsg). Compatible Kickstart 1.3 et AROS.
 *
 * Code pur, sans dépendance : réutilisable hors de 68k Trainer.
 */
export const DEMARRAGE_AMIGA = `
__68kt_depart:
    MOVEM.L D2-D7/A2-A6,-(SP)
    MOVE.L  D0,D6
    MOVEA.L A0,A4
    MOVEA.L 4.W,A6
    SUBA.L  A1,A1
    JSR     -294(A6)
    MOVEA.L D0,A3
    MOVEQ   #0,D5
    MOVEQ   #0,D4
    MOVEQ   #0,D7
    TST.L   172(A3)
    BNE.S   __68kt_lancer
    LEA     92(A3),A0
    JSR     -384(A6)
    LEA     92(A3),A0
    JSR     -372(A6)
    MOVE.L  D0,D5
    LEA     __68kt_dos(PC),A1
    JSR     -408(A6)
    MOVE.L  D0,D7
    BEQ.S   __68kt_lancer
    MOVEA.L D0,A6
    LEA     __68kt_con(PC),A0
    MOVE.L  A0,D1
    MOVE.L  #1006,D2
    JSR     -30(A6)
    MOVE.L  D0,D4
    MOVE.L  D0,156(A3)
    MOVE.L  D0,160(A3)
    MOVEQ   #1,D6
    LEA     __68kt_vide(PC),A4
__68kt_lancer:
    MOVE.L  D6,D0
    MOVEA.L A4,A0
    BSR     __68kt_programme
    MOVE.L  D0,D6
    TST.L   D5
    BEQ.S   __68kt_fin
    TST.L   D4
    BEQ.S   __68kt_repondre
    MOVEA.L D7,A6
    MOVE.L  D4,D1
    LEA     __68kt_fini(PC),A0
    MOVE.L  A0,D2
    MOVEQ   #__68kt_finfini-__68kt_fini,D3
    JSR     -48(A6)
    MOVE.L  D4,D1
    LEA     __68kt_tampon(PC),A0
    MOVE.L  A0,D2
    MOVEQ   #80,D3
    JSR     -42(A6)
    CLR.L   156(A3)
    CLR.L   160(A3)
    MOVE.L  D4,D1
    JSR     -36(A6)
__68kt_repondre:
    MOVEA.L 4.W,A6
    TST.L   D7
    BEQ.S   __68kt_reponse
    MOVEA.L D7,A1
    JSR     -414(A6)
__68kt_reponse:
    JSR     -132(A6)
    MOVEA.L D5,A1
    JSR     -378(A6)
__68kt_fin:
    MOVE.L  D6,D0
    MOVEM.L (SP)+,D2-D7/A2-A6
    RTS
__68kt_dos: DC.B 'dos.library',0
__68kt_con: DC.B 'CON:20/20/600/180/68k Trainer',0
__68kt_vide: DC.B 10,0
__68kt_fini: DC.B 10,'(Entree pour fermer)'
__68kt_finfini:
    EVEN
__68kt_tampon: DS.B 80
__68kt_programme:
`

/** Le source du programme précédé du code de démarrage (à assembler pour l'export). */
export function avecDemarrageAmiga(source: string): string {
  return DEMARRAGE_AMIGA + source
}
