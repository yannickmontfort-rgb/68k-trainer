/**
 * Puce sonore Yamaha YM2149 (compatible AY-3-8910) du ST, cadencée à 2 MHz : 3 voies carrées,
 * un générateur de bruit, un mixeur, une enveloppe. Registres :
 *   0-5   période des voies A, B, C (12 bits : fin puis grossier)  → f = 2 MHz / (16 × période)
 *   6     période du bruit (5 bits)
 *   7     mixeur : bits 0-2 coupent le son carré de A/B/C, bits 3-5 coupent le bruit (1 = coupé)
 *   8-10  volume de A, B, C (0-15) ; bit 4 = suivre l'enveloppe
 *   11-12 période de l'enveloppe (16 bits)                      → durée d'une rampe = 256 × période / 2 MHz
 *   13    forme de l'enveloppe (CONT, ATT, ALT, HOLD) ; l'écrire relance l'enveloppe
 *   14-15 ports d'E/S (sur le ST : lecteur de disquette, imprimante)
 * Sur le ST, on choisit le registre en $FF8800 puis on écrit sa valeur en $FF8802 ; une lecture
 * de $FF8800 rend la valeur du registre choisi.
 */

export const PSG_HZ = 2000000

/** Masque des bits utiles de chaque registre. */
const MASQUES = [0xff, 0x0f, 0xff, 0x0f, 0xff, 0x0f, 0x1f, 0xff, 0x1f, 0x1f, 0x1f, 0xff, 0xff, 0x0f, 0xff, 0xff]

/** Niveaux de sortie (16 pas, échelle logarithmique de l'AY), normalisés. */
const NIVEAUX = [
  0, 0.0137, 0.0205, 0.0291, 0.0423, 0.0618, 0.0847, 0.1369, 0.1691, 0.2647, 0.3527, 0.4499, 0.5704, 0.6873,
  0.8482, 1
]

export class Ym2149 {
  readonly registres = new Uint8Array(16)
  /** Registre choisi par la dernière écriture en $FF8800. */
  selection = 0
  // État des générateurs (en coups d'horloge du PSG)
  private readonly phase = [0, 0, 0]
  private readonly sortie = [0, 0, 0]
  private phaseBruit = 0
  private lfsr = 1
  private bruit = 0
  private phaseEnv = 0
  private pasEnv = 0
  private envFinie = false
  // Filtre anti-continu
  private x1 = 0
  private y1 = 0

  reset(): void {
    this.registres.fill(0)
    this.registres[7] = 0xff
    this.selection = 0
    this.phase.fill(0)
    this.sortie.fill(0)
    this.phaseBruit = 0
    this.lfsr = 1
    this.bruit = 0
    this.phaseEnv = 0
    this.pasEnv = 0
    this.envFinie = false
    this.x1 = this.y1 = 0
  }

  ecrire(registre: number, valeur: number): void {
    const r = registre & 0x0f
    this.registres[r] = valeur & MASQUES[r]
    if (r === 13) {
      this.phaseEnv = 0
      this.pasEnv = 0
      this.envFinie = false
    }
  }

  lire(registre: number): number {
    return this.registres[registre & 0x0f]
  }

  /** Fréquence de la voie 0-2 en Hz (0 si période nulle). */
  frequence(voie: number): number {
    const p = this.periodeVoie(voie)
    return p ? PSG_HZ / (16 * p) : 0
  }

  private periodeVoie(voie: number): number {
    return this.registres[voie * 2] | (this.registres[voie * 2 + 1] << 8)
  }

  /** Niveau de l'enveloppe (0-15) selon la forme et le pas atteint. */
  private niveauEnveloppe(): number {
    const forme = this.registres[13]
    const cont = forme & 8
    const att = forme & 4 ? 1 : 0
    const alt = forme & 2
    const hold = forme & 1
    const cycle = Math.floor(this.pasEnv / 16)
    const pas = this.pasEnv % 16
    if (cycle === 0) return att ? pas : 15 - pas
    // Après la première rampe
    if (!cont) return 0
    if (hold) return (alt ? 1 - att : att) ? 15 : 0
    const montant = alt ? (cycle % 2 === 0 ? att : 1 - att) : att
    return montant ? pas : 15 - pas
  }

