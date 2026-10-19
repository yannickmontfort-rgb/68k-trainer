/**
 * Encodage des instructions du 68000, au comportement de Devpac (vérifié octet par octet contre
 * vasm -devpac) : ce qui est écrit est ce qui est produit. Aucune instruction n'est remplacée par
 * une autre ; une adresse absolue sans taille est en .L ; un branchement sans taille est en .W.
 * Seule exception, comme Devpac : un ADD/SUB/AND/OR/CMP avec une valeur immédiate et une
 * destination mémoire devient ADDI/SUBI/ANDI/ORI/CMPI (c'est la seule forme qui existe).
 */
import { AsmErreur } from './erreurs'
import type { Valeur } from './expressions'
import type { Champ, Taille } from './lignes'
import { analyserOperande, type Index, type Operande } from './operandes'

export interface ContexteEncodage {
  /** Adresse du début de l'instruction. */
  pc: number
  passe: 1 | 2
  /** Évalue une expression (le contexte connaît l'adresse courante). */
  evaluer(champ: Champ): Valeur
  /** Programme relogeable (.PRG) : interdit les adresses relogeables sur 16 bits. */
  relogeable: boolean
  avertir(message: string, colonne?: number, longueur?: number): void
}

export class Sortie {
  readonly octets: number[] = []
  /** Positions (dans l'instruction) des mots longs à reloger. */
  readonly relocs: number[] = []
  mot(v: number): void {
    this.octets.push((v >>> 8) & 0xff, v & 0xff)
  }
  long(v: number, reloc = false): void {
    if (reloc) this.relocs.push(this.octets.length)
    this.mot(v >>> 16)
    this.mot(v & 0xffff)
  }
}

type Mode = 'Dn' | 'An' | 'ind' | 'postinc' | 'predec' | 'd16An' | 'd8AnXn' | 'absW' | 'absL' | 'd16PC' | 'd8PCXn' | 'imm'
const TOUT: Mode[] = ['Dn', 'An', 'ind', 'postinc', 'predec', 'd16An', 'd8AnXn', 'absW', 'absL', 'd16PC', 'd8PCXn', 'imm']
const sans = (base: Mode[], ...exclus: Mode[]): Mode[] => base.filter((m) => !exclus.includes(m))
const DONNEE = sans(TOUT, 'An')
const MEMOIRE = sans(TOUT, 'Dn', 'An')
const CONTROLE: Mode[] = ['ind', 'd16An', 'd8AnXn', 'absW', 'absL', 'd16PC', 'd8PCXn']
const MODIFIABLE = sans(TOUT, 'd16PC', 'd8PCXn', 'imm')
const DONNEE_MOD = DONNEE.filter((m) => MODIFIABLE.includes(m))
const MEM_MOD = MEMOIRE.filter((m) => MODIFIABLE.includes(m))
const CTRL_MOD = CONTROLE.filter((m) => MODIFIABLE.includes(m))

const NOM_MODE: Record<Mode, string> = {
  Dn: 'un registre de données',
  An: "un registre d'adresse",
  ind: '(An)',
  postinc: '(An)+',
  predec: '-(An)',
  d16An: 'd(An)',
  d8AnXn: 'd(An,Xn)',
  absW: 'une adresse absolue',
  absL: 'une adresse absolue',
  d16PC: 'd(PC)',
  d8PCXn: 'd(PC,Xn)',
  imm: 'une valeur immédiate #'
}

export const CONDITIONS: Record<string, number> = {
  T: 0, RA: 0, F: 1, SR: 1, HI: 2, LS: 3, CC: 4, HS: 4, CS: 5, LO: 5, NE: 6, EQ: 7,
  VC: 8, VS: 9, PL: 10, MI: 11, GE: 12, LT: 13, GT: 14, LE: 15
}

/** Taille en octets d'après le suffixe ; `defaut` si absent. */
function octetsTaille(t: Taille | undefined, defaut: 1 | 2 | 4 = 2): 1 | 2 | 4 {
  if (t === 'B' || t === 'S') return 1
  if (t === 'L') return 4
  if (t === 'W') return 2
  return defaut
}
const champTaille = (n: 1 | 2 | 4): number => (n === 1 ? 0 : n === 2 ? 1 : 2)

interface Ea {
  mode: number
  reg: number
}

function modeDe(op: Operande): Mode | null {
  switch (op.m) {
    case 'Dn':
    case 'An':
    case 'ind':
    case 'postinc':
    case 'predec':
    case 'd16An':
    case 'd8AnXn':
    case 'd16PC':
    case 'd8PCXn':
    case 'imm':
      return op.m
    case 'abs':
      return op.taille === 'W' ? 'absW' : 'absL'
    default:
      return null
  }
}

export class Encodeur {
  constructor(
    private readonly ctx: ContexteEncodage,
    readonly out: Sortie,
    private readonly nom: string
  ) {}

  erreurMode(op: Operande, champ: Champ): never {
    const mode = modeDe(op)
    const quoi = mode ? NOM_MODE[mode] : op.m === 'liste' ? 'une liste de registres' : op.m
    throw new AsmErreur(`${this.nom} n'accepte pas ${quoi} à cet endroit.`, champ.col, champ.texte.length)
  }

  val(champ: Champ): Valeur {
    return this.ctx.evaluer(champ)
  }

