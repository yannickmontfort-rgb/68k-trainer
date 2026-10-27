import type { EtatEmulateurPublic } from '../../../shared/ipc'
import { confirmer } from '../components/dialogue'
import { echapper } from './parcours/markdown'
import { traducteur } from '../langue'

const t = traducteur({
  fr: {
    mo: '{n} Mo',
    chargement: 'Chargement…',
    licence: 'Licence : {licence}',
    indisponible:
      "L'installation automatique n'existe que sous Windows pour l'instant. Sur ce système, installe {quoi} toi-même ; le bouton « Exporter » du bac à sable fabrique le programme à y lancer.",
    hatariAilleurs: 'Hatari (paquet « hatari » de ta distribution, ou hatari-emu.org)',
    fsuaeAilleurs: 'FS-UAE (fs-uae.net)',
    installe: '✅ Installé{maj}',
    majDisponible: ' (version {version} : une mise à jour est disponible)',
    embarque: "Pas encore installé — livré avec 68k Trainer ({taille}), pas besoin d'Internet",
    aTelecharger: 'Pas encore installé — {taille} à télécharger',
    dossierPartage: 'Dossier de partage :',
    preparation: 'Préparation…',
    lancer: 'Lancer {nom}',
    mettreAJour: 'Mettre à jour',
    installer: 'Installer {nom}',
    ouvrirPartage: 'Ouvrir le dossier de partage',
    desinstaller: 'Désinstaller',
    titre: "Émulateurs d'étude",
    intro:
      "Pour voir tes programmes tourner sur une machine plus complète que celle de 68k Trainer. Ce sont des versions réglées pour l'étude, pas pour les jeux : les systèmes fournis sont libres (EmuTOS pour l'Atari, AROS pour l'Amiga). Les ROM d'origine (TOS, Kickstart) sont protégées par le droit d'auteur : 68k Trainer ne les fournit pas.",
    introEssayer: "Le bouton « Essayer dans l'émulateur » du bac à sable dépose ton programme dans le dossier de partage et le lance.",
    maRomTitre: 'Ma propre ROM',
    maRomTexte:
      "Si tu possèdes légalement une ROM d'origine, un TOS ou un Kickstart (celui d'Amiga Forever, par exemple, ou celui que tu as copié depuis ta machine), l'émulateur peut s'en servir à la place du système libre. 68k Trainer la copie seulement dans son propre dossier et ne la transmet jamais.",
    romAtari: 'Atari ST : ma ROM du TOS (192 ou 256 Ko)',
    romAmiga: 'Amiga : mon Kickstart (256 ou 512 Ko)',
    aucuneRom: "Aucune : l'émulateur utilise {systeme}.",
    choisirRom: 'Choisir ma ROM…',
    remarqueKickstart:
      "Avec le Kickstart 1.3, l'Amiga démarre sur ta disquette Workbench{choisir} ; le bouton « Essayer » y dépose ton programme, que tu lances depuis le Shell en tapant <code>PARTAGE:nom</code>.",
    aChoisir: ' (à choisir ci-dessous)',
    systemeLibre: 'Système libre ({systeme})',
    maRom: 'Ma ROM',
    changerRom: 'Changer de ROM…',
    changerAdf: 'Changer de disquette Workbench…',
    choisirAdf: 'Choisir ma disquette Workbench (.adf)…',
    retirer: 'Retirer',
    romReconnue: "{nom} est reconnue : l'émulateur s'en servira à son prochain démarrage.",
    adfEnregistre: 'Disquette Workbench enregistrée.',
    retirerConfirmer: "Retirer ta ROM de 68k Trainer ? L'émulateur reviendra au système libre ; ton fichier d'origine n'est pas touché.",
    romRetiree: 'ROM retirée.',
    estInstalle: '{nom} est installé.',
    installationEchouee: "L'installation a échoué : {erreur}",
    demarre: '{nom} démarre…',
    lancementImpossible: 'Impossible de lancer {nom} : {erreur}',
    desinstallerConfirmer: 'Désinstaller {nom} ? Le dossier de partage et tes programmes sont conservés.',
    estDesinstalle: '{nom} est désinstallé.'
  },
  en: {
    mo: '{n} MB',
    chargement: 'Loading…',
    licence: 'License: {licence}',
    indisponible:
      'Automatic installation is only available on Windows for now. On this system, install {quoi} yourself; the “Export” button in the sandbox builds the program to run in it.',
    hatariAilleurs: 'Hatari (the “hatari” package of your distribution, or hatari-emu.org)',
    fsuaeAilleurs: 'FS-UAE (fs-uae.net)',
    installe: '✅ Installed{maj}',
    majDisponible: ' (version {version}: an update is available)',
    embarque: 'Not installed yet — shipped with 68k Trainer ({taille}), no Internet connection needed',
    aTelecharger: 'Not installed yet — {taille} to download',
    dossierPartage: 'Shared folder:',
    preparation: 'Preparing…',
    lancer: 'Start {nom}',
    mettreAJour: 'Update',
    installer: 'Install {nom}',
    ouvrirPartage: 'Open the shared folder',
    desinstaller: 'Uninstall',
    titre: 'Emulators for study',
    intro:
      'To see your programs run on a more complete machine than the one in 68k Trainer. These versions are set up for study, not for games: the systems provided are free (EmuTOS for the Atari, AROS for the Amiga). The original ROMs (TOS, Kickstart) are protected by copyright, so 68k Trainer does not provide them.',
    introEssayer: 'The “Try in the emulator” button in the sandbox puts your program in the shared folder and runs it.',
    maRomTitre: 'My own ROM',
    maRomTexte:
      'If you legally own an original ROM, a TOS or a Kickstart (the one from Amiga Forever, for example, or one you copied from your own machine), the emulator can use it instead of the free system. 68k Trainer only copies it into its own folder and never shares it.',
    romAtari: 'Atari ST: my TOS ROM (192 or 256 KB)',
    romAmiga: 'Amiga: my Kickstart (256 or 512 KB)',
    aucuneRom: 'None: the emulator uses {systeme}.',
    choisirRom: 'Choose my ROM…',
    remarqueKickstart:
      'With Kickstart 1.3, the Amiga boots from your Workbench disk{choisir}; the “Try” button puts your program there, and you run it from the Shell by typing <code>PARTAGE:name</code>.',
    aChoisir: ' (choose it below)',
    systemeLibre: 'Free system ({systeme})',
    maRom: 'My ROM',
    changerRom: 'Change ROM…',
    changerAdf: 'Change Workbench disk…',
    choisirAdf: 'Choose my Workbench disk (.adf)…',
    retirer: 'Remove',
    romReconnue: '{nom} is recognized: the emulator will use it the next time it starts.',
    adfEnregistre: 'Workbench disk saved.',
    retirerConfirmer: 'Remove your ROM from 68k Trainer? The emulator will go back to the free system; your original file is not touched.',
    romRetiree: 'ROM removed.',
    estInstalle: '{nom} is installed.',
    installationEchouee: 'Installation failed: {erreur}',
    demarre: '{nom} is starting…',
    lancementImpossible: 'Could not start {nom}: {erreur}',
    desinstallerConfirmer: 'Uninstall {nom}? The shared folder and your programs are kept.',
    estDesinstalle: '{nom} is uninstalled.'
  }
})

