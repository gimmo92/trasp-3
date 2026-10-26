<script setup>
import { computed, ref, watch } from 'vue'
import {
  LEVERS,
  STATUS_LABEL,
  approveStatus,
  buildOrg,
  canApprove,
  canEdit,
  canReject,
  canSubmit,
  cascadePercent,
  consumedBudget,
  cyclePool,
  defaultSettings,
  effectiveBudget,
  emptyPackage,
  evaluateCard,
  formatEuro,
  formatPct,
  letterRows,
  nextAmount,
  newRal,
  payrollCsv,
  payrollOf,
  proposalOf,
  storageKey,
  submitBlockers,
  submitStatus,
} from '../lib/salaryReview.js'

const props = defineProps({
  sourcePeople: { type: Array, default: () => [] },
  companyName: { type: String, default: '' },
})

const org = computed(() => buildOrg(props.sourcePeople))
const ready = ref(false)
const settings = ref(defaultSettings())
const overrides = ref({})
const names = ref({})
const proposals = ref({})
const packages = ref({})
const actorId = ref('hr')
const tab = ref('budget')
const openCards = ref({})
const rowHints = ref({})
const notices = ref({})
const rejectNotes = ref({})
const actionError = ref('')

const actor = computed(
  () => org.value.actors.find((item) => item.id === actorId.value) || org.value.actors[0],
)
const poolInfo = computed(() => cyclePool(settings.value, org.value.people))
const defaultPct = computed(() =>
  cascadePercent(settings.value, poolInfo.value.payroll, poolInfo.value.amount),
)

const allocationRows = computed(() =>
  org.value.cards.map((card) => {
    const reportsPayroll = payrollOf(card.reports)
    const budget = effectiveBudget(
      reportsPayroll,
      settings.value,
      overrides.value[card.id],
      poolInfo.value.payroll,
      poolInfo.value.amount,
    )
    const cascaded = effectiveBudget(reportsPayroll, settings.value, null, poolInfo.value.payroll, poolInfo.value.amount)
    const pct = reportsPayroll > 0 ? (budget / reportsPayroll) * 100 : 0
    return {
      card,
      reportsPayroll,
      budget,
      cascaded,
      pct,
      manual: !!overrides.value[card.id]?.manual,
    }
  }),
)

const evaluations = computed(() => {
  const map = {}
  for (const row of allocationRows.value) {
    map[row.card.id] = evaluateCard({
      card: row.card,
      proposals: proposals.value,
      settings: settings.value,
      budget: row.budget,
    })
  }
  return map
})

const central = computed(() => {
  let reserved = 0
  let returned = 0
  let forfeited = 0
  let spentAll = 0
  for (const row of allocationRows.value) {
    const spent = evaluations.value[row.card.id]?.spent.all || 0
    const status = packages.value[row.card.id]?.status || 'draft'
    spentAll += spent
    reserved += consumedBudget(row.budget, spent, status, settings.value.unusedPolicy)
    if (status === 'approved') {
      const gap = Math.max(0, row.budget - spent)
      if (settings.value.unusedPolicy === 'return') returned += gap
      else forfeited += gap
    }
  }
  const allocated = allocationRows.value.reduce((sum, row) => sum + row.budget, 0)
  return {
    pool: poolInfo.value.amount,
    allocated,
    reserved,
    residual: poolInfo.value.amount - reserved,
    returned,
    forfeited,
    spentAll,
    overAllocated: allocated > poolInfo.value.amount + 1,
  }
})

const schedeCards = computed(() => {
  if (actor.value?.kind === 'manager') return org.value.cards.filter((card) => card.id === actor.value.id)
  return org.value.cards
})

const inbox = computed(() =>
  org.value.cards
    .map((card) => ({
      card,
      pkg: packages.value[card.id] || emptyPackage(),
      evaluation: evaluations.value[card.id],
    }))
    .filter(({ card, pkg }) => {
      const id = actor.value?.id
      const kind = actor.value?.kind
      if (kind === 'hr') return true
      if (id === card.id) return true
      if (pkg.status === 'pending_l2' && card.parentId === id) return true
      if (kind === 'hrbp' && (pkg.status === 'pending_hrbp' || pkg.status === 'approved')) return true
      return false
    }),
)

const letters = computed(() =>
  letterRows({
    cards: org.value.cards,
    proposals: proposals.value,
    packages: packages.value,
    settings: settings.value,
    names: names.value,
  }),
)

const levels = computed(() =>
  [...new Set(org.value.people.map((person) => person.level).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'it'),
  ),
)

const leverWeightSum = computed(() => {
  const split = settings.value.leverSplit || {}
  return (Number(split.merit) || 0) + (Number(split.oneoff) || 0) + (Number(split.promotion) || 0)
})

const pendingForActor = computed(
  () => inbox.value.filter(({ card, pkg }) => canApprove(actor.value?.id, card, pkg.status)).length,
)

function displayName(card) {
  return names.value[card.id]?.trim() || card.name
}

function pkgOf(id) {
  return packages.value[id] || emptyPackage()
}

