/**
 * Désassembleur 68000, en syntaxe Devpac. Deux usages :
 * - `desassemblerInstruction` : une instruction à une adresse (vue « Désassemblage » du débogueur) ;
 * - `desassembler` / `sourceReassemblable` : un bloc de code (ou un .PRG lu par `lirePrg`) rendu
 *   en source qui se réassemble à l'identique, avec des étiquettes pour les cibles de saut.
 *
 * Code pur, sans dépendance : réutilisable hors de 68k Trainer (outil en ligne de commande :
 * src/asm/cli/desasm.ts).
 */

export interface InstructionDesassemblee {
  adresse: number
  /** Longueur en octets (2 à 10). */
  taille: number
  mnemo: string
  operandes: string
  /** Adresses citées par l'instruction (sauts, (PC), adresses absolues), pour les étiquettes. */
  references: number[]
  /** Positions (depuis le début de l'instruction) des mots longs absolus. */
  longs: number[]
  /** Code qui n'est pas une instruction valide du 68000 (rendu en DC.W). */
  donnee?: boolean
}

export interface OptionsTexte {
  /** Nom à afficher pour une adresse (étiquette), sinon l'adresse en hexadécimal. */
  nommer?: (adresse: number) => string | undefined
}

import { assembler } from './assembleur'
import type { PrgLu } from './prg'

const TAILLES = ['B', 'W', 'L'] as const
const COND = ['T', 'F', 'HI', 'LS', 'CC', 'CS', 'NE', 'EQ', 'VC', 'VS', 'PL', 'MI', 'GE', 'LT', 'GT', 'LE']

const h = (v: number, chiffres = 1): string => '$' + (v >>> 0).toString(16).toUpperCase().padStart(chiffres, '0')
/** Hexadécimal signé : -$2, $10. */
const hs = (v: number): string => (v < 0 ? '-' + h(-v) : h(v))
const sx8 = (v: number): number => ((v & 0xff) ^ 0x80) - 0x80
const sx16 = (v: number): number => ((v & 0xffff) ^ 0x8000) - 0x8000
const an = (r: number): string => (r === 7 ? 'SP' : `A${r}`)

class Lecteur {
  pos: number
  references: number[] = []
  longs: number[] = []
  constructor(
    private readonly lire16: (adresse: number) => number,
    readonly debut: number,
    private readonly opts: OptionsTexte
  ) {
    this.pos = debut + 2
  }
  mot(): number {
    const v = this.lire16(this.pos) & 0xffff
    this.pos += 2
    return v
  }
  long(): number {
    this.longs.push(this.pos - this.debut)
    const hi = this.mot()
    return ((hi << 16) | this.mot()) >>> 0
  }
  adresse(a: number, chiffres = 1): string {
    this.references.push(a >>> 0)
    return this.opts.nommer?.(a >>> 0) ?? h(a, chiffres)
  }
}

class Invalide extends Error {}

/** Texte d'un mode d'adressage ; `taille` sert aux valeurs immédiates (1, 2 ou 4 octets). */
function ea(l: Lecteur, mode: number, reg: number, taille: number): string {
  switch (mode) {
    case 0:
      return `D${reg}`
    case 1:
      return an(reg)
    case 2:
      return `(${an(reg)})`
    case 3:
      return `(${an(reg)})+`
    case 4:
      return `-(${an(reg)})`
    case 5:
      return `${hs(sx16(l.mot()))}(${an(reg)})`
    case 6:
      return indexe(l, an(reg), 0)
    case 7:
      switch (reg) {
        case 0: {
          // Adresse courte : étendue en signe ($8000 et plus = $FFFF8000 et plus)
          const v = sx16(l.mot())
          return v < 0 ? `${h(v >>> 0, 8)}.W` : `${h(v, 4)}.W`
        }
        case 1:
          return l.adresse(l.long(), 8)
        case 2: {
          const base = l.pos
          return `${l.adresse(base + sx16(l.mot()))}(PC)`
        }
        case 3:
          return indexe(l, 'PC', l.pos)
        case 4:
          if (taille === 4) return `#${h(l.long(), 1)}`
          if (taille === 2) return `#${h(l.mot())}`
          return `#${h(l.mot() & 0xff)}`
      }
  }
  throw new Invalide()
}

