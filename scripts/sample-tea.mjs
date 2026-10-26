import { createRequire } from 'module'
import { writeFileSync } from 'fs'
import { detectColumnRoles, buildNormalizedData } from '../src/lib/excel.js'

const require = createRequire(import.meta.url)
const XLSX = require('xlsx')

const headers = [
  'ID dipendente', 'Nome', 'Cognome', 'Sesso', 'Data assunzione', 'Data cessazione', 'CCNL', 'Società',
  'Qualifica', 'Livello CCNL', 'Ruolo / job title', 'Orario settimanale full-time (ore)', '% part-time',
  'Minimo tabellare mensile (€)', 'Superminimo non assorbibile mensile (€)', 'Superminimo assorbibile mensile (€)',
  'Scatti di anzianità mensile(€)', 'Forfait straordinari voce mensile  (€)', 'Altre voci fisse mensili (€)',
  'RAL annua (€)', 'Bonus / MBO  base 100 (€)', 'Bonus / MBO erogato (€)', 'Premio di risultato base 100 (€)',
  'Straordinari (€)', 'Indennità variabili (€)', 'Una tantum (€)', 'Fringe benefit valore annuo (€)',
  'Welfare aziendale annuo (€)', 'Codice Mansione', 'Cod CDR', 'Descrizione CdR',
  'Valutazione media Soft Skills', 'Valutazione media Hard Skills', 'Valutazione media Complessiva',
  'Grade', 'Banda', 'Famiglia professionale', 'Livello di istruzione',
]

const people = [
  ['100', 'Maria', 'Bianchi', 'F', '2026-06-01', '', 'Metalmeccanico', 'TEA', 'Impiegato', 'C2', 'Analyst', 40, 50, 1800, 150, 80, 40, 100, 60, 30000, 4000, 2000, 1500, 500, 300, 200, 1200, 400, 'AN01', '101', 'Finanza', 4, 4.5, 4, 'G5', 'B2', 'Finance', 'Istruzione terziaria'],
  ['101', 'Luca', 'Verdi', 'M', '2018-01-15', '', 'Metalmeccanico', 'TEA', 'Impiegato', 'C2', 'Analyst', 40, 100, 1800, 150, 80, 40, 100, 60, 30000, 4000, 2000, 1500, 500, 300, 200, 1200, 400, 'AN01', '101', 'Finanza', 3, 3, 3, 'G5', 'B2', 'Finance', 'Istruzione secondaria'],
  ['102', 'Anna', 'Neri', 'F', '2015-03-01', '', 'Metalmeccanico', 'TEA', 'Quadro', 'Q', 'Controller', 40, 100, 2200, 200, 0, 50, 0, 80, 42000, 5000, 2500, 1800, 0, 0, 0, 0, 600, 'CT02', '102', 'Controllo', 5, 4, 4.5, 'G7', 'B1', 'Finance', 'Istruzione terziaria'],
  ['103', 'Paolo', 'Blu', 'M', '2012-09-01', '2024-12-31', 'Metalmeccanico', 'TEA', 'Quadro', 'Q', 'Controller', 38, 100, 2200, 200, 0, 50, 0, 80, 42000, 5000, 1000, 1800, 800, 0, 0, 2400, 600, 'CT02', '102', 'Controllo', 2, 3, 2.5, 'G7', 'B1', 'Finance', 'Istruzione terziaria'],
]

const ws = XLSX.utils.aoa_to_sheet([headers, ...people])
const wb = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(wb, ws, 'Organico')
writeFileSync(new URL('../sample-tea.xlsx', import.meta.url), XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }))

const mapping = detectColumnRoles(headers, people)
const rows = buildNormalizedData(people, headers, mapping)
for (const r of rows) {
  console.log(r.name, r.gender, 'pt', r.partTimePct, 'RAL', r.baseSalary, 'FTE', r.baseSalaryFte, 'ora', r.baseSalaryHourly.toFixed(2), 'var', r.variableComponents, 'tot', r.totalSalary, 'forfait', r.forfaitOvertime, 'cess', r.terminationDate || '-')
}

const maria = rows.find((r) => r.firstName === 'Maria')
const luca = rows.find((r) => r.firstName === 'Luca')
if (maria.baseSalary !== 30000 || maria.baseSalaryFte !== 60000) throw new Error('Maria: RAL/FTE')
if (luca.baseSalaryFte !== 30000) throw new Error('Luca FTE')
if (maria.baseSalary !== luca.baseSalary) throw new Error('la data di assunzione non deve cambiare la RAL nominale')
if (maria.totalSalary !== 30000 + 2000 + 500 + 300 + 200 + 1200 + 400) throw new Error('totale Maria')
const paolo = rows.find((r) => r.firstName === 'Paolo')
if (Math.abs(paolo.baseSalaryHourly - (42000 / (38 / 40 * 1720))) > 0.02) throw new Error('oraria Paolo')
console.log('sample ok')
