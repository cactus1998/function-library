<script setup lang="ts">
import { useServerState } from '../composables/useServerState'
import { PRODUCTS } from '../data/products'
import { FAILURE_RATE_MAX, STOCK_MAX } from '../services/mockServer'

const { state, setStock, setFailureRate, reset } = useServerState()

function onStockChange(productId: string, event: Event) {
  const value = Number((event.target as HTMLInputElement).value)
  if (Number.isFinite(value)) setStock(productId, value)
}

function onFailureRateInput(event: Event) {
  setFailureRate(Number((event.target as HTMLInputElement).value) / 100)
}
</script>

<template>
  <section class="server" aria-labelledby="server-title">
    <div class="head">
      <h3 id="server-title">模擬後端</h3>
      <button type="button" @click="reset">重設</button>
    </div>
    <p class="hint">
      設定存在 <code>localStorage</code>，所有分頁共用。修改後 leader 分頁會重新檢查購物車；回應延遲 300–800ms。
    </p>

    <label class="rate">
      <span>失敗率 {{ Math.round(state.failureRate * 100) }}%</span>
      <input
        type="range"
        min="0"
        :max="FAILURE_RATE_MAX * 100"
        step="5"
        :value="Math.round(state.failureRate * 100)"
        @input="onFailureRateInput"
      />
    </label>

    <fieldset>
      <legend>庫存（0–{{ STOCK_MAX }}）</legend>
      <div class="stock">
        <label v-for="product in PRODUCTS" :key="product.id">
          <span>{{ product.name }}</span>
          <input
            type="number"
            inputmode="numeric"
            min="0"
            :max="STOCK_MAX"
            :value="state.stock[product.id]"
            @change="onStockChange(product.id, $event)"
          />
        </label>
      </div>
    </fieldset>
  </section>
</template>

<style scoped>
.server {
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-subtle);
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

h3 {
  font-size: 0.9375rem;
}

.hint {
  font-size: 0.8125rem;
  color: var(--text-muted);
}

button {
  min-height: 2.75rem;
  padding: 0 0.75rem;
  color: var(--text);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  background: var(--bg);
  cursor: pointer;
}

.rate {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.rate span {
  min-width: 6rem;
  font-variant-numeric: tabular-nums;
}

.rate input {
  flex: 1;
  min-width: 10rem;
  min-height: 2.75rem;
  accent-color: var(--accent-solid);
}

fieldset {
  margin: 0;
  padding: 0;
  border: 0;
}

legend {
  margin-bottom: 0.5rem;
}

.stock {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
  gap: 0.5rem;
}

.stock label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.stock input {
  width: 4rem;
  min-height: 2.75rem;
  padding: 0 0.375rem;
  text-align: right;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  background: var(--bg);
  font-variant-numeric: tabular-nums;
}
</style>
