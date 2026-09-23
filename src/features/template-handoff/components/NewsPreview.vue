<script setup lang="ts">
const { html, loading = false, skeletonCount = 3 } = defineProps<{
  html: string
  loading?: boolean
  skeletonCount?: number
}>()

const emit = defineEmits<{ imageError: [src: string] }>()

/**
 * img 的 error 事件不會冒泡，所以在容器上用捕獲階段監聽，
 * 一個 listener 就能處理 v-html 產生的所有圖片（事件委派）。
 */
function onError(event: Event) {
  const img = event.target
  if (!(img instanceof HTMLImageElement)) return
  const media = img.closest('.news-card__media')
  media?.classList.add('news-card__media--empty')
  img.remove()
  emit('imageError', img.getAttribute('src') ?? '')
}
</script>

<template>
  <div class="news-preview" :aria-busy="loading">
    <ul v-if="loading" class="news-list" aria-label="載入中">
      <li v-for="n in skeletonCount" :key="n" class="news-card skeleton" aria-hidden="true">
        <div class="news-card__media" />
        <div class="news-card__body">
          <span class="line short" />
          <span class="line" />
          <span class="line" />
        </div>
      </li>
    </ul>
    <!-- html 由 renderNewsList 產生，資料已逐欄跳脫 -->
    <div v-else @error.capture="onError" v-html="html" />
  </div>
</template>

<style scoped>
/* v-html 的內容不會帶 scoped 屬性，樣式要用 :deep() */
.news-preview :deep(.news-list) {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 240px), 1fr));
  gap: 1rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.news-preview :deep(.news-card) {
  /* grid 子項預設 min-width: auto，長字串會把欄撐破 */
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--bg);
}

.news-preview :deep(.news-card__link) {
  display: flex;
  flex-direction: column;
  height: 100%;
  color: inherit;
  text-decoration: none;
}

.news-preview :deep(.news-card__link:hover .news-card__title) {
  color: var(--accent);
}

.news-preview :deep(.news-card__media) {
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: var(--surface);
}

.news-preview :deep(.news-card__media img) {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 沒有圖或圖片壞掉：品牌底圖，高度與正常卡片一致 */
.news-preview :deep(.news-card__media--empty) {
  background:
    radial-gradient(circle at 30% 40%, var(--accent-bg) 0 20%, transparent 21%),
    linear-gradient(135deg, var(--surface), var(--bg-subtle));
}

.news-preview :deep(.news-card__body) {
  display: grid;
  /* 預設的 auto 欄寬會被不換行的分類標籤撐開，改成 minmax(0, 1fr) 才會套用省略號 */
  grid-template-columns: minmax(0, 1fr);
  gap: 0.375rem;
  padding: 0.75rem 1rem 1rem;
}

.news-preview :deep(.news-card__meta) {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 0.5rem;
  font-size: 0.75rem;
  color: var(--text-muted);
}

.news-preview :deep(.news-card__category) {
  max-width: 100%;
  padding: 0 0.375rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--accent);
  border-radius: 3px;
  background: var(--accent-bg);
}

.news-preview :deep(.news-card__title),
.news-preview :deep(.news-card__summary) {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  overflow: hidden;
  /* 無空白的長英文、網址也能在任意位置換行 */
  overflow-wrap: anywhere;
}

.news-preview :deep(.news-card__title) {
  margin: 0;
  font-size: 1rem;
  line-height: 1.5;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  border: 0;
  padding: 0;
}

.news-preview :deep(.news-card__summary) {
  font-size: 0.875rem;
  line-height: 1.6;
  color: var(--text-muted);
  -webkit-line-clamp: 3;
  line-clamp: 3;
}

.news-preview :deep(.news-empty) {
  padding: 2.5rem 1rem;
  text-align: center;
  color: var(--text-muted);
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius-lg);
}

/* skeleton 與真實卡片同一套尺寸，載入完成時版面不跳動 */
.news-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 240px), 1fr));
  gap: 1rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.skeleton {
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
}

.skeleton .news-card__media {
  aspect-ratio: 16 / 9;
}

.skeleton .news-card__body {
  display: grid;
  gap: 0.5rem;
  padding: 0.75rem 1rem 1rem;
}

.skeleton .news-card__media,
.line {
  background: linear-gradient(90deg, var(--surface) 0%, var(--bg-subtle) 50%, var(--surface) 100%) 0 0 / 200% 100%;
  animation: shimmer 1.2s linear infinite;
}

.line {
  display: block;
  height: 0.875rem;
  border-radius: 3px;
}

.line.short {
  width: 40%;
  height: 0.75rem;
}

@keyframes shimmer {
  to {
    background-position: -200% 0;
  }
}
</style>