function indexe(l: Lecteur, base: string, pcBase: number): string {
  const ext = l.mot()
  if (ext & 0x0700) throw new Invalide() // format étendu : 68020 et plus
  const x = `${ext & 0x8000 ? an((ext >> 12) & 7) : `D${(ext >> 12) & 7}`}.${ext & 0x800 ? 'L' : 'W'}`
  const d = sx8(ext)
  if (base === 'PC') return `${l.adresse(pcBase + d)}(PC,${x})`
  return `${hs(d)}(${base},${x})`
}

/** Liste de registres de MOVEM (masque normal : bit 0 = D0 … bit 15 = A7). */
function listeRegistres(masque: number): string {
  const groupes: string[] = []
  for (const [lettre, decalage] of [['D', 0], ['A', 8]] as const) {
    let i = 0
    while (i < 8) {
      if (!(masque & (1 << (decalage + i)))) {
        i++
        continue
      }
      let j = i
      while (j + 1 < 8 && masque & (1 << (decalage + j + 1))) j++
      groupes.push(j === i ? `${lettre}${i}` : `${lettre}${i}-${lettre}${j}`)
      i = j + 1
    }
  }
  return groupes.join('/')
}

const BITS = ['BTST', 'BCHG', 'BCLR', 'BSET']
const IMMEDIATS: Record<number, string> = { 0x00: 'ORI', 0x02: 'ANDI', 0x04: 'SUBI', 0x06: 'ADDI', 0x0a: 'EORI', 0x0c: 'CMPI' }
const DECALAGES = ['AS', 'LS', 'ROX', 'RO']

