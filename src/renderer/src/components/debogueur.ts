import type { Cpu } from '../../../cpu/cpu'
import type { CpuSnapshot, MemoryWrite } from '../../../cpu/types'
import { EcranAtari } from './ecran'
import { EcranAmiga } from './ecranAmiga'
import { desassemblerInstruction } from '../../../asm/desassembleur'
import { materielAtari } from '../../../platforms/atari-st/materiel'
import { materielAmiga } from '../../../platforms/amiga/chipset'
import { R, nomRegistre } from '../../../platforms/amiga/machine'
import { MACHINES, type Machine } from '../../../shared/machines'
import { langueCourante, traducteur } from '../langue'

const t = traducteur({
  fr: {
    ecran: 'Écran',
    registres: 'Registres',
    registreEtat: "Registre d'état (SR)",
    desassemblage: 'Désassemblage (à partir du PC)',
    pile: 'Pile (sommet = A7)',
    memoire: 'Mémoire',
    memoireA: 'à $',
    sortieTexte: 'Sortie texte',
    materiel: 'Vecteurs et matériel',
    pileActive: 'Pointeur de pile actif',
    prochaineInstruction: 'Adresse de la prochaine instruction',
    pileUtilisateur: 'Pile utilisateur',
    pileSuperviseur: 'Pile superviseur',
    bitT: 'Trace (pas à pas matériel)',
    bitS: 'Superviseur (1) ou utilisateur (0)',
    bitX: 'Extension (retenue pour ADDX/SUBX)',
    bitN: 'Négatif : bit de poids fort du résultat',
    bitZ: 'Zéro : le résultat vaut 0',
    bitV: 'Débordement signé (oVerflow)',
    bitC: 'Retenue (Carry)',
    masque: "Masque d'interruption",
    superviseur: 'superviseur',
    utilisateur: 'utilisateur',
    temps: '{cycles} cycles · {ms} ms · image n° {image}',
    titreTemps:
      'Approximation : 4 cycles par accès mémoire, plus les calculs longs (MUL, DIV, décalages). Un {modele} tourne à {mhz} MHz et affiche 50 images par seconde ({cycles} cycles par image).',
    faisceau: ' · faisceau : ligne ${v}, h ${h}',
    vecteurs: 'Vecteurs',
    variablesSysteme: 'Variables système',
    frclock: '$466 _frclock (trames)',
    vbasad: '$44E _v_bas_ad (écran logique)',
    ecranAffiche: '$FF8201/03 écran affiché',
    ym: 'YM2149 (registres 0-13)',
    'vec-bus2': 'Erreur de bus (2 bombes)',
    'vec-adresse3': "Erreur d'adresse (3 bombes)",
    'vec-illegale4': 'Instruction illégale (4)',
    'vec-privilege8': 'Violation de privilège (8)',
    'vec-hbl': 'HBL (niveau 2)',
    'vec-vbl': 'VBL (niveau 4)',
    'vec-trap1': 'TRAP #1 (GEMDOS)',
    'vec-trap13': 'TRAP #13 (BIOS)',
    'vec-trap14': 'TRAP #14 (XBIOS)',
    'vec-timerC': 'MFP timer C (200 Hz)',
    'vec-acia': 'MFP ACIA clavier',
    'vec-timerB': 'MFP timer B',
    'vec-timerA': 'MFP timer A',
    'vec-execbase': 'ExecBase (pas un vecteur)',
    'vec-bus': 'Erreur de bus',
    'vec-adresse': "Erreur d'adresse",
    'vec-illegale': 'Instruction illégale',
    'vec-privilege': 'Violation de privilège',
    'vec-niveau1': 'Niveau 1 (disque, série, logiciel)',
    'vec-niveau2': 'Niveau 2 (CIA-A : clavier, timers)',
    'vec-niveau3': 'Niveau 3 (VBL, Copper, Blitter)',
    'vec-niveau4': 'Niveau 4 (son, Paula)',
    'vec-niveau5': 'Niveau 5 (série, disque)',
    'vec-niveau6': 'Niveau 6 (CIA-B)',
    dmaInterruptions: 'DMA et interruptions',
    listeCopper: 'Liste Copper relue à chaque image',
    occupe: 'occupé',
    libre: 'libre',
    affichage: 'Affichage',
    couleurs: 'Couleurs (COLOR00 à COLOR31)',
    enMarche: 'en marche',
    arrete: 'arrêté',
    remarques: 'Remarques'
  },
  en: {
    ecran: 'Screen',
    registres: 'Registers',
    registreEtat: 'Status register (SR)',
    desassemblage: 'Disassembly (from the PC)',
    pile: 'Stack (top = A7)',
    memoire: 'Memory',
    memoireA: 'at $',
    sortieTexte: 'Text output',
    materiel: 'Vectors and hardware',
    pileActive: 'Active stack pointer',
    prochaineInstruction: 'Address of the next instruction',
    pileUtilisateur: 'User stack',
    pileSuperviseur: 'Supervisor stack',
    bitT: 'Trace (hardware single-stepping)',
    bitS: 'Supervisor (1) or user (0)',
    bitX: 'Extend (carry for ADDX/SUBX)',
    bitN: 'Negative: most significant bit of the result',
    bitZ: 'Zero: the result is 0',
    bitV: 'Signed overflow',
    bitC: 'Carry',
    masque: 'Interrupt mask',
    superviseur: 'supervisor',
    utilisateur: 'user',
    temps: '{cycles} cycles · {ms} ms · frame {image}',
    titreTemps:
      'Approximation: 4 cycles per memory access, plus the long operations (MUL, DIV, shifts). A {modele} runs at {mhz} MHz and displays 50 frames per second ({cycles} cycles per frame).',
    faisceau: ' · beam: line ${v}, h ${h}',
    vecteurs: 'Vectors',
    variablesSysteme: 'System variables',
    frclock: '$466 _frclock (frames)',
    vbasad: '$44E _v_bas_ad (logical screen)',
    ecranAffiche: '$FF8201/03 displayed screen',
    ym: 'YM2149 (registers 0-13)',
    'vec-bus2': 'Bus error (2 bombs)',
    'vec-adresse3': 'Address error (3 bombs)',
    'vec-illegale4': 'Illegal instruction (4)',
    'vec-privilege8': 'Privilege violation (8)',
    'vec-hbl': 'HBL (level 2)',
    'vec-vbl': 'VBL (level 4)',
    'vec-trap1': 'TRAP #1 (GEMDOS)',
    'vec-trap13': 'TRAP #13 (BIOS)',
    'vec-trap14': 'TRAP #14 (XBIOS)',
    'vec-timerC': 'MFP timer C (200 Hz)',
    'vec-acia': 'MFP keyboard ACIA',
    'vec-timerB': 'MFP timer B',
    'vec-timerA': 'MFP timer A',
    'vec-execbase': 'ExecBase (not a vector)',
    'vec-bus': 'Bus error',
    'vec-adresse': 'Address error',
    'vec-illegale': 'Illegal instruction',
    'vec-privilege': 'Privilege violation',
    'vec-niveau1': 'Level 1 (disk, serial, software)',
    'vec-niveau2': 'Level 2 (CIA-A: keyboard, timers)',
    'vec-niveau3': 'Level 3 (VBL, Copper, Blitter)',
    'vec-niveau4': 'Level 4 (sound, Paula)',
    'vec-niveau5': 'Level 5 (serial, disk)',
    'vec-niveau6': 'Level 6 (CIA-B)',
    dmaInterruptions: 'DMA and interrupts',
    listeCopper: 'Copper list reread every frame',
    occupe: 'busy',
    libre: 'idle',
    affichage: 'Display',
    couleurs: 'Colors (COLOR00 to COLOR31)',
    enMarche: 'running',
    arrete: 'stopped',
    remarques: 'Notes'
  }
})

