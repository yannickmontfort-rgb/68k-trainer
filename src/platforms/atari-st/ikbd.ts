/**
 * ACIA 6850 du clavier ($FFFC00 contrôle/état, $FFFC02 données) et processeur clavier IKBD
 * (HD6301) qui lui envoie ses octets à 7 812,5 bauds : codes des touches (bit 7 = relâchée),
 * paquets joystick ($FE/$FF + état), réponses aux commandes ($FD, $F1...).
 * L'ACIA MIDI ($FFFC04/$FFFC06) répond « rien reçu ».
 * Références : Atari ST Hardware Register Listing, Intelligent Keyboard (ikbd) Protocol (Atari).
 */

export const ACIA_CLAVIER_CTRL = 0xfffc00
export const ACIA_CLAVIER_DATA = 0xfffc02
export const ACIA_MIDI_CTRL = 0xfffc04
export const ACIA_MIDI_DATA = 0xfffc06

/** Un octet sur la liaison série toutes les 10 bits à 7 812,5 bauds ≈ 1,28 ms ≈ 10 250 cycles. */
export const CYCLES_PAR_OCTET_IKBD = 10253

/** Bits du joystick : 0 haut, 1 bas, 2 gauche, 3 droite, 7 bouton. */
export const JOY = { haut: 0x01, bas: 0x02, gauche: 0x04, droite: 0x08, feu: 0x80 } as const

/** Nombre d'octets de paramètres de chaque commande IKBD. */
const PARAMS: Record<number, number> = {
  0x07: 1, 0x09: 4, 0x0a: 2, 0x0b: 2, 0x0c: 2, 0x0e: 5, 0x17: 1, 0x19: 6, 0x1b: 6, 0x21: 2, 0x22: 2, 0x80: 1
}

export class Ikbd {
  /** Octets en route vers l'ACIA. */
  private file: number[] = []
  /** Cycle à partir duquel l'octet suivant peut arriver. */
  private prochainOctet = 0
  private controle = 0
  /** Registre de réception : octet reçu et pas encore lu (RDRF). */
  private recu: number | null = null
  private commande: number[] = []
  private joy = [0, 0]
  private sourisActive = true
  private joystickEvenements = true

  /** `irq` : la ligne d'interruption de l'ACIA change (vrai = demande active). */
  constructor(private readonly irq: (actif: boolean) => void) {}

  reset(maintenant: number): void {
    this.file = []
    this.prochainOctet = maintenant
    this.controle = 0
    this.recu = null
    this.commande = []
    this.joy = [0, 0]
    this.sourisActive = true
    this.joystickEvenements = true
    this.irq(false)
  }

  private get irqActif(): boolean {
    return this.recu !== null && (this.controle & 0x80) !== 0
  }

  private envoyer(...octets: number[]): void {
    this.file.push(...octets.map((o) => o & 0xff))
  }

  /** Touche du ST enfoncée ou relâchée (code clavier du ST, 1-$72). */
  touche(code: number, enfoncee: boolean): void {
    this.envoyer(enfoncee ? code : code | 0x80)
  }

  /** Nouvel état d'un joystick (0 = prise souris, 1 = prise joystick), bits JOY. */
  joystick(port: 0 | 1, etat: number): void {
    if (this.joy[port] === etat) return
    this.joy[port] = etat & 0x8f
    // Le joystick 0 partage la prise de la souris : rapporté seulement si la souris est coupée
    if (this.joystickEvenements && (port === 1 || !this.sourisActive)) this.envoyer(0xfe + port, this.joy[port])
  }

  /** Fait arriver l'octet suivant si l'ACIA est libre et que le temps de transmission est écoulé. */
  avancer(maintenant: number): void {
    if (this.recu !== null || this.file.length === 0 || maintenant < this.prochainOctet) return
    this.recu = this.file.shift()!
    this.prochainOctet = maintenant + CYCLES_PAR_OCTET_IKBD
    if (this.irqActif) this.irq(true)
  }

  /** Cycle d'arrivée possible du prochain octet (Infinity = rien à envoyer). */
  get prochainOctetCycle(): number {
    return this.file.length && this.recu === null ? this.prochainOctet : Infinity
  }

  /** Des octets attendent-ils ? (pour savoir s'il faut appeler `avancer`). */
  get enAttente(): boolean {
    return this.file.length > 0
  }

  lire(adresse: number): number {
    switch (adresse) {
      case ACIA_CLAVIER_CTRL:
        // bit 0 RDRF (octet reçu), bit 1 TDRE (prêt à émettre), bit 7 IRQ
        return (this.recu !== null ? 0x01 : 0) | 0x02 | (this.irqActif ? 0x80 : 0)
      case ACIA_CLAVIER_DATA: {
        const v = this.recu ?? 0
        if (this.recu !== null) {
          this.recu = null
          this.irq(false)
        }
        return v
      }
      case ACIA_MIDI_CTRL:
        return 0x02
      default:
        return 0
    }
  }

  ecrire(adresse: number, valeur: number): void {
    const v = valeur & 0xff
    if (adresse === ACIA_CLAVIER_CTRL) {
      if ((v & 0x03) === 0x03) {
        // Réinitialisation maître de l'ACIA
        this.recu = null
        this.controle = 0
      } else this.controle = v
      this.irq(this.irqActif)
    } else if (adresse === ACIA_CLAVIER_DATA) this.recevoirCommande(v)
  }

  /** Octet envoyé par le programme au processeur clavier (Ikbdws ou écriture en $FFFC02). */
  private recevoirCommande(octet: number): void {
    this.commande.push(octet)
    const cmd = this.commande[0]
    if (this.commande.length < 1 + (PARAMS[cmd] ?? 0)) return
    const params = this.commande.slice(1)
    this.commande = []
    switch (cmd) {
      case 0x80: // reset (80 01)
        if (params[0] === 0x01) {
          this.sourisActive = true
          this.joystickEvenements = true
          this.envoyer(0xf1)
        }
        break
      case 0x08: // souris relative
      case 0x09: // souris absolue
      case 0x0a: // souris en touches
        this.sourisActive = true
        break
      case 0x12: // couper la souris
        this.sourisActive = false
        break
      case 0x14: // joysticks en mode événements
        this.joystickEvenements = true
        this.sourisActive = false
        break
      case 0x15: // joysticks en mode interrogation
        this.joystickEvenements = false
        this.sourisActive = false
        break
      case 0x16: // interroger les joysticks
        this.envoyer(0xfd, this.joy[0], this.joy[1])
        break
      case 0x1a: // couper les joysticks
        this.joystickEvenements = false
        break
      case 0x1c: {
        // lire l'horloge : $FC + AA MM JJ hh mm ss en BCD
        const d = new Date()
        const bcd = (n: number): number => ((Math.floor(n / 10) % 10) << 4) | n % 10
        this.envoyer(0xfc, bcd(d.getFullYear() % 100), bcd(d.getMonth() + 1), bcd(d.getDate()), bcd(d.getHours()), bcd(d.getMinutes()), bcd(d.getSeconds()))
        break
      }
    }
  }
}