function hydrate(signature) {
  ready.value = false
  let stored = null
  try {
    stored = JSON.parse(localStorage.getItem(storageKey(signature)) || 'null')
  } catch {
    stored = null
  }
  const base = defaultSettings()
  settings.value = stored?.settings
    ? { ...base, ...stored.settings, leverSplit: { ...base.leverSplit, ...(stored.settings.leverSplit || {}) } }
    : base
  overrides.value = stored?.overrides && typeof stored.overrides === 'object' ? stored.overrides : {}
  names.value = stored?.names && typeof stored.names === 'object' ? stored.names : {}
  proposals.value = stored?.proposals && typeof stored.proposals === 'object' ? stored.proposals : {}
  packages.value = stored?.packages && typeof stored.packages === 'object' ? stored.packages : {}
  ready.value = true
  reclampAll()
  persist()
}

function persist() {
  if (!ready.value) return
  localStorage.setItem(
    storageKey(org.value.signature),
    JSON.stringify({
      settings: settings.value,
      overrides: overrides.value,
      names: names.value,
      proposals: proposals.value,
      packages: packages.value,
    }),
  )
}

watch(
  () => org.value.signature,
  (signature) => hydrate(signature),
  { immediate: true },
)

watch(
  org,
  () => {
    if (!org.value.actors.some((item) => item.id === actorId.value)) actorId.value = 'hr'
  },
  { immediate: true },
)

watch([settings, overrides, names, proposals, packages], persist, { deep: true })

watch(
  () =>
    [
      settings.value.personCapPct,
      settings.value.overBudget,
      settings.value.budgetMode,
      settings.value.aboveBandPolicy,
      settings.value.aboveBandCompa,
      settings.value.newHireMonths,
      settings.value.referenceDate,
      leverWeightSum.value,
      allocationRows.value.map((row) => Math.round(row.budget)).join(','),
    ].join('|'),
  () => {
    if (ready.value) reclampAll()
  },
)

function reclampAll() {
  let next = { ...proposals.value }
  let changed = false
  for (const row of allocationRows.value) {
    for (const person of row.card.reports) {
      const prev = proposalOf(next, person.id)
      if (!next[person.id]) continue
      const result = nextAmount({
        card: row.card,
        proposals: next,
        settings: settings.value,
        budget: row.budget,
        personId: person.id,
        rawAmount: prev.amount,
      })
      if (result.amount !== prev.amount) {
        next = { ...next, [person.id]: { ...prev, amount: result.amount } }
        changed = true
      }
    }
  }
  if (changed) proposals.value = next
}

function setPoolMode(mode) {
  if (mode === 'absolute' && !(Number(settings.value.poolAbsolute) > 0)) {
    const current = cyclePool({ ...settings.value, poolMode: 'percent' }, org.value.people)
    settings.value.poolAbsolute = Math.round(current.amount)
  }
  settings.value.poolMode = mode
}

function setOverride(card, reportsPayroll, mode, raw) {
  if (mode === 'percent') {
    const percent = Math.max(0, Number(String(raw).replace(',', '.')) || 0)
    overrides.value = {
      ...overrides.value,
      [card.id]: {
        manual: true,
        mode: 'percent',
        percent,
        amount: (reportsPayroll * percent) / 100,
      },
    }
    return
  }
  const amount = Math.max(0, Math.round(Number(raw) || 0))
  const percent = reportsPayroll > 0 ? (amount / reportsPayroll) * 100 : 0
  overrides.value = {
    ...overrides.value,
    [card.id]: { manual: true, mode: 'absolute', percent, amount },
  }
}

function resetOverride(id) {
  const next = { ...overrides.value }
  delete next[id]
  overrides.value = next
}

function resetAllOverrides() {
  overrides.value = {}
}

function renameManager(id, value) {
  names.value = { ...names.value, [id]: value }
}

function setSplit(key, raw) {
  const value = Math.max(0, Number(String(raw).replace(',', '.')) || 0)
  settings.value = {
    ...settings.value,
    leverSplit: { ...settings.value.leverSplit, [key]: value },
  }
}

function historyEntry(action, comment = '') {
  return {
    at: new Date().toISOString(),
    action,
    actorName: actor.value?.name || 'HR',
    comment,
  }
}

function savePkg(id, pkg) {
  packages.value = { ...packages.value, [id]: pkg }
}

function setAmount(card, person, raw, event) {
  const budget = allocationRows.value.find((row) => row.card.id === card.id)?.budget || 0
  const result = nextAmount({
    card,
    proposals: proposals.value,
    settings: settings.value,
    budget,
    personId: person.id,
    rawAmount: raw,
  })
  const prev = proposalOf(proposals.value, person.id)
  proposals.value = { ...proposals.value, [person.id]: { ...prev, amount: result.amount } }
  const hint = result.flags.capped
    ? 'Applicato il tetto individuale'
    : result.flags.blockedByBudget
      ? 'Importo riportato al residuo di budget'
      : ''
  rowHints.value = { ...rowHints.value, [person.id]: hint }
  if (event?.target) event.target.value = result.amount ? String(result.amount) : ''
}

function setLever(card, person, lever) {
  const prev = proposalOf(proposals.value, person.id)
  proposals.value = {
    ...proposals.value,
    [person.id]: { ...prev, lever, newLevel: lever === 'promotion' ? prev.newLevel : '' },
  }
  if (prev.amount > 0) setAmount(card, person, prev.amount)
}

function setNewLevel(person, value) {
  const prev = proposalOf(proposals.value, person.id)
  proposals.value = { ...proposals.value, [person.id]: { ...prev, newLevel: value } }
}

function isCardOpen(id) {
  if (Object.prototype.hasOwnProperty.call(openCards.value, id)) return !!openCards.value[id]
  if (actor.value?.kind === 'manager') return true
  return id === schedeCards.value[0]?.id
}

