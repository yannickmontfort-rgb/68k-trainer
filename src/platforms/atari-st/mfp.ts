import type { Cpu } from '../../cpu/cpu'
import { CPU_HZ } from './machine'

/**
 * MFP 68901 du ST ($FFFA01-$FFFA2F, adresses impaires) : 16 sources d'interruption de niveau 6
 * (vecteurs $100-$13C quand VR = $48), 4 timers. Seule la partie utile aux programmes du ST est
 * simulée : contrôleur d'interruptions complet (IER, IPR, ISR, IMR, VR), timers A-D en mode
 * « délai », timer B en mode « comptage d'événements » (une fin de ligne affichée = un événement),
 * entrées GPIP (ACIA sur le bit 4).
 * Référence : MC68901 Multi-Function Peripheral (Motorola), Atari ST Hardware Register Listing.
 */

export const MFP_BASE = 0xfffa00
export const MFP_END = 0xfffa30
/** Horloge des timers du MFP : 2,4576 MHz. */
export const MFP_HZ = 2457600
const CYCLES_PAR_TICK = CPU_HZ / MFP_HZ

/** Registres (décalage depuis $FFFA00). */
export const MFP = {
  gpip: 0x01,
  aer: 0x03,
  ddr: 0x05,
  iera: 0x07,
  ierb: 0x09,
  ipra: 0x0b,
  iprb: 0x0d,
  isra: 0x0f,
  isrb: 0x11,
  imra: 0x13,
  imrb: 0x15,
  vr: 0x17,
  tacr: 0x19,
  tbcr: 0x1b,
  tcdcr: 0x1d,
  tadr: 0x1f,
  tbdr: 0x21,
  tcdr: 0x23,
  tddr: 0x25
} as const

/** Canaux d'interruption (0 = priorité la plus basse, 15 = la plus haute). */
export const CANAL = {
  timerD: 4,
  timerC: 5,
  acia: 6,
  timerB: 8,
  timerA: 13
} as const

/** Bit GPIP de chaque canal relié à une entrée. */
const CANAL_GPIP: Record<number, number> = { 0: 0, 1: 1, 2: 2, 3: 3, 6: 4, 7: 5, 14: 6, 15: 7 }

const PRESCALERS = [0, 4, 10, 16, 50, 64, 100, 200]

interface Timer {
  canal: number
  /** Valeur de rechargement (registre de données, 0 = 256). */
  donnee: number
  /** Compteur courant (mode événement) ou valeur au moment de l'arrêt. */
  compteur: number
  /** Mode : 0 = arrêté, 1-7 = délai (prédiviseur), 8 = comptage d'événements. */
  mode: number
  /** Mode délai : cycle processeur de la prochaine expiration. */
  echeance: number
  /** Mode délai : cycles processeur par décrément du compteur. */
  periodeTick: number
}

export class Mfp {
  /** Registres « bruts » (IER, IPR, ISR, IMR, VR, AER, DDR, GPIP en sortie) sur 16 bits A:B. */
  private ier = 0
  private ipr = 0
  private isr = 0
  private imr = 0
  private vr = 0
  private aer = 0
  private ddr = 0
  /** Entrées GPIP vues de l'extérieur (1 = niveau haut). */
  private entrees = 0xff
  private gpipSortie = 0
  private readonly timers: Timer[]
  /** Prochaine échéance de timer en mode délai (Infinity = aucune). */
  private prochaine = Infinity

  constructor(private readonly cpu: () => Cpu) {
    const t = (canal: number): Timer => ({ canal, donnee: 0, compteur: 0, mode: 0, echeance: Infinity, periodeTick: 0 })
    this.timers = [t(CANAL.timerA), t(CANAL.timerB), t(CANAL.timerC), t(CANAL.timerD)]
  }

  reset(): void {
    this.ier = this.ipr = this.isr = this.imr = this.vr = this.aer = this.ddr = this.gpipSortie = 0
    this.entrees = 0xff
    for (const t of this.timers) Object.assign(t, { donnee: 0, compteur: 0, mode: 0, echeance: Infinity, periodeTick: 0 })
    this.prochaine = Infinity
  }

  // --- Contrôleur d'interruptions ---------------------------------------------------

  /** Une source signale un événement : le canal passe « en attente » s'il est autorisé (IER). */
  declencher(canal: number): void {
    if (!(this.ier & (1 << canal))) return
    this.ipr |= 1 << canal
    this.evaluer()
  }

  /** Canal à servir : en attente, non masqué, plus prioritaire que tout canal en service. */
  private canalAServir(): number {
    const candidats = this.ipr & this.imr
    if (!candidats) return -1
    const canal = 31 - Math.clz32(candidats)
    const enService = this.isr ? 31 - Math.clz32(this.isr) : -1
    return canal > enService ? canal : -1
  }

