/**
 * Lettere di revisione retributiva (PDF lato client).
 */
import { jsPDF } from 'jspdf'
import { formatEuro, formatPct } from './salaryReview.js'

const MARGIN = 18

function formatDate(iso) {
  if (!iso) return '–'
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
}

function drawLetter(doc, payload, letter, isFirst) {
  if (!isFirst) doc.addPage()
  const pageWidth = doc.internal.pageSize.getWidth()
  const maxWidth = pageWidth - MARGIN * 2
  let y = 22

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(10, 108, 210)
  doc.text(payload.companyName || 'Azienda', MARGIN, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(100, 116, 139)
  doc.text(formatDate(payload.generatedAt), pageWidth - MARGIN, y, { align: 'right' })

  y += 16
  doc.setTextColor(15, 23, 42)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text('Lettera di revisione retributiva', MARGIN, y)

  y += 8
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(71, 85, 105)
  doc.text(`${payload.cycleName || 'Salary review'} · decorrenza ${formatDate(payload.effectiveDate)}`, MARGIN, y)

  y += 14
  doc.setTextColor(15, 23, 42)
  doc.setFontSize(11)
  const intro = `Gentile ${letter.name}, a seguito del ciclo di salary review ti comunichiamo la revisione della retribuzione, con effetto dal ${formatDate(payload.effectiveDate)}.`
  const introLines = doc.splitTextToSize(intro, maxWidth)
  doc.text(introLines, MARGIN, y)
  y += introLines.length * 5.5 + 8

  const rows = [
    ['ID dipendente', letter.employeeId || '–'],
    ['Ruolo', letter.role || '–'],
    ['Manager', letter.managerName || '–'],
    ['Leva', letter.leverLabel],
    ['Livello', letter.lever === 'promotion' ? `${letter.level} → ${letter.newLevel}` : letter.level || '–'],
    ['RAL attuale', formatEuro(letter.ral)],
  ]
  if (letter.lever === 'oneoff') {
    rows.push(['Una tantum lorda', formatEuro(letter.amount)])
    rows.push(['RAL dopo il ciclo', formatEuro(letter.ral)])
  } else {
    const pct = letter.ral > 0 ? (letter.amount / letter.ral) * 100 : 0
    rows.push(['Aumento annuo lordo', `${formatEuro(letter.amount)} (${formatPct(pct)})`])
    rows.push(['Nuova RAL', formatEuro(letter.newRal)])
  }

  doc.setDrawColor(226, 232, 240)
  for (const [label, value] of rows) {
    doc.setFillColor(248, 250, 252)
    doc.rect(MARGIN, y - 4.5, maxWidth, 9, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(100, 116, 139)
    doc.text(label, MARGIN + 3, y + 1)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(15, 23, 42)
    doc.text(String(value), MARGIN + 62, y + 1)
    y += 10
  }

  y += 8
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(71, 85, 105)
  const closing =
    letter.lever === 'oneoff'
      ? 'L’importo una tantum è riconosciuto a titolo di premio e non modifica la RAL. La RAL resta il riferimento per gli istituti collegati alla retribuzione fissa.'
      : 'La nuova RAL sostituisce la precedente a decorrere dalla data indicata ed è il riferimento per gli istituti collegati alla retribuzione fissa. Gli altri elementi del contratto restano invariati.'
  const closingLines = doc.splitTextToSize(closing, maxWidth)
  doc.text(closingLines, MARGIN, y)
  y += closingLines.length * 4.6 + 10
  doc.text('HR Compensation', MARGIN, y)
}

export function buildLettersPdf(payload) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const letters = payload.letters || []
  letters.forEach((letter, index) => drawLetter(doc, payload, letter, index === 0))
  const pages = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pages; i += 1) {
    doc.setPage(i)
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(148, 163, 184)
    doc.text(`Comunicazione individuale · ${i}/${pages}`, pageWidth / 2, pageHeight - 10, { align: 'center' })
  }
  return doc
}

export function saveLettersPdf(payload, filename) {
  const doc = buildLettersPdf(payload)
  doc.save(filename)
}
