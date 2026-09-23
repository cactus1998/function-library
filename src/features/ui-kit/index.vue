<script setup lang="ts">
import FeatureHeader from '../../components/FeatureHeader.vue'
import DemoBlock from './components/DemoBlock.vue'
import FaqAccordion from './components/FaqAccordion.vue'
import ImageCarousel from './components/ImageCarousel.vue'
import ProductTabs from './components/ProductTabs.vue'
import SiteShell from './components/SiteShell.vue'
import { SNIPPETS } from './data/snippets'
import meta from './meta'
</script>

<template>
  <article class="ui-kit-demo container">
    <FeatureHeader :meta="meta" />

    <h2 class="section-title">互動展示</h2>

    <div class="blocks">
      <DemoBlock title="輪播" :snippet="SNIPPETS.carousel">
        <template #description>
          手機可以直接滑動，桌機可用按鈕或觸控板。滑鼠移入或 Tab 進入時自動播放會暫停。
        </template>
        <ImageCarousel />
      </DemoBlock>

      <DemoBlock title="手風琴（FAQ）" :snippet="SNIPPETS.accordion">
        <template #description>原生 <code>&lt;details&gt;</code>，一次只展開一題。用 Tab 移動、Enter 或空白鍵開合。</template>
        <FaqAccordion />
      </DemoBlock>

      <DemoBlock title="頁籤" :snippet="SNIPPETS.tabs">
        <template #description>Tab 進入後用 ← → 切換，Home／End 跳到第一個或最後一個。</template>
        <ProductTabs />
      </DemoBlock>

      <DemoBlock title="漢堡選單、sticky header、回到頂部" :snippet="SNIPPETS.shell">
        <template #description>
          在下方模擬網頁中捲動。視窗寬度小於 720px 時顯示漢堡選單，可以按 Esc 或點選單外面關閉。
        </template>
        <SiteShell />
      </DemoBlock>
    </div>
  </article>
</template>

<style scoped>
.ui-kit-demo {
  padding-top: 1rem;
  padding-bottom: 5rem;
}

.section-title {
  max-width: 760px;
  padding-bottom: 0.3em;
  border-bottom: 1px solid var(--border-strong);
}

.blocks {
  display: grid;
  gap: 1.25rem;
}
</style>