type CleTexte = Parameters<typeof t>[0]

/** Format des nombres affichés : celui de la langue de l'interface. */
const nombre = (n: number, options?: Intl.NumberFormatOptions): string =>
  n.toLocaleString(langueCourante() === 'en' ? 'en-US' : 'fr-FR', options)

/** Vecteurs utiles sur ST : [adresse, nom]. */
const VECTEURS: [number, CleTexte][] = [
  [0x08, 'vec-bus2'],
  [0x0c, 'vec-adresse3'],
  [0x10, 'vec-illegale4'],
  [0x20, 'vec-privilege8'],
  [0x68, 'vec-hbl'],
  [0x70, 'vec-vbl'],
  [0x84, 'vec-trap1'],
  [0xb4, 'vec-trap13'],
  [0xb8, 'vec-trap14'],
  [0x114, 'vec-timerC'],
  [0x118, 'vec-acia'],
  [0x120, 'vec-timerB'],
  [0x134, 'vec-timerA']
]

/** Registres du MFP affichés : [décalage depuis $FFFA00, nom]. */
const REGISTRES_MFP: [number, string][] = [
  [0x07, 'IERA'], [0x09, 'IERB'], [0x0b, 'IPRA'], [0x0d, 'IPRB'], [0x0f, 'ISRA'], [0x11, 'ISRB'],
  [0x13, 'IMRA'], [0x15, 'IMRB'], [0x17, 'VR'], [0x19, 'TACR'], [0x1f, 'TADR'], [0x1b, 'TBCR'],
  [0x21, 'TBDR'], [0x1d, 'TCDCR'], [0x23, 'TCDR']
]

