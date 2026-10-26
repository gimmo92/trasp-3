/**
 * Metriche retributive, normalizzazione part-time e campi di confronto gap.
 * Riferimento normativo in commenti (Dir. UE 2023/970 / D.Lgs.) — non esporre in UI.
 */
export const SALARY_METRICS = {
  base: 'base',
  livello: 'livello',
  totale: 'totale',
  variabile: 'variabile',
}

export const DEFAULT_ANNUAL_HOURS = 1720
export const MIN_GENDER_SAMPLE = 3
export const EU_GAP_THRESHOLD_PCT = 5

export function parsePartTimePct(value) {
  if (value == null || value === '') return 100
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value <= 0) return 100
    if (value <= 1) return Math.round(value * 100)
    return Math.min(100, value)
  }
  const s = String(value).trim().replace('%', '').replace(',', '.')
  const n = Number(s)
  if (!Number.isFinite(n) || n <= 0) return 100
  if (n <= 1) return Math.round(n * 100)
  return Math.min(100, n)
}

/** Importo positivo o 0 se assente/non valido. */
export function parseSalaryAmount(value) {
  if (value == null || value === '') return 0
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? value : 0
  const cleaned = String(value)
    .replace(/\./g, '')
    .replace(/,/g, '.')
    .replace(/[^\d.-]/g, '')
  const n = Number(cleaned)
  return Number.isFinite(n) && n > 0 ? n : 0
}

/** Retribuzione base netta: esclude superminimo e superminimo ass.le dal valore grezzo. */
export function effectiveBaseSalary(rawBase, superminimo = 0, superminimoAssoluto = 0) {
  const raw = Number.isFinite(rawBase) ? rawBase : 0
  const sm = parseSalaryAmount(superminimo)
  const sma = parseSalaryAmount(superminimoAssoluto)
  return Math.max(0, raw - sm - sma)
}

/**
 * Risolve le tre metriche da input grezzi (retrocompatibile con solo base + variabile).
 */
export function resolveSalaryComponents({
  base = 0,
  structural = null,
  individual = null,
  variableLegacy = 0,
  totalMapped = null,
}) {
  let structuralComponents = structural != null ? structural : 0
  let individualComponents = individual != null ? individual : 0
  if (structural == null && individual == null && variableLegacy > 0) {
    structuralComponents = variableLegacy
  }
  const livelloRetributivo = base + structuralComponents
  const totalSalary =
    totalMapped != null && totalMapped > 0
      ? totalMapped
      : livelloRetributivo + individualComponents
  const variableComponents = structuralComponents + individualComponents
  return { structuralComponents, individualComponents, livelloRetributivo, totalSalary, variableComponents }
}

/**
 * Ore annue teoriche full-time a partire dall'orario settimanale contrattuale.
 * 40 ore → 1720, come il default storico dell'app.
 */
export function annualHoursFromWeekly(weekly, fallback = DEFAULT_ANNUAL_HOURS) {
  const hours = Number(weekly)
  if (!Number.isFinite(hours) || hours <= 0) return fallback
  return (hours / 40) * fallback
}

/**
 * Tracciato TEA.
 * Mensili (minimo, superminimi, scatti, forfait, altre fisse): dettaglio, mai sommati alla RAL.
 * RAL e MBO erogato: annui, normalizzati solo sulla % di part-time, senza prorata sulle date.
 * MBO base 100 e premio di risultato base 100: obiettivi, esclusi dal totale erogato.
 * Fringe e welfare: annui, importo nominale.
 */