function decoder(l: Lecteur, op: number): { mnemo: string; operandes: string } {
  const m = (mnemo: string, operandes = ''): { mnemo: string; operandes: string } => ({ mnemo, operandes })
  const mode = (op >> 3) & 7
  const reg = op & 7
  const r9 = (op >> 9) & 7
  const tailleChamp = (op >> 6) & 3
  const eaSrc = (taille: number): string => ea(l, mode, reg, taille)

  switch (op >>> 12) {
    case 0x0: {
      const ccrSr = { 0x003c: 'ORI', 0x007c: 'ORI', 0x023c: 'ANDI', 0x027c: 'ANDI', 0x0a3c: 'EORI', 0x0a7c: 'EORI' } as Record<number, string>
      if (ccrSr[op]) {
        const versSR = (op & 0x40) !== 0
        const v = l.mot()
        return m(`${ccrSr[op]}${versSR ? '' : '.B'}`, `#${h(versSR ? v : v & 0xff)},${versSR ? 'SR' : 'CCR'}`)
      }
      if ((op & 0xf138) === 0x0108) {
        const long = op & 0x40 ? 'L' : 'W'
        const d = hs(sx16(l.mot()))
        return op & 0x80 ? m(`MOVEP.${long}`, `D${r9},${d}(${an(reg)})`) : m(`MOVEP.${long}`, `${d}(${an(reg)}),D${r9}`)
      }
      if (op & 0x100) {
        if (mode === 1) throw new Invalide()
        const t = BITS[tailleChamp]
        return m(`${t}.${mode === 0 ? 'L' : 'B'}`, `D${r9},${eaSrc(1)}`)
      }
      if ((op & 0xff00) === 0x0800) {
        const bit = l.mot() & 0xff
        if (mode === 1) throw new Invalide()
        return m(`${BITS[tailleChamp]}.${mode === 0 ? 'L' : 'B'}`, `#${bit},${eaSrc(1)}`)
      }
      const nom = IMMEDIATS[op >> 8]
      if (!nom || tailleChamp === 3) throw new Invalide()
      const n = [1, 2, 4][tailleChamp]
      const imm = ea(l, 7, 4, n)
      return m(`${nom}.${TAILLES[tailleChamp]}`, `${imm},${eaSrc(n)}`)
    }
    case 0x1:
    case 0x2:
    case 0x3: {
      const n = { 1: 1, 3: 2, 2: 4 }[op >>> 12]!
      const t = { 1: 'B', 3: 'W', 2: 'L' }[op >>> 12]!
      const dMode = (op >> 6) & 7
      const src = eaSrc(n)
      if (dMode === 1) {
        if (n === 1) throw new Invalide()
        return m(`MOVEA.${t}`, `${src},${an(r9)}`)
      }
      return m(`MOVE.${t}`, `${src},${ea(l, dMode, r9, n)}`)
    }
    case 0x4: {
      const fixes: Record<number, string> = { 0x4afc: 'ILLEGAL', 0x4e70: 'RESET', 0x4e71: 'NOP', 0x4e73: 'RTE', 0x4e75: 'RTS', 0x4e76: 'TRAPV', 0x4e77: 'RTR' }
      if (fixes[op]) return m(fixes[op])
      if (op === 0x4e72) return m('STOP', `#${h(l.mot())}`)
      if ((op & 0xfff0) === 0x4e40) return m('TRAP', `#${op & 15}`)
      if ((op & 0xfff8) === 0x4e50) return m('LINK', `${an(reg)},#${hs(sx16(l.mot()))}`)
      if ((op & 0xfff8) === 0x4e58) return m('UNLK', an(reg))
      if ((op & 0xfff8) === 0x4e60) return m('MOVE.L', `${an(reg)},USP`)
      if ((op & 0xfff8) === 0x4e68) return m('MOVE.L', `USP,${an(reg)}`)
      if ((op & 0xffc0) === 0x4e80) return m('JSR', eaSrc(4))
      if ((op & 0xffc0) === 0x4ec0) return m('JMP', eaSrc(4))
      if ((op & 0xffc0) === 0x40c0) return m('MOVE.W', `SR,${eaSrc(2)}`)
      if ((op & 0xffc0) === 0x44c0) return m('MOVE.W', `${eaSrc(2)},CCR`)
      if ((op & 0xffc0) === 0x46c0) return m('MOVE.W', `${eaSrc(2)},SR`)
      if ((op & 0xffc0) === 0x4ac0) return m('TAS', eaSrc(1))
      if ((op & 0xf1c0) === 0x41c0) return m('LEA', `${eaSrc(4)},${an(r9)}`)
      if ((op & 0xf1c0) === 0x4180) return m('CHK.W', `${eaSrc(2)},D${r9}`)
      if ((op & 0xfff8) === 0x4840) return m('SWAP', `D${reg}`)
      if ((op & 0xfff8) === 0x4880) return m('EXT.W', `D${reg}`)
      if ((op & 0xfff8) === 0x48c0) return m('EXT.L', `D${reg}`)
      if ((op & 0xffc0) === 0x4800) return m('NBCD', eaSrc(1))
      if ((op & 0xffc0) === 0x4840) return m('PEA', eaSrc(4))
      if ((op & 0xfb80) === 0x4880) {
        const long = (op & 0x40) !== 0
        const versRegistres = (op & 0x400) !== 0
        let masque = l.mot()
        const t = long ? 'L' : 'W'
        if (versRegistres) return m(`MOVEM.${t}`, `${eaSrc(long ? 4 : 2)},${listeRegistres(masque)}`)
        if (mode === 4) {
          let normal = 0
          for (let i = 0; i < 16; i++) if (masque & (1 << i)) normal |= 1 << (15 - i)
          masque = normal
        }
        return m(`MOVEM.${t}`, `${listeRegistres(masque)},${eaSrc(long ? 4 : 2)}`)
      }
      const unaires: Record<number, string> = { 0x40: 'NEGX', 0x42: 'CLR', 0x44: 'NEG', 0x46: 'NOT', 0x4a: 'TST' }
      const nom = unaires[op >> 8]
      if (nom && tailleChamp !== 3) return m(`${nom}.${TAILLES[tailleChamp]}`, eaSrc([1, 2, 4][tailleChamp]))
      throw new Invalide()
    }
    case 0x5: {
      if (tailleChamp === 3) {
        const cond = COND[(op >> 8) & 15]
        if (mode === 1) {
          const base = l.pos
          const cible = base + sx16(l.mot())
          return m(cond === 'F' ? 'DBRA' : `DB${cond}`, `D${reg},${l.adresse(cible)}`)
        }
        return m(`S${cond}`, eaSrc(1))
      }
      const n = [1, 2, 4][tailleChamp]
      return m(`${op & 0x100 ? 'SUBQ' : 'ADDQ'}.${TAILLES[tailleChamp]}`, `#${r9 || 8},${eaSrc(n)}`)
    }
    case 0x6: {
      const cond = (op >> 8) & 15
      const nom = cond === 0 ? 'BRA' : cond === 1 ? 'BSR' : `B${COND[cond]}`
      const base = l.pos
      const d8 = op & 0xff
      if (d8 === 0) return m(`${nom}.W`, l.adresse(base + sx16(l.mot())))
      return m(`${nom}.S`, l.adresse(base + sx8(d8)))
    }
    case 0x7:
      if (op & 0x100) throw new Invalide()
      return m('MOVEQ', `#${hs(sx8(op))},D${r9}`)
    case 0x8:
    case 0x9:
    case 0xb:
    case 0xc:
    case 0xd: {
      const ligne = op >>> 12
      const opmode = (op >> 6) & 7
      if (ligne === 0xc) {
        if ((op & 0xf1f8) === 0xc140) return m('EXG', `D${r9},D${reg}`)
        if ((op & 0xf1f8) === 0xc148) return m('EXG', `${an(r9)},${an(reg)}`)
        if ((op & 0xf1f8) === 0xc188) return m('EXG', `D${r9},${an(reg)}`)
      }
      if ((ligne === 0x8 || ligne === 0xc) && (opmode === 3 || opmode === 7)) {
        const nom = ligne === 0x8 ? (opmode === 3 ? 'DIVU' : 'DIVS') : opmode === 3 ? 'MULU' : 'MULS'
        return m(`${nom}.W`, `${eaSrc(2)},D${r9}`)
      }
      if ((ligne === 0x9 || ligne === 0xd || ligne === 0xb) && (opmode === 3 || opmode === 7)) {
        const nom = ligne === 0x9 ? 'SUBA' : ligne === 0xd ? 'ADDA' : 'CMPA'
        const long = opmode === 7
        return m(`${nom}.${long ? 'L' : 'W'}`, `${eaSrc(long ? 4 : 2)},${an(r9)}`)
      }
      const t = TAILLES[opmode & 3]
      const n = [1, 2, 4][opmode & 3]
      if (opmode >= 4 && mode <= 1) {
        // Formes registre à registre ou -(Ay),-(Ax)
        const forme = mode === 0 ? `D${reg},D${r9}` : `-(${an(reg)}),-(${an(r9)})`
        if (ligne === 0x8 && opmode === 4) return m('SBCD', forme)
        if (ligne === 0xc && opmode === 4) return m('ABCD', forme)
        if (ligne === 0x9) return m(`SUBX.${t}`, forme)
        if (ligne === 0xd) return m(`ADDX.${t}`, forme)
        if (ligne === 0xb && mode === 1) return m(`CMPM.${t}`, `(${an(reg)})+,(${an(r9)})+`)
        // EOR Dn,Dm est valide ; les autres combinaisons registre/registre n'existent pas
        if (!(ligne === 0xb && mode === 0)) throw new Invalide()
      }
      const nom = { 0x8: 'OR', 0x9: 'SUB', 0xb: opmode >= 4 ? 'EOR' : 'CMP', 0xc: 'AND', 0xd: 'ADD' }[ligne]!
      if (opmode < 4) {
        if ((ligne === 0x8 || ligne === 0xc) && mode === 1) throw new Invalide()
        if (n === 1 && mode === 1) throw new Invalide()
        return m(`${nom}.${t}`, `${eaSrc(n)},D${r9}`)
      }
      return m(`${nom}.${t}`, `D${r9},${eaSrc(n)}`)
    }
    case 0xe: {
      const gauche = (op & 0x100) !== 0
      if (tailleChamp === 3) {
        const type = DECALAGES[(op >> 9) & 3]
        if ((op >> 11) & 1) throw new Invalide()
        return m(`${type}${gauche ? 'L' : 'R'}.W`, eaSrc(2))
      }
      const type = DECALAGES[(op >> 3) & 3]
      const compte = op & 0x20 ? `D${r9}` : `#${r9 || 8}`
      return m(`${type}${gauche ? 'L' : 'R'}.${TAILLES[tailleChamp]}`, `${compte},D${reg}`)
    }
  }
  throw new Invalide()
}

