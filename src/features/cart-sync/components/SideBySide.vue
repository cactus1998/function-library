<script setup lang="ts">
import { ref } from 'vue'

const { src } = defineProps<{ src: string }>()

/** 換 key 會重建 iframe，等同關閉分頁再開新分頁（leader 交接、新分頁 sync-request） */
const frames = ref([
  { id: 1, version: 0 },
  { id: 2, version: 0 },
])

function reload(id: number) {
  frames.value = frames.value.map((frame) => (frame.id === id ? { ...frame, version: frame.version + 1 } : frame))
}
</script>

<template>
  <div class="side-by-side">
    <figure v-for="frame in frames" :key="frame.id" class="frame">
      <figcaption>
        <span>分頁 {{ frame.id }}</span>
        <button type="button" @click="reload(frame.id)">重新載入分頁 {{ frame.id }}</button>
      </figcaption>
      <iframe :key="frame.version" :src="src" :title="`分頁 ${frame.id}`"></iframe>
    </figure>
  </div>
</template>

<style scoped>
.side-by-side {
  display: grid;
  gap: 1rem;
}

.frame {
  display: grid;
  margin: 0;
  overflow: hidden;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-lg);
}

figcaption {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0 0.25rem 0 0.75rem;
  font-size: 0.8125rem;
  color: var(--text-muted);
  border-bottom: 1px solid var(--border);
  background: var(--surface);
}

button {
  min-height: 2.75rem;
  padding: 0 0.5rem;
  font-size: 0.8125rem;
  color: var(--text);
  border: 0;
  background: none;
  cursor: pointer;
}

button:hover {
  color: var(--accent);
}

iframe {
  width: 100%;
  height: 480px;
  border: 0;
  background: var(--bg);
}

@media (min-width: 960px) {
  .side-by-side {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  iframe {
    height: 720px;
  }
}
</style>