function enrichTeaEmployeeSalaries(r, annualHours = DEFAULT_ANNUAL_HOURS) {
  const ral = parseSalaryAmount(r.baseSalary)
  const partTimePct = r.partTimePct > 0 ? r.partTimePct : 100
  const fteFactor = partTimePct / 100
  const toFte = (v) => (Number.isFinite(v) && v > 0 ? v / fteFactor : 0)

  const superminimo = parseSalaryAmount(r.superminimo)
  const superminimoAssoluto = parseSalaryAmount(r.superminimoAssoluto)
  const ccnlMinimum = parseSalaryAmount(r.ccnlMinimum)
  const senioritySteps = parseSalaryAmount(r.senioritySteps)
  const forfaitOvertime = parseSalaryAmount(r.forfaitOvertime)
  const otherFixedItems = parseSalaryAmount(r.otherFixedItems)

  const mboBase100 = parseSalaryAmount(r.mboBase100)
  const mboPaid = parseSalaryAmount(r.bonusMbo)
  const resultBonus = parseSalaryAmount(r.resultBonus)
  const overtime = parseSalaryAmount(r.overtime)
  const variableAllowances = parseSalaryAmount(r.variableAllowances)
  const oneOffPayment = parseSalaryAmount(r.oneOffPayment)
  const fringeBenefits = parseSalaryAmount(r.fringeBenefits)
  const companyWelfare = parseSalaryAmount(r.companyWelfare)

  const variablePaid = mboPaid + overtime + variableAllowances + oneOffPayment
  const benefits = fringeBenefits + companyWelfare
  const hours = annualHoursFromWeekly(r.weeklyFullTimeHours, annualHours)
  const toHourly = (fteVal) => (fteVal > 0 ? fteVal / hours : 0)

  const baseSalary = ral
  const structuralComponents = 0
  const individualComponents = variablePaid + benefits
  const livelloRetributivo = baseSalary
  const totalSalary = baseSalary + variablePaid + benefits
  const variableComponents = variablePaid

  const baseSalaryFte = toFte(baseSalary)
  const variableComponentsFte = toFte(variablePaid)
  const livelloRetributivoFte = baseSalaryFte
  const totalSalaryFte = baseSalaryFte + variableComponentsFte + benefits

  return {
    ...r,
    paySchema: 'tea',
    partTimePct,
    baseSalaryRaw: ral,
    superminimo,
    superminimoAssoluto,
    ccnlMinimum,
    senioritySteps,
    forfaitOvertime,
    otherFixedItems,
    mboBase100,
    mboBase100Fte: toFte(mboBase100),
    bonusMbo: mboPaid,
    bonusMboFte: toFte(mboPaid),
    resultBonus,
    resultBonusFte: toFte(resultBonus),
    overtime,
    variableAllowances,
    oneOffPayment,
    fringeBenefits,
    companyWelfare,
    baseSalary,
    structuralComponents,
    individualComponents,
    livelloRetributivo,
    totalSalary,
    variableComponents,
    structuralComponentsFte: 0,
    individualComponentsFte: variableComponentsFte + benefits,
    variableComponentsFte,
    baseSalaryFte,
    livelloRetributivoFte,
    totalSalaryFte,
    baseSalaryHourly: toHourly(baseSalaryFte),
    livelloRetributivoHourly: toHourly(livelloRetributivoFte),
    totalSalaryHourly: toHourly(totalSalaryFte),
    variableComponentsHourly: toHourly(variableComponentsFte),
    hourlyAnnualHours: hours,
    ralDateProrated: false,
    mboDateProrated: false,
    monthlyAddedToRal: false,
  }
}

/** Aggiunge metriche FTE e orarie a un record dipendente già parsato. */
export function enrichEmployeeSalaries(r, annualHours = DEFAULT_ANNUAL_HOURS) {
  if (r?.paySchema === 'tea') return enrichTeaEmployeeSalaries(r, annualHours)
  const baseSalaryRaw = r.baseSalary ?? 0
  const superminimo = r.superminimo ?? 0
  const superminimoAssoluto = r.superminimoAssoluto ?? 0
  const baseSalary = effectiveBaseSalary(baseSalaryRaw, superminimo, superminimoAssoluto)

  const resolved = resolveSalaryComponents({
    base: baseSalary,
    structural: r.structuralComponents,
    individual: r.individualComponents,
    variableLegacy: r.variableComponents ?? 0,
    totalMapped: r.totalSalary,
  })

  const partTimePct = r.partTimePct > 0 ? r.partTimePct : 100
  const fteFactor = partTimePct / 100
  const toFte = (v) => (Number.isFinite(v) && v > 0 ? v / fteFactor : 0)
  const toHourly = (fteVal) => (fteVal > 0 ? fteVal / annualHours : 0)

  const { structuralComponents, individualComponents, livelloRetributivo, totalSalary, variableComponents } =
    resolved

  const baseSalaryFte = toFte(baseSalary)
  const livelloRetributivoFte = toFte(livelloRetributivo)
  const totalSalaryFte = toFte(totalSalary)

  const structuralComponentsFte = toFte(structuralComponents)
  const individualComponentsFte = toFte(individualComponents)
  const variableComponentsFte = toFte(variableComponents)

  return {
    ...r,
    partTimePct,
    baseSalaryRaw,
    superminimo: parseSalaryAmount(superminimo),
    superminimoAssoluto: parseSalaryAmount(superminimoAssoluto),
    baseSalary,
    structuralComponents,
    individualComponents,
    livelloRetributivo,
    totalSalary,
    variableComponents,
    structuralComponentsFte,
    individualComponentsFte,
    variableComponentsFte,
    baseSalaryFte,
    livelloRetributivoFte,
    totalSalaryFte,
    baseSalaryHourly: toHourly(baseSalaryFte),
    livelloRetributivoHourly: toHourly(livelloRetributivoFte),
    totalSalaryHourly: toHourly(totalSalaryFte),
    variableComponentsHourly: toHourly(variableComponentsFte),
  }
}

