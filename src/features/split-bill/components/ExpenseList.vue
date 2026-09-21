<script setup lang="ts">
import type { Expense, Member } from '../types'
import { formatTwd } from '../utils/money'
import { expenseTotal, splitSummary } from '../utils/split'

const props = defineProps<{ expenses: Expense[]; members: Member[]; editingId: string | null }>()
const emit = defineEmits<{ edit: [id: string]; remove: [id: string] }>()

const nameOf = (id: string) => props.members.find((m) => m.id === id)?.name ?? '?'
</script>

<template>
  <section class="expenses" aria-labelledby="expenses-title">
    <h3 id="expenses-title">帳目（{{ expenses.length }}）</h3>
    <p v-if="expenses.length === 0" class="empty">還沒有帳目，從上方新增第一筆。</p>
    <ul v-else>
      <li v-for="expense in expenses" :key="expense.id" :class="{ editing: expense.id === editingId }">
        <div class="info">
          <span class="title">{{ expense.title }}</span>
          <span class="meta">
            {{ nameOf(expense.payerId) }} 先付・{{ splitSummary(expense, members) }}
            <template v-if="expense.serviceCharge">・含服務費</template>
          </span>
        </div>
        <span class="amount">{{ formatTwd(expenseTotal(expense)) }}</span>
        <div class="actions">
          <button type="button" :aria-label="`編輯『${expense.title}』`" @click="emit('edit', expense.id)">編輯</button>
          <button type="button" :aria-label="`刪除『${expense.title}』`" @click="emit('remove', expense.id)">刪除</button>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
h3 {
  margin: 0 0 0.5rem;
  font-size: 1rem;
}

.empty {
  margin: 0;
  color: var(--text-muted);
}

ul {
  margin: 0;
  padding: 0;
  list-style: none;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
}

li {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem 0.75rem;
  padding: 0.5rem 0.75rem;
}

li + li {
  border-top: 1px solid var(--border);
}

li.editing {
  background: var(--accent-bg);
}

.info {
  display: grid;
  flex: 1;
  min-width: 10rem;
}

.title {
  font-weight: 600;
  color: var(--text-h);
}

.meta {
  font-size: 0.8125rem;
  color: var(--text-muted);
}

.amount {
  font-weight: 600;
  color: var(--text-h);
  font-variant-numeric: tabular-nums;
}

.actions {
  display: flex;
  gap: 0.25rem;
}

button {
  min-height: 2.75rem;
  padding: 0 0.75rem;
  color: var(--text);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  background: var(--bg);
  font: inherit;
  cursor: pointer;
}
</style>
