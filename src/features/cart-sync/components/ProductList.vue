<script setup lang="ts">
import type { Product } from '../types'
import { QTY_MAX } from '../utils/lww'
import { formatPrice } from '../utils/format'

const { products, quantities } = defineProps<{
  products: readonly Product[]
  /** 各商品目前在購物車中的數量 */
  quantities: Readonly<Record<string, number>>
}>()

const emit = defineEmits<{ add: [productId: string] }>()
</script>

<template>
  <section class="products" aria-labelledby="products-title">
    <h3 id="products-title">商品</h3>
    <ul>
      <li v-for="product in products" :key="product.id">
        <div class="info">
          <span class="name">{{ product.name }}</span>
          <span class="price">{{ formatPrice(product.price) }}</span>
        </div>
        <button
          type="button"
          :disabled="(quantities[product.id] ?? 0) >= QTY_MAX"
          :aria-label="`加入『${product.name}』`"
          @click="emit('add', product.id)"
        >
          加入<span v-if="quantities[product.id]" class="in-cart">（已有 {{ quantities[product.id] }}）</span>
        </button>
      </li>
    </ul>
  </section>
</template>

<style scoped>
h3 {
  font-size: 0.9375rem;
}

ul {
  display: grid;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg);
}

.info {
  display: grid;
  min-width: 0;
}

.name {
  overflow: hidden;
  color: var(--text-h);
  white-space: nowrap;
  text-overflow: ellipsis;
}

.price {
  font-size: 0.8125rem;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}

button {
  flex-shrink: 0;
  min-height: 2.75rem;
  padding: 0 0.75rem;
  font-size: 0.875rem;
  color: var(--on-accent);
  border: 0;
  border-radius: var(--radius);
  background: var(--accent-solid);
  cursor: pointer;
}

button:hover:not(:disabled) {
  background: var(--accent-solid-hover);
}

button:disabled {
  cursor: default;
  opacity: 0.5;
}

.in-cart {
  font-size: 0.75rem;
}
</style>