  verifierPlage(v: Valeur, min: number, max: number, champ: Champ, quoi: string): void {
    if (v.inconnu) return
    if (v.v < min || v.v > max) {
      throw new AsmErreur(`${quoi} hors limites : ${v.v} (permis : ${min} à ${max}).`, champ.col, champ.texte.length)
    }
  }

  private verifierMot(v: Valeur, champ: Champ): void {
    if (this.ctx.relogeable && v.reloc !== 0 && !v.inconnu) {
      throw new AsmErreur(
        'Une adresse du programme ne tient pas sur 16 bits dans un .PRG relogeable : utilise un mode relatif au PC ou une adresse .L.',
        champ.col,
        champ.texte.length
      )
    }
  }

  private extensionIndex(d: Champ | null, x: Index, base: number, relatifPC: boolean, champ: Champ): void {
    let disp = 0
    if (d) {
      const v = this.val(d)
      disp = relatifPC && !v.inconnu ? v.v - base : v.v
      if (!v.inconnu) this.verifierPlage({ ...v, v: disp }, -128, 127, d, 'Déplacement (8 bits)')
      if (!relatifPC) this.verifierMot(v, d)
    }
    this.out.mot((x.a ? 0x8000 : 0) | (x.r << 12) | (x.long ? 0x800 : 0) | (disp & 0xff))
    void champ
  }

  /**
   * Encode un mode d'adressage et ajoute ses mots d'extension. `taille` sert aux valeurs
   * immédiates. Vérifie que le mode fait partie de `permis`.
   */
  ea(op: Operande, champ: Champ, taille: 1 | 2 | 4, permis: Mode[]): Ea {
    const mode = modeDe(op)
    if (!mode || !permis.includes(mode)) this.erreurMode(op, champ)
    const adresseExtension = this.ctx.pc + this.out.octets.length
    switch (op.m) {
      case 'Dn':
        return { mode: 0, reg: op.r }
      case 'An':
        return { mode: 1, reg: op.r }
      case 'ind':
        return { mode: 2, reg: op.r }
      case 'postinc':
        return { mode: 3, reg: op.r }
      case 'predec':
        return { mode: 4, reg: op.r }
      case 'd16An': {
        const v = this.val(op.d)
        this.verifierPlage(v, -32768, 32767, op.d, 'Déplacement (16 bits)')
        this.verifierMot(v, op.d)
        this.out.mot(v.v & 0xffff)
        return { mode: 5, reg: op.r }
      }
      case 'd8AnXn':
        this.extensionIndex(op.d, op.x, adresseExtension, false, champ)
        return { mode: 6, reg: op.r }
      case 'abs': {
        const v = this.val(op.adr)
        if (op.taille === 'W') {
          if (!v.inconnu && (v.v < -32768 || v.v > 32767)) {
            throw new AsmErreur(
              `Adresse courte (.W) hors limites : $${(v.v >>> 0).toString(16).toUpperCase()} (permis : $0000-$7FFF et $FFFF8000-$FFFFFFFF).`,
              op.adr.col,
              op.adr.texte.length
            )
          }
          this.verifierMot(v, op.adr)
          this.out.mot(v.v & 0xffff)
          return { mode: 7, reg: 0 }
        }
        this.out.long(v.v, v.reloc === 1 && !v.inconnu)
        return { mode: 7, reg: 1 }
      }
      case 'd16PC': {
        const v = this.val(op.d)
        const disp = v.inconnu ? 0 : v.v - adresseExtension
        if (!v.inconnu) this.verifierPlage({ ...v, v: disp }, -32768, 32767, op.d, 'Déplacement relatif au PC (16 bits)')
        this.out.mot(disp & 0xffff)
        return { mode: 7, reg: 2 }
      }
      case 'd8PCXn':
        this.extensionIndex(op.d, op.x, adresseExtension, true, champ)
        return { mode: 7, reg: 3 }
      case 'imm': {
        const v = this.val(op.val)
        if (taille === 1) {
          this.verifierPlage(v, -128, 255, op.val, 'Valeur immédiate (.B)')
          this.verifierMot(v, op.val)
          this.out.mot(v.v & 0xff)
        } else if (taille === 2) {
          this.verifierPlage(v, -32768, 65535, op.val, 'Valeur immédiate (.W)')
          this.verifierMot(v, op.val)
          this.out.mot(v.v & 0xffff)
        } else {
          this.out.long(v.v, v.reloc === 1 && !v.inconnu)
        }
        return { mode: 7, reg: 4 }
      }
    }
    this.erreurMode(op, champ)
  }

  /** Cible d'un branchement : déplacement par rapport à `base`. */
  cible(op: Operande, champ: Champ, base: number): { disp: number; inconnu: boolean } {
    if (op.m !== 'abs' || op.taille !== null) {
      throw new AsmErreur(`${this.nom} attend une étiquette (la destination du saut).`, champ.col, champ.texte.length)
    }
    const v = this.val(op.adr)
    return { disp: v.inconnu ? 0 : v.v - base, inconnu: v.inconnu }
  }
}

const bits = (ea: Ea): number => (ea.mode << 3) | ea.reg

/** Numéro de registre d'un opérande qui en a un (Dn, An, (An)…). */
const rg = (o: Operande): number => ('r' in o ? o.r : 0)

