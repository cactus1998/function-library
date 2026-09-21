<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Expense, Member, Split, SplitMode } from '../types'
import { evaluate, parseAmount } from '../utils/expression'
import { formatTwd, serviceChargeOf } from '../utils/money'
import { exactRemaining, expenseTotal, SHARE_MAX, TITLE_MAX, validateExpense } from '../utils/split'

const props = defineProps<{
  members: Member[]
  /** 編輯中的帳目；null 表示新增 */
  editing: Expense | null
}>()

const emit = defineEmits<{ save: [expense: Omit<Expense, 'id'> & { id?: string }]; cancel: [] }>()

const MODES: { value: SplitMode; label: string }[] = [
  { value: 'equal', label: '平分' },
  { value: 'shares', label: '按份數' },
  { value: 'exact', label: '指定金額' },
]

const title = ref('')
const payerId = ref('')
const amountText = ref('')
const serviceCharge = ref(false)
const mode = ref<SplitMode>('equal')
const participants = ref<string[]>([])
const shares = ref<Record<string, number>>({})
const exactTexts = ref<Record<string, string>>({})
const attempted = ref(false)

function load(expense: Expense | null) {
  attempted.value = false
  title.value = expense?.title ?? ''
  payerId.value = expense?.payerId ?? props.members[0]?.id ?? ''
  amountText.value = expense ? String(expense.amount) : ''
  serviceCharge.value = expense?.serviceCharge ?? false
  mode.value = expense?.split.mode ?? 'equal'
  const split = expense?.split
  participants.value = split?.mode === 'equal' ? [...split.participants] : props.members.map((m) => m.id)
  shares.value = Object.fromEntries(
    props.members.map((m) => [m.id, split?.mode === 'shares' ? (split.shares[m.id] ?? 0) : 1]),
  )
  exactTexts.value = Object.fromEntries(
    props.members.map((m) => [m.id, split?.mode === 'exact' && split.amounts[m.id] ? String(split.amounts[m.id]) : '']),
  )
}

watch(() => props.editing, load, { immediate: true })

// 成員異動時同步表單：新成員預設參與平分、1 份；被刪除的付款人改為第一位
watch(
  () => props.members,
  (members, previous) => {
    const known = new Set(previous.map((m) => m.id))
    const added = members.filter((m) => !known.has(m.id))
    if (added.length) {
      participants.value = [...participants.value, ...added.map((m) => m.id)]
      shares.value = { ...shares.value, ...Object.fromEntries(added.map((m) => [m.id, 1])) }
    }
    if (!members.some((m) => m.id === payerId.value)) payerId.value = members[0]?.id ?? ''
  },
)

const amount = computed(() => (amountText.value.trim() ? parseAmount(amountText.value) : null))
const amountValue = computed(() => (amount.value?.ok ? amount.value.value : null))
const total = computed(() =>
  amountValue.value === null ? null : expenseTotal({ amount: amountValue.value, serviceCharge: serviceCharge.value }),
)

/** 指定金額欄位也接受算式；空白視為 0，不合法為 NaN（交給驗證顯示錯誤） */
const exactAmounts = computed(() =>
  Object.fromEntries(
    props.members.map((m) => {
      const text = exactTexts.value[m.id] ?? ''
      if (!text.trim()) return [m.id, 0]
      const result = evaluate(text)
      return [m.id, result.ok ? Math.round(result.value) : Number.NaN]
    }),
  ),
)

const split = computed<Split>(() => {
  if (mode.value === 'equal') return { mode: 'equal', participants: [...participants.value] }
  if (mode.value === 'shares') return { mode: 'shares', shares: { ...shares.value } }
  return { mode: 'exact', amounts: exactAmounts.value }
})

const errors = computed(() => {
  const list = validateExpense(
    { title: title.value, payerId: payerId.value, amount: amountValue.value, serviceCharge: serviceCharge.value, split: split.value },
    props.members,
  )
  if (!amount.value) list.unshift('請輸入金額')
  else if (!amount.value.ok) list.unshift(amount.value.error)
  return list
})

const remaining = computed(() =>
  mode.value === 'exact' && total.value !== null ? exactRemaining(total.value, exactAmounts.value) : 0,
)
const remainingText = computed(() => {
  if (remaining.value > 0) return `還差 ${formatTwd(remaining.value)}`
  if (remaining.value < 0) return `超過 ${formatTwd(-remaining.value)}`
  return '金額相符'
})

function onSubmit() {
  attempted.value = true
  if (errors.value.length > 0 || amountValue.value === null) return
  emit('save', {
    id: props.editing?.id,
    title: title.value.trim(),
    payerId: payerId.value,
    amount: amountValue.value,
    serviceCharge: serviceCharge.value,
    split: split.value,
  })
  if (!props.editing) load(null)
}

function setShare(id: string, event: Event) {
  const value = Number((event.target as HTMLInputElement).value)
  shares.value = { ...shares.value, [id]: Number.isFinite(value) ? value : 0 }
}
</script>