  /**
   * Produit `n` échantillons à `frequenceEchantillonnage` Hz (valeurs entre -1 et 1) à partir de
   * l'état courant des registres.
   */
  generer(n: number, frequenceEchantillonnage: number, sortie = new Float32Array(n), depart = 0): Float32Array {
    const r = this.registres
    const horlogesParEchantillon = PSG_HZ / frequenceEchantillonnage
    const demiPeriodes = [0, 1, 2].map((v) => Math.max(1, this.periodeVoie(v)) * 8)
    const demiBruit = Math.max(1, r[6]) * 8
    const pasEnveloppe = Math.max(1, r[11] | (r[12] << 8)) * 16
    const mixeur = r[7]
    for (let i = 0; i < n; i++) {
      // Avancer les générateurs
      for (let v = 0; v < 3; v++) {
        this.phase[v] += horlogesParEchantillon
        while (this.phase[v] >= demiPeriodes[v]) {
          this.phase[v] -= demiPeriodes[v]
          this.sortie[v] ^= 1
        }
      }
      this.phaseBruit += horlogesParEchantillon
      while (this.phaseBruit >= demiBruit * 2) {
        this.phaseBruit -= demiBruit * 2
        // LFSR 17 bits de l'AY : rétroaction bits 0 et 3
        const bit = (this.lfsr ^ (this.lfsr >> 3)) & 1
        this.lfsr = (this.lfsr >> 1) | (bit << 16)
        this.bruit = this.lfsr & 1
      }
      if (!this.envFinie) {
        this.phaseEnv += horlogesParEchantillon
        while (this.phaseEnv >= pasEnveloppe) {
          this.phaseEnv -= pasEnveloppe
          this.pasEnv++
          // Formes qui s'arrêtent : inutile de compter au-delà de la première rampe
          const f = r[13]
          if (this.pasEnv >= 32 && (!(f & 8) || f & 1)) {
            this.pasEnv = 16
            this.envFinie = true
            break
          }
          if (this.pasEnv >= 48) this.pasEnv -= 32
        }
      }
      const env = NIVEAUX[this.niveauEnveloppe()]
      let somme = 0
      for (let v = 0; v < 3; v++) {
        const son = (this.sortie[v] | ((mixeur >> v) & 1)) & (this.bruit | ((mixeur >> (v + 3)) & 1))
        if (!son) continue
        const vol = r[8 + v]
        somme += vol & 0x10 ? env : NIVEAUX[vol & 0x0f]
      }
      // Filtre passe-haut léger : retire la composante continue (pas de « clac » au démarrage)
      const x = somme / 3
      const y = x - this.x1 + 0.995 * this.y1
      this.x1 = x
      this.y1 = y
      sortie[depart + i] = y
    }
    return sortie
  }
}

/** Durée d'un cycle du 68000 du ST en secondes × fréquence d'échantillonnage. */
const CPU_HZ_ST = 8010612

/**
 * Le YM2149 tel que le voit le 68000 : un état « en direct » (lectures, vérification des
 * exercices) et un journal horodaté des écritures, rejoué par le synthétiseur pour produire le son
 * au cycle près (une note changée sous VBL tombe au bon moment).
 */
export class PsgSt {
  /** Registres en direct (ce que lit le programme). */
  readonly etat = new Ym2149()
  private readonly synthe = new Ym2149()
  private journal: { cycle: number; registre: number; valeur: number }[] = []
  private cycleSon = 0
  private reste = 0

  reset(cycle = 0): void {
    this.etat.reset()
    this.synthe.reset()
    this.journal = []
    this.cycleSon = cycle
    this.reste = 0
  }

  /** Écriture en $FF8800 : choix du registre. */
  choisir(valeur: number): void {
    this.etat.selection = valeur & 0x0f
  }

  /** Écriture en $FF8802 (ou Giaccess) : valeur du registre choisi. */
  ecrire(valeur: number, cycle: number, registre = this.etat.selection): void {
    this.etat.ecrire(registre, valeur)
    this.journal.push({ cycle, registre, valeur })
    // Personne n'écoute (tests, pas à pas) : on rattrape sans produire de son
    if (this.journal.length > 4096) this.synchroniser(cycle)
  }

  /** Lecture en $FF8800 : valeur du registre choisi. */
  lire(): number {
    return this.etat.lire(this.etat.selection)
  }

  /** Oublie le son en retard (au lancement du temps réel) : le synthé rejoint l'état courant. */
  synchroniser(cycle: number): void {
    for (const e of this.journal) this.synthe.ecrire(e.registre, e.valeur)
    this.journal = []
    this.cycleSon = cycle
    this.reste = 0
  }

  /** Échantillons du son produit depuis le dernier appel jusqu'au cycle `jusqua`. */
  echantillons(jusqua: number, frequenceEchantillonnage: number): Float32Array {
    const parCycle = frequenceEchantillonnage / CPU_HZ_ST
    const total = Math.max(0, jusqua - this.cycleSon) * parCycle + this.reste
    const n = Math.floor(total)
    this.reste = total - n
    const sortie = new Float32Array(n)
    let pos = 0
    let i = 0
    for (; i < this.journal.length && this.journal[i].cycle <= jusqua; i++) {
      const e = this.journal[i]
      const k = Math.min(n, Math.max(pos, Math.floor((e.cycle - this.cycleSon) * parCycle)))
      if (k > pos) this.synthe.generer(k - pos, frequenceEchantillonnage, sortie, pos)
      pos = k
      this.synthe.ecrire(e.registre, e.valeur)
    }
    if (n > pos) this.synthe.generer(n - pos, frequenceEchantillonnage, sortie, pos)
    this.journal = this.journal.slice(i)
    this.cycleSon = Math.max(this.cycleSon, jusqua)
    return sortie
  }
}
