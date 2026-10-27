/**
 * Ciclo di salary review: organico, budget a cascata, vincoli e stati di approvazione.
 * La logica è pura così la scheda può ricalcolare il residuo a ogni modifica.
 */

export const LEVERS = [
  { id: 'merit', label: 'Aumento di merito' },
  { id: 'oneoff', label: 'Una tantum' },
  { id: 'promotion', label: 'Promozione / cambio livello' },
]

export const STATUS_LABEL = {
  draft: 'Bozza',
  pending_l2: 'In attesa del responsabile',
  pending_hrbp: 'In attesa HRBP',
  pending_hr: 'In attesa HR',
  approved: 'Approvato',
  rejected: 'Respinto',
}

export function defaultSettings(today = new Date()) {
  const iso = toIsoDate(today)
  const year = today.getFullYear()
  return {
    cycleName: `Salary review ${year}`,
    poolMode: 'percent',
    poolPercent: 3,
    poolAbsolute: 0,
    allocationMode: 'percent',
    unusedPolicy: 'return',
    budgetMode: 'unified',
    leverSplit: { merit: 70, oneoff: 15, promotion: 15 },
    personCapPct: 10,
    overBudget: 'alert',
    newHireMonths: 6,
    aboveBandPolicy: 'alert',
    aboveBandCompa: 110,
    secondApprover: 'manager',
    referenceDate: iso,
    effectiveDate: `${year}-07-01`,
  }
}

export function emptyPackage() {
  return { status: 'draft', comment: '', history: [] }
}

export function emptyProposal() {
  return { lever: 'merit', amount: 0, newLevel: '' }
}

export function formatEuro(n) {
  const v = Number(n)
  if (!Number.isFinite(v)) return '0 €'
  return v.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
}

export function formatPct(n, digits = 1) {
  const v = Number(n)
  if (!Number.isFinite(v)) return '0%'
  return `${v.toLocaleString('it-IT', { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`
}

export function leverLabel(id) {
  return LEVERS.find((l) => l.id === id)?.label || 'Aumento di merito'
}

function toIsoDate(value) {
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return null
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function monthsAgo(months, from = new Date()) {
  const d = new Date(from.getFullYear(), from.getMonth() - months, Math.min(from.getDate(), 28))
  return toIsoDate(d)
}

export function parseEuroInput(raw) {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : 0
  const s = String(raw ?? '')
    .trim()
    .replace(/\s/g, '')
    .replace(/€/g, '')
  if (!s) return 0
  let n
  if (s.includes(',') && s.includes('.')) n = Number(s.replace(/\./g, '').replace(',', '.'))
  else if (s.includes(',')) n = Number(s.replace(',', '.'))
  else n = Number(s)
  return Number.isFinite(n) ? n : 0
}

export function monthsBetween(fromIso, toIso) {
  if (!fromIso || !toIso) return null
  const a = new Date(`${fromIso}T00:00:00`)
  const b = new Date(`${toIso}T00:00:00`)
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null
  let months = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth())
  if (b.getDate() < a.getDate()) months -= 1
  return months
}

export function normalizeHireDate(value) {
  if (value == null || value === '' || value === 'N/D') return null
  if (value instanceof Date) return toIsoDate(value)
  if (typeof value === 'number' && value > 20000 && value < 80000) {
    const utc = new Date(Date.UTC(1899, 11, 30) + Math.round(value) * 86400000)
    return toIsoDate(utc)
  }
  const s = String(value).trim()
  const dmy = s.match(/^(\d{1,2})[/. -](\d{1,2})[/. -](\d{2,4})$/)
  if (dmy) {
    const year = dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3]
    return `${year}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`
  }
  return toIsoDate(s)
}

function salaryOf(person) {
  if (person?.paySchema === 'tea') {
    const fte = Number(person.baseSalaryFte)
    if (fte > 0) return fte
  }
  const raw = Number(person?.baseSalaryRaw)
  if (raw > 0) return raw
  const levelPay = Number(person?.livelloRetributivo)
  if (levelPay > 0) return levelPay
  const base = Number(person?.baseSalary)
  if (base > 0) return base
  const total = Number(person?.totalSalary)
  return total > 0 ? total : 0
}

