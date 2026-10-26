/**
 * Mapping colonne per le serverless function.
 * Vive in api/lib (non in src/) così il deploy non importa file del frontend.
 */
export const MAPPING_SAMPLE_ROWS = 12

/** Valori allineati a COLUMN_ROLES in excel.js (no import per evitare cicli). */
const R = {
  gender: 'gender',
  employeeName: 'employeeName',
  baseSalary: 'baseSalary',
  variableComponents: 'variableComponents',
  totalSalary: 'totalSalary',
  category: 'category',
  role: 'role',
  level: 'level',
  description: 'description',
  seniority: 'seniority',
  roleSeniority: 'roleSeniority',
  performanceScore: 'performanceScore',
  partTimePct: 'partTimePct',
  hireDate: 'hireDate',
  terminationDate: 'terminationDate',
  senioritySteps: 'senioritySteps',
  otherFixedItems: 'otherFixedItems',
  bonusMbo: 'bonusMbo',
  resultBonus: 'resultBonus',
  overtime: 'overtime',
  variableAllowances: 'variableAllowances',
  oneOffPayment: 'oneOffPayment',
  fringeBenefits: 'fringeBenefits',
  companyWelfare: 'companyWelfare',
  employeeId: 'employeeId',
  firstName: 'firstName',
  lastName: 'lastName',
  company: 'company',
  qualification: 'qualification',
  weeklyFullTimeHours: 'weeklyFullTimeHours',
  forfaitOvertime: 'forfaitOvertime',
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
  ccnl: 'ccnl',
  structuralComponents: 'structuralComponents',
  individualComponents: 'individualComponents',
  ccnlMinimum: 'ccnlMinimum',
  superminimo: 'superminimo',
  superminimoAssoluto: 'superminimoAssoluto',
}

/** Ruoli per cui l'euristica ha priorità sull'AI (evita 14ma → base, INPS → totale). */
const SALARY_PRIORITY_ROLES = new Set([
  R.baseSalary,
  R.variableComponents,
  R.structuralComponents,
  R.individualComponents,
  R.totalSalary,
  R.superminimo,
  R.superminimoAssoluto,
  R.senioritySteps,
  R.otherFixedItems,
  R.bonusMbo,
  R.resultBonus,
  R.overtime,
  R.variableAllowances,
  R.oneOffPayment,
  R.fringeBenefits,
  R.companyWelfare,
  R.ccnlMinimum,
  R.forfaitOvertime,
  R.mboBase100,
])

const DISQUALIFY = {
  [R.baseSalary]: [
    /\b14\s*ma\b/i,
    /\b14\s*es/i,
    /\b13\s*ma\b/i,
    /\b13\s*es/i,
    /\b12\s*ma\b/i,
    /\bmensilit/i,
    /\binps\b/i,
    /\bcontribut/i,
    /\btfr\b/i,
    /\baccanton/i,
    /\bvariabil/i,
    /\bcosto\s*(del\s*)?lavoro/i,
    /\bcentro\s*di\s*costo/i,
    /\bjob\s*desc/i,
    /\bsuperminimo\b/i,
    /\bmensile\b/i,
    /\bminimo\s*tabell/i,
  ],
  [R.totalSalary]: [
    /\binps\b/i,
    /\bcontribut/i,
    /\bctr\s*inps/i,
    /\bcosto\s*azienda/i,
    /\b14\s*ma\b/i,
    /\b13\s*ma\b/i,
    /\bmensilit/i,
    /\baccanton/i,
    /\btfr\b/i,
    /\bcentro\s*di\s*costo/i,
  ],
  [R.variableComponents]: [
    /\binps\b/i,
    /\bcontribut/i,
    /\b14\s*ma\b/i,
    /\bretribuzione\s*base\b/i,
    /\bral\s*fiss/i,
    /\bcentro\s*di\s*costo/i,
    /\bbonus\b/i,
    /\bmbo\b/i,
    /\bpremio\s+di\s+risultat/i,
    /\bstraordinar/i,
    /\bindennit[aà]\s+variabil/i,
    /\buna[\s-]*tantum\b/i,
    /\bfringe\b/i,
    /\bwelfare\b/i,
    /\bscatti?\b/i,
  ],
  [R.individualComponents]: [/\buna[\s-]*tantum\b/i, /\bfringe\b/i, /\bwelfare\b/i],
  [R.hireDate]: [/\bcessaz/i, /\bdimission/i, /\blicenziament/i, /\bfine\s+rapporto\b/i, /\bdata\s+uscita\b/i],
  [R.seniority]: [/\bscatt/i],
  [R.terminationDate]: [/\bassunzion/i, /\bingresso\b/i, /\bhire\b/i],
  [R.otherFixedItems]: [/\bsuperminimo\b/i, /\bretribuzione\s*base\b/i, /\bral\b/i, /\bforfait\b/i],
  [R.bonusMbo]: [/\bpremio\s+di\s+risultat/i, /\bstraordinar/i, /\bwelfare\b/i, /\bfringe\b/i, /\bbase\s*100\b/i],
  [R.fringeBenefits]: [/\bwelfare\b/i],
  [R.ccnl]: [/\blivello\b/i, /\bminimo\b/i, /\btabell/i, /\binquadramento\b/i],
  [R.level]: [/^ccnl$/i, /\bcontratto\s*collettivo\b/i, /\bistruzione\b/i],
  [R.superminimo]: [/\bass\.?\s*le\b/i, /(?<!non\s)assorb/i],
  [R.overtime]: [/\bforfait\b/i],
  [R.performanceScore]: [/\bsoft\b/i, /\bhard\b/i],
}

