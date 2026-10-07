<script setup lang="ts">
import { computed, onUnmounted, shallowRef, watch } from 'vue'
import { FIELD_SPECS, SCENARIOS, TEMPLATE_SNIPPET } from '../data/scenarios'
import type { ScenarioId } from '../types'
import { renderNewsList } from '../utils/renderNewsList'
import { validateNews } from '../utils/validateNews'
import NewsPreview from './NewsPreview.vue'

const scenarioId = shallowRef<ScenarioId>('normal')
const loading = shallowRef(false)
const brokenImages = shallowRef<string[]>([])

const scenario = computed(() => SCENARIOS.find((s) => s.id === scenarioId.value) ?? SCENARIOS[0]!)
const html = computed(() => renderNewsList(scenario.value.items))
const json = computed(() => JSON.stringify(scenario.value.items, null, 2))
const issues = computed(() => validateNews(scenario.value.items))

watch(scenarioId, () => {
  brokenImages.value = []
})

function onImageError(src: string) {
  brokenImages.value = [...brokenImages.value, src]
}

type CopyTarget = 'html' | 'json' | 'template'
const copied = shallowRef<CopyTarget | null>(null)
const copyFailed = shallowRef(false)
let copiedTimer = 0

async function copy(target: CopyTarget) {
  const text = target === 'html' ? html.value : target === 'json' ? json.value : TEMPLATE_SNIPPET
  window.clearTimeout(copiedTimer)
  try {
    await navigator.clipboard.writeText(text)
    copyFailed.value = false
    copied.value = target
  } catch {
    // 非 HTTPS 或使用者拒絕剪貼簿權限
    copyFailed.value = true
    copied.value = target
  }
  copiedTimer = window.setTimeout(() => (copied.value = null), 2000)
}

onUnmounted(() => window.clearTimeout(copiedTimer))

function copyLabel(target: CopyTarget) {
  if (copied.value !== target) return '複製'
  return copyFailed.value ? '複製失敗，請手動選取' : '已複製'
}

function shortSrc(src: string) {
  return src.length > 60 ? `${src.slice(0, 57)}…` : src
}
</script>

<template>
  <div class="handoff">
    <fieldset class="scenarios">
      <legend>資料情境</legend>
      <div class="scenario-list">
        <label v-for="s in SCENARIOS" :key="s.id" class="scenario">
          <input v-model="scenarioId" type="radio" name="handoff-scenario" :value="s.id" />
          <span>{{ s.label }}</span>
        </label>
      </div>
      <label class="loading-toggle">
        <input v-model="loading" type="checkbox" />
        模擬載入中（skeleton）
      </label>
    </fieldset>

    <p class="scenario-desc" aria-live="polite">{{ scenario.description }}</p>

    <NewsPreview :html="html" :loading="loading" @image-error="onImageError" />

    <section class="report" aria-labelledby="report-title">
      <h3 id="report-title">資料檢查（交給後端的回饋）</h3>
      <p v-if="issues.length === 0 && brokenImages.length === 0" class="ok">資料符合交接規格，沒有需要處理的問題。</p>
      <ul v-else class="issues">
        <li v-for="(issue, i) in issues" :key="`${issue.itemId}-${issue.field}-${i}`" :class="issue.level">
          <span class="level">{{ issue.level === 'error' ? '錯誤' : '提醒' }}</span>
          <code>{{ issue.itemId }}.{{ issue.field }}</code>
          {{ issue.message }}
        </li>
        <li v-for="(src, i) in brokenImages" :key="`img-${i}`" class="error">
          <span class="level">執行期</span>
          圖片載入失敗 <code>{{ shortSrc(src) }}</code>，已換成預設底圖
        </li>
      </ul>
    </section>

    <div class="code-panels">
      <details open>
        <summary>輸出 HTML（後端可直接輸出這段）</summary>
        <button type="button" class="copy" @click="copy('html')">{{ copyLabel('html') }}</button>
        <pre><code>{{ html }}</code></pre>
      </details>
      <details>
        <summary>API 回傳 JSON</summary>
        <button type="button" class="copy" @click="copy('json')">{{ copyLabel('json') }}</button>
        <pre><code>{{ json }}</code></pre>
      </details>
      <details>
        <summary>交接模板（給後端套版）</summary>
        <button type="button" class="copy" @click="copy('template')">{{ copyLabel('template') }}</button>
        <pre><code>{{ TEMPLATE_SNIPPET }}</code></pre>
      </details>
    </div>

    <section class="spec" aria-labelledby="spec-title">
      <h3 id="spec-title">欄位規格</h3>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">欄位</th>
              <th scope="col">型別</th>
              <th scope="col">必填</th>
              <th scope="col">規則</th>
              <th scope="col">缺值或異常時</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="f in FIELD_SPECS" :key="f.field">
              <th scope="row"><code>{{ f.field }}</code></th>
              <td>{{ f.type }}</td>
              <td>{{ f.required ? '是' : '否' }}</td>
              <td>{{ f.rule }}</td>
              <td>{{ f.whenMissing }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<style scoped>
.handoff {
  display: grid;
  /* 預設 auto 欄寬會被 <pre> 的長行撐開整頁，改成 minmax(0, 1fr) 讓 <pre> 自己捲動 */
  grid-template-columns: minmax(0, 1fr);
  gap: 1rem;
}

.scenarios {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem 1.5rem;
  margin: 0;
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-subtle);
}