export function peopleFromJobResults(jobResults) {
  const out = []
  const seen = new Set()
  for (const level of jobResults || []) {
    for (const person of level?.people || []) {
      if (!person || seen.has(person.index)) continue
      if (person.terminationDate) continue
      const ral = salaryOf(person)
      if (ral <= 0) continue
      seen.add(person.index)
      out.push({
        id: `emp-${person.index}`,
        employeeId: person.employeeId != null && String(person.employeeId).trim() !== '' ? String(person.employeeId).trim() : '',
        name: person.name ? String(person.name).trim() : `Dipendente ${person.index}`,
        role: person.role ? String(person.role).trim() : 'Ruolo non indicato',
        level: person.level ? String(person.level).trim() : 'N/D',
        ral,
        performance: person.performanceScore == null ? null : Number(person.performanceScore),
        hireDate: normalizeHireDate(person.hireDate),
        lastIncreasePct: null,
        lastIncreaseDate: null,
        category: person.category ? String(person.category).trim() : 'Non assegnato',
      })
    }
  }
  return out
}

function withBands(people) {
  const groups = new Map()
  for (const person of people) {
    const key = person.level || 'N/D'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(person.ral)
  }
  const stats = new Map()
  for (const [key, rals] of groups) {
    const sorted = rals.filter((n) => n > 0).sort((a, b) => a - b)
    if (sorted.length < 2) continue
    const min = sorted[0]
    const max = sorted[sorted.length - 1]
    stats.set(key, { min, max, mid: (min + max) / 2, estimated: sorted.length < 4 })
  }
  return people.map((person) => {
    const explicit = person.bandMid > 0
    const stat = stats.get(person.level || 'N/D')
    const bandMin = explicit ? person.bandMin : stat?.min ?? null
    const bandMid = explicit ? person.bandMid : stat?.mid ?? null
    const bandMax = explicit ? person.bandMax : stat?.max ?? null
    if (!bandMid) {
      return { ...person, bandMin: null, bandMid: null, bandMax: null, compa: null, position: null, bandSource: 'none' }
    }
    const span = (bandMax || 0) - (bandMin || 0)
    const position = span > 0 ? (person.ral - bandMin) / span : 0.5
    return {
      ...person,
      bandMin,
      bandMid,
      bandMax,
      compa: (person.ral / bandMid) * 100,
      position,
      bandSource: explicit ? 'policy' : 'peers',
    }
  })
}

