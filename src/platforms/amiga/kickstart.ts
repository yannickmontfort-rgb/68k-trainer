import type { Cpu } from '../../cpu/cpu'
import type { Platform } from '../../cpu/platform'
import type { Size } from '../../cpu/types'
import { assembler } from '../../asm/assembleur'
import { materielAmiga, type MaterielAmiga } from './chipset'
import { CYCLES_PAR_IMAGE, DMA, INT, R, ROM_DEBUT, ROM_FIN, SLOW_DEBUT, SLOW_FIN } from './machine'

/**
 * Kickstart 1.3 simulé : juste ce qu'il faut pour apprendre. ExecBase est en $4, chaque
 * bibliothèque a une vraie table de sauts (JMP de 6 octets aux décalages négatifs) qui mène à de
 * petites routines « en ROM » : on peut suivre un `JSR -552(A6)` au débogueur comme sur un vrai
 * Amiga. Forbid/Permit/Disable/Enable et les routines d'interruption sont du vrai code 68000 ; les
 * autres fonctions sont simulées (opcode réservé $A0F0 dans la ROM).
 *
 * Décalages vérifiés contre les fichiers .fd (sources d'AROS, même interface que le Kickstart).
 */

const h = (n: number): string => '$' + (n >>> 0).toString(16).toUpperCase()

// --- Carte mémoire du système simulé ---------------------------------------------

export const EXEC_BASE = 0x0800
/** Pile superviseur (interruptions) et pile du programme (4 Ko et 12 Ko). */
export const PILE_SUPERVISEUR = 0x6d000
export const PILE_UTILISATEUR = 0x6fff0
/** Mémoire libre pour AllocMem : Chip RAM au-dessus du programme, et toute la Slow RAM. */
export const CHIP_LIBRE_DEBUT = 0x40000
export const CHIP_LIBRE_FIN = 0x6c000
/** Écran du CLI : 640 × 256, 2 plans (haute résolution), 80 octets par ligne. */
export const ECRAN_SYSTEME = 0x70000
const TAILLE_PLAN = 80 * 256
export const COPINIT = 0x7a000
export const LISTE_VUE = 0x7a200
export const LISTE_VIDE = 0x7a400
export const POINTEUR = 0x7a500
const SPRITE_VIDE = 0x7a600
const SERVEURS_VBL = 0x7a700
const LIGNE_COMMANDE = 0x7a800
const VUE_SYSTEME = 0x7a900
export const DOS_BASE = 0x7b400
export const GFX_BASE = 0x7bc00
export const INTUITION_BASE = 0x7c400
export const TACHE = 0x7c800

/** ROM : routines d'interruption, fin du programme, fonctions simulées, chaînes. */
const ROM_CODE = ROM_DEBUT
export const ROM_SORTIE = ROM_DEBUT + 0x800
const ROM_STUBS = ROM_DEBUT + 0x1000
const ROM_CHAINES = ROM_DEBUT + 0x3000
const OP_SYS = 0xa0f0
const OP_SORTIE = 0xa0f1
const OP_VBL = 0xa0f2

/** Poignées de fichier de la console (BPTR « fictifs », non nuls). */
const CONSOLE_SORTIE = 0x1f40
const CONSOLE_ENTREE = 0x1f44

export const MEMF = { PUBLIC: 1, CHIP: 2, FAST: 4, CLEAR: 0x10000, LARGEST: 0x20000 } as const

/** Décalages des bibliothèques simulées (et de celles qu'on reconnaît pour les messages). */
export const LVO = {
  exec: {
    Supervisor: -30, Disable: -120, Enable: -126, Forbid: -132, Permit: -138, SetIntVector: -162,
    AddIntServer: -168, RemIntServer: -174, AllocMem: -198, FreeMem: -210, AvailMem: -216, FindTask: -294,
    SetSignal: -306, Wait: -318, Signal: -324, AllocSignal: -330, GetMsg: -372, ReplyMsg: -378, WaitPort: -384,
    OldOpenLibrary: -408, CloseLibrary: -414, OpenDevice: -444, CloseDevice: -450, DoIO: -456, RawDoFmt: -522,
    TypeOfMem: -534, OpenLibrary: -552, CopyMem: -624, CopyMemQuick: -630
  },
  dos: {
    Open: -30, Close: -36, Read: -42, Write: -48, Input: -54, Output: -60, Seek: -66, Lock: -84, UnLock: -90,
    IoErr: -132, LoadSeg: -150, DateStamp: -192, Delay: -198, WaitForChar: -204, Execute: -222
  },
  graphics: {
    Text: -60, SetFont: -66, OpenFont: -72, CloseFont: -78, LoadRGB4: -192, InitRastPort: -198, LoadView: -222,
    WaitBlit: -228, SetRast: -234, Move: -240, Draw: -246, WaitTOF: -270, SetRGB4: -288, RectFill: -306,
    ReadPixel: -318, WritePixel: -324, SetAPen: -342, SetBPen: -348, SetDrMd: -354, OwnBlitter: -456,
    DisownBlitter: -462
  },
  intuition: { OpenScreen: -198, OpenWindow: -204, CloseScreen: -66, CloseWindow: -72, DisplayBeep: -96 }
} as const

type NomBib = keyof typeof LVO

interface Bibliotheque {
  nom: string
  base: number
  vecteurs: number
  positif: number
  version: number
  idString: string
}

const BIBLIOTHEQUES: Record<NomBib, Bibliotheque> = {
  exec: { nom: 'exec.library', base: EXEC_BASE, vecteurs: 105, positif: 0x260, version: 34, idString: 'exec 34.2 (28 Oct 1987)' },
  dos: { nom: 'dos.library', base: DOS_BASE, vecteurs: 40, positif: 0x40, version: 34, idString: 'dos 34.3 (9 Dec 1987)' },
  graphics: { nom: 'graphics.library', base: GFX_BASE, vecteurs: 80, positif: 0x120, version: 34, idString: 'graphics 34.1 (18 Aug 1987)' },
  intuition: { nom: 'intuition.library', base: INTUITION_BASE, vecteurs: 60, positif: 0x40, version: 34, idString: 'intuition 34.3 (16 Sep 1987)' }
}

