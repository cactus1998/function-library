<script setup lang="ts">
import type { ListStatus } from '../composables/useMessages'
import type { MessagePage, Topic } from '../types'

const { data, status, error, retryNote, page, totalPages } = defineProps<{
  data: MessagePage | null
  status: ListStatus
  error: string
  retryNote: string
  page: number
  totalPages: number
}>()

const emit = defineEmits<{ goTo: [page: number]; reload: [] }>()

const TOPIC_LABEL: Record<Topic, string> = {
  order: '訂單問題',
  wholesale: '企業採購',
  feedback: '意見回饋',
  other: '其他',
}

const timeFormat = new Intl.DateTimeFormat('zh-TW', { dateStyle: 'medium', timeStyle: 'short' })

function topicLabel(topic: string): string {
  return topic in TOPIC_LABEL ? TOPIC_LABEL[topic as Topic] : topic
}
</script>

<template>
  <section class="messages" aria-labelledby="messages-title">
    <div class="head">
      <h3 id="messages-title">最新留言</h3>
      <button type="button" class="btn" :disabled="status === 'loading'" @click="emit('reload')">重新整理</button>
    </div>

    <p class="status" role="status">
      <template v-if="status === 'loading'">{{ retryNote || '載入中…' }}</template>
      <template v-else-if="status === 'success' && data">共 {{ data.total }} 則，第 {{ page }} / {{ totalPages }} 頁</template>
    </p>

    <div v-if="status === 'error'" class="callout danger" role="alert">
      <p>{{ error }}</p>
      <button type="button" class="btn" @click="emit('reload')">重試</button>
    </div>

    <p v-else-if="status === 'success' && data && data.items.length === 0" class="empty">這一頁沒有留言。</p>

    <ul v-if="data && status !== 'error'" class="list" :class="{ stale: status === 'loading' }">
      <li v-for="item in data.items" :key="item.id" class="item">
        <p class="meta">
          <span class="badge">{{ topicLabel(item.topic) }}</span>
          <strong>{{ item.name }}</strong>
          <time :datetime="item.createdAt">{{ timeFormat.format(new Date(item.createdAt)) }}</time>
        </p>
        <p class="body">{{ item.message }}</p>
      </li>
    </ul>

    <nav v-if="data && data.total > 0" class="pager" aria-label="留言分頁">
      <button type="button" class="btn" :disabled="page <= 1" @click="emit('goTo', page - 1)">上一頁</button>
      <button
        v-for="n in totalPages"
        :key="n"
        type="button"
        class="btn num"
        :aria-current="n === page ? 'page' : undefined"
        @click="emit('goTo', n)"
      >
        {{ n }}
      </button>
      <button type="button" class="btn" :disabled="page >= totalPages" @click="emit('goTo', page + 1)">下一頁</button>
    </nav>
  </section>
</template>

<style scoped>
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.head h3 {
  margin: 0;
  font-size: 1.0625rem;
}

.status {
  min-height: 1.5em;
  margin: 0.25rem 0 0.5rem;
  font-size: 0.8125rem;
  color: var(--text-muted);
}

.list {
  display: grid;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
  transition: opacity 0.2s;
}

/* 載入中保留舊資料並淡化，列表高度不變 */
.stale {
  opacity: 0.45;
}

.item {
  padding: 0.625rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem 0.5rem;
  font-size: 0.8125rem;
}

.meta time {
  color: var(--text-muted);
}

.body {
  margin-top: 0.25rem;
  font-size: 0.875rem;
  overflow-wrap: anywhere;
}

.empty {
  padding: 1.5rem;
  text-align: center;
  color: var(--text-muted);
}

.callout {
  display: grid;
  gap: 0.5rem;
  justify-items: start;
}

.pager {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-top: 0.75rem;
}

.btn {
  min-height: 2rem;
  padding: 0 0.625rem;
  font-size: 0.8125rem;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  background: var(--bg);
  cursor: pointer;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.num {
  min-width: 2rem;
}

.num[aria-current='page'] {
  color: var(--on-accent);
  border-color: var(--accent-solid);
  background: var(--accent-solid);
}
</style>
