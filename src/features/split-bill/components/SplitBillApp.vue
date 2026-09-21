<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { useClipboard } from '../composables/useClipboard'
import { useSplitBill, type SplitBillOptions } from '../composables/useSplitBill'
import type { Expense } from '../types'
import { summaryText } from '../utils/split'
import ExpenseForm from './ExpenseForm.vue'
import ExpenseList from './ExpenseList.vue'
import MemberList from './MemberList.vue'
import SettlementPanel from './SettlementPanel.vue'

const props = defineProps<{
  /** 測試時注入 storage 與 id 產生器 */
  options?: SplitBillOptions
  clipboard?: Pick<Clipboard, 'writeText'>
  confirm?: (message: string) => boolean
}>()

const bill = useSplitBill(props.options)
const { members, expenses, balances, transfers, pendingUndo } = bill
const { copy } = useClipboard(props.clipboard ?? navigator.clipboard)

const editingId = ref<string | null>(null)
const editing = computed(() => expenses.value.find((e) => e.id === editingId.value) ?? null)

const announcement = ref('')
function announce(text: string) {
  announcement.value = ''
  void nextTick(() => (announcement.value = text))
}

function onSave(expense: Omit<Expense, 'id'> & { id?: string }) {
  const saved = bill.saveExpense(expense)
  announce(editingId.value ? `已更新「${saved.title}」` : `已加入「${saved.title}」`)
  editingId.value = null
}

function onEdit(id: string) {
  editingId.value = id
  void nextTick(() => document.getElementById('expense-title')?.focus())
}

function onRemove(id: string) {
  const expense = expenses.value.find((e) => e.id === id)
  if (!expense) return
  if (editingId.value === id) editingId.value = null
  bill.removeExpense(id)
  announce(`已刪除「${expense.title}」，5 秒內可復原`)
}

function onUndo() {
  const title = pendingUndo.value?.expense.title
  if (bill.undoRemove()) announce(`已復原「${title}」`)
}

async function onCopy() {
  const ok = await copy(summaryText(members.value, expenses.value, transfers.value))
  announce(ok ? '已複製結算文字' : '複製失敗，請手動選取')
}

function onReset() {
  const ask = props.confirm ?? ((message: string) => window.confirm(message))
  if (!ask('確定要清空所有成員與帳目嗎？')) return
  editingId.value = null
  bill.reset()
  announce('已清空，回到預設成員')
}
</script>

<template>
  <div class="split-bill">
    <div class="main">
      <MemberList
        :members="members"
        :add="bill.addMember"
        :rename="bill.renameMember"
        :remove="bill.removeMember"
        @announce="announce"
      />
      <ExpenseForm :members="members" :editing="editing" @save="onSave" @cancel="editingId = null" />
      <ExpenseList :expenses="expenses" :members="members" :editing-id="editingId" @edit="onEdit" @remove="onRemove" />
      <button type="button" class="reset" @click="onReset">清空重來</button>
    </div>

    <SettlementPanel class="side" :members="members" :balances="balances" :transfers="transfers" @copy="onCopy" />

    <div v-if="pendingUndo" class="toast">
      <span>已刪除「{{ pendingUndo.expense.title }}」</span>
      <button type="button" @click="onUndo">復原</button>
    </div>
    <p class="visually-hidden" role="status">{{ announcement }}</p>
  </div>
</template>

<style scoped>
.split-bill {
  display: grid;
  gap: 1.25rem;
}

@media (min-width: 900px) {
  .split-bill {
    grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
    align-items: start;
  }

  .side {
    position: sticky;
    top: calc(var(--nav-height) + 1rem);
  }
}

.main {
  display: grid;
  gap: 1.25rem;
  min-width: 0;
}

.reset {
  justify-self: start;
  min-height: 2.75rem;
  padding: 0 1rem;
  color: var(--danger);
  border: 1px solid var(--danger);
  border-radius: var(--radius);
  background: var(--bg);
  font: inherit;
  cursor: pointer;
}

.toast {
  position: fixed;
  bottom: calc(1rem + env(safe-area-inset-bottom, 0px));
  left: 50%;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 1rem;
  max-width: calc(100vw - 2rem);
  padding: 0.5rem 0.5rem 0.5rem 1rem;
  color: var(--bg);
  border-radius: var(--radius-lg);
  background: var(--text-h);
  box-shadow: 0 4px 16px rgb(0 0 0 / 0.2);
  transform: translateX(-50%);
}

.toast button {
  min-height: 2.75rem;
  padding: 0 1rem;
  color: var(--text-h);
  border: 0;
  border-radius: var(--radius);
  background: var(--bg);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}
</style>
