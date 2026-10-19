import type { Cpu } from '../../cpu/cpu'
import type { Platform } from '../../cpu/platform'
import { assembler } from '../../asm/assembleur'
import { CYCLES_PER_VBL, ROM_VBL, SYSVAR, VBLQUEUE_TABLE, VBLQUEUE_SLOTS } from './machine'

/**
 * Routine VBL du TOS (vecteur $70, niveau 4), en vrai code 68000 placé « en ROM » : on peut la
 * suivre au débogueur et la remplacer comme sur un vrai ST. Même déroulé que le TOS 1.0 :
 * _frclock, sémaphore vblsem, _vbclock, palette demandée (colorptr), écran demandé (screenpt),
 * puis chaque routine de la file _vblqueue.
 */
const SOURCE_VBL = `
    ORG $${ROM_VBL.toString(16)}
    ADDQ.L #1,$${SYSVAR.frclock.toString(16)}.W
    SUBQ.W #1,$${SYSVAR.vblsem.toString(16)}.W
    BMI.S .sortie
    MOVEM.L D0-A6,-(SP)
    ADDQ.L #1,$${SYSVAR.vbclock.toString(16)}.W
    MOVE.L $${SYSVAR.colorptr.toString(16)}.W,D0
    BEQ.S .ecran
    MOVEA.L D0,A0
    LEA $FF8240,A1
    MOVEQ #15,D0
.couleur:
    MOVE.W (A0)+,(A1)+
    DBF D0,.couleur
    CLR.L $${SYSVAR.colorptr.toString(16)}.W
.ecran:
    MOVE.L $${SYSVAR.screenpt.toString(16)}.W,D0
    BEQ.S .file
    LSR.L #8,D0
    MOVE.B D0,$FF8203
    LSR.W #8,D0
    MOVE.B D0,$FF8201
    CLR.L $${SYSVAR.screenpt.toString(16)}.W
.file:
    MOVE.W $${SYSVAR.nvbls.toString(16)}.W,D0
    SUBQ.W #1,D0
    BMI.S .fin
    MOVEA.L $${SYSVAR.vblqueue.toString(16)}.W,A0
.suivante:
    MOVE.L (A0)+,D1
    BEQ.S .vide
    MOVEA.L D1,A1
    MOVEM.L D0/A0,-(SP)
    JSR (A1)
    MOVEM.L (SP)+,D0/A0
.vide:
    DBF D0,.suivante
.fin:
    MOVEM.L (SP)+,D0-A6
.sortie:
    ADDQ.W #1,$${SYSVAR.vblsem.toString(16)}.W
    RTE
`

let codeVbl: Uint8Array | null = null

/** Octets de la routine VBL (assemblée une fois). */
export function romVbl(): Uint8Array {
  if (!codeVbl) {
    const r = assembler(SOURCE_VBL)
    if (!r.ok) throw new Error('Routine VBL du TOS : ' + r.erreurs.map((e) => e.message).join(' ; '))
    codeVbl = r.binaire
  }
  return codeVbl
}

export interface VblOptions {
  /** Appelé à chaque VBL (50 fois par seconde de temps simulé) : l'interface redessine l'écran. */
  onVbl?: (cpu: Cpu) => void
}

export interface Vbl extends Platform {
  /** Cycle auquel tombera la prochaine VBL. */
  readonly prochaine: () => number
}

/**
 * Balayage vertical de l'écran : toutes les CYCLES_PER_VBL cycles (50 Hz sur un ST PAL à 8 MHz),
 * le Glue demande l'interruption de niveau 4. Vsync (XBIOS 37) attend vraiment cette VBL.
 */
export function createVbl(options: VblOptions = {}): Vbl {
  let prochaine = CYCLES_PER_VBL
  /** Vsync en cours : la VBL attendue (null = pas d'attente). */
  let attendue: number | null = null

  return {
    prochaine: () => prochaine,

    onReset(cpu: Cpu): void {
      prochaine = CYCLES_PER_VBL
      attendue = null
      const mem = cpu.memory
      mem.loadBytes(ROM_VBL, romVbl())
      mem.writeU32(0x70, ROM_VBL)
      mem.writeU16(SYSVAR.vblsem, 1)
      mem.writeU16(SYSVAR.nvbls, VBLQUEUE_SLOTS)
      mem.writeU32(SYSVAR.vblqueue, VBLQUEUE_TABLE)
      for (let i = 0; i < VBLQUEUE_SLOTS; i++) mem.writeU32(VBLQUEUE_TABLE + i * 4, 0)
      mem.writeU32(SYSVAR.colorptr, 0)
      mem.writeU32(SYSVAR.screenpt, 0)
    },

    onTrap(cpu: Cpu, n: number): boolean {
      // Vsync : comme le vrai TOS, attend en boucle (interruptions servies) que la VBL suivante
      // soit passée. Le TRAP est réexécuté jusque-là.
      if (n !== 14 || cpu.memory.readU16(cpu.a[7] & 0xffffff) !== 37) return false
      if (attendue === null) attendue = prochaine
      if (prochaine === attendue) {
        cpu.pc = (cpu.pc - 2) & 0xffffff
        // ≈ un tour de la boucle « CMP.L _frclock,D0 / BEQ » du TOS
        cpu.cycles += Math.min(28, Math.max(4, prochaine - cpu.cycles))
        cpu.waiting = true
      } else attendue = null
      return true
    },

    afterStep(cpu: Cpu): void {
      if (cpu.cycles < prochaine) return
      // Plusieurs trames d'un coup (long STOP masqué...) : une seule interruption, comme le Glue
      while (prochaine <= cpu.cycles) prochaine += CYCLES_PER_VBL
      cpu.requestInterrupt(4)
      options.onVbl?.(cpu)
    }
  }
}
