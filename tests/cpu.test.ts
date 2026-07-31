import { describe, expect, it } from 'vitest'
import { Cpu } from '../src/cpu/cpu'
import { assemble } from './helpers/assemble'

function run(source: string, maxSteps = 2000): Cpu {
  const result = assemble(source)
  if (!result.success) {
    throw new Error('Erreur assemblage: ' + JSON.stringify(result.errors))
  }
  const cpu = new Cpu()
  cpu.reset(result.baseAddress)
  cpu.loadProgram(result.baseAddress, result.binary)
  let steps = 0
  while (!cpu.halted && steps < maxSteps) {
    const effects = cpu.step()
    if (effects.error) throw new Error(`Erreur CPU à l'étape ${steps}: ${effects.error}`)
    steps++
  }
  if (steps >= maxSteps) throw new Error('Nombre maximum de pas dépassé (boucle infinie ?)')
  return cpu
}

/** Exécute exactement `steps` instructions, sans séquence HALT (utile pour vérifier les flags
 * ou des registres, sans qu'une instruction supplémentaire ne les modifie après coup). */
function runN(source: string, steps: number): Cpu {
  const result = assemble(source)
  if (!result.success) {
    throw new Error('Erreur assemblage: ' + JSON.stringify(result.errors))
  }
  const cpu = new Cpu()
  cpu.reset(result.baseAddress)
  cpu.loadProgram(result.baseAddress, result.binary)
  for (let i = 0; i < steps; i++) {
    const effects = cpu.step()
    if (effects.error) throw new Error(`Erreur CPU à l'étape ${i}: ${effects.error}`)
  }
  return cpu
}

// D0 sert de registre de tâche pour TRAP #15 ; on copie le résultat à vérifier dans D7
// (jamais touché par HALT) juste avant d'arrêter le programme.
const HALT = '\tMOVE.L\tD0,D7\n\tMOVE.B\t#9,D0\n\tTRAP\t#15\n'

describe('MOVE / arithmétique de base', () => {
  it('additionne deux immédiats dans D0', () => {
    const cpu = run(`\tORG $1000\n\tMOVE.W\t#5,D0\n\tMOVE.W\t#10,D1\n\tADD.W\tD1,D0\n${HALT}`)
    expect(cpu.d[7]).toBe(15)
  })

  it('MOVEQ charge une valeur négative en 32 bits (extension de signe)', () => {
    const cpu = run(`\tORG $1000\n\tMOVEQ\t#-1,D0\n${HALT}`)
    expect(cpu.d[7]).toBe(0xffffffff)
  })

  it('SUB.W met à jour les flags (résultat négatif)', () => {
    const cpu = runN(`\tORG $1000\n\tMOVE.W\t#5,D0\n\tSUB.W\t#10,D0\n`, 2)
    expect(cpu.d[0] & 0xffff).toBe(0xfffb) // -5 en 16 bits
    expect(cpu.flags.n).toBe(true)
    expect(cpu.flags.z).toBe(false)
  })

  it('MOVE vers une adresse absolue puis relecture', () => {
    const cpu = run(`\tORG $1000\n\tMOVE.W\t#1234,D0\n\tMOVE.W\tD0,$3000\n\tMOVE.W\t$3000,D1\n${HALT}`)
    expect(cpu.d[1] & 0xffff).toBe(1234)
  })
})

describe("modes d'adressage", () => {
  it('(An)+ post-incrémenté avance le pointeur', () => {
    const cpu = runN(
      `\tORG $1000\nSTART:\tLEA\tDATA,A0\n\tMOVE.W\t(A0)+,D0\n\tMOVE.W\t(A0)+,D1\nDATA:\tDC.W\t11,22,33\n`,
      3
    )
    expect(cpu.d[0] & 0xffff).toBe(11)
    expect(cpu.d[1] & 0xffff).toBe(22)
  })

  it('-(An) pré-décrémenté (pile manuelle)', () => {
    const cpu = run(`\tORG $1000\n\tLEA\t$4000,A0\n\tMOVE.W\t#99,-(A0)\n\tMOVE.W\t(A0),D0\n${HALT}`)
    expect(cpu.d[7] & 0xffff).toBe(99)
  })

  it('(An,d16) indirect avec déplacement', () => {
    const cpu = run(
      `\tORG $1000\nSTART:\tLEA\tDATA,A0\n\tMOVE.W\t4(A0),D0\n${HALT}\nDATA:\tDC.W\t0,0,77\n`
    )
    expect(cpu.d[7] & 0xffff).toBe(77)
  })
})

