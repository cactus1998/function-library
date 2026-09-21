<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import FeatureHeader from '../../components/FeatureHeader.vue'
import CartApp from './components/CartApp.vue'
import ServerControls from './components/ServerControls.vue'
import SideBySide from './components/SideBySide.vue'
import meta from './meta'

type View = 'split' | 'single'

const route = useRoute()
const router = useRouter()

/** iframe 內只渲染購物車本身，不再渲染 iframe，避免無限巢狀 */
const embedded = computed(() => route.query.embed === '1')
const view = computed<View>(() => (route.query.view === 'single' ? 'single' : 'split'))

const embedSrc = computed(() => router.resolve({ path: route.path, query: { embed: '1' } }).href)
const newTabHref = computed(() => router.resolve({ path: route.path, query: { view: 'single' } }).href)

function setView(next: View) {
  void router.replace({ query: next === 'single' ? { view: 'single' } : {} })
}
</script>

<template>
  <div v-if="embedded" class="embedded">
    <CartApp />
  </div>

  <article v-else class="cart-sync-demo container">
    <FeatureHeader :meta="meta" />

    <h2 class="section-title">互動展示</h2>

    <div class="toolbar">
      <div class="views" role="radiogroup" aria-label="展示模式">
        <label>
          <input type="radio" name="view" value="split" :checked="view === 'split'" @change="setView('split')" />
          並排兩個分頁
        </label>
        <label>
          <input type="radio" name="view" value="single" :checked="view === 'single'" @change="setView('single')" />
          單一分頁
        </label>
      </div>
      <a :href="newTabHref" target="_blank" rel="noopener">在新分頁開啟</a>
    </div>

    <SideBySide v-if="view === 'split'" :src="embedSrc" />
    <CartApp v-else />

    <ServerControls class="server" />

    <section class="tips" aria-labelledby="tips-title">
      <h3 id="tips-title">操作方式</h3>
      <ul>
        <li><strong>同步</strong>：在任一分頁加入商品或修改數量，另一個分頁立即更新；同步紀錄可看到每則訊息的 clock。</li>
        <li>
          <strong>衝突</strong>：兩邊都開「模擬離線」，各自修改同一件商品後恢復連線，clock 較大（相同時分頁 id 較大）的一方勝出，兩邊結果一致。
        </li>
        <li><strong>Leader</strong>：標示 Leader 的分頁負責檢查庫存；按「重新載入」關閉它，另一個分頁會接手並立即檢查。</li>
        <li>
          <strong>樂觀更新</strong>：把「USB-C 集線器」加到 3 件（預設庫存 1），畫面先顯示 3，檢查後所有分頁改為 1 並出現通知；把失敗率調高可觀察退避重試。
        </li>
        <li><strong>持久化</strong>：重新整理或開新分頁，購物車內容仍在；<code>localStorage</code> 不可用時只在記憶體同步。</li>
      </ul>
    </section>
  </article>
</template>

<style scoped>
.embedded {
  padding: 0.75rem;
}

.cart-sync-demo {
  padding-top: 1rem;
  padding-bottom: 3rem;
}

.section-title {
  max-width: 760px;
  padding-bottom: 0.3em;
  border-bottom: 1px solid var(--border-strong);
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem 1rem;
  margin-bottom: 1rem;
  font-size: 0.875rem;
}

.views {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 1rem;
}

.views label {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  min-height: 2.75rem;
  cursor: pointer;
}

.views input {
  accent-color: var(--accent-solid);
}

.toolbar a {
  display: inline-flex;
  align-items: center;
  min-height: 2.75rem;
}

.server {
  margin-top: 1.5rem;
}

.tips {
  margin-top: 2rem;
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-subtle);
}

.tips h3 {
  font-size: 0.9375rem;
}

.tips ul {
  display: grid;
  gap: 0.375rem;
  margin: 0;
  padding-left: 1.25rem;
}
</style>
