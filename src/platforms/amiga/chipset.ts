import type { Cpu } from '../../cpu/cpu'
import type { Platform } from '../../cpu/platform'
import type { Size } from '../../cpu/types'
import { blit, registresBlitterVides } from './blitter'
import { Cia } from './cia'
import {
  CIAA,
  CIAB,
  CUSTOM,
  CUSTOM_FIN,
  CYCLES_PAR_IMAGE,
  CYCLES_PAR_LIGNE,
  DMA,
  ECRAN_LARGEUR,
  ECRAN_LIGNES,
  ECRAN_PREMIERE_LIGNE,
  ECRAN_X_DEBUT,
  INT,
  LIGNES_PAR_IMAGE,
  MASQUE_DMA,
  NIVEAU_INT,
  ORIGINE_X,
  ORIGINE_Y,
  R,
  nomRegistre
} from './machine'
import { Paula } from './paula'
import { dessinerLigne, dmaSprites, lirePlans, spriteVide, type ChangementCouleur, type Sprite } from './video'

/** Joystick : bits de l'état (mêmes que pour l'Atari). */
export const JOY_AMIGA = { haut: 1, bas: 2, gauche: 4, droite: 8, feu: 0x80 } as const

/** Action programmée (exercices vérifiés automatiquement), à l'image n° `image`. */
export interface EvenementAmiga {
  image: number
  /** Code clavier brut de l'Amiga, enfoncé puis relâché (sauf `maintenue`). */
  touche?: number
  caractere?: string
  maintenue?: boolean
  /** État du joystick (port 2). */
  joystick?: number
  /** Boutons de la souris (port 1). */
  boutonGauche?: boolean
  boutonDroit?: boolean
  /** Déplacement de la souris, en « mickeys ». */
  souris?: { dx: number; dy: number }
}

export interface ChipsetOptions {
  evenements?: EvenementAmiga[]
  /** Appelé à chaque image (50 fois par seconde de temps simulé). */
  onVbl?: (cpu: Cpu) => void
  /** Numéros des images à garder (vérification de l'écran à un moment précis). */
  captures?: number[]
}

/** Ce que l'interface et les vérifications peuvent lire de l'Amiga simulé. */
export interface MaterielAmiga {
  /** Derniers mots écrits dans les registres custom (index = décalage / 2). */
  regs: Uint16Array
  /** Registres « à double sens » : état réel. */
  dmacon(): number
  intena(): number
  intreq(): number
  /** Image complète la plus récente ($0RGB par pixel haute résolution, 704 × 288). */
  image(): Uint16Array
  /** Numéro de l'image en cours (0 au lancement). */
  numeroImage(): number
  /** Couleur affichée au point (x, y) de l'écran standard (origine = DIWSTRT $2C81), à l'image `n` (sinon : la dernière). */
  pixel(x: number, y: number, n?: number): number
  /** Demande de garder une copie de l'image n (pour les vérifications). */
  capturer(n: number): void
  ciaA: Cia
  ciaB: Cia
  paula: Paula
  sprites: Sprite[]
  /** Position du faisceau maintenant : ligne et position horizontale (cycles couleur). */
  faisceau(): { v: number; h: number }
  /** Remarques pédagogiques (WaitBlit oublié, Copper bloqué…), sans doublons. */
  alertes: string[]
  alerter(texte: string): void
  /** Entrées : souris, joystick, clavier. */
  souris(dx: number, dy: number): void
  /** Compteurs de la souris (même valeur que JOY0DAT). */
  compteursSouris(): number
  boutons(gauche: boolean, droit: boolean): void
  joystick(etat: number): void
  touche(code: number, enfoncee: boolean, caractere?: string): void
  /** Caractères tapés (pour la console du Kickstart simulé) : file lue par dos.library Read(). */
  frappes: string[]
  /** Écriture d'un registre custom (même effet qu'une écriture du 68000). */
  ecrire(decalage: number, valeur: number): void
  /** Le Blitter travaille encore. */
  blitterOccupe(): boolean
  /** Cycle du prochain événement qui peut réveiller une attente (image, timer, son, action). */
  prochainEvenement(): number
  /**
   * Balaye une image complète sans faire avancer le temps du programme : au lancement, l'écran
   * montre déjà ce que le système affiche (comme une machine allumée depuis longtemps).
   */
  prechauffer(): void
}