function demoPeople(today = new Date()) {
  const recent = monthsAgo(4, today)
  return [
    { id: 'luca', name: 'Luca Ferri', role: 'Sales Manager', level: 'Q', ral: 72000, managerId: 'elena', performance: 86, hireDate: '2014-02-01', lastIncreasePct: 2.5, lastIncreaseDate: '2025-07-01', bandMin: 65000, bandMid: 74000, bandMax: 84000, category: 'Sales' },
    { id: 'giulia', name: 'Giulia Conti', role: 'Head of Product', level: 'Q', ral: 68000, managerId: 'elena', performance: 91, hireDate: '2016-05-01', lastIncreasePct: 3, lastIncreaseDate: '2025-07-01', bandMin: 65000, bandMid: 74000, bandMax: 84000, category: 'Product' },
    { id: 'marco', name: 'Marco De Santis', role: 'Operations Manager', level: 'Q', ral: 64000, managerId: 'elena', performance: 78, hireDate: '2015-09-01', lastIncreasePct: 2, lastIncreaseDate: '2025-07-01', bandMin: 65000, bandMid: 74000, bandMax: 84000, category: 'Operations' },
    { id: 'andrea', name: 'Andrea Villa', role: 'Key Account', level: 'B3', ral: 42000, managerId: 'luca', performance: 88, hireDate: '2019-03-01', lastIncreasePct: 3, lastIncreaseDate: '2025-07-01', bandMin: 36000, bandMid: 43000, bandMax: 50000, category: 'Sales' },
    { id: 'chiara', name: 'Chiara Neri', role: 'Account', level: 'C2', ral: 32000, managerId: 'luca', performance: 74, hireDate: '2022-01-15', lastIncreasePct: 2, lastIncreaseDate: '2025-07-01', bandMin: 28000, bandMid: 34000, bandMax: 40000, category: 'Sales' },
    { id: 'davide', name: 'Davide Riva', role: 'Junior Account', level: 'D2', ral: 28000, managerId: 'luca', performance: 91, hireDate: recent, lastIncreasePct: null, lastIncreaseDate: null, bandMin: 26000, bandMid: 30000, bandMax: 34000, category: 'Sales' },
    { id: 'marta', name: 'Marta Greco', role: 'Senior Key Account', level: 'B1', ral: 56000, managerId: 'luca', performance: 96, hireDate: '2016-09-01', lastIncreasePct: 1.5, lastIncreaseDate: '2024-07-01', bandMin: 40000, bandMid: 47000, bandMax: 52000, category: 'Sales' },
    { id: 'paolo', name: 'Paolo Serra', role: 'Product Manager', level: 'B2', ral: 48000, managerId: 'giulia', performance: 82, hireDate: '2018-04-01', lastIncreasePct: 4, lastIncreaseDate: '2025-07-01', bandMin: 42000, bandMid: 50000, bandMax: 58000, category: 'Product' },
    { id: 'irene', name: 'Irene Fontana', role: 'Product Designer', level: 'C2', ral: 38000, managerId: 'giulia', performance: 90, hireDate: '2021-11-01', lastIncreasePct: 2.5, lastIncreaseDate: '2025-07-01', bandMin: 28000, bandMid: 34000, bandMax: 40000, category: 'Product' },
    { id: 'lbianchi', name: 'Luca Bianchi', role: 'Business Analyst', level: 'C3', ral: 34000, managerId: 'giulia', performance: null, hireDate: '2020-02-01', lastIncreasePct: null, lastIncreaseDate: null, bandMin: 30000, bandMid: 36000, bandMax: 42000, category: 'Product' },
    { id: 'sofia', name: 'Sofia Greco', role: 'Senior Product Manager', level: 'B1', ral: 61000, managerId: 'giulia', performance: 70, hireDate: '2014-05-01', lastIncreasePct: 0, lastIncreaseDate: '2023-07-01', bandMin: 40000, bandMid: 47000, bandMax: 52000, category: 'Product' },
    { id: 'fabio', name: 'Fabio Conti', role: 'Coordinator', level: 'B3', ral: 45000, managerId: 'marco', performance: 77, hireDate: '2017-08-01', lastIncreasePct: 3, lastIncreaseDate: '2025-07-01', bandMin: 36000, bandMid: 43000, bandMax: 50000, category: 'Operations' },
    { id: 'erusso', name: 'Elena Russo', role: 'Specialist', level: 'C1', ral: 31000, managerId: 'marco', performance: 85, hireDate: '2023-01-10', lastIncreasePct: 2, lastIncreaseDate: '2025-07-01', bandMin: 27000, bandMid: 32000, bandMax: 38000, category: 'Operations' },
    { id: 'giovanni', name: 'Giovanni Sala', role: 'Specialist', level: 'C2', ral: 36000, managerId: 'marco', performance: 64, hireDate: '2019-12-01', lastIncreasePct: 1, lastIncreaseDate: '2025-07-01', bandMin: 28000, bandMid: 34000, bandMax: 40000, category: 'Operations' },
    { id: 'nora', name: 'Nora Vitale', role: 'Operations Lead', level: 'B2', ral: 52000, managerId: 'marco', performance: 93, hireDate: '2015-03-15', lastIncreasePct: 3.5, lastIncreaseDate: '2025-07-01', bandMin: 42000, bandMid: 50000, bandMax: 58000, category: 'Operations' },
  ]
}

