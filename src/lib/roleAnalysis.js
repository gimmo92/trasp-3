/**
 * Analisi per codice mansione: RAL FTE, gap F/M e fascia per gli annunci.
 */
import { mean, median } from './indicators.js'
import { genderPayGapPct, EU_GAP_THRESHOLD_PCT } from './salaryMetrics.js'
import { seniorityToYearsNumeric } from './jobGrading.js'

export function cdrLabel(person) {
  const desc = String(person?.costCenterDescription ?? '').trim()
  const code = String(person?.costCenterCode ?? '').trim()
  if (desc && code) return `${code} · ${desc}`
  return desc || code || String(person?.category ?? '').trim()
}

function coerceDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value
  if (typeof value === 'number' && value > 20000 && value < 120000) {
    const date = new Date(Date.UTC(1899, 11, 30) + Math.round(value) * 86400000)
    return Number.isNaN(date.getTime()) ? null : date
  }
  if (typeof value === 'string' && value.trim()) {
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) return date
  }
  return null
}

/** Anni di servizio dalla data di assunzione, oppure dall'anzianità già in anni. */
export function yearsOfService(person, asOf = new Date()) {
  const hire = coerceDate(person?.hireDate)
  if (hire) {
    const years = (asOf.getTime() - hire.getTime()) / (365.25 * 24 * 3600 * 1000)
    if (Number.isFinite(years) && years >= 0 && years < 80) return Math.round(years * 10) / 10
  }
  const fromField = seniorityToYearsNumeric(person?.seniority)
  if (fromField != null && fromField >= 0 && fromField < 80) return Math.round(fromField * 10) / 10
  return null
}

function modeText(people, read) {
  const counts = new Map()
  for (const person of people) {
    const value = String(read(person) ?? '').trim()
    if (!value) continue
    counts.set(value, (counts.get(value) || 0) + 1)
  }
  if (!counts.size) return ''
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'it'))[0][0]
}

function average(values) {
  const nums = values.filter((value) => Number.isFinite(value))
  if (!nums.length) return null
  return mean(nums)
}

function salaryOf(person) {
  const value = Number(person?.baseSalaryFte)
  return Number.isFinite(value) && value > 0 ? value : null
}

function variableOf(person) {
  const value = Number(person?.variableComponentsFte)
  return Number.isFinite(value) && value > 0 ? value : 0
}

/**
 * Una riga per codice mansione.
 * @param {Array} people popolazione già filtrata (società, qualifica, CdR)
 */
export function buildRoleRows(people, { thresholdPct = EU_GAP_THRESHOLD_PCT } = {}) {
  const groups = new Map()
  for (const person of people || []) {
    const code = String(person?.jobCode ?? '').trim() || 'N/D'
    if (!groups.has(code)) groups.set(code, [])
    groups.get(code).push(person)
  }

  return [...groups.entries()].map(([code, list]) => {
    const men = list.filter((person) => person.gender === 'M')
    const women = list.filter((person) => person.gender === 'F')
    const maleSalaries = men.map(salaryOf).filter((value) => value != null)
    const femaleSalaries = women.map(salaryOf).filter((value) => value != null)
    const salaries = [...maleSalaries, ...femaleSalaries]
    const mid = salaries.length ? median(salaries) : null
    const gapMean =
      maleSalaries.length && femaleSalaries.length
        ? genderPayGapPct(mean(maleSalaries), mean(femaleSalaries))
        : null
    const gapMedian =
      maleSalaries.length && femaleSalaries.length
        ? genderPayGapPct(median(maleSalaries), median(femaleSalaries))
        : null
    const overThreshold =
      (gapMean != null && Math.abs(gapMean) > thresholdPct) ||
      (gapMedian != null && Math.abs(gapMedian) > thresholdPct)
    const description = modeText(list, (person) => person.role) || 'Ruolo non indicato'
    const titles = [...new Set(list.map((person) => String(person.role ?? '').trim()).filter(Boolean))]

    const detailPeople = list
      .map((person) => {
        const ralFte = salaryOf(person)
        const deviationPct =
          ralFte != null && mid != null && mid > 0 ? ((ralFte - mid) / mid) * 100 : null
        const score = Number(person.performanceOnFive)
        return {
          index: person.index,
          employeeId: person.employeeId ?? null,
          name: person.name || '',
          gender: person.gender,
          ralFte,
          variableFte: variableOf(person),
          deviationPct,
          grade: person.grade ?? '',
          level: person.level ?? '',
          seniorityYears: yearsOfService(person),
          performanceOnFive: Number.isFinite(score) && score > 0 ? score : null,
        }
      })
      .sort((a, b) => (b.ralFte ?? -1) - (a.ralFte ?? -1))

    return {
      code,
      description,
      titles,
      n: list.length,
      nM: men.length,
      nF: women.length,
      median: mid,
      min: salaries.length ? Math.min(...salaries) : null,
      max: salaries.length ? Math.max(...salaries) : null,
      gapMean,
      gapMedian,
      overThreshold,
      thresholdPct,
      avgFixedM: average(maleSalaries),
      avgFixedF: average(femaleSalaries),
      avgVarM: average(men.map(variableOf)),
      avgVarF: average(women.map(variableOf)),
      people: detailPeople,
    }
  })
}

export function roleGapMagnitude(row) {
  const values = [row?.gapMean, row?.gapMedian].filter((value) => value != null && Number.isFinite(value))
  if (!values.length) return null
  return Math.max(...values.map((value) => Math.abs(value)))
}

/** Testo della fascia retributiva da allegare a un annuncio. */
export function roleRangeText(row, context = {}) {
  const euro = (value) =>
    value == null || !Number.isFinite(value)
      ? '–'
      : `${value.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
  const lines = [
    'Fascia retributiva per annuncio',
    `Codice mansione: ${row?.code || '–'}`,
    `Descrizione: ${row?.description || '–'}`,
    `Società: ${context.company || 'Tutte le società'}`,
  ]
  if (context.qualification) lines.push(`Qualifica: ${context.qualification}`)
  if (context.cdr) lines.push(`CdR: ${context.cdr}`)
  lines.push(
    `Organico nel perimetro: ${row?.n ?? 0} (F ${row?.nF ?? 0} · M ${row?.nM ?? 0})`,
    `RAL annua FTE minima: ${euro(row?.min)}`,
    `RAL annua FTE mediana: ${euro(row?.median)}`,
    `RAL annua FTE massima: ${euro(row?.max)}`,
    'La RAL è annua e normalizzata solo sulla percentuale di part-time.',
    'Minimo, mediana e massimo sono la fascia osservata sulle persone in questo perimetro.',
  )
  return lines.join('\n')
}
