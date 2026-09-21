<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, useId, useTemplateRef, watch } from 'vue'
import { usePaletteNavigation } from '../composables/usePaletteNavigation'
import { useCommandSearch } from '../composables/useCommandSearch'
import { useRecentCommands } from '../composables/useRecentCommands'
import { useRemoteSearch } from '../composables/useRemoteSearch'
import type { Command, CommandGroup, CommandSource, MatchRange, RemoteFetcher } from '../types'
import { detectMac } from '../utils/shortcut'
import CommandItem from './CommandItem.vue'

type GroupKey = CommandGroup | 'recent'

type PaletteEntry =
  | { kind: 'command'; key: string; index: number; command: Command; matches: readonly MatchRange[] }
  | { kind: 'retry'; key: string; index: number; command: Command; matches: readonly MatchRange[] }

interface PaletteGroup {
  key: GroupKey
  label: string
  entries: PaletteEntry[]
  /** 群組標題旁的狀態文字（遠端載入中、失敗、沒有結果） */
  status?: string
}

interface Page {
  parent: Command
  commands: Command[]
}

const GROUP_ORDER: CommandGroup[] = ['navigation', 'appearance', 'action', 'remote']
const GROUP_LABELS: Record<GroupKey, string> = {
  recent: '最近使用',
  navigation: '導覽',
  appearance: '外觀',
  action: '動作',
  remote: '遠端結果',
}
const ANNOUNCE_DELAY = 400
const MAX_QUERY_LENGTH = 100

const {
  commands,
  remoteFetcher,
  fallbackFocus = null,
} = defineProps<{
  commands: Command[]
  /** 遠端搜尋來源；於元件建立時決定是否啟用 */
  remoteFetcher?: RemoteFetcher
  /** 開啟前的焦點元素已被移除時，關閉後改把焦點交給這個元素 */
  fallbackFocus?: HTMLElement | null
}>()

const emit = defineEmits<{
  execute: [command: Command, source: CommandSource]
}>()

const open = defineModel<boolean>('open', { default: false })

const uid = useId()
const listboxId = `${uid}-listbox`
const isMac = detectMac()
const dialog = useTemplateRef<HTMLDialogElement>('dialog')
const input = useTemplateRef<HTMLInputElement>('input')

// ---- 頁面與搜尋 ------------------------------------------------------------

const query = ref('')
const stack = shallowRef<Page[]>([])
const currentPage = computed(() => stack.value[stack.value.length - 1])
const pageCommands = computed(() => currentPage.value?.commands ?? commands)
const atRoot = computed(() => stack.value.length === 0)

const { results, normalizedQuery, duration: searchDuration } = useCommandSearch(query, pageCommands)
const recent = useRecentCommands()

const commandById = computed(() => new Map(commands.map((c) => [c.id, c])))

// 只在根頁面查詢遠端；子頁或空查詢時為 Idle
const remoteQuery = computed(() => (atRoot.value ? query.value : ''))
const remote = remoteFetcher
  ? useRemoteSearch(remoteQuery, (q, signal) => remoteFetcher(q, signal))
  : null

const RETRY_COMMAND: Command = { id: 'remote-retry', title: '重新搜尋文件', group: 'remote' }