/** Champs utiles des structures système (décalages officiels). */
export const CHAMP = {
  LIB_VERSION: 20,
  LIB_OPENCNT: 32,
  ThisTask: 276,
  IDNestCnt: 294,
  TDNestCnt: 295,
  AttnFlags: 296,
  VBlankFrequency: 530,
  gb_ActiView: 34,
  gb_copinit: 38,
  gb_LOFlist: 50,
  gb_DisplayFlags: 206,
  tc_SigRecvd: 26,
  pr_CLI: 172
} as const

/** Couleurs du Workbench 1.3 et du pointeur. */
const COULEURS_SYSTEME = [0x05a, 0xfff, 0x002, 0xf80]
const COULEURS_POINTEUR = [0xd22, 0x000, 0xfca]

/** Pointeur de souris (dessin original de 68k Trainer) : 11 lignes de 2 mots. */
const DESSIN_POINTEUR = [
  [0xc000, 0x4000], [0x7000, 0xb000], [0x3c00, 0x4c00], [0x3f00, 0x4300], [0x1fc0, 0x2040], [0x1fc0, 0x2000],
  [0x0f00, 0x1100], [0x0d80, 0x1280], [0x04c0, 0x0940], [0x0460, 0x08a0], [0x0020, 0x0040]
]

// --- Code « en ROM » ------------------------------------------------------------

const NIVEAU = { 1: ROM_CODE + 0x000, 2: ROM_CODE + 0x040, 3: ROM_CODE + 0x100, 4: ROM_CODE + 0x200, 5: ROM_CODE + 0x240, 6: ROM_CODE + 0x280 }
const ROM_EXEC = ROM_CODE + 0x400 // Forbid, Permit, Disable, Enable

const SOURCES_ROM: [number, string][] = [
  [NIVEAU[1], `    MOVE.W #$0007,$DFF09C\n    RTE`],
  [
    NIVEAU[2],
    // CIA-A : lire l'ICR l'efface ; un octet du clavier est lu puis acquitté (poignée de main :
    // la ligne série passe un instant en sortie), puis fin de l'interruption PORTS
    `    MOVE.L D0,-(SP)
    MOVE.B $BFED01,D0
    BTST #3,D0
    BEQ.S .fin
    MOVE.B $BFEC01,D0
    BSET #6,$BFEE01
    MOVEQ #20,D0
.attente:
    DBF D0,.attente
    BCLR #6,$BFEE01
.fin:
    MOVE.W #$0008,$DFF09C
    MOVE.L (SP)+,D0
    RTE`
  ],
  [
    NIVEAU[3],
    // Niveau 3 : VBL (tâches du système puis serveurs AddIntServer), Copper, Blitter
    `    MOVEM.L D0-D1/A0-A2/A5-A6,-(SP)
    LEA $DFF000,A0
    MOVE.W $1E(A0),D0
    AND.W $1C(A0),D0
    BTST #5,D0
    BEQ.S .copper
    DC.W ${h(OP_VBL)}
    MOVE.W D0,-(SP)
    MOVEA.L ${h(SERVEURS_VBL)},A2
.serveur:
    TST.L (A2)
    BEQ.S .fini
    MOVEA.L 14(A2),A1
    MOVEA.L 18(A2),A5
    LEA $DFF000,A0
    MOVEA.L 4.W,A6
    MOVE.L A2,-(SP)
    JSR (A5)
    MOVEA.L (SP)+,A2
    MOVEA.L (A2),A2
    BRA.S .serveur
.fini:
    MOVE.W (SP)+,D0
    LEA $DFF000,A0
    MOVE.W #$0020,$9C(A0)
.copper:
    BTST #4,D0
    BEQ.S .blitter
    MOVE.W #$0010,$9C(A0)
.blitter:
    BTST #6,D0
    BEQ.S .sortie
    MOVE.W #$0040,$9C(A0)
.sortie:
    MOVEM.L (SP)+,D0-D1/A0-A2/A5-A6
    RTE`
  ],
  [NIVEAU[4], `    MOVE.W #$0780,$DFF09C\n    RTE`],
  [NIVEAU[5], `    MOVE.W #$1800,$DFF09C\n    RTE`],
  [
    NIVEAU[6],
    `    MOVE.L D0,-(SP)
    MOVE.B $BFDD00,D0
    MOVE.W #$2000,$DFF09C
    MOVE.L (SP)+,D0
    RTE`
  ],
  [
    ROM_EXEC,
    // Forbid / Permit / Disable / Enable, comme dans exec : compteurs d'imbrication dans ExecBase
    `forbid:
    ADDQ.B #1,${CHAMP.TDNestCnt}(A6)
    RTS
permit:
    SUBQ.B #1,${CHAMP.TDNestCnt}(A6)
    RTS
disable:
    MOVE.W #$4000,$DFF09A
    ADDQ.B #1,${CHAMP.IDNestCnt}(A6)
    RTS
enable:
    SUBQ.B #1,${CHAMP.IDNestCnt}(A6)
    BGE.S .encore
    MOVE.W #$C000,$DFF09A
.encore:
    RTS`
  ]
]

const DECALAGE_EXEC_CODE = { Forbid: 0, Permit: 6, Disable: 12, Enable: 26 } as const

let cacheRom: [number, Uint8Array][] | null = null

