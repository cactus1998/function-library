<script setup lang="ts">
import FeatureHeader from '../../components/FeatureHeader.vue'
import CompatCases from './components/CompatCases.vue'
import SupportTable from './components/SupportTable.vue'
import meta from './meta'
</script>

<template>
  <article class="compat-demo container">
    <FeatureHeader :meta="meta" />

    <h2 class="section-title">互動展示</h2>
    <SupportTable />

    <h2 class="section-title cases-title">常見相容性問題</h2>
    <CompatCases />

    <section class="tips" aria-labelledby="tips-title">
      <h3 id="tips-title">操作方式與查找流程</h3>
      <ul>
        <li><strong>強制 fallback</strong>：在每個案例勾選「模擬不支援」，右側改走舊瀏覽器的寫法，外觀應該與原生寫法一致。</li>
        <li><strong>換瀏覽器比較</strong>：用 Safari、Firefox 或手機開同一頁，上方偵測表的結果會不同，案例會自動走對應的路徑。</li>
        <li><strong>查找流程</strong>：先在 Can I Use 查支援度（表格中的功能名稱可以直接點過去），再依專案要支援的瀏覽器決定是否需要 fallback，最後用 BrowserStack 或實機驗證。</li>
        <li><strong>前綴</strong>：<code>-webkit-</code> 等前綴交給 Autoprefixer 依 <code>browserslist</code> 自動補，不要手寫。</li>
      </ul>
    </section>
  </article>
</template>

<style scoped>
.compat-demo {
  padding-top: 1rem;
  padding-bottom: 5rem;
}

.section-title {
  max-width: 760px;
  padding-bottom: 0.3em;
  border-bottom: 1px solid var(--border-strong);
}

.cases-title {
  margin-top: 2.5rem;
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
