import * as XLSX from 'xlsx'

export const COLUMN_ROLES = {
  gender: 'gender',
  employeeName: 'employeeName',
  baseSalary: 'baseSalary',
  variableComponents: 'variableComponents',
  totalSalary: 'totalSalary',
  category: 'category',
  role: 'role',
  level: 'level',
  description: 'description',
  /** Anni di servizio, data ingresso o simile (utile come giustificativo oggettivo) */
  seniority: 'seniority',
  /** Anzianità nel ruolo attuale (anni o data) */
  roleSeniority: 'roleSeniority',
  /** Punteggio performance (0–100) */
  performanceScore: 'performanceScore',
  /** Percentuale part-time (default 100 = full time) */
  partTimePct: 'partTimePct',
  /** Data assunzione / ingresso */
  hireDate: 'hireDate',
  /** Data cessazione / fine rapporto */
  terminationDate: 'terminationDate',
  /** Scatti di anzianità (importo) */
  senioritySteps: 'senioritySteps',
  /** Altre voci fisse oltre base e superminimi */
  otherFixedItems: 'otherFixedItems',
  /** Bonus / MBO */
  bonusMbo: 'bonusMbo',
  /** Premio di risultato */
  resultBonus: 'resultBonus',
  /** Straordinari */
  overtime: 'overtime',
  /** Indennità variabili */
  variableAllowances: 'variableAllowances',
  /** Una tantum */
  oneOffPayment: 'oneOffPayment',
  /** Fringe benefit */
  fringeBenefits: 'fringeBenefits',
  /** Welfare aziendale */
  companyWelfare: 'companyWelfare',
  employeeId: 'employeeId',
  firstName: 'firstName',
  lastName: 'lastName',
  company: 'company',
  qualification: 'qualification',
  weeklyFullTimeHours: 'weeklyFullTimeHours',
  /** Forfait straordinari, importo mensile nel tracciato TEA */
  forfaitOvertime: 'forfaitOvertime',
  /** Bonus / MBO obiettivo base 100, non l'erogato */
  mboBase100: 'mboBase100',
  jobCode: 'jobCode',
  costCenterCode: 'costCenterCode',
  costCenterDescription: 'costCenterDescription',
  softSkills: 'softSkills',
  hardSkills: 'hardSkills',
  grade: 'grade',
  payBand: 'payBand',
  jobFamily: 'jobFamily',
  educationLevel: 'educationLevel',
  /** CCNL / contratto collettivo di riferimento (es. Metalmeccanico Industria) */
  ccnl: 'ccnl',
  /** Componenti strutturali continuative (livello retributivo) */
  structuralComponents: 'structuralComponents',
  /** Componenti individuali / discrezionali (escluse dal livello retributivo) */
  individualComponents: 'individualComponents',
  /** Minimo tabellare CCNL (opzionale) */
  ccnlMinimum: 'ccnlMinimum',
  /** Superminimo (escluso dalla retribuzione base in analisi) */
  superminimo: 'superminimo',
  /** Superminimo assorbibile / ass.le (escluso dalla retribuzione base in analisi) */
  superminimoAssoluto: 'superminimoAssoluto',
}

