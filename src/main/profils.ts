import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'crypto'
import { existsSync } from 'fs'
import { copyFile, mkdir, readFile, rm, writeFile } from 'fs/promises'
import { join } from 'path'
import type { ExportProfil, ProfilPublic, ProgressState, ResultatProfil } from '../shared/ipc'
import { normaliserProgression } from '../shared/progression'

/**
 * Profils d'utilisateurs, 100 % locaux : un dossier par profil dans le dossier de données de
 * l'application. Le mot de passe (facultatif) n'est jamais stocké : seulement un hachage scrypt
 * salé. C'est une protection « anti-curieux » dans l'application, pas une sécurité forte : les
 * fichiers restent lisibles sur le disque.
 */

interface MotDePasse {
  sel: string
  hachage: string
}

interface Profil {
  id: string
  nom: string
  creeLe: string
  motDePasse?: MotDePasse
}

interface FichierProfils {
  version: 1
  profils: Profil[]
  dernier?: string
}

const FORMAT_EXPORT = '68k-trainer-profil'

function hacher(motDePasse: string, sel = randomBytes(16).toString('hex')): MotDePasse {
  return { sel, hachage: scryptSync(motDePasse, sel, 32).toString('hex') }
}

function verifier(motDePasse: string, attendu: MotDePasse): boolean {
  const calcule = Buffer.from(hacher(motDePasse, attendu.sel).hachage, 'hex')
  const reference = Buffer.from(attendu.hachage, 'hex')
  return calcule.length === reference.length && timingSafeEqual(calcule, reference)
}

function nomValide(nom: string): string {
  const propre = nom.trim().replace(/\s+/g, ' ').slice(0, 40)
  if (!propre) throw new Error('Le nom du profil ne peut pas être vide.')
  return propre
}

export class GestionProfils {
  private actif: Profil | null = null

  constructor(private readonly racine: string) {}

  private get cheminIndex(): string {
    return join(this.racine, 'profils.json')
  }

  private dossier(id: string): string {
    return join(this.racine, 'profils', id)
  }

  private async lireIndex(): Promise<FichierProfils> {
    try {
      const index = JSON.parse(await readFile(this.cheminIndex, 'utf-8')) as FichierProfils
      return { version: 1, profils: index.profils ?? [], dernier: index.dernier }
    } catch {
      return this.migrer()
    }
  }

  /**
   * Premier lancement avec profils : la progression de l'ancienne version (progress.json à la
   * racine) devient un premier profil « Moi ». L'ancien fichier est laissé en place (sauvegarde).
   */
  private async migrer(): Promise<FichierProfils> {
    const index: FichierProfils = { version: 1, profils: [] }
    const ancien = join(this.racine, 'progress.json')
    if (existsSync(ancien)) {
      const profil: Profil = { id: randomUUID(), nom: 'Moi', creeLe: new Date().toISOString() }
      await mkdir(this.dossier(profil.id), { recursive: true })
      await copyFile(ancien, join(this.dossier(profil.id), 'progress.json'))
      index.profils.push(profil)
      index.dernier = profil.id
    }
    await this.ecrireIndex(index)
    return index
  }

  private async ecrireIndex(index: FichierProfils): Promise<void> {
    await mkdir(this.racine, { recursive: true })
    await writeFile(this.cheminIndex, JSON.stringify(index, null, 2), 'utf-8')
  }

  private publier(p: Profil): ProfilPublic {
    return { id: p.id, nom: p.nom, protege: !!p.motDePasse, creeLe: p.creeLe }
  }

  async lister(): Promise<{ profils: ProfilPublic[]; dernier?: string }> {
    const index = await this.lireIndex()
    return { profils: index.profils.map((p) => this.publier(p)), dernier: index.dernier }
  }

  profilActif(): ProfilPublic | null {
    return this.actif ? this.publier(this.actif) : null
  }

  async creer(nom: string, motDePasse?: string, progression?: ProgressState): Promise<ResultatProfil> {
    const index = await this.lireIndex()
    let propre = nomValide(nom)
    // Deux profils ne portent jamais le même nom (utile à l'import)
    const pris = new Set(index.profils.map((p) => p.nom.toLowerCase()))
    for (let n = 2; pris.has(propre.toLowerCase()); n++) propre = `${nomValide(nom)} (${n})`
    const profil: Profil = { id: randomUUID(), nom: propre, creeLe: new Date().toISOString() }
    if (motDePasse) profil.motDePasse = hacher(motDePasse)
    await mkdir(this.dossier(profil.id), { recursive: true })
    await writeFile(join(this.dossier(profil.id), 'progress.json'), JSON.stringify(normaliserProgression(progression), null, 2))
    index.profils.push(profil)
    await this.ecrireIndex(index)
    return { ok: true, profil: this.publier(profil) }
  }

