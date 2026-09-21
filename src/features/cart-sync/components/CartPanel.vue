<script setup lang="ts">
import type { CartItem } from '../types'
import { formatPrice } from '../utils/format'
import CartLineRow from './CartLineRow.vue'

const { items, totalCount, totalPrice, selfTabId } = defineProps<{
  items: readonly CartItem[]
  totalCount: number
  totalPrice: number
  selfTabId: string
}>()

const emit = defineEmits<{
  change: [productId: string, qty: number]
  remove: [productId: string]
  clear: []
}>()
</script>

<template>
  <section class="cart" aria-labelledby="cart-title">
    <div class="head">
      <h3 id="cart-title">購物車</h3>
      <button v-if="items.length > 0" type="button" class="clear" @click="emit('clear')">清空</button>
    </div>

    <p v-if="items.length === 0" class="empty">購物車是空的，從左側加入商品。</p>
    <ul v-else>
      <CartLineRow
        v-for="item in items"
        :key="item.product.id"
        :item="item"
        :self-tab-id="selfTabId"
        @change="(qty) => emit('change', item.product.id, qty)"
        @remove="emit('remove', item.product.id)"
      />
    </ul>

    <dl class="totals">
      <div>
        <dt>件數</dt>
        <dd>{{ totalCount }}</dd>
      </div>
      <div>
        <dt>總金額</dt>
        <dd class="total">{{ formatPrice(totalPrice) }}</dd>
      </div>
    </dl>
  </section>
</template>

<style scoped>
.cart {
  container-type: inline-size;
  padding: 0.75rem 1rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg);
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

h3 {
  font-size: 0.9375rem;
}

.clear {
  min-height: 2.75rem;
  padding: 0 0.5rem;
  font-size: 0.8125rem;
  color: var(--text-muted);
  border: 0;
  background: none;
  cursor: pointer;
}

.clear:hover {
  color: var(--danger);
}

.empty {
  margin: 1.5rem 0;
  font-size: 0.875rem;
  color: var(--text-muted);
  text-align: center;
}

ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.totals {
  display: flex;
  justify-content: flex-end;
  gap: 1.5rem;
  margin: 0.75rem 0 0;
}

.totals div {
  display: flex;
  align-items: baseline;
  gap: 0.375rem;
}

dt {
  font-size: 0.8125rem;
  color: var(--text-muted);
}

dd {
  margin: 0;
  color: var(--text-h);
  font-variant-numeric: tabular-nums;
}

.total {
  font-size: 1.125rem;
  font-weight: 600;
}
</style>