const DEMO_DIRECTORY = {
  elena: { id: 'elena', name: 'Elena Marini', role: 'Direttrice People & Reward', parentId: null, parentName: null, hrbpName: 'Sara Bellini', team: 'People & Reward' },
  luca: { id: 'luca', name: 'Luca Ferri', role: 'Sales Manager', parentId: 'elena', parentName: 'Elena Marini', hrbpName: 'Sara Bellini', team: 'Sales' },
  giulia: { id: 'giulia', name: 'Giulia Conti', role: 'Head of Product', parentId: 'elena', parentName: 'Elena Marini', hrbpName: 'Sara Bellini', team: 'Product' },
  marco: { id: 'marco', name: 'Marco De Santis', role: 'Operations Manager', parentId: 'elena', parentName: 'Elena Marini', hrbpName: 'Sara Bellini', team: 'Operations' },
}

function teamBuckets(people) {
  const groups = new Map()
  for (const person of people) {
    const key = (person.category || 'Non assegnato').trim() || 'Non assegnato'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(person)
  }
  const chunks = []
  for (const [label, members] of groups) {
    if (members.length > 8) {
      for (let i = 0; i < members.length; i += 6) {
        const slice = members.slice(i, i + 6)
        const suffix = Math.floor(i / 6) + 1
        chunks.push({
          label: `${label} ${suffix}`,
          members: slice,
          small: slice.length < 2,
        })
      }
    } else {
      chunks.push({ label, members, small: members.length < 2 })
    }
  }
  const large = chunks.filter((c) => !c.small)
  const small = chunks.filter((c) => c.small)
  const merged = []
  let acc = []
  let labels = []
  const flush = () => {
    if (!acc.length) return
    merged.push({ label: labels.join(' · '), members: acc.slice() })
    acc = []
    labels = []
  }
  for (const chunk of small) {
    acc.push(...chunk.members)
    labels.push(chunk.label)
    if (acc.length >= 5) flush()
  }
  flush()
  return [...large.map((c) => ({ label: c.label, members: c.members })), ...merged].sort((a, b) =>
    a.label.localeCompare(b.label, 'it'),
  )
}

function signatureOf(people, usingDemo) {
  if (usingDemo) return 'demo'
  let hash = 0
  const raw = people.map((p) => p.id).join('|')
  for (let i = 0; i < raw.length; i += 1) hash = (Math.imul(31, hash) + raw.charCodeAt(i)) | 0
  return `org-${people.length}-${hash >>> 0}`
}

function actorsFor(cards) {
  const actors = [{ id: 'hr', name: 'HR', kind: 'hr', hint: 'Pool, calibrazione e approvazione finale' }]
  for (const card of cards) {
    actors.push({ id: card.id, name: card.name, kind: 'manager', hint: card.role })
  }
  const covered = new Set(cards.map((c) => c.id))
  const parents = new Map()
  for (const card of cards) {
    if (card.parentId && !covered.has(card.parentId)) parents.set(card.parentId, card.parentName || 'Responsabile')
  }
  for (const [id, name] of parents) {
    actors.push({ id, name, kind: 'approver', hint: 'Approvazione di secondo livello' })
  }
  actors.push({
    id: 'hrbp',
    name: cards[0]?.hrbpName || 'HRBP',
    kind: 'hrbp',
    hint: 'Approvazione HRBP',
  })
  return actors
}