const registre = new WeakMap<Cpu, MaterielAmiga>()

/** Puces de l'Amiga simulé par ce processeur. */
export function materielAmiga(cpu: Cpu): MaterielAmiga | undefined {
  return registre.get(cpu)
}

/** Registres du Blitter (pour signaler une écriture pendant qu'il travaille). */
const EST_BLITTER = (d: number): boolean => (d >= 0x040 && d <= 0x074) || d === 0x058

export function createChipset(options: ChipsetOptions = {}): Platform {
  let cpu!: Cpu
  const regs = new Uint16Array(0x100)
  let dmacon = 0
  let intena = 0
  let intreq = 0
  let adkcon = 0
  let copcon = 0
  const bplpt = new Uint32Array(6)
  const donnees = Array.from({ length: 6 }, () => new Uint16Array(80))
  const sprites: Sprite[] = Array.from({ length: 8 }, spriteVide)
  const blitter = registresBlitterVides()
  let blitFin = 0
  let blitZero = true
  const alertes: string[] = []
  const alerter = (t: string): void => {
    if (!alertes.includes(t)) alertes.push(t)
  }

  // Faisceau : début de l'image en cours, ligne en cours et son début
  let debutImage = 0
  let ligne = 0
  let debutLigne = 0
  let numeroImage = 0
  let image = new Uint16Array(ECRAN_LARGEUR * ECRAN_LIGNES)
  let derniere = new Uint16Array(ECRAN_LARGEUR * ECRAN_LIGNES)
  const captures = new Map<number, Uint16Array | null>()
  let paletteLigne = new Uint16Array(32)
  let changements: ChangementCouleur[] = []

  // Copper
  let cpc = 0
  let copperTemps = 0
  let copperArrete = true
  let attente: { vp: number; hp: number; ve: number; he: number; bfd: boolean } | null = null

  // Entrées
  let sourisX = 0
  let sourisY = 0
  let gauche = false
  let droit = false
  let joy = 0
  const frappes: string[] = []
  const clavier: number[] = []
  let prochainOctetClavier = 0

  const paula = new Paula(
    () => cpu.memory,
    (voie) => demander(INT.AUD0 << voie)
  )
  const ciaA = new Cia(
    () => 0xff & ~(joy & JOY_AMIGA.feu ? 0x80 : 0) & ~(gauche ? 0x40 : 0),
    () => 0xff,
    () => demander(INT.PORTS)
  )
  const ciaB = new Cia(
    () => 0xff,
    () => 0xff,
    () => demander(INT.EXTER)
  )

  // Actions programmées
  type Action = { cycle: number; faire: () => void }
  let actions: Action[] = []
  function programmer(): void {
    actions = []
    for (const e of options.evenements ?? []) {
      const cycle = e.image * CYCLES_PAR_IMAGE + CYCLES_PAR_LIGNE * 100
      if (e.joystick !== undefined) actions.push({ cycle, faire: () => (joy = e.joystick!) })
      if (e.boutonGauche !== undefined || e.boutonDroit !== undefined) {
        actions.push({ cycle, faire: () => ((gauche = e.boutonGauche ?? gauche), (droit = e.boutonDroit ?? droit)) })
      }
      if (e.souris) actions.push({ cycle, faire: () => deplacer(e.souris!.dx, e.souris!.dy) })
      if (e.touche !== undefined) {
        actions.push({ cycle, faire: () => toucher(e.touche!, true, e.caractere) })
        if (!e.maintenue) actions.push({ cycle: cycle + 2 * CYCLES_PAR_IMAGE, faire: () => toucher(e.touche!, false) })
      }
    }
    actions.sort((a, b) => a.cycle - b.cycle)
  }

  function deplacer(dx: number, dy: number): void {
    sourisX = (sourisX + dx) & 0xff
    sourisY = (sourisY + dy) & 0xff
  }

  function toucher(code: number, enfoncee: boolean, caractere?: string): void {
    clavier.push((code & 0x7f) | (enfoncee ? 0 : 0x80))
    if (enfoncee && caractere) frappes.push(caractere)
  }

  // --- Interruptions ---------------------------------------------------------

  function demander(bits: number): void {
    intreq |= bits
  }

  function refleter(): void {
    let niveau = 0
    if (intena & INT.INTEN) {
      const actifs = intena & intreq & 0x3fff
      for (let b = 13; b >= 0; b--) {
        if (actifs & (1 << b)) {
          niveau = Math.max(niveau, NIVEAU_INT[b])
        }
      }
    }
    for (let l = 1; l <= 6; l++) {
      if (l === niveau) cpu.requestInterrupt(l)
      else cpu.cancelInterrupt(l)
    }
  }

  // --- Faisceau et Copper ----------------------------------------------------

  const faisceauA = (t: number): { v: number; h: number } => {
    const f = Math.max(0, t - debutImage)
    return { v: Math.floor(f / CYCLES_PAR_LIGNE), h: Math.floor((f % CYCLES_PAR_LIGNE) / 2) }
  }

  /** Premier instant ≥ t0 (dans l'image en cours) où le faisceau satisfait la condition d'un WAIT. */
  function premierInstant(t0: number, w: { vp: number; hp: number; ve: number; he: number; bfd: boolean }): number {
    let t = t0
    if (!w.bfd && t < blitFin) t = blitFin
    const { v: v0, h: h0 } = faisceauA(t)
    const vpm = w.vp & w.ve
    const hpm = w.hp & w.he
    for (let v = v0; v < LIGNES_PAR_IMAGE; v++) {
      const vm = v & 0xff & w.ve
      const debut = v === v0 ? h0 : 0
      if (vm > vpm) return Math.max(t, debutImage + v * CYCLES_PAR_LIGNE + debut * 2)
      if (vm < vpm) continue
      for (let h = debut; h < 227; h++) {
        if ((h & w.he) >= hpm) return Math.max(t, debutImage + v * CYCLES_PAR_LIGNE + h * 2)
      }
    }
    return Infinity
  }

  function copperActif(): boolean {
    return (dmacon & (DMA.DMAEN | DMA.COP)) === (DMA.DMAEN | DMA.COP)
  }

  function lireLong(hi: number): number {
    return ((regs[hi >> 1] << 16) | regs[(hi >> 1) + 1]) >>> 0
  }

  function sauterCopper(adresse: number, t: number): void {
    cpc = adresse & MASQUE_DMA
    attente = null
    copperArrete = false
    copperTemps = Math.max(copperTemps, t) + 4
  }

  /** Fait travailler le Copper jusqu'au cycle `limite`. */
  function copper(limite: number): void {
    if (!copperActif()) {
      copperTemps = Math.max(copperTemps, limite)
      return
    }
    const mem = cpu.memory
    for (let garde = 0; garde < 20000 && !copperArrete && copperTemps <= limite; garde++) {
      if (attente) {
        const t = premierInstant(copperTemps, attente)
        if (t > limite) {
          if (t === Infinity) copperArrete = true
          else copperTemps = t
          return
        }
        copperTemps = t + 2
        attente = null
        continue
      }
      const w1 = mem.readU16(cpc & MASQUE_DMA)
      const w2 = mem.readU16((cpc + 2) & MASQUE_DMA)
      cpc = (cpc + 4) & MASQUE_DMA
      copperTemps += 8
      if ((w1 & 1) === 0) {
        const reg = w1 & 0x1fe
        if (reg < 0x40 || (reg < 0x80 && !(copcon & 2))) {
          alerter(`Le Copper s'est arrêté : un MOVE vers ${nomRegistre(reg)} ($DFF${reg.toString(16).toUpperCase().padStart(3, '0')}) lui est interdit.`)
          copperArrete = true
          return
        }
        ecrireCustom(reg, w2, copperTemps)
      } else {
        const w = { vp: w1 >> 8, hp: w1 & 0xfe, ve: ((w2 >> 8) & 0x7f) | 0x80, he: w2 & 0xfe, bfd: (w2 & 0x8000) !== 0 }
        if ((w2 & 1) === 0) attente = w
        else if (premierInstant(copperTemps, w) <= copperTemps) cpc = (cpc + 4) & MASQUE_DMA // SKIP
      }
    }
  }

  /** Fin de la ligne `ligne` : lecture des plans, dessin, puis ligne suivante. */
  function finDeLigne(): void {
    const lecture = lirePlans(regs, bplpt, ligne, dmacon, cpu.memory, donnees)
    dessinerLigne(image, ligne, regs, lecture, donnees, sprites, paletteLigne, changements)
    ciaB.topTod()
    ligne++
    debutLigne += CYCLES_PAR_LIGNE
    if (ligne >= LIGNES_PAR_IMAGE) nouvelleImage()
    debutLigneSuivante()
  }

  function debutLigneSuivante(): void {
    paletteLigne = regs.slice(0xc0, 0xe0)
    changements = []
    if ((dmacon & (DMA.DMAEN | DMA.SPR)) === (DMA.DMAEN | DMA.SPR)) dmaSprites(sprites, ligne, cpu.memory)
  }

  let enPrechauffage = false

  function nouvelleImage(): void {
    ligne = 0
    debutImage = debutLigne
    if (captures.has(numeroImage)) captures.set(numeroImage, image.slice())
    const t = derniere
    derniere = image
    image = t
    numeroImage++
    demander(INT.VERTB)
    ciaA.topTod()
    for (const s of sprites) s.etat = 'controle'
    // Le Copper repart du début de sa liste à chaque image
    cpc = lireLong(R.COP1LCH) & MASQUE_DMA
    attente = null
    copperArrete = false
    copperTemps = debutImage + 2
    if (!enPrechauffage) options.onVbl?.(cpu)
  }

  function prechauffer(): void {
    enPrechauffage = true
    avancer(CYCLES_PAR_IMAGE)
    enPrechauffage = false
    // Retour à l'instant 0, avec l'image du système déjà affichée
    debutImage = debutLigne = 0
    ligne = 0
    numeroImage = 0
    intreq = 0
    copperTemps = 2
    ciaA.tod = ciaB.tod = 0
    for (const s of sprites) s.etat = 'controle'
    debutLigneSuivante()
  }

  /** Fait avancer le faisceau (Copper, lignes, images) jusqu'au cycle `t`. */
  function avancer(t: number): void {
    for (;;) {
      const finLigne = debutLigne + CYCLES_PAR_LIGNE
      copper(Math.min(t, finLigne - 1))
      if (t < finLigne) return
      finDeLigne()
    }
  }

  // --- Registres custom ------------------------------------------------------

  function setClr(ancien: number, v: number): number {
    return v & 0x8000 ? ancien | (v & 0x7fff) : ancien & ~v
  }

  function ecrireCustom(d: number, v: number, t: number): void {
    d &= 0x1fe
    v &= 0xffff
    if (EST_BLITTER(d) && t < blitFin) {
      alerter('Un registre du Blitter a été modifié pendant qu’il travaillait : attends sa fin (bit 14 de DMACONR, ou WaitBlit) avant de préparer le blit suivant.')
    }
    regs[d >> 1] = v
    switch (d) {
      case R.DMACON: {
        const avant = dmacon
        dmacon = setClr(dmacon, v) & 0x07ff
        const audio = dmacon & DMA.DMAEN ? dmacon & 0x0f : 0
        if (audio !== ((avant & DMA.DMAEN ? avant : 0) & 0x0f)) paula.dma(audio, t)
        if (!(avant & DMA.COP) && copperActif()) copperTemps = Math.max(copperTemps, t)
        return
      }
      case R.INTENA:
        intena = setClr(intena, v) & 0x7fff
        return
      case R.INTREQ:
        intreq = setClr(intreq, v) & 0x7fff
        return
      case R.ADKCON:
        adkcon = setClr(adkcon, v) & 0x7fff
        return
      case R.COPCON:
        copcon = v
        return
      case R.COPJMP1:
        sauterCopper(lireLong(R.COP1LCH), t)
        return
      case R.COPJMP2:
        sauterCopper(lireLong(R.COP2LCH), t)
        return
      case R.BLTSIZE:
        lancerBlit(v, t)
        return
      case R.BLTCON0:
        blitter.con0 = v
        return
      case R.BLTCON1:
        blitter.con1 = v
        return
      case R.BLTAFWM:
        blitter.afwm = v
        return
      case R.BLTALWM:
        blitter.alwm = v
        return
      case R.BLTCMOD:
        blitter.cmod = v
        return
      case R.BLTBMOD:
        blitter.bmod = v
        return
      case R.BLTAMOD:
        blitter.amod = v
        return
      case R.BLTDMOD:
        blitter.dmod = v
        return
      case R.BLTCDAT:
        blitter.cdat = v
        return
      case R.BLTBDAT:
        blitter.bdat = v
        return
      case R.BLTADAT:
        blitter.adat = v
        return
    }
    if (d >= R.BLTCPTH && d <= R.BLTDPTL) {
      const nom = (['cpt', 'bpt', 'apt', 'dpt'] as const)[(d - R.BLTCPTH) >> 2]
      blitter[nom] = d & 2 ? ((blitter[nom] & 0xffff0000) | (v & 0xfffe)) >>> 0 : ((v << 16) | (blitter[nom] & 0xffff)) >>> 0
      return
    }
    if (d >= R.BPL1PTH && d < R.BPL1PTH + 24) {
      const p = (d - R.BPL1PTH) >> 2
      bplpt[p] = d & 2 ? ((bplpt[p] & 0xffff0000) | (v & 0xfffe)) >>> 0 : ((v << 16) | (bplpt[p] & 0xffff)) >>> 0
      return
    }
    if (d >= R.SPR0PTH && d < R.SPR0POS) {
      const s = sprites[(d - R.SPR0PTH) >> 2]
      s.pt = d & 2 ? ((s.pt & 0xffff0000) | (v & 0xfffe)) >>> 0 : ((v << 16) | (s.pt & 0xffff)) >>> 0
      return
    }
    if (d >= R.SPR0POS && d < R.COLOR00) {
      // Sprites « à la main » : écrire CTL désarme le sprite, écrire DATA l'arme
      const s = sprites[(d - R.SPR0POS) >> 3]
      switch ((d & 7) >> 1) {
        case 0:
          s.pos = v
          break
        case 1:
          s.ctl = v
          s.arme = false
          break
        case 2:
          s.data = v
          s.arme = true
          break
        default:
          s.datb = v
      }
      return
    }
    if (d >= R.COLOR00 && d < R.COLOR00 + 64) {
      const index = (d - R.COLOR00) >> 1
      regs[d >> 1] = v & 0x0fff
      const h = Math.floor((t - debutLigne) / 2) * 4
      if (t >= debutLigne && h > ECRAN_X_DEBUT * 2) changements.push({ h, index, valeur: v & 0x0fff })
      else paletteLigne[index] = v & 0x0fff
      return
    }
    if (d >= R.AUD0LCH && d < R.BPL1PTH) {
      paula.ecrire((d - R.AUD0LCH) >> 4, d & 0x0f, v, t)
    }
  }

  function lancerBlit(taille: number, t: number): void {
    if (t < blitFin) alerter('Un blit a été lancé alors que le précédent n’était pas fini : il faut attendre le Blitter (WaitBlit) entre deux blits.')
    if (!(dmacon & DMA.DMAEN) || !(dmacon & DMA.BLT)) {
      alerter('BLTSIZE écrit alors que le DMA du Blitter est coupé (DMACON : bits BLTEN et DMAEN) : le Blitter ne fait rien.')
      return
    }
    const r = blit(blitter, taille, cpu.memory)
    // Les pointeurs ont avancé : les registres BLTxPT les reflètent
    const ecrireLong = (hi: number, v: number): void => {
      regs[hi >> 1] = v >>> 16
      regs[(hi >> 1) + 1] = v & 0xffff
    }
    ecrireLong(R.BLTCPTH, blitter.cpt)
    ecrireLong(R.BLTBPTH, blitter.bpt)
    ecrireLong(R.BLTAPTH, blitter.apt)
    ecrireLong(R.BLTDPTH, blitter.dpt)
    blitZero = r.zero
    blitFin = Math.max(t, blitFin) + r.cycles
  }

  function lireCustom(d: number, t: number): number {
    switch (d & 0x1fe) {
      case R.DMACONR:
        return dmacon | (t < blitFin ? DMA.BBUSY : 0) | (blitZero ? DMA.BZERO : 0)
      case R.VPOSR: {
        const { v } = faisceauA(t)
        return 0x8000 | (v >> 8)
      }
      case R.VHPOSR: {
        const { v, h } = faisceauA(t)
        return ((v & 0xff) << 8) | (h & 0xff)
      }
      case R.JOY0DAT:
        return (sourisY << 8) | sourisX
      case R.JOY1DAT: {
        const droite = joy & JOY_AMIGA.droite ? 1 : 0
        const gaucheJ = joy & JOY_AMIGA.gauche ? 1 : 0
        const bas = joy & JOY_AMIGA.bas ? 1 : 0
        const haut = joy & JOY_AMIGA.haut ? 1 : 0
        return (gaucheJ << 9) | ((haut ^ gaucheJ) << 8) | (droite << 1) | (bas ^ droite)
      }
      case R.POTGOR:
        return 0xff00 & ~(droit ? 0x0400 : 0)
      case R.ADKCONR:
        return adkcon
      case R.INTENAR:
        return intena
      case R.INTREQR:
        return intreq
      default:
        return 0
    }
  }

  // --- Plateforme --------------------------------------------------------------

  const estCustom = (a: number): boolean => a >= CUSTOM && a < CUSTOM_FIN
  const regCiaA = (a: number): number => (a & 1 && a >= CIAA && a <= CIAA + 0xf00 ? (a >> 8) & 15 : -1)
  const regCiaB = (a: number): number => (!(a & 1) && a >= CIAB && a <= CIAB + 0xf00 ? (a >> 8) & 15 : -1)

  function prochainEvenement(): number {
    return Math.min(
      debutImage + CYCLES_PAR_IMAGE,
      ciaA.prochaineEcheance(),
      ciaB.prochaineEcheance(),
      paula.prochaineEcheance(),
      actions[0]?.cycle ?? Infinity,
      blitFin > cpu.cycles ? blitFin : Infinity
    )
  }

  function pixel(x: number, y: number, n?: number): number {
    const img = n === undefined ? derniere : (captures.get(n) ?? derniere)
    const col = (ORIGINE_X - ECRAN_X_DEBUT + x) * 2
    const l = ORIGINE_Y - ECRAN_PREMIERE_LIGNE + y
    if (col < 0 || col >= ECRAN_LARGEUR || l < 0 || l >= ECRAN_LIGNES) return 0
    return img[l * ECRAN_LARGEUR + col]
  }

  return {
    onReset(c: Cpu): void {
      cpu = c
      regs.fill(0)
      dmacon = intena = intreq = adkcon = copcon = 0
      bplpt.fill(0)
      for (let i = 0; i < 8; i++) sprites[i] = spriteVide()
      Object.assign(blitter, registresBlitterVides())
      blitFin = 0
      blitZero = true
      alertes.length = 0
      debutImage = debutLigne = 0
      ligne = 0
      numeroImage = 0
      image = new Uint16Array(ECRAN_LARGEUR * ECRAN_LIGNES)
      derniere = new Uint16Array(ECRAN_LARGEUR * ECRAN_LIGNES)
      captures.clear()
      for (const n of options.captures ?? []) captures.set(n, null)
      paletteLigne = new Uint16Array(32)
      changements = []
      cpc = 0
      copperTemps = 0
      copperArrete = true
      attente = null
      sourisX = sourisY = 0
      gauche = droit = false
      joy = 0
      frappes.length = 0
      clavier.length = 0
      prochainOctetClavier = 0
      paula.reset()
      ciaA.reset(0)
      ciaB.reset(0)
      programmer()
      registre.set(cpu, {
        regs,
        dmacon: () => dmacon,
        intena: () => intena,
        intreq: () => intreq,
        image: () => derniere,
        numeroImage: () => numeroImage,
        pixel,
        capturer: (n) => {
          if (!captures.has(n)) captures.set(n, null)
        },
        ciaA,
        ciaB,
        paula,
        sprites,
        faisceau: () => faisceauA(cpu.cycles),
        alertes,
        alerter,
        souris: deplacer,
        compteursSouris: () => (sourisY << 8) | sourisX,
        boutons: (g, d) => {
          gauche = g
          droit = d
        },
        joystick: (e) => (joy = e),
        touche: toucher,
        frappes,
        ecrire: (d, v) => {
          avancer(cpu.cycles)
          ecrireCustom(d, v, cpu.cycles)
          refleter()
        },
        blitterOccupe: () => cpu.cycles < blitFin,
        prochainEvenement,
        prechauffer
      })
    },

    ioStart: CIAB,

    readIo(c: Cpu, address: number, size: Size): number | undefined {
      if (estCustom(address)) {
        avancer(c.cycles)
        if (size === 4) return ((lireCustom(address - CUSTOM, c.cycles) << 16) | lireCustom(address + 2 - CUSTOM, c.cycles)) >>> 0
        const mot = lireCustom((address - CUSTOM) & ~1, c.cycles)
        return size === 2 ? mot : address & 1 ? mot & 0xff : mot >> 8
      }
      if (address >= CIAB && address < CIAA + 0x1000) {
        let v = 0
        for (let i = 0; i < size; i++) {
          const a = address + i
          const ra = regCiaA(a)
          const rb = regCiaB(a)
          v = (v << 8) | (ra >= 0 ? ciaA.lire(ra, c.cycles) : rb >= 0 ? ciaB.lire(rb, c.cycles) : 0xff)
        }
        return v >>> 0
      }
      return undefined
    },

    onMemoryWrite(c: Cpu, address: number, size: Size, value: number): void {
      if (estCustom(address)) {
        avancer(c.cycles)
        const d = address - CUSTOM
        if (size === 4) {
          ecrireCustom(d, value >>> 16, c.cycles)
          ecrireCustom(d + 2, value & 0xffff, c.cycles)
        } else if (size === 2) ecrireCustom(d, value, c.cycles)
        else ecrireCustom(d & ~1, ((value & 0xff) << 8) | (value & 0xff), c.cycles) // un octet est répété sur les deux moitiés du bus
        refleter()
        return
      }
      if (address >= CIAB && address < CIAA + 0x1000) {
        for (let i = 0; i < size; i++) {
          const a = address + i
          const o = (value >>> (8 * (size - 1 - i))) & 0xff
          const ra = regCiaA(a)
          const rb = regCiaB(a)
          if (ra >= 0) ciaA.ecrire(ra, o, c.cycles)
          else if (rb >= 0) ciaB.ecrire(rb, o, c.cycles)
        }
        refleter()
      }
    },

    afterStep(c: Cpu): void {
      while (actions.length && c.cycles >= actions[0].cycle) actions.shift()!.faire()
      avancer(c.cycles)
      ciaA.avancer(c.cycles)
      ciaB.avancer(c.cycles)
      paula.avancer(c.cycles)
      if (blitFin && c.cycles >= blitFin) {
        blitFin = 0
        demander(INT.BLIT)
      }
      // Clavier : un octet toutes les deux lignes environ, quand la CIA a été lue
      if (clavier.length && c.cycles >= prochainOctetClavier) {
        const brut = clavier.shift()!
        // Le clavier envoie les bits 6-0 puis 7, inversés : la CIA lit NOT(code << 1 | relâchée)
        ciaA.recevoirSerie(~(((brut & 0x7f) << 1) | (brut >> 7)) & 0xff)
        prochainOctetClavier = c.cycles + CYCLES_PAR_LIGNE * 4
      }
      refleter()
    }
  }
}
