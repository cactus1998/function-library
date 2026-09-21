<script setup lang="ts">
import { computed, markRaw, reactive, ref, useTemplateRef } from 'vue'
import { useRouter } from 'vue-router'
import FeatureHeader from '../../components/FeatureHeader.vue'
import CommandPalette from './components/CommandPalette.vue'
import { useRecentCommands } from './composables/useRecentCommands'
import { useShortcuts } from './composables/useShortcuts'
import type { Command, CommandSource, ShortcutBinding } from './types'
import { generateCommands } from './utils/generateCommands'
import { createMockDocsFetcher, type MockDocsStats } from './utils/mockDocsApi'
import { detectMac, formatShortcut } from './utils/shortcut'
import meta from './meta'

type Theme = 'system' | 'light' | 'dark'
type Page = 'home' | 'docs' | 'settings'
type FontSize = 'small' | 'medium' | 'large'

interface LogEntry {
  id: number
  time: Date
  title: string
  source: CommandSource
}

const LOG_LIMIT = 20
const FAILURE_RATES = [0, 0.3, 1] as const
const STRESS_COUNT = 1_000

const router = useRouter()
const isMac = detectMac()
const openKeys = formatShortcut('mod+k', isMac)[0]!
const timeFormat = new Intl.DateTimeFormat('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
const numberFormat = new Intl.NumberFormat('zh-TW')

const open = ref(false)
const trigger = useTemplateRef<HTMLButtonElement>('trigger')

// ---- 模擬應用的狀態（指令作用的對象） ---------------------------------------

const theme = ref<Theme>('system')
const page = ref<Page>('home')
const fontSize = ref<FontSize>('medium')
const openedDoc = ref<string | null>(null)
const notice = ref('')

const PAGE_LABELS: Record<Page, string> = { home: '首頁', docs: '文件', settings: '設定' }
const THEME_LABELS: Record<Theme, string> = { system: '跟隨系統', light: '淺色', dark: '深色' }
const FONT_LABELS: Record<FontSize, string> = { small: '小', medium: '中', large: '大' }

function effectiveTheme(): 'light' | 'dark' {
  if (theme.value !== 'system') return theme.value
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

// ---- 執行紀錄 --------------------------------------------------------------

const log = ref<LogEntry[]>([])
let logId = 0

function record(command: Command, source: CommandSource) {
  log.value = [{ id: ++logId, time: new Date(), title: command.title, source }, ...log.value].slice(0, LOG_LIMIT)
}

// ---- 指令 ------------------------------------------------------------------

const recent = useRecentCommands()

function themeOptions(): Command[] {
  return (
    [
      ['light', '淺色', 'qs', ['light']],
      ['dark', '深色', 'ss', ['dark']],
      ['system', '跟隨系統', 'gsxt', ['system', 'auto']],
    ] as const
  ).map(([value, title, initials, keywords]) => ({
    id: `theme-${value}`,
    title,
    initials,
    keywords: [...keywords],
    group: 'appearance',
    perform: () => {
      theme.value = value
    },
  }))
}

function fontOptions(): Command[] {
  return (
    [
      ['small', '小', 'x'],
      ['medium', '中', 'z'],
      ['large', '大', 'd'],
    ] as const
  ).map(([value, title, initials]) => ({
    id: `font-${value}`,
    title,
    initials,
    keywords: [value],
    group: 'appearance',
    perform: () => {
      fontSize.value = value
    },
  }))
}

const baseCommands: Command[] = [
  {
    id: 'nav-home',
    title: '前往首頁',
    initials: 'qwsy',
    keywords: ['home', 'go'],
    group: 'navigation',
    shortcut: 'g h',
    perform: () => {
      page.value = 'home'
    },
  },
  {
    id: 'nav-docs',
    title: '前往文件',
    initials: 'qwwj',
    keywords: ['docs', 'go'],
    group: 'navigation',
    shortcut: 'g d',
    perform: () => {
      page.value = 'docs'
    },
  },
  {
    id: 'nav-settings',
    title: '前往設定',
    initials: 'qwsd',
    keywords: ['settings', 'preferences', 'go'],
    group: 'navigation',
    shortcut: 'g s',
    perform: () => {
      page.value = 'settings'
    },
  },
  {
    id: 'nav-library',
    title: '回到功能集列表',
    initials: 'hdgnjlb',
    keywords: ['back', 'library', 'exit'],
    group: 'navigation',
    perform: () => {
      void router.push('/')
    },
  },
  {
    id: 'theme',
    title: '切換主題',
    initials: 'qhzt',
    keywords: ['theme', 'dark', 'light', 'zhuti'],
    group: 'appearance',
    children: themeOptions,
  },
  {
    id: 'theme-toggle',
    title: '快速切換深淺色',
    initials: 'ksqhsqs',
    keywords: ['theme', 'toggle', 'dark'],
    group: 'appearance',
    shortcut: 'mod+shift+l',
    perform: () => {
      theme.value = effectiveTheme() === 'dark' ? 'light' : 'dark'
    },
  },
  {
    id: 'font-size',
    title: '調整字級',
    initials: 'tzzj',
    keywords: ['font', 'size', 'zoom'],
    group: 'appearance',
    children: fontOptions,
  },
  {
    id: 'copy-url',
    title: '複製目前網址',
    initials: 'fzmqwz',
    keywords: ['copy', 'url', 'link'],
    group: 'action',
    perform: async () => {
      await navigator.clipboard.writeText(location.href)
      notice.value = '已複製目前網址。'
    },
  },
  {
    id: 'slow-task',
    title: '模擬長時間工作',
    initials: 'mncsjgz',
    keywords: ['slow', 'async', 'loading'],
    group: 'action',
    perform: () => sleep(1500),
  },
  {
    id: 'failing-task',
    title: '模擬失敗的指令',
    initials: 'mnsbdzl',
    keywords: ['error', 'fail'],
    group: 'action',
    perform: async () => {
      await sleep(400)
      throw new Error('伺服器拒絕了這個操作')
    },
  },
  {
    id: 'clear-recent',
    title: '清除最近使用',
    initials: 'qczjsy',
    keywords: ['recent', 'clear', 'history'],
    group: 'action',
    perform: () => recent.clear(),
  },
  {
    id: 'clear-log',
    title: '清除執行紀錄',
    initials: 'qczxjl',
    keywords: ['log', 'clear'],
    group: 'action',
    perform: () => {
      log.value = []
    },
  },
  {
    id: 'delete-workspace',
    title: '刪除工作區',
    initials: 'scgzq',
    keywords: ['delete', 'admin'],
    group: 'action',
    disabled: true,
  },
]

// ---- 壓力測試與遠端 API 設定 -------------------------------------------------

const stress = ref(false)
const generated = markRaw(generateCommands(STRESS_COUNT, () => undefined))
const commands = computed(() => (stress.value ? markRaw([...baseCommands, ...generated]) : baseCommands))

const failureRate = ref<number>(0)
const stats = reactive<MockDocsStats>({ sent: 0, aborted: 0, failed: 0 })
const fetchDocs = createMockDocsFetcher({
  failureRate: () => failureRate.value,
  stats,
  onOpen: (title) => {
    openedDoc.value = title
    page.value = 'docs'
  },
})

// ---- 全域快捷鍵 ------------------------------------------------------------

function onExecute(command: Command, source: CommandSource) {
  notice.value = ''
  record(command, source)
}

async function runFromShortcut(command: Command) {
  try {
    await command.perform?.({ source: 'shortcut' })
    onExecute(command, 'shortcut')
  } catch (e) {
    notice.value = `「${command.title}」執行失敗：${e instanceof Error ? e.message : String(e)}`
  }
}

// mod+k 永遠有效（開啟中按下即關閉）；其他快捷鍵在面板開啟時暫停（EC-15）
useShortcuts(
  computed<ShortcutBinding[]>(() => [{ shortcut: 'mod+k', handler: () => (open.value = !open.value) }]),
  { enabled: ref(true), isMac },
)
useShortcuts(
  computed<ShortcutBinding[]>(() =>
    baseCommands
      .filter((c) => c.shortcut && c.perform && !c.disabled)
      .map((c) => ({ shortcut: c.shortcut!, handler: () => void runFromShortcut(c) })),
  ),
  { enabled: computed(() => !open.value), isMac },
)

const shortcutHints = baseCommands
  .filter((c) => c.shortcut)
  .map((c) => ({ title: c.title, keys: formatShortcut(c.shortcut!, isMac) }))
</script>

<template>
  <article class="command-palette-demo container" :data-theme="theme === 'system' ? undefined : theme">
    <FeatureHeader :meta="meta" />

    <h2 class="section-title">互動展示</h2>

    <div class="toolbar">
      <button ref="trigger" type="button" class="open-button" aria-haspopup="dialog" @click="open = true">
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="7" cy="7" r="4.5" />
          <path d="M10.5 10.5L14 14" />
        </svg>
        開啟指令面板
        <span class="open-keys" aria-hidden="true"><kbd v-for="key in openKeys" :key="key">{{ key }}</kbd></span>
      </button>

      <fieldset>
        <legend>遠端 API 失敗率</legend>
        <div class="segmented">
          <label v-for="rate in FAILURE_RATES" :key="rate">
            <input v-model="failureRate" type="radio" :value="rate" />
            <span>{{ rate * 100 }}%</span>
          </label>
        </div>
      </fieldset>

      <label class="checkbox">
        <input v-model="stress" type="checkbox" />
        壓力測試：加入 {{ numberFormat.format(STRESS_COUNT) }} 筆指令
      </label>
    </div>

    <p class="messages" aria-live="polite">
      <span v-if="notice" class="callout">{{ notice }}</span>
    </p>

    <div class="layout">
      <section class="panel app-preview" aria-labelledby="preview-title" :class="`font-${fontSize}`">
        <header class="panel-header">
          <h3 id="preview-title">模擬應用</h3>
          <span class="badge">{{ PAGE_LABELS[page] }}</span>
        </header>
        <div class="preview-body">
          <template v-if="page === 'home'">
            <p class="preview-title">首頁</p>
            <p>試著在面板中輸入：</p>
            <ul class="try-list">
              <li><code>qhzt</code>：拼音首字母找到「切換主題」</li>
              <li><code>vue</code>：合併遠端文件結果，快速輸入觀察請求被取消</li>
              <li><code>刪除</code>：停用的指令，方向鍵會跳過</li>
              <li><code>失敗</code>：執行時拋錯，面板保持開啟並顯示錯誤</li>
            </ul>
          </template>
          <template v-else-if="page === 'docs'">
            <p class="preview-title">文件</p>
            <p v-if="openedDoc">已開啟：{{ openedDoc }}</p>
            <p v-else class="muted">從面板的「遠端結果」選一篇文件開啟。</p>
          </template>
          <template v-else>
            <p class="preview-title">設定</p>
            <dl class="settings">
              <div><dt>主題</dt><dd>{{ THEME_LABELS[theme] }}</dd></div>
              <div><dt>字級</dt><dd>{{ FONT_LABELS[fontSize] }}</dd></div>
            </dl>
          </template>
        </div>

        <div class="shortcuts">
          <h4>全域快捷鍵<span class="muted">（面板關閉時也有效）</span></h4>
          <ul>
            <li v-for="hint in shortcutHints" :key="hint.title">
              <span>{{ hint.title }}</span>
              <span class="keys">
                <template v-for="(step, i) in hint.keys" :key="i">
                  <span v-if="i > 0" class="muted">然後</span>
                  <kbd v-for="key in step" :key="key">{{ key }}</kbd>
                </template>
              </span>
            </li>
          </ul>
        </div>

        <p class="stats">
          遠端請求：送出 {{ stats.sent }} · 取消 {{ stats.aborted }} · 失敗 {{ stats.failed }}
        </p>
      </section>

      <section class="panel log" aria-labelledby="log-title">
        <header class="panel-header">
          <h3 id="log-title">執行紀錄</h3>
          <button type="button" class="text-button" :disabled="log.length === 0" @click="log = []">清除</button>
        </header>
        <ol v-if="log.length" class="log-list">
          <li v-for="entry in log" :key="entry.id">
            <time :datetime="entry.time.toISOString()">{{ timeFormat.format(entry.time) }}</time>
            <span class="log-title">{{ entry.title }}</span>
            <span class="badge" :class="entry.source">{{ entry.source }}</span>
          </li>
        </ol>
        <p v-else class="log-empty">尚未執行任何指令</p>
      </section>
    </div>

    <CommandPalette
      v-model:open="open"
      :commands="commands"
      :remote-fetcher="fetchDocs"
      :fallback-focus="trigger"
      @execute="onExecute"
    />
  </article>
</template>

<style scoped>
.command-palette-demo {
  padding-top: 1rem;
  color: var(--text);
  background: var(--bg);
}

/* 主題只作用在示範頁（含面板），不影響整站 */
.command-palette-demo[data-theme='light'] {
  color-scheme: light;
  --bg: #fff;
  --bg-subtle: #fafafa;
  --surface: #f4f4f5;
  --border: #e4e4e7;
  --border-strong: #d4d4d8;
  --text: #3f3f46;
  --text-muted: #71717a;
  --text-h: #18181b;
  --code-bg: #f4f4f5;
  --badge-bg: #f4f4f5;
  --badge-text: #52525b;
  --accent: #564dff;
  --accent-bg: rgba(86, 77, 255, 0.08);
  --info: #0284c7;
  --danger: #dc2626;
  --danger-bg: rgba(239, 68, 68, 0.1);
}

.command-palette-demo[data-theme='dark'] {
  color-scheme: dark;
  --bg: #27272a;
  --bg-subtle: #2c2c30;
  --surface: #303036;
  --border: #3f3f46;
  --border-strong: #52525b;
  --text: #d4d4d8;
  --text-muted: #a1a1aa;
  --text-h: #f4f4f5;
  --code-bg: #3f3f46;
  --badge-bg: #3f3f46;
  --badge-text: #d4d4d8;
  --accent: #9894f9;
  --accent-bg: rgba(152, 148, 249, 0.12);
  --info: #38bdf8;
  --danger: #f87171;
  --danger-bg: rgba(248, 113, 113, 0.12);
}

.section-title {
  max-width: 760px;
  padding-bottom: 0.3em;
  border-bottom: 1px solid var(--border-strong);
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 1rem 1.5rem;
}

.open-button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  height: 2.25rem;
  padding: 0 0.5rem 0 0.75rem;
  font-size: 0.875rem;
  color: var(--text-muted);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  background: var(--bg);
  cursor: pointer;
}

.open-button:hover {
  color: var(--text-h);
  border-color: var(--accent-border);
}

.open-button svg {
  width: 1rem;
  height: 1rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.5;
}

.open-keys {
  display: inline-flex;
  gap: 0.125rem;
  margin-left: 1.5rem;
}

.open-keys kbd {
  font-size: 0.6875rem;
}

fieldset {
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

legend {
  margin-bottom: 0.375rem;
  padding: 0;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--text-muted);
}

.segmented {
  display: inline-flex;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  overflow: hidden;
}

.segmented label {
  position: relative;
  display: inline-flex;
}

.segmented label + label {
  border-left: 1px solid var(--border-strong);
}

.segmented input {
  position: absolute;
  inset: 0;
  margin: 0;
  opacity: 0;
  cursor: pointer;
}

.segmented span {
  padding: 0.25rem 0.75rem;
  font-size: 0.875rem;
  line-height: 1.5rem;
  font-variant-numeric: tabular-nums;
}

.segmented label:hover span {
  background: var(--bg-subtle);
}

.segmented input:checked + span {
  color: var(--accent);
  background: var(--accent-bg);
}

.segmented input:focus-visible + span {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}

.checkbox {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  height: 2rem;
  font-size: 0.875rem;
  cursor: pointer;
}

.checkbox input {
  accent-color: var(--accent-solid);
}

.messages {
  min-height: 1rem;
  margin: 1rem 0;
}

.messages .callout {
  display: inline-block;
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
}

.layout {
  display: grid;
  gap: 1rem;
}

.panel {
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  background: var(--bg);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.5rem 0.8125rem;
  border-bottom: 1px solid var(--border-strong);
  background: var(--bg-subtle);
}

.panel-header h3 {
  margin: 0;
  font-size: 0.9375rem;
}

.preview-body {
  min-height: 11rem;
  padding: 1rem 0.8125rem;
}

.font-small .preview-body {
  font-size: 0.875rem;
}

.font-large .preview-body {
  font-size: 1.1875rem;
}

.preview-title {
  margin-bottom: 0.5rem;
  font-family: var(--display);
  font-size: 1.25em;
  font-weight: 700;
  color: var(--text-h);
}

.try-list {
  margin: 0.25rem 0 0;
  padding-left: 1.25rem;
}

.settings {
  display: grid;
  gap: 0.25rem;
  margin: 0;
}

.settings div {
  display: flex;
  gap: 1rem;
}

.settings dt {
  min-width: 3rem;
  color: var(--text-muted);
}

.settings dd {
  margin: 0;
}

.muted {
  color: var(--text-muted);
}

.shortcuts {
  padding: 0.75rem 0.8125rem;
  border-top: 1px solid var(--border);
}

.shortcuts h4 {
  margin: 0 0 0.375rem;
  font-size: 0.8125rem;
  color: var(--text-h);
}

.shortcuts ul {
  display: grid;
  gap: 0.25rem;
  margin: 0;
  padding: 0;
  font-size: 0.875rem;
  list-style: none;
}

.shortcuts li {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

.keys {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
}

.stats {
  padding: 0.5rem 0.8125rem;
  font-family: var(--mono);
  font-size: 0.75rem;
  color: var(--text-muted);
  border-top: 1px solid var(--border);
  background: var(--bg-subtle);
}

.text-button {
  padding: 0 0.25rem;
  font-size: 0.8125rem;
  color: var(--accent);
  border: 0;
  background: none;
  cursor: pointer;
}

.text-button:disabled {
  color: var(--text-muted);
  cursor: default;
}

.log-list {
  max-height: 26rem;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  list-style: none;
}

.log-list li {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.375rem 0.8125rem;
  font-size: 0.875rem;
}

.log-list li + li {
  border-top: 1px solid var(--border);
}

.log-list time {
  flex-shrink: 0;
  font-family: var(--mono);
  font-size: 0.75rem;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}

.log-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.badge.shortcut {
  color: var(--accent);
  background: var(--accent-bg);
}

.log-empty {
  padding: 2rem 0.8125rem;
  font-size: 0.875rem;
  text-align: center;
  color: var(--text-muted);
}

@media (min-width: 900px) {
  .layout {
    grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
    align-items: start;
  }
}
</style>
