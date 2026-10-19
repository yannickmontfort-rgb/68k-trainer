/**
 * Assembleur 68000 de 68k Trainer, compatible Devpac (comportement vérifié octet par octet contre
 * vasm -devpac). Deux passes : la première calcule les adresses et définit les symboles, la
 * seconde produit le code. Comme Devpac, il n'optimise rien : ce qui est écrit est ce qui est
 * assemblé. Il aligne automatiquement les instructions et les données .W/.L (avec un
 * avertissement), mais pas une étiquette seule sur sa ligne.
 *
 * Code pur, sans dépendance (ni Node, ni navigateur) : réutilisable dans d'autres projets.
 */
import { AsmErreur, suggestion, type Diagnostic } from './erreurs'
import { evaluer, type ContexteExpression, type Valeur } from './expressions'
import { encoderInstruction, MNEMONIQUES, Sortie, type ContexteEncodage } from './encodeur'
import { decouperLigne, separerOperandes, type Champ, type Taille } from './lignes'

export interface OptionsAssemblage {
  /** Adresse de chargement d'un programme sans ORG (défaut $1000). */
  base?: number
  /** Contenu d'un fichier INCLUDE (texte) ou INCBIN (octets) ; `null` s'il n'existe pas. */
  lireTexte?: (nom: string) => string | null
  lireBinaire?: (nom: string) => Uint8Array | null
  /** Vérifications propres à un .PRG relogeable (pas d'adresse du programme sur 16 bits). */
  prg?: boolean
}

export type NomSection = 'TEXT' | 'DATA' | 'BSS'

export interface Symbole {
  nom: string
  valeur: number
  /** Section d'une étiquette de programme (absent pour une constante). */
  section?: NomSection
}

export interface ResultatAssemblage {
  ok: boolean
  erreurs: Diagnostic[]
  avertissements: Diagnostic[]
  /** Image mémoire à plat (TEXT, DATA puis BSS remplie de zéros), à charger en `base`. */
  binaire: Uint8Array
  base: number
  /** Adresse du début d'une instruction → ligne du source principal. */
  adresseVersLigne: Record<number, number>
  symboles: Symbole[]
  /** Programme sans ORG : sections séparées et positions à reloger (pour un .PRG). */
  relogeable: boolean
  sections: { text: Uint8Array; data: Uint8Array; bss: number }
  /** Positions, depuis le début de TEXT, des mots longs contenant une adresse du programme. */
  relocs: number[]
  /** OPT D+ : le source demande une table de symboles (débogage avec MONST). */
  debogage: boolean
}

interface LigneSrc {
  texte: string
  /** Ligne du source principal à laquelle rattacher le code et les erreurs. */
  ligne: number
  /** Fichier inclus et ligne dans ce fichier, si ce n'est pas le source principal. */
  fichier?: string
  ligneFichier?: number
  /** Nom de la macro en cours d'expansion (pour les messages). */
  macro?: string
}

interface Macro {
  nom: string
  corps: string[]
}

interface Segment {
  section: NomSection
  /** Adresse de début (mode absolu) ou décalage dans la section (mode relogeable). */
  debut: number
  octets: number[]
}

interface Def {
  section?: NomSection
  /** Décalage dans la section (étiquette relogeable) ou valeur. */
  valeur: number
  inconnu?: boolean
  redefinissable?: boolean
}

const DIRECTIVES_IGNOREES = new Set([
  'OPT', 'XDEF', 'XREF', 'GLOBL', 'GLOBAL', 'LIST', 'NOLIST', 'PAGE', 'TTL', 'SPC', 'PLEN', 'LLEN', 'FORMAT',
  'OUTPUT', 'IDNT', 'NOPAGE', 'SUBTTL', 'COMMENT', 'MC68000'
])
const DIRECTIVES = new Set([
  'EQU', '=', 'SET', 'RS', 'RSRESET', 'RSSET', 'ORG', 'SECTION', 'TEXT', 'DATA', 'BSS', 'EVEN', 'CNOP', 'DC', 'DS',
  'DCB', 'INCLUDE', 'INCBIN', 'END', 'MACRO', 'ENDM', 'MEXIT', 'REPT', 'ENDR', 'IFEQ', 'IFNE', 'IFGT', 'IFGE', 'IFLT',
  'IFLE', 'IFD', 'IFND', 'IFC', 'IFNC', 'ELSE', 'ENDC', 'ENDIF', 'FAIL', ...DIRECTIVES_IGNOREES
])

const TAILLE_OCTETS: Record<string, number> = { B: 1, W: 2, L: 4 }
const MAX_ERREURS = 100