/** Taille interdite : message clair. */
function tailleInterdite(nom: string, t: Taille | undefined, mnemo: Champ): never {
  throw new AsmErreur(`La taille .${t} n'existe pas pour ${nom}.`, mnemo.col, mnemo.texte.length + 2)
}

function exigerNombre(champs: Champ[], n: number, nom: string, mnemo: Champ): void {
  if (champs.length !== n) {
    const attendu = n === 0 ? "pas d'opérande" : n === 1 ? 'un opérande' : `${n} opérandes`
    const position = champs[n]?.col ?? mnemo.col
    throw new AsmErreur(`${nom} attend ${attendu}.`, position, champs[n]?.texte.length ?? mnemo.texte.length)
  }
}

export const MNEMONIQUES = new Set<string>([
  'ABCD', 'ADD', 'ADDA', 'ADDI', 'ADDQ', 'ADDX', 'AND', 'ANDI', 'ASL', 'ASR', 'BCHG', 'BCLR', 'BSET', 'BTST',
  'CHK', 'CLR', 'CMP', 'CMPA', 'CMPI', 'CMPM', 'DIVS', 'DIVU', 'EOR', 'EORI', 'EXG', 'EXT', 'ILLEGAL', 'JMP', 'JSR',
  'LEA', 'LINK', 'LSL', 'LSR', 'MOVE', 'MOVEA', 'MOVEM', 'MOVEP', 'MOVEQ', 'MULS', 'MULU', 'NBCD', 'NEG', 'NEGX',
  'NOP', 'NOT', 'OR', 'ORI', 'PEA', 'RESET', 'ROL', 'ROR', 'ROXL', 'ROXR', 'RTE', 'RTR', 'RTS', 'SBCD', 'STOP',
  'SUB', 'SUBA', 'SUBI', 'SUBQ', 'SUBX', 'SWAP', 'TAS', 'TRAP', 'TRAPV', 'TST', 'UNLK',
  ...Object.keys(CONDITIONS).filter((c) => c !== 'T' && c !== 'F').map((c) => 'B' + c),
  ...Object.keys(CONDITIONS).map((c) => 'DB' + c),
  'DBRA',
  ...Object.keys(CONDITIONS).filter((c) => c !== 'RA' && c !== 'SR').map((c) => 'S' + c)
])

/**
 * Encode une instruction. `mnemo` est en majuscules, sans taille. Renvoie les octets produits
 * (dans `out`).
 */
