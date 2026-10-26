import type { EtatEmulateurPublic } from '../../../shared/ipc'
import { confirmer } from '../components/dialogue'
import { echapper } from './parcours/markdown'

const mo = (octets: number): string => `${Math.round(octets / 1e6)} Mo`

/**
 * Les émulateurs d'étude (Hatari pour l'Atari ST, WinUAE pour l'Amiga) : installation à la demande,
 * lancement, dossier de partage, et « ma propre ROM » (TOS ou Kickstart fourni par l'utilisateur).
 * Pour étudier les machines, pas pour jouer : 68k Trainer ne fournit aucune ROM sous droits.
 */
export function renderEmulateurs(container: HTMLElement): () => void {
  container.innerHTML = `<div class="emulateurs-view"><p class="loading">Chargement…</p></div>`
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
        <p class="emulateur-licence">Licence : ${echapper(e.licence)}</p>
        <p class="emulateur-etat">${
          !e.disponible
            ? `L'installation automatique n'existe que sous Windows pour l'instant. Sur ce système, installe ${
                e.id === 'hatari' ? 'Hatari (paquet « hatari » de ta distribution, ou hatari-emu.org)' : 'FS-UAE (fs-uae.net)'
              } toi-même ; le bouton « Exporter » du bac à sable fabrique le programme à y lancer.`
            : e.installe
            ? `✅ Installé${e.versionInstallee && e.versionInstallee !== e.version ? ` (version ${echapper(e.versionInstallee)} : une mise à jour est disponible)` : ''}`
            : e.embarque
              ? `Pas encore installé — livré avec 68k Trainer (${mo(e.taille)}), pas besoin d'Internet`
              : `Pas encore installé — ${mo(e.taille)} à télécharger`
        }</p>
        <p class="emulateur-partage">Dossier de partage : <code>${echapper(e.dossierPartage)}</code></p>
        ${occupe ? `<progress id="progression-${e.id}" max="1" value="0"></progress><p class="emulateur-etape" id="etape-${e.id}">Préparation…</p>` : ''}
        <div class="profils-form-boutons">
          ${
            !e.disponible
              ? ''
              : e.installe
              ? `<button data-action="lancer" ${occupe ? 'disabled' : ''}>Lancer ${echapper(e.nom)}</button>
                 ${e.versionInstallee !== e.version ? `<button data-action="installer" ${occupe ? 'disabled' : ''}>Mettre à jour</button>` : ''}`
              : `<button data-action="installer" ${occupe ? 'disabled' : ''}>Installer ${echapper(e.nom)}</button>`
          }
          <button data-action="partage">Ouvrir le dossier de partage</button>
          ${e.installe ? `<button data-action="desinstaller" class="btn-danger" ${occupe ? 'disabled' : ''}>Désinstaller</button>` : ''}
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
          <h2>Émulateurs d'étude</h2>
          <p class="apropos-texte">Pour voir tes programmes tourner sur une machine plus complète que celle de 68k Trainer.
          Ce sont des versions réglées pour l'étude, pas pour les jeux : les systèmes fournis sont libres
          (EmuTOS pour l'Atari, AROS pour l'Amiga). Les ROM d'origine (TOS, Kickstart) sont protégées par le droit
          d'auteur : 68k Trainer ne les fournit pas.</p>
          <p class="apropos-texte">Le bouton « Essayer dans l'émulateur » du bac à sable dépose ton programme dans le
          dossier de partage et le lance.</p>
        </div>
        ${etats.map(carte).join('')}
        <div class="apropos-card">
          <h3>Ma propre ROM</h3>
          <p class="apropos-texte">Si tu possèdes légalement une ROM d'origine, un TOS ou un Kickstart (celui
          d'Amiga Forever, par exemple, ou celui que tu as copié depuis ta machine), l'émulateur peut s'en servir à
          la place du système libre. 68k Trainer la copie seulement dans son propre dossier et ne la transmet jamais.</p>
          ${carteRom('atari')}
          ${carteRom('amiga')}
          <p class="profils-message" id="message-rom"></p>
        </div>
      </div>`
  }

  let roms: Awaited<ReturnType<typeof window.api.romsEtat>> = {}

  function carteRom(machine: 'atari' | 'amiga'): string {
    const rom = roms[machine]
    const titre = machine === 'atari' ? 'Atari ST : ma ROM du TOS (192 ou 256 Ko)' : 'Amiga : mon Kickstart (256 ou 512 Ko)'
    if (!rom) {
      return `<div class="rom-ligne" data-machine="${machine}"><h4>${titre}</h4>
        <p class="apropos-texte">Aucune : l'émulateur utilise ${machine === 'atari' ? 'EmuTOS' : 'AROS'}.</p>
        <div class="profils-form-boutons"><button data-rom="choisir">Choisir ma ROM…</button></div></div>`
    }
    const remarque =
      machine === 'amiga' && !rom.essaiAutomatique
        ? `<p class="apropos-texte">Avec le Kickstart 1.3, l'Amiga démarre sur ta disquette Workbench${rom.adf ? '' : ' (à choisir ci-dessous)'} ;
           le bouton « Essayer » y dépose ton programme, que tu lances depuis le Shell en tapant <code>PARTAGE:nom</code>.</p>`
        : ''
    return `<div class="rom-ligne" data-machine="${machine}"><h4>${titre}</h4>
      <p class="apropos-texte"><strong>${echapper(rom.nom)}</strong></p>
      <label class="rom-choix"><input type="radio" name="rom-${machine}" value="libre" ${rom.actif ? '' : 'checked'} /> Système libre (${machine === 'atari' ? 'EmuTOS' : 'AROS'})</label>
      <label class="rom-choix"><input type="radio" name="rom-${machine}" value="rom" ${rom.actif ? 'checked' : ''} /> Ma ROM</label>
      ${remarque}
      <div class="profils-form-boutons">
        <button data-rom="choisir">Changer de ROM…</button>
        ${machine === 'amiga' && !rom.essaiAutomatique ? `<button data-rom="adf">${rom.adf ? 'Changer de disquette Workbench…' : 'Choisir ma disquette Workbench (.adf)…'}</button>` : ''}
        <button data-rom="retirer" class="btn-danger">Retirer</button>
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
          if (r.ok) void apres(`${r.nom} est reconnue : l'émulateur s'en servira à son prochain démarrage.`)
          else if (r.erreur) message(r.erreur)
        })
        break
      case 'adf':
        void window.api.romAdfChoisir().then((r) => {
          if (r.ok) void apres('Disquette Workbench enregistrée.')
          else if (r.erreur) message(r.erreur)
        })
        break
      case 'retirer':
        void confirmer("Retirer ta ROM de 68k Trainer ? L'émulateur reviendra au système libre ; ton fichier d'origine n'est pas touché.", 'Retirer').then(
          async (oui) => {
            if (!oui) return
            await window.api.romRetirer(machine)
            await apres('ROM retirée.')
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
            message(r.ok ? `${e.nom} est installé.` : `L'installation a échoué : ${r.erreur}`)
          })
        break
      case 'lancer':
        void window.api.emulateurLancer(id).then((r) => message(r.ok ? `${e.nom} démarre…` : `Impossible de lancer ${e.nom} : ${r.erreur}`))
        break
      case 'partage':
        void window.api.ouvrirPartage(e.machine)
        break
      case 'desinstaller':
        void confirmer(`Désinstaller ${e.nom} ? Le dossier de partage et tes programmes sont conservés.`, 'Désinstaller').then(async (oui) => {
          if (!oui) return
          await window.api.emulateurDesinstaller(id)
          await rafraichir()
          message(`${e.nom} est désinstallé.`)
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
