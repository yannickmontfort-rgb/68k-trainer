import { describe, expect, it } from 'vitest'
import { sortieAtari } from '../src/main/emulateurs/lanceurAtari'

describe('texte affiché par un programme essayé dans Hatari', () => {
  it("ne garde que ce qui suit le démarrage d'EmuTOS, sans le message du lanceur", () => {
    const brut =
      "Press <Esc> to run an early console\r\r\r\n\r   Hold <Shift> to pause this screen    \r\n\r\n\r\nCoucou\r\r\n\r\r\n(Appuie sur une touche pour revenir au bureau)"
    expect(sortieAtari(brut)).toBe('Coucou')
  })
  it('écarte les messages de Hatari', () => {
    expect(sortieAtari('Hold <Shift> to pause this screen\nWARN : quelque chose\nBonjour')).toBe('Bonjour')
  })
})
