/**
 * CIA 8520 (deux sur l'Amiga). CIA-A : ports du joystick/souris (boutons), clavier (registre série),
 * timers, compteur TOD des images ; interruption de niveau 2 (PORTS). CIA-B : timers (musique),
 * TOD des lignes ; interruption de niveau 6 (EXTER). Les timers comptent l'horloge E (CPU ÷ 10).
 */

/** Numéros des 16 registres (CIA-A : $BFE001 + n × $100 ; CIA-B : $BFD000 + n × $100). */
export const CIA_REG = {
  PRA: 0,
  PRB: 1,
  DDRA: 2,
  DDRB: 3,
  TALO: 4,
  TAHI: 5,
  TBLO: 6,
  TBHI: 7,
  TODLO: 8,
  TODMID: 9,
  TODHI: 10,
  SDR: 12,
  ICR: 13,
  CRA: 14,
  CRB: 15
} as const

export const NOMS_CIA = ['PRA', 'PRB', 'DDRA', 'DDRB', 'TALO', 'TAHI', 'TBLO', 'TBHI', 'TODLO', 'TODMID', 'TODHI', '-', 'SDR', 'ICR', 'CRA', 'CRB']

/** Bits de l'ICR. */
export const ICR = { TA: 0x01, TB: 0x02, ALRM: 0x04, SP: 0x08, FLG: 0x10, IR: 0x80 } as const

class Timer {
  latch = 0xffff
  compte = 0xffff
  marche = false
  unCoup = false

  /** Avance de `n` tops ; renvoie vrai s'il y a eu au moins un passage par zéro. */
  avancer(n: number): boolean {
    if (!this.marche || n <= 0) return false
    if (n <= this.compte) {
      this.compte -= n
      return false
    }
    n -= this.compte + 1
    if (this.unCoup) {
      this.marche = false
      this.compte = this.latch
      return true
    }
    const periode = this.latch + 1
    this.compte = this.latch - (n % periode)
    return true
  }

  /** Tops avant le prochain passage par zéro (Infinity si arrêté). */
  restant(): number {
    return this.marche ? this.compte + 1 : Infinity
  }
}

export class Cia {
  private readonly ta = new Timer()
  private readonly tb = new Timer()
  pra = 0
  prb = 0
  ddra = 0
  ddrb = 0
  cra = 0
  crb = 0
  sdr = 0
  /** Événements survenus (bits 0-4) et masque d'interruption. */
  icrDonnees = 0
  icrMasque = 0
  tod = 0
  alarme = 0
  private todVerrou: number | null = null
  private dernierTop = 0

  constructor(
    /** Valeur lue sur les broches du port A/B quand elles sont en entrée. */
    private readonly entreesA: () => number,
    private readonly entreesB: () => number,
    /** La CIA demande une interruption (ligne /INT). */
    private readonly demande: () => void
  ) {}

  reset(cycles: number): void {
    this.ta.latch = this.ta.compte = 0xffff
    this.tb.latch = this.tb.compte = 0xffff
    this.ta.marche = this.tb.marche = false
    this.pra = this.prb = this.ddra = this.ddrb = this.cra = this.crb = this.sdr = 0
    this.icrDonnees = this.icrMasque = 0
    this.tod = this.alarme = 0
    this.todVerrou = null
    this.dernierTop = Math.floor(cycles / 10)
  }

  private signaler(bits: number): void {
    this.icrDonnees |= bits
    if (bits & this.icrMasque) this.demande()
  }

  /** Avance les timers jusqu'au cycle `cycles` du 68000. */
  avancer(cycles: number): void {
    const top = Math.floor(cycles / 10)
    const n = top - this.dernierTop
    if (n <= 0) return
    this.dernierTop = top
    const aZero = this.ta.avancer(n)
    if (aZero) {
      this.cra = this.ta.marche ? this.cra : this.cra & ~1
      this.signaler(ICR.TA)
    }
    if (this.tb.avancer(n)) {
      this.crb = this.tb.marche ? this.crb : this.crb & ~1
      this.signaler(ICR.TB)
    }
  }

  /** Cycle du 68000 du prochain passage par zéro d'un timer dont l'interruption est autorisée. */
  prochaineEcheance(): number {
    let tops = Infinity
    if (this.icrMasque & ICR.TA) tops = Math.min(tops, this.ta.restant())
    if (this.icrMasque & ICR.TB) tops = Math.min(tops, this.tb.restant())
    return tops === Infinity ? Infinity : (this.dernierTop + tops) * 10
  }

  /** Une impulsion sur l'entrée TOD (image pour la CIA-A, ligne pour la CIA-B). */
  topTod(): void {
    this.tod = (this.tod + 1) & 0xffffff
    if (this.tod === this.alarme) this.signaler(ICR.ALRM)
  }