/** Désassemble l'instruction située à `adresse`. Un code invalide donne un DC.W. */
export function desassemblerInstruction(lire16: (adresse: number) => number, adresse: number, opts: OptionsTexte = {}): InstructionDesassemblee {
  const l = new Lecteur(lire16, adresse, opts)
  const op = lire16(adresse) & 0xffff
  try {
    const { mnemo, operandes } = decoder(l, op)
    return { adresse, taille: l.pos - adresse, mnemo, operandes, references: l.references, longs: l.longs }
  } catch (e) {
    if (!(e instanceof Invalide)) throw e
    const commentaire = (op & 0xf000) === 0xa000 ? 'Ligne A' : (op & 0xf000) === 0xf000 ? 'Ligne F' : ''
    return { adresse, taille: 2, mnemo: 'DC.W', operandes: h(op, 4) + (commentaire ? `    ; ${commentaire}` : ''), references: [], longs: [], donnee: true }
  }
}

export interface OptionsBloc {
  /** Adresse du premier octet. */
  base: number
  /** Positions (depuis `base`) des mots longs relogés d'un .PRG : affichés comme étiquettes. */
  relocs?: number[]
  /** Symboles connus (adresse → nom), par exemple ceux d'un .PRG. */
  symboles?: Map<number, string>
  /** Fin de la partie code (le reste est rendu en DC). Par défaut : tout est du code. */
  finCode?: number
  /** Taille de la BSS qui suit (programme TOS) : ses adresses reçoivent aussi des étiquettes. */
  bss?: number
  /**
   * Suivre le flot d'exécution depuis le début (et les `points` d'entrée) : seul le code atteint
   * est désassemblé, le reste devient des données. Par défaut : balayage linéaire de tout le bloc.
   */
  flot?: boolean
  points?: number[]
}