export function encoderInstruction(
  mnemo: Champ,
  taille: Taille | undefined,
  champs: Champ[],
  ctx: ContexteEncodage,
  out: Sortie
): void {
  const nom = mnemo.texte
  const e = new Encodeur(ctx, out, nom)
  const ops = champs.map((c) => analyserOperande(c))
  const op = (i: number): Operande => ops[i]
  const ch = (i: number): Champ => champs[i]
  const n = octetsTaille(taille)
  const sz = champTaille(n)

  // --- Sans opérande ------------------------------------------------------------
  const simples: Record<string, number> = { NOP: 0x4e71, RTS: 0x4e75, RTE: 0x4e73, RTR: 0x4e77, RESET: 0x4e70, TRAPV: 0x4e76, ILLEGAL: 0x4afc }
  if (nom in simples) {
    // Comme Devpac : après une instruction sans opérande, le reste de la ligne est un commentaire
    out.mot(simples[nom])
    return
  }

  // --- Branchements ----------------------------------------------------------------
  if (nom.length >= 3 && nom[0] === 'B' && CONDITIONS[nom.slice(1)] !== undefined && nom !== 'BT' && nom !== 'BF') {
    exigerNombre(champs, 1, nom, mnemo)
    const cond = CONDITIONS[nom.slice(1)]
    const base = ctx.pc + 2
    const { disp, inconnu } = e.cible(op(0), ch(0), base)
    if (taille === 'S' || taille === 'B') {
      if (!inconnu && (disp < -128 || disp > 127 || disp === 0)) {
        throw new AsmErreur(
          disp === 0
            ? `Un ${nom}.S ne peut pas sauter à l'instruction juste après lui (déplacement nul) : enlève le .S.`
            : `Saut trop long pour la forme courte .S (${disp} octets, permis : -128 à +127) : enlève le .S.`,
          ch(0).col,
          ch(0).texte.length
        )
      }
      out.mot(0x6000 | (cond << 8) | (disp & 0xff))
      return
    }
    if (taille === 'L') tailleInterdite(nom, taille, mnemo)
    if (!inconnu && (disp < -32768 || disp > 32767)) {
      throw new AsmErreur(`Saut trop long (${disp} octets, permis : ±32 Ko).`, ch(0).col, ch(0).texte.length)
    }
    out.mot(0x6000 | (cond << 8))
    out.mot(disp & 0xffff)
    return
  }

  if (nom.startsWith('DB') && (CONDITIONS[nom.slice(2)] !== undefined || nom === 'DBRA')) {
    exigerNombre(champs, 2, nom, mnemo)
    const cond = nom === 'DBRA' ? 1 : CONDITIONS[nom.slice(2)]
    if (op(0).m !== 'Dn') e.erreurMode(op(0), ch(0))
    out.mot(0x50c8 | (cond << 8) | rg(op(0)))
    const { disp, inconnu } = e.cible(op(1), ch(1), ctx.pc + 2)
    if (!inconnu && (disp < -32768 || disp > 32767)) throw new AsmErreur('Saut trop long pour DBcc.', ch(1).col, ch(1).texte.length)
    out.mot(disp & 0xffff)
    return
  }

  if (nom.length >= 2 && nom[0] === 'S' && CONDITIONS[nom.slice(1)] !== undefined && nom !== 'SRA' && nom !== 'SSR') {
    exigerNombre(champs, 1, nom, mnemo)
    if (taille && taille !== 'B') tailleInterdite(nom, taille, mnemo)
    const debut = out.octets.length
    out.mot(0)
    const mot = 0x50c0 | (CONDITIONS[nom.slice(1)] << 8) | bits(e.ea(op(0), ch(0), 1, DONNEE_MOD))
    out.octets[debut] = mot >>> 8
    out.octets[debut + 1] = mot & 0xff
    return
  }

  // Les déplacements relatifs au PC se calculent depuis l'adresse réelle des extensions : on
  // réserve donc la place du mot d'opération avant d'encoder les modes d'adressage.
  const avecMotPC = (calcul: () => number): void => {
    const debut = out.octets.length
    out.mot(0)
    const mot = calcul()
    out.octets[debut] = (mot >>> 8) & 0xff
    out.octets[debut + 1] = mot & 0xff
  }

  switch (nom) {
    case 'MOVE': {
      exigerNombre(champs, 2, nom, mnemo)
      const src = op(0)
      const dst = op(1)
      // SR et CCR ne se transfèrent qu'en mot, USP qu'en long
      if ((dst.m === 'CCR' || dst.m === 'SR' || src.m === 'SR') && taille && taille !== 'W') tailleInterdite(nom, taille, mnemo)
      if ((dst.m === 'USP' || src.m === 'USP') && taille && taille !== 'L') tailleInterdite(nom, taille, mnemo)
      if (dst.m === 'CCR') return avecMotPC(() => 0x44c0 | bits(e.ea(src, ch(0), 2, DONNEE)))
      if (dst.m === 'SR') return avecMotPC(() => 0x46c0 | bits(e.ea(src, ch(0), 2, DONNEE)))
      if (src.m === 'SR') return avecMotPC(() => 0x40c0 | bits(e.ea(dst, ch(1), 2, DONNEE_MOD)))
      if (src.m === 'USP') {
        if (dst.m !== 'An') e.erreurMode(dst, ch(1))
        return out.mot(0x4e68 | rg(dst))
      }
      if (dst.m === 'USP') {
        if (src.m !== 'An') e.erreurMode(src, ch(0))
        return out.mot(0x4e60 | rg(src))
      }
      if (dst.m === 'An') return encoderMovea(e, src, ch(0), dst.r, taille, mnemo, out)
      const codeTaille = n === 1 ? 1 : n === 2 ? 3 : 2
      return avecMotPC(() => {
        const s = e.ea(src, ch(0), n, n === 1 ? DONNEE : TOUT)
        const d = e.ea(dst, ch(1), n, DONNEE_MOD)
        return (codeTaille << 12) | (d.reg << 9) | (d.mode << 6) | bits(s)
      })
    }
    case 'MOVEA': {
      exigerNombre(champs, 2, nom, mnemo)
      const special = (o: Operande): boolean => o.m === 'SR' || o.m === 'CCR' || o.m === 'USP'
      if (special(op(0))) e.erreurMode(op(0), ch(0))
      if (special(op(1))) e.erreurMode(op(1), ch(1))
      if (op(1).m !== 'An') {
        // Comme vasm/Devpac : MOVEA vers autre chose qu'un registre d'adresse devient un MOVE
        ctx.avertir("MOVEA n'écrit que dans un registre d'adresse : assemblé comme un MOVE.", mnemo.col, mnemo.texte.length)
        return encoderInstruction({ ...mnemo, texte: 'MOVE' }, taille, champs, ctx, out)
      }
      return encoderMovea(e, op(0), ch(0), rg(op(1)), taille, mnemo, out)
    }
    case 'MOVEQ': {
      exigerNombre(champs, 2, nom, mnemo)
      if (op(0).m !== 'imm') e.erreurMode(op(0), ch(0))
      if (op(1).m !== 'Dn') e.erreurMode(op(1), ch(1))
      const valChamp = (op(0) as { val: Champ }).val
      const v = e.val(valChamp)
      if (!v.inconnu && v.v >= 128 && v.v <= 255) {
        ctx.avertir(`MOVEQ prend une valeur signée : ${v.v} sera chargé comme ${v.v - 256}.`, valChamp.col, valChamp.texte.length)
      } else e.verifierPlage(v, -128, 127, valChamp, 'Valeur de MOVEQ')
      return out.mot(0x7000 | (rg(op(1)) << 9) | (v.v & 0xff))
    }
    case 'MOVEM': {
      exigerNombre(champs, 2, nom, mnemo)
      if (n === 1) tailleInterdite(nom, taille, mnemo)
      // Comme Devpac, la liste peut aussi être un masque calculé : #valeur ou expression sans taille
      const estRegistres = (o: Operande): boolean => o.m === 'liste' || o.m === 'Dn' || o.m === 'An'
      const estMasque = (o: Operande): boolean => estRegistres(o) || o.m === 'imm' || (o.m === 'abs' && o.taille === null)
      const versMemoire =
        estRegistres(op(0)) ? !estRegistres(op(1)) : !estRegistres(op(1)) && op(1).m !== 'imm' && estMasque(op(0))
      const masqueDe = (o: Operande, c: Champ): number => {
        if (o.m === 'liste') return o.masque
        if (o.m === 'Dn') return 1 << o.r
        if (o.m === 'An') return 1 << (8 + o.r)
        if (o.m === 'imm' || (o.m === 'abs' && o.taille === null)) {
          const champ = o.m === 'imm' ? o.val : o.adr
          const v = e.val(champ)
          e.verifierPlage(v, 0, 0xffff, champ, 'Masque de registres')
          return v.v & 0xffff
        }
        throw new AsmErreur('MOVEM attend une liste de registres (par exemple D0-D3/A0).', c.col, c.texte.length)
      }
      const base = n === 2 ? 0 : 0x40
      if (versMemoire) {
        let masque = masqueDe(op(0), ch(0))
        // Un masque donné avec # est pris tel quel, comme dans vasm
        if (op(1).m === 'predec' && op(0).m !== 'imm') {
          let inverse = 0
          for (let i = 0; i < 16; i++) if (masque & (1 << i)) inverse |= 1 << (15 - i)
          masque = inverse
        }
        return avecMotPC(() => {
          out.mot(masque)
          const d = e.ea(op(1), ch(1), n, [...CTRL_MOD, 'predec'])
          return 0x4880 | base | bits(d)
        })
      }
      const masque = masqueDe(op(1), ch(1))
      return avecMotPC(() => {
        out.mot(masque)
        const s = e.ea(op(0), ch(0), n, [...CONTROLE, 'postinc'])
        return 0x4c80 | base | bits(s)
      })
    }
    case 'MOVEP': {
      exigerNombre(champs, 2, nom, mnemo)
      if (n === 1) tailleInterdite(nom, taille, mnemo)
      const long = n === 4 ? 0x40 : 0
      const memoire = (o: Operande, c: Champ): { r: number; d: number } => {
        if (o.m === 'ind') return { r: o.r, d: 0 }
        if (o.m === 'd16An') {
          const v = e.val(o.d)
          e.verifierPlage(v, -32768, 32767, o.d, 'Déplacement (16 bits)')
          return { r: o.r, d: v.v }
        }
        throw new AsmErreur('MOVEP attend un opérande de la forme d(An).', c.col, c.texte.length)
      }
      if (op(0).m === 'Dn') {
        const m = memoire(op(1), ch(1))
        out.mot(0x0188 | long | (rg(op(0)) << 9) | m.r)
        return out.mot(m.d & 0xffff)
      }
      if (op(1).m !== 'Dn') e.erreurMode(op(1), ch(1))
      const m = memoire(op(0), ch(0))
      out.mot(0x0108 | long | (rg(op(1)) << 9) | m.r)
      return out.mot(m.d & 0xffff)
    }
    case 'LEA': {
      exigerNombre(champs, 2, nom, mnemo)
      if (taille && taille !== 'L') tailleInterdite(nom, taille, mnemo)
      if (op(1).m !== 'An') e.erreurMode(op(1), ch(1))
      return avecMotPC(() => 0x41c0 | (rg(op(1)) << 9) | bits(e.ea(op(0), ch(0), 4, CONTROLE)))
    }
    case 'PEA':
      exigerNombre(champs, 1, nom, mnemo)
      if (taille && taille !== 'L') tailleInterdite(nom, taille, mnemo)
      return avecMotPC(() => 0x4840 | bits(e.ea(op(0), ch(0), 4, CONTROLE)))
    case 'JMP':
    case 'JSR':
      exigerNombre(champs, 1, nom, mnemo)
      return avecMotPC(() => (nom === 'JMP' ? 0x4ec0 : 0x4e80) | bits(e.ea(op(0), ch(0), 4, CONTROLE)))
    case 'CLR':
    case 'NEG':
    case 'NEGX':
    case 'NOT':
    case 'TST': {
      exigerNombre(champs, 1, nom, mnemo)
      const base = { CLR: 0x4200, NEG: 0x4400, NEGX: 0x4000, NOT: 0x4600, TST: 0x4a00 }[nom]
      return avecMotPC(() => base | (sz << 6) | bits(e.ea(op(0), ch(0), n, DONNEE_MOD)))
    }
    case 'NBCD':
    case 'TAS':
      exigerNombre(champs, 1, nom, mnemo)
      if (taille && taille !== 'B') tailleInterdite(nom, taille, mnemo)
      return avecMotPC(() => (nom === 'NBCD' ? 0x4800 : 0x4ac0) | bits(e.ea(op(0), ch(0), 1, DONNEE_MOD)))
    case 'SWAP':
    case 'EXT':
    case 'UNLK': {
      exigerNombre(champs, 1, nom, mnemo)
      const attendu = nom === 'UNLK' ? 'An' : 'Dn'
      if (op(0).m !== attendu) e.erreurMode(op(0), ch(0))
      const r = rg(op(0))
      if (nom === 'SWAP') {
        if (taille && taille !== 'W') tailleInterdite(nom, taille, mnemo)
        return out.mot(0x4840 | r)
      }
      if (nom === 'UNLK') return out.mot(0x4e58 | r)
      if (n === 1) tailleInterdite(nom, taille, mnemo)
      return out.mot((n === 4 ? 0x48c0 : 0x4880) | r)
    }
    case 'LINK': {
      exigerNombre(champs, 2, nom, mnemo)
      if (taille && taille !== 'W') tailleInterdite(nom, taille, mnemo)
      if (op(0).m !== 'An') e.erreurMode(op(0), ch(0))
      if (op(1).m !== 'imm') e.erreurMode(op(1), ch(1))
      const c = (op(1) as { val: Champ }).val
      const v = e.val(c)
      e.verifierPlage(v, -32768, 32767, c, 'Déplacement de LINK')
      out.mot(0x4e50 | rg(op(0)))
      return out.mot(v.v & 0xffff)
    }
    case 'TRAP': {
      exigerNombre(champs, 1, nom, mnemo)
      if (op(0).m !== 'imm') e.erreurMode(op(0), ch(0))
      const c = (op(0) as { val: Champ }).val
      const v = e.val(c)
      e.verifierPlage(v, 0, 15, c, 'Numéro de TRAP')
      return out.mot(0x4e40 | (v.v & 15))
    }
    case 'STOP': {
      exigerNombre(champs, 1, nom, mnemo)
      if (op(0).m !== 'imm') e.erreurMode(op(0), ch(0))
      out.mot(0x4e72)
      const c = (op(0) as { val: Champ }).val
      const v = e.val(c)
      e.verifierPlage(v, -32768, 65535, c, 'Valeur de STOP')
      return out.mot(v.v & 0xffff)
    }
    case 'EXG': {
      exigerNombre(champs, 2, nom, mnemo)
      if (taille && taille !== 'L') tailleInterdite(nom, taille, mnemo)
      const a = op(0)
      const b = op(1)
      if ((a.m !== 'Dn' && a.m !== 'An') || (b.m !== 'Dn' && b.m !== 'An')) e.erreurMode(a.m === 'Dn' || a.m === 'An' ? b : a, a.m === 'Dn' || a.m === 'An' ? ch(1) : ch(0))
      if (a.m === 'Dn' && b.m === 'Dn') return out.mot(0xc140 | (a.r << 9) | b.r)
      if (a.m === 'An' && b.m === 'An') return out.mot(0xc148 | (a.r << 9) | b.r)
      const d = a.m === 'Dn' ? a : b
      const ad = a.m === 'An' ? a : b
      return out.mot(0xc188 | (rg(d) << 9) | rg(ad))
    }
    case 'CHK':
    case 'MULU':
    case 'MULS':
    case 'DIVU':
    case 'DIVS': {
      exigerNombre(champs, 2, nom, mnemo)
      if (taille && taille !== 'W') tailleInterdite(nom, taille, mnemo)
      if (op(1).m !== 'Dn') e.erreurMode(op(1), ch(1))
      const base = { CHK: 0x4180, MULU: 0xc0c0, MULS: 0xc1c0, DIVU: 0x80c0, DIVS: 0x81c0 }[nom]
      return avecMotPC(() => base | (rg(op(1)) << 9) | bits(e.ea(op(0), ch(0), 2, DONNEE)))
    }
    case 'ABCD':
    case 'SBCD':
    case 'ADDX':
    case 'SUBX': {
      exigerNombre(champs, 2, nom, mnemo)
      const base = { ABCD: 0xc100, SBCD: 0x8100, ADDX: 0xd100, SUBX: 0x9100 }[nom]
      const tailleBits = nom === 'ABCD' || nom === 'SBCD' ? 0 : sz << 6
      if ((nom === 'ABCD' || nom === 'SBCD') && taille && taille !== 'B') tailleInterdite(nom, taille, mnemo)
      const a = op(0)
      const b = op(1)
      if (a.m === 'Dn' && b.m === 'Dn') return out.mot(base | tailleBits | (b.r << 9) | a.r)
      if (a.m === 'predec' && b.m === 'predec') return out.mot(base | tailleBits | 0x8 | (b.r << 9) | a.r)
      throw new AsmErreur(`${nom} s'écrit Dy,Dx ou -(Ay),-(Ax).`, champs[0].col, champs[0].texte.length)
    }
    case 'CMPM': {
      exigerNombre(champs, 2, nom, mnemo)
      const a = op(0)
      const b = op(1)
      if (a.m !== 'postinc' || b.m !== 'postinc') throw new AsmErreur('CMPM s’écrit (Ay)+,(Ax)+.', champs[0].col, champs[0].texte.length)
      return out.mot(0xb108 | (sz << 6) | (b.r << 9) | a.r)
    }
    case 'ADDQ':
    case 'SUBQ': {
      exigerNombre(champs, 2, nom, mnemo)
      if (op(0).m !== 'imm') e.erreurMode(op(0), ch(0))
      const c = (op(0) as { val: Champ }).val
      const v = e.val(c)
      e.verifierPlage(v, 1, 8, c, `Valeur de ${nom}`)
      if (n === 1 && op(1).m === 'An') throw new AsmErreur(`${nom}.B est impossible sur un registre d'adresse.`, ch(1).col, ch(1).texte.length)
      return avecMotPC(() => (nom === 'ADDQ' ? 0x5000 : 0x5100) | ((v.v & 7) << 9) | (sz << 6) | bits(e.ea(op(1), ch(1), n, MODIFIABLE)))
    }
    case 'ADDA':
    case 'SUBA':
    case 'CMPA': {
      exigerNombre(champs, 2, nom, mnemo)
      if (op(1).m !== 'An') e.erreurMode(op(1), ch(1))
      return encoderAdresse(e, nom, op(0), ch(0), rg(op(1)), taille, mnemo)
    }
    case 'ADDI':
    case 'SUBI':
    case 'CMPI':
    case 'ANDI':
    case 'ORI':
    case 'EORI':
      exigerNombre(champs, 2, nom, mnemo)
      return encoderImmediat(e, nom, op(0), ch(0), op(1), ch(1), taille, mnemo, out)
    case 'ADD':
    case 'SUB': {
      exigerNombre(champs, 2, nom, mnemo)
      const src = op(0)
      const dst = op(1)
      const opc = nom === 'ADD' ? 0xd000 : 0x9000
      if (dst.m === 'An') return encoderAdresse(e, nom === 'ADD' ? 'ADDA' : 'SUBA', src, ch(0), dst.r, taille, mnemo)
      if (dst.m === 'Dn') {
        if (n === 1 && src.m === 'An') e.erreurMode(src, ch(0))
        return avecMotPC(() => opc | (dst.r << 9) | (sz << 6) | bits(e.ea(src, ch(0), n, TOUT)))
      }
      if (src.m === 'imm') return encoderImmediat(e, nom === 'ADD' ? 'ADDI' : 'SUBI', src, ch(0), dst, ch(1), taille, mnemo, out)
      if (src.m !== 'Dn') e.erreurMode(src, ch(0))
      return avecMotPC(() => opc | 0x100 | (rg(src) << 9) | (sz << 6) | bits(e.ea(dst, ch(1), n, MEM_MOD)))
    }
    case 'AND':
    case 'OR': {
      exigerNombre(champs, 2, nom, mnemo)
      const src = op(0)
      const dst = op(1)
      const opc = nom === 'AND' ? 0xc000 : 0x8000
      if (dst.m === 'CCR' || dst.m === 'SR') return encoderImmediat(e, nom + 'I', src, ch(0), dst, ch(1), taille, mnemo, out)
      if (dst.m === 'Dn') return avecMotPC(() => opc | (dst.r << 9) | (sz << 6) | bits(e.ea(src, ch(0), n, DONNEE)))
      if (src.m === 'imm') return encoderImmediat(e, nom + 'I', src, ch(0), dst, ch(1), taille, mnemo, out)
      if (src.m !== 'Dn') e.erreurMode(src, ch(0))
      return avecMotPC(() => opc | 0x100 | (rg(src) << 9) | (sz << 6) | bits(e.ea(dst, ch(1), n, MEM_MOD)))
    }
    case 'EOR': {
      exigerNombre(champs, 2, nom, mnemo)
      const src = op(0)
      const dst = op(1)
      if (src.m === 'imm') return encoderImmediat(e, 'EORI', src, ch(0), dst, ch(1), taille, mnemo, out)
      if (src.m !== 'Dn') e.erreurMode(src, ch(0))
      return avecMotPC(() => 0xb100 | (rg(src) << 9) | (sz << 6) | bits(e.ea(dst, ch(1), n, DONNEE_MOD)))
    }
    case 'CMP': {
      exigerNombre(champs, 2, nom, mnemo)
      const src = op(0)
      const dst = op(1)
      if (dst.m === 'An') return encoderAdresse(e, 'CMPA', src, ch(0), dst.r, taille, mnemo)
      if (src.m === 'postinc' && dst.m === 'postinc') return out.mot(0xb108 | (sz << 6) | (dst.r << 9) | src.r)
      if (dst.m === 'Dn') {
        if (n === 1 && src.m === 'An') e.erreurMode(src, ch(0))
        return avecMotPC(() => 0xb000 | (dst.r << 9) | (sz << 6) | bits(e.ea(src, ch(0), n, TOUT)))
      }
      if (src.m === 'imm') return encoderImmediat(e, 'CMPI', src, ch(0), dst, ch(1), taille, mnemo, out)
      e.erreurMode(dst, ch(1))
      return
    }
    case 'BTST':
    case 'BCHG':
    case 'BCLR':
    case 'BSET': {
      exigerNombre(champs, 2, nom, mnemo)
      const type = { BTST: 0, BCHG: 1, BCLR: 2, BSET: 3 }[nom]
      const dst = op(1)
      const permis: Mode[] = nom === 'BTST' ? sans(DONNEE, 'imm') : DONNEE_MOD
      // Sur un registre de données on agit sur un long, en mémoire sur un octet
      if (taille && taille !== (dst.m === 'Dn' ? 'L' : 'B')) tailleInterdite(nom + (dst.m === 'Dn' ? ' sur un registre' : ' en mémoire'), taille, mnemo)
      if (op(0).m === 'Dn') {
        const r = rg(op(0))
        return avecMotPC(() => 0x0100 | (r << 9) | (type << 6) | bits(e.ea(dst, ch(1), 1, nom === 'BTST' ? DONNEE : DONNEE_MOD)))
      }
      if (op(0).m !== 'imm') e.erreurMode(op(0), ch(0))
      const c = (op(0) as { val: Champ }).val
      const v = e.val(c)
      e.verifierPlage(v, 0, 255, c, 'Numéro de bit')
      return avecMotPC(() => {
        out.mot(v.v & 0xff)
        return 0x0800 | (type << 6) | bits(e.ea(dst, ch(1), 1, permis))
      })
    }
    case 'ASL':
    case 'ASR':
    case 'LSL':
    case 'LSR':
    case 'ROL':
    case 'ROR':
    case 'ROXL':
    case 'ROXR': {
      const type = nom.startsWith('ROX') ? 2 : nom.startsWith('RO') ? 3 : nom.startsWith('LS') ? 1 : 0
      const gauche = nom.endsWith('L') ? 0x100 : 0
      if (champs.length === 1) {
        if (op(0).m === 'Dn') return out.mot(0xe000 | (1 << 9) | gauche | (sz << 6) | (type << 3) | rg(op(0)))
        if (taille && taille !== 'W') tailleInterdite(nom + ' en mémoire', taille, mnemo)
        return avecMotPC(() => 0xe0c0 | (type << 9) | gauche | bits(e.ea(op(0), ch(0), 2, MEM_MOD)))
      }
      exigerNombre(champs, 2, nom, mnemo)
      if (op(1).m !== 'Dn') e.erreurMode(op(1), ch(1))
      const r = rg(op(1))
      if (op(0).m === 'Dn') return out.mot(0xe020 | (rg(op(0)) << 9) | gauche | (sz << 6) | (type << 3) | r)
      if (op(0).m !== 'imm') e.erreurMode(op(0), ch(0))
      const c = (op(0) as { val: Champ }).val
      const v = e.val(c)
      e.verifierPlage(v, 1, 8, c, 'Nombre de décalages')
      return out.mot(0xe000 | ((v.v & 7) << 9) | gauche | (sz << 6) | (type << 3) | r)
    }
  }
  throw new AsmErreur(`« ${nom} » n'est pas une instruction connue.`, mnemo.col, mnemo.texte.length)
}