function routinesRom(): [number, Uint8Array][] {
  if (!cacheRom) {
    cacheRom = SOURCES_ROM.map(([adresse, code]) => {
      const r = assembler(`    ORG ${h(adresse)}\n${code}\n`)
      if (!r.ok) throw new Error(`Kickstart ${h(adresse)} : ` + r.erreurs.map((e) => e.message).join(' ; '))
      return [adresse, r.binaire]
    })
    // Les décalages de Forbid & co. dans le bloc doivent correspondre à DECALAGE_EXEC_CODE
    const exec = cacheRom.find(([a]) => a === ROM_EXEC)![1]
    const mot = (o: number): number => (exec[o] << 8) | exec[o + 1]
    if (mot(DECALAGE_EXEC_CODE.Permit) !== 0x532e || mot(DECALAGE_EXEC_CODE.Disable) !== 0x33fc || mot(DECALAGE_EXEC_CODE.Enable) !== 0x532e) {
      throw new Error('Kickstart : décalages de Forbid/Permit/Disable/Enable incohérents')
    }
  }
  return cacheRom
}

// --- Options ----------------------------------------------------------------------

export interface KickstartOptions {
  /** Texte « tapé » à l'avance au clavier, lu par Read(Input()) (lignes terminées par \n). */
  saisie?: string
  /** Vrai : Read() attend que l'utilisateur tape une ligne dans l'interface. */
  clavierInteractif?: boolean
  /** Arguments passés au programme (A0/D0), comme sur la ligne de commande du CLI. */
  arguments?: string
}

/** Bilan à la sortie du programme : le système a-t-il été rendu proprement ? */
export interface BilanAmiga {
  termine: boolean
  codeRetour: number
  problemes: string[]
}

const bilans = new WeakMap<Cpu, BilanAmiga>()

export function bilanAmiga(cpu: Cpu): BilanAmiga | undefined {
  return bilans.get(cpu)
}