export function buildOrg(sourcePeople, today = new Date()) {
  const usingDemo = !sourcePeople?.length
  const base = usingDemo ? demoPeople(today) : sourcePeople
  const people = withBands(base)
  let cards
  if (usingDemo) {
    cards = Object.values(DEMO_DIRECTORY)
      .map((entry) => ({
        ...entry,
        hrbpId: 'hrbp',
        reports: people.filter((p) => p.managerId === entry.id),
      }))
      .filter((card) => card.reports.length > 0)
  } else {
    const teams = teamBuckets(people)
    cards = teams.map((team, index) => ({
      id: `mgr-${index + 1}`,
      name: `Responsabile ${team.label}`,
      role: 'Manager',
      team: team.label,
      parentId: 'direzione',
      parentName: 'Direzione',
      hrbpId: 'hrbp',
      hrbpName: 'HRBP',
      reports: team.members,
    }))
  }
  return {
    usingDemo,
    signature: signatureOf(people, usingDemo),
    people,
    cards,
    actors: actorsFor(cards),
    sourceNote: usingDemo
      ? 'Organico di esempio, così il ciclo è utilizzabile prima del caricamento di un’analisi.'
      : 'Perimetri ricavati dai centri di costo dell’analisi. I nominativi dei manager si possono correggere: il file non contiene la gerarchia.',
  }
}

export function payrollOf(list) {
  return (list || []).reduce((sum, person) => sum + (Number(person.ral) || 0), 0)
}

export function cyclePool(settings, people) {
  const payroll = payrollOf(people)
  const amount =
    settings.poolMode === 'absolute'
      ? Math.max(0, Number(settings.poolAbsolute) || 0)
      : (payroll * (Number(settings.poolPercent) || 0)) / 100
  return { payroll, amount }
}

export function cascadePercent(settings, payroll, pool) {
  if (settings.poolMode === 'percent' && settings.allocationMode === 'percent') {
    return Number(settings.poolPercent) || 0
  }
  if (payroll <= 0) return 0
  return (pool / payroll) * 100
}

export function cascadedBudget(reportsPayroll, settings, payroll, pool) {
  if (settings.allocationMode === 'absolute') {
    if (payroll <= 0) return 0
    return pool * (reportsPayroll / payroll)
  }
  return (reportsPayroll * cascadePercent(settings, payroll, pool)) / 100
}

export function effectiveBudget(reportsPayroll, settings, override, payroll, pool) {
  if (override?.manual) {
    if (override.mode === 'absolute') return Math.max(0, Number(override.amount) || 0)
    return (reportsPayroll * (Number(override.percent) || 0)) / 100
  }
  return cascadedBudget(reportsPayroll, settings, payroll, pool)
}

export function splitLevers(budget, settings) {
  if (settings.budgetMode !== 'perLever') {
    return { merit: budget, oneoff: budget, promotion: budget, unified: budget }
  }
  const merit = Number(settings.leverSplit?.merit) || 0
  const oneoff = Number(settings.leverSplit?.oneoff) || 0
  const promotion = Number(settings.leverSplit?.promotion) || 0
  const sum = merit + oneoff + promotion
  if (sum <= 0) return { merit: 0, oneoff: 0, promotion: 0, unified: budget }
  return {
    merit: (budget * merit) / sum,
    oneoff: (budget * oneoff) / sum,
    promotion: (budget * promotion) / sum,
    unified: budget,
  }
}

export function personEligibility(person, settings) {
  const flags = []
  const months = monthsBetween(person.hireDate, settings.referenceDate)
  const minMonths = Number(settings.newHireMonths) || 0
  if (months != null && months < minMonths) {
    flags.push({
      code: 'new_hire',
      blocking: true,
      label: `Neoassunto (${months} mesi, soglia ${minMonths})`,
    })
  }
  const threshold = Number(settings.aboveBandCompa) || 110
  if (person.compa != null && person.compa > threshold) {
    const blocking = settings.aboveBandPolicy === 'block'
    flags.push({
      code: 'above_band',
      blocking,
      label: `Compa-ratio ${Math.round(person.compa)}% sopra la soglia ${threshold}%`,
    })
  }
  return { blocking: flags.some((f) => f.blocking), flags }
}

export function proposalOf(proposals, personId) {
  const raw = proposals?.[personId] || {}
  const lever = LEVERS.some((l) => l.id === raw.lever) ? raw.lever : 'merit'
  return {
    lever,
    amount: Math.max(0, Math.round(Number(raw.amount) || 0)),
    newLevel: raw.newLevel ? String(raw.newLevel) : '',
  }
}