class FinAssemblage extends Error {}
class SortieMacro extends Error {}

export function assembler(source: string, options: OptionsAssemblage = {}): ResultatAssemblage {
  return new Assembleur(source, options).executer()
}

class Assembleur {
  private readonly base: number
  private readonly lignes: LigneSrc[]
  private readonly absolu: boolean

  private passe: 1 | 2 = 1
  private erreurs: Diagnostic[] = []
  private avertissements: Diagnostic[] = []
  private defs = new Map<string, Def>()
  private defsPasse1 = new Map<string, Def>()
  private definisCettePasse = new Set<string>()
  private macros = new Map<string, Macro>()
  private compteurMacro = 0
  private rs = 0
  private dernierGlobal = ''
  private segments: Segment[] = []
  private courant!: Segment
  private sectionCourante: NomSection = 'TEXT'
  private tailles: Record<NomSection, number> = { TEXT: 0, DATA: 0, BSS: 0 }
  private basesSection: Record<NomSection, number> = { TEXT: 0, DATA: 0, BSS: 0 }
  private adresseVersLigne: Record<number, number> = {}
  private relocs: { section: NomSection; position: number }[] = []
  private ligneCourante!: LigneSrc
  /** Étiquette définie seule sur sa ligne, juste avant (pour l'avertissement d'alignement). */
  private etiquetteSeule: { nom: string; adresse: number; ligne: number } | null = null
  private profondeurInclude = 0
  private debogage = false

  constructor(source: string, private readonly options: OptionsAssemblage) {
    this.base = options.base ?? 0x1000
    this.lignes = source.replace(/\r\n?/g, '\n').split('\n').map((texte, i) => ({ texte, ligne: i + 1 }))
    // Un ORG quelque part : programme absolu (sinon relogeable, comme un .PRG)
    this.absolu = this.lignes.some((l) => {
      try {
        return decouperLigne(l.texte).mnemo?.texte === 'ORG'
      } catch {
        return false
      }
    })
  }

  executer(): ResultatAssemblage {
    for (const passe of [1, 2] as const) {
      this.passe = passe
      this.demarrerPasse()
      try {
        this.executerLignes(this.lignes)
      } catch (e) {
        if (!(e instanceof FinAssemblage)) throw e
      }
      this.terminerSections()
      if (passe === 1) this.defsPasse1 = new Map(this.defs)
    }
    return this.resultat()
  }

  private demarrerPasse(): void {
    this.erreurs = []
    this.avertissements = []
    this.defs = new Map()
    this.definisCettePasse = new Set()
    this.macros = new Map()
    this.compteurMacro = 0
    this.rs = 0
    this.debogage = false
    this.dernierGlobal = ''
    this.adresseVersLigne = {}
    this.relocs = []
    this.sectionCourante = 'TEXT'
    this.segments = []
    this.courant = this.nouveauSegment('TEXT', this.absolu ? this.base : 0)
  }

  private nouveauSegment(section: NomSection, debut: number): Segment {
    const s: Segment = { section, debut, octets: [] }
    this.segments.push(s)
    return s
  }

  /** Fin de passe : tailles des sections et adresses de base (TEXT, puis DATA, puis BSS). */
  private terminerSections(): void {
    if (this.absolu) return
    for (const nom of ['TEXT', 'DATA', 'BSS'] as NomSection[]) {
      this.tailles[nom] = Math.max(0, ...this.segments.filter((s) => s.section === nom).map((s) => s.debut + s.octets.length))
    }
    const pair = (n: number): number => (n + 1) & ~1
    this.basesSection.TEXT = this.base
    this.basesSection.DATA = this.base + pair(this.tailles.TEXT)
    this.basesSection.BSS = this.basesSection.DATA + pair(this.tailles.DATA)
  }

  // --- Adresses -------------------------------------------------------------------------

  /** Adresse courante (absolue). */
  private get pc(): number {
    const s = this.courant
    const debut = this.absolu ? s.debut : this.basesSection[s.section] + s.debut
    return debut + s.octets.length
  }

  private get pcReloc(): number {
    return this.absolu ? 0 : 1
  }

  private emettre(octets: number[], relocsInternes: number[] = []): void {
    if (this.courant.section === 'BSS' && !this.absolu) {
      throw new AsmErreur('La section BSS ne contient que des réservations (DS) : pas de code ni de DC.')
    }
    const position = this.courant.debut + this.courant.octets.length
    for (const r of relocsInternes) this.relocs.push({ section: this.courant.section, position: position + r })
    for (const o of octets) this.courant.octets.push(o & 0xff)
  }

  private reserver(n: number): void {
    for (let i = 0; i < n; i++) this.courant.octets.push(0)
  }