  async ouvrir(id: string, motDePasse?: string): Promise<ResultatProfil> {
    const index = await this.lireIndex()
    const profil = index.profils.find((p) => p.id === id)
    if (!profil) return { ok: false, erreur: 'Profil introuvable.' }
    if (profil.motDePasse && !verifier(motDePasse ?? '', profil.motDePasse)) {
      return { ok: false, erreur: 'Mot de passe incorrect.' }
    }
    this.actif = profil
    index.dernier = id
    await this.ecrireIndex(index)
    return { ok: true, profil: this.publier(profil) }
  }

  fermer(): void {
    this.actif = null
  }

  private exigerActif(): Profil {
    if (!this.actif) throw new Error('Aucun profil ouvert.')
    return this.actif
  }

  async chargerProgression(): Promise<ProgressState> {
    const profil = this.exigerActif()
    try {
      return normaliserProgression(JSON.parse(await readFile(join(this.dossier(profil.id), 'progress.json'), 'utf-8')))
    } catch {
      return normaliserProgression(null)
    }
  }

  async enregistrerProgression(state: ProgressState): Promise<void> {
    const profil = this.exigerActif()
    await mkdir(this.dossier(profil.id), { recursive: true })
    await writeFile(join(this.dossier(profil.id), 'progress.json'), JSON.stringify(state, null, 2), 'utf-8')
  }

  /** Les opérations sensibles sur le profil ouvert redemandent son mot de passe actuel. */
  private async verifierActif(motDePasseActuel?: string): Promise<{ index: FichierProfils; profil: Profil }> {
    const actif = this.exigerActif()
    const index = await this.lireIndex()
    const profil = index.profils.find((p) => p.id === actif.id)
    if (!profil) throw new Error('Profil introuvable.')
    if (profil.motDePasse && !verifier(motDePasseActuel ?? '', profil.motDePasse)) {
      throw new Error('Mot de passe actuel incorrect.')
    }
    return { index, profil }
  }

  async renommer(nom: string): Promise<ResultatProfil> {
    const actif = this.exigerActif()
    const index = await this.lireIndex()
    const profil = index.profils.find((p) => p.id === actif.id)!
    const propre = nomValide(nom)
    if (index.profils.some((p) => p.id !== profil.id && p.nom.toLowerCase() === propre.toLowerCase())) {
      return { ok: false, erreur: 'Un autre profil porte déjà ce nom.' }
    }
    profil.nom = propre
    this.actif = profil
    await this.ecrireIndex(index)
    return { ok: true, profil: this.publier(profil) }
  }

  /** `nouveau` vide ou absent : supprime le mot de passe. */
  async changerMotDePasse(actuel: string | undefined, nouveau: string | undefined): Promise<ResultatProfil> {
    try {
      const { index, profil } = await this.verifierActif(actuel)
      if (nouveau) profil.motDePasse = hacher(nouveau)
      else delete profil.motDePasse
      this.actif = profil
      await this.ecrireIndex(index)
      return { ok: true, profil: this.publier(profil) }
    } catch (e) {
      return { ok: false, erreur: (e as Error).message }
    }
  }

  async supprimer(motDePasseActuel?: string): Promise<ResultatProfil> {
    try {
      const { index, profil } = await this.verifierActif(motDePasseActuel)
      index.profils = index.profils.filter((p) => p.id !== profil.id)
      if (index.dernier === profil.id) delete index.dernier
      await this.ecrireIndex(index)
      await rm(this.dossier(profil.id), { recursive: true, force: true })
      this.actif = null
      return { ok: true }
    } catch (e) {
      return { ok: false, erreur: (e as Error).message }
    }
  }

  /** Contenu d'un export du profil ouvert (sans mot de passe). */
  async exporter(brouillons: Record<string, string>): Promise<ExportProfil> {
    const profil = this.exigerActif()
    return {
      format: FORMAT_EXPORT,
      version: 1,
      nom: profil.nom,
      exporteLe: new Date().toISOString(),
      progression: await this.chargerProgression(),
      brouillons
    }
  }

  /** Crée un nouveau profil à partir d'un export ; le mot de passe est à choisir à l'import. */
  async importer(donnees: unknown, motDePasse?: string): Promise<ResultatProfil & { brouillons?: Record<string, string> }> {
    const d = donnees as Partial<ExportProfil>
    if (!d || d.format !== FORMAT_EXPORT || typeof d.nom !== 'string') {
      return { ok: false, erreur: "Ce fichier n'est pas un profil 68k Trainer." }
    }
    const res = await this.creer(d.nom, motDePasse, d.progression)
    return { ...res, brouillons: d.brouillons ?? {} }
  }

  /** Progression de tous les profils (tableau de suivi de l'enseignant) : aucune donnée sensible. */
  async tableau(): Promise<{ profil: ProfilPublic; progression: ProgressState }[]> {
    const index = await this.lireIndex()
    return Promise.all(
      index.profils.map(async (p) => {
        let progression: ProgressState
        try {
          progression = normaliserProgression(JSON.parse(await readFile(join(this.dossier(p.id), 'progress.json'), 'utf-8')))
        } catch {
          progression = normaliserProgression(null)
        }
        return { profil: this.publier(p), progression }
      })
    )
  }
}