<template>
  <form class="expense-form" novalidate aria-labelledby="expense-form-title" @submit.prevent="onSubmit">
    <h3 id="expense-form-title">{{ editing ? `編輯「${editing.title}」` : '新增帳目' }}</h3>

    <div class="grid">
      <div class="field">
        <label for="expense-title">項目</label>
        <input id="expense-title" v-model="title" placeholder="例如：燒肉晚餐" :maxlength="TITLE_MAX * 2" />
      </div>

      <div class="field">
        <label for="expense-payer">誰先付</label>
        <select id="expense-payer" v-model="payerId">
          <option v-for="member in members" :key="member.id" :value="member.id">{{ member.name }}</option>
        </select>
      </div>

      <div class="field">
        <label for="expense-amount">金額（可輸入算式）</label>
        <input
          id="expense-amount"
          v-model="amountText"
          inputmode="decimal"
          autocomplete="off"
          placeholder="1280+350"
          :aria-invalid="amount !== null && !amount.ok"
          aria-describedby="expense-amount-hint"
        />
        <p id="expense-amount-hint" class="hint" :class="{ bad: amount && !amount.ok }" aria-live="polite">
          <template v-if="amount && amount.ok">= {{ formatTwd(amount.value) }}</template>
          <template v-else-if="amount">{{ amount.error }}</template>
          <template v-else>支援 + − × ÷ 與括號</template>
        </p>
      </div>

      <label class="check">
        <input v-model="serviceCharge" type="checkbox" />
        加 10% 服務費
        <span v-if="serviceCharge && amountValue !== null" class="muted">
          （+{{ formatTwd(serviceChargeOf(amountValue)) }}，共 {{ formatTwd(total!) }}）
        </span>
      </label>
    </div>

    <fieldset class="modes">
      <legend>怎麼分</legend>
      <label v-for="option in MODES" :key="option.value" class="mode" :class="{ checked: mode === option.value }">
        <input v-model="mode" type="radio" name="split-mode" :value="option.value" />
        {{ option.label }}
      </label>
    </fieldset>

    <ul class="people">
      <li v-for="member in members" :key="member.id">
        <label v-if="mode === 'equal'" class="check">
          <input v-model="participants" type="checkbox" :value="member.id" />
          {{ member.name }}
        </label>
        <template v-else-if="mode === 'shares'">
          <label :for="`share-${member.id}`">{{ member.name }}</label>
          <input
            :id="`share-${member.id}`"
            type="number"
            inputmode="numeric"
            min="0"
            :max="SHARE_MAX"
            step="1"
            :value="shares[member.id] ?? 0"
            @input="setShare(member.id, $event)"
          />
          <span class="unit">份</span>
        </template>
        <template v-else>
          <label :for="`exact-${member.id}`">{{ member.name }}</label>
          <input :id="`exact-${member.id}`" v-model="exactTexts[member.id]" inputmode="decimal" placeholder="0" />
        </template>
      </li>
    </ul>

    <p v-if="mode === 'exact' && total !== null" class="remaining" :class="{ bad: remaining !== 0 }" role="status">
      {{ remainingText }}
    </p>

    <ul v-if="attempted && errors.length" class="errors" role="alert">
      <li v-for="error in errors" :key="error">{{ error }}</li>
    </ul>

    <div class="actions">
      <button type="submit" class="primary" :disabled="mode === 'exact' && remaining !== 0">
        {{ editing ? '儲存變更' : '加入帳目' }}
      </button>
      <button v-if="editing" type="button" @click="emit('cancel')">取消</button>
    </div>
  </form>
</template>

<style scoped>
.expense-form {
  padding: 1rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--bg-subtle);
}

h3 {
  margin: 0 0 0.75rem;
  font-size: 1rem;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
  gap: 0.5rem 0.75rem;
  align-items: start;
}

.field {
  display: grid;
  gap: 0.25rem;
}

label {
  font-size: 0.875rem;
}

input:not([type='checkbox'], [type='radio']),
select {
  min-width: 0;
  min-height: 2.75rem;
  padding: 0 0.625rem;
  color: var(--text-h);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  background: var(--bg);
  font: inherit;
}

input[aria-invalid='true'] {
  border-color: var(--danger);
}

.hint {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}

.hint.bad,
.remaining.bad,
.errors {
  color: var(--danger);
}

.check {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  min-height: 2.75rem;
  cursor: pointer;
}

.check input {
  width: 1.125rem;
  height: 1.125rem;
  accent-color: var(--accent-solid);
}

.muted {
  color: var(--text-muted);
}

.modes {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin: 0.75rem 0 0.5rem;
  padding: 0;
  border: 0;
}

.modes legend {
  margin-bottom: 0.375rem;
  font-size: 0.875rem;
}

.mode {
  display: inline-flex;
  align-items: center;
  min-height: 2.75rem;
  padding: 0 0.875rem;
  border: 1px solid var(--border-strong);
  border-radius: 999px;
  background: var(--bg);
  cursor: pointer;
}

.mode.checked {
  color: var(--on-accent);
  border-color: var(--accent-solid);
  background: var(--accent-solid);
}

.mode:has(input:focus-visible) {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.mode input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.people {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
  gap: 0.375rem 0.75rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.people li {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.people li > label:not(.check) {
  flex: 1;
}

.people input:not([type='checkbox']) {
  width: 5.5rem;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.unit {
  font-size: 0.875rem;
  color: var(--text-muted);
}

.remaining {
  margin: 0.5rem 0 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--accent);
}

.errors {
  margin: 0.5rem 0 0;
  padding-left: 1.25rem;
  font-size: 0.8125rem;
}

.actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.actions button {
  min-height: 2.75rem;
  padding: 0 1rem;
  color: var(--text);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  background: var(--bg);
  font: inherit;
  cursor: pointer;
}

.actions .primary {
  color: var(--on-accent);
  border-color: var(--accent-solid);
  background: var(--accent-solid);
  font-weight: 600;
}

.actions button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