export function getRoleLabel(role) {
  const labels = {
    [COLUMN_ROLES.gender]: 'Genere (M/F)',
    [COLUMN_ROLES.employeeName]: 'Nome dipendente',
    [COLUMN_ROLES.baseSalary]: 'RAL annua',
    [COLUMN_ROLES.variableComponents]: 'Componenti variabili (legacy)',
    [COLUMN_ROLES.totalSalary]: 'Retribuzione totale annua (legacy)',
    [COLUMN_ROLES.category]: 'Descrizione CdR / centro di costo',
    [COLUMN_ROLES.role]: 'Ruolo / job title',
    [COLUMN_ROLES.level]: 'Livello contrattuale (es. Q, B1, C3)',
    [COLUMN_ROLES.description]: 'Descrizione ruolo',
    [COLUMN_ROLES.seniority]: 'Anzianità',
    [COLUMN_ROLES.roleSeniority]: 'Anzianità nel ruolo',
    [COLUMN_ROLES.performanceScore]: 'Valutazione media complessiva (1–5)',
    [COLUMN_ROLES.partTimePct]: '% Part-time',
    [COLUMN_ROLES.hireDate]: 'Data assunzione',
    [COLUMN_ROLES.terminationDate]: 'Data cessazione',
    [COLUMN_ROLES.senioritySteps]: 'Scatti di anzianità mensili',
    [COLUMN_ROLES.otherFixedItems]: 'Altre voci fisse mensili',
    [COLUMN_ROLES.bonusMbo]: 'Bonus / MBO erogato (annuo)',
    [COLUMN_ROLES.resultBonus]: 'Premio di risultato base 100',
    [COLUMN_ROLES.overtime]: 'Straordinari (annui)',
    [COLUMN_ROLES.variableAllowances]: 'Indennità variabili',
    [COLUMN_ROLES.oneOffPayment]: 'Una tantum',
    [COLUMN_ROLES.fringeBenefits]: 'Fringe benefit annuo',
    [COLUMN_ROLES.companyWelfare]: 'Welfare aziendale annuo',
    [COLUMN_ROLES.employeeId]: 'ID dipendente',
    [COLUMN_ROLES.firstName]: 'Nome',
    [COLUMN_ROLES.lastName]: 'Cognome',
    [COLUMN_ROLES.company]: 'Società',
    [COLUMN_ROLES.qualification]: 'Qualifica',
    [COLUMN_ROLES.weeklyFullTimeHours]: 'Orario settimanale full-time (ore)',
    [COLUMN_ROLES.forfaitOvertime]: 'Forfait straordinari mensile',
    [COLUMN_ROLES.mboBase100]: 'Bonus / MBO base 100',
    [COLUMN_ROLES.jobCode]: 'Codice mansione',
    [COLUMN_ROLES.costCenterCode]: 'Cod CdR',
    [COLUMN_ROLES.costCenterDescription]: 'Descrizione CdR',
    [COLUMN_ROLES.softSkills]: 'Valutazione media soft skills (1–5)',
    [COLUMN_ROLES.hardSkills]: 'Valutazione media hard skills (1–5)',
    [COLUMN_ROLES.grade]: 'Grade',
    [COLUMN_ROLES.payBand]: 'Banda',
    [COLUMN_ROLES.jobFamily]: 'Famiglia professionale',
    [COLUMN_ROLES.educationLevel]: 'Livello di istruzione',
    [COLUMN_ROLES.ccnl]: 'CCNL (contratto collettivo / settore)',
    [COLUMN_ROLES.structuralComponents]: 'Componenti strutturali (voci continuative/fisse)',
    [COLUMN_ROLES.individualComponents]: 'Componenti individuali (voci discrezionali/una-tantum)',
    [COLUMN_ROLES.ccnlMinimum]: 'Minimo tabellare mensile',
    [COLUMN_ROLES.superminimo]: 'Superminimo non assorbibile mensile',
    [COLUMN_ROLES.superminimoAssoluto]: 'Superminimo assorbibile mensile',
  }
  return labels[role] ?? role
}

/** Colonne obbligatorie per avviare l'analisi */
export const MAPPING_REQUIRED_ROLES = [
  COLUMN_ROLES.gender,
  COLUMN_ROLES.level,
  COLUMN_ROLES.baseSalary,
  COLUMN_ROLES.superminimo,
  COLUMN_ROLES.superminimoAssoluto,
  COLUMN_ROLES.terminationDate,
  COLUMN_ROLES.hireDate,
  COLUMN_ROLES.senioritySteps,
  COLUMN_ROLES.otherFixedItems,
  COLUMN_ROLES.bonusMbo,
  COLUMN_ROLES.resultBonus,
  COLUMN_ROLES.overtime,
  COLUMN_ROLES.variableAllowances,
  COLUMN_ROLES.oneOffPayment,
  COLUMN_ROLES.fringeBenefits,
  COLUMN_ROLES.companyWelfare,
]

/** Colonne consigliate per analisi normativa affidabile (non bloccano l'avvio) */
export const MAPPING_RECOMMENDED_ROLES = [
  COLUMN_ROLES.partTimePct,
  COLUMN_ROLES.ccnl,
  COLUMN_ROLES.ccnlMinimum,
]

