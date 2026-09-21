<script setup lang="ts">
import FeatureHeader from '../../components/FeatureHeader.vue'
import AvatarCropperApp from './components/AvatarCropperApp.vue'
import meta from './meta'
</script>

<template>
  <article class="avatar-demo container">
    <FeatureHeader :meta="meta" />

    <h2 class="section-title">互動展示</h2>
    <AvatarCropperApp />

    <section class="tips" aria-labelledby="tips-title">
      <h3 id="tips-title">操作方式</h3>
      <ul>
        <li><strong>選圖</strong>：按「選擇照片」、把照片拖進框內，或複製圖片後在頁面按 Ctrl+V。</li>
        <li><strong>裁切</strong>：拖曳移動、滾輪或雙指縮放；圖片怎麼拖都不會露出空白。Tab 到裁切框後可用方向鍵與 + / −。</li>
        <li><strong>壓縮</strong>：按「完成裁切」後可看到輸出格式、品質與大小，和原始檔比較。</li>
        <li><strong>上傳</strong>：上傳中可取消；把失敗率調到 100% 可看到失敗與重試。</li>
      </ul>
    </section>
  </article>
</template>

<style scoped>
.avatar-demo {
  padding-top: 1rem;
  padding-bottom: 3rem;
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