const groups = computed<PaletteGroup[]>(() => {
  const list: PaletteGroup[] = []
  let index = 0
  const entry = (kind: PaletteEntry['kind'], group: GroupKey, command: Command, matches: readonly MatchRange[] = []) =>
    ({ kind, key: `${group}:${command.id}`, index: index++, command, matches }) as PaletteEntry

  // 最近使用：只在根頁面空查詢時顯示；已不存在的 id 直接略過
  const recentIds = new Set<string>()
  if (atRoot.value && !normalizedQuery.value) {
    const recentCommands = recent.ids.value
      .map((id) => commandById.value.get(id))
      .filter((c): c is Command => c !== undefined)
    if (recentCommands.length) {
      recentCommands.forEach((c) => recentIds.add(c.id))
      list.push({ key: 'recent', label: GROUP_LABELS.recent, entries: recentCommands.map((c) => entry('command', 'recent', c)) })
    }
  }

  // Fuse 結果已依分數排序；依群組分桶後群組內仍維持分數順序
  const buckets = new Map<CommandGroup, { command: Command; matches: readonly MatchRange[] }[]>()
  for (const r of results.value) {
    if (recentIds.has(r.command.id)) continue
    const bucket = buckets.get(r.command.group) ?? []
    bucket.push({ command: r.command, matches: r.matches })
    buckets.set(r.command.group, bucket)
  }

  for (const key of GROUP_ORDER) {
    if (key === 'remote') continue
    const bucket = buckets.get(key)
    if (bucket?.length) {
      list.push({ key, label: GROUP_LABELS[key], entries: bucket.map((b) => entry('command', key, b.command, b.matches)) })
    }
  }

  if (remote && remote.status.value !== 'idle') {
    const status = remote.status.value
    const group: PaletteGroup = { key: 'remote', label: GROUP_LABELS.remote, entries: [] }
    if (status === 'error') {
      group.status = '載入失敗'
      group.entries.push(entry('retry', 'remote', RETRY_COMMAND))
    } else {
      if (status === 'debouncing' || status === 'loading') group.status = '搜尋中…'
      else if (remote.results.value.length === 0) group.status = '沒有符合的文件'
      group.entries.push(...remote.results.value.map((c) => entry('command', 'remote', c)))
    }
    list.push(group)
  }

  return list
})

const entries = computed(() => groups.value.flatMap((g) => g.entries))
const optionId = (entry: PaletteEntry) => `${uid}-option-${entry.index}`

const nav = usePaletteNavigation(
  computed(() => entries.value.length),
  { isDisabled: (i) => entries.value[i]?.command.disabled === true },
)
const activeEntry = computed(() => entries.value[nav.activeIndex.value])
const activeDescendant = computed(() => (activeEntry.value ? optionId(activeEntry.value) : undefined))

const remoteBusy = computed(() => remote?.status.value === 'debouncing' || remote?.status.value === 'loading')
const showEmpty = computed(() => normalizedQuery.value !== '' && entries.value.length === 0 && !remoteBusy.value)
const truncated = computed(() => !normalizedQuery.value && pageCommands.value.length > results.value.length)

const errorMessage = ref('')
const executingKey = ref<string | null>(null)

// EC-06：查詢或頁面變更時 active 重設為第一個可用項目
watch([normalizedQuery, stack], () => {
  errorMessage.value = ''
  nav.resetToFirst()
})

// 遠端結果抵達時若原本沒有 active（例如本地無結果），選第一個
watch(entries, () => {
  if (nav.activeIndex.value === -1) nav.resetToFirst()
})

watch(activeDescendant, async (id) => {
  if (!id) return
  await nextTick()
  document.getElementById(id)?.scrollIntoView?.({ block: 'nearest' })
})

// ---- 螢幕報讀器宣告（等結果穩定才更新，避免每個按鍵都宣告） -----------------

const announcement = ref('')
let announceTimer: ReturnType<typeof setTimeout> | undefined
const announcementSource = computed(() => {
  if (!open.value) return ''
  const status = remote?.status.value
  const suffix = remoteBusy.value ? '，正在搜尋文件' : status === 'error' ? '，文件搜尋失敗' : ''
  const count = entries.value.filter((e) => e.kind === 'command').length
  return `${count} 個結果${suffix}`
})
watch(announcementSource, (text) => {
  clearTimeout(announceTimer)
  announceTimer = setTimeout(() => (announcement.value = text), ANNOUNCE_DELAY)
})

// ---- 執行 ----------------------------------------------------------------

function enterPage(command: Command) {
  if (!command.children) return
  stack.value = [...stack.value, { parent: command, commands: command.children() }]
  query.value = ''
}

