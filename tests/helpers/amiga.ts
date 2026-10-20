/** Lance un programme sur l'Amiga simulé (tests). */
import { assemble } from './assemble'
import { Cpu } from '../../src/cpu/cpu'
import { createAmiga, type AmigaOptions } from '../../src/platforms/amiga'
import { materielAmiga } from '../../src/platforms/amiga/chipset'
import { bilanAmiga } from '../../src/platforms/amiga/kickstart'

export function lancer(source: string, options: AmigaOptions = {}, maxSteps = 300000) {
  const asm = assemble(source)
  if (!asm.success) throw new Error('assemblage : ' + JSON.stringify(asm.errors))
  const cpu = new Cpu(createAmiga(options))
  cpu.reset(asm.baseAddress)
  cpu.loadProgram(asm.baseAddress, asm.binary)
  let error: string | undefined
  for (let i = 0; i < maxSteps && !cpu.halted; i++) error = cpu.step().error ?? error
  return { cpu, error, m: materielAmiga(cpu)!, bilan: bilanAmiga(cpu) }
}