function toggleCard(id) {
  openCards.value = { ...openCards.value, [id]: !isCardOpen(id) }
}

function submitCard(card) {
  const evaluation = evaluations.value[card.id]
  const reasons = submitBlockers(evaluation, settings.value)
  if (reasons.length) {
    notices.value = { ...notices.value, [card.id]: reasons.join(' ') }
    return
  }
  const status = submitStatus(settings.value, card)
  const prev = pkgOf(card.id)
  const action =
    status === 'pending_l2' ? 'Inviato al responsabile' : status === 'pending_hrbp' ? 'Inviato all’HRBP' : 'Inviato a HR'
  savePkg(card.id, {
    ...prev,
    status,
    comment: '',
    history: [...prev.history, historyEntry(action)],
  })
  notices.value = { ...notices.value, [card.id]: '' }
  actionError.value = ''
}

function approveCard(card) {
  const prev = pkgOf(card.id)
  const status = approveStatus(prev.status)
  const action = status === 'approved' ? 'Approvato da HR' : 'Approvato, inoltrato a HR'
  savePkg(card.id, {
    ...prev,
    status,
    comment: '',
    history: [...prev.history, historyEntry(action)],
  })
  actionError.value = ''
}

function rejectCard(card) {
  const reason = (rejectNotes.value[card.id] || '').trim()
  if (!reason) {
    actionError.value = 'Scrivi il motivo del respingimento.'
    return
  }
  const prev = pkgOf(card.id)
  savePkg(card.id, {
    ...prev,
    status: 'rejected',
    comment: reason,
    history: [...prev.history, historyEntry('Respinto al manager', reason)],
  })
  actionError.value = ''
}

function resetCycleData() {
  proposals.value = {}
  packages.value = {}
  rowHints.value = {}
  notices.value = {}
  rejectNotes.value = {}
  actionError.value = ''
}

function perfLabel(value) {
  if (value == null || !Number.isFinite(Number(value))) return 'n/d'
  return `${Math.round(Number(value))}/100`
}

function lastIncreaseLabel(person) {
  if (person.lastIncreasePct == null || !Number.isFinite(Number(person.lastIncreasePct))) return 'n/d'
  const pct = `${person.lastIncreasePct > 0 ? '+' : ''}${Number(person.lastIncreasePct).toLocaleString('it-IT', {
    maximumFractionDigits: 1,
  })}%`
  if (!person.lastIncreaseDate) return pct
  const date = new Date(`${person.lastIncreaseDate}T00:00:00`)
  if (Number.isNaN(date.getTime())) return pct
  const when = date.toLocaleDateString('it-IT', { month: 'short', year: 'numeric' })
  return `${pct} · ${when}`
}

function bandText(person) {
  if (person.compa == null) return 'Banda non disponibile'
  if (person.position > 1) return 'Sopra la banda'
  if (person.position < 0) return 'Sotto la banda'
  return 'In banda'
}

function markLeft(person) {
  if (person.position == null) return '50%'
  return `${Math.min(100, Math.max(0, person.position * 100))}%`
}

function barWidth(spent, budget) {
  if (!budget) return spent > 0 ? '100%' : '0%'
  return `${Math.min(100, Math.max(0, (spent / budget) * 100))}%`
}

function statusClass(status) {
  if (status === 'approved') return 'is-ok'
  if (status === 'rejected') return 'is-bad'
  if (status === 'draft') return 'is-draft'
  return 'is-wait'
}

function formatWhen(iso) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function proposalAmount(person) {
  const amount = proposalOf(proposals.value, person.id).amount
  return amount > 0 ? String(amount) : ''
}

async function downloadLetters(onlyId) {
  const list = onlyId ? letters.value.filter((row) => row.id === onlyId) : letters.value
  if (!list.length) return
  const { saveLettersPdf } = await import('../lib/salaryReviewLetters.js')
  saveLettersPdf(
    {
      companyName: props.companyName?.trim() || 'Azienda',
      cycleName: settings.value.cycleName,
      effectiveDate: settings.value.effectiveDate,
      generatedAt: new Date().toISOString().slice(0, 10),
      letters: list,
    },
    onlyId ? `lettera-${onlyId}.pdf` : 'lettere-salary-review.pdf',
  )
}