export function createKickstart(options: KickstartOptions = {}): Platform {
  let materiel!: MaterielAmiga
  /** Table : index de la routine simulée → [bibliothèque, décalage]. */
  const stubs: [NomBib, number][] = []
  for (const nom of Object.keys(BIBLIOTHEQUES) as NomBib[]) {
    for (let i = 1; i <= BIBLIOTHEQUES[nom].vecteurs; i++) stubs.push([nom, -6 * i])
  }
  const indexStub = new Map(stubs.map(([b, o], i) => [`${b}${o}`, i]))

  // Mémoire allouée (adresse → taille) et zones libres
  let allouees = new Map<number, number>()
  let libresChip: [number, number][] = []
  let libresFast: [number, number][] = []
  let saisie = ''
  let ioErr = 0
  let attenteDebut: number | null = null
  let imageAttendue: number | null = null
  let sourisPrecedente = 0
  let pointeurX = 320
  let pointeurY = 100
  let romCopie: Uint8Array | null = null

  const nomFonction = (bib: NomBib, decalage: number): string =>
    Object.entries(LVO[bib]).find(([, v]) => v === decalage)?.[0] ?? `${decalage}`

  // --- Mémoire ---

  function allouer(cpu: Cpu, taille: number, exigences: number): number {
    if (taille <= 0) return 0
    const t = (taille + 7) & ~7
    const essayer = (zones: [number, number][]): number => {
      for (const z of zones) {
        if (z[1] - z[0] >= t) {
          const adresse = z[0]
          z[0] += t
          allouees.set(adresse, taille)
          if (exigences & MEMF.CLEAR) for (let i = 0; i < t; i++) cpu.memory.writeU8(adresse + i, 0)
          return adresse
        }
      }
      return 0
    }
    if (exigences & MEMF.CHIP) return essayer(libresChip)
    if (exigences & MEMF.FAST) return essayer(libresFast)
    return essayer(libresFast) || essayer(libresChip)
  }

  function liberer(cpu: Cpu, adresse: number, taille: number): void {
    const connue = allouees.get(adresse)
    if (connue === undefined) {
      throw new Error(
        `FreeMem($${adresse.toString(16).toUpperCase()}) : ce bloc n'a pas été alloué par AllocMem (ou il a déjà été libéré). ` +
          'Sur un vrai Amiga : Software Failure, Guru Meditation #81000009 (mémoire libérée deux fois).'
      )
    }
    if (connue !== taille) {
      throw new Error(`FreeMem : le bloc fait ${connue} octets mais tu en libères ${taille}. Il faut donner exactement la taille passée à AllocMem.`)
    }
    allouees.delete(adresse)
    const t = (taille + 7) & ~7
    const zones = adresse >= SLOW_DEBUT ? libresFast : libresChip
    zones.push([adresse, adresse + t])
    zones.sort((a, b) => a[0] - b[0])
    // Fusion des zones contiguës
    for (let i = zones.length - 1; i > 0; i--) {
      if (zones[i - 1][1] === zones[i][0]) {
        zones[i - 1][1] = zones[i][1]
        zones.splice(i, 1)
      }
    }
    void cpu
  }

  const libre = (zones: [number, number][], plusGrand: boolean): number =>
    plusGrand ? Math.max(0, ...zones.map(([a, b]) => b - a)) : zones.reduce((s, [a, b]) => s + b - a, 0)

  // --- Attentes (Delay, WaitTOF, WaitBlit, Read, Wait) ---

  /** La fonction simulée attend : elle sera réexécutée, le temps avance jusqu'au prochain événement. */
  function attendre(cpu: Cpu, cible = Infinity): true {
    cpu.pc = (cpu.pc - 2) & 0xffffff
    cpu.cycles = Math.max(cpu.cycles + 4, Math.min(cible, materiel.prochainEvenement(), cpu.cycles + 40000))
    cpu.waiting = true
    return true
  }

  // --- Console ---

  function ecrireConsole(cpu: Cpu, adresse: number, longueur: number): void {
    let texte = ''
    for (let i = 0; i < longueur; i++) texte += String.fromCharCode(cpu.memory.readU8((adresse + i) & 0xffffff))
    cpu.output += texte
  }

  /** Read() sur la console : rend une ligne complète (avec son \n), comme le CLI. */
  function lireConsole(cpu: Cpu): boolean {
    const tampon = cpu.d[2]
    const max = cpu.d[3] | 0
    // Ce qui a été tapé dans l'interface rejoint la saisie (avec écho à l'écran)
    while (materiel.frappes.length) {
      const c = materiel.frappes.shift()!
      const car = c === '\r' ? '\n' : c
      if (car === '\b') {
        if (saisie.length && !saisie.endsWith('\n')) {
          saisie = saisie.slice(0, -1)
          cpu.output = cpu.output.slice(0, -1)
        }
        continue
      }
      saisie += car
      cpu.output += car
    }
    const fin = saisie.indexOf('\n')
    if (fin < 0) {
      if (options.clavierInteractif) return attendre(cpu)
      throw new Error("Le programme attend une ligne tapée au clavier (Read), mais rien n'a été prévu pour cet exercice.")
    }
    const ligne = saisie.slice(0, Math.min(fin + 1, max))
    saisie = saisie.slice(ligne.length)
    for (let i = 0; i < ligne.length; i++) cpu.memory.writeU8((tampon + i) & 0xffffff, ligne.charCodeAt(i))
    cpu.d[0] = ligne.length
    return true
  }

  // --- RawDoFmt ---

  function rawDoFmt(cpu: Cpu): void {
    const mem = cpu.memory
    const proc = cpu.a[2]
    // On sait faire la « putChProc » classique : MOVE.B D0,(A3)+ / RTS
    if (mem.readU16(proc) !== 0x16c0 || mem.readU16(proc + 2) !== 0x4e75) {
      throw new Error('RawDoFmt : seule la routine classique « MOVE.B D0,(A3)+ / RTS » est simulée pour A2.')
    }
    const format = mem.readCString(cpu.a[0])
    let donnees = cpu.a[1]
    let sortie = ''
    for (let i = 0; i < format.length; i++) {
      const c = format[i]
      if (c !== '%') {
        sortie += c
        continue
      }
      const m = format.slice(i + 1).match(/^(-?)(0?)(\d*)(?:\.(\d+))?(l?)([dDuUxXsScbB%])/)
      if (!m) {
        sortie += c
        continue
      }
      i += m[0].length
      const [, gaucheSigne, zero, largeurTexte, , long, type] = m
      if (type === '%') {
        sortie += '%'
        continue
      }
      let texte: string
      const lireMot = (): number => {
        const v = mem.readU16(donnees)
        donnees += 2
        return v
      }
      const lireLong = (): number => {
        const v = mem.readU32(donnees)
        donnees += 4
        return v
      }
      switch (type.toLowerCase()) {
        case 'd':
          texte = String(long ? lireLong() | 0 : (lireMot() << 16) >> 16)
          break
        case 'u':
          texte = String(long ? lireLong() >>> 0 : lireMot())
          break
        case 'x':
          texte = (long ? lireLong() >>> 0 : lireMot()).toString(16)
          if (type === 'X') texte = texte.toUpperCase()
          break
        case 's':
          texte = mem.readCString(lireLong())
          break
        case 'c':
          texte = String.fromCharCode((long ? lireLong() : lireMot()) & 0xff)
          break
        default: {
          // %b : BSTR (pointeur BCPL, longueur en premier octet)
          const bstr = lireLong() << 2
          texte = ''
          for (let k = 0; k < mem.readU8(bstr); k++) texte += String.fromCharCode(mem.readU8(bstr + 1 + k))
        }
      }
      const largeur = parseInt(largeurTexte || '0', 10)
      if (texte.length < largeur) texte = gaucheSigne ? texte.padEnd(largeur) : texte.padStart(largeur, zero ? '0' : ' ')
      sortie += texte
    }
    sortie += '\0'
    for (let k = 0; k < sortie.length; k++) mem.writeU8((cpu.a[3] + k) & 0xffffff, sortie.charCodeAt(k))
    cpu.a[3] = (cpu.a[3] + sortie.length) >>> 0
    cpu.d[0] = donnees
  }

  // --- Les fonctions simulées ---

  function ouvrirBibliotheque(cpu: Cpu, version: number): void {
    const nom = cpu.memory.readCString(cpu.a[1])
    const b = Object.values(BIBLIOTHEQUES).find((x) => x.nom === nom)
    if (!b || version > b.version) {
      cpu.d[0] = 0
      return
    }
    cpu.memory.writeU16(b.base + CHAMP.LIB_OPENCNT, cpu.memory.readU16(b.base + CHAMP.LIB_OPENCNT) + 1)
    cpu.d[0] = b.base
  }

  function signaux(cpu: Cpu): number {
    return cpu.memory.readU32(TACHE + CHAMP.tc_SigRecvd)
  }

  function appel(cpu: Cpu, bib: NomBib, decalage: number): boolean {
    const mem = cpu.memory
    const fn = nomFonction(bib, decalage)
    if (bib === 'exec') {
      switch (fn) {
        case 'Supervisor': {
          // Comme une exception : retour (empilé par le JSR) et SR sur la pile superviseur, puis A5
          const retour = cpu.popLong()
          const sr = cpu.sr
          cpu.sr = sr | 0x2000
          cpu.pushLong(retour)
          cpu.pushWord(sr)
          cpu.pc = cpu.a[5]
          return true
        }
        case 'AddIntServer':
        case 'RemIntServer': {
          if ((cpu.d[0] & 0xff) !== 5) throw new Error(`${fn} : seul le numéro 5 (INTB_VERTB, la VBL) est simulé.`)
          const noeud = cpu.a[1]
          // Liste exec : LH_HEAD, LH_TAIL (= 0), LH_TAILPRED
          const premier = (): number => mem.readU32(SERVEURS_VBL)
          if (fn === 'AddIntServer') {
            const pri = mem.readS8(noeud + 9)
            let avant = premier()
            while (mem.readU32(avant) !== 0 && mem.readS8(avant + 9) >= pri) avant = mem.readU32(avant)
            const pred = mem.readU32(avant + 4)
            mem.writeU32(noeud, avant)
            mem.writeU32(noeud + 4, pred)
            mem.writeU32(pred, noeud)
            mem.writeU32(avant + 4, noeud)
          } else {
            const succ = mem.readU32(noeud)
            const pred = mem.readU32(noeud + 4)
            mem.writeU32(pred, succ)
            mem.writeU32(succ + 4, pred)
          }
          return true
        }
        case 'AllocMem':
          cpu.d[0] = allouer(cpu, cpu.d[0] | 0, cpu.d[1])
          return true
        case 'FreeMem':
          liberer(cpu, cpu.a[1], cpu.d[0] | 0)
          return true
        case 'AvailMem': {
          const e = cpu.d[1]
          const plusGrand = (e & MEMF.LARGEST) !== 0
          cpu.d[0] =
            e & MEMF.CHIP
              ? libre(libresChip, plusGrand)
              : e & MEMF.FAST
                ? libre(libresFast, plusGrand)
                : plusGrand
                  ? Math.max(libre(libresChip, true), libre(libresFast, true))
                  : libre(libresChip, false) + libre(libresFast, false)
          return true
        }
        case 'TypeOfMem': {
          const a = cpu.a[1]
          cpu.d[0] = a < 0x80000 ? MEMF.CHIP | MEMF.PUBLIC : a >= SLOW_DEBUT && a < SLOW_FIN ? MEMF.FAST | MEMF.PUBLIC : 0
          return true
        }
        case 'FindTask':
          cpu.d[0] = cpu.a[1] === 0 ? TACHE : 0
          return true
        case 'SetSignal': {
          const ancien = signaux(cpu)
          const masque = cpu.d[1]
          mem.writeU32(TACHE + CHAMP.tc_SigRecvd, ((ancien & ~masque) | (cpu.d[0] & masque)) >>> 0)
          cpu.d[0] = ancien
          return true
        }
        case 'Wait': {
          const recus = signaux(cpu) & cpu.d[0]
          if (!recus) {
            if (!options.clavierInteractif) throw new Error('Wait() attend un signal (Ctrl+C…) qui ne viendra jamais dans cet exercice.')
            return attendre(cpu)
          }
          mem.writeU32(TACHE + CHAMP.tc_SigRecvd, (signaux(cpu) & ~recus) >>> 0)
          cpu.d[0] = recus
          return true
        }
        case 'OldOpenLibrary':
          ouvrirBibliotheque(cpu, 0)
          return true
        case 'OpenLibrary':
          ouvrirBibliotheque(cpu, cpu.d[0] >>> 0)
          return true
        case 'CloseLibrary': {
          const b = Object.values(BIBLIOTHEQUES).find((x) => x.base === cpu.a[1])
          if (b) mem.writeU16(b.base + CHAMP.LIB_OPENCNT, Math.max(0, mem.readU16(b.base + CHAMP.LIB_OPENCNT) - 1))
          return true
        }
        case 'RawDoFmt':
          rawDoFmt(cpu)
          return true
        case 'CopyMem':
        case 'CopyMemQuick': {
          const n = cpu.d[0] >>> 0
          const copie = new Uint8Array(n)
          for (let i = 0; i < n; i++) copie[i] = mem.readU8((cpu.a[0] + i) & 0xffffff)
          for (let i = 0; i < n; i++) mem.writeU8((cpu.a[1] + i) & 0xffffff, copie[i])
          cpu.cycles += n * 2
          return true
        }
      }
    }
    if (bib === 'dos') {
      switch (fn) {
        case 'Output':
          cpu.d[0] = CONSOLE_SORTIE
          return true
        case 'Input':
          cpu.d[0] = CONSOLE_ENTREE
          return true
        case 'Open': {
          const nom = mem.readCString(cpu.d[1]).toUpperCase()
          if (nom === '*' || nom.startsWith('CON:') || nom.startsWith('RAW:')) cpu.d[0] = CONSOLE_SORTIE
          else {
            cpu.d[0] = 0
            ioErr = 205 // ERROR_OBJECT_NOT_FOUND : pas de disque dans l'Amiga simulé
          }
          return true
        }
        case 'Close':
          cpu.d[0] = -1 >>> 0
          return true
        case 'Write': {
          if (cpu.d[1] !== CONSOLE_SORTIE && cpu.d[1] !== CONSOLE_ENTREE) {
            if (cpu.d[1] === 0) throw new Error('Write() avec une poignée nulle (D1 = 0) : as-tu bien appelé Output() et rangé D0 dans D1 ?')
            cpu.d[0] = -1 >>> 0
            ioErr = 114
            return true
          }
          ecrireConsole(cpu, cpu.d[2], cpu.d[3] | 0)
          cpu.d[0] = cpu.d[3]
          return true
        }
        case 'Read':
          if (cpu.d[1] !== CONSOLE_ENTREE && cpu.d[1] !== CONSOLE_SORTIE) {
            cpu.d[0] = -1 >>> 0
            return true
          }
          return lireConsole(cpu)
        case 'IoErr':
          cpu.d[0] = ioErr
          return true
        case 'Delay': {
          // Delay(D1) : D1 cinquantièmes de seconde
          if (attenteDebut === null) attenteDebut = cpu.cycles
          const fin = attenteDebut + (cpu.d[1] >>> 0) * (CYCLES_PAR_IMAGE)
          if (cpu.cycles < fin) return attendre(cpu, fin)
          attenteDebut = null
          return true
        }
      }
    }
    if (bib === 'graphics') {
      switch (fn) {
        case 'LoadView': {
          const vue = cpu.a[1]
          if (vue !== 0 && vue !== VUE_SYSTEME) throw new Error('LoadView : seules la vue du système (gb_ActiView) et 0 sont simulées.')
          mem.writeU32(GFX_BASE + CHAMP.gb_ActiView, vue)
          mem.writeU32(GFX_BASE + CHAMP.gb_LOFlist, vue ? LISTE_VUE : LISTE_VIDE)
          materiel.ecrire(R.COP2LCH, (vue ? LISTE_VUE : LISTE_VIDE) >>> 16)
          materiel.ecrire(R.COP2LCH + 2, (vue ? LISTE_VUE : LISTE_VIDE) & 0xffff)
          return true
        }
        case 'WaitTOF': {
          if (imageAttendue === null) imageAttendue = materiel.numeroImage() + 1
          if (materiel.numeroImage() < imageAttendue) return attendre(cpu)
          imageAttendue = null
          return true
        }
        case 'WaitBlit':
          if (materiel.blitterOccupe()) return attendre(cpu)
          return true
        case 'OwnBlitter':
        case 'DisownBlitter':
          return true
      }
    }
    if (bib === 'intuition' && fn === 'DisplayBeep') {
      // L'écran clignote : la couleur de fond s'inverse un instant (dans la liste Copper du système)
      const v = mem.readU16(LISTE_VUE + 2)
      mem.writeU16(LISTE_VUE + 2, ~v & 0xfff)
      return true
    }
    const connue = Object.values(LVO[bib]).includes(decalage as never)
    throw new Error(
      `${BIBLIOTHEQUES[bib].nom}, fonction ${decalage}${connue ? ` (${fn})` : ''} : non simulée dans 68k Trainer.` +
        (bib === 'exec' && decalage === -552 ? '' : ' Vérifie le décalage et la bibliothèque dans A6.')
    )
  }

  // --- Tâches du système à chaque VBL (dans la routine de niveau 3) ---

  function vblSysteme(cpu: Cpu): void {
    const mem = cpu.memory
    // graphics : la liste Copper de la vue redevient celle de l'image suivante
    const lof = mem.readU32(GFX_BASE + CHAMP.gb_LOFlist)
    const regs = materiel.regs
    if (lof && ((regs[R.COP2LCH >> 1] << 16) | regs[(R.COP2LCH >> 1) + 1]) >>> 0 !== lof) {
      materiel.ecrire(R.COP2LCH, lof >>> 16)
      materiel.ecrire(R.COP2LCH + 2, lof & 0xffff)
    }
    // input.device : la souris fait bouger le pointeur (sprite 0)
    const compteurs = materiel.compteursSouris()
    const dx = ((compteurs & 0xff) - (sourisPrecedente & 0xff) + 384) % 256 - 128
    const dy = (((compteurs >> 8) & 0xff) - ((sourisPrecedente >> 8) & 0xff) + 384) % 256 - 128
    sourisPrecedente = compteurs
    pointeurX = Math.max(0, Math.min(639, pointeurX + dx * 2))
    pointeurY = Math.max(0, Math.min(255, pointeurY + dy))
    placerPointeur(mem)
  }

  function placerPointeur(mem: Cpu['memory']): void {
    const x = 0x80 + (pointeurX >> 1) - 1
    const y = 0x2c + pointeurY
    const fin = y + DESSIN_POINTEUR.length
    mem.writeU16(POINTEUR, ((y & 0xff) << 8) | ((x >> 1) & 0xff))
    mem.writeU16(POINTEUR + 2, ((fin & 0xff) << 8) | ((y >> 8) & 1) << 2 | ((fin >> 8) & 1) << 1 | (x & 1))
  }

  // --- Préparation de la machine ---

  function ecrireChaine(cpu: Cpu, adresse: number, texte: string): number {
    for (let i = 0; i < texte.length; i++) cpu.memory.writeU8(adresse + i, texte.charCodeAt(i))
    cpu.memory.writeU8(adresse + texte.length, 0)
    return adresse + texte.length + 1
  }

  function preparer(cpu: Cpu): void {
    const mem = cpu.memory
    // Code en ROM
    for (const [adresse, octets] of routinesRom()) mem.loadBytes(adresse, octets)
    mem.writeU16(ROM_SORTIE, OP_SORTIE)
    stubs.forEach((_, i) => {
      mem.writeU16(ROM_STUBS + i * 4, OP_SYS)
      mem.writeU16(ROM_STUBS + i * 4 + 2, 0x4e75) // RTS
    })
    let chaine = ROM_CHAINES

    // Bibliothèques : en-tête, table de sauts
    for (const [cle, b] of Object.entries(BIBLIOTHEQUES) as [NomBib, Bibliotheque][]) {
      const nomAdr = chaine
      chaine = ecrireChaine(cpu, chaine, b.nom)
      const idAdr = chaine
      chaine = ecrireChaine(cpu, chaine, b.idString)
      mem.writeU8(b.base + 8, 9) // NT_LIBRARY
      mem.writeU32(b.base + 10, nomAdr)
      mem.writeU16(b.base + 16, b.vecteurs * 6) // LIB_NEGSIZE
      mem.writeU16(b.base + 18, b.positif)
      mem.writeU16(b.base + CHAMP.LIB_VERSION, b.version)
      mem.writeU16(b.base + 22, 0)
      mem.writeU32(b.base + 24, idAdr)
      mem.writeU16(b.base + CHAMP.LIB_OPENCNT, 1)
      for (let i = 1; i <= b.vecteurs; i++) {
        const entree = b.base - 6 * i
        const cible =
          cle === 'exec' && -6 * i in EXEC_CODE_PAR_DECALAGE ? EXEC_CODE_PAR_DECALAGE[-6 * i] : ROM_STUBS + indexStub.get(`${cle}${-6 * i}`)! * 4
        mem.writeU16(entree, 0x4ef9) // JMP xxx.L
        mem.writeU32(entree + 2, cible)
      }
    }
    // ExecBase
    mem.writeU32(4, EXEC_BASE)
    mem.writeU16(EXEC_BASE + 34, 34) // SoftVer
    mem.writeU32(EXEC_BASE + 38, ~EXEC_BASE >>> 0) // ChkBase
    mem.writeU32(EXEC_BASE + 62, 0x80000) // MaxLocMem : taille de la Chip RAM
    mem.writeU32(EXEC_BASE + CHAMP.ThisTask, TACHE)
    mem.writeU8(EXEC_BASE + CHAMP.IDNestCnt, 0xff)
    mem.writeU8(EXEC_BASE + CHAMP.TDNestCnt, 0xff)
    mem.writeU16(EXEC_BASE + CHAMP.AttnFlags, 0) // 68000
    mem.writeU8(EXEC_BASE + CHAMP.VBlankFrequency, 50)
    mem.writeU8(EXEC_BASE + CHAMP.VBlankFrequency + 1, 50)
    // Tâche du programme (un process lancé depuis le CLI)
    const nomTache = chaine
    chaine = ecrireChaine(cpu, chaine, 'Shell Process')
    mem.writeU8(TACHE + 8, 13) // NT_PROCESS
    mem.writeU32(TACHE + 10, nomTache)
    mem.writeU32(TACHE + 58, PILE_UTILISATEUR - 0x3000) // tc_SPLower
    mem.writeU32(TACHE + 62, PILE_UTILISATEUR + 0x10) // tc_SPUpper
    mem.writeU32(TACHE + CHAMP.pr_CLI, 0x1f00) // pr_CLI non nul : lancé depuis le CLI
    // Liste des serveurs de la VBL (vide) : LH_HEAD → LH_TAIL
    mem.writeU32(SERVEURS_VBL, SERVEURS_VBL + 4)
    mem.writeU32(SERVEURS_VBL + 4, 0)
    mem.writeU32(SERVEURS_VBL + 8, SERVEURS_VBL)
    // Vecteurs d'interruption (auto-vecteurs 1 à 6)
    mem.writeU32(0x64, NIVEAU[1])
    mem.writeU32(0x68, NIVEAU[2])
    mem.writeU32(0x6c, NIVEAU[3])
    mem.writeU32(0x70, NIVEAU[4])
    mem.writeU32(0x74, NIVEAU[5])
    mem.writeU32(0x78, NIVEAU[6])

    // Écran du CLI : fond bleu, barre de titre blanche
    for (let i = 0; i < 80 * 10; i += 2) mem.writeU16(ECRAN_SYSTEME + i, 0xffff)
    // Pointeur de souris et sprite vide
    DESSIN_POINTEUR.forEach(([a, b], i) => {
      mem.writeU16(POINTEUR + 4 + i * 4, a)
      mem.writeU16(POINTEUR + 6 + i * 4, b)
    })
    placerPointeur(mem)
    mem.writeU32(SPRITE_VIDE, 0)

    // Listes Copper : copinit (sprites + réglages) puis saut vers la liste de la vue (COP2)
    const liste = (adresse: number, mots: number[]): void => mots.forEach((m, i) => mem.writeU16(adresse + i * 2, m))
    const sprites: number[] = []
    for (let s = 0; s < 8; s++) {
      const p = s === 0 ? POINTEUR : SPRITE_VIDE
      sprites.push(R.SPR0PTH + s * 4, p >>> 16, R.SPR0PTH + s * 4 + 2, p & 0xffff)
    }
    liste(COPINIT, [
      ...sprites,
      R.DIWSTRT, 0x2c81, R.DIWSTOP, 0x2cc1, R.DDFSTRT, 0x003c, R.DDFSTOP, 0x00d4,
      R.BPLCON1, 0, R.BPLCON2, 0x0024, R.BPL1MOD, 0, R.BPL2MOD, 0,
      R.COLOR00 + 34, COULEURS_POINTEUR[0], R.COLOR00 + 36, COULEURS_POINTEUR[1], R.COLOR00 + 38, COULEURS_POINTEUR[2],
      R.COPJMP2, 0
    ])
    liste(LISTE_VUE, [
      R.COLOR00, COULEURS_SYSTEME[0], R.COLOR00 + 2, COULEURS_SYSTEME[1], R.COLOR00 + 4, COULEURS_SYSTEME[2], R.COLOR00 + 6, COULEURS_SYSTEME[3],
      R.BPL1PTH, ECRAN_SYSTEME >>> 16, R.BPL1PTH + 2, ECRAN_SYSTEME & 0xffff,
      R.BPL1PTH + 4, (ECRAN_SYSTEME + TAILLE_PLAN) >>> 16, R.BPL1PTH + 6, (ECRAN_SYSTEME + TAILLE_PLAN) & 0xffff,
      R.BPLCON0, 0xa200,
      0xffff, 0xfffe
    ])
    liste(LISTE_VIDE, [R.BPLCON0, 0x0200, R.COLOR00, 0x000, 0xffff, 0xfffe])
    // Vue du système (structure View réduite : on n'en utilise que l'adresse)
    mem.writeU32(VUE_SYSTEME, 0)
    // GfxBase
    mem.writeU32(GFX_BASE + CHAMP.gb_ActiView, VUE_SYSTEME)
    mem.writeU32(GFX_BASE + CHAMP.gb_copinit, COPINIT)
    mem.writeU32(GFX_BASE + CHAMP.gb_LOFlist, LISTE_VUE)
    mem.writeU16(GFX_BASE + CHAMP.gb_DisplayFlags, 4) // PAL
    // Ligne de commande du CLI
    ecrireChaine(cpu, LIGNE_COMMANDE, (options.arguments ?? '') + '\n')

    // Puces : DMA et interruptions comme sous le Workbench, Copper sur copinit
    const ecrire = (d: number, v: number): void => materiel.ecrire(d, v)
    ecrire(R.COP1LCH, COPINIT >>> 16)
    ecrire(R.COP1LCH + 2, COPINIT & 0xffff)
    ecrire(R.COP2LCH, LISTE_VUE >>> 16)
    ecrire(R.COP2LCH + 2, LISTE_VUE & 0xffff)
    ecrire(R.DMACON, DMA.SETCLR | DMA.DMAEN | DMA.BPL | DMA.COP | DMA.BLT | DMA.SPR)
    ecrire(R.INTENA, 0x8000 | INT.INTEN | INT.EXTER | INT.VERTB | INT.PORTS | INT.SOFT)
    ecrire(R.COPJMP1, 0)
    // CIA-A : port A (bits 0-1 en sortie : OVL, LED/filtre), interruptions du clavier
    cpu.memory.writeU8(0xbfe201, 0x03)
    materiel.ciaA.ecrire(2, 0x03, 0)
    materiel.ciaA.ecrire(0, 0x00, 0)
    materiel.ciaA.ecrire(13, 0x88, 0)
    materiel.prechauffer()
  }

  const EXEC_CODE_PAR_DECALAGE: Record<number, number> = {
    [LVO.exec.Forbid]: ROM_EXEC + DECALAGE_EXEC_CODE.Forbid,
    [LVO.exec.Permit]: ROM_EXEC + DECALAGE_EXEC_CODE.Permit,
    [LVO.exec.Disable]: ROM_EXEC + DECALAGE_EXEC_CODE.Disable,
    [LVO.exec.Enable]: ROM_EXEC + DECALAGE_EXEC_CODE.Enable
  }

  /** Fin du programme : bilan de ce qui a été rendu (ou pas) au système. */
  function bilan(cpu: Cpu): BilanAmiga {
    const mem = cpu.memory
    const problemes: string[] = []
    const tdn = mem.readS8(EXEC_BASE + CHAMP.TDNestCnt)
    const idn = mem.readS8(EXEC_BASE + CHAMP.IDNestCnt)
    if (tdn > -1) problemes.push(`Forbid() appelé ${tdn + 1} fois de plus que Permit() : le multitâche reste bloqué.`)
    if (tdn < -1) problemes.push('Permit() appelé plus souvent que Forbid().')
    if (idn > -1) problemes.push('Disable() sans Enable() : les interruptions restent coupées.')
    if (idn < -1) problemes.push('Enable() appelé plus souvent que Disable().')
    if (allouees.size) {
      const total = [...allouees.values()].reduce((s, t) => s + t, 0)
      problemes.push(`${total} octets alloués par AllocMem n'ont pas été rendus par FreeMem.`)
    }
    const dmacon = materiel.dmacon()
    if ((dmacon & (DMA.DMAEN | DMA.COP | DMA.BPL)) !== (DMA.DMAEN | DMA.COP | DMA.BPL)) {
      problemes.push("Le DMA du système n'a pas été rétabli (DMACON : DMAEN, COPEN, BPLEN) : l'écran du Workbench reste éteint.")
    }
    const intena = materiel.intena()
    if ((intena & (INT.INTEN | INT.VERTB | INT.PORTS)) !== (INT.INTEN | INT.VERTB | INT.PORTS)) {
      problemes.push("Les interruptions du système n'ont pas été rétablies (INTENA) : clavier et souris restent figés.")
    }
    const cop1 = ((materiel.regs[R.COP1LCH >> 1] << 16) | materiel.regs[(R.COP1LCH >> 1) + 1]) >>> 0
    if (cop1 !== COPINIT) problemes.push("La liste Copper du système n'a pas été remise dans COP1LC (gb_copinit, décalage 38 de GfxBase).")
    if (mem.readU32(0x6c) !== NIVEAU[3]) problemes.push("Le vecteur de l'interruption de niveau 3 ($6C) n'a pas été rendu au système.")
    if (mem.readU32(GFX_BASE + CHAMP.gb_ActiView) !== VUE_SYSTEME) problemes.push("La vue du système n'a pas été rechargée (LoadView de l'ancienne gb_ActiView).")
    return { termine: true, codeRetour: cpu.d[0], problemes }
  }

  return {
    onReset(cpu: Cpu): void {
      materiel = materielAmiga(cpu)!
      allouees = new Map()
      libresChip = [[CHIP_LIBRE_DEBUT, CHIP_LIBRE_FIN]]
      libresFast = [[SLOW_DEBUT, SLOW_FIN]]
      saisie = options.saisie ?? ''
      ioErr = 0
      attenteDebut = null
      imageAttendue = null
      sourisPrecedente = 0
      pointeurX = 320
      pointeurY = 100
      preparer(cpu)
      romCopie = new Uint8Array(0x4000)
      for (let i = 0; i < romCopie.length; i++) romCopie[i] = cpu.memory.readU8(ROM_DEBUT + i)
      // Le programme démarre en mode utilisateur, interruptions autorisées, comme lancé par le CLI
      const mem = cpu.memory
      mem.writeU32(PILE_UTILISATEUR, ROM_SORTIE)
      cpu.a[7] = PILE_SUPERVISEUR
      cpu.intMask = 0
      cpu.enterUserMode(PILE_UTILISATEUR)
      cpu.a[0] = LIGNE_COMMANDE
      cpu.d[0] = (options.arguments ?? '').length + 1
      bilans.delete(cpu)
    },

    onLineA(cpu: Cpu, opcode: number): boolean {
      const at = (cpu.pc - 2) & 0xffffff
      if (opcode === OP_SYS && at >= ROM_STUBS && at < ROM_STUBS + stubs.length * 4) {
        const [bib, decalage] = stubs[(at - ROM_STUBS) >> 2]
        return appel(cpu, bib, decalage)
      }
      if (opcode === OP_SORTIE && at === ROM_SORTIE) {
        bilans.set(cpu, bilan(cpu))
        cpu.halted = true
        return true
      }
      if (opcode === OP_VBL && at >= NIVEAU[3] && at < NIVEAU[3] + 0x100) {
        vblSysteme(cpu)
        return true
      }
      return false
    },

    onMemoryWrite(cpu: Cpu, address: number, size: Size): void {
      // La ROM ne s'écrit pas : on remet les octets d'origine
      if (address < ROM_DEBUT || address >= ROM_FIN || !romCopie) return
      for (let i = 0; i < size; i++) {
        const o = address + i - ROM_DEBUT
        cpu.memory.writeU8(address + i, o < romCopie.length ? romCopie[o] : 0)
      }
      materiel.alerter('Écriture dans la ROM du Kickstart ignorée (la ROM ne peut pas être modifiée).')
    },

    describeException(vector: number): string {
      return ` — sur Amiga : « Software Failure », Guru Meditation #${vector.toString(16).toUpperCase().padStart(8, '0')}`
    }
  }
}