/**
 * Sezioni UI mapping import (necessari vs facoltativi).
 * @type {Array<{ id: string, title: string, fields: Array<{ role: string, label: string, hint?: string, badge?: 'required'|'recommended' }> }>}
 */
export const MAPPING_UI_SECTIONS = [
  {
    id: 'necessari',
    title: 'Necessari (per analisi affidabile)',
    fields: [
      { role: COLUMN_ROLES.employeeName, label: 'Nome dipendente', hint: 'Se il file separa Nome e Cognome, usa quei due campi nella sezione tracciato TEA' },
      {
        role: COLUMN_ROLES.gender,
        label: 'Genere (M/F)',
        hint: 'Obbligatorio per procedere',
        badge: 'required',
      },
      {
        role: COLUMN_ROLES.level,
        label: 'Livello CCNL (inquadramento contrattuale, es. Q, B1, C3)',
        hint: 'Obbligatorio per procedere',
        badge: 'required',
      },
      {
        role: COLUMN_ROLES.baseSalary,
        label: 'RAL annua',
        hint: 'Obbligatorio. Nel tracciato TEA è già comprensiva delle mensilità: non si sommano le voci mensili e non si riproporziona sulle date. Il confronto la normalizza solo sulla % di part-time',
        badge: 'required',
      },
      {
        role: COLUMN_ROLES.superminimo,
        label: 'Superminimo non assorbibile mensile',
        hint: 'Nel tracciato TEA è mensile: resta nel dettaglio e non viene sottratto dalla RAL',
        badge: 'required',
      },
      {
        role: COLUMN_ROLES.superminimoAssoluto,
        label: 'Superminimo assorbibile mensile',
        hint: 'Importo mensile. Non si somma alla RAL e non si sottrae da essa',
        badge: 'required',
      },
      {
        role: COLUMN_ROLES.terminationDate,
        label: 'Data cessazione',
        hint: 'Obbligatorio per procedere',
        badge: 'required',
      },
      {
        role: COLUMN_ROLES.hireDate,
        label: 'Data assunzione',
        hint: 'Obbligatorio per procedere',
        badge: 'required',
      },
      {
        role: COLUMN_ROLES.senioritySteps,
        label: 'Scatti di anzianità mensili',
        hint: 'Importo mensile. Non annualizzato e non sommato alla RAL',
        badge: 'required',
      },
      {
        role: COLUMN_ROLES.otherFixedItems,
        label: 'Altre voci fisse mensili',
        hint: 'Importo mensile. Il forfait straordinari è una colonna a parte',
        badge: 'required',
      },
      {
        role: COLUMN_ROLES.bonusMbo,
        label: 'Bonus / MBO erogato (annuo)',
        hint: 'Importo annuo erogato. Normalizzato sul part-time, non sulle date di assunzione o cessazione',
        badge: 'required',
      },
      {
        role: COLUMN_ROLES.resultBonus,
        label: 'Premio di risultato base 100',
        hint: 'Valore obiettivo, non l\'importo erogato. Non entra nella retribuzione totale',
        badge: 'required',
      },
      {
        role: COLUMN_ROLES.overtime,
        label: 'Straordinari (annui)',
        hint: 'Importo annuo erogato. Non include il forfait straordinari mensile',
        badge: 'required',
      },
      {
        role: COLUMN_ROLES.variableAllowances,
        label: 'Indennità variabili',
        hint: 'Obbligatorio per procedere',
        badge: 'required',
      },
      {
        role: COLUMN_ROLES.oneOffPayment,
        label: 'Una tantum',
        hint: 'Obbligatorio per procedere',
        badge: 'required',
      },
      {
        role: COLUMN_ROLES.fringeBenefits,
        label: 'Fringe benefit annuo',
        hint: 'Valore annuo di auto e appartamento',
        badge: 'required',
      },
      {
        role: COLUMN_ROLES.companyWelfare,
        label: 'Welfare aziendale annuo',
        hint: 'Importo annuo',
        badge: 'required',
      },
      {
        role: COLUMN_ROLES.partTimePct,
        label: '% Part-time',
        hint: 'Senza, il gap esce probabilmente sovrastimato',
        badge: 'recommended',
      },
      {
        role: COLUMN_ROLES.ccnl,
        label: 'CCNL (contratto collettivo / settore)',
        hint: 'Es. Metalmeccanico Industria, Commercio, Turismo',
        badge: 'recommended',
      },
      {
        role: COLUMN_ROLES.ccnlMinimum,
        label: 'Minimo tabellare mensile',
        hint: 'Importo mensile. Non si somma alla RAL, che include già le mensilità del CCNL',
        badge: 'recommended',
      },
    ],
  },
  {
    id: 'facoltativi',
    title: 'Facoltativi',
    fields: [
      { role: COLUMN_ROLES.role, label: 'Ruolo / job title' },
      { role: COLUMN_ROLES.description, label: 'Descrizione ruolo' },
      { role: COLUMN_ROLES.category, label: 'Descrizione CdR / centro di costo' },
      { role: COLUMN_ROLES.seniority, label: 'Anzianità' },
      { role: COLUMN_ROLES.roleSeniority, label: 'Anzianità nel ruolo' },
      { role: COLUMN_ROLES.performanceScore, label: 'Valutazione media complessiva (1–5)' },
    ],
  },
  {
    id: 'tea',
    title: 'Tracciato TEA',
    fields: [
      { role: COLUMN_ROLES.employeeId, label: 'ID dipendente' },
      { role: COLUMN_ROLES.firstName, label: 'Nome' },
      { role: COLUMN_ROLES.lastName, label: 'Cognome' },
      { role: COLUMN_ROLES.company, label: 'Società' },
      { role: COLUMN_ROLES.qualification, label: 'Qualifica' },
      { role: COLUMN_ROLES.weeklyFullTimeHours, label: 'Orario settimanale full-time (ore)', hint: 'Serve a calcolare la retribuzione oraria dalla RAL' },
      { role: COLUMN_ROLES.forfaitOvertime, label: 'Forfait straordinari mensile', hint: 'Voce mensile. Non si somma agli straordinari annui né alla RAL' },
      { role: COLUMN_ROLES.mboBase100, label: 'Bonus / MBO base 100', hint: 'Obiettivo. Non entra nel totale erogato' },
      { role: COLUMN_ROLES.jobCode, label: 'Codice mansione' },
      { role: COLUMN_ROLES.costCenterCode, label: 'Cod CdR' },
      { role: COLUMN_ROLES.costCenterDescription, label: 'Descrizione CdR' },
      { role: COLUMN_ROLES.softSkills, label: 'Soft skills (1–5)' },
      { role: COLUMN_ROLES.hardSkills, label: 'Hard skills (1–5)' },
      { role: COLUMN_ROLES.grade, label: 'Grade' },
      { role: COLUMN_ROLES.payBand, label: 'Banda' },
      { role: COLUMN_ROLES.jobFamily, label: 'Famiglia professionale' },
      { role: COLUMN_ROLES.educationLevel, label: 'Livello di istruzione', hint: 'Primaria, secondaria o terziaria' },
    ],
  },
]