function goBack() {
  const page = stack.value[stack.value.length - 1]
  if (!page) return
  stack.value = stack.value.slice(0, -1)
  query.value = ''
  // AC-04：回上一層後 active 停在剛才進入的指令；等 watch 重設完再覆寫
  void nextTick(() => {
    const index = entries.value.findIndex((e) => e.command.id === page.parent.id)
    if (index !== -1) nav.setActive(index)
  })
}

async function execute(entry: PaletteEntry | undefined) {
  if (!entry || executingKey.value || entry.command.disabled) return
  if (entry.kind === 'retry') {
    remote?.retry()
    return
  }

  const command = entry.command
  if (command.children) {
    enterPage(command)
    return
  }

  errorMessage.value = ''
  executingKey.value = entry.key
  // 子頁中的指令記錄最上層入口，重新開啟時可以直接回到該子頁
  const recentId = stack.value[0]?.parent.id ?? command.id
  try {
    await command.perform?.({ source: 'palette' })
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e)
    errorMessage.value = `「${command.title}」執行失敗：${reason}`
    return
  } finally {
    executingKey.value = null
  }

  if (commandById.value.has(recentId)) recent.push(recentId)
  emit('execute', command, 'palette')
  open.value = false
}

// ---- 鍵盤 ----------------------------------------------------------------

function onInputKeydown(event: KeyboardEvent) {
  // EC-02：IME 組字中的 Enter / 方向鍵是在選字，不處理；Esc 是取消組字，不關閉面板
  if (event.isComposing || event.keyCode === 229) {
    if (event.key === 'Escape') event.preventDefault()
    return
  }
  if (event.key === 'Tab') {
    event.preventDefault()
    return
  }
  if (executingKey.value) {
    if (event.key === 'Enter' || event.key.startsWith('Arrow')) event.preventDefault()
    return
  }
  if (nav.onKeydown(event)) return

  if (event.key === 'Enter') {
    event.preventDefault()
    void execute(activeEntry.value)
  } else if (event.key === 'Backspace' && query.value === '' && !atRoot.value) {
    event.preventDefault()
    goBack()
  }
}

function onCancel(event: Event) {
  event.preventDefault()
  if (!executingKey.value) open.value = false
}

function onDialogClick(event: MouseEvent) {
  // 點在 panel 外（::backdrop 的點擊目標是 dialog 本身）
  if (event.target === dialog.value && !executingKey.value) open.value = false
}

function keepInputFocus(event: MouseEvent) {
  if (event.target !== input.value) event.preventDefault()
}

// ---- 開關、焦點與捲動鎖定 ---------------------------------------------------

let previousFocus: HTMLElement | null = null
let scrollLock: { overflow: string; paddingRight: string } | null = null

function lockScroll() {
  if (scrollLock) return
  const root = document.documentElement
  // 補上捲軸寬度，避免鎖定後版面往右跳
  const scrollbar = window.innerWidth - root.clientWidth
  scrollLock = { overflow: root.style.overflow, paddingRight: root.style.paddingRight }
  root.style.overflow = 'hidden'
  if (scrollbar > 0) root.style.paddingRight = `${scrollbar}px`
}

function unlockScroll() {
  if (!scrollLock) return
  const root = document.documentElement
  root.style.overflow = scrollLock.overflow
  root.style.paddingRight = scrollLock.paddingRight
  scrollLock = null
}

function resetState() {
  query.value = ''
  stack.value = []
  errorMessage.value = ''
  executingKey.value = null
}

function show() {
  const el = dialog.value
  if (!el || el.open) return
  previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
  resetState()
  lockScroll()
  if (typeof el.showModal === 'function') el.showModal()
  else el.setAttribute('open', '')
  input.value?.focus()
  nav.resetToFirst()
}

function hide() {
  const el = dialog.value
  if (el?.open) {
    if (typeof el.close === 'function') el.close()
    else el.removeAttribute('open')
  }
  unlockScroll()
  // 清空查詢會讓 useRemoteSearch abort 進行中的請求（EC-18）
  resetState()
  clearTimeout(announceTimer)
  announcement.value = ''

  const target = previousFocus?.isConnected ? previousFocus : fallbackFocus
  previousFocus = null
  target?.focus()
}

