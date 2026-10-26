import { matchTeaHeaders } from '../api/lib/column-mapping.js'
import { enrichEmployeeSalaries } from '../src/lib/salaryMetrics.js'
import { withTeaContext } from '../src/lib/teaTracciato.js'

const headers = [
  'ID dipendente',
  'Nome',
  'Cognome',
  'Sesso',
  'Data assunzione',
  'Data cessazione',
  'CCNL',
  'Società',
  'Qualifica',
  'Livello CCNL',
  'Ruolo / job title',
  'Orario settimanale full-time (ore)',
  ' % part-time',
  'Minimo tabellare mensile (€)',
  'Superminimo non assorbibile mensile (€)',
  'Superminimo assorbibile mensile (€)',
  'Scatti di anzianità mensile(€)',
  'Forfait straordinari voce mensile  (€)',
  'Altre voci fisse mensili (€)',
  'RAL annua (€)',
  'Bonus / MBO  base 100 (€)',
  'Bonus / MBO erogato (€)',
  'Premio di risultato base 100 (€)',
  'Straordinari (€)',
  'Indennità variabili (€)',
  'Una tantum (€)',
  'Fringe benefit valore annuo (€)',
  'Welfare aziendale annuo (€)',
  'Codice Mansione',
  'Cod CDR',
  'Descrizione CdR',
  'Valutazione media Soft Skills',
  'Valutazione media Hard Skills',
  'Valutazione media Complessiva',
  'Grade',
  'Banda',
  'Famiglia professionale',
  'Livello di istruzione',
]

const expected = {
  employeeId: 0,
  firstName: 1,
  lastName: 2,
  gender: 3,
  hireDate: 4,
  terminationDate: 5,
  ccnl: 6,
  company: 7,
  qualification: 8,
  level: 9,
  role: 10,
  weeklyFullTimeHours: 11,
  partTimePct: 12,
  ccnlMinimum: 13,
  superminimo: 14,
  superminimoAssoluto: 15,
  senioritySteps: 16,
  forfaitOvertime: 17,
  otherFixedItems: 18,
  baseSalary: 19,
  mboBase100: 20,
  bonusMbo: 21,
  resultBonus: 22,
  overtime: 23,
  variableAllowances: 24,
  oneOffPayment: 25,
  fringeBenefits: 26,
  companyWelfare: 27,
  jobCode: 28,
  costCenterCode: 29,
  costCenterDescription: 30,
  category: 30,
  softSkills: 31,
  hardSkills: 32,
  performanceScore: 33,
  grade: 34,
  payBand: 35,
  jobFamily: 36,
  educationLevel: 37,
}

const mapping = matchTeaHeaders(headers)
if (!mapping) throw new Error('tracciato TEA non riconosciuto')
for (const [role, index] of Object.entries(expected)) {
  if (mapping[role] !== index) {
    throw new Error(`${role}: atteso colonna ${index} (${headers[index]}), trovato ${mapping[role]}`)
  }
}

function tea(overrides) {
  return enrichEmployeeSalaries(withTeaContext({
    baseSalary: 30000,
    superminimo: 150,
    superminimoAssoluto: 80,
    ccnlMinimum: 2000,
    senioritySteps: 40,
    forfaitOvertime: 100,
    otherFixedItems: 60,
    mboBase100: 4000,
    bonusMbo: 2000,
    resultBonus: 1500,
    overtime: 500,
    variableAllowances: 300,
    oneOffPayment: 200,
    fringeBenefits: 1200,
    companyWelfare: 400,
    partTimePct: 50,
    weeklyFullTimeHours: 40,
    hireDate: '2026-06-01',
    performanceOnFive: 4,
    firstName: 'Ada',
    lastName: 'Rossi',
    ...overrides,
  }, headers))
}

const partTime = tea()
const samePayOtherDate = tea({ hireDate: '2018-01-01', terminationDate: '2026-03-01' })
const fullTime = tea({ partTimePct: 100 })
const shortWeek = tea({ weeklyFullTimeHours: 20 })

function near(actual, expectedValue, label) {
  if (Math.abs(actual - expectedValue) > 0.02) {
    throw new Error(`${label}: atteso ${expectedValue}, ottenuto ${actual}`)
  }
}

near(partTime.baseSalary, 30000, 'RAL nominale')
near(partTime.baseSalaryFte, 60000, 'RAL FTE')
near(partTime.variableComponents, 3000, 'variabili erogati')
near(partTime.variableComponentsFte, 6000, 'variabili FTE')
near(partTime.totalSalary, 34600, 'totale nominale')
near(partTime.totalSalaryFte, 67600, 'totale FTE')
near(partTime.mboBase100Fte, 8000, 'MBO base 100 FTE')
near(partTime.bonusMboFte, 4000, 'MBO erogato FTE')
near(partTime.baseSalaryHourly, 60000 / 1720, 'oraria')
near(partTime.forfaitOvertime, 100, 'forfait mensile')
near(shortWeek.baseSalaryHourly, 60000 / 860, 'oraria su 20 ore')
near(fullTime.baseSalaryFte, 30000, 'full time invariato')
near(samePayOtherDate.baseSalaryFte, partTime.baseSalaryFte, 'date non cambiano la RAL')
near(samePayOtherDate.bonusMboFte, partTime.bonusMboFte, 'date non cambiano il MBO')

if (partTime.totalSalary !== partTime.baseSalary + 3000 + 1200 + 400) {
  throw new Error('il totale include obiettivi o voci mensili')
}
if (partTime.name !== 'Ada Rossi') throw new Error('nome non composto')
if (partTime.performanceScore !== 80) throw new Error('performance 4/5 non convertita in 80')
if (partTime.monthlyAddedToRal !== false || partTime.ralDateProrated !== false) {
  throw new Error('flag di normalizzazione errati')
}

const legacy = enrichEmployeeSalaries({
  baseSalary: 50000,
  superminimo: 5000,
  superminimoAssoluto: 1000,
  partTimePct: 100,
})
near(legacy.baseSalary, 44000, 'logica precedente: superminimo sottratto dalla base')

console.log('ok')
