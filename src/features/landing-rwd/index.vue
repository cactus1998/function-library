<script setup lang="ts">
import FeatureHeader from '../../components/FeatureHeader.vue'
import DesignSpec from './components/DesignSpec.vue'
import ViewportSimulator from './components/ViewportSimulator.vue'
import meta from './meta'
</script>

<template>
  <article class="landing-demo container">
    <FeatureHeader :meta="meta" />

    <h2 class="section-title">互動展示</h2>
    <ViewportSimulator />

    <section class="tips" aria-labelledby="tips-title">
      <h3 id="tips-title">操作方式</h3>
      <ul>
        <li><strong>斷點</strong>：拖動寬度滑桿經過 640px 與 1024px，看漢堡選單、商品欄數（1／2／4）與 Hero 左右排版如何切換。</li>
        <li><strong>流體字級</strong>：在 375px 到 1440px 之間拖動，Hero 標題平滑放大，到 32px／60px 就停住。</li>
        <li><strong>格線</strong>：打開「格線疊圖」，內容邊緣應該貼齊紅色欄線；欄數依斷點變成 4／8／12。</li>
        <li><strong>設計稿比對</strong>：上傳一張設計稿，選「差異」混合模式，對齊的地方會變黑，偏移的地方會出現亮邊。</li>
        <li><strong>漢堡選單</strong>：寬度調到手機，用 Tab 移到選單按鈕，按 Enter 展開、Esc 收合，焦點回到按鈕。</li>
      </ul>
    </section>

    <DesignSpec />
  </article>
</template>

<style scoped>
.landing-demo {
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
