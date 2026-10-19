import type { Cpu } from '../../../cpu/cpu'
import { materielAtari } from '../../../platforms/atari-st/materiel'
import { ecrireLocal, lireLocal } from '../profilActif'

const CLE_SON = 'son-actif'

/** Le son est-il activé (case 🔊 sous l'écran) ? Activé par défaut. */
export function sonActif(): boolean {
  return lireLocal(CLE_SON) !== '0'
}

export function activerSon(actif: boolean): void {
  ecrireLocal(CLE_SON, actif ? '1' : '0')
}

/**
 * Haut-parleur du ST simulé : pendant le temps réel, le son produit par le YM2149 depuis l'image
 * précédente est mis bout à bout dans Web Audio, avec un léger retard (60 ms) pour éviter les trous.
 */
export class SortieSon {
  private ctx: AudioContext | null = null
  private volume: GainNode | null = null
  private fin = 0
  private sources: AudioBufferSourceNode[] = []

  demarrer(cpu: Cpu): void {
    materielAtari(cpu)?.psg.synchroniser(cpu.cycles)
    if (!this.ctx) {
      try {
        this.ctx = new AudioContext()
        this.volume = this.ctx.createGain()
        this.volume.gain.value = 0.4
        this.volume.connect(this.ctx.destination)
      } catch {
        return
      }
    }
    void this.ctx.resume()
    this.fin = 0
  }

  alimenter(cpu: Cpu): void {
    const psg = materielAtari(cpu)?.psg
    const ctx = this.ctx
    if (!psg || !ctx || !this.volume) return
    const echantillons = psg.echantillons(cpu.cycles, ctx.sampleRate)
    if (!sonActif() || echantillons.length === 0) return
    const tampon = ctx.createBuffer(1, echantillons.length, ctx.sampleRate)
    tampon.getChannelData(0).set(echantillons)
    const source = ctx.createBufferSource()
    source.buffer = tampon
    source.connect(this.volume)
    // Trop de retard accumulé (onglet ralenti) : on repart de maintenant
    if (this.fin < ctx.currentTime || this.fin > ctx.currentTime + 0.5) this.fin = ctx.currentTime + 0.06
    source.start(this.fin)
    this.fin += tampon.duration
    this.sources.push(source)
    source.onended = () => (this.sources = this.sources.filter((s) => s !== source))
  }

  arreter(): void {
    for (const s of this.sources) {
      try {
        s.stop()
      } catch {
        // déjà terminée
      }
    }
    this.sources = []
    this.fin = 0
  }
}