  /** Met à jour la demande d'interruption de niveau 6 vers le processeur. */
  private evaluer(): void {
    const cpu = this.cpu()
    if (this.canalAServir() >= 0) cpu.requestInterrupt(6)
    else cpu.cancelInterrupt(6)
  }

  /** Cycle d'acquittement : fournit le vecteur, passe le canal « en service » (mode EOI logiciel). */
  acquitter(): number {
    const canal = this.canalAServir()
    if (canal < 0) return 24 // interruption parasite
    this.ipr &= ~(1 << canal)
    if (this.vr & 0x08) this.isr |= 1 << canal
    this.evaluer()
    return (this.vr & 0xf0) + canal
  }

  /** Entrée GPIP (bit 0-7) : déclenche le canal sur le front choisi par AER (0 = descendant). */
  entree(bit: number, haut: boolean): void {
    const avant = (this.entrees >> bit) & 1
    const apres = haut ? 1 : 0
    if (avant === apres) return
    this.entrees = haut ? this.entrees | (1 << bit) : this.entrees & ~(1 << bit)
    const frontMontant = ((this.aer >> bit) & 1) === 1
    if (apres === (frontMontant ? 1 : 0)) {
      const canal = Number(Object.keys(CANAL_GPIP).find((c) => CANAL_GPIP[Number(c)] === bit))
      this.declencher(canal)
    }
  }

  // --- Timers ---------------------------------------------------------------------

  private demarrerDelai(t: Timer, maintenant: number): void {
    t.periodeTick = PRESCALERS[t.mode] * CYCLES_PAR_TICK
    t.echeance = maintenant + (t.compteur || 256) * t.periodeTick
  }

  /**
   * Seuls les timers dont l'interruption est autorisée (IER) entrent dans l'agenda : le timer D,
   * horloge de la liaison série à ~300 kHz, ne réveille pas l'émulation tous les 26 cycles.
   */
  private recalculerProchaine(): void {
    this.prochaine = Math.min(
      ...this.timers.map((t) => (t.mode >= 1 && t.mode <= 7 && this.ier & (1 << t.canal) ? t.echeance : Infinity))
    )
  }

  /** Rattrape l'échéance d'un timer sans interruption (calcul direct, sans boucle). */
  private rattraper(t: Timer, maintenant: number): void {
    if (t.echeance > maintenant) return
    const periode = (t.donnee || 256) * t.periodeTick
    const n = Math.floor((maintenant - t.echeance) / periode) + 1
    t.echeance += n * periode
    t.compteur = t.donnee
  }

  /** Valeur actuelle du compteur d'un timer en mode délai. */
  private compteurCourant(t: Timer, maintenant: number): number {
    if (t.mode < 1 || t.mode > 7) return t.compteur & 0xff
    this.rattraper(t, maintenant)
    const reste = Math.ceil((t.echeance - maintenant) / t.periodeTick)
    return Math.max(1, Math.min(256, reste)) & 0xff
  }

  private ecrireControle(t: Timer, mode: number, maintenant: number): void {
    if (t.mode >= 1 && t.mode <= 7) t.compteur = this.compteurCourant(t, maintenant) || 256
    t.mode = mode
    if (mode >= 1 && mode <= 7) this.demarrerDelai(t, maintenant)
    else t.echeance = Infinity
    this.recalculerProchaine()
  }

  private ecrireDonnee(t: Timer, valeur: number, maintenant: number): void {
    t.donnee = valeur
    // Timer arrêté : le compteur est chargé tout de suite ; sinon au prochain passage à zéro
    if (t.mode === 0) t.compteur = valeur
  }

  /** Cycle de la prochaine expiration d'un timer en mode délai (Infinity = aucune). */
  get prochaineEcheance(): number {
    return this.prochaine
  }

  /** Le timer B compte-t-il les lignes (mode événement) ? */
  get timerBCompteLignes(): boolean {
    return this.timers[1].mode === 8
  }

  /** Fait avancer les timers en mode délai jusqu'au cycle `maintenant`. */
  avancer(maintenant: number): void {
    if (maintenant < this.prochaine) return
    for (const t of this.timers) {
      if (t.mode < 1 || t.mode > 7) continue
      if (!(this.ier & (1 << t.canal))) {
        this.rattraper(t, maintenant)
        continue
      }
      while (t.echeance <= maintenant) {
        this.declencher(t.canal)
        t.compteur = t.donnee
        t.echeance += (t.donnee || 256) * t.periodeTick
      }
    }
    this.recalculerProchaine()
  }

