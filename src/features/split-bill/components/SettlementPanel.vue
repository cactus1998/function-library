<script setup lang="ts">
import type { Balance, Member, Transfer } from '../types'
import { formatTwd } from '../utils/money'

const props = defineProps<{ members: Member[]; balances: Balance[]; transfers: Transfer[] }>()
const emit = defineEmits<{ copy: [] }>()

const nameOf = (id: string) => props.members.find((m) => m.id === id)?.name ?? '?'
</script>

<template>
  <section class="settlement" aria-labelledby="settlement-title">
    <h3 id="settlement-title">結算</h3>

    <div class="table-wrap">
      <table>
        <caption class="visually-hidden">每人已付、應付與差額</caption>
        <thead>
          <tr>
            <th scope="col">成員</th>
            <th scope="col">已付</th>
            <th scope="col">應付</th>
            <th scope="col">差額</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="balance in balances" :key="balance.memberId">
            <th scope="row">{{ nameOf(balance.memberId) }}</th>
            <td>{{ formatTwd(balance.paid) }}</td>
            <td>{{ formatTwd(balance.owed) }}</td>
            <td :class="balance.net > 0 ? 'plus' : balance.net < 0 ? 'minus' : ''">
              <template v-if="balance.net > 0">應收 {{ formatTwd(balance.net) }}</template>
              <template v-else-if="balance.net < 0">應付 {{ formatTwd(-balance.net) }}</template>
              <template v-else>—</template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <h4>轉帳</h4>
    <p v-if="transfers.length === 0" class="done">大家都結清了</p>
    <ol v-else class="transfers">
      <li v-for="(transfer, index) in transfers" :key="index">
        <span class="who">{{ nameOf(transfer.from) }}</span>
        <span class="arrow" aria-label="轉給">→</span>
        <span class="who">{{ nameOf(transfer.to) }}</span>
        <span class="amount">{{ formatTwd(transfer.amount) }}</span>
      </li>
    </ol>

    <button type="button" class="copy" @click="emit('copy')">複製結算文字</button>
  </section>
</template>

<style scoped>
.settlement {
  padding: 1rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--bg);
}

h3 {
  margin: 0 0 0.5rem;
  font-size: 1rem;
}

h4 {
  margin: 1rem 0 0.5rem;
  font-size: 0.9375rem;
}

.table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  font-size: 0.875rem;
  border-collapse: collapse;
  font-variant-numeric: tabular-nums;
}

th,
td {
  padding: 0.375rem 0.5rem;
  text-align: right;
  white-space: nowrap;
  border-bottom: 1px solid var(--border);
}

th:first-child {
  text-align: left;
}

thead th {
  font-weight: 500;
  color: var(--text-muted);
}

.plus {
  color: var(--accent);
}

.minus {
  color: var(--danger);
}

.done {
  margin: 0;
  color: var(--text-muted);
}

.transfers {
  display: grid;
  gap: 0.375rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.transfers li {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius);
  background: var(--surface);
}

.who {
  font-weight: 600;
  color: var(--text-h);
}

.arrow {
  color: var(--text-muted);
}

.amount {
  margin-left: auto;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.copy {
  width: 100%;
  min-height: 2.75rem;
  margin-top: 1rem;
  color: var(--on-accent);
  border: 0;
  border-radius: var(--radius);
  background: var(--accent-solid);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}
</style>