describe('branchements et boucles', () => {
  it('DBRA additionne 1..5', () => {
    const cpu = run(
      `\tORG $1000\n\tMOVE.W\t#0,D0\n\tMOVE.W\t#5,D1\nLOOP:\tADD.W\tD1,D0\n\tSUBQ.W\t#1,D1\n\tBNE\tLOOP\n${HALT}`
    )
    expect(cpu.d[7] & 0xffff).toBe(15)
  })

  it('DBRA (boucle décomptée dédiée) répète 5 fois', () => {
    const cpu = run(
      `\tORG $1000\n\tMOVE.W\t#0,D0\n\tMOVE.W\t#4,D1\nLOOP:\tADDQ.W\t#1,D0\n\tDBRA\tD1,LOOP\n${HALT}`
    )
    expect(cpu.d[7] & 0xffff).toBe(5)
  })

  it('Bcc conditionnel après CMP', () => {
    const cpu = run(
      `\tORG $1000\n\tMOVE.W\t#5,D0\n\tCMP.W\t#5,D0\n\tBEQ\tEGAL\n\tMOVE.W\t#0,D1\n\tBRA\tFIN\nEGAL:\tMOVE.W\t#1,D1\nFIN:\t${HALT}`
    )
    expect(cpu.d[1] & 0xffff).toBe(1)
  })
})

describe('sous-programmes et pile', () => {
  it('JSR/RTS revient au bon endroit', () => {
    const cpu = run(
      `\tORG $1000\n\tMOVE.W\t#0,D0\n\tJSR\tSUB1\n\tMOVE.W\t#2,D1\n\tBRA\tFIN\nSUB1:\tMOVE.W\t#1,D0\n\tRTS\nFIN:\t${HALT}`
    )
    expect(cpu.d[7] & 0xffff).toBe(1)
    expect(cpu.d[1] & 0xffff).toBe(2)
  })

  it('MOVEM.L sauvegarde et restaure des registres sur la pile', () => {
    const cpu = run(
      `\tORG $1000\n\tMOVE.L\t#111,D1\n\tMOVE.L\t#222,D2\n\tMOVEM.L\tD1-D2,-(SP)\n\tMOVE.L\t#0,D1\n\tMOVE.L\t#0,D2\n\tMOVEM.L\t(SP)+,D1-D2\n${HALT}`
    )
    expect(cpu.d[1]).toBe(111)
    expect(cpu.d[2]).toBe(222)
  })
})

describe('logique et décalages', () => {
  it('AND/OR/EOR/NOT', () => {
    const cpu = run(
      `\tORG $1000\n\tMOVE.B\t#$F0,D0\n\tAND.B\t#$3C,D0\n\tMOVE.B\t#$0F,D1\n\tOR.B\tD1,D0\n\tEOR.B\t#$FF,D0\n${HALT}`
    )
    // F0 & 3C = 30 ; 30 | 0F = 3F ; 3F ^ FF = C0
    expect(cpu.d[7] & 0xff).toBe(0xc0)
  })

  it('LSL.W décale à gauche', () => {
    const cpu = run(`\tORG $1000\n\tMOVE.W\t#1,D0\n\tLSL.W\t#4,D0\n${HALT}`)
    expect(cpu.d[7] & 0xffff).toBe(16)
  })
})

describe('multiplication / division', () => {
  it('MULU calcule un produit non signé', () => {
    const cpu = run(`\tORG $1000\n\tMOVE.W\t#6,D0\n\tMULU.W\t#7,D0\n${HALT}`)
    expect(cpu.d[7]).toBe(42)
  })

  it('DIVU calcule quotient (mot bas) et reste (mot haut)', () => {
    const cpu = run(`\tORG $1000\n\tMOVE.L\t#17,D0\n\tDIVU.W\t#5,D0\n${HALT}`)
    expect(cpu.d[7] & 0xffff).toBe(3)
    expect((cpu.d[7] >>> 16) & 0xffff).toBe(2)
  })
})

describe('TRAP #15 (E/S simulée)', () => {
  it("affiche une chaîne (D0=13) puis s'arrête (D0=9)", () => {
    const cpu = run(
      `\tORG $1000\nSTART:\tLEA\tMSG,A1\n\tMOVE.B\t#13,D0\n\tTRAP\t#15\n${HALT}\nMSG:\tDC.B\t'Bonjour',0\n\tEVEN\n`
    )
    expect(cpu.output).toBe('Bonjour')
    expect(cpu.halted).toBe(true)
  })
})