legend {
  padding: 0 0.25rem;
  font-weight: 600;
}

.scenario-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.scenario {
  position: relative;
}

.scenario input {
  position: absolute;
  opacity: 0;
}

.scenario span {
  display: inline-block;
  padding: 0.25rem 0.625rem;
  font-size: 0.8125rem;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  background: var(--bg);
  cursor: pointer;
}

.scenario input:checked + span {
  color: var(--on-accent);
  border-color: var(--accent-solid);
  background: var(--accent-solid);
}

.scenario input:focus-visible + span {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.scenario-desc {
  font-size: 0.875rem;
  color: var(--text-muted);
}

.report {
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.report h3 {
  font-size: 0.9375rem;
}

.ok {
  color: var(--text-muted);
}

.issues {
  display: grid;
  gap: 0.375rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.issues li {
  overflow-wrap: anywhere;
}

.level {
  display: inline-block;
  margin-right: 0.375rem;
  padding: 0 0.375rem;
  font-size: 0.75rem;
  border-radius: 3px;
}

.error .level {
  color: var(--danger);
  background: var(--danger-bg);
}

.warning .level {
  color: var(--info);
  background: var(--info-bg);
}

.code-panels {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 0.5rem;
}

details {
  position: relative;
  font-size: 0.875rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

summary {
  padding: 0.5rem 1rem;
  padding-right: 7rem;
  cursor: pointer;
}

.copy {
  position: absolute;
  top: 0.375rem;
  right: 0.5rem;
  padding: 0.125rem 0.5rem;
  font-size: 0.75rem;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  background: var(--bg);
  cursor: pointer;
}

pre {
  max-height: 360px;
  margin: 0;
  padding: 0.75rem 1rem;
  overflow: auto;
  font-size: 0.75rem;
  line-height: 1.6;
  border-top: 1px solid var(--border);
  background: var(--code-bg);
}

pre code {
  padding: 0;
  background: none;
}

.spec h3 {
  font-size: 0.9375rem;
}

.table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  font-size: 0.8125rem;
  border-collapse: collapse;
}

th,
td {
  padding: 0.375rem 0.5rem;
  text-align: left;
  vertical-align: top;
  border-bottom: 1px solid var(--border);
}

thead th {
  font-weight: 600;
  white-space: nowrap;
  color: var(--text-muted);
}

tbody th {
  font-weight: 500;
}
</style>
