import type { ProgressState } from './ipc'
import type { Parcours } from './parcours'
import type { Langue } from './traduction'
import { detailChapitre, detailParcours } from './progression'

const echapper = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export interface InfosCertificat {
  nom: string
  /** Date du document (par défaut : aujourd'hui). */
  date?: Date
  version?: string
  /** Langue du document (par défaut : le français). */
  langue?: Langue
}

/** Textes du document, dans chaque langue. */
const TEXTES = {
  fr: {
    locale: 'fr-FR',
    certificat: 'Certificat',
    attestation: 'Attestation',
    titreCertificat: 'Certificat de fin de parcours',
    titreAttestation: 'Attestation de progression',
    atteste: 'Ce document atteste que',
    complet: (total: number): string =>
      `a terminé l'ensemble des ${total} chapitres du parcours : cours, exemples, exercices vérifiés par exécution sur la machine simulée et QCM de fin de chapitre (seuil de réussite 70 %).`,
    partiel: (faits: number, total: number, pourcentage: number): string =>
      `a validé ${faits} chapitre${faits > 1 ? 's' : ''} sur ${total} et réalisé ${pourcentage} % du parcours (exercices vérifiés par exécution sur la machine simulée, QCM réussis à 70 % au moins).`,
    colonnes: ['Chapitre', 'Progression', 'Meilleur QCM', 'Défis bonus', 'Validé'],
    total: (pourcentage: number, faits: number, tous: number): string => `Parcours : ${pourcentage} % · défis bonus : ${faits}/${tous}`,
    delivre: 'Délivré le'
  },
  en: {
    locale: 'en-US',
    certificat: 'Certificate',
    attestation: 'Progress report',
    titreCertificat: 'Course completion certificate',
    titreAttestation: 'Progress report',
    atteste: 'This document certifies that',
    complet: (total: number): string =>
      `has completed all ${total} chapters of the course: lessons, examples, exercises checked by running them on the simulated machine, and end-of-chapter quizzes (pass mark 70%).`,
    partiel: (faits: number, total: number, pourcentage: number): string =>
      `has completed ${faits} chapter${faits > 1 ? 's' : ''} out of ${total} and ${pourcentage}% of the course (exercises checked by running them on the simulated machine, quizzes passed with at least 70%).`,
    colonnes: ['Chapter', 'Progress', 'Best quiz', 'Bonus challenges', 'Completed'],
    total: (pourcentage: number, faits: number, tous: number): string => `Course: ${pourcentage}% · bonus challenges: ${faits}/${tous}`,
    delivre: 'Issued on'
  }
}

/**
 * Page HTML autonome (A4 paysage) du certificat de fin de parcours, ou de l'attestation de
 * progression tant que le parcours n'est pas terminé. Imprimée en PDF par le processus principal.
 */
export function htmlCertificat(parcours: Parcours, p: ProgressState, infos: InfosCertificat): string {
  const d = detailParcours(parcours, p)
  const complet = d.chapitresTermines === d.chapitresTotal && d.chapitresTotal > 0
  const langue = infos.langue ?? 'fr'
  const x = TEXTES[langue]
  const date = (infos.date ?? new Date()).toLocaleDateString(x.locale, { day: 'numeric', month: 'long', year: 'numeric' })
  const lignes = parcours.chapitres
    .map((ch, i) => {
      const dc = detailChapitre(ch, p)
      const resultat = ch.qcm ? p.qcm?.[ch.qcm.id] : undefined
      const qcm = dc.qcm.present ? (resultat ? `${resultat.meilleurScore}/${resultat.total}` : '—') : ''
      return `<tr class="${dc.termine ? 'ok' : ''}"><td>${i + 1}</td><td>${echapper(ch.titre)}</td><td>${dc.pourcentage}${langue === 'fr' ? ' ' : ''}%</td><td>${qcm}</td><td>${dc.bonus.faits}/${dc.bonus.total}</td><td>${dc.termine ? '✔' : ''}</td></tr>`
    })
    .join('')
  return `<!doctype html>
<html lang="${langue}"><head><meta charset="utf-8"><title>${complet ? x.certificat : x.attestation} — ${echapper(infos.nom)}</title>
<style>
  @page { size: A4 landscape; margin: 12mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: "Segoe UI", "DejaVu Sans", Arial, sans-serif; color: #1d2433; }
  .cadre { border: 3px double #2a4d8f; padding: 14mm 16mm; min-height: 180mm; position: relative; }
  .marque { position: absolute; top: 10mm; right: 14mm; font: 700 13pt Consolas, monospace; color: #2a4d8f; }
  h1 { margin: 0 0 2mm; font-size: 26pt; color: #2a4d8f; letter-spacing: 1px; }
  .sous { margin: 0 0 8mm; font-size: 12pt; color: #556; }
  .nom { font-size: 22pt; font-weight: 700; margin: 4mm 0; }
  p { font-size: 11.5pt; line-height: 1.5; margin: 2mm 0; }
  table { width: 100%; border-collapse: collapse; margin-top: 6mm; font-size: 10pt; }
  th, td { padding: 1.6mm 2.5mm; border-bottom: 1px solid #ccd3e0; text-align: left; }
  th { background: #eef2f9; }
  td:nth-child(n+3), th:nth-child(n+3) { text-align: center; }
  tr.ok td:last-child { color: #1a7f37; font-weight: 700; }
  .bas { display: flex; justify-content: space-between; margin-top: 8mm; font-size: 10pt; color: #556; }
  .total { font-weight: 700; color: #1d2433; }
</style></head>
<body><div class="cadre">
  <div class="marque">68k Trainer</div>
  <h1>${complet ? x.titreCertificat : x.titreAttestation}</h1>
  <p class="sous">${echapper(parcours.titre)}</p>
  <p>${x.atteste}</p>
  <p class="nom">${echapper(infos.nom)}</p>
  <p>${complet ? x.complet(d.chapitresTotal) : x.partiel(d.chapitresTermines, d.chapitresTotal, d.pourcentage)}</p>
  <table>
    <thead><tr><th>#</th>${x.colonnes.map((c) => `<th>${c}</th>`).join('')}</tr></thead>
    <tbody>${lignes}</tbody>
  </table>
  <div class="bas">
    <span class="total">${x.total(d.pourcentage, d.bonusFaits, d.bonusTotal)}</span>
    <span>${x.delivre} ${date}${infos.version ? ` · 68k Trainer ${echapper(infos.version)}` : ''}</span>
  </div>
</div></body></html>`
}