// 瀏覽器自行關閉 dialog（例如 Chrome 連按兩次 Esc 無法取消）時同步狀態。
// close 事件是非同步派送的：關閉後立刻重新開啟時，上一次的 close 事件會晚到，
// 因此要確認 dialog 目前真的是關閉狀態，避免把剛開啟的面板誤關。
function onNativeClose() {
  if (open.value && !dialog.value?.open) open.value = false
}

watch(open, (value) => (value ? show() : hide()), { flush: 'post' })

onMounted(() => {
  if (open.value) show()
})

onBeforeUnmount(() => {
  clearTimeout(announceTimer)
  unlockScroll()
})

const breadcrumb = computed(() => {
  const first = stack.value[0]
  if (!first) return []
  return [GROUP_LABELS[first.parent.group], ...stack.value.map((p) => p.parent.title)]
})

const placeholder = computed(() =>
  currentPage.value ? `在「${currentPage.value.parent.title}」中搜尋…` : '輸入指令或搜尋文件…',
)
</script>

<template>
  <dialog
    ref="dialog"
    class="command-palette"
    aria-label="指令面板"
    @cancel="onCancel"
    @close="onNativeClose"
    @click="onDialogClick"
  >
    <div class="panel" :aria-busy="executingKey !== null" @mousedown="keepInputFocus">
      <nav v-if="breadcrumb.length" class="breadcrumb" aria-label="目前位置">
        <ol>
          <li v-for="(crumb, i) in breadcrumb" :key="i">{{ crumb }}</li>
        </ol>
        <span class="back-hint"><kbd>Backspace</kbd> 返回</span>
      </nav>

      <div class="search">
        <svg class="search-icon" viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="7" cy="7" r="4.5" />
          <path d="M10.5 10.5L14 14" />
        </svg>
        <input
          ref="input"
          v-model="query"
          type="text"
          role="combobox"
          aria-label="搜尋指令"
          aria-autocomplete="list"
          :aria-expanded="entries.length > 0"
          :aria-controls="listboxId"
          :aria-activedescendant="activeDescendant"
          :placeholder="placeholder"
          :maxlength="MAX_QUERY_LENGTH"
          :readonly="executingKey !== null"
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
          enterkeyhint="go"
          @keydown="onInputKeydown"
        />
      </div>

      <p v-if="errorMessage" class="error callout danger" role="alert">{{ errorMessage }}</p>

      <div class="list" :class="{ executing: executingKey !== null }">
        <div :id="listboxId" role="listbox" aria-label="指令">
          <div
            v-for="group in groups"
            :key="group.key"
            class="group"
            role="group"
            :aria-labelledby="`${uid}-group-${group.key}`"
            :aria-busy="group.key === 'remote' && remoteBusy ? true : undefined"
          >
            <div :id="`${uid}-group-${group.key}`" class="group-label">
              {{ group.label }}
              <span v-if="group.status" class="group-status" aria-hidden="true">
                <span v-if="group.key === 'remote' && remoteBusy" class="dot" />
                {{ group.status }}
              </span>
            </div>
            <CommandItem
              v-for="entry in group.entries"
              :id="optionId(entry)"
              :key="entry.key"
              :command="entry.command"
              :matches="entry.matches"
              :active="entry.index === nav.activeIndex.value"
              :loading="executingKey === entry.key"
              :is-mac="isMac"
              :class="{ stale: group.key === 'remote' && remoteBusy }"
              @select="execute(entry)"
              @hover="executingKey || nav.setActive(entry.index)"
            />
          </div>
        </div>

        <p v-if="showEmpty" class="empty">找不到符合「{{ normalizedQuery }}」的指令</p>
        <p v-else-if="truncated" class="truncated">
          只顯示前 {{ results.length }} 筆，共 {{ pageCommands.length }} 筆，輸入文字以篩選
        </p>
      </div>

      <footer class="footer">
        <span><kbd>↑</kbd><kbd>↓</kbd> 移動</span>
        <span><kbd>Enter</kbd> 執行</span>
        <span><kbd>Esc</kbd> 關閉</span>
        <span class="timing" :title="`${pageCommands.length} 筆指令`">
          搜尋 {{ searchDuration.toFixed(2) }} ms
        </span>
      </footer>

      <p class="visually-hidden" aria-live="polite" aria-atomic="true">{{ announcement }}</p>
    </div>
  </dialog>