/** Vecteurs utiles sur Amiga : [adresse, nom]. */
const VECTEURS_AMIGA: [number, CleTexte][] = [
  [0x04, 'vec-execbase'],
  [0x08, 'vec-bus'],
  [0x0c, 'vec-adresse'],
  [0x10, 'vec-illegale'],
  [0x20, 'vec-privilege'],
  [0x64, 'vec-niveau1'],
  [0x68, 'vec-niveau2'],
  [0x6c, 'vec-niveau3'],
  [0x70, 'vec-niveau4'],
  [0x74, 'vec-niveau5'],
  [0x78, 'vec-niveau6']
]

/** Registres custom affichés : dernière valeur écrite. */
const REGISTRES_AMIGA = [R.BPLCON0, R.BPLCON1, R.BPLCON2, R.DIWSTRT, R.DIWSTOP, R.DDFSTRT, R.DDFSTOP, R.BPL1MOD, R.BPL2MOD, R.BLTCON0, R.BLTCON1, R.BLTSIZE]
const BITS_DMA = ['AUD0', 'AUD1', 'AUD2', 'AUD3', 'DSK', 'SPR', 'BLT', 'COP', 'BPL', 'DMAEN', 'BLTPRI']
const BITS_INT = ['TBE', 'DSKBLK', 'SOFT', 'PORTS', 'COPER', 'VERTB', 'BLIT', 'AUD0', 'AUD1', 'AUD2', 'AUD3', 'RBF', 'DSKSYN', 'EXTER', 'INTEN']

const hex = (value: number, digits = 8): string => '$' + (value >>> 0).toString(16).toUpperCase().padStart(digits, '0')

export interface DebogueurOptions {
  ecran?: boolean
  /** Machine simulée (écran, panneau du matériel) : Atari ST par défaut. */
  machine?: Machine
  /** Adresse affichée au départ dans la vue mémoire. */
  adresseMemoire?: number
}

/**
 * Panneau d'état du processeur, réutilisé par l'exemple corrigé, l'exercice et la prédiction :
 * registres (les valeurs qui viennent de changer sont surlignées), SR détaillé bit par bit, pile,
 * zone mémoire, sortie texte et, en option, l'écran Atari.
 */
export class Debogueur {
  readonly element: HTMLDivElement
  private readonly regsEl: HTMLDivElement
  private readonly srEl: HTMLDivElement
  private readonly pileEl: HTMLDivElement
  private readonly memEl: HTMLDivElement
  private readonly memInput: HTMLInputElement
  private readonly sortieEl: HTMLPreElement
  private readonly desasmEl: HTMLDivElement
  private readonly materielEl: HTMLDetailsElement
  private readonly ecran?: EcranAtari | EcranAmiga
  private readonly machine: Machine
  private precedent: CpuSnapshot | null = null
  private cpu: Cpu | null = null

