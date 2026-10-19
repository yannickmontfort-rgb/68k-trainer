import type { ProgressState } from './ipc'
import type { Parcours } from './parcours'
import { detailChapitre, detailParcours } from './progression'

const echapper = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export interface InfosCertificat {
  nom: string
  /** Date du document (par défaut : aujourd'hui). */
  date?: Date
  version?: string
}

/**
 * Page HTML autonome (A4 paysage) du certificat de fin de parcours, ou de l'attestation de
 * progression tant que le parcours n'est pas terminé. Imprimée en PDF par le processus principal.
 */
export function htmlCertificat(parcours: Parcours, p: ProgressState, infos: InfosCertificat): string {
  const d = detailParcours(parcours, p)
  const complet = d.chapitresTermines === d.chapitresTotal && d.chapitresTotal > 0
  const date = (infos.date ?? new Date()).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  const lignes = parcours.chapitres
    .map((ch, i) => {
      const dc = detailChapitre(ch, p)
      const resultat = ch.qcm ? p.qcm?.[ch.qcm.id] : undefined
      const qcm = dc.qcm.present ? (resultat ? `${resultat.meilleurScore}/${resultat.total}` : '—') : ''
      return `<tr class="${dc.termine ? 'ok' : ''}"><td>${i + 1}</td><td>${echapper(ch.titre)}</td><td>${dc.pourcentage} %</td><td>${qcm}</td><td>${dc.bonus.faits}/${dc.bonus.total}</td><td>${dc.termine ? '✔' : ''}</td></tr>`
    })
    .join('')
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><title>${complet ? 'Certificat' : 'Attestation'} — ${echapper(infos.nom)}</title>
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
  <h1>${complet ? 'Certificat de fin de parcours' : 'Attestation de progression'}</h1>
  <p class="sous">${echapper(parcours.titre)}</p>
  <p>Ce document atteste que</p>
  <p class="nom">${echapper(infos.nom)}</p>
  <p>${
    complet
      ? `a terminé l'ensemble des ${d.chapitresTotal} chapitres du parcours : cours, exemples, exercices vérifiés par exécution sur la machine simulée et QCM de fin de chapitre (seuil de réussite 70 %).`
      : `a validé ${d.chapitresTermines} chapitre${d.chapitresTermines > 1 ? 's' : ''} sur ${d.chapitresTotal} et réalisé ${d.pourcentage} % du parcours (exercices vérifiés par exécution sur la machine simulée, QCM réussis à 70 % au moins).`
  }</p>
  <table>
    <thead><tr><th>#</th><th>Chapitre</th><th>Progression</th><th>Meilleur QCM</th><th>Défis bonus</th><th>Validé</th></tr></thead>
    <tbody>${lignes}</tbody>
  </table>
  <div class="bas">
    <span class="total">Parcours : ${d.pourcentage} % · défis bonus : ${d.bonusFaits}/${d.bonusTotal}</span>
    <span>Délivré le ${date}${infos.version ? ` · 68k Trainer ${echapper(infos.version)}` : ''}</span>
  </div>
</div></body></html>`
}