const SCORE_PATTERNS = {
  [R.gender]: [
    { re: /\b(sesso|genere|gender|sex)\b/i, w: 8 },
    { re: /\bm\s*\/\s*f\b/i, w: 6 },
  ],
  [R.employeeName]: [
    { re: /\b(dipendente|nominativo|nome|cognome|employee)\b/i, w: 7 },
  ],
  [R.baseSalary]: [
    { re: /\bral\s*annua\b/i, w: 14 },
    { re: /\b(retribuzione\s*base|ral\s*base|competenze\s*fisse|stipendio\s*base)\b/i, w: 10 },
    { re: /\b(ral|retribuzione\s*fissa)\b/i, w: 8 },
    { re: /\b(base\s*annua|fisso\s*annuo)\b/i, w: 7 },
    { re: /\bbase\b/i, w: 3 },
  ],
  [R.variableComponents]: [
    { re: /\b(tot\s*)?comp\.?\s*variab/i, w: 10 },
    { re: /\bcomponenti?\s*variabil/i, w: 9 },
    { re: /\b(bonus|premi|premio|incentiv|mbo|stock)\b/i, w: 6 },
    { re: /\bvariabil/i, w: 5 },
  ],
  [R.totalSalary]: [
    { re: /\b(retribuzione\s*totale|totale\s*competenze|lordo\s*annuo|competenze\s*totali)\b/i, w: 10 },
    { re: /\b(totale\s*annuo|ral\s*totale|tot\s*retrib)\b/i, w: 9 },
    { re: /\b(totale|total\s*comp|annual\s*total)\b/i, w: 5 },
  ],
  [R.category]: [
    { re: /\b(categoria|inquadramento|classificazione)\b/i, w: 8 },
    { re: /\bcentro\s*di\s*costo\b/i, w: 4 },
  ],
  [R.role]: [
    { re: /\b(ruolo|job\s*title|posizione|mansione|title)\b/i, w: 8 },
    { re: /\bjob\b/i, w: 2 },
  ],
  [R.level]: [
    { re: /\b(livello\s*ccnl|liv\.\s*ccnl|inquadramento\s*contr)\b/i, w: 10 },
    { re: /\b(livello|level|grade)\b/i, w: 8 },
    { re: /\bband\b/i, w: 4 },
  ],
  [R.ccnl]: [
    { re: /\b(contratto\s*collettivo|ccnl\s*applicato|nome\s*ccnl|settore\s*contratt)\b/i, w: 10 },
    { re: /^ccnl$/i, w: 9 },
    { re: /\b(metalmecc|commercio|turismo|logistica|chimico)\b/i, w: 3 },
  ],
  [R.description]: [
    { re: /\b(job\s*desc|descrizione\s*ruolo|mansione|description)\b/i, w: 8 },
    { re: /\bdescrizione\b/i, w: 5 },
  ],
  [R.seniority]: [
    { re: /\b(anzianit[aà]|seniority|anni\s*servizio)\b/i, w: 8 },
  ],
  [R.roleSeniority]: [
    { re: /\b(anzianit[aà].*ruolo|ruolo.*anzianit|seniority.*role)\b/i, w: 10 },
  ],
  [R.performanceScore]: [
    { re: /\b(performance|valutazione|rating|punteggio)\b/i, w: 7 },
  ],
  [R.partTimePct]: [
    { re: /\b(%\s*)?part[\s-]*time|perc[\s.]*pt\b/i, w: 9 },
    { re: /\bpercentuale\s*orario\b/i, w: 7 },
  ],
  [R.hireDate]: [
    { re: /\b(data\s*assunzione|data\s*ingresso|hire\s*date)\b/i, w: 9 },
  ],
  [R.terminationDate]: [
    { re: /\bdata\s+(di\s+)?cessazione\b/i, w: 12 },
    { re: /\bcessazione\s+(rapporto|contratto)\b/i, w: 10 },
    { re: /\b(data\s+)?(dimissioni|licenziamento|fine\s+rapporto)\b/i, w: 8 },
    { re: /\bdata\s+uscita\b/i, w: 8 },
    { re: /\btermination\s+date\b/i, w: 9 },
  ],
  [R.senioritySteps]: [
    { re: /\bscatti?\s+di\s+anzianit/i, w: 12 },
    { re: /\bscatti?\s+anzianit/i, w: 11 },
    { re: /\bscatti?\b/i, w: 8 },
  ],
  [R.otherFixedItems]: [
    { re: /\baltre\s+voci\s+fisse\b/i, w: 12 },
    { re: /\baltre\s+competenze\s+fisse\b/i, w: 11 },
    { re: /\baltre\s+indennit[aà]\s+fisse\b/i, w: 11 },
    { re: /\bvoci\s+fisse\b/i, w: 9 },
  ],
  [R.bonusMbo]: [
    { re: /\bbonus\s*\/\s*mbo\b/i, w: 12 },
    { re: /\bbonus\s+mbo\b/i, w: 12 },
    { re: /\bmbo\b/i, w: 10 },
    { re: /\bbonus\b/i, w: 9 },
  ],
  [R.resultBonus]: [
    { re: /\bpremio\s+di\s+risultato\b/i, w: 12 },
    { re: /\bpremio\s+risultato\b/i, w: 11 },
    { re: /\bpdr\b/i, w: 6 },
  ],
  [R.overtime]: [
    { re: /\b(ore\s+)?straordinar/i, w: 11 },
    { re: /\bovertime\b/i, w: 9 },
  ],
  [R.variableAllowances]: [
    { re: /\bindennit[aà]\s+variabil/i, w: 12 },
    { re: /\bind\.?\s*variabil/i, w: 8 },
  ],
  [R.oneOffPayment]: [
    { re: /\buna[\s-]*tantum\b/i, w: 12 },
    { re: /\bone[\s-]*off\b/i, w: 8 },
  ],
  [R.fringeBenefits]: [
    { re: /\bfringe\s*benefit/i, w: 12 },
    { re: /\bfringe\b/i, w: 9 },
    { re: /\bbenefit\s+in\s+kind\b/i, w: 8 },
  ],
  [R.companyWelfare]: [
    { re: /\bwelfare\s+aziendale\b/i, w: 12 },
    { re: /\bwelfare\b/i, w: 9 },
  ],
  [R.structuralComponents]: [
    { re: /\b(struttural|continuativ|fiss[ae]\s*annu)\b/i, w: 8 },
    { re: /\bcomp\.?\s*strutt/i, w: 9 },
  ],
  [R.individualComponents]: [
    { re: /\b(individual|discrezional|una[\s-]*tantum|spot)\b/i, w: 8 },
    { re: /\bcomp\.?\s*indiv/i, w: 9 },
  ],
  [R.ccnlMinimum]: [
    { re: /\b(minimo\s*ccnl|minimo\s*tabell|tabellare)\b/i, w: 9 },
  ],
  [R.superminimoAssoluto]: [
    { re: /\bsuperminimo\s*ass\.?\s*le\b/i, w: 12 },
    { re: /\bsuperminimo\s*assorb/i, w: 11 },
    { re: /\bass\.?\s*le\b/i, w: 5 },
  ],
  [R.superminimo]: [
    { re: /\bsuperminimo\s+non\s+assorb/i, w: 14 },
    { re: /\bsuperminimo\b/i, w: 10 },
  ],
  [R.employeeId]: [{ re: /\bid\s*dipendente\b/i, w: 12 }],
  [R.firstName]: [{ re: /^nome$/i, w: 10 }],
  [R.lastName]: [{ re: /^cognome$/i, w: 10 }],
  [R.company]: [{ re: /^societ[aà]$/i, w: 10 }],
  [R.qualification]: [{ re: /^qualifica$/i, w: 10 }],
  [R.weeklyFullTimeHours]: [{ re: /\borario\s+settimanale\s+full/i, w: 12 }],
  [R.forfaitOvertime]: [{ re: /\bforfait\s+straordinar/i, w: 14 }],
  [R.mboBase100]: [
    { re: /\bbonus\s*\/?\s*mbo\s*base\s*100/i, w: 14 },
    { re: /\bmbo\s*base\s*100/i, w: 12 },
  ],
  [R.jobCode]: [{ re: /\bcodice\s+mansione\b/i, w: 12 }],
  [R.costCenterCode]: [{ re: /\bcod\s*cdr\b/i, w: 12 }],
  [R.costCenterDescription]: [{ re: /\bdescrizione\s*cdr\b/i, w: 12 }],
  [R.softSkills]: [{ re: /\bsoft\s*skills\b/i, w: 12 }],
  [R.hardSkills]: [{ re: /\bhard\s*skills\b/i, w: 12 }],
  [R.grade]: [{ re: /^grade$/i, w: 10 }],
  [R.payBand]: [{ re: /^banda$/i, w: 10 }],
  [R.jobFamily]: [{ re: /\bfamiglia\s+professionale\b/i, w: 12 }],
  [R.educationLevel]: [{ re: /\blivello\s+di\s+istruzione\b/i, w: 12 }],
}