/** Où peut continuer l'exécution après cette instruction ? */
function suites(ins: InstructionDesassemblee): { cible?: number; continue: boolean } {
  const m = ins.mnemo.split('.')[0]
  const cible = ins.references[0]
  if (['RTS', 'RTE', 'RTR', 'ILLEGAL'].includes(m)) return { continue: false }
  if (m === 'BRA') return { cible, continue: false }
  if (m === 'JMP') return { cible: /^\$|^L/.test(ins.operandes) ? cible : undefined, continue: false }
  if (m === 'JSR') return { cible: /^\$|^L/.test(ins.operandes) ? cible : undefined, continue: true }
  if (/^B[A-Z]{2}$/.test(m) || m === 'BSR' || m.startsWith('DB')) return { cible, continue: true }
  return { continue: true }
}

/** Une ligne de source désassemblé. */
export interface LigneSource {
  adresse: number
  etiquette?: string
  texte: string
  octets: number
}

/**
 * Désassemble un bloc et le rend sous forme de source **réassemblable à l'identique** :
 * étiquettes `Lxxxx` sur les cibles internes, `DC.W`/`DC.B` pour ce qui n'est pas du code.
 */
export function desassembler(octets: Uint8Array, opts: OptionsBloc): LigneSource[] {
  const base = opts.base
  const fin = base + octets.length
  const finCode = Math.min(fin, opts.finCode ?? fin)
  const lire16 = (a: number): number => {
    const i = a - base
    return i >= 0 && i + 1 < octets.length ? (octets[i] << 8) | octets[i + 1] : 0
  }
  const lire32 = (a: number): number => ((lire16(a) << 16) | lire16(a + 2)) >>> 0
  const relocs = new Set((opts.relocs ?? []).map((r) => r + base))
  const finBss = fin + (opts.bss ?? 0)
  const interne = (a: number): boolean => a >= base && a <= finBss

  // Passe 1 : découpe en instructions, chacune vérifiée en la réassemblant (des données décodées
  // par hasard comme une instruction ne redonnent pas les mêmes octets : ce sont des données)
  const instructions: InstructionDesassemblee[] = []
  const cibles = new Set<number>(opts.symboles?.keys() ?? [])
  const decoderValide = (a: number): InstructionDesassemblee | null => {
    const ins = desassemblerInstruction(lire16, a)
    if (a + ins.taille > finCode || ins.donnee) return null
    return reassembleIdentique(ins, octets.subarray(a - base, a - base + ins.taille)) ? ins : null
  }
  const donnees = (a: number, n: number): InstructionDesassemblee => ({
    adresse: a,
    taille: n,
    mnemo: 'DC.B',
    operandes: octetsEnTexte(octets.subarray(a - base, a - base + n)),
    references: [],
    longs: [],
    donnee: true
  })

  // Mode « flot » : on n'accepte comme code que ce que l'exécution peut atteindre
  let atteint: Map<number, InstructionDesassemblee> | null = null
  if (opts.flot) {
    // Deux tours : le premier repère les adresses désignées comme données (LEA, PEA, MOVE…) ;
    // le second ne « tombe » plus dedans par simple continuation (après un TRAP Pterm0, par exemple)
    let donneesDesignees = new Set<number>()
    for (let tour = 0; tour < 2; tour++) {
      atteint = new Map()
      const sautees = new Set<number>()
      const pile: { a: number; saut: boolean }[] = [base, ...(opts.points ?? [])].map((a) => ({ a, saut: true }))
      while (pile.length) {
        const { a, saut } = pile.pop()!
        if (a < base || a >= finCode || a & 1 || atteint.has(a)) continue
        if (!saut && donneesDesignees.has(a) && !sautees.has(a)) continue
        const ins = decoderValide(a)
        if (!ins) continue
        atteint.set(a, ins)
        const s = suites(ins)
        if (s.cible !== undefined) {
          sautees.add(s.cible)
          pile.push({ a: s.cible, saut: true })
        }
        if (s.continue) pile.push({ a: a + ins.taille, saut: false })
      }
      const suivant = new Set<number>()
      for (const ins of atteint.values()) {
        const s = suites(ins)
        for (const r of ins.references) if (r !== s.cible) suivant.add(r)
      }
      donneesDesignees = suivant
    }
  }

  for (let a = base; a + 1 < finCode; ) {
    let ins: InstructionDesassemblee
    if (atteint) {
      const trouve = atteint.get(a)
      if (trouve) ins = trouve
      else {
        // Un mot long relogé au milieu des données : DC.L avec une étiquette
        if (relocs.has(a) && a + 4 <= finCode) {
          cibles.add(lire32(a))
          instructions.push({ adresse: a, taille: 4, mnemo: 'DC.L', operandes: h(lire32(a), 8), references: [], longs: [0], donnee: true })
          a += 4
          continue
        }
        // Données jusqu'à la prochaine instruction atteinte (au plus 8 octets par ligne)
        let n = 1
        while (a + n < finCode && n < 32 && !atteint.has(a + n) && !relocs.has(a + n)) n++
        instructions.push(donnees(a, n))
        a += n
        continue
      }
    } else {
      const d = desassemblerInstruction(lire16, a)
      if (a + d.taille > finCode) break
      ins = decoderValide(a) ?? { adresse: a, taille: 2, mnemo: 'DC.W', operandes: h(lire16(a), 4), references: [], longs: [], donnee: true }
    }
    instructions.push(ins)
    if (!ins.donnee) {
      for (const r of ins.references) if (interne(r)) cibles.add(r)
      for (const p of ins.longs) if (relocs.has(a + p)) cibles.add(lire32(a + p))
    }
    a += ins.taille
  }
  const debutDonnees = instructions.length ? instructions[instructions.length - 1].adresse + instructions[instructions.length - 1].taille : base
  for (const r of relocs) if (r >= debutDonnees) cibles.add(lire32(r))

  const nom = (a: number): string | undefined =>
    opts.symboles?.get(a) ?? (cibles.has(a) && interne(a) ? `L${a.toString(16).toUpperCase().padStart(4, '0')}` : undefined)
  const nommer = (a: number): string | undefined => (interne(a) && cibles.has(a) ? nom(a) : undefined)
  const cibleDedans = (debut: number, taille: number): boolean => {
    for (let x = debut + 1; x < debut + taille; x++) if (cibles.has(x)) return true
    return false
  }

  // Passe 2 : texte, avec les étiquettes
  const lignes: LigneSource[] = []
  for (const ins0 of instructions) {
    // Une étiquette tombe au milieu : c'étaient des données, rendues octet par octet
    if (cibleDedans(ins0.adresse, ins0.taille)) {
      for (let x = ins0.adresse; x < ins0.adresse + ins0.taille; x++) {
        lignes.push({ adresse: x, etiquette: nom(x), texte: `DC.B    ${h(octets[x - base], 2)}`, octets: 1 })
      }
      continue
    }
    if (ins0.donnee) {
      const operandes = ins0.mnemo === 'DC.L' ? (nom(lire32(ins0.adresse)) ?? ins0.operandes) : ins0.operandes
      lignes.push({ adresse: ins0.adresse, etiquette: nom(ins0.adresse), texte: `${ins0.mnemo.padEnd(8)}${operandes}`, octets: ins0.taille })
      continue
    }
    const ins = desassemblerInstruction(lire16, ins0.adresse, { nommer })
    // Un mot long relogé qui n'est pas une adresse interne : on le force en étiquette quand même
    let operandes = ins.operandes
    for (const p of ins.longs) {
      const pos = ins.adresse + p
      if (relocs.has(pos)) {
        const valeur = lire32(pos)
        const n = nom(valeur)
        if (n) operandes = operandes.replace(new RegExp(`\\$0*${valeur.toString(16).toUpperCase()}\\b`), n)
      }
    }
    lignes.push({ adresse: ins.adresse, etiquette: nom(ins.adresse), texte: `${ins.mnemo.padEnd(8)}${operandes}`, octets: ins.taille })
  }
  // Données : mots longs relogés en DC.L étiquette, le reste en DC.B par lignes de 8
  let a = debutDonnees
  while (a < fin) {
    if (relocs.has(a) && a + 4 <= fin) {
      const v = lire32(a)
      lignes.push({ adresse: a, etiquette: nom(a), texte: `DC.L    ${nom(v) ?? h(v, 8)}`, octets: 4 })
      a += 4
      continue
    }
    const valeurs: number[] = []
    const debut = a
    while (a < fin && valeurs.length < 32 && !relocs.has(a) && (a === debut || !cibles.has(a))) {
      valeurs.push(octets[a - base])
      a++
    }
    lignes.push({ adresse: debut, etiquette: nom(debut), texte: `DC.B    ${octetsEnTexte(Uint8Array.from(valeurs))}`, octets: a - debut })
  }
  // BSS : réservations entre les étiquettes ; sinon, étiquette juste après la fin du programme
  if (opts.bss) {
    let position = fin
    for (const c of [...cibles].filter((x) => x >= fin && x <= finBss).sort((x, y) => x - y)) {
      if (c > position) lignes.push({ adresse: position, texte: `DS.B    ${c - position}`, octets: c - position })
      lignes.push({ adresse: c, etiquette: nom(c), texte: '', octets: 0 })
      position = c
    }
    if (finBss > position) lignes.push({ adresse: position, texte: `DS.B    ${finBss - position}`, octets: finBss - position })
  } else if (cibles.has(fin)) lignes.push({ adresse: fin, etiquette: nom(fin), texte: '', octets: 0 })
  return lignes
}

