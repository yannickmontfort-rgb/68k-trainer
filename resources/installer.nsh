; Page « Émulateurs d'étude » de l'installateur de 68k Trainer (Windows).
;
; L'installateur ne fait que noter le choix dans %LOCALAPPDATA%\68k Trainer\emulateurs\a-installer.txt :
; c'est 68k Trainer qui installe les émulateurs au premier lancement (depuis les paquets livrés avec la
; version complète, ou en les téléchargeant pour la version légère), sans droits administrateur.

!include nsDialogs.nsh
!include LogicLib.nsh

!ifndef BUILD_UNINSTALLER
  Var EmuCaseHatari
  Var EmuCaseWinuae
  Var EmuHatari
  Var EmuWinuae
!endif

!macro customPageAfterChangeDir
  Page custom EmulateursPage EmulateursPageQuitter

  Function EmulateursPage
    ${If} ${isUpdated}
      Abort
    ${EndIf}
    !insertmacro MUI_HEADER_TEXT "Émulateurs d'étude" "Pour essayer tes programmes sur une machine plus complète"
    nsDialogs::Create 1018
    Pop $0
    ${NSD_CreateLabel} 0 0 100% 34u "68k Trainer peut installer des émulateurs réglés pour l'étude (pas pour les jeux), avec des systèmes libres : aucune ROM d'origine n'est fournie. Coche ceux que tu veux :"
    Pop $0
    ${NSD_CreateCheckbox} 10u 40u 100% 12u "Hatari 2.6.1 : Atari ST, avec le système libre EmuTOS (7 Mo)"
    Pop $EmuCaseHatari
    ${NSD_CreateCheckbox} 10u 58u 100% 12u "WinUAE 6.0.3 : Amiga, avec le Kickstart libre AROS (48 Mo)"
    Pop $EmuCaseWinuae
    ${NSD_CreateLabel} 0 80u 100% 44u "Ils seront installés au premier lancement de 68k Trainer, avec un dossier de partage dans tes Documents (68k Trainer\Atari et 68k Trainer\Amiga). Tu pourras aussi les installer ou les retirer plus tard, depuis l'onglet « Émulateurs »."
    Pop $0
    nsDialogs::Show
  FunctionEnd

  Function EmulateursPageQuitter
    ${NSD_GetState} $EmuCaseHatari $EmuHatari
    ${NSD_GetState} $EmuCaseWinuae $EmuWinuae
  FunctionEnd
!macroend

!macro customInstall
  ${If} $EmuHatari == ${BST_CHECKED}
  ${OrIf} $EmuWinuae == ${BST_CHECKED}
    CreateDirectory "$LOCALAPPDATA\68k Trainer\emulateurs"
    FileOpen $0 "$LOCALAPPDATA\68k Trainer\emulateurs\a-installer.txt" w
    ${If} $EmuHatari == ${BST_CHECKED}
      FileWrite $0 "hatari$\r$\n"
    ${EndIf}
    ${If} $EmuWinuae == ${BST_CHECKED}
      FileWrite $0 "winuae$\r$\n"
    ${EndIf}
    FileClose $0
  ${EndIf}
!macroend

; Désinstallation (pas lors d'une mise à jour) : les émulateurs installés par 68k Trainer sont retirés,
; les dossiers de partage des Documents (les programmes de l'utilisateur) sont conservés
!macro customUnInstall
  ${IfNot} ${isUpdated}
    RMDir /r "$LOCALAPPDATA\68k Trainer\emulateurs"
    RMDir "$LOCALAPPDATA\68k Trainer"
  ${EndIf}
!macroend