  /** Aligne sur une adresse paire ; renvoie true si un octet a été ajouté. */
  private aligner(): boolean {
    if ((this.pc & 1) === 0) return false
    // Le piège de Devpac : une étiquette seule sur sa ligne, juste avant, reste à l'adresse impaire
    const seule = this.etiquetteSeule
    if (seule && seule.adresse === this.pc) {
      this.avertir(
        `L'étiquette « ${seule.nom} » (ligne ${seule.ligne}) est restée à l'adresse impaire $${seule.adresse.toString(16).toUpperCase()}, ` +
          "alors que ce qui suit a été aligné : un accès .W ou .L par cette étiquette provoquera une erreur d'adresse. Ajoute EVEN avant l'étiquette."
      )
    }
    this.courant.octets.push(0)
    return true
  }

  // --- Symboles -----------------------------------------------------------------------

  private normaliser(nom: string): string {
    if (nom.startsWith('.')) return this.dernierGlobal + nom
    if (/^\d+\$$/.test(nom)) return this.dernierGlobal + '$' + nom
    return nom
  }

  private valeurDef(d: Def): { v: number; reloc: number } {
    if (d.section) return { v: (this.basesSection[d.section] + d.valeur) | 0, reloc: this.absolu ? 0 : 1 }
    return { v: d.valeur | 0, reloc: 0 }
  }

  private chercher(nom: string, col: number): { v: number; reloc: number } | undefined {
    if (nom === '__RS') return { v: this.rs, reloc: 0 }
    const d = this.defs.get(nom) ?? (this.passe === 2 ? this.defsPasse1.get(nom) : undefined)
    if (d && !d.inconnu) return this.valeurDef(d)
    if (this.passe === 2) {
      const connus = [...this.defsPasse1.keys()].filter((k) => !k.includes('.') && !k.includes('$'))
      const proche = suggestion(nom, connus)
      if (/^[DA][89]$/i.test(nom)) throw new AsmErreur(`« ${nom} » n'existe pas : les registres vont de D0 à D7 et de A0 à A7.`, col, nom.length)
      const memeLettres = connus.find((k) => k.toUpperCase() === nom.toUpperCase())
      if (memeLettres) {
        throw new AsmErreur(
          `Le nom « ${nom} » n'est défini nulle part : l'étiquette s'écrit « ${memeLettres} » (les majuscules et minuscules comptent dans les étiquettes, comme sous Devpac).`,
          col,
          nom.length
        )
      }
      throw new AsmErreur(
        `Le nom « ${nom} » n'est défini nulle part${proche ? ` : vouliez-vous dire « ${proche} » ?` : ' : étiquette mal orthographiée ou oubliée ?'}`,
        col,
        nom.length
      )
    }
    return undefined
  }

  private contexteExpression(): ContexteExpression {
    return {
      pc: this.pc,
      pcReloc: this.pcReloc,
      symbole: (nom, col) => this.chercher(nom, col),
      normaliser: (nom) => this.normaliser(nom)
    }
  }

  private evaluer(champ: Champ): Valeur {
    return evaluer(champ.texte, this.contexteExpression(), champ.col)
  }

  /** Valeur qui doit être connue dès la première passe (ORG, DS, REPT, IF…). */
  private evaluerImmediat(champ: Champ, quoi: string): number {
    const v = this.evaluer(champ)
    if (v.inconnu) throw new AsmErreur(`${quoi} doit pouvoir se calculer à cet endroit : n'utilise que des noms définis plus haut.`, champ.col, champ.texte.length)
    return v.v
  }

  private definir(etiquette: Champ, def: Def): void {
    const nom = this.normaliser(etiquette.texte)
    if (!/^[A-Za-z_.][A-Za-z0-9_.$?@]*$|^\d+\$$/.test(etiquette.texte)) {
      throw new AsmErreur(`« ${etiquette.texte} » n'est pas un nom d'étiquette valide.`, etiquette.col, etiquette.texte.length)
    }
    if (MNEMONIQUES.has(nom.toUpperCase()) && !def.redefinissable && def.section) {
      this.avertir(`L'étiquette « ${nom} » porte le nom d'une instruction : c'est permis, mais source de confusion.`, etiquette.col, etiquette.texte.length)
    }
    const existant = this.defs.get(nom)
    if (this.definisCettePasse.has(nom) && !(existant?.redefinissable && def.redefinissable)) {
      throw new AsmErreur(`L'étiquette « ${nom} » est définie deux fois : chaque étiquette doit être unique.`, etiquette.col, etiquette.texte.length)
    }
    this.definisCettePasse.add(nom)
    this.defs.set(nom, def)
  }