function downloadCsv() {
  if (!letters.value.length) return
  const csv = payrollCsv(letters.value, settings.value.effectiveDate)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'salary-review-paghe.csv'
  link.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="sr">
    <header class="sr-top">
      <div>
        <p class="sr-kicker">Compensation</p>
        <h1>Salary review</h1>
      </div>
      <label class="sr-actor">
        <span>Stai operando come</span>
        <select v-model="actorId">
          <option v-for="item in org.actors" :key="item.id" :value="item.id">
            {{ item.name }} · {{ item.hint }}
          </option>
        </select>
      </label>
    </header>

    <nav class="sr-tabs" aria-label="Salary review">
      <button type="button" :class="{ active: tab === 'budget' }" @click="tab = 'budget'">Budget</button>
      <button type="button" :class="{ active: tab === 'schede' }" @click="tab = 'schede'">Schede manager</button>
      <button type="button" :class="{ active: tab === 'approvazioni' }" @click="tab = 'approvazioni'">
        Approvazioni
        <em v-if="pendingForActor">{{ pendingForActor }}</em>
      </button>
      <button type="button" :class="{ active: tab === 'lettere' }" @click="tab = 'lettere'">Lettere e paghe</button>
    </nav>

    <div class="sr-body">
      <p class="sr-source">{{ org.sourceNote }}</p>

      <section v-if="tab === 'budget'" class="sr-stack">
        <div class="sr-kpis">
          <article>
            <span>Monte salari</span>
            <strong>{{ formatEuro(poolInfo.payroll) }}</strong>
            <small>{{ org.people.length }} persone in ciclo</small>
          </article>
          <article>
            <span>Pool</span>
            <strong>{{ formatEuro(central.pool) }}</strong>
            <small>{{ settings.poolMode === 'percent' ? formatPct(settings.poolPercent) + ' del monte' : 'Importo definito da HR' }}</small>
          </article>
          <article>
            <span>Allocato ai manager</span>
            <strong>{{ formatEuro(central.allocated) }}</strong>
            <small>{{ central.overAllocated ? 'Supera il pool' : 'Somma dei budget di scheda' }}</small>
          </article>
          <article>
            <span>Proposto</span>
            <strong>{{ formatEuro(central.spentAll) }}</strong>
            <small>Somma delle proposte vive</small>
          </article>
          <article>
            <span>Residuo centrale</span>
            <strong :class="{ 'is-neg': central.residual < -1 }">{{ formatEuro(central.residual) }}</strong>
            <small>{{ settings.unusedPolicy === 'return' ? 'Il non speso approvato rientra' : 'Il non speso approvato resta perso' }}</small>
          </article>
        </div>

        <p v-if="central.overAllocated" class="sr-alert">
          L’allocazione manuale supera il pool di {{ formatEuro(central.allocated - central.pool) }}.
        </p>
        <p v-if="central.returned > 0" class="sr-note">
          {{ formatEuro(central.returned) }} già approvati e non spesi sono tornati nel pool.
        </p>
        <p v-if="central.forfeited > 0" class="sr-note">
          {{ formatEuro(central.forfeited) }} approvati e non spesi risultano persi.
        </p>

        <div class="sr-grid">
          <section class="sr-card">
            <h2>Pool complessivo</h2>
            <p class="sr-help">
              HR fissa il pool. In cascata ogni manager riceve la stessa percentuale sul monte salari dei propri riporti:
              finché le righe restano in automatico, la somma dei budget coincide con il pool.
            </p>
            <label class="sr-field">
              Nome ciclo
              <input v-model="settings.cycleName" type="text" :disabled="actorId !== 'hr'" />
            </label>
            <div class="sr-inline">
              <label class="sr-radio">
                <input type="radio" name="pool-mode" value="percent" :checked="settings.poolMode === 'percent'" :disabled="actorId !== 'hr'" @change="setPoolMode('percent')" />
                Percentuale del monte salari
              </label>
              <label class="sr-radio">
                <input type="radio" name="pool-mode" value="absolute" :checked="settings.poolMode === 'absolute'" :disabled="actorId !== 'hr'" @change="setPoolMode('absolute')" />
                Importo assoluto
              </label>
            </div>
            <label v-if="settings.poolMode === 'percent'" class="sr-field">
              Percentuale
              <input v-model.number="settings.poolPercent" type="number" min="0" max="100" step="0.1" :disabled="actorId !== 'hr'" />
            </label>
            <label v-else class="sr-field">
              Importo pool
              <input v-model.number="settings.poolAbsolute" type="number" min="0" step="100" :disabled="actorId !== 'hr'" />
            </label>
            <p class="sr-help">Cascata attuale: {{ formatPct(defaultPct) }} del monte di ciascun perimetro.</p>
          </section>

          <section class="sr-card">
            <h2>Regole</h2>
            <label class="sr-field">
              Budget non speso dopo l’approvazione
              <select v-model="settings.unusedPolicy" :disabled="actorId !== 'hr'">
                <option value="return">Torna al pool centrale</option>
                <option value="forfeit">Resta perso</option>
              </select>
            </label>
            <label class="sr-field">
              Leve sul budget
              <select v-model="settings.budgetMode" :disabled="actorId !== 'hr'">
                <option value="unified">Un unico budget per merito, una tantum e promozione</option>
                <option value="perLever">Un budget distinto per leva</option>
              </select>
            </label>
            <div v-if="settings.budgetMode === 'perLever'" class="sr-split">
              <label>Merito %<input :value="settings.leverSplit.merit" type="number" min="0" step="1" :disabled="actorId !== 'hr'" @input="setSplit('merit', $event.target.value)" /></label>
              <label>Una tantum %<input :value="settings.leverSplit.oneoff" type="number" min="0" step="1" :disabled="actorId !== 'hr'" @input="setSplit('oneoff', $event.target.value)" /></label>
              <label>Promozione %<input :value="settings.leverSplit.promotion" type="number" min="0" step="1" :disabled="actorId !== 'hr'" @input="setSplit('promotion', $event.target.value)" /></label>
            </div>
            <p v-if="settings.budgetMode === 'perLever'" class="sr-help">
              I pesi valgono {{ formatPct(leverWeightSum, 0) }} e vengono riportati a 100 in proporzione.
            </p>
            <div class="sr-split">
              <label>Tetto per persona %<input v-model.number="settings.personCapPct" type="number" min="0" max="100" step="0.5" :disabled="actorId !== 'hr'" /></label>
              <label>
                Se si sfora il budget
                <select v-model="settings.overBudget" :disabled="actorId !== 'hr'">
                  <option value="alert">Alert, la proposta resta</option>
                  <option value="block">Blocco, l’importo torna al residuo</option>
                </select>
              </label>
            </div>
            <div class="sr-split">
              <label>Neoassunti sotto i mesi<input v-model.number="settings.newHireMonths" type="number" min="0" step="1" :disabled="actorId !== 'hr'" /></label>
              <label>Soglia compa-ratio %<input v-model.number="settings.aboveBandCompa" type="number" min="0" step="1" :disabled="actorId !== 'hr'" /></label>
            </div>
            <label class="sr-field">
              Chi è già sopra la soglia di banda
              <select v-model="settings.aboveBandPolicy" :disabled="actorId !== 'hr'">
                <option value="alert">Alert, l’aumento si può proporre</option>
                <option value="block">Blocco, la persona non è eleggibile</option>
              </select>
            </label>
            <label class="sr-field">
              Secondo livello di approvazione
              <select v-model="settings.secondApprover" :disabled="actorId !== 'hr'">
                <option value="manager">Il responsabile del manager, poi HR</option>
                <option value="hrbp">HRBP, poi HR</option>
                <option value="none">Solo HR</option>
              </select>
            </label>
            <div class="sr-split">
              <label>Data di riferimento eleggibilità<input v-model="settings.referenceDate" type="date" :disabled="actorId !== 'hr'" /></label>
              <label>Decorrenza aumenti<input v-model="settings.effectiveDate" type="date" :disabled="actorId !== 'hr'" /></label>
            </div>
          </section>
        </div>

        <section class="sr-card">
          <div class="sr-card-head">
            <h2>Allocazione per manager</h2>
            <button type="button" class="sr-btn" :disabled="actorId !== 'hr'" @click="resetAllOverrides">Ricalcola tutta la cascata</button>
          </div>
          <div class="sr-table-wrap">
            <table class="sr-table">
              <thead>
                <tr>
                  <th>Manager</th>
                  <th>Riporti</th>
                  <th>Monte riporti</th>
                  <th>% sul monte</th>
                  <th>Budget</th>
                  <th>Vs cascata</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in allocationRows" :key="row.card.id">
                  <td>
                    <input
                      class="sr-name"
                      :value="displayName(row.card)"
                      :disabled="actorId !== 'hr'"
                      @change="renameManager(row.card.id, $event.target.value)"
                    />
                    <small>{{ row.card.team }}</small>
                  </td>
                  <td>{{ row.card.reports.length }}</td>
                  <td>{{ formatEuro(row.reportsPayroll) }}</td>
                  <td>
                    <input
                      class="sr-num"
                      type="number"
                      min="0"
                      step="0.1"
                      :value="Number(row.pct.toFixed(2))"
                      :disabled="actorId !== 'hr'"
                      @change="setOverride(row.card, row.reportsPayroll, 'percent', $event.target.value)"
                    />
                  </td>
                  <td>
                    <input
                      class="sr-num"
                      type="number"
                      min="0"
                      step="100"
                      :value="Math.round(row.budget)"
                      :disabled="actorId !== 'hr'"
                      @change="setOverride(row.card, row.reportsPayroll, 'absolute', $event.target.value)"
                    />
                  </td>
                  <td :class="{ 'is-neg': row.budget - row.cascaded > 1, 'is-ok': row.cascaded - row.budget > 1 }">
                    {{ row.manual ? formatEuro(row.budget - row.cascaded) : 'Cascata' }}
                  </td>
                  <td>
                    <button v-if="row.manual" type="button" class="sr-link" :disabled="actorId !== 'hr'" @click="resetOverride(row.card.id)">
                      Torna alla cascata
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </section>

      <section v-else-if="tab === 'schede'" class="sr-stack">
        <p v-if="!schedeCards.length" class="sr-note">Nessuna scheda assegnata a questo profilo.</p>
        <article v-for="card in schedeCards" :key="card.id" class="sr-card">
          <button type="button" class="sr-scheda-head" @click="toggleCard(card.id)">
            <div>
              <h2>{{ displayName(card) }}</h2>
              <p>{{ card.role }} · {{ card.reports.length }} persone · {{ STATUS_LABEL[pkgOf(card.id).status] }}</p>
            </div>
            <div class="sr-scheda-budget">
              <span>Residuo</span>
              <strong :class="{ 'is-neg': evaluations[card.id].residual.all < -1 }">
                {{ formatEuro(evaluations[card.id].residual.all) }}
              </strong>
              <small>su {{ formatEuro(evaluations[card.id].budget) }}</small>
            </div>
          </button>

          <div v-if="isCardOpen(card.id)" class="sr-scheda-body">
            <div class="sr-bar" aria-hidden="true">
              <div
                class="sr-bar-fill"
                :class="{ over: evaluations[card.id].overBudget }"
                :style="{ width: barWidth(evaluations[card.id].spent.all, evaluations[card.id].budget) }"
              ></div>
            </div>
            <p v-if="settings.budgetMode === 'perLever'" class="sr-lever-res">
              <span>Merito {{ formatEuro(evaluations[card.id].residual.merit) }}</span>
              <span>Una tantum {{ formatEuro(evaluations[card.id].residual.oneoff) }}</span>
              <span>Promozione {{ formatEuro(evaluations[card.id].residual.promotion) }}</span>
            </p>
            <p v-if="evaluations[card.id].overBudget" class="sr-alert">
              {{ settings.overBudget === 'block' ? 'Il budget è stato riportato dentro il tetto.' : 'Alert: le proposte superano il budget. Si possono inviare comunque.' }}
            </p>
            <p v-if="pkgOf(card.id).status === 'rejected' && pkgOf(card.id).comment" class="sr-alert">
              Respinta: {{ pkgOf(card.id).comment }}
            </p>
            <p class="sr-help">
              Tetto {{ formatPct(settings.personCapPct, 0) }} a persona.
              Neoassunti sotto i {{ settings.newHireMonths }} mesi esclusi.
              Compa-ratio sopra {{ settings.aboveBandCompa }}%:
              {{ settings.aboveBandPolicy === 'block' ? 'non eleggibile' : 'solo alert' }}.
            </p>

            <div class="sr-table-wrap">
              <table class="sr-table sr-people">
                <thead>
                  <tr>
                    <th>Persona</th>
                    <th>RAL</th>
                    <th>Banda / compa</th>
                    <th>Performance</th>
                    <th>Ultimo aumento</th>
                    <th>Leva</th>
                    <th>Proposta</th>
                    <th>Nuova RAL</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in evaluations[card.id].rows" :key="row.person.id" :class="{ locked: row.elig.blocking }">
                    <td>
                      <strong>{{ row.person.name }}</strong>
                      <small>{{ row.person.role }} · {{ row.person.level }}</small>
                      <small v-for="flag in row.elig.flags" :key="flag.code" :class="flag.blocking ? 'is-bad' : 'is-wait'">
                        {{ flag.label }}
                      </small>
                    </td>
                    <td>{{ formatEuro(row.person.ral) }}</td>
                    <td>
                      <div v-if="row.person.compa != null" class="sr-compa">
                        <div class="sr-band-track">
                          <i :style="{ left: markLeft(row.person) }" :class="{ over: row.person.position > 1 }"></i>
                        </div>
                        <span>{{ Math.round(row.person.compa) }}% · {{ bandText(row.person) }}</span>
                        <small v-if="row.person.bandSource === 'peers'">Banda dai pari livello</small>
                      </div>
                      <span v-else>n/d</span>
                    </td>
                    <td>{{ perfLabel(row.person.performance) }}</td>
                    <td>{{ lastIncreaseLabel(row.person) }}</td>
                    <td>
                      <select
                        :value="row.proposal.lever"
                        :disabled="row.elig.blocking || !canEdit(actorId, card, pkgOf(card.id).status)"
                        @change="setLever(card, row.person, $event.target.value)"
                      >
                        <option v-for="lever in LEVERS" :key="lever.id" :value="lever.id">{{ lever.label }}</option>
                      </select>
                      <input
                        v-if="row.proposal.lever === 'promotion'"
                        class="sr-level"
                        list="sr-levels"
                        placeholder="Nuovo livello"
                        :value="row.proposal.newLevel"
                        :disabled="row.elig.blocking || !canEdit(actorId, card, pkgOf(card.id).status)"
                        @change="setNewLevel(row.person, $event.target.value)"
                      />
                    </td>
                    <td>
                      <input
                        class="sr-num"
                        type="number"
                        min="0"
                        step="100"
                        :value="row.elig.blocking ? '' : proposalAmount(row.person)"
                        :disabled="row.elig.blocking || !canEdit(actorId, card, pkgOf(card.id).status)"
                        @input="setAmount(card, row.person, $event.target.value, $event)"
                      />
                      <small v-if="rowHints[row.person.id]">{{ rowHints[row.person.id] }}</small>
                      <small>max {{ formatEuro(row.cap) }}</small>
                    </td>
                    <td>
                      {{ formatEuro(newRal(row.person, row.proposal.lever === 'oneoff' || row.elig.blocking ? { lever: 'oneoff', amount: 0 } : row.proposal)) }}
                      <small v-if="row.proposal.lever === 'oneoff' && row.proposal.amount > 0 && !row.elig.blocking">
                        una tantum {{ formatEuro(row.proposal.amount) }}
                      </small>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="sr-actions">
              <p v-if="notices[card.id]" class="sr-alert">{{ notices[card.id] }}</p>
              <button
                type="button"
                class="sr-btn primary"
                :disabled="!canSubmit(actorId, card, pkgOf(card.id).status)"
                @click="submitCard(card)"
              >
                Invia in approvazione
              </button>
            </div>
          </div>
        </article>
        <datalist id="sr-levels">
          <option v-for="level in levels" :key="level" :value="level"></option>
        </datalist>
      </section>

      <section v-else-if="tab === 'approvazioni'" class="sr-stack">
        <p v-if="actionError" class="sr-alert">{{ actionError }}</p>
        <p v-if="!inbox.length" class="sr-note">Nessun pacchetto visibile per questo profilo.</p>
        <article v-for="item in inbox" :key="item.card.id" class="sr-card">
          <div class="sr-approval-head">
            <div>
              <h2>{{ displayName(item.card) }}</h2>
              <p>{{ item.card.reports.length }} persone · proposto {{ formatEuro(item.evaluation.spent.all) }} su {{ formatEuro(item.evaluation.budget) }}</p>
            </div>
            <span class="sr-status" :class="statusClass(item.pkg.status)">{{ STATUS_LABEL[item.pkg.status] }}</span>
          </div>
          <p v-if="item.evaluation.overBudget" class="sr-alert">Questo pacchetto sfora il budget del manager.</p>
          <p v-if="item.pkg.comment && item.pkg.status === 'rejected'" class="sr-alert">{{ item.pkg.comment }}</p>
          <ul v-if="item.pkg.history.length" class="sr-history">
            <li v-for="(event, index) in item.pkg.history" :key="index">
              <strong>{{ event.action }}</strong>
              <span>{{ event.actorName }} · {{ formatWhen(event.at) }}</span>
              <em v-if="event.comment">{{ event.comment }}</em>
            </li>
          </ul>
          <div v-if="canApprove(actorId, item.card, item.pkg.status) || canReject(actorId, item.card, item.pkg.status)" class="sr-actions">
            <label class="sr-field">
              Motivo se respingi
              <input v-model="rejectNotes[item.card.id]" type="text" placeholder="Motivo visibile al manager" />
            </label>
            <button v-if="canApprove(actorId, item.card, item.pkg.status)" type="button" class="sr-btn primary" @click="approveCard(item.card)">
              Approva
            </button>
            <button v-if="canReject(actorId, item.card, item.pkg.status)" type="button" class="sr-btn" @click="rejectCard(item.card)">
              Respingi
            </button>
          </div>
        </article>
      </section>

      <section v-else class="sr-stack">
        <section class="sr-card">
          <div class="sr-card-head">
            <div>
              <h2>Lettere e tracciato paghe</h2>
              <p class="sr-help">Si generano solo gli aumenti dei pacchetti approvati da HR, con decorrenza {{ settings.effectiveDate }}.</p>
            </div>
            <div class="sr-actions tight">
              <button type="button" class="sr-btn primary" :disabled="!letters.length" @click="downloadLetters()">Scarica tutte le lettere</button>
              <button type="button" class="sr-btn" :disabled="!letters.length" @click="downloadCsv">Export paghe CSV</button>
              <button v-if="actorId === 'hr'" type="button" class="sr-link" @click="resetCycleData">Azzera proposte del ciclo</button>
            </div>
          </div>
          <p v-if="!letters.length" class="sr-note">Nessuna proposta approvata. Il file paghe e le lettere compariranno dopo l’approvazione HR.</p>
          <div v-else class="sr-table-wrap">
            <table class="sr-table">
              <thead>
                <tr>
                  <th>Persona</th>
                  <th>Manager</th>
                  <th>Leva</th>
                  <th>RAL attuale</th>
                  <th>Importo</th>
                  <th>Nuova RAL</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in letters" :key="row.id">
                  <td>
                    <strong>{{ row.name }}</strong>
                    <small>{{ row.role }} · {{ row.level }}<template v-if="row.lever === 'promotion'"> → {{ row.newLevel }}</template></small>
                  </td>
                  <td>{{ row.managerName }}</td>
                  <td>{{ row.leverLabel }}</td>
                  <td>{{ formatEuro(row.ral) }}</td>
                  <td>{{ formatEuro(row.amount) }}</td>
                  <td>{{ formatEuro(row.newRal) }}</td>
                  <td><button type="button" class="sr-link" @click="downloadLetters(row.id)">Lettera PDF</button></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </div>
  </div>
</template>

<style scoped>
.sr {
  flex: 1;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: transparent;
}

.sr-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  min-height: 64px;
  padding: 0.75rem 1.25rem;
  background: #fff;
  border-bottom: 1px solid #e6ebf2;
}