  /** Octet reçu sur le port série (le clavier, pour la CIA-A). */
  recevoirSerie(octet: number): void {
    this.sdr = octet & 0xff
    this.signaler(ICR.SP)
  }

  lire(reg: number, cycles: number): number {
    this.avancer(cycles)
    switch (reg) {
      case CIA_REG.PRA:
        return ((this.pra & this.ddra) | (this.entreesA() & ~this.ddra)) & 0xff
      case CIA_REG.PRB:
        return ((this.prb & this.ddrb) | (this.entreesB() & ~this.ddrb)) & 0xff
      case CIA_REG.DDRA:
        return this.ddra
      case CIA_REG.DDRB:
        return this.ddrb
      case CIA_REG.TALO:
        return this.ta.compte & 0xff
      case CIA_REG.TAHI:
        return this.ta.compte >> 8
      case CIA_REG.TBLO:
        return this.tb.compte & 0xff
      case CIA_REG.TBHI:
        return this.tb.compte >> 8
      case CIA_REG.TODHI:
        // Lire l'octet fort fige le compteur jusqu'à la lecture de l'octet faible
        this.todVerrou = this.tod
        return (this.tod >> 16) & 0xff
      case CIA_REG.TODMID:
        return ((this.todVerrou ?? this.tod) >> 8) & 0xff
      case CIA_REG.TODLO: {
        const v = (this.todVerrou ?? this.tod) & 0xff
        this.todVerrou = null
        return v
      }
      case CIA_REG.SDR:
        return this.sdr
      case CIA_REG.ICR: {
        // Lire l'ICR l'efface (et retire la demande d'interruption)
        const v = this.icrDonnees | (this.icrDonnees & this.icrMasque ? ICR.IR : 0)
        this.icrDonnees = 0
        return v
      }
      case CIA_REG.CRA:
        return this.cra
      case CIA_REG.CRB:
        return this.crb
      default:
        return 0xff
    }
  }

  /** Vrai si la CIA tient encore sa ligne d'interruption. */
  get interruptionActive(): boolean {
    return (this.icrDonnees & this.icrMasque) !== 0
  }

  ecrire(reg: number, v: number, cycles: number): void {
    this.avancer(cycles)
    v &= 0xff
    switch (reg) {
      case CIA_REG.PRA:
        this.pra = v
        return
      case CIA_REG.PRB:
        this.prb = v
        return
      case CIA_REG.DDRA:
        this.ddra = v
        return
      case CIA_REG.DDRB:
        this.ddrb = v
        return
      case CIA_REG.TALO:
        this.ta.latch = (this.ta.latch & 0xff00) | v
        return
      case CIA_REG.TAHI:
        this.ecrireHaut(this.ta, v, true)
        return
      case CIA_REG.TBLO:
        this.tb.latch = (this.tb.latch & 0xff00) | v
        return
      case CIA_REG.TBHI:
        this.ecrireHaut(this.tb, v, false)
        return
      case CIA_REG.TODLO:
      case CIA_REG.TODMID:
      case CIA_REG.TODHI: {
        const decalage = (reg - CIA_REG.TODLO) * 8
        const masque = ~(0xff << decalage)
        if (this.crb & 0x80) this.alarme = (this.alarme & masque) | (v << decalage)
        else this.tod = (this.tod & masque) | (v << decalage)
        return
      }
      case CIA_REG.SDR:
        this.sdr = v
        return
      case CIA_REG.ICR:
        // Bit 7 = 1 : mettre à 1 les bits de masque indiqués ; 0 : les mettre à 0
        if (v & 0x80) this.icrMasque |= v & 0x1f
        else this.icrMasque &= ~(v & 0x1f)
        if (this.icrDonnees & this.icrMasque) this.demande()
        return
      case CIA_REG.CRA:
        this.controle(this.ta, v)
        this.cra = v & ~0x10
        return
      case CIA_REG.CRB:
        this.controle(this.tb, v)
        this.crb = v & ~0x10
        return
    }
  }

  private ecrireHaut(t: Timer, v: number, estA: boolean): void {
    t.latch = (t.latch & 0xff) | (v << 8)
    // Timer arrêté : le compteur est chargé ; en mode « un coup », l'écriture le démarre
    if (!t.marche) t.compte = t.latch
    if (t.unCoup && !t.marche) {
      t.marche = true
      if (estA) this.cra |= 1
      else this.crb |= 1
    }
  }

  private controle(t: Timer, v: number): void {
    t.marche = (v & 1) !== 0
    t.unCoup = (v & 8) !== 0
    if (v & 0x10) t.compte = t.latch // LOAD : chargement forcé
  }

  /** État des timers pour le débogueur. */
  etatTimers(): { ta: number; tb: number; taMarche: boolean; tbMarche: boolean } {
    return { ta: this.ta.compte, tb: this.tb.compte, taMarche: this.ta.marche, tbMarche: this.tb.marche }
  }
}
