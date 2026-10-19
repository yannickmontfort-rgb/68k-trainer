import type { Cpu } from '../../../cpu/cpu'
import type { CpuSnapshot, MemoryWrite } from '../../../cpu/types'
import { EcranAtari } from './ecran'
import { desassemblerInstruction } from '../../../asm/desassembleur'
import { materielAtari } from '../../../platforms/atari-st/materiel'

/** Vecteurs utiles sur ST : [adresse, nom]. */
const VECTEURS: [number, string][] = [
  [0x08, 'Erreur de bus (2 bombes)'],
  [0x0c, "Erreur d'adresse (3 bombes)"],
  [0x10, 'Instruction illégale (4)'],
  [0x20, 'Violation de privilège (8)'],
  [0x68, 'HBL (niveau 2)'],
  [0x70, 'VBL (niveau 4)'],
  [0x84, 'TRAP #1 (GEMDOS)'],
  [0xb4, 'TRAP #13 (BIOS)'],
  [0xb8, 'TRAP #14 (XBIOS)'],
  [0x114, 'MFP timer C (200 Hz)'],
  [0x118, 'MFP ACIA clavier'],
  [0x120, 'MFP timer B'],
  [0x134, 'MFP timer A']
]

/** Registres du MFP affichés : [décalage depuis $FFFA00, nom]. */
const REGISTRES_MFP: [number, string][] = [
  [0x07, 'IERA'], [0x09, 'IERB'], [0x0b, 'IPRA'], [0x0d, 'IPRB'], [0x0f, 'ISRA'], [0x11, 'ISRB'],
  [0x13, 'IMRA'], [0x15, 'IMRB'], [0x17, 'VR'], [0x19, 'TACR'], [0x1f, 'TADR'], [0x1b, 'TBCR'],
  [0x21, 'TBDR'], [0x1d, 'TCDCR'], [0x23, 'TCDR']
]

const hex = (value: number, digits = 8): string => '$' + (value >>> 0).toString(16).toUpperCase().padStart(digits, '0')

export interface DebogueurOptions {
  ecran?: boolean
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
  private readonly ecran?: EcranAtari
  private precedent: CpuSnapshot | null = null
  private cpu: Cpu | null = null

  constructor(options: DebogueurOptions = {}) {
    this.element = document.createElement('div')
    this.element.className = 'debogueur'
    this.element.innerHTML = `
      <div class="dbg-bloc dbg-ecran-bloc" hidden><h4>Écran</h4></div>
      <div class="dbg-bloc"><h4>Registres</h4><div class="dbg-regs"></div></div>
      <div class="dbg-bloc"><h4>Registre d'état (SR)</h4><div class="dbg-sr"></div></div>
      <div class="dbg-bloc"><h4>Désassemblage (à partir du PC)</h4><div class="dbg-desasm"></div></div>
      <div class="dbg-bloc"><h4>Pile (sommet = A7)</h4><div class="dbg-pile"></div></div>
      <div class="dbg-bloc"><h4>Mémoire <label>à $<input class="dbg-mem-adr" value="${(options.adresseMemoire ?? 0x1000).toString(16).toUpperCase()}" size="7" /></label></h4><div class="dbg-mem"></div></div>
      <div class="dbg-bloc"><h4>Sortie texte</h4><pre class="dbg-sortie"></pre></div>
      <details class="dbg-bloc dbg-materiel"><summary>Vecteurs et matériel</summary><div class="dbg-materiel-contenu"></div></details>
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
      this.ecran = new EcranAtari()
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
      cells.push(cell(name, snap.a[i], !!prev && prev.a[i] !== snap.a[i], i === 7 ? 'Pointeur de pile actif' : ''))
    }
    cells.push(cell('PC', snap.pc, !!prev && prev.pc !== snap.pc, 'Adresse de la prochaine instruction'))
    cells.push(cell('USP', snap.usp, !!prev && prev.usp !== snap.usp, 'Pile utilisateur'))
    cells.push(cell('SSP', snap.ssp, !!prev && prev.ssp !== snap.ssp, 'Pile superviseur'))
    this.regsEl.innerHTML = cells.join('')

    const bits: [string, boolean, string][] = [
      ['T', (snap.sr & 0x8000) !== 0, 'Trace (pas à pas matériel)'],
      ['S', snap.supervisor, 'Superviseur (1) ou utilisateur (0)'],
      ['I', false, ''],
      ['X', snap.flags.x, 'Extension (retenue pour ADDX/SUBX)'],
      ['N', snap.flags.n, 'Négatif : bit de poids fort du résultat'],
      ['Z', snap.flags.z, 'Zéro : le résultat vaut 0'],
      ['V', snap.flags.v, 'Débordement signé (oVerflow)'],
      ['C', snap.flags.c, 'Retenue (Carry)']
    ]
    const prevSr = prev?.sr
    this.srEl.innerHTML =
      `<code class="dbg-sr-hex${prevSr !== undefined && prevSr !== snap.sr ? ' change' : ''}">${hex(snap.sr, 4)}</code> ` +
      bits
        .map(([n, on, title]) =>
          n === 'I'
            ? `<span class="dbg-flag masque" title="Masque d'interruption">I=${(snap.sr >> 8) & 7}</span>`
            : `<span class="dbg-flag${on ? ' actif' : ''}" title="${title}">${n}</span>`
        )
        .join('') +
      `<span class="dbg-mode">${snap.supervisor ? 'superviseur' : 'utilisateur'}${snap.stopped ? ' · STOP' : ''}</span>` +
      `<div class="dbg-temps" title="Approximation : 4 cycles par accès mémoire, plus les calculs longs (MUL, DIV, décalages). Un ST tourne à 8 MHz et affiche 50 images par seconde (160 256 cycles par image).">` +
      `${cpu.cycles.toLocaleString('fr-FR')} cycles · ${(cpu.cycles / 8010.612).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} ms · image n° ${Math.floor(cpu.cycles / 160256)}</div>`

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
    const parties: string[] = ['<h5>Vecteurs</h5>']
    for (const [adresse, nom] of VECTEURS) parties.push(cle(`${hex(adresse, 3)} ${nom}`, hex(mem.readU32(adresse), 6)))
    parties.push('<h5>Variables système</h5>')
    parties.push(cle('$466 _frclock (trames)', String(mem.readU32(0x466))))
    parties.push(cle('$4BA _hz_200', String(mem.readU32(0x4ba))))
    parties.push(cle('$44E _v_bas_ad (écran logique)', hex(mem.readU32(0x44e), 6)))
    parties.push(cle('$FF8201/03 écran affiché', hex((mem.readU8(0xff8201) << 16) | (mem.readU8(0xff8203) << 8), 6)))
    const m = materielAtari(cpu)
    if (m) {
      parties.push('<h5>MFP 68901 ($FFFA01…)</h5><div class="dbg-grille">')
      for (const [r, nom] of REGISTRES_MFP) parties.push(cle(nom, hex(m.mfp.lire(0xfffa00 + r, cpu.cycles), 2), `$FFFA${r.toString(16).toUpperCase().padStart(2, '0')}`))
      parties.push('</div><h5>YM2149 (registres 0-13)</h5><div class="dbg-grille">')
      for (let r = 0; r < 14; r++) parties.push(cle(`R${r}`, hex(m.psg.etat.registres[r], 2)))
      parties.push('</div>')
    }
    contenu.innerHTML = parties.join('')
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
