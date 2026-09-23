<script setup lang="ts">
import FeatureHeader from '../../components/FeatureHeader.vue'
import HandoffApp from './components/HandoffApp.vue'
import meta from './meta'
</script>

<template>
  <article class="handoff-demo container">
    <FeatureHeader :meta="meta" />

    <h2 class="section-title">互動展示</h2>
    <HandoffApp />

    <section class="tips" aria-labelledby="tips-title">
      <h3 id="tips-title">操作方式</h3>
      <ul>
        <li><strong>超長文字</strong>：標題截成兩行、摘要截成三行；沒有空白的英文與網址也會換行，卡片寬度不被撐開。</li>
        <li><strong>圖片載入失敗</strong>：第一張是 404，執行期才發現，會出現在資料檢查的「執行期」項目；第二張網址格式錯誤，產生 HTML 時就換成底圖。</li>
        <li><strong>不安全內容</strong>：展開「輸出 HTML」，可以看到 &lt; 變成 <code>&amp;lt;</code>、<code>javascript:</code> 連結變成 <code>#</code>。</li>
        <li><strong>載入中</strong>：勾選後顯示 skeleton，取消勾選時卡片位置與高度不變。</li>
        <li><strong>交接</strong>：「交接模板」可以直接複製給後端，欄位規格表說明每個欄位缺值時前端的處理方式。</li>
      </ul>
    </section>
  </article>
</template>

<style scoped>
.handoff-demo {
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