  constructor(options: DebogueurOptions = {}) {
    this.machine = options.machine ?? 'atari'
    this.element = document.createElement('div')
    this.element.className = 'debogueur'
    this.element.innerHTML = `
      <div class="dbg-bloc dbg-ecran-bloc" hidden><h4>${t('ecran')}</h4></div>
      <div class="dbg-bloc"><h4>${t('registres')}</h4><div class="dbg-regs"></div></div>
      <div class="dbg-bloc"><h4>${t('registreEtat')}</h4><div class="dbg-sr"></div></div>
      <div class="dbg-bloc"><h4>${t('desassemblage')}</h4><div class="dbg-desasm"></div></div>
      <div class="dbg-bloc"><h4>${t('pile')}</h4><div class="dbg-pile"></div></div>
      <div class="dbg-bloc"><h4>${t('memoire')} <label>${t('memoireA')}<input class="dbg-mem-adr" value="${(options.adresseMemoire ?? 0x1000).toString(16).toUpperCase()}" size="7" /></label></h4><div class="dbg-mem"></div></div>
      <div class="dbg-bloc"><h4>${t('sortieTexte')}</h4><pre class="dbg-sortie"></pre></div>
      <details class="dbg-bloc dbg-materiel"><summary>${t('materiel')}</summary><div class="dbg-materiel-contenu"></div></details>
    `
    this.regsEl = this.element.querySelector('.dbg-regs')!
    this.srEl = this.element.querySelector('.dbg-sr')!
    this.pileEl = this.element.querySelector('.dbg-pile')!
    this.memEl = this.element.querySelector('.dbg-mem')!
    this.memInput = this.element.querySelector('.dbg-mem-adr')!
    this.sortieEl = this.element.querySelector('.dbg-sortie')!
    this.desasmEl = this.element.querySelector('.dbg-desasm')!
    this.materielEl = this.element.querySelector('.dbg-materiel')!
    this.materielEl.addEventListener('toggle', () => this.cpu && this.renderMateriel())
    this.memInput.addEventListener('change', () => this.cpu && this.renderMemoire([]))
    if (options.ecran) {
      this.ecran = this.machine === 'amiga' ? new EcranAmiga() : new EcranAtari()
      const bloc = this.element.querySelector<HTMLDivElement>('.dbg-ecran-bloc')!
      bloc.hidden = false
      bloc.appendChild(this.ecran.element)
    }
  }

  /** Associe un nouveau processeur (après un assemblage) : plus de surlignage des changements. */
  attacher(cpu: Cpu): void {
    this.cpu = cpu
    this.precedent = null
    this.rafraichir([])
  }

  setAdresseMemoire(address: number): void {
    this.memInput.value = address.toString(16).toUpperCase()
  }

  rafraichir(writes: MemoryWrite[] = []): void {
    const cpu = this.cpu
    if (!cpu) return
    const snap = cpu.getSnapshot()
    const prev = this.precedent
    const cell = (name: string, value: number, changed: boolean, title = ''): string =>
      `<div class="dbg-reg${changed ? ' change' : ''}" title="${title}"><span>${name}</span><code>${hex(value)}</code></div>`

    const cells: string[] = []
    for (let i = 0; i < 8; i++) cells.push(cell(`D${i}`, snap.d[i], !!prev && prev.d[i] !== snap.d[i]))
    for (let i = 0; i < 8; i++) {
      const name = i === 7 ? 'A7/SP' : `A${i}`
      cells.push(cell(name, snap.a[i], !!prev && prev.a[i] !== snap.a[i], i === 7 ? t('pileActive') : ''))
    }
    cells.push(cell('PC', snap.pc, !!prev && prev.pc !== snap.pc, t('prochaineInstruction')))
    cells.push(cell('USP', snap.usp, !!prev && prev.usp !== snap.usp, t('pileUtilisateur')))
    cells.push(cell('SSP', snap.ssp, !!prev && prev.ssp !== snap.ssp, t('pileSuperviseur')))
    this.regsEl.innerHTML = cells.join('')

    const bits: [string, boolean, string][] = [
      ['T', (snap.sr & 0x8000) !== 0, t('bitT')],
      ['S', snap.supervisor, t('bitS')],
      ['I', false, ''],
      ['X', snap.flags.x, t('bitX')],
      ['N', snap.flags.n, t('bitN')],
      ['Z', snap.flags.z, t('bitZ')],
      ['V', snap.flags.v, t('bitV')],
      ['C', snap.flags.c, t('bitC')]
    ]
    const prevSr = prev?.sr
    this.srEl.innerHTML =
      `<code class="dbg-sr-hex${prevSr !== undefined && prevSr !== snap.sr ? ' change' : ''}">${hex(snap.sr, 4)}</code> ` +
      bits
        .map(([n, on, title]) =>
          n === 'I'
            ? `<span class="dbg-flag masque" title="${t('masque')}">I=${(snap.sr >> 8) & 7}</span>`
            : `<span class="dbg-flag${on ? ' actif' : ''}" title="${title}">${n}</span>`
        )
        .join('') +
      `<span class="dbg-mode">${snap.supervisor ? t('superviseur') : t('utilisateur')}${snap.stopped ? ' · STOP' : ''}</span>` +
      `<div class="dbg-temps" title="${this.titreTemps()}">` +
      `${t('temps', {
        cycles: nombre(cpu.cycles),
        ms: nombre(cpu.cycles / (MACHINES[this.machine].cpuHz / 1000), { maximumFractionDigits: 1 }),
        image: Math.floor(cpu.cycles / MACHINES[this.machine].cyclesParImage)
      })}${this.faisceau(cpu)}</div>`

    const lignesPile: string[] = []
    for (let i = 0; i < 6; i++) {
      const addr = (snap.a[7] + i * 4) & 0xffffff
      const value = addr + 3 < cpu.memory.size ? cpu.memory.readU32(addr & ~1) : 0
      lignesPile.push(`<div class="dbg-pile-ligne${i === 0 ? ' sommet' : ''}"><span>${hex(addr, 6)}</span><code>${hex(value)}</code></div>`)
    }
    this.pileEl.innerHTML = lignesPile.join('')

    this.renderMemoire(writes)
    this.renderDesassemblage()
    this.renderMateriel()
    this.sortieEl.textContent = cpu.output.replace(/\r/g, '')
    this.ecran?.draw(cpu)
    this.precedent = snap
  }

