import { assembler } from '../../asm/assembleur'
import { KBDVBASE, OP_IKBDSYS, ROM_ACIA, ROM_IKBDSYS, ROM_TIMER_C, SYSVAR } from './machine'

const h = (n: number): string => '$' + n.toString(16).toUpperCase()

/**
 * Routines d'interruption du TOS simulé, en vrai code 68000 « en ROM » (même déroulé que le TOS et
 * EmuTOS) : on peut les suivre au débogueur, et un programme peut les remplacer.
 */
const SOURCES: [number, string][] = [
  [
    ROM_TIMER_C,
    // Timer C, 200 fois par seconde : compteur _hz_200, puis fin d'interruption (ISRB bit 5)
    `    ADDQ.L #1,${h(SYSVAR.hz_200)}.W
    MOVE.B #$DF,$FFFFFA11.W
    RTE`
  ],
  [
    ROM_ACIA,
    // ACIA : appelle midisys puis ikbdsys (Kbdvbase) tant que l'ACIA demande l'interruption
    // (bit 4 du GPIP à 0), puis fin d'interruption (ISRB bit 6)
    `    MOVEM.L D0-D3/A0-A3,-(SP)
.encore:
    MOVEA.L ${h(KBDVBASE + 28)}.W,A1
    JSR (A1)
    MOVEA.L ${h(KBDVBASE + 32)}.W,A1
    JSR (A1)
    BTST #4,$FFFFFA01.W
    BEQ.S .encore
    MOVEM.L (SP)+,D0-D3/A0-A3
    MOVE.B #$BF,$FFFFFA11.W
    RTE`
  ],
  [
    ROM_IKBDSYS,
    // ikbdsys : lit l'octet reçu ; le TOS simulé (opcode réservé) range les touches et assemble les
    // paquets ; un paquet complet est passé à statvec/mousevec/clockvec/joyvec avec A0 = paquet
    `    MOVE.B $FFFFFC00.W,D0
    BTST #0,D0
    BEQ.S .fin
    MOVE.B $FFFFFC02.W,D0
    DC.W ${h(OP_IKBDSYS)}
    MOVE.L A1,D1
    BEQ.S .fin
    MOVE.L A0,-(SP)
    JSR (A1)
    ADDQ.L #4,SP
.fin:
    RTS`
  ]
]

let cache: [number, Uint8Array][] | null = null

/** Routines à charger en ROM : [adresse, octets]. */
export function routinesRom(): [number, Uint8Array][] {
  if (!cache) {
    cache = SOURCES.map(([adresse, code]) => {
      const r = assembler(`    ORG ${h(adresse)}\n${code}\n`)
      if (!r.ok) throw new Error(`Routine ROM ${h(adresse)} : ` + r.erreurs.map((e) => e.message).join(' ; '))
      return [adresse, r.binaire]
    })
  }
  return cache
}
