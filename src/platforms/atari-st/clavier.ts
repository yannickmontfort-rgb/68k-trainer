import type { Cpu } from '../../cpu/cpu'
import { materielAtari } from './materiel'

/**
 * Codes clavier du ST (envoyés par l'IKBD) et leur traduction en caractères par le TOS.
 * Les codes suivent la position physique des touches, comme ceux d'un PC (jeu 1). Le caractère
 * dépend de la disposition (QWERTY, AZERTY...) : l'interface fournit celui de la touche tapée ;
 * sinon une table QWERTY sert de repli.
 */
export const CODE = {
  echap: 0x01,
  retourArriere: 0x0e,
  tab: 0x0f,
  retour: 0x1c,
  control: 0x1d,
  shiftGauche: 0x2a,
  shiftDroit: 0x36,
  alternate: 0x38,
  espace: 0x39,
  capsLock: 0x3a,
  f1: 0x3b,
  help: 0x62,
  undo: 0x61,
  haut: 0x48,
  gauche: 0x4b,
  droite: 0x4d,
  bas: 0x50,
  insert: 0x52,
  clrHome: 0x47,
  delete: 0x53
} as const

/** Codes ST correspondant à `KeyboardEvent.code` (position physique sur un clavier de PC). */
export const CODE_PC: Record<string, number> = {
  Escape: 0x01, Digit1: 0x02, Digit2: 0x03, Digit3: 0x04, Digit4: 0x05, Digit5: 0x06, Digit6: 0x07,
  Digit7: 0x08, Digit8: 0x09, Digit9: 0x0a, Digit0: 0x0b, Minus: 0x0c, Equal: 0x0d, Backspace: 0x0e,
  Tab: 0x0f, KeyQ: 0x10, KeyW: 0x11, KeyE: 0x12, KeyR: 0x13, KeyT: 0x14, KeyY: 0x15, KeyU: 0x16,
  KeyI: 0x17, KeyO: 0x18, KeyP: 0x19, BracketLeft: 0x1a, BracketRight: 0x1b, Enter: 0x1c,
  ControlLeft: 0x1d, ControlRight: 0x1d, KeyA: 0x1e, KeyS: 0x1f, KeyD: 0x20, KeyF: 0x21, KeyG: 0x22,
  KeyH: 0x23, KeyJ: 0x24, KeyK: 0x25, KeyL: 0x26, Semicolon: 0x27, Quote: 0x28, Backquote: 0x29,
  ShiftLeft: 0x2a, Backslash: 0x2b, KeyZ: 0x2c, KeyX: 0x2d, KeyC: 0x2e, KeyV: 0x2f, KeyB: 0x30,
  KeyN: 0x31, KeyM: 0x32, Comma: 0x33, Period: 0x34, Slash: 0x35, ShiftRight: 0x36, AltLeft: 0x38,
  AltRight: 0x38, Space: 0x39, CapsLock: 0x3a, F1: 0x3b, F2: 0x3c, F3: 0x3d, F4: 0x3e, F5: 0x3f,
  F6: 0x40, F7: 0x41, F8: 0x42, F9: 0x43, F10: 0x44, Home: 0x47, ArrowUp: 0x48, NumpadSubtract: 0x4a,
  ArrowLeft: 0x4b, ArrowRight: 0x4d, NumpadAdd: 0x4e, ArrowDown: 0x50, Insert: 0x52, Delete: 0x53,
  IntlBackslash: 0x60, PageDown: 0x61, PageUp: 0x62, NumpadDivide: 0x65, NumpadMultiply: 0x66,
  Numpad7: 0x67, Numpad8: 0x68, Numpad9: 0x69, Numpad4: 0x6a, Numpad5: 0x6b, Numpad6: 0x6c,
  Numpad1: 0x6d, Numpad2: 0x6e, Numpad3: 0x6f, Numpad0: 0x70, NumpadDecimal: 0x71, NumpadEnter: 0x72
}

/** Repli QWERTY : [sans Shift, avec Shift] pour chaque code. */
const QWERTY: Record<number, [string, string]> = {}
;['1!', '2@', '3#', '4$', '5%', '6^', '7&', '8*', '9(', '0)', '-_', '=+'].forEach((p, i) => (QWERTY[0x02 + i] = [p[0], p[1]]))
;'qwertyuiop[]'.split('').forEach((c, i) => (QWERTY[0x10 + i] = [c, i < 10 ? c.toUpperCase() : c === '[' ? '{' : '}']))
;"asdfghjkl;'`".split('').forEach((c, i) => (QWERTY[0x1e + i] = [c, i < 9 ? c.toUpperCase() : ({ ';': ':', "'": '"', '`': '~' } as Record<string, string>)[c]]))
;'zxcvbnm,./'.split('').forEach((c, i) => (QWERTY[0x2c + i] = [c, i < 7 ? c.toUpperCase() : ({ ',': '<', '.': '>', '/': '?' } as Record<string, string>)[c]]))
QWERTY[0x2b] = ['\\', '|']
QWERTY[0x39] = [' ', ' ']
QWERTY[0x0e] = ['\b', '\b']
QWERTY[0x0f] = ['\t', '\t']
QWERTY[0x1c] = ['\r', '\r']
QWERTY[0x72] = ['\r', '\r']
QWERTY[0x01] = ['\x1b', '\x1b']
;[0x67, 0x68, 0x69, 0x6a, 0x6b, 0x6c, 0x6d, 0x6e, 0x6f, 0x70].forEach((c, i) => (QWERTY[c] = ['789456123'[i] ?? '0', '789456123'[i] ?? '0']))

/** Caractères fournis par l'interface (disposition réelle du clavier de l'utilisateur). */
const caracteres = new WeakMap<Cpu, Map<number, [number, number]>>()

/** Code ASCII produit par le TOS pour le code `code` (0 pour les flèches, F1-F10...). */
export function traduire(cpu: Cpu, code: number, shift: boolean, control: boolean): number {
  const fourni = caracteres.get(cpu)?.get(code)
  let ascii = fourni ? fourni[shift ? 1 : 0] : (QWERTY[code]?.[shift ? 1 : 0] ?? '').charCodeAt(0) || 0
  if (control && ascii >= 0x40 && ascii < 0x80) ascii &= 0x1f
  return ascii & 0xff
}

/**
 * Touche du PC enfoncée ou relâchée, envoyée au ST simulé. `caractere` : ce que la touche produit
 * sur le clavier de l'utilisateur (pour que le TOS traduise selon sa disposition).
 */
export function toucheSt(cpu: Cpu, code: number, enfoncee: boolean, caractere?: string, shift = false): void {
  const m = materielAtari(cpu)
  if (!m) return
  if (enfoncee && caractere && caractere.length === 1) {
    let table = caracteres.get(cpu)
    if (!table) caracteres.set(cpu, (table = new Map()))
    const actuel = table.get(code) ?? [0, 0]
    const c = caractere.charCodeAt(0) & 0xff
    table.set(code, shift ? [actuel[0] || c, c] : [c, actuel[1] || c])
  }
  m.ikbd.touche(code, enfoncee)
}