export function countedAmount(person, proposal, settings) {
  if (personEligibility(person, settings).blocking) return 0
  return proposal.amount
}

export function spentByLever(reports, proposals, settings) {
  const totals = { merit: 0, oneoff: 0, promotion: 0, all: 0 }
  for (const person of reports || []) {
    const proposal = proposalOf(proposals, person.id)
    const amount = countedAmount(person, proposal, settings)
    totals[proposal.lever] += amount
    totals.all += amount
  }
  return totals
}

export function evaluateCard({ card, proposals, settings, budget }) {
  const levers = splitLevers(budget, settings)
  const spent = spentByLever(card.reports, proposals, settings)
  const perLever = settings.budgetMode === 'perLever'
  const rows = card.reports.map((person) => {
    const proposal = proposalOf(proposals, person.id)
    const elig = personEligibility(person, settings)
    const cap = (person.ral * (Number(settings.personCapPct) || 0)) / 100
    return { person, proposal, elig, cap }
  })
  const overByLever = {
    merit: spent.merit > levers.merit + 0.5,
    oneoff: spent.oneoff > levers.oneoff + 0.5,
    promotion: spent.promotion > levers.promotion + 0.5,
    all: spent.all > budget + 0.5,
  }
  const overBudget = perLever
    ? overByLever.merit || overByLever.oneoff || overByLever.promotion
    : overByLever.all
  const residual = perLever
    ? {
        all: budget - spent.all,
        merit: levers.merit - spent.merit,
        oneoff: levers.oneoff - spent.oneoff,
        promotion: levers.promotion - spent.promotion,
      }
    : { all: budget - spent.all, merit: budget - spent.all, oneoff: budget - spent.all, promotion: budget - spent.all }
  return { budget, levers, spent, residual, overBudget, overByLever, rows, perLever }
}

export function nextAmount({ card, proposals, settings, budget, personId, rawAmount }) {
  const person = card.reports.find((p) => p.id === personId)
  if (!person) return { amount: 0, flags: { capped: false, blockedByBudget: false } }
  if (personEligibility(person, settings).blocking) {
    return { amount: 0, flags: { capped: false, blockedByBudget: false } }
  }
  const prev = proposalOf(proposals, personId)
  const current = evaluateCard({ card, proposals, settings, budget })
  const leverBudget = settings.budgetMode === 'perLever' ? current.levers[prev.lever] : current.budget
  const spentLever = settings.budgetMode === 'perLever' ? current.spent[prev.lever] : current.spent.all
  const spentWithout = spentLever - countedAmount(person, prev, settings)
  let amount = Math.max(0, Math.round(parseEuroInput(rawAmount)))
  const flags = { capped: false, blockedByBudget: false }
  const cap = (person.ral * (Number(settings.personCapPct) || 0)) / 100
  if (amount > cap + 0.001) {
    amount = Math.max(0, Math.round(cap))
    flags.capped = true
  }
  const room = leverBudget - spentWithout
  if (amount > room + 0.5) {
    if (settings.overBudget === 'block') {
      amount = Math.max(0, Math.round(room))
      flags.blockedByBudget = true
    }
  }
  return { amount, flags }
}

export function newRal(person, proposal) {
  if (!proposal || proposal.lever === 'oneoff') return person.ral
  return person.ral + (proposal.amount || 0)
}

export function submitBlockers(evaluation, settings) {
  const reasons = []
  if (evaluation.spent.all <= 0) reasons.push('Inserisci almeno una proposta con importo.')
  const missingLevel = evaluation.rows.some(
    (row) =>
      row.proposal.lever === 'promotion' &&
      countedAmount(row.person, row.proposal, settings) > 0 &&
      !row.proposal.newLevel.trim(),
  )
  if (missingLevel) reasons.push('Per ogni promozione indica il nuovo livello.')
  if (evaluation.overBudget && settings.overBudget === 'block') {
    reasons.push('Il budget del manager è superato.')
  }
  return reasons
}

