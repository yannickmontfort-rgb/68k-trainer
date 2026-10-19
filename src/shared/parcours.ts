/**
 * Modèle de contenu pédagogique : parcours → chapitres → notions → contenus.
 * Les fichiers vivent dans content/parcours/<parcours>/ (voir content/parcours/README.md).
 */
import type { ExerciseCheck } from './ipc'

export type Plateforme = 'atari' | 'amiga' | 'commun'
export type Niveau = 1 | 2 | 3

/** Options de la machine simulée pour un contenu (plateformes atari uniquement pour l'instant). */
export interface MachineOptions {
  /** Démarrer en mode utilisateur comme sous le vrai TOS (vecteurs et matériel protégés). */
  modeUtilisateur?: boolean
  /** Touches tapées à l'avance (Cnecin, Bconin...). */
  touches?: { ascii: number; scancode: number }[]
  /** Afficher l'aperçu de l'écran Atari (basse résolution). */
  ecran?: boolean
  /** Adresse affichée au départ dans la vue mémoire du débogueur (sinon : début du programme). */
  memoire?: number
}

interface ContenuBase {
  /** Identifiant globalement unique (préfixé par le parcours) : sert de clé de progression. */
  id: string
  titre: string
  /** Contenu rédigé par Claude, à relire par Yannick. */
  aRelire?: boolean
  /** Code qui n'a pas pu être assemblé et exécuté par le simulateur. */
  nonTeste?: boolean
  /** Source d'origine (manuel, cours...), affichée discrètement. */
  source?: string
}

export interface ContenuCours extends ContenuBase {
  type: 'cours'
  /** Fichier Markdown relatif au dossier du chapitre (chargé dans `markdown`). */
  fichier?: string
  markdown?: string
}

/** Ligne expliquée d'un exemple corrigé (numéro de ligne dans `code`, à partir de 1). */
export interface Explication {
  ligne: number
  texte: string
}

export interface ContenuExemple extends ContenuBase {
  type: 'exemple'
  introduction: string
  code: string
  explications: Explication[]
  conclusion?: string
  machine?: MachineOptions
}

export type VarianteExercice = 'completer' | 'ecrire' | 'corriger' | 'ordonner'

export interface ContenuExercice extends ContenuBase {
  type: 'exercice'
  variante: VarianteExercice
  niveau: Niveau
  enonce: string
  indices: string[]
  /** Code de départ dans l'éditeur (à compléter, à corriger...). Vide pour « ordonner ». */
  codeDepart: string
  /** Solution de référence : assemblée et exécutée par les tests. */
  solution: string
  check: ExerciseCheck
  machine?: MachineOptions
  /** Défi facultatif : ne compte pas dans le pourcentage obligatoire. */
  bonus?: boolean
  /** « ordonner » : lignes fixes avant/après et lignes à remettre dans l'ordre (ordre correct). */
  entete?: string
  lignes?: string[]
  pied?: string
  /** Reprise d'un exercice de l'ancienne version (même id de progression). */
  ref?: string
}

export interface QuestionQcm {
  id: string
  enonce: string
  /** Code affiché avec la question (question de prédiction). */
  code?: string
  choix: string[]
  /** Indice de la bonne réponse dans `choix`. */
  bonne: number
  explication: string
  /**
   * Prédictions sur du code : état attendu après exécution de `code` (ou du code de la
   * prédiction), vérifié par les tests pour garantir que la bonne réponse est vraie.
   * Clés : "D0".."D7", "A0".."A7", "PC", "SR" (hexa) ; "X" "N" "Z" "V" "C" ("0"/"1") ;
   * "$adresse.B|W|L" (hexa).
   */
  verification?: Record<string, string>
}

export interface ContenuPrediction extends ContenuBase {
  type: 'prediction'
  introduction: string
  code: string
  questions: QuestionQcm[]
  machine?: MachineOptions
}

export type Contenu = ContenuCours | ContenuExemple | ContenuExercice | ContenuPrediction

export interface Notion {
  id: string
  titre: string
  contenus: Contenu[]
}

export interface Qcm {
  id: string
  /** Seuil de réussite entre 0 et 1 (0,7 par défaut). */
  seuil?: number
  questions: QuestionQcm[]
}

export interface Chapitre {
  id: string
  titre: string
  plateforme: Plateforme
  resume: string
  /** Chapitre seulement esquissé (contenu à venir). */
  esquisse?: boolean
  notions: Notion[]
  qcm?: Qcm
  bonus?: ContenuExercice[]
}

export interface Parcours {
  id: string
  titre: string
  plateforme: Plateforme
  description: string
  statut: 'actif' | 'bientot'
  chapitres: Chapitre[]
}

export const SEUIL_QCM_DEFAUT = 0.7

export const LIBELLE_VARIANTE: Record<VarianteExercice, string> = {
  completer: 'À compléter',
  ecrire: 'À écrire',
  corriger: 'À corriger',
  ordonner: 'À remettre dans l’ordre'
}