.sr-kicker {
  margin: 0;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #3b82f6;
}

.sr-top h1 {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 650;
  color: #1e293b;
}

.sr-actor {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  font-size: 0.72rem;
  color: #64748b;
}

.sr-actor select,
.sr-field input,
.sr-field select,
.sr-split input,
.sr-split select,
.sr-table input,
.sr-table select,
.sr-name,
.sr-num,
.sr-level {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
  color: #1e293b;
  font: inherit;
  padding: 0.45rem 0.6rem;
}

.sr-actor select {
  min-width: 280px;
  max-width: 420px;
}

.sr-tabs {
  display: flex;
  gap: 0.25rem;
  padding: 0 1.25rem;
  background: #fff;
  border-bottom: 1px solid #e6ebf2;
}

.sr-tabs button {
  border: none;
  border-bottom: 3px solid transparent;
  background: transparent;
  color: #1e293b;
  font: inherit;
  font-size: 0.875rem;
  padding: 0.75rem 0.9rem;
  cursor: pointer;
}

.sr-tabs button.active {
  color: #0a6cd2;
  font-weight: 650;
  border-bottom-color: #0a6cd2;
}

.sr-tabs em {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.1rem;
  margin-left: 0.35rem;
  padding: 0 0.3rem;
  border-radius: 999px;
  background: #0a6cd2;
  color: #fff;
  font-style: normal;
  font-size: 0.72rem;
}