  private titreTemps(): string {
    const m = MACHINES[this.machine]
    return t('titreTemps', {
      modele: m.modele,
      mhz: nombre(m.cpuHz / 1e6, { maximumFractionDigits: 2 }),
      cycles: nombre(m.cyclesParImage)
    })
  }

  /** Amiga : position du faisceau (ligne, position horizontale), comme VHPOSR. */
  private faisceau(cpu: Cpu): string {
    const m = this.machine === 'amiga' ? materielAmiga(cpu) : undefined
    if (!m) return ''
    const { v, h } = m.faisceau()
    return t('faisceau', { v: v.toString(16).toUpperCase(), h: h.toString(16).toUpperCase() })
  }

  /** Les instructions à partir du PC, telles que le processeur va les lire. */
  private renderDesassemblage(): void {
    const cpu = this.cpu!
    const lire16 = (a: number): number => cpu.memory.readU16(a & 0xfffffe)
    const lignes: string[] = []
    let adresse = cpu.pc & 0xffffff
    for (let i = 0; i < 6 && adresse < cpu.memory.size - 10; i++) {
      const ins = desassemblerInstruction(lire16, adresse)
      const texte = `${ins.mnemo}${ins.operandes ? ' ' + ins.operandes : ''}`
      lignes.push(
        `<div class="dbg-desasm-ligne${i === 0 ? ' courante' : ''}"><span>${hex(adresse, 6)}</span><code>${texte.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</code></div>`
      )
      adresse += Math.max(2, ins.taille)
    }
    this.desasmEl.innerHTML = lignes.join('')
  }

  /** Vecteurs d'exception et registres du matériel (seulement quand le panneau est ouvert). */
  private renderMateriel(): void {
    if (!this.materielEl.open) return
    const cpu = this.cpu!
    const mem = cpu.memory
    const contenu = this.materielEl.querySelector<HTMLDivElement>('.dbg-materiel-contenu')!
    const cle = (nom: string, valeur: string, titre = ''): string =>
      `<div class="dbg-pile-ligne" title="${titre}"><span>${nom}</span><code>${valeur}</code></div>`
    if (this.machine === 'amiga') {
      contenu.innerHTML = this.materielAmiga(cpu, cle)
      return
    }
    const parties: string[] = [`<h5>${t('vecteurs')}</h5>`]
    for (const [adresse, nom] of VECTEURS) parties.push(cle(`${hex(adresse, 3)} ${t(nom)}`, hex(mem.readU32(adresse), 6)))
    parties.push(`<h5>${t('variablesSysteme')}</h5>`)
    parties.push(cle(t('frclock'), String(mem.readU32(0x466))))
    parties.push(cle('$4BA _hz_200', String(mem.readU32(0x4ba))))
    parties.push(cle(t('vbasad'), hex(mem.readU32(0x44e), 6)))
    parties.push(cle(t('ecranAffiche'), hex((mem.readU8(0xff8201) << 16) | (mem.readU8(0xff8203) << 8), 6)))
    const m = materielAtari(cpu)
    if (m) {
      parties.push('<h5>MFP 68901 ($FFFA01…)</h5><div class="dbg-grille">')
      for (const [r, nom] of REGISTRES_MFP) parties.push(cle(nom, hex(m.mfp.lire(0xfffa00 + r, cpu.cycles), 2), `$FFFA${r.toString(16).toUpperCase().padStart(2, '0')}`))
      parties.push(`</div><h5>${t('ym')}</h5><div class="dbg-grille">`)
      for (let r = 0; r < 14; r++) parties.push(cle(`R${r}`, hex(m.psg.etat.registres[r], 2)))
      parties.push('</div>')
    }
    contenu.innerHTML = parties.join('')
  }