  private definirEtiquetteIci(etiquette: Champ): void {
    if (!etiquette.texte.startsWith('.') && !/^\d+\$$/.test(etiquette.texte)) this.dernierGlobal = etiquette.texte
    if (this.absolu) this.definir(etiquette, { valeur: this.pc })
    else this.definir(etiquette, { section: this.courant.section, valeur: this.courant.debut + this.courant.octets.length })
  }

  // --- Diagnostics ------------------------------------------------------------------------

  private diagnostic(message: string, colonne?: number, longueur?: number): Diagnostic {
    const l = this.ligneCourante
    const prefixe = l.macro ? `Dans la macro ${l.macro} : ` : ''
    const d: Diagnostic = { ligne: l.ligne, message: prefixe + message }
    if (l.fichier) {
      d.fichier = l.fichier
      d.message = `${l.fichier}, ligne ${l.ligneFichier} : ${d.message}`
    } else if (!l.macro && colonne !== undefined) {
      d.colonne = colonne + 1
      d.longueur = Math.max(1, longueur ?? 1)
    }
    return d
  }

  private avertir(message: string, colonne?: number, longueur?: number): void {
    if (this.passe === 2) this.avertissements.push(this.diagnostic(message, colonne, longueur))
  }

  private erreur(e: AsmErreur): void {
    if (this.passe !== 2) return
    this.erreurs.push(this.diagnostic(e.message, e.colonne, e.longueur))
    if (this.erreurs.length >= MAX_ERREURS) throw new FinAssemblage()
  }

  // --- Exécution des lignes ------------------------------------------------------------------

  private executerLignes(lignes: LigneSrc[]): void {
    // Pile de l'assemblage conditionnel : actif / une branche a déjà été prise
    const conditions: { actif: boolean; pris: boolean }[] = []
    const actif = (): boolean => conditions.every((c) => c.actif)
    for (let i = 0; i < lignes.length; i++) {
      const l = lignes[i]
      this.ligneCourante = l
      let d
      try {
        d = decouperLigne(l.texte)
      } catch (e) {
        if (e instanceof AsmErreur) {
          if (actif()) this.erreur(e)
          continue
        }
        throw e
      }
      const mnemo = d.mnemo?.texte
      // Conditions : traitées même dans une branche inactive
      if (mnemo && /^IF(EQ|NE|GT|GE|LT|LE|D|ND|C|NC)$/.test(mnemo)) {
        let vrai = false
        if (actif()) {
          try {
            vrai = this.condition(mnemo, d.operandes)
          } catch (e) {
            if (e instanceof AsmErreur) this.erreur(e)
            else throw e
          }
        }
        conditions.push({ actif: actif() && vrai, pris: vrai })
        continue
      }
      if (mnemo === 'ELSE') {
        const c = conditions[conditions.length - 1]
        if (!c) {
          this.erreur(new AsmErreur('ELSE sans IF correspondant.', d.mnemo!.col, 4))
          continue
        }
        const parentActif = conditions.slice(0, -1).every((x) => x.actif)
        c.actif = parentActif && !c.pris
        c.pris = true
        continue
      }
      if (mnemo === 'ENDC' || mnemo === 'ENDIF') {
        if (!conditions.pop()) this.erreur(new AsmErreur(`${mnemo} sans IF correspondant.`, d.mnemo!.col, mnemo.length))
        continue
      }
      if (!actif()) {
        // Sauter aussi les définitions de macros et les blocs REPT inactifs
        if (mnemo === 'MACRO') i = this.finDeBloc(lignes, i, 'MACRO', 'ENDM')
        else if (mnemo === 'REPT') i = this.finDeBloc(lignes, i, 'REPT', 'ENDR')
        continue
      }
      if (mnemo === 'MACRO') {
        const fin = this.finDeBloc(lignes, i, 'MACRO', 'ENDM')
        if (!d.etiquette) this.erreur(new AsmErreur('Une macro doit avoir un nom (en première colonne, devant MACRO).', d.mnemo!.col, 5))
        else this.macros.set(d.etiquette.texte.toUpperCase(), { nom: d.etiquette.texte, corps: lignes.slice(i + 1, fin).map((x) => x.texte) })
        i = fin
        continue
      }
      if (mnemo === 'REPT') {
        const fin = this.finDeBloc(lignes, i, 'REPT', 'ENDR')
        try {
          const n = d.operandes ? this.evaluerImmediat(d.operandes, 'Le nombre de répétitions') : 0
          const corps = lignes.slice(i + 1, fin)
          for (let k = 0; k < n; k++) this.executerLignes(corps)
        } catch (e) {
          if (e instanceof AsmErreur) this.erreur(e)
          else throw e
        }
        i = fin
        continue
      }
      try {
        this.traiterLigne(d, l)
      } catch (e) {
        if (e instanceof AsmErreur) this.erreur(e)
        else throw e
      }
    }
    if (conditions.length > 0) this.erreur(new AsmErreur('Un IF n’a pas de ENDC correspondant.'))
  }

