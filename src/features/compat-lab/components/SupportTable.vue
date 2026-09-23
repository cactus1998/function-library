<script setup lang="ts">
import { computed, onMounted, shallowRef } from 'vue'
import { DETECTIONS, type DetectionKind } from '../data/detections'

interface Row {
  id: string
  name: string
  kind: DetectionKind
  caniuse: string
  fallback: string
  supported: boolean
}

const rows = shallowRef<Row[]>([])
const kindFilter = shallowRef<DetectionKind | 'all'>('all')
const userAgent = shallowRef('')

/** 量測需要 document.body，放在 mounted 之後執行 */
onMounted(() => {
  rows.value = DETECTIONS.map((d) => {
    let supported = false
    try {
      supported = d.test()
    } catch {
      supported = false
    }
    return { id: d.id, name: d.name, kind: d.kind, caniuse: d.caniuse, fallback: d.fallback, supported }
  })
  userAgent.value = navigator.userAgent
})

const visibleRows = computed(() => (kindFilter.value === 'all' ? rows.value : rows.value.filter((r) => r.kind === kindFilter.value)))
const supportedCount = computed(() => rows.value.filter((r) => r.supported).length)
</script>

<template>
  <section class="support" aria-labelledby="support-title">
    <div class="head">
      <h3 id="support-title">目前瀏覽器的功能偵測</h3>
      <label>
        類型
        <select v-model="kindFilter">
          <option value="all">全部</option>
          <option value="CSS">CSS</option>
          <option value="HTML">HTML</option>
          <option value="JS">JS</option>
        </select>
      </label>
    </div>

    <p class="summary">
      <template v-if="rows.length">支援 {{ supportedCount }} / {{ rows.length }} 項。</template>
      判斷依據是實際偵測（<code>CSS.supports()</code>、<code>'x' in window</code>、排版量測），不是 User-Agent 字串。
    </p>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th scope="col">功能</th>
            <th scope="col">類型</th>
            <th scope="col">結果</th>
            <th scope="col">不支援時的做法</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in visibleRows" :key="row.id">
            <th scope="row">
              <a :href="`https://caniuse.com/${row.caniuse}`" target="_blank" rel="noopener noreferrer">{{ row.name }}</a>
            </th>
            <td>{{ row.kind }}</td>
            <td>
              <span class="result" :class="row.supported ? 'yes' : 'no'">{{ row.supported ? '支援' : '不支援' }}</span>
            </td>
            <td>{{ row.fallback }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <details class="ua">
      <summary>User-Agent（僅供參考）</summary>
      <p><code>{{ userAgent }}</code></p>
      <p>UA 可以偽造，而且同一版本的瀏覽器在不同平台支援度不同，所以只用來回報問題，不用來決定載入哪套樣式。</p>
    </details>
  </section>
</template>

<style scoped>
.support {
  font-size: 0.875rem;
}

.head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.head h3 {
  margin: 0;
}

select {
  margin-left: 0.25rem;
  padding: 0.125rem 0.25rem;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  background: var(--bg);
}

.summary {
  margin: 0.5rem 0;
  color: var(--text-muted);
}

.table-wrap {
  max-height: 420px;
  overflow: auto;
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

table {
  width: 100%;
  font-size: 0.8125rem;
  border-collapse: collapse;
}

th,
td {
  padding: 0.375rem 0.625rem;
  text-align: left;
  border-bottom: 1px solid var(--border);
}

thead th {
  position: sticky;
  top: 0;
  z-index: 1;
  white-space: nowrap;
  color: var(--text-muted);
  background: var(--surface);
}

tbody th {
  font-weight: 500;
  white-space: nowrap;
}

.result {
  display: inline-block;
  padding: 0 0.375rem;
  font-size: 0.75rem;
  white-space: nowrap;
  border-radius: 3px;
}

.yes {
  color: var(--info);
  background: var(--info-bg);
}

.no {
  color: var(--danger);
  background: var(--danger-bg);
}

.ua {
  margin-top: 0.5rem;
}

.ua summary {
  cursor: pointer;
  color: var(--text-muted);
}

.ua p {
  margin-top: 0.375rem;
  overflow-wrap: anywhere;
}
</style>
