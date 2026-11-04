/**
 * Le GEM du TOS simulé, réduit à l'essentiel pour un premier programme : TRAP #2 avec D0 = $C8
 * (AES) et D1 = l'adresse du bloc de paramètres. Fonctions simulées : appl_init, appl_exit,
 * form_alert (la boîte d'alerte s'affiche dans la sortie texte), graf_handle et graf_mouse.
 * Le VDI et les autres fonctions de l'AES se découvrent dans Hatari (bouton « Essayer »).
 */
import type { Cpu } from '../../cpu/cpu'

const AES = 0xc8
const VDI = 0x73

/** Valeurs rendues par graf_handle en basse résolution, relevées dans EmuTOS (Hatari). */
export const GRAF_HANDLE = { handle: 1, largeurCar: 8, hauteurCar: 8, largeurBoite: 12, hauteurBoite: 11 }

/** Une boîte d'alerte « [icône][ligne 1|ligne 2][bouton 1|bouton 2] » lue en mémoire. */
export function lireAlerte(texte: string): { icone: number; lignes: string[]; boutons: string[] } | null {
  const m = /^\[(\d)\]\[([^\]]*)\]\[([^\]]*)\]/.exec(texte)
  if (!m) return null
  return { icone: Number(m[1]), lignes: m[2].split('|'), boutons: m[3].split('|').map((b) => b.trim()) }
}

export function gem(cpu: Cpu, boutonAlerte?: number): boolean {
  const fonction = cpu.d[0] & 0xffff
  if (fonction === VDI) {
    throw new Error("Le VDI du GEM n'est pas simulé par 68k Trainer : essaie ton programme dans Hatari.")
  }
  if (fonction !== AES) return false
  const mem = cpu.memory
  const bloc = cpu.d[1] & 0xffffff
  const tableau = (i: number): number => mem.readU32(bloc + 4 * i) & 0xffffff
  const control = tableau(0)
  const global = tableau(1)
  const intIn = tableau(2)
  const intOut = tableau(3)
  const addrIn = tableau(4)
  const numero = mem.readU16(control)
  switch (numero) {
    case 10: // appl_init
      mem.writeU16(global + 4, 0) // GLOBAL[2] = identifiant de l'application
      mem.writeU16(intOut, 0)
      return true
    case 19: // appl_exit
      mem.writeU16(intOut, 1)
      return true
    case 52: {
      // form_alert
      let texte = ''
      for (let a = mem.readU32(addrIn) & 0xffffff; texte.length < 400; a++) {
        const c = mem.readU8(a)
        if (c === 0) break
        texte += String.fromCharCode(c)
      }
      const alerte = lireAlerte(texte)
      if (!alerte || !alerte.boutons.length) {
        throw new Error(`form_alert : le texte « ${texte} » ne suit pas le format [icône][lignes][boutons].`)
      }
      const parDefaut = mem.readU16(intIn)
      const choisi = Math.min(alerte.boutons.length, Math.max(1, boutonAlerte ?? (parDefaut || 1)))
      cpu.output +=
        `\nBoîte d'alerte : ${alerte.lignes.join(' / ')}\n` +
        `Boutons : ${alerte.boutons.join(' | ')} (clic sur « ${alerte.boutons[choisi - 1]} »)\n`
      mem.writeU16(intOut, choisi)
      return true
    }
    case 77: // graf_handle
      mem.writeU16(intOut, GRAF_HANDLE.handle)
      mem.writeU16(intOut + 2, GRAF_HANDLE.largeurCar)
      mem.writeU16(intOut + 4, GRAF_HANDLE.hauteurCar)
      mem.writeU16(intOut + 6, GRAF_HANDLE.largeurBoite)
      mem.writeU16(intOut + 8, GRAF_HANDLE.hauteurBoite)
      return true
    case 78: // graf_mouse
      mem.writeU16(intOut, 1)
      return true
    default:
      throw new Error(
        `La fonction AES n° ${numero} n'est pas simulée par 68k Trainer (seulement appl_init, appl_exit, form_alert, graf_handle et graf_mouse) : essaie ton programme dans Hatari.`
      )
  }
}