  /** Fin d'une ligne affichée : événement pour le timer B (et A) en mode comptage. */
  finDeLigne(): void {
    const t = this.timers[1]
    if (t.mode !== 8) return
    t.compteur = (t.compteur - 1) & 0xff
    if (t.compteur === 0) {
      this.declencher(t.canal)
      t.compteur = t.donnee
    }
  }

  // --- Accès aux registres ----------------------------------------------------------

  lire(adresse: number, maintenant: number): number {
    const r = adresse - MFP_BASE
    switch (r) {
      case MFP.gpip:
        return ((this.entrees & ~this.ddr) | (this.gpipSortie & this.ddr)) & 0xff
      case MFP.aer:
        return this.aer
      case MFP.ddr:
        return this.ddr
      case MFP.iera:
        return this.ier >> 8
      case MFP.ierb:
        return this.ier & 0xff
      case MFP.ipra:
        return this.ipr >> 8
      case MFP.iprb:
        return this.ipr & 0xff
      case MFP.isra:
        return this.isr >> 8
      case MFP.isrb:
        return this.isr & 0xff
      case MFP.imra:
        return this.imr >> 8
      case MFP.imrb:
        return this.imr & 0xff
      case MFP.vr:
        return this.vr
      case MFP.tacr:
        return this.timers[0].mode
      case MFP.tbcr:
        return this.timers[1].mode
      case MFP.tcdcr:
        return (this.timers[2].mode << 4) | this.timers[3].mode
      case MFP.tadr:
        return this.compteurCourant(this.timers[0], maintenant)
      case MFP.tbdr:
        return this.compteurCourant(this.timers[1], maintenant)
      case MFP.tcdr:
        return this.compteurCourant(this.timers[2], maintenant)
      case MFP.tddr:
        return this.compteurCourant(this.timers[3], maintenant)
      default:
        return 0xff
    }
  }

  ecrire(adresse: number, valeur: number, maintenant: number): void {
    const v = valeur & 0xff
    const r = adresse - MFP_BASE
    const haut = (x: number): number => (x & 0x00ff) | (v << 8)
    const bas = (x: number): number => (x & 0xff00) | v
    switch (r) {
      case MFP.gpip:
        this.gpipSortie = v
        break
      case MFP.aer:
        this.aer = v
        break
      case MFP.ddr:
        this.ddr = v
        break
      case MFP.iera:
      case MFP.ierb:
        this.ier = r === MFP.iera ? haut(this.ier) : bas(this.ier)
        // Désactiver un canal efface aussi son attente
        this.ipr &= this.ier
        for (const t of this.timers) this.rattraper(t, maintenant)
        this.recalculerProchaine()
        break
      case MFP.ipra:
        this.ipr &= (v << 8) | 0xff // écrire 0 efface, 1 ne change rien
        break
      case MFP.iprb:
        this.ipr &= 0xff00 | v
        break
      case MFP.isra:
        this.isr &= (v << 8) | 0xff
        break
      case MFP.isrb:
        this.isr &= 0xff00 | v
        break
      case MFP.imra:
      case MFP.imrb:
        this.imr = r === MFP.imra ? haut(this.imr) : bas(this.imr)
        break
      case MFP.vr:
        this.vr = v
        if (!(v & 0x08)) this.isr = 0 // fin d'interruption automatique : plus rien « en service »
        break
      case MFP.tacr:
        this.ecrireControle(this.timers[0], v & 0x0f, maintenant)
        break
      case MFP.tbcr:
        this.ecrireControle(this.timers[1], v & 0x0f, maintenant)
        break
      case MFP.tcdcr:
        this.ecrireControle(this.timers[2], (v >> 4) & 7, maintenant)
        this.ecrireControle(this.timers[3], v & 7, maintenant)
        break
      case MFP.tadr:
        this.ecrireDonnee(this.timers[0], v, maintenant)
        break
      case MFP.tbdr:
        this.ecrireDonnee(this.timers[1], v, maintenant)
        break
      case MFP.tcdr:
        this.ecrireDonnee(this.timers[2], v, maintenant)
        break
      case MFP.tddr:
        this.ecrireDonnee(this.timers[3], v, maintenant)
        break
    }
    this.evaluer()
  }

  /** Recopie les registres dans la mémoire simulée (pour la vue mémoire du débogueur). */
  refleter(cpu: Cpu): void {
    for (let r = 1; r < MFP_END - MFP_BASE; r += 2) cpu.memory.writeU8(MFP_BASE + r, this.lire(MFP_BASE + r, cpu.cycles))
  }
}