export function submitStatus(settings, card) {
  if (settings.secondApprover === 'hrbp') return 'pending_hrbp'
  if (settings.secondApprover === 'manager' && card.parentId) return 'pending_l2'
  return 'pending_hr'
}

export function approveStatus(status) {
  if (status === 'pending_l2' || status === 'pending_hrbp') return 'pending_hr'
  if (status === 'pending_hr') return 'approved'
  return status
}

export function canEdit(actorId, card, status) {
  if (status === 'approved' || status === 'pending_l2' || status === 'pending_hrbp') return false
  if (status === 'pending_hr') return actorId === 'hr'
  if (status === 'draft' || status === 'rejected') return actorId === card.id || actorId === 'hr'
  return false
}

export function canSubmit(actorId, card, status) {
  if (status !== 'draft' && status !== 'rejected') return false
  return actorId === card.id || actorId === 'hr'
}

export function canApprove(actorId, card, status) {
  if (status === 'pending_hr' && actorId === 'hr') return true
  if (status === 'pending_hrbp' && actorId === 'hrbp') return true
  if (status === 'pending_l2' && actorId === card.parentId) return true
  return false
}

export function canReject(actorId, card, status) {
  if (status !== 'pending_l2' && status !== 'pending_hrbp' && status !== 'pending_hr') return false
  if (actorId === 'hr') return true
  return canApprove(actorId, card, status)
}

export function consumedBudget(budget, spent, status, unusedPolicy) {
  const open = status === 'draft' || status === 'rejected' || status === 'pending_l2' || status === 'pending_hrbp' || status === 'pending_hr'
  if (open || status !== 'approved') return budget
  return unusedPolicy === 'return' ? spent : budget
}

export function letterRows({ cards, proposals, packages, settings, names }) {
  const rows = []
  for (const card of cards) {
    const pkg = packages?.[card.id]
    if (pkg?.status !== 'approved') continue
    const managerName = names?.[card.id]?.trim() || card.name
    for (const person of card.reports) {
      const proposal = proposalOf(proposals, person.id)
      const amount = countedAmount(person, proposal, settings)
      if (amount <= 0) continue
      rows.push({
        id: person.id,
        employeeId: person.employeeId || '',
        name: person.name,
        role: person.role,
        level: person.level,
        newLevel: proposal.lever === 'promotion' ? proposal.newLevel : person.level,
        lever: proposal.lever,
        leverLabel: leverLabel(proposal.lever),
        ral: person.ral,
        amount,
        newRal: newRal(person, { ...proposal, amount }),
        oneOff: proposal.lever === 'oneoff' ? amount : 0,
        merit: proposal.lever === 'merit' ? amount : 0,
        promotion: proposal.lever === 'promotion' ? amount : 0,
        managerName,
        status: 'Approvato',
      })
    }
  }
  return rows
}

export function payrollCsv(rows, effectiveDate) {
  const headers = [
    'Matricola',
    'Nome',
    'Ruolo',
    'Livello attuale',
    'Nuovo livello',
    'Leva',
    'RAL attuale',
    'Aumento merito',
    'Promozione',
    'Una tantum',
    'Nuova RAL',
    'Data efficacia',
    'Stato',
    'Manager',
  ]
  const lines = [headers.join(';')]
  for (const row of rows) {
    lines.push(
      [
        row.employeeId || '',
        row.name,
        row.role,
        row.level,
        row.newLevel,
        row.leverLabel,
        euroCell(row.ral),
        euroCell(row.merit),
        euroCell(row.promotion),
        euroCell(row.oneOff),
        euroCell(row.newRal),
        effectiveDate || '',
        row.status,
        row.managerName,
      ]
        .map(csvCell)
        .join(';'),
    )
  }
  return `\uFEFF${lines.join('\r\n')}`
}

function euroCell(n) {
  return (Number(n) || 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function csvCell(value) {
  const s = String(value ?? '')
  if (/[;"\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function storageKey(signature) {
  return `salary-review-v1:${signature}`
}