const mo = (octets: number): string => t('mo', { n: Math.round(octets / 1e6) })

/**
 * Les émulateurs d'étude (Hatari pour l'Atari ST, WinUAE pour l'Amiga) : installation à la demande,
 * lancement, dossier de partage, et « ma propre ROM » (TOS ou Kickstart fourni par l'utilisateur).
 * Pour étudier les machines, pas pour jouer : 68k Trainer ne fournit aucune ROM sous droits.
 */
export function renderEmulateurs(container: HTMLElement): () => void {
  container.innerHTML = `<div class="emulateurs-view"><p class="loading">${t('chargement')}</p></div>`
  const root = container.querySelector('.emulateurs-view') as HTMLDivElement
  let disposed = false
  const enCours = new Set<string>()
  const oublierProgression = window.api.surProgressionEmulateur((p) => {
    const barre = root.querySelector<HTMLProgressElement>(`#progression-${p.id}`)
    const etape = root.querySelector<HTMLElement>(`#etape-${p.id}`)
    // Installation lancée ailleurs (au premier lancement, après l'installateur) ou terminée
    if (!barre || p.etape === 'Terminé') void rafraichir()
    if (barre) {
      barre.max = Math.max(1, p.total)
      barre.value = p.fait
    }
    if (etape) etape.textContent = p.etape
  })

  function carte(e: EtatEmulateurPublic): string {
    const occupe = enCours.has(e.id) || e.enCours
    const machine = e.machine === 'atari' ? 'Atari ST' : 'Amiga'
    return `
      <div class="apropos-card emulateur-carte" data-id="${e.id}">
        <h3>${echapper(e.nom)} <small>${echapper(e.version)} — ${machine}</small></h3>
        <p class="apropos-texte">${echapper(e.description)}</p>
        <p class="emulateur-licence">${t('licence', { licence: echapper(e.licence) })}</p>
        <p class="emulateur-etat">${
          !e.disponible
            ? t('indisponible', { quoi: e.id === 'hatari' ? t('hatariAilleurs') : t('fsuaeAilleurs') })
            : e.installe
            ? t('installe', {
                maj: e.versionInstallee && e.versionInstallee !== e.version ? t('majDisponible', { version: echapper(e.versionInstallee) }) : ''
              })
            : e.embarque
              ? t('embarque', { taille: mo(e.taille) })
              : t('aTelecharger', { taille: mo(e.taille) })
        }</p>
        <p class="emulateur-partage">${t('dossierPartage')} <code>${echapper(e.dossierPartage)}</code></p>
        ${occupe ? `<progress id="progression-${e.id}" max="1" value="0"></progress><p class="emulateur-etape" id="etape-${e.id}">${t('preparation')}</p>` : ''}
        <div class="profils-form-boutons">
          ${
            !e.disponible
              ? ''
              : e.installe
              ? `<button data-action="lancer" ${occupe ? 'disabled' : ''}>${t('lancer', { nom: echapper(e.nom) })}</button>
                 ${e.versionInstallee !== e.version ? `<button data-action="installer" ${occupe ? 'disabled' : ''}>${t('mettreAJour')}</button>` : ''}`
              : `<button data-action="installer" ${occupe ? 'disabled' : ''}>${t('installer', { nom: echapper(e.nom) })}</button>`
          }
          <button data-action="partage">${t('ouvrirPartage')}</button>
          ${e.installe ? `<button data-action="desinstaller" class="btn-danger" ${occupe ? 'disabled' : ''}>${t('desinstaller')}</button>` : ''}
        </div>
        <p class="profils-message" id="message-${e.id}"></p>
      </div>`
  }

  let etats: EtatEmulateurPublic[] = []

  async function rafraichir(): Promise<void> {
    etats = await window.api.emulateursEtat()
    if (disposed) return
    root.innerHTML = `
      <div class="emulateurs-colonne">
        <div class="apropos-card">
          <h2>${t('titre')}</h2>
          <p class="apropos-texte">${t('intro')}</p>
          <p class="apropos-texte">${t('introEssayer')}</p>
        </div>
        ${etats.map(carte).join('')}
        <div class="apropos-card">
          <h3>${t('maRomTitre')}</h3>
          <p class="apropos-texte">${t('maRomTexte')}</p>
          ${carteRom('atari')}
          ${carteRom('amiga')}
          <p class="profils-message" id="message-rom"></p>
        </div>
      </div>`
  }

  let roms: Awaited<ReturnType<typeof window.api.romsEtat>> = {}

  function carteRom(machine: 'atari' | 'amiga'): string {
    const rom = roms[machine]
    const titre = machine === 'atari' ? t('romAtari') : t('romAmiga')
    const libre = machine === 'atari' ? 'EmuTOS' : 'AROS'
    if (!rom) {
      return `<div class="rom-ligne" data-machine="${machine}"><h4>${titre}</h4>
        <p class="apropos-texte">${t('aucuneRom', { systeme: libre })}</p>
        <div class="profils-form-boutons"><button data-rom="choisir">${t('choisirRom')}</button></div></div>`
    }
    const remarque =
      machine === 'amiga' && !rom.essaiAutomatique
        ? `<p class="apropos-texte">${t('remarqueKickstart', { choisir: rom.adf ? '' : t('aChoisir') })}</p>`
        : ''
    return `<div class="rom-ligne" data-machine="${machine}"><h4>${titre}</h4>
      <p class="apropos-texte"><strong>${echapper(rom.nom)}</strong></p>
      <label class="rom-choix"><input type="radio" name="rom-${machine}" value="libre" ${rom.actif ? '' : 'checked'} /> ${t('systemeLibre', { systeme: libre })}</label>
      <label class="rom-choix"><input type="radio" name="rom-${machine}" value="rom" ${rom.actif ? 'checked' : ''} /> ${t('maRom')}</label>
      ${remarque}
      <div class="profils-form-boutons">
        <button data-rom="choisir">${t('changerRom')}</button>
        ${machine === 'amiga' && !rom.essaiAutomatique ? `<button data-rom="adf">${rom.adf ? t('changerAdf') : t('choisirAdf')}</button>` : ''}
        <button data-rom="retirer" class="btn-danger">${t('retirer')}</button>
      </div></div>`
  }

  async function rafraichirRoms(): Promise<void> {
    roms = await window.api.romsEtat()
  }

  root.addEventListener('change', (ev) => {
    const radio = ev.target as HTMLInputElement
    const machine = radio.closest<HTMLElement>('.rom-ligne')?.dataset.machine as 'atari' | 'amiga' | undefined
    if (!machine || radio.type !== 'radio') return
    void window.api.romUtiliser(machine, radio.value === 'rom').then(rafraichirRoms)
  })

  root.addEventListener('click', (ev) => {
    const bouton = (ev.target as HTMLElement).closest<HTMLButtonElement>('button[data-rom]')
    const machine = bouton?.closest<HTMLElement>('.rom-ligne')?.dataset.machine as 'atari' | 'amiga' | undefined
    if (!bouton || !machine) return
    const message = (texte: string): void => {
      const m = root.querySelector<HTMLElement>('#message-rom')
      if (m) m.textContent = texte
    }
    const apres = async (texte: string): Promise<void> => {
      await rafraichirRoms()
      await rafraichir()
      message(texte)
    }
    switch (bouton.dataset.rom) {
      case 'choisir':
        void window.api.romChoisir(machine).then((r) => {
          if (r.ok) void apres(t('romReconnue', { nom: r.nom ?? '' }))
          else if (r.erreur) message(r.erreur)
        })
        break
      case 'adf':
        void window.api.romAdfChoisir().then((r) => {
          if (r.ok) void apres(t('adfEnregistre'))
          else if (r.erreur) message(r.erreur)
        })
        break
      case 'retirer':
        void confirmer(t('retirerConfirmer'), t('retirer')).then(
          async (oui) => {
            if (!oui) return
            await window.api.romRetirer(machine)
            await apres(t('romRetiree'))
          }
        )
        break
    }
  })

  root.addEventListener('click', (ev) => {
    const bouton = (ev.target as HTMLElement).closest<HTMLButtonElement>('button[data-action]')
    const id = bouton?.closest<HTMLElement>('.emulateur-carte')?.dataset.id as 'hatari' | 'winuae' | undefined
    if (!bouton || !id) return
    const e = etats.find((x) => x.id === id)!
    const message = (texte: string): void => {
      const m = root.querySelector<HTMLElement>(`#message-${id}`)
      if (m) m.textContent = texte
    }
    switch (bouton.dataset.action) {
      case 'installer':
        enCours.add(id)
        void rafraichir()
          .then(() => window.api.emulateurInstaller(id))
          .then(async (r) => {
            enCours.delete(id)
            await rafraichir()
            message(r.ok ? t('estInstalle', { nom: e.nom }) : t('installationEchouee', { erreur: r.erreur ?? '' }))
          })
        break
      case 'lancer':
        void window.api.emulateurLancer(id).then((r) => message(r.ok ? t('demarre', { nom: e.nom }) : t('lancementImpossible', { nom: e.nom, erreur: r.erreur ?? '' })))
        break
      case 'partage':
        void window.api.ouvrirPartage(e.machine)
        break
      case 'desinstaller':
        void confirmer(t('desinstallerConfirmer', { nom: e.nom }), t('desinstaller')).then(async (oui) => {
          if (!oui) return
          await window.api.emulateurDesinstaller(id)
          await rafraichir()
          message(t('estDesinstalle', { nom: e.nom }))
        })
        break
    }
  })

  void rafraichirRoms().then(rafraichir)
  return () => {
    disposed = true
    oublierProgression()
  }
}
