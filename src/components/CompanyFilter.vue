<script setup>
defineProps({
  modelValue: { type: String, default: '' },
  options: { type: Array, default: () => [] },
  count: { type: Number, default: null },
})

defineEmits(['update:modelValue'])
</script>

<template>
  <label class="company-filter">
    <span class="company-filter-label">Società</span>
    <select
      class="company-filter-select"
      :value="modelValue"
      @change="$emit('update:modelValue', $event.target.value)"
    >
      <option value="">Tutte le società</option>
      <option v-for="opt in options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
    </select>
    <span v-if="count != null" class="company-filter-count">{{ count }} dipendenti in analisi</span>
  </label>
</template>

<style scoped>
.company-filter {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.55rem;
  margin: 0 0 0.9rem;
}
.company-filter-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
}
.company-filter-select {
  min-width: 14rem;
  padding: 0.45rem 0.7rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm, 8px);
  font-size: 0.9rem;
  color: var(--text-primary);
  background: var(--bg-card, #fff);
}
.company-filter-select:focus {
  outline: none;
  border-color: var(--accent-blue);
  box-shadow: 0 0 0 2px rgba(10, 108, 210, 0.2);
}
.company-filter-count {
  font-size: 0.8rem;
  color: var(--text-secondary);
}
</style>
