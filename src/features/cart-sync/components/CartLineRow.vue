<script setup lang="ts">
import { ref, watch } from 'vue'
import type { CartItem } from '../types'
import { formatPrice } from '../utils/format'
import { parseQtyInput, QTY_MAX, QTY_MIN } from '../utils/lww'
import { tabLabel } from '../utils/tab'

const { item, selfTabId } = defineProps<{ item: CartItem; selfTabId: string }>()

const emit = defineEmits<{ change: [qty: number]; remove: [] }>()

const draft = ref(String(item.line.qty))
const editing = ref(false)

// 使用者正在輸入時，遠端更新不覆蓋輸入框；失焦時才依 LWW 寫入新的 clock
watch(
  () => item.line.qty,
  (qty) => {
    if (!editing.value) draft.value = String(qty)
  },
)

function commit() {
  editing.value = false
  const qty = parseQtyInput(draft.value)
  if (qty === null) {
    draft.value = String(item.line.qty)
    return
  }
  draft.value = String(qty)
  if (qty !== item.line.qty) emit('change', qty)
}

function onInput(event: Event) {
  draft.value = (event.target as HTMLInputElement).value
}

function revert(event: KeyboardEvent) {
  editing.value = false
  draft.value = String(item.line.qty)
  const input = event.target as HTMLInputElement
  input.value = draft.value
  input.blur()
}
</script>

<template>
  <li class="row">
    <div class="info">
      <span class="name">{{ item.product.name }}</span>
      <span class="meta">
        {{ formatPrice(item.product.price) }}
        <span v-if="item.line.corrected" class="badge warn">已依庫存調整</span>
        <span v-else-if="item.line.tabId !== selfTabId" class="badge">{{ tabLabel(item.line.tabId) }} 修改</span>
      </span>
    </div>

    <div class="stepper" role="group" :aria-label="`『${item.product.name}』數量`">
      <button
        type="button"
        :disabled="item.line.qty <= QTY_MIN"
        :aria-label="`減少『${item.product.name}』數量`"
        @click="emit('change', item.line.qty - 1)"
      >
        −
      </button>
      <!-- 不用 v-model：type="number" 會自動轉成 number，這裡要保留原始字串自行解析 -->
      <input
        :value="draft"
        type="number"
        inputmode="numeric"
        :min="QTY_MIN"
        :max="QTY_MAX"
        step="1"
        :aria-label="`『${item.product.name}』數量`"
        @input="onInput"
        @focus="editing = true"
        @blur="commit"
        @keydown.enter.prevent="commit"
        @keydown.esc="revert"
      />
      <button
        type="button"
        :disabled="item.line.qty >= QTY_MAX"
        :aria-label="`增加『${item.product.name}』數量`"
        @click="emit('change', item.line.qty + 1)"
      >
        +
      </button>
    </div>

    <span class="subtotal">{{ formatPrice(item.subtotal) }}</span>

    <button type="button" class="remove" :aria-label="`移除『${item.product.name}』`" @click="emit('remove')">
      移除
    </button>
  </li>
</template>

<style scoped>
.row {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 0.5rem 0.75rem;
  padding: 0.625rem 0;
  border-bottom: 1px solid var(--border);
}

.info {
  display: grid;
  grid-column: 1 / -1;
  min-width: 0;
}

.name {
  color: var(--text-h);
}

.meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.8125rem;
  color: var(--text-muted);
}

.badge.warn {
  color: var(--danger);
  background: var(--danger-bg);
}

.stepper {
  display: inline-flex;
  align-items: stretch;
  justify-self: start;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
}

.stepper button {
  width: 2.75rem;
  min-height: 2.75rem;
  font-size: 1rem;
  border: 0;
  background: var(--bg);
  cursor: pointer;
}

.stepper button:disabled {
  color: var(--text-muted);
  cursor: default;
  opacity: 0.5;
}

.stepper input {
  width: 3.5rem;
  text-align: center;
  border: 0;
  border-inline: 1px solid var(--border-strong);
  background: var(--bg);
  font-variant-numeric: tabular-nums;
  appearance: textfield;
}

.stepper input::-webkit-inner-spin-button,
.stepper input::-webkit-outer-spin-button {
  margin: 0;
  appearance: none;
}

.subtotal {
  justify-self: end;
  color: var(--text-h);
  font-variant-numeric: tabular-nums;
}

.remove {
  grid-column: 1 / -1;
  justify-self: end;
  min-height: 2.75rem;
  padding: 0 0.5rem;
  font-size: 0.8125rem;
  color: var(--text-muted);
  border: 0;
  background: none;
  cursor: pointer;
}

.remove:hover {
  color: var(--danger);
}

@container (min-width: 480px) {
  .row {
    grid-template-columns: minmax(0, 1fr) auto 6rem auto;
  }

  .info,
  .remove {
    grid-column: auto;
  }
}
</style>