export function isDisqualifiedHeader(header, role) {
  const h = String(header || '')
  const rules = DISQUALIFY[role]
  if (!rules) return false
  return rules.some((re) => re.test(h))
}

function parseSampleNumber(value) {
  if (value == null || value === '') return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const cleaned = String(value)
    .replace(/\./g, '')
    .replace(/,/g, '.')
    .replace(/[^\d.-]/g, '')
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

function columnNumericStats(rows, colIdx) {
  const vals = []
  for (const row of (rows || []).slice(0, 40)) {
    const n = parseSampleNumber(row?.[colIdx])
    if (n != null && n >= 500 && n <= 2_000_000) vals.push(n)
  }
  if (vals.length < 2) return null
  vals.sort((a, b) => a - b)
  const median = vals[Math.floor(vals.length / 2)]
  return { median, max: vals[vals.length - 1], count: vals.length }
}

function sampleScoreBoost(header, role, stats) {
  if (!stats || !SALARY_PRIORITY_ROLES.has(role)) return 0
  const h = String(header || '')
  const { median, max } = stats

  if (/\b(14|13|12)\s*ma\b/i.test(h) || /\bmensilit/i.test(h)) {
    if (median < 25_000) return -8
  }
  if (/\binps\b/i.test(h) || /\bcontribut/i.test(h)) return -8

  if (role === R.baseSalary) {
    if (median >= 22_000 && median <= 250_000) return 4
    if (median < 12_000) return -4
  }
  if (role === R.totalSalary) {
    if (median >= 24_000 && max >= median * 1.02) return 4
    if (median < 12_000) return -4
  }
  if (role === R.variableComponents) {
    if (median >= 500 && median <= 120_000) return 2
  }
  return 0
}

export function scoreHeaderForRole(header, role, rows, colIdx) {
  const h = String(header || '').trim()
  if (!h || isDisqualifiedHeader(h, role)) return -1
  const patterns = SCORE_PATTERNS[role] || []
  let score = 0
  for (const { re, w } of patterns) {
    if (re.test(h)) score += w
  }
  if (colIdx != null && rows) {
    score += sampleScoreBoost(h, role, columnNumericStats(rows, colIdx))
  }
  return score
}

function bestColumnForRole(headers, role, usedIndices, rows) {
  let bestIdx = -1
  let bestScore = 0
  for (let i = 0; i < headers.length; i++) {
    if (usedIndices.has(i)) continue
    const s = scoreHeaderForRole(headers[i], role, rows, i)
    if (s > bestScore) {
      bestScore = s
      bestIdx = i
    }
  }
  return bestScore >= 3 ? bestIdx : -1
}

export function normalizeHeaderLabel(header) {
  return String(header ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/€/g, ' ')
    .replace(/[^a-z0-9%]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Intestazioni del tracciato TEA (foglio colonne definitivo). L'ordine evita i conflitti mensile/annuo. */
const TEA_HEADER_RULES = [
  { role: R.employeeId, re: /^id dipendente$/ },
  { role: R.firstName, re: /^nome$/ },
  { role: R.lastName, re: /^cognome$/ },
  { role: R.gender, re: /^sesso( f m)?$/ },
  { role: R.hireDate, re: /^data assunzione$/ },
  { role: R.terminationDate, re: /^data cessazione$/ },
  { role: R.ccnl, re: /^ccnl$/ },
  { role: R.company, re: /^societa$/ },
  { role: R.qualification, re: /^qualifica$/ },
  { role: R.level, re: /^livello ccnl$/ },
  { role: R.role, re: /^ruolo( job title)?$/ },
  { role: R.weeklyFullTimeHours, re: /^orario settimanale full time/ },
  { role: R.partTimePct, re: /^%? ?part time$/ },
  { role: R.ccnlMinimum, re: /^minimo tabellare mensile/ },
  { role: R.superminimo, re: /^superminimo non assorbibile mensile/ },
  { role: R.superminimoAssoluto, re: /^superminimo assorbibile mensile/ },
  { role: R.senioritySteps, re: /^scatti di anzianita mensile/ },
  { role: R.forfaitOvertime, re: /^forfait straordinari/ },
  { role: R.otherFixedItems, re: /^altre voci fisse mensili/ },
  { role: R.baseSalary, re: /^ral annua/ },
  { role: R.mboBase100, re: /^bonus mbo base 100/ },
  { role: R.bonusMbo, re: /^bonus mbo erogato/ },
  { role: R.resultBonus, re: /^premio di risultato/ },
  { role: R.overtime, re: /^straordinari$/ },
  { role: R.variableAllowances, re: /^indennita variabili/ },
  { role: R.oneOffPayment, re: /^una tantum/ },
  { role: R.fringeBenefits, re: /^fringe benefit/ },
  { role: R.companyWelfare, re: /^welfare aziendale/ },
  { role: R.jobCode, re: /^codice mansione$/ },
  { role: R.costCenterCode, re: /^cod cdr$/ },
  { role: R.costCenterDescription, re: /^descrizione cdr$/ },
  { role: R.softSkills, re: /soft skills/ },
  { role: R.hardSkills, re: /hard skills/ },
  { role: R.performanceScore, re: /valutazione media complessiva/ },
  { role: R.grade, re: /^grade$/ },
  { role: R.payBand, re: /^banda$/ },
  { role: R.jobFamily, re: /^famiglia professionale$/ },
  { role: R.educationLevel, re: /^livello di istruzione$/ },
]

/**
 * Mapping esatto del tracciato TEA. Null se il file non è quel tracciato.
 * Le voci "mensile" e la RAL "annua" non vengono scambiate.
 */
export function matchTeaHeaders(headers) {
  const norm = (headers || []).map(normalizeHeaderLabel)
  const used = new Set()
  const result = {}
  for (const rule of TEA_HEADER_RULES) {
    const idx = norm.findIndex((h, i) => !used.has(i) && rule.re.test(h))
    if (idx >= 0) {
      result[rule.role] = idx
      used.add(idx)
    }
  }
  const anchored =
    result[R.baseSalary] != null &&
    (result[R.ccnlMinimum] != null || result[R.superminimo] != null || result[R.forfaitOvertime] != null)
  if (!anchored || Object.keys(result).length < 8) return null
  if (result[R.costCenterDescription] != null && result[R.category] == null) {
    result[R.category] = result[R.costCenterDescription]
  }
  return result
}

export function isTeaTracciato(headers) {
  return matchTeaHeaders(headers) != null
}

/**
 * Rilevamento colonne con punteggio (IT payroll); più affidabile del solo includes().
 */
export function detectColumnRoles(headers, rows) {
  const tea = matchTeaHeaders(headers)
  if (tea) return tea

  const result = {}
  const used = new Set()
  const roleOrder = [
    R.gender,
    R.firstName,
    R.lastName,
    R.employeeId,
    R.employeeName,
    R.baseSalary,
    R.mboBase100,
    R.forfaitOvertime,
    R.senioritySteps,
    R.otherFixedItems,
    R.bonusMbo,
    R.resultBonus,
    R.overtime,
    R.variableAllowances,
    R.oneOffPayment,
    R.fringeBenefits,
    R.companyWelfare,
    R.structuralComponents,
    R.individualComponents,
    R.variableComponents,
    R.totalSalary,
    R.partTimePct,
    R.weeklyFullTimeHours,
    R.terminationDate,
    R.hireDate,
    R.ccnl,
    R.company,
    R.qualification,
    R.role,
    R.level,
    R.educationLevel,
    R.category,
    R.costCenterCode,
    R.costCenterDescription,
    R.jobCode,
    R.description,
    R.roleSeniority,
    R.seniority,
    R.softSkills,
    R.hardSkills,
    R.performanceScore,
    R.grade,
    R.payBand,
    R.jobFamily,
    R.ccnlMinimum,
    R.superminimoAssoluto,
    R.superminimo,
  ]

  for (const role of roleOrder) {
    const idx = bestColumnForRole(headers, role, used, rows)
    if (idx >= 0) {
      result[role] = idx
      used.add(idx)
    }
  }
  return result
}

/**
 * Unisce euristica + AI: per retribuzioni non sovrascrive match euristici validi;
 * scarta mapping AI su colonne palesemente errate (14ma, INPS, …).
 */
export function mergeColumnMappings(heuristic, ai, headers) {
  const merged = { ...(heuristic || {}) }

  for (const [role, rawIdx] of Object.entries(ai || {})) {
    const idx = Number(rawIdx)
    if (!Number.isFinite(idx) || idx < 0 || idx >= headers.length) continue
    const header = headers[idx]

    if (isDisqualifiedHeader(header, role)) continue

    const aiScore = scoreHeaderForRole(header, role, null, idx)
    if (aiScore < 0) continue

    if (SALARY_PRIORITY_ROLES.has(role) && heuristic?.[role] != null) {
      const heurIdx = heuristic[role]
      const heurHeader = headers[heurIdx]
      if (!isDisqualifiedHeader(heurHeader, role) && scoreHeaderForRole(heurHeader, role, null, heurIdx) >= 3) {
        continue
      }
    }

    if (SALARY_PRIORITY_ROLES.has(role)) {
      if (aiScore < 4) continue
      const existing = merged[role]
      if (existing != null && scoreHeaderForRole(headers[existing], role, null, existing) >= aiScore) continue
    }

    merged[role] = idx
  }

  return merged
}

export function buildMappingPrompt(headers, rows) {
  const sampleRows = (rows || []).slice(0, 8)
  const catalog = headers.map((h, i) => {
    const samples = sampleRows
      .map((r) => r?.[i])
      .filter((v) => v != null && String(v).trim() !== '')
      .slice(0, 4)
      .map((v) => String(v).slice(0, 40))
    return { index: i, header: String(h ?? '').trim(), samples }
  })

  return `Sei un esperto di fogli retributivi italiani (trasparenza salariale, CCNL, RAL).

Ti passo l'elenco colonne (indice 0-based) con esempi di valori. Mappa ogni "ruolo logico" alla colonna corretta.

REGOLE OBBLIGATORIE (Italia):
- baseSalary = retribuzione FISSA/BASE annua (RAL base, competenze fisse, stipendio base). MAI: 14ma, 13ma, mensilità aggiuntive, INPS, contributi, TFR, accantonamenti, "totale variabili" da sola.
- totalSalary = retribuzione TOTALE annua lorda (totale competenze, lordo annuo, RAL totale). MAI: INPS, contributi previdenziali, costo azienda, solo componenti variabili, 14ma/13ma.
- variableComponents = totale componenti variabili aggregato (es. "TOT COMP VARIAB"), solo se non è una voce specifica. MAI: base fissa, INPS, bonus/MBO, premio di risultato, straordinari, indennità variabili, una tantum, fringe, welfare, scatti.
- gender = sesso/genere (M/F).
- employeeName = nome dipendente / nominativo.
- category = categoria o inquadramento (centro di costo solo se è l'unica colonna organizzativa).
- role = titolo ruolo/posizione (es. "Ruolo").
- level = livello CCNL contrattuale.
- description = descrizione mansione/job desc.
- seniority = anzianità aziendale (anni o equivalente).
- roleSeniority = anzianità nel ruolo attuale.
- performanceScore = valutazione performance se presente.
- partTimePct = percentuale part-time (100 = full time).
- hireDate = data assunzione / ingresso. MAI data cessazione, dimissioni o fine rapporto.
- terminationDate = data cessazione / fine rapporto / dimissioni / uscita. MAI data assunzione.
- senioritySteps = importo scatti di anzianità. MAI gli anni di anzianità.
- otherFixedItems = altre voci fisse (competenze o indennità fisse diverse da base e superminimo).
- bonusMbo = bonus o MBO. MAI premio di risultato, straordinari, welfare, fringe.
- resultBonus = premio di risultato (PDR).
- overtime = straordinari.
- variableAllowances = indennità variabili.
- oneOffPayment = una tantum.
- fringeBenefits = fringe benefit. MAI welfare aziendale.
- companyWelfare = welfare aziendale.
- ccnl = nome CCNL / contratto collettivo / settore (es. Metalmeccanico Industria). NON livello di inquadramento né minimo tabellare.
- structuralComponents = somma componenti strutturali continuative/fisse (escluse da totali INPS).
- individualComponents = somma componenti individuali/discrezionali/una-tantum.
- ccnlMinimum = minimo tabellare CCNL se presente.
- superminimo = superminimo non assorbibile. Nel tracciato TEA è mensile e NON va sottratto dalla RAL.
- superminimoAssoluto = superminimo assorbibile / ass.le. Nel tracciato TEA è mensile.
- baseSalary nel tracciato TEA è la colonna "RAL annua", mai il minimo tabellare mensile e mai una somma di voci mensili.
- forfaitOvertime = forfait straordinari mensile. MAI la colonna Straordinari.
- mboBase100 = Bonus/MBO base 100 (obiettivo). bonusMbo = Bonus/MBO erogato.
- ccnlMinimum, senioritySteps, otherFixedItems nel tracciato TEA sono importi mensili.
- fringeBenefits e companyWelfare nel tracciato TEA sono importi annui.
- performanceScore = valutazione media complessiva (1-5). softSkills e hardSkills sono colonne distinte.
- educationLevel = livello di istruzione. MAI il livello CCNL.
- category = Descrizione CdR. costCenterCode = Cod CDR.

Usa gli ESEMPI numerici: importi in euro → colonne retributive; M/F → genere; 50/80/100 → part-time.

Colonne:
${JSON.stringify(catalog, null, 2)}

Restituisci SOLO JSON: chiavi ruolo → indice colonna (0-based). Includi solo mapping sicuri.
Esempio: {"gender":0,"employeeName":1,"baseSalary":5,"structuralComponents":6,"individualComponents":7,"totalSalary":8,"partTimePct":9,"role":3,"level":4}

JSON:`
}