export function isMappingRoleAssigned(mapping, role) {
  if (!mapping || role == null) return false
  const idx = mapping[role]
  return Number.isFinite(idx) && idx >= 0
}

export function missingRequiredMappingRoles(mapping) {
  return MAPPING_REQUIRED_ROLES.filter((role) => !isMappingRoleAssigned(mapping, role))
}

export function missingRecommendedMappingRoles(mapping) {
  return MAPPING_RECOMMENDED_ROLES.filter((role) => !isMappingRoleAssigned(mapping, role))
}

function detectHeaderRow(rows) {
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const row = rows[i]
    if (!row || !Array.isArray(row)) continue
    const nonEmpty = row.filter((c) => c != null && String(c).trim() !== '')
    if (nonEmpty.length < 2) continue
    const strings = nonEmpty.filter((c) => typeof c === 'string' && isNaN(Number(c)))
    const textRatio = strings.length / nonEmpty.length
    const avgLen = strings.reduce((s, c) => s + String(c).length, 0) / (strings.length || 1)
    if (textRatio >= 0.5 && avgLen > 2) return i
  }
  return 0
}

function expandSheetRangeIfNeeded(sheet) {
  if (!sheet || typeof sheet !== 'object') return

  // Alcuni export hanno !ref troncato (es. A1:Z100) anche se esistono celle oltre.
  // In quel caso sheet_to_json legge solo il range !ref e sembra "fermarsi" a 100 righe.
  const cellKeys = Object.keys(sheet).filter((k) => !k.startsWith('!'))
  if (!cellKeys.length) return

  let minR = Number.POSITIVE_INFINITY
  let minC = Number.POSITIVE_INFINITY
  let maxR = -1
  let maxC = -1

  for (const key of cellKeys) {
    const cell = XLSX.utils.decode_cell(key)
    if (cell.r < minR) minR = cell.r
    if (cell.c < minC) minC = cell.c
    if (cell.r > maxR) maxR = cell.r
    if (cell.c > maxC) maxC = cell.c
  }

  if (maxR < 0 || maxC < 0) return
  const computedRef = XLSX.utils.encode_range({
    s: { r: Number.isFinite(minR) ? minR : 0, c: Number.isFinite(minC) ? minC : 0 },
    e: { r: maxR, c: maxC },
  })

  const existingRef = sheet['!ref']
  if (!existingRef) {
    sheet['!ref'] = computedRef
    return
  }

  try {
    const existing = XLSX.utils.decode_range(existingRef)
    // Aggiorna solo se il range dichiarato è più piccolo del range reale trovato.
    if (existing.e.r < maxR || existing.e.c < maxC) {
      sheet['!ref'] = computedRef
    }
  } catch {
    sheet['!ref'] = computedRef
  }
}