function encoderMovea(e: Encodeur, src: Operande, champ: Champ, r: number, taille: Taille | undefined, mnemo: Champ, out: Sortie): void {
  const n = octetsTaille(taille)
  if (n === 1) throw new AsmErreur("Ce suffixe de taille n'est pas permis ici : .B est interdit avec un registre d'adresse (A0-A7).", mnemo.col, mnemo.texte.length + 2)
  const debut = out.octets.length
  out.mot(0)
  const s = e.ea(src, champ, n, TOUT)
  const mot = ((n === 2 ? 3 : 2) << 12) | (r << 9) | (1 << 6) | bits(s)
  out.octets[debut] = mot >>> 8
  out.octets[debut + 1] = mot & 0xff
}

function encoderAdresse(e: Encodeur, nom: string, src: Operande, champ: Champ, r: number, taille: Taille | undefined, mnemo: Champ): void {
  const n = octetsTaille(taille)
  if (n === 1) throw new AsmErreur(`${nom}.B n'existe pas : un registre d'adresse se manipule en .W ou .L.`, mnemo.col, mnemo.texte.length + 2)
  const base = { ADDA: 0xd0c0, SUBA: 0x90c0, CMPA: 0xb0c0 }[nom]!
  const out = e.out
  const debut = out.octets.length
  out.mot(0)
  const s = e.ea(src, champ, n, TOUT)
  const mot = base | (n === 4 ? 0x100 : 0) | (r << 9) | bits(s)
  out.octets[debut] = mot >>> 8
  out.octets[debut + 1] = mot & 0xff
}

