import { isTeaTracciato } from '../../api/lib/column-mapping.js'

function cleanText(value) {
  if (value == null) return null
  const s = String(value).trim()
  return s === '' ? null : s
}

function valueAt(row, index) {
  if (index == null || index < 0) return null
  return row?.[index]
}

/**
 * Punteggio TEA su scala 1–5. Fuori scala (es. vecchi punteggi 0–100) resta null.
 */
export function parseScoreOnFive(value, parseNumber) {
  if (value == null || value === '') return null
  const n = typeof value === 'number' ? value : parseNumber(value)
  if (!Number.isFinite(n) || n <= 0 || n > 5) return null
  return Math.round(n * 100) / 100
}

function scoreToHundred(scoreOnFive) {
  if (scoreOnFive == null) return null
  return Math.round((scoreOnFive / 5) * 1000) / 10
}

/** Campi presenti solo nel tracciato TEA. `idx` è il resolver ruolo → colonna. */
export function readTeaColumns(row, idx, parseNumber) {
  const at = (role) => idx(role)
  const num = (role) => {
    const value = valueAt(row, at(role))
    if (value == null || value === '') return 0
    return parseNumber(value)
  }
  const text = (role) => cleanText(valueAt(row, at(role)))
  return {
    employeeId: text('employeeId'),
    firstName: text('firstName'),
    lastName: text('lastName'),
    company: text('company'),
    qualification: text('qualification'),
    weeklyFullTimeHours: num('weeklyFullTimeHours'),
    forfaitOvertime: num('forfaitOvertime'),
    mboBase100: num('mboBase100'),
    jobCode: text('jobCode'),
    costCenterCode: text('costCenterCode'),
    costCenterDescription: text('costCenterDescription'),
    softSkills: parseScoreOnFive(valueAt(row, at('softSkills')), parseNumber),
    hardSkills: parseScoreOnFive(valueAt(row, at('hardSkills')), parseNumber),
    performanceOnFive: parseScoreOnFive(valueAt(row, at('performanceScore')), parseNumber),
    grade: text('grade'),
    payBand: text('payBand'),
    jobFamily: text('jobFamily'),
    educationLevel: text('educationLevel'),
  }
}

/**
 * Se il file è il tracciato TEA, marca il record e sistema identità e performance.
 * Non converte i mensili in annui e non tocca gli importi: lo fa enrichEmployeeSalaries.
 */
export function withTeaContext(record, headers) {
  if (!isTeaTracciato(headers)) return record
  const first = cleanText(record.firstName)
  const last = cleanText(record.lastName)
  const composed = [first, last].filter(Boolean).join(' ')
  const name = composed || cleanText(record.name)
  const costCenterDescription = cleanText(record.costCenterDescription)
  const costCenterCode = cleanText(record.costCenterCode)
  const category = costCenterDescription || costCenterCode || cleanText(record.category)
  const performanceOnFive = record.performanceOnFive ?? null
  return {
    ...record,
    paySchema: 'tea',
    name,
    category,
    performanceOnFive,
    performanceScore: scoreToHundred(performanceOnFive),
    performanceScale: performanceOnFive != null ? '1-5' : null,
    ralDateProrated: false,
    monthlyAddedToRal: false,
  }
}

/** Righe di dettaglio per la UI: periodi espliciti, senza sommare mensile e annuo. */
export function teaPayComposition(person) {
  if (!person || person.paySchema !== 'tea') return null
  const monthly = [
    ['Minimo tabellare', person.ccnlMinimum],
    ['Superminimo non assorbibile', person.superminimo],
    ['Superminimo assorbibile', person.superminimoAssoluto],
    ['Scatti di anzianità', person.senioritySteps],
    ['Forfait straordinari', person.forfaitOvertime],
    ['Altre voci fisse', person.otherFixedItems],
  ]
  const monthlyTotal = monthly.reduce((sum, [, amount]) => sum + (Number(amount) || 0), 0)
  return {
    partTimePct: person.partTimePct,
    weeklyFullTimeHours: person.weeklyFullTimeHours,
    company: person.company,
    qualification: person.qualification,
    educationLevel: person.educationLevel,
    grade: person.grade,
    payBand: person.payBand,
    jobFamily: person.jobFamily,
    jobCode: person.jobCode,
    costCenterCode: person.costCenterCode,
    softSkills: person.softSkills,
    hardSkills: person.hardSkills,
    performanceOnFive: person.performanceOnFive,
    ral: person.baseSalaryRaw ?? person.baseSalary,
    ralFte: person.baseSalaryFte,
    hourly: person.baseSalaryHourly,
    monthly: monthly.map(([label, amount]) => ({ label, amount: Number(amount) || 0 })),
    monthlyTotal,
    annual: [
      { label: 'Bonus / MBO base 100', amount: Number(person.mboBase100) || 0, note: 'obiettivo, non erogato' },
      { label: 'Bonus / MBO erogato', amount: Number(person.bonusMbo) || 0, note: 'annuo, FTE sul part-time' },
      { label: 'Premio di risultato base 100', amount: Number(person.resultBonus) || 0, note: 'obiettivo, non erogato' },
      { label: 'Straordinari', amount: Number(person.overtime) || 0, note: 'annuo erogato' },
      { label: 'Indennità variabili', amount: Number(person.variableAllowances) || 0, note: 'annuo' },
      { label: 'Una tantum', amount: Number(person.oneOffPayment) || 0, note: 'annuo' },
      { label: 'Fringe benefit', amount: Number(person.fringeBenefits) || 0, note: 'annuo' },
      { label: 'Welfare aziendale', amount: Number(person.companyWelfare) || 0, note: 'annuo' },
    ],
  }
}