function parseExcelArrayBuffer(arrayBuffer, contentType = '') {
  const bytes = new Uint8Array(arrayBuffer)
  const startsWithZip =
    bytes.length >= 2 &&
    bytes[0] === 0x50 && // P
    bytes[1] === 0x4b // K
  const asTextProbe = new TextDecoder('utf-8', { fatal: false }).decode(bytes.slice(0, 512)).trimStart().toLowerCase()
  const looksLikeHtml = asTextProbe.startsWith('<!doctype html') || asTextProbe.startsWith('<html')
  const looksLikeCsv = asTextProbe.includes(',') && (asTextProbe.includes('\n') || asTextProbe.includes('\r'))

  // Se l'URL restituisce una pagina HTML (preview/login) SheetJS può leggere solo una tabella parziale
  // (spesso 100 righe). In quel caso interrompiamo con messaggio esplicito.
  if (looksLikeHtml || (!startsWithZip && contentType.includes('text/html'))) {
    throw new Error(
      'Il link non punta al file Excel diretto (restituisce HTML/preview). Usa un URL di download diretto del .xlsx.'
    )
  }

  // Supporto CSV diretto (Google Sheets/BI export): evita il parsing "best effort" che può troncare dati.
  if (!startsWithZip && (contentType.includes('text/csv') || looksLikeCsv)) {
    const csvText = new TextDecoder('utf-8', { fatal: false }).decode(bytes)
    const workbookFromCsv = XLSX.read(csvText, { type: 'string' })
    const firstSheetName = workbookFromCsv.SheetNames[0]
    const firstSheet = workbookFromCsv.Sheets[firstSheetName]
    const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: null, raw: true })
    if (!rows.length) return { rows: [], headers: [] }
    const headerRowIndex = detectHeaderRow(rows)
    const headers = (rows[headerRowIndex] || []).map((h) => String(h ?? '').trim())
    const dataRows = rows.slice(headerRowIndex + 1)
    return { headers, rows: dataRows }
  }

  const workbook = XLSX.read(arrayBuffer, { type: 'array' })
  let best = { headers: [], rows: [], nonEmptyDataRows: -1 }

  // Alcuni file hanno il dataset "principale" in un foglio diverso dal primo.
  // Selezioniamo il foglio con più righe dati non vuote.
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName]
    if (!sheet) continue
    expandSheetRangeIfNeeded(sheet)

    // raw: true (default) → numeri come number JS. raw: false produce stringhe formattate (anche in formato US)
    // che rompono parseNumber italiano (punto decimale rimosso come migliaia) e gonfiano le retribuzioni.
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true })
    if (!rows.length) continue

    const headerRowIndex = detectHeaderRow(rows)
    const headers = (rows[headerRowIndex] || []).map((h) => String(h ?? '').trim())
    const dataRows = rows.slice(headerRowIndex + 1)
    const nonEmptyDataRows = dataRows.filter(
      (row) => Array.isArray(row) && row.some((c) => c != null && String(c).trim() !== '')
    ).length

    if (nonEmptyDataRows > best.nonEmptyDataRows) {
      best = { headers, rows: dataRows, nonEmptyDataRows }
    }
  }

  return {
    headers: best.headers,
    rows: best.rows,
  }
}