  private materielAmiga(cpu: Cpu, cle: (nom: string, valeur: string, titre?: string) => string): string {
    const mem = cpu.memory
    const parties: string[] = [`<h5>${t('vecteurs')}</h5>`]
    for (const [adresse, nom] of VECTEURS_AMIGA) parties.push(cle(`${hex(adresse, 3)} ${t(nom)}`, hex(mem.readU32(adresse), 6)))
    const m = materielAmiga(cpu)
    if (!m) return parties.join('')
    const lireLong = (d: number): number => ((m.regs[d >> 1] << 16) | m.regs[(d >> 1) + 1]) >>> 0
    const bits = (v: number, noms: string[]): string => noms.filter((n, i) => v & (1 << i)).join(' ') || '—'
    parties.push(`<h5>${t('dmaInterruptions')}</h5>`)
    parties.push(cle('DMACON', hex(m.dmacon(), 4), bits(m.dmacon(), BITS_DMA)))
    parties.push(cle('INTENA', hex(m.intena(), 4), bits(m.intena(), BITS_INT)))
    parties.push(cle('INTREQ', hex(m.intreq(), 4), bits(m.intreq(), BITS_INT)))
    parties.push(cle('COP1LC', hex(lireLong(R.COP1LCH), 6), t('listeCopper')))
    parties.push(cle('Blitter', m.blitterOccupe() ? t('occupe') : t('libre')))
    parties.push(`<h5>${t('affichage')}</h5><div class="dbg-grille">`)
    for (const d of REGISTRES_AMIGA) parties.push(cle(nomRegistre(d), hex(m.regs[d >> 1], 4), `$DFF${d.toString(16).toUpperCase().padStart(3, '0')}`))
    parties.push(`</div><h5>${t('couleurs')}</h5><div class="dbg-couleurs">`)
    for (let i = 0; i < 32; i++) {
      const c = m.regs[(R.COLOR00 >> 1) + i] & 0xfff
      parties.push(`<span class="dbg-couleur" style="background:#${c.toString(16).padStart(3, '0')}" title="COLOR${String(i).padStart(2, '0')} = ${hex(c, 3)}"></span>`)
    }
    const timers = (nom: string, e: { ta: number; tb: number; taMarche: boolean; tbMarche: boolean }): string =>
      `<h5>${nom}</h5><div class="dbg-grille">` +
      cle('Timer A', hex(e.ta, 4), e.taMarche ? t('enMarche') : t('arrete')) +
      cle('Timer B', hex(e.tb, 4), e.tbMarche ? t('enMarche') : t('arrete')) +
      '</div>'
    parties.push('</div>', timers('CIA-A ($BFE001)', m.ciaA.etatTimers()), timers('CIA-B ($BFD000)', m.ciaB.etatTimers()))
    if (m.alertes.length) parties.push(`<h5>${t('remarques')}</h5>` +
 m.alertes.map((a) => `<p class="dbg-alerte">⚠ ${a.replace(/</g, '&lt;')}</p>`).join(''))
    return parties.join('')
  }

  private renderMemoire(writes: MemoryWrite[]): void {
    const cpu = this.cpu!
    const written = new Set<number>()
    for (const w of writes) for (let i = 0; i < w.size; i++) written.add(w.address + i)
    let base = parseInt(this.memInput.value, 16)
    if (Number.isNaN(base)) base = 0
    base &= 0xfffff0
    const lines: string[] = []
    for (let row = 0; row < 8; row++) {
      const rowAddr = base + row * 16
      let line = `<span class="dbg-adr">${rowAddr.toString(16).toUpperCase().padStart(6, '0')}</span> `
      for (let col = 0; col < 16; col++) {
        const addr = rowAddr + col
        const v = addr < cpu.memory.size ? cpu.memory.readU8(addr) : 0
        line += `<span class="${written.has(addr) ? 'ecrit' : ''}">${v.toString(16).toUpperCase().padStart(2, '0')}</span>${col === 7 ? '  ' : ' '}`
      }
      lines.push(line)
    }
    this.memEl.innerHTML = lines.join('<br>')
  }
}