export function getSalaryFieldName(metric, { fte = true, hourly = false } = {}) {
  const core =
    {
      [SALARY_METRICS.base]: 'baseSalary',
      [SALARY_METRICS.livello]: 'livelloRetributivo',
      [SALARY_METRICS.totale]: 'totalSalary',
      [SALARY_METRICS.variabile]: 'variableComponents',
    }[metric] || 'baseSalary'

  if (hourly) {
    return `${core}Hourly`
  }
  if (fte) {
    const fteMap = {
      baseSalary: 'baseSalaryFte',
      livelloRetributivo: 'livelloRetributivoFte',
      totalSalary: 'totalSalaryFte',
      variableComponents: 'variableComponentsFte',
    }
    return fteMap[core]
  }
  return core
}

export function getMetricLabel(metric, { short = false } = {}) {
  if (short) {
    return (
      {
        [SALARY_METRICS.base]: 'RAL',
        [SALARY_METRICS.livello]: 'Livello retrib.',
        [SALARY_METRICS.totale]: 'Totale',
        [SALARY_METRICS.variabile]: 'Comp. variabili',
      }[metric] || 'Base'
    )
  }
  return (
    {
      [SALARY_METRICS.base]: 'RAL annua',
      [SALARY_METRICS.livello]: 'Livello retributivo (continuità fissa)',
      [SALARY_METRICS.totale]: 'Retribuzione totale annua',
      [SALARY_METRICS.variabile]: 'Componenti variabili annue',
    }[metric] || 'Retribuzione base annua'
  )
}

export function getComparisonValue(r, metric, { fte = true, hourly = false } = {}) {
  if (!r) return null
  const field = getSalaryFieldName(metric, { fte, hourly })
  const v = r[field]
  const allowZero = metric === SALARY_METRICS.variabile
  if (Number.isFinite(v) && (allowZero ? v >= 0 : v > 0)) return v
  if (hourly) {
    const annual = getComparisonValue(r, metric, { fte, hourly: false })
    return annual != null && (allowZero ? annual >= 0 : annual > 0)
      ? annual / DEFAULT_ANNUAL_HOURS
      : null
  }
  return null
}

/**
 * Gender pay gap (Dir. UE 2023/970): differenza tra retribuzione oraria media M e F
 * rapportata alla retribuzione oraria media degli uomini.
 * @returns {number|null} positivo = uomini pagati di più
 */
export function genderPayGapPct(avgHourlyMen, avgHourlyWomen) {
  if (!Number.isFinite(avgHourlyMen) || !Number.isFinite(avgHourlyWomen)) return null
  if (avgHourlyMen <= 0) return null
  return ((avgHourlyMen - avgHourlyWomen) / avgHourlyMen) * 100
}

export function validComparisonSalary(r, metric, options) {
  return getComparisonValue(r, metric, options) != null
}

export function gapSampleSufficient(nM, nF, min = MIN_GENDER_SAMPLE) {
  return nM >= min && nF >= min
}

/**
 * Stato gap: verde / giallo (da verificare) / rosso (da correggere) / campione insufficiente.
 */
export function classifyGapStatus(gapPct, { hasJustification = false, nM = 0, nF = 0 } = {}) {
  if (!gapSampleSufficient(nM, nF)) return 'insufficient'
  if (gapPct == null || !Number.isFinite(gapPct) || Math.abs(gapPct) <= EU_GAP_THRESHOLD_PCT) {
    return 'green'
  }
  if (hasJustification) return 'yellow'
  return 'red'
}