/** L'instruction, réassemblée à son adresse, redonne-t-elle exactement ces octets ? */
function reassembleIdentique(ins: InstructionDesassemblee, octets: Uint8Array): boolean {
  const r = assembler(`    ORG ${h(ins.adresse)}\n    ${ins.mnemo} ${ins.operandes}\n`)
  if (!r.ok || r.binaire.length !== octets.length) return false
  for (let i = 0; i < octets.length; i++) if (r.binaire[i] !== octets[i]) return false
  return true
}

/**
 * Désassemble un programme TOS (lu par `lirePrg`) en source relogeable : sections TEXT, DATA et
 * BSS, étiquettes pour toutes les adresses relogées, symboles DRI s'il y en a. Réassemblé
 * (OPT D+ si le programme avait des symboles), il redonne le même .PRG.
 */
export function desassemblerPrg(prg: PrgLu): string {
  const image = new Uint8Array(prg.text.length + prg.data.length)
  image.set(prg.text, 0)
  image.set(prg.data, prg.text.length)
  const symboles = new Map<number, string>()
  for (const s of prg.symboles) if (s.section && /^[A-Za-z_][A-Za-z0-9_]*$/.test(s.nom)) symboles.set(s.valeur, s.nom)
  // Base fictive : les valeurs relogées du fichier sont relatives au début de TEXT
  const lignes = desassembler(image, { base: 0, relocs: prg.relocs, symboles, finCode: prg.text.length, bss: prg.bss, flot: true })
  const sortie: string[] = []
  if (prg.symboles.length) sortie.push('    OPT     D+              ; table des symboles, comme le programme d’origine')
  sortie.push('    SECTION TEXT')
  let sectionData = false
  let sectionBss = false
  for (const l of lignes) {
    if (!sectionData && l.adresse >= prg.text.length && prg.data.length > 0 && l.adresse < image.length) {
      sortie.push('', '    SECTION DATA')
      sectionData = true
    }
    if (!sectionBss && l.adresse >= image.length && (prg.bss > 0 || l.etiquette)) {
      sortie.push('', '    SECTION BSS')
      sectionBss = true
    }
    if (l.etiquette) sortie.push(`${l.etiquette}:`)
    if (l.texte) sortie.push(`    ${l.texte}`)
  }
  return sortie.join('\n') + '\n'
}

