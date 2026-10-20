/**
 * Codes clavier bruts de l'Amiga (« raw key codes »), par position de touche (clavier QWERTY
 * américain, comme `KeyboardEvent.code`). Références : Amiga Hardware Reference Manual,
 * annexe H (Keyboard).
 */
export const CODE_AMIGA = {
  echap: 0x45,
  espace: 0x40,
  retour: 0x44,
  tab: 0x42,
  effacer: 0x41,
  suppr: 0x46,
  haut: 0x4c,
  bas: 0x4d,
  droite: 0x4e,
  gauche: 0x4f,
  f1: 0x50,
  help: 0x5f,
  shiftGauche: 0x60,
  shiftDroit: 0x61,
  capsLock: 0x62,
  ctrl: 0x63,
  altGauche: 0x64,
  altDroit: 0x65,
  amigaGauche: 0x66,
  amigaDroit: 0x67
} as const

const LIGNES: [string[], number][] = [
  [['Backquote', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0', 'Minus', 'Equal', 'Backslash'], 0x00],
  [['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP', 'BracketLeft', 'BracketRight'], 0x10],
  [['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon', 'Quote'], 0x20],
  [['IntlBackslash', 'KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Comma', 'Period', 'Slash'], 0x30]
]

/** `KeyboardEvent.code` du PC → code brut de l'Amiga. */
export const CODE_PC_AMIGA: Record<string, number> = {
  Escape: CODE_AMIGA.echap,
  Space: CODE_AMIGA.espace,
  Enter: CODE_AMIGA.retour,
  NumpadEnter: 0x43,
  Tab: CODE_AMIGA.tab,
  Backspace: CODE_AMIGA.effacer,
  Delete: CODE_AMIGA.suppr,
  ArrowUp: CODE_AMIGA.haut,
  ArrowDown: CODE_AMIGA.bas,
  ArrowRight: CODE_AMIGA.droite,
  ArrowLeft: CODE_AMIGA.gauche,
  ShiftLeft: CODE_AMIGA.shiftGauche,
  ShiftRight: CODE_AMIGA.shiftDroit,
  CapsLock: CODE_AMIGA.capsLock,
  ControlLeft: CODE_AMIGA.ctrl,
  ControlRight: CODE_AMIGA.ctrl,
  AltLeft: CODE_AMIGA.altGauche,
  AltRight: CODE_AMIGA.altDroit,
  MetaLeft: CODE_AMIGA.amigaGauche,
  MetaRight: CODE_AMIGA.amigaDroit,
  Insert: CODE_AMIGA.help
}
// La rangée du bas commence par la touche < > des claviers européens ($30) : Z est en $31
for (const [touches, debut] of LIGNES) touches.forEach((code, i) => (CODE_PC_AMIGA[code] = debut + i))
for (let i = 0; i < 10; i++) CODE_PC_AMIGA[`F${i + 1}`] = CODE_AMIGA.f1 + i