  /** Indice de la ligne qui ferme le bloc ouvert à `debut` (gère l'imbrication). */
  private finDeBloc(lignes: LigneSrc[], debut: number, ouvre: string, ferme: string): number {
    let profondeur = 0
    for (let j = debut; j < lignes.length; j++) {
      let m: string | undefined
      try {
        m = decouperLigne(lignes[j].texte).mnemo?.texte
      } catch {
        continue
      }
      if (m === ouvre) profondeur++
      else if (m === ferme && --profondeur === 0) return j
    }
    this.ligneCourante = lignes[debut]
    this.erreur(new AsmErreur(`${ouvre} sans ${ferme} correspondant.`))
    return lignes.length - 1
  }

  private condition(mnemo: string, op?: Champ): boolean {
    if (mnemo === 'IFD' || mnemo === 'IFND') {
      const nom = this.normaliser((op?.texte ?? '').trim())
      const defini = this.defs.has(nom)
      return mnemo === 'IFD' ? defini : !defini
    }
    if (mnemo === 'IFC' || mnemo === 'IFNC') {
      const parts = op ? separerOperandes(op).map((c) => c.texte.trim().replace(/^'(.*)'$|^"(.*)"$/, '$1$2')) : []
      const egal = parts[0] === parts[1]
      return mnemo === 'IFC' ? egal : !egal
    }
    if (!op) throw new AsmErreur(`${mnemo} attend une expression.`)
    const v = this.evaluerImmediat(op, 'La condition')
    switch (mnemo) {
      case 'IFEQ':
        return v === 0
      case 'IFNE':
        return v !== 0
      case 'IFGT':
        return v > 0
      case 'IFGE':
        return v >= 0
      case 'IFLT':
        return v < 0
      default:
        return v <= 0
    }
  }

  private traiterLigne(d: ReturnType<typeof decouperLigne>, l: LigneSrc): void {
    const mnemo = d.mnemo
    if (!mnemo) {
      if (d.etiquette) {
        this.definirEtiquetteIci(d.etiquette)
        this.etiquetteSeule = { nom: d.etiquette.texte, adresse: this.pc, ligne: l.ligne }
      }
      return
    }
    try {
      this.traiterInstructionOuDirective(d, l, mnemo)
    } finally {
      this.etiquetteSeule = null
    }
  }

  private traiterInstructionOuDirective(d: ReturnType<typeof decouperLigne>, l: LigneSrc, mnemo: Champ): void {
    const nom = mnemo.texte

    // Macro définie par l'utilisateur
    const macro = this.macros.get(nom)
    if (macro) {
      if (d.etiquette) this.definirEtiquetteIci(d.etiquette)
      this.developperMacro(macro, d.tailleBrute ?? '', d.operandes, l)
      return
    }

    if (DIRECTIVES.has(nom)) {
      this.directive(nom, d.taille, d.etiquette, d.operandes, mnemo)
      return
    }

    if (!MNEMONIQUES.has(nom)) {
      if (d.etiquette) this.definirEtiquetteIci(d.etiquette)
      const proche = suggestion(nom, [...MNEMONIQUES, ...DIRECTIVES])
      throw new AsmErreur(
        `« ${nom} » n'est pas une instruction du 68000${proche ? ` : vouliez-vous dire « ${proche} » ?` : '. Faute de frappe ?'}`,
        mnemo.col,
        mnemo.texte.length
      )
    }

    // Instruction : alignement automatique comme Devpac, puis étiquette, puis encodage
    if (this.aligner()) this.avertir('Instruction alignée sur une adresse paire (un octet nul ajouté). Pense à EVEN après un texte en DC.B.', mnemo.col, mnemo.texte.length)
    if (d.etiquette) this.definirEtiquetteIci(d.etiquette)
    const debut = this.pc
    if (!l.fichier) this.adresseVersLigne[debut] = l.ligne
    else this.adresseVersLigne[debut] ??= l.ligne
    const out = new Sortie()
    const ctx: ContexteEncodage = {
      pc: debut,
      passe: this.passe,
      evaluer: (c) => evaluer(c.texte, { ...this.contexteExpression(), pc: debut }, c.col),
      relogeable: !!this.options.prg && !this.absolu,
      avertir: (m, c, n) => this.avertir(m, c, n)
    }
    const champs = d.operandes ? separerOperandes(d.operandes) : []
    try {
      encoderInstruction(mnemo, d.taille, champs, ctx, out)
    } catch (e) {
      // En première passe, réserver quand même une taille plausible pour ne pas décaler les adresses
      if (this.passe === 1) this.emettre([0, 0])
      throw e
    }
    this.emettre(out.octets, out.relocs)
  }

