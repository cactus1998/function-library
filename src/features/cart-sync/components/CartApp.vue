<script setup lang="ts">
import { computed } from 'vue'
import { useCartAnnouncer } from '../composables/useCartAnnouncer'
import { useCartSession } from '../composables/useCartSession'
import { useLeaderElection } from '../composables/useLeaderElection'
import { useStockValidation } from '../composables/useStockValidation'
import { PRODUCTS } from '../data/products'
import { getSyncHandle } from '../plugins/syncPlugin'
import { createMockServer } from '../services/mockServer'
import CartPanel from './CartPanel.vue'
import ProductList from './ProductList.vue'
import SyncLog from './SyncLog.vue'
import TabStatusBar from './TabStatusBar.vue'

const LEADER_LOCK = 'cart-sync-leader'

const store = useCartSession()
const { transport, persistent, online: syncOnline, log, setOnline } = getSyncHandle(store)
const { isLeader, supported: locksSupported } = useLeaderElection(LEADER_LOCK)
const { status, attempt, lastError, active, check } = useStockValidation(store, createMockServer(), {
  isLeader,
  locksSupported,
})
const { message, notices, dismiss } = useCartAnnouncer(store)

const online = computed({
  get: () => syncOnline.value,
  set: setOnline,
})

const quantities = computed(() =>
  Object.fromEntries(store.items.map(({ product, line }) => [product.id, line.qty])),
)
</script>

<template>
  <section class="cart-app" aria-label="購物車 demo">
    <TabStatusBar
      v-model:online="online"
      :tab-id="store.tabId"
      :clock="store.clock"
      :is-leader="isLeader"
      :locks-supported="locksSupported"
      :transport="transport"
      :persistent="persistent"
      :status="status"
      :attempt="attempt"
      :last-error="lastError"
      :validating="active"
      @check="check"
    />

    <ul v-if="notices.length > 0" class="notices">
      <li v-for="notice in notices" :key="notice.id" class="callout danger">
        <span>{{ notice.text }}</span>
        <button type="button" aria-label="關閉通知" @click="dismiss(notice.id)">×</button>
      </li>
    </ul>

    <div class="layout">
      <ProductList :products="PRODUCTS" :quantities="quantities" @add="store.add" />
      <CartPanel
        :items="store.items"
        :total-count="store.totalCount"
        :total-price="store.totalPrice"
        :self-tab-id="store.tabId"
        @change="store.setQty"
        @remove="store.remove"
        @clear="store.clear"
      />
    </div>

    <SyncLog :entries="log" />

    <p class="visually-hidden" aria-live="polite" aria-atomic="true">{{ message }}</p>
  </section>
</template>

<style scoped>
.cart-app {
  display: grid;
  gap: 0.75rem;
  container-type: inline-size;
}

.notices {
  display: grid;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.notices li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding-block: 0.25rem;
}

.notices button {
  width: 2.75rem;
  height: 2.75rem;
  flex-shrink: 0;
  font-size: 1.125rem;
  color: inherit;
  border: 0;
  background: none;
  cursor: pointer;
}

.layout {
  display: grid;
  gap: 0.75rem;
  align-items: start;
}

@container (min-width: 720px) {
  .layout {
    grid-template-columns: minmax(0, 2fr) minmax(0, 3fr);
  }
}
</style>