.sr-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 1rem 1.25rem 2rem;
}

.sr-source,
.sr-help,
.sr-note {
  color: #64748b;
  font-size: 0.84rem;
}

.sr-source {
  margin: 0 0 0.9rem;
}

.sr-stack {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.sr-kpis {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0.7rem;
}

.sr-kpis article,
.sr-card {
  background: #fff;
  border: 1px solid #e8edf3;
  border-radius: 12px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.sr-kpis article {
  padding: 0.8rem 0.9rem;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.sr-kpis span,
.sr-scheda-budget span {
  font-size: 0.72rem;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.sr-kpis strong,
.sr-scheda-budget strong {
  font-size: 1.05rem;
  color: #0f172a;
}

.sr-kpis small,
.sr-table small,
.sr-scheda-budget small {
  color: #64748b;
  font-size: 0.75rem;
}

.sr-card {
  padding: 1rem 1.05rem 1.1rem;
}

.sr-card h2,
.sr-scheda-head h2,
.sr-approval-head h2 {
  margin: 0;
  font-size: 1rem;
  color: #1e293b;
}

.sr-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.9rem;
}

.sr-field,
.sr-split label {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  margin-top: 0.75rem;
  font-size: 0.8rem;
  color: #475569;
}

.sr-inline,
.sr-split,
.sr-card-head,
.sr-actions,
.sr-approval-head,
.sr-scheda-head,
.sr-lever-res {
  display: flex;
  gap: 0.8rem;
  align-items: center;
}

.sr-inline,
.sr-split {
  flex-wrap: wrap;
}

.sr-radio {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.7rem;
  font-size: 0.84rem;
  color: #334155;
}

.sr-split label {
  flex: 1;
  min-width: 140px;
}

.sr-card-head,
.sr-approval-head {
  justify-content: space-between;
  align-items: flex-start;
}

.sr-table-wrap {
  overflow-x: auto;
  margin-top: 0.8rem;
}

.sr-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.84rem;
}

.sr-table th,
.sr-table td {
  padding: 0.55rem 0.5rem;
  text-align: left;
  border-bottom: 1px solid #eef2f6;
  vertical-align: top;
}

.sr-table th {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: #64748b;
  white-space: nowrap;
}

.sr-table td strong,
.sr-table td small {
  display: block;
}

.sr-name {
  min-width: 180px;
}

.sr-num {
  width: 120px;
}

.sr-level {
  display: block;
  width: 140px;
  margin-top: 0.35rem;
}

.sr-table select {
  max-width: 180px;
}

.sr-scheda-head {
  width: 100%;
  border: none;
  background: transparent;
  padding: 0;
  text-align: left;
  cursor: pointer;
  font: inherit;
  justify-content: space-between;
}

.sr-scheda-head p,
.sr-approval-head p {
  margin: 0.15rem 0 0;
  color: #64748b;
  font-size: 0.8rem;
}

.sr-scheda-budget {
  text-align: right;
}

.sr-scheda-body {
  margin-top: 0.8rem;
}

.sr-bar {
  height: 8px;
  border-radius: 99px;
  background: #e8eef5;
  overflow: hidden;
}

.sr-bar-fill {
  height: 100%;
  background: #0a6cd2;
}

.sr-bar-fill.over {
  background: #d97706;
}

.sr-lever-res {
  margin: 0.45rem 0 0;
  color: #475569;
  font-size: 0.8rem;
}

.sr-compa {
  min-width: 140px;
}

.sr-band-track {
  position: relative;
  height: 6px;
  margin: 0.35rem 0;
  border-radius: 99px;
  background: linear-gradient(90deg, #bfdbfe, #86efac 50%, #fca5a5);
}

.sr-band-track i {
  position: absolute;
  top: -3px;
  width: 10px;
  height: 12px;
  margin-left: -5px;
  border-radius: 2px;
  background: #0f172a;
}

.sr-band-track i.over {
  background: #b91c1c;
}

.sr-people tr.locked {
  background: #f8fafc;
  color: #94a3b8;
}

.sr-alert,
.sr-note {
  margin: 0.6rem 0 0;
}

.sr-alert {
  color: #9a3412;
  background: #fff7ed;
  border-radius: 8px;
  padding: 0.45rem 0.6rem;
  font-size: 0.82rem;
}

.is-neg {
  color: #b91c1c;
}

.is-ok {
  color: #047857;
}

.is-bad {
  color: #b91c1c;
}

.is-wait {
  color: #b45309;
}

.sr-actions {
  margin-top: 0.8rem;
  flex-wrap: wrap;
}

.sr-actions.tight {
  margin-top: 0;
  justify-content: flex-end;
}

.sr-btn,
.sr-link {
  border-radius: 8px;
  font: inherit;
  cursor: pointer;
}

.sr-btn {
  border: 1px solid #d5deea;
  background: #fff;
  color: #1e293b;
  padding: 0.5rem 0.8rem;
}

.sr-btn.primary {
  border: none;
  background: #0a6cd2;
  color: #fff;
}

.sr-btn:disabled,
.sr-link:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.sr-link {
  border: none;
  background: transparent;
  color: #0a6cd2;
  padding: 0;
}

.sr-status {
  border-radius: 999px;
  padding: 0.25rem 0.6rem;
  font-size: 0.75rem;
  font-weight: 650;
  background: #f1f5f9;
  color: #475569;
  white-space: nowrap;
}

.sr-status.is-ok {
  background: #ecfdf5;
  color: #047857;
}

.sr-status.is-bad {
  background: #fef2f2;
  color: #b91c1c;
}

.sr-status.is-wait {
  background: #fffbeb;
  color: #b45309;
}

.sr-history {
  list-style: none;
  margin: 0.7rem 0 0;
  padding: 0;
}

.sr-history li {
  display: flex;
  flex-direction: column;
  gap: 0.05rem;
  padding: 0.4rem 0;
  border-top: 1px solid #eef2f6;
  font-size: 0.8rem;
}

.sr-history span,
.sr-history em {
  color: #64748b;
}

@media (max-width: 1100px) {
  .sr-kpis,
  .sr-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 780px) {
  .sr-top,
  .sr-tabs {
    flex-wrap: wrap;
  }

  .sr-actor select {
    min-width: 0;
    width: 100%;
  }

  .sr-kpis,
  .sr-grid {
    grid-template-columns: 1fr;
  }
}
</style>