  private developperMacro(macro: Macro, taille: string, op: Champ | undefined, l: LigneSrc): void {
    const args = op ? this.argumentsMacro(op.texte) : []
    const id = `_${String(++this.compteurMacro).padStart(6, '0')}`
    const corps = macro.corps.map((texte) =>
      texte.replace(/\\(\d|@)/g, (_, c: string) => (c === '@' ? id : c === '0' ? taille : (args[+c - 1] ?? '')))
    )
    const ancienNarg = this.defs.get('NARG')
    this.defs.set('NARG', { valeur: args.length, redefinissable: true })
    try {
      this.executerLignes(corps.map((texte) => ({ ...l, texte, macro: macro.nom })))
    } catch (e) {
      if (!(e instanceof SortieMacro)) throw e
    } finally {
      if (ancienNarg) this.defs.set('NARG', ancienNarg)
      else this.defs.delete('NARG')
    }
  }

  /** Arguments d'une macro : séparés par des virgules ; `<a,b>` groupe un argument. */
  private argumentsMacro(texte: string): string[] {
    const args: string[] = []
    let courant = ''
    let chevrons = 0
    let guillemet: string | null = null
    for (const c of texte) {
      if (guillemet) {
        courant += c
        if (c === guillemet) guillemet = null
        continue
      }
      if (c === "'" || c === '"') guillemet = c
      if (c === '<' && chevrons++ === 0 && courant === '') continue
      if (c === '>' && chevrons > 0 && --chevrons === 0) continue
      if (c === ',' && chevrons === 0) {
        args.push(courant)
        courant = ''
        continue
      }
      courant += c
    }
    args.push(courant)
    return args
  }

  // --- Directives ------------------------------------------------------------------------

