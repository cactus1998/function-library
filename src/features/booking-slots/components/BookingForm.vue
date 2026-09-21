<script setup lang="ts">
import { NAME_MAX } from '../utils/phone'

defineProps<{
  /** 已選的服務與時段摘要；null 表示尚未選時段 */
  summary: string | null
  submitting: boolean
  errors: { name: string | null; phone: string | null }
  submitError: string | null
}>()

const emit = defineEmits<{ submit: [] }>()
const name = defineModel<string>('name', { required: true })
const phone = defineModel<string>('phone', { required: true })
</script>

<template>
  <form class="form" novalidate aria-labelledby="form-title" @submit.prevent="emit('submit')">
    <h3 id="form-title">4. 填寫聯絡資料</h3>

    <p class="summary" :class="{ muted: !summary }">{{ summary ?? '尚未選擇時段' }}</p>

    <div class="field">
      <label for="booking-name">姓名</label>
      <input
        id="booking-name"
        v-model="name"
        type="text"
        autocomplete="name"
        :maxlength="NAME_MAX * 2"
        :aria-invalid="!!errors.name"
        :aria-describedby="errors.name ? 'booking-name-error' : undefined"
      />
      <p v-if="errors.name" id="booking-name-error" class="error">{{ errors.name }}</p>
    </div>

    <div class="field">
      <label for="booking-phone">手機</label>
      <input
        id="booking-phone"
        v-model="phone"
        type="tel"
        inputmode="tel"
        autocomplete="tel"
        placeholder="0912-345-678"
        :aria-invalid="!!errors.phone"
        :aria-describedby="errors.phone ? 'booking-phone-error' : undefined"
      />
      <p v-if="errors.phone" id="booking-phone-error" class="error">{{ errors.phone }}</p>
    </div>

    <p v-if="submitError" class="submit-error" role="alert">{{ submitError }}</p>

    <button type="submit" class="submit" :disabled="!summary || submitting" :aria-disabled="!summary || submitting">
      {{ submitting ? '預約中…' : '確認預約' }}
    </button>
  </form>
</template>

<style scoped>
h3 {
  margin: 0 0 0.5rem;
  font-size: 1rem;
}

.summary {
  margin: 0 0 0.75rem;
  padding: 0.5rem 0.75rem;
  font-weight: 600;
  color: var(--text-h);
  border-radius: var(--radius);
  background: var(--surface);
}

.summary.muted {
  font-weight: 400;
  color: var(--text-muted);
}

.field {
  display: grid;
  gap: 0.25rem;
  margin-bottom: 0.75rem;
}

label {
  font-size: 0.875rem;
}

input {
  min-height: 2.75rem;
  padding: 0 0.75rem;
  color: var(--text-h);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  background: var(--bg);
  font: inherit;
}

input:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

input[aria-invalid='true'] {
  border-color: var(--danger);
}

.error,
.submit-error {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--danger);
}

.submit-error {
  margin-bottom: 0.75rem;
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius);
  background: var(--danger-bg);
}

.submit {
  width: 100%;
  min-height: 2.75rem;
  color: var(--on-accent);
  border: 0;
  border-radius: var(--radius);
  background: var(--accent-solid);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

.submit:hover:not(:disabled) {
  background: var(--accent-solid-hover);
}

.submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
