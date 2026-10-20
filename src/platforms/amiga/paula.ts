import type { Memory } from '../../cpu/memory'
import { CPU_HZ, MASQUE_DMA } from './machine'

/**
 * Son de Paula : 4 voies DMA qui lisent des échantillons 8 bits signés en Chip RAM. Pour chaque
 * voie : adresse (AUDxLC), longueur en mots (AUDxLEN), période (AUDxPER, en tops de 3,55 MHz
 * par échantillon) et volume (AUDxVOL, 0 à 64). Quand le DMA d'une voie démarre, Paula recopie
 * LC et LEN et déclenche l'interruption AUDx : on peut alors préparer le bloc suivant. À la fin
 * du bloc, elle recommence avec les valeurs du moment (boucle) et redéclenche l'interruption.
 */
interface Voie {
  lc: number
  len: number
  per: number
  vol: number
  actif: boolean
  blocAdresse: number
  blocOctets: number
  /** Cycle (68000) où l'octet 0 du bloc commence (peut être fractionnaire après un changement de période). */
  blocDebut: number
  blocFin: number
}

/** Une voie lit un octet tous les `per` tops de Paula, soit 2 × per cycles du 68000. */
const cyclesParOctet = (per: number): number => 2 * Math.max(124, per || 65536)

export class Paula {
  readonly voies: Voie[] = []
  /** Production d'échantillons pour le haut-parleur (seulement quand l'interface écoute). */
  private ecoute = false
  private frequence = 44100
  private tampon: number[] = []
  private prochainEchantillon = 0

  constructor(
    private readonly memoire: () => Memory,
    /** Interruption AUDx (x = 0 à 3) au début de chaque bloc. */
    private readonly interruption: (voie: number) => void
  ) {
    this.reset()
  }

  reset(): void {
    this.voies.length = 0
    for (let i = 0; i < 4; i++) {
      this.voies.push({ lc: 0, len: 0, per: 0, vol: 0, actif: false, blocAdresse: 0, blocOctets: 0, blocDebut: 0, blocFin: Infinity })
    }
    this.tampon = []
  }

  private nouveauBloc(i: number, debut: number): void {
    const v = this.voies[i]
    v.blocAdresse = v.lc & MASQUE_DMA
    v.blocOctets = (v.len || 65536) * 2
    v.blocDebut = debut
    v.blocFin = debut + v.blocOctets * cyclesParOctet(v.per)
    this.interruption(i)
  }

  /** Fait avancer les voies jusqu'au cycle `t` (fins de bloc, échantillons). */
  avancer(t: number): void {
    for (;;) {
      let i = -1
      let fin = Infinity
      this.voies.forEach((v, n) => {
        if (v.actif && v.blocFin < fin) {
          fin = v.blocFin
          i = n
        }
      })
      if (i < 0 || fin > t) break
      this.produire(fin)
      this.nouveauBloc(i, fin)
    }
    this.produire(t)
  }

  /** Cycle de la prochaine fin de bloc (pour les attentes actives). */
  prochaineEcheance(): number {
    return Math.min(...this.voies.map((v) => (v.actif ? v.blocFin : Infinity)))
  }

  /** DMACON vient de changer : démarre ou arrête les voies (bits 0-3, avec DMAEN). */
  dma(bits: number, t: number): void {
    this.avancer(t)
    this.voies.forEach((v, i) => {
      const on = (bits & (1 << i)) !== 0
      if (on && !v.actif) {
        v.actif = true
        this.nouveauBloc(i, t + 8)
      } else if (!on && v.actif) v.actif = false
    })
  }

  /** Écriture d'un registre AUDx ($0A0 + $10 × x + r). */
  ecrire(voie: number, r: number, valeur: number, t: number): void {
    this.avancer(t)
    const v = this.voies[voie]
    switch (r) {
      case 0x0:
        v.lc = ((valeur & 0xffff) << 16 | (v.lc & 0xffff)) >>> 0
        break
      case 0x2:
        v.lc = ((v.lc & 0xffff0000) | (valeur & 0xfffe)) >>> 0
        break
      case 0x4:
        v.len = valeur & 0xffff
        break
      case 0x6: {
        if (v.actif) {
          // Garder la position dans le bloc, mais continuer à la nouvelle vitesse
          const fait = (t - v.blocDebut) / cyclesParOctet(v.per)
          v.blocDebut = t - fait * cyclesParOctet(valeur)
          v.blocFin = v.blocDebut + v.blocOctets * cyclesParOctet(valeur)
        }
        v.per = valeur & 0xffff
        break
      }
      case 0x8:
        v.vol = Math.min(64, valeur & 0x7f)
        break
    }
  }

  /** Échantillon (−1…1) que produit la voie au cycle `t`. */
  private valeurVoie(v: Voie, t: number): number {
    if (!v.actif || t < v.blocDebut) return 0
    const n = Math.min(v.blocOctets - 1, Math.floor((t - v.blocDebut) / cyclesParOctet(v.per)))
    const octet = this.memoire().readS8((v.blocAdresse + n) & (MASQUE_DMA | 1))
    return (octet / 128) * (v.vol / 64)
  }

  private produire(t: number): void {
    if (!this.ecoute) return
    const pas = CPU_HZ / this.frequence
    while (this.prochainEchantillon <= t) {
      let s = 0
      for (const v of this.voies) s += this.valeurVoie(v, this.prochainEchantillon)
      this.tampon.push(s / 4)
      this.prochainEchantillon += pas
      if (this.tampon.length > this.frequence) this.tampon.splice(0, this.tampon.length - this.frequence)
    }
  }

  /** L'interface commence à écouter au cycle `t` (même rôle que pour le YM2149 de l'Atari). */
  synchroniser(t: number): void {
    this.ecoute = true
    this.tampon = []
    this.prochainEchantillon = t
  }

  /** Échantillons produits depuis le dernier appel (fréquence d'échantillonnage `frequence`). */
  echantillons(t: number, frequence: number): Float32Array {
    if (frequence !== this.frequence) {
      this.frequence = frequence
      this.prochainEchantillon = t
      this.tampon = []
    }
    this.ecoute = true
    this.avancer(t)
    const r = Float32Array.from(this.tampon)
    this.tampon = []
    return r
  }
}
