/**
 * Lanceur Atari (C:\ESSAI68K.PRG) : exécute le programme par Pexec, puis attend une touche avant
 * de rendre la main au bureau d'EmuTOS (sinon son affichage disparaît aussitôt). Le processus
 * principal l'assemble en .PRG. Le code de retour du programme (Pexec, long) est écrit dans
 * C:\ESSAI68K.RET avant l'attente : 68k Trainer le guette pour l'afficher.
 */
export function sourceLanceurAtari(fichier: string): string {
  return [
    '    MOVEA.L 4(SP),A5            ; page de base du lanceur',
    '    LEA     pile,SP',
    '    MOVE.L  $C(A5),D0           ; rendre au TOS la mémoire inutile (Mshrink)',
    '    ADD.L   $14(A5),D0',
    '    ADD.L   $1C(A5),D0',
    '    ADD.L   #$100,D0',
    '    MOVE.L  D0,-(SP)',
    '    MOVE.L  A5,-(SP)',
    '    CLR.W   -(SP)',
    '    MOVE.W  #$4A,-(SP)',
    '    TRAP    #1',
    '    LEA     12(SP),SP',
    '    CLR.L   -(SP)               ; Pexec(0, programme, ligne de commande vide, environnement)',
    '    PEA     vide(PC)',
    '    PEA     nom(PC)',
    '    CLR.W   -(SP)',
    '    MOVE.W  #$4B,-(SP)',
    '    TRAP    #1',
    '    LEA     16(SP),SP',
    '    MOVE.L  D0,code             ; code de retour du programme, lu par 68k Trainer',
    '    CLR.W   -(SP)               ; Fcreate(C:\\ESSAI68K.RET, 0)',
    '    PEA     retour(PC)',
    '    MOVE.W  #$3C,-(SP)',
    '    TRAP    #1',
    '    ADDQ.L  #8,SP',
    '    MOVE.W  D0,D7',
    '    BMI.S   affiche',
    '    PEA     code                ; Fwrite(handle, 4, code)',
    '    MOVE.L  #4,-(SP)',
    '    MOVE.W  D7,-(SP)',
    '    MOVE.W  #$40,-(SP)',
    '    TRAP    #1',
    '    LEA     12(SP),SP',
    '    MOVE.W  D7,-(SP)            ; Fclose',
    '    MOVE.W  #$3E,-(SP)',
    '    TRAP    #1',
    '    ADDQ.L  #4,SP',
    'affiche:',
    '    PEA     message(PC)',
    '    MOVE.W  #9,-(SP)            ; Cconws',
    '    TRAP    #1',
    '    ADDQ.L  #6,SP',
    '    MOVE.W  #7,-(SP)            ; Crawcin : attendre une touche',
    '    TRAP    #1',
    '    ADDQ.L  #2,SP',
    '    CLR.W   -(SP)               ; Pterm0',
    '    TRAP    #1',
    `nom:     DC.B    'C:\\${fichier}',0`,
    'vide:    DC.B    0,0',
    "retour:  DC.B    'C:\\ESSAI68K.RET',0",
    "message: DC.B    13,10,'(Appuie sur une touche pour revenir au bureau)',0",
    '    EVEN',
    '    SECTION BSS',
    'code:    DS.L    1',
    '    DS.L    256',
    'pile:',
    ''
  ].join('\n')
}

/** Texte affiché par le programme : ce qui suit l'écran de démarrage d'EmuTOS, sans les messages de Hatari. */
export function sortieAtari(brut: string): string {
  return brut
    .replace(/\r/g, '')
    .split('Hold <Shift> to pause this screen')
    .pop()!
    .split('(Appuie sur une touche')[0]
    .split('\n')
    .filter((l) => !/^(WARN|INFO|DEBUG|ERROR|TODO|FATAL)\b/.test(l))
    .join('\n')
    .replace(/\x1b./g, '')
    .trim()
}