/** Assemble les lignes en un source texte (avec un ORG si `org` est donné). */
export function sourceReassemblable(lignes: LigneSource[], org?: number): string {
  const sortie: string[] = []
  if (org !== undefined) sortie.push(`    ORG     ${h(org)}`)
  for (const l of lignes) {
    if (l.etiquette) sortie.push(`${l.etiquette}:`)
    if (l.texte) sortie.push(`    ${l.texte}`)
  }
  return sortie.join('\n') + '\n'
}

/** Octets en opérandes de DC.B : les textes lisibles entre apostrophes, le reste en hexadécimal. */
export function octetsEnTexte(octets: Uint8Array): string {
  const morceaux: string[] = []
  let texte = ''
  const fermer = (): void => {
    if (texte) morceaux.push(`'${texte}'`)
    texte = ''
  }
  for (let i = 0; i < octets.length; i++) {
    const o = octets[i]
    // Un texte : au moins 3 caractères imprimables à la suite
    const imprimable = (x: number | undefined): boolean => x !== undefined && x >= 0x20 && x < 0x7f
    const debutTexte = imprimable(o) && (texte !== '' || (imprimable(octets[i + 1]) && imprimable(octets[i + 2])))
    if (debutTexte) texte += o === 0x27 ? "''" : String.fromCharCode(o)
    else {
      fermer()
      morceaux.push(h(o, 2))
    }
  }
  fermer()
  return morceaux.join(',')
}