  private directive(nom: string, taille: Taille | undefined, etiquette: Champ | undefined, op: Champ | undefined, mnemo: Champ): void {
    const exigerOp = (): Champ => {
      if (!op) throw new AsmErreur(`${nom} attend une valeur.`, mnemo.col, mnemo.texte.length)
      return op
    }
    const exigerEtiquette = (): Champ => {
      if (!etiquette) throw new AsmErreur(`${nom} a besoin d'un nom en première colonne (par exemple : LARGEUR ${nom} 320).`, mnemo.col, mnemo.texte.length)
      return etiquette
    }
    const octetsTaille = (defaut: number): number => (taille ? (TAILLE_OCTETS[taille] ?? defaut) : defaut)

    switch (nom) {
      case 'EQU':
      case '=':
      case 'SET': {
        const e = exigerEtiquette()
        const v = this.evaluer(exigerOp())
        if (v.inconnu && this.passe === 2) throw new AsmErreur(`La valeur de ${e.texte} ne peut pas être calculée.`, op!.col, op!.texte.length)
        this.definir(e, { valeur: v.v, inconnu: v.inconnu, redefinissable: nom === 'SET', section: undefined })
        // Une constante qui vaut une adresse du programme reste relogeable
        if (v.reloc === 1 && !this.absolu) {
          const d = this.defs.get(this.normaliser(e.texte))!
          d.section = 'TEXT'
          d.valeur = v.v - this.basesSection.TEXT
        }
        return
      }
      case 'RS': {
        const e = exigerEtiquette()
        const n = this.evaluerImmediat(exigerOp(), 'La taille de RS')
        const t = octetsTaille(2)
        if (t > 1 && this.rs & 1) this.rs++
        this.definir(e, { valeur: this.rs })
        this.rs += n * t
        return
      }
      case 'RSRESET':
        this.rs = 0
        return
      case 'RSSET':
        this.rs = this.evaluerImmediat(exigerOp(), 'La valeur de RSSET')
        return
      case 'ORG': {
        const adresse = this.evaluerImmediat(exigerOp(), "L'adresse de ORG")
        this.courant = this.nouveauSegment(this.sectionCourante, adresse >>> 0)
        if (etiquette) this.definirEtiquetteIci(etiquette)
        return
      }
      case 'SECTION':
      case 'TEXT':
      case 'DATA':
      case 'BSS': {
        let section = nom === 'SECTION' ? (op?.texte.split(',')[0].trim().toUpperCase() ?? '') : nom
        if (section === 'CODE') section = 'TEXT'
        if (section !== 'TEXT' && section !== 'DATA' && section !== 'BSS') {
          throw new AsmErreur(`Section « ${section} » inconnue : sur Atari ST, les sections sont TEXT, DATA et BSS.`, op?.col ?? mnemo.col, op?.texte.length ?? 7)
        }
        if (this.absolu) {
          // Programme à adresse fixe (ORG) : les sections sont simplement mises bout à bout
          if (etiquette) this.definirEtiquetteIci(etiquette)
          return
        }
        this.sectionCourante = section
        const existant = [...this.segments].reverse().find((s) => s.section === section)
        this.courant = existant ?? this.nouveauSegment(section, 0)
        if (etiquette) this.definirEtiquetteIci(etiquette)
        return
      }
      case 'EVEN':
        this.aligner()
        if (etiquette) this.definirEtiquetteIci(etiquette)
        return
      case 'CNOP': {
        const parts = separerOperandes(exigerOp())
        const decalage = this.evaluerImmediat(parts[0], 'Le décalage de CNOP')
        const alignement = parts[1] ? this.evaluerImmediat(parts[1], "L'alignement de CNOP") : 2
        if (alignement <= 0) throw new AsmErreur("L'alignement de CNOP doit être positif.", parts[1]?.col, parts[1]?.texte.length)
        while (((this.pc - decalage) % alignement + alignement) % alignement !== 0) this.courant.octets.push(0)
        if (etiquette) this.definirEtiquetteIci(etiquette)
        return
      }
      case 'DC': {
        const t = octetsTaille(2)
        if (t > 1 && this.aligner()) this.avertir('Donnée alignée sur une adresse paire (un octet nul ajouté).', mnemo.col, mnemo.texte.length)
        if (etiquette) this.definirEtiquetteIci(etiquette)
        for (const c of separerOperandes(exigerOp())) this.donnee(c, t)
        return
      }
      case 'DS': {
        const t = octetsTaille(2)
        if (t > 1) this.aligner()
        if (etiquette) this.definirEtiquetteIci(etiquette)
        const n = this.evaluerImmediat(exigerOp(), 'La taille de DS')
        if (n < 0) throw new AsmErreur('DS ne peut pas réserver une taille négative.', op!.col, op!.texte.length)
        this.reserver(n * t)
        return
      }
      case 'DCB': {
        const t = octetsTaille(2)
        if (t > 1 && this.aligner()) this.avertir('Donnée alignée sur une adresse paire (un octet nul ajouté).', mnemo.col, mnemo.texte.length)
        if (etiquette) this.definirEtiquetteIci(etiquette)
        const parts = separerOperandes(exigerOp())
        const n = this.evaluerImmediat(parts[0], 'Le nombre de DCB')
        const valeur = parts[1] ?? { texte: '0', col: mnemo.col }
        for (let k = 0; k < n; k++) this.donnee(valeur, t)
        return
      }
      case 'INCLUDE': {
        const fichier = this.nomFichier(exigerOp())
        const texte = this.options.lireTexte?.(fichier) ?? null
        if (texte === null) throw new AsmErreur(`Fichier « ${fichier} » introuvable pour INCLUDE.`, op!.col, op!.texte.length)
        if (++this.profondeurInclude > 16) throw new AsmErreur('Trop de INCLUDE imbriqués (un fichier s’inclut-il lui-même ?).', op!.col, op!.texte.length)
        const parent = this.ligneCourante
        try {
          this.executerLignes(
            texte.replace(/\r\n?/g, '\n').split('\n').map((t, i) => ({ texte: t, ligne: parent.ligne, fichier, ligneFichier: i + 1 }))
          )
        } finally {
          this.profondeurInclude--
          this.ligneCourante = parent
        }
        return
      }
      case 'INCBIN': {
        if (etiquette) this.definirEtiquetteIci(etiquette)
        const fichier = this.nomFichier(exigerOp())
        const octets = this.options.lireBinaire?.(fichier) ?? null
        if (octets === null) throw new AsmErreur(`Fichier « ${fichier} » introuvable pour INCBIN.`, op!.col, op!.texte.length)
        this.emettre(Array.from(octets))
        return
      }
      case 'END':
        throw new FinAssemblage()
      case 'MEXIT':
        throw new SortieMacro()
      case 'FAIL':
        throw new AsmErreur(op ? `FAIL : ${op.texte}` : 'FAIL rencontré.', mnemo.col, 4)
      case 'ENDM':
      case 'ENDR':
        throw new AsmErreur(`${nom} sans ${nom === 'ENDM' ? 'MACRO' : 'REPT'} correspondant.`, mnemo.col, nom.length)
      default:
        if (DIRECTIVES_IGNOREES.has(nom)) {
          // Seule option retenue : OPT D+ / D- (table de symboles dans le .PRG, pour MONST)
          if (nom === 'OPT' && op) {
            for (const o of op.texte.split(',')) {
              const m = /^\s*D([+-])\s*$/i.exec(o)
              if (m) this.debogage = m[1] === '+'
            }
          }
          if (etiquette) this.definirEtiquetteIci(etiquette)
          return
        }
    }
    throw new AsmErreur(`Directive « ${nom} » non prise en charge.`, mnemo.col, nom.length)
  }

