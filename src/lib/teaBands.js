import { genderPayGapPct } from './salaryMetrics.js'

function asNumber(value) {
  if (value == null || value === '') return null
  const n = Number(String(value).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

function average(values) {
  const nums = values.filter((v) => Number.isFinite(v) && v > 0)
  if (!nums.length) return null
  return nums.reduce((sum, v) => sum + v, 0) / nums.length
}

/**
 * Fasce prese dalla colonna Banda del tracciato TEA.
 * Il Grade mostrato è quello del file, non un punteggio calcolato.
 */
export function groupByTeaBand(people) {
  const groups = new Map()
  for (const person of people || []) {
    const label = String(person?.payBand ?? '').trim() || 'N/D'
    if (!groups.has(label)) groups.set(label, [])
    groups.get(label).push(person)
  }

  const rows = []
  for (const [band, list] of groups) {
    const men = list.filter((p) => p.gender === 'M')
    const women = list.filter((p) => p.gender === 'F')
    const grades = [...new Set(list.map((p) => String(p.grade ?? '').trim()).filter(Boolean))].sort(
      (a, b) => (asNumber(a) ?? 0) - (asNumber(b) ?? 0),
    )
    const avgMen = average(men.map((p) => p.baseSalaryFte))
    const avgWomen = average(women.map((p) => p.baseSalaryFte))
    rows.push({
      band,
      bandNum: asNumber(band),
      n: list.length,
      nMen: men.length,
      nWomen: women.length,
      grades,
      gradeLabel: grades.length ? grades.join(', ') : '–',
      avgMen,
      avgWomen,
      avgAll: average(list.map((p) => p.baseSalaryFte)),
      gapPct: genderPayGapPct(avgMen, avgWomen),
      people: list.slice().sort((a, b) => (asNumber(b.grade) ?? 0) - (asNumber(a.grade) ?? 0)),
    })
  }

  rows.sort((a, b) => (a.bandNum ?? 999) - (b.bandNum ?? 999) || a.band.localeCompare(b.band, 'it'))
  return rows
}
