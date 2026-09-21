<script setup lang="ts">
import { SERVICES } from '../data/services'
import type { ServiceId } from '../types'
import { formatDuration, formatPrice } from '../utils/format'

const serviceId = defineModel<ServiceId>({ required: true })
</script>

<template>
  <fieldset class="services">
    <legend>1. 選擇服務</legend>
    <div class="options">
      <label v-for="service in SERVICES" :key="service.id" class="option" :class="{ checked: serviceId === service.id }">
        <input v-model="serviceId" type="radio" name="service" :value="service.id" />
        <span class="name">{{ service.name }}</span>
        <span class="meta">{{ formatDuration(service.duration) }} · {{ formatPrice(service.price) }}</span>
      </label>
    </div>
  </fieldset>
</template>

<style scoped>
.services {
  margin: 0;
  padding: 0;
  border: 0;
}

legend {
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: var(--text-h);
}

.options {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(9rem, 1fr));
  gap: 0.5rem;
}

.option {
  position: relative;
  display: grid;
  gap: 0.125rem;
  min-height: 2.75rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-lg);
  background: var(--bg);
  cursor: pointer;
}

.option.checked {
  border-color: var(--accent-solid);
  background: var(--accent-bg);
  box-shadow: inset 0 0 0 1px var(--accent-solid);
}

.option:has(input:focus-visible) {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

/* 原生 radio 視覺隱藏但保留鍵盤與螢幕報讀行為 */
.option input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.name {
  font-weight: 600;
  color: var(--text-h);
}

.meta {
  font-size: 0.8125rem;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}
</style>