function encoderImmediat(
  e: Encodeur,
  nom: string,
  src: Operande,
  champSrc: Champ,
  dst: Operande,
  champDst: Champ,
  taille: Taille | undefined,
  mnemo: Champ,
  out: Sortie
): void {
  if (src.m !== 'imm') e.erreurMode(src, champSrc)
  const opc = { ORI: 0x0000, ANDI: 0x0200, SUBI: 0x0400, ADDI: 0x0600, EORI: 0x0a00, CMPI: 0x0c00 }[nom]
  if (opc === undefined) throw new AsmErreur(`${nom} n'existe pas.`, mnemo.col, mnemo.texte.length)
  if (dst.m === 'CCR' || dst.m === 'SR') {
    if (nom !== 'ORI' && nom !== 'ANDI' && nom !== 'EORI') e.erreurMode(dst, champDst)
    const versSR = dst.m === 'SR'
    if (taille && taille !== (versSR ? 'W' : 'B')) tailleInterdite(`${nom} vers ${dst.m}`, taille, mnemo)
    out.mot(opc | (versSR ? 0x7c : 0x3c))
    const v = e.val(src.val)
    e.verifierPlage(v, versSR ? -32768 : -128, versSR ? 65535 : 255, src.val, 'Valeur immédiate')
    out.mot(versSR ? v.v & 0xffff : v.v & 0xff)
    return
  }
  const n = octetsTaille(taille)
  const sz = champTaille(n)
  const debut = out.octets.length
  out.mot(0)
  e.ea(src, champSrc, n, ['imm'])
  const d = e.ea(dst, champDst, n, DONNEE_MOD)
  const mot = opc | (sz << 6) | bits(d)
  out.octets[debut] = mot >>> 8
  out.octets[debut + 1] = mot & 0xff
}