</template>

<style scoped>
.command-palette {
  width: 100%;
  max-width: 100%;
  max-height: 100dvh;
  margin: 0 0 auto;
  padding: 0;
  overflow: hidden;
  color: var(--text);
  border: 0;
  border-bottom: 1px solid var(--border-strong);
  border-radius: 0 0 var(--radius-lg) var(--radius-lg);
  background: var(--bg);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.2);

  /* 開關動畫：@starting-style 處理進場，allow-discrete 讓 display / overlay 等退場結束 */
  opacity: 0;
  transform: scale(0.97);
  transition:
    opacity 150ms ease-out,
    transform 150ms ease-out,
    overlay 150ms allow-discrete,
    display 150ms allow-discrete;
}

.command-palette[open] {
  opacity: 1;
  transform: none;
}

@starting-style {
  .command-palette[open] {
    opacity: 0;
    transform: scale(0.97);
  }
}

.command-palette::backdrop {
  background: rgba(24, 24, 27, 0.4);
}

.panel {
  display: flex;
  flex-direction: column;
}

.breadcrumb {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.5rem 1rem 0;
  font-size: 0.8125rem;
  color: var(--text-muted);
}

.breadcrumb ol {
  display: flex;
  flex-wrap: wrap;
  margin: 0;
  padding: 0;
  list-style: none;
}

.breadcrumb li + li::before {
  content: '›';
  margin-inline: 0.375rem;
}

.breadcrumb li:last-child {
  color: var(--text-h);
}

.back-hint {
  flex-shrink: 0;
  font-size: 0.75rem;
}

.search {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding-inline: 1rem;
  border-bottom: 1px solid var(--border);
}

.search-icon {
  flex-shrink: 0;
  width: 1.125rem;
  height: 1.125rem;
  fill: none;
  stroke: var(--text-muted);
  stroke-width: 1.5;
}

.search input {
  flex: 1;
  min-width: 0;
  height: 3.25rem;
  padding: 0;
  font-size: 1rem;
  border: 0;
  outline: 0;
  background: transparent;
}

.search input::placeholder {
  color: var(--text-muted);
}

.error {
  margin: 0.5rem 0.5rem 0;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
}

.list {
  max-height: min(60vh, 400px);
  padding: 0.25rem 0.5rem 0.5rem;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.list.executing {
  cursor: progress;
}

.group-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.625rem 0.75rem 0.25rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-muted);
}

.group-status {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-weight: 400;
}

.dot {
  width: 0.375rem;
  height: 0.375rem;
  border-radius: 50%;
  background: var(--accent);
  animation: pulse 1s ease-in-out infinite;
}

@keyframes pulse {
  50% {
    opacity: 0.3;
  }
}

.stale {
  opacity: 0.55;
}

.empty,
.truncated {
  padding: 1.5rem 0.75rem;
  font-size: 0.875rem;
  text-align: center;
  color: var(--text-muted);
}

.truncated {
  padding-block: 0.75rem;
  font-size: 0.8125rem;
}

.footer {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 1rem;
  padding: 0.5rem 1rem;
  font-size: 0.75rem;
  color: var(--text-muted);
  border-top: 1px solid var(--border);
  background: var(--bg-subtle);
}

.footer kbd {
  margin-right: 0.25rem;
  font-size: 0.6875rem;
}

.timing {
  margin-left: auto;
  font-family: var(--mono);
  font-variant-numeric: tabular-nums;
}

@media (min-width: 640px) {
  .command-palette {
    width: 560px;
    max-height: calc(100dvh - 15vh - 2rem);
    margin: 15vh auto auto;
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-lg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .command-palette {
    transition: none;
  }

  .dot {
    animation: none;
  }
}
</style>