export async function parseExcelFromUrl(url) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Download non riuscito (${response.status})`)
  }
  const contentType = (response.headers.get('content-type') || '').toLowerCase()
  const arrayBuffer = await response.arrayBuffer()
  return parseExcelArrayBuffer(arrayBuffer, contentType)
}

export async function parseExcelFromFile(file) {
  if (!file) throw new Error('Nessun file selezionato.')
  const arrayBuffer = await file.arrayBuffer()
  const contentType = String(file.type || '').toLowerCase()
  return parseExcelArrayBuffer(arrayBuffer, contentType)
}

export { detectColumnRoles } from './column-mapping.js'
import { enrichEmployeeSalaries, parsePartTimePct } from './salaryMetrics.js'
import { readTeaColumns, withTeaContext } from './teaTracciato.js'

export function buildNormalizedData(rows, headers, mapping) {
  if (!rows?.length || !headers?.length || !mapping) return []

  const idx = (key) =>
    Object.prototype.hasOwnProperty.call(mapping, key) ? mapping[key] : undefined

  const genderIdx = idx(COLUMN_ROLES.gender)
  const nameIdx = idx(COLUMN_ROLES.employeeName)
  const baseIdx = idx(COLUMN_ROLES.baseSalary)
  const varIdx = idx(COLUMN_ROLES.variableComponents)
  const totalIdx = idx(COLUMN_ROLES.totalSalary)
  const catIdx = idx(COLUMN_ROLES.category)
  const roleIdx = idx(COLUMN_ROLES.role)
  const levelIdx = idx(COLUMN_ROLES.level)
  const descIdx = idx(COLUMN_ROLES.description)
  const roleSenIdx = idx(COLUMN_ROLES.roleSeniority)
  const perfIdx = idx(COLUMN_ROLES.performanceScore)
  const senIdx = idx(COLUMN_ROLES.seniority)
  const ptIdx = idx(COLUMN_ROLES.partTimePct)
  const hireIdx = idx(COLUMN_ROLES.hireDate)
  const terminationIdx = idx(COLUMN_ROLES.terminationDate)
  const seniorityStepsIdx = idx(COLUMN_ROLES.senioritySteps)
  const otherFixedIdx = idx(COLUMN_ROLES.otherFixedItems)
  const bonusMboIdx = idx(COLUMN_ROLES.bonusMbo)
  const resultBonusIdx = idx(COLUMN_ROLES.resultBonus)
  const overtimeIdx = idx(COLUMN_ROLES.overtime)
  const variableAllowancesIdx = idx(COLUMN_ROLES.variableAllowances)
  const oneOffIdx = idx(COLUMN_ROLES.oneOffPayment)
  const fringeIdx = idx(COLUMN_ROLES.fringeBenefits)
  const welfareIdx = idx(COLUMN_ROLES.companyWelfare)
  const ccnlIdx = idx(COLUMN_ROLES.ccnl)
  const structIdx = idx(COLUMN_ROLES.structuralComponents)
  const indivIdx = idx(COLUMN_ROLES.individualComponents)
  const ccnlMinIdx = idx(COLUMN_ROLES.ccnlMinimum)
  const superminimoIdx = idx(COLUMN_ROLES.superminimo)
  const superminimoAssIdx = idx(COLUMN_ROLES.superminimoAssoluto)

  const parseNumber = (value) => {
    if (value == null || value === '') return 0
    if (typeof value === 'number') return value
    const cleaned = String(value)
      .replace(/\./g, '')
      .replace(/,/g, '.')
      .replace(/[^\d.-]/g, '')
    const n = Number(cleaned)
    return Number.isFinite(n) ? n : 0
  }

  function parsePerformanceScore(value) {
    if (value == null || value === '') return null
    const raw = typeof value === 'number' ? value : parseNumber(value)
    if (!raw || !Number.isFinite(raw)) return null
    if (raw > 0 && raw <= 1) return Math.round(raw * 100)
    return Math.round(raw)
  }

  function normalizeGender(raw) {
    if (raw == null || raw === '') return null
    const s = String(raw).trim().toLowerCase()
    if (s === 'm' || s === 'maschio' || s === 'male' || s === 'uomo' || s === 'u' || s === 'h' || s === 'homme') return 'M'
    if (s === 'f' || s === 'femmina' || s === 'female' || s === 'donna' || s === 'd' || s === 'femme') return 'F'
    const first = s.charAt(0)
    if (first === 'm' || first === 'u' || first === 'h') return 'M'
    if (first === 'f' || first === 'd') return 'F'
    return null
  }

  return rows
    .map((row, rowIndex) => {
      const genderRaw = genderIdx != null ? row[genderIdx] : null
      const gender = normalizeGender(genderRaw)

      const base = baseIdx != null ? parseNumber(row[baseIdx]) : 0
      const superminimo =
        superminimoIdx != null ? parseNumber(row[superminimoIdx]) : 0
      const superminimoAssoluto =
        superminimoAssIdx != null ? parseNumber(row[superminimoAssIdx]) : 0
      const variableLegacy = varIdx != null ? parseNumber(row[varIdx]) : 0
      const structural =
        structIdx != null ? parseNumber(row[structIdx]) : null
      const individual =
        indivIdx != null ? parseNumber(row[indivIdx]) : null

      return enrichEmployeeSalaries(withTeaContext({
        index: rowIndex + 1,
        gender,
        name: nameIdx != null ? row[nameIdx] : null,
        baseSalary: base,
        superminimo,
        superminimoAssoluto,
        structuralComponents: structural,
        individualComponents: individual,
        variableComponents: variableLegacy,
        totalSalary:
          totalIdx != null
            ? parseNumber(row[totalIdx])
            : undefined,
        category: catIdx != null ? row[catIdx] : null,
        role: roleIdx != null ? row[roleIdx] : null,
        level: levelIdx != null ? row[levelIdx] : null,
        description: descIdx != null ? row[descIdx] : null,
        seniority: senIdx != null ? row[senIdx] : null,
        roleSeniority: roleSenIdx != null ? row[roleSenIdx] : null,
        performanceScore: perfIdx != null ? parsePerformanceScore(row[perfIdx]) : null,
        partTimePct: ptIdx != null ? parsePartTimePct(row[ptIdx]) : 100,
        hireDate: hireIdx != null ? row[hireIdx] : null,
        terminationDate: terminationIdx != null ? row[terminationIdx] : null,
        senioritySteps: seniorityStepsIdx != null ? parseNumber(row[seniorityStepsIdx]) : 0,
        otherFixedItems: otherFixedIdx != null ? parseNumber(row[otherFixedIdx]) : 0,
        bonusMbo: bonusMboIdx != null ? parseNumber(row[bonusMboIdx]) : 0,
        resultBonus: resultBonusIdx != null ? parseNumber(row[resultBonusIdx]) : 0,
        overtime: overtimeIdx != null ? parseNumber(row[overtimeIdx]) : 0,
        variableAllowances:
          variableAllowancesIdx != null ? parseNumber(row[variableAllowancesIdx]) : 0,
        oneOffPayment: oneOffIdx != null ? parseNumber(row[oneOffIdx]) : 0,
        fringeBenefits: fringeIdx != null ? parseNumber(row[fringeIdx]) : 0,
        companyWelfare: welfareIdx != null ? parseNumber(row[welfareIdx]) : 0,
        ccnl:
          ccnlIdx != null && row[ccnlIdx] != null && String(row[ccnlIdx]).trim() !== ''
            ? String(row[ccnlIdx]).trim()
            : null,
        ccnlMinimum: ccnlMinIdx != null ? parseNumber(row[ccnlMinIdx]) : null,
        ...readTeaColumns(row, idx, parseNumber),
      }, headers))
    })
    .filter((r) => r.gender === 'M' || r.gender === 'F')
}

