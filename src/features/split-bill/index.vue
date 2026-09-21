<script setup lang="ts">
import FeatureHeader from '../../components/FeatureHeader.vue'
import SplitBillApp from './components/SplitBillApp.vue'
import meta from './meta'
</script>

<template>
  <article class="split-bill-demo container">
    <FeatureHeader :meta="meta" />

    <h2 class="section-title">互動展示</h2>
    <SplitBillApp />

    <section class="tips" aria-labelledby="tips-title">
      <h3 id="tips-title">操作方式</h3>
      <ul>
        <li><strong>除不盡</strong>：新增一筆 1000 元三人平分，應付為 334 / 333 / 333，右側差額加總仍為 0。</li>
        <li><strong>算式</strong>：金額輸入 <code>1280+350</code> 或全形的 <code>１２８０＋３５０</code>，下方即時顯示結果。</li>
        <li><strong>份數</strong>：切到「按份數」，大人 2、小孩 1，依比例分配。</li>
        <li><strong>指定金額</strong>：各自輸入金額，加總不等於總額時會顯示還差多少，並停用儲存。</li>
        <li><strong>復原</strong>：刪除帳目後 5 秒內可按「復原」；重新整理頁面資料仍在。</li>
      </ul>
    </section>
  </article>
</template>

<style scoped>
.split-bill-demo {
  padding-top: 1rem;
  padding-bottom: 5rem;
}

.section-title {
  max-width: 760px;
  padding-bottom: 0.3em;
  border-bottom: 1px solid var(--border-strong);
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