  private nomFichier(op: Champ): string {
    return op.texte.trim().replace(/^["'](.*)["']$/, '$1')
  }

  /** Une valeur de DC : chaîne entre guillemets (en .B) ou expression. */
  private donnee(c: Champ, t: number): void {
    const texte = c.texte.trim()
    const col = c.col + (c.texte.length - c.texte.trimStart().length)
    const chaine = /^(['"])(.*)\1$/.exec(texte)
    if (chaine && t === 1) {
      const q = chaine[1]
      const contenu = chaine[2].split(q + q).join(q)
      this.emettre(Array.from(contenu, (ch) => ch.charCodeAt(0) & 0xff))
      return
    }
    const v = evaluer(texte, this.contexteExpression(), col)
    const reloc = v.reloc === 1 && !v.inconnu && !this.absolu
    if (t === 1) {
      if (!v.inconnu && (v.v < -128 || v.v > 255)) throw new AsmErreur(`Valeur hors limites pour DC.B : ${v.v} (permis : -128 à 255).`, col, texte.length)
      this.emettre([v.v])
    } else if (t === 2) {
      if (!v.inconnu && (v.v < -32768 || v.v > 65535)) throw new AsmErreur(`Valeur hors limites pour DC.W : ${v.v} (permis : -32768 à 65535).`, col, texte.length)
      if (reloc && this.options.prg) throw new AsmErreur('Une adresse du programme ne tient pas dans un DC.W relogeable : utilise DC.L.', col, texte.length)
      this.emettre([v.v >> 8, v.v])
    } else {
      this.emettre([v.v >>> 24, v.v >>> 16, v.v >>> 8, v.v], reloc ? [0] : [])
    }
  }

  // --- Résultat ---------------------------------------------------------------------------------

  private resultat(): ResultatAssemblage {
    const symboles: Symbole[] = []
    for (const [nom, d] of this.defs) {
      if (nom === 'NARG') continue
      const v = this.valeurDef(d)
      symboles.push({ nom, valeur: v.v >>> 0, section: this.absolu ? (d.section ? 'TEXT' : undefined) : d.section })
    }

    let binaire: Uint8Array
    let base: number
    let text: Uint8Array = new Uint8Array(0)
    let data: Uint8Array = new Uint8Array(0)
    let bss = 0
    const relocs: number[] = []
    if (this.absolu) {
      const pleins = this.segments.filter((s) => s.octets.length > 0)
      base = pleins.length ? Math.min(...pleins.map((s) => s.debut)) : this.base
      const fin = pleins.length ? Math.max(...pleins.map((s) => s.debut + s.octets.length)) : base
      binaire = new Uint8Array(fin - base)
      for (const s of pleins) binaire.set(s.octets, s.debut - base)
      text = binaire
    } else {
      base = this.base
      const assembler = (nom: NomSection): Uint8Array => {
        const t = new Uint8Array(this.tailles[nom])
        for (const s of this.segments.filter((x) => x.section === nom)) t.set(s.octets, s.debut)
        return t
      }
      text = assembler('TEXT')
      data = assembler('DATA')
      bss = this.tailles.BSS
      // Pas de remplissage final inutile : l'image s'arrête à la fin de la dernière section non vide
      const fin = bss > 0 ? this.basesSection.BSS + bss : data.length > 0 ? this.basesSection.DATA + data.length : base + text.length
      binaire = new Uint8Array(fin - base)
      binaire.set(text, 0)
      if (data.length > 0) binaire.set(data, this.basesSection.DATA - base)
      for (const r of this.relocs) relocs.push(this.basesSection[r.section] - base + r.position)
      relocs.sort((a, b) => a - b)
    }

    return {
      ok: this.erreurs.length === 0,
      erreurs: this.erreurs,
      avertissements: this.avertissements,
      binaire,
      base,
      adresseVersLigne: this.adresseVersLigne,
      symboles,
      relogeable: !this.absolu,
      sections: { text, data, bss },
      relocs,
      debogage: this.debogage
    }
  }
}
