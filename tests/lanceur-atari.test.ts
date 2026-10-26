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

describe('texte affiché sous un vrai TOS', () => {
  it('saute le test de la mémoire du TOS et ses retours arrière', () => {
    const brut =
      'Memory Test:\r\r\nST RAM                \b\b\b\b\b\b\b\b--------\b\b\b\b\b\b\b\b\b  1024 KB\r\r\nMemory Test Complete.\r\r\n                                        \r                                       \b\b\b\b\b\b\b\rBonjour TOS\r\r\n\r\r\n(Appuie sur une touche pour revenir au bureau)'
    expect(sortieAtari(brut)).toBe('Bonjour TOS')
  })
})
