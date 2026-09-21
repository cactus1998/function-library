import type { Pinia, PiniaPlugin, PiniaPluginContext, StateTree } from 'pinia'
import { onScopeDispose, ref, shallowRef, type Ref } from 'vue'

/**
 * store 的 sync 設定。payload 在傳輸層一律視為 unknown，
 * 由 store 自己在 receive 中驗證與合併，plugin 不需要知道資料形狀。
 */
export interface SyncConfig<Store> {
  /** localStorage key */
  key: string
  /** 儲存格式版本，不符就捨棄 */
  version: number
  /** BroadcastChannel 名稱 */
  channel: string
  /** 這些 action 的回傳值（非 null）會當成 patch 廣播給其他分頁 */
  outgoing: readonly string[]
  tabId: (store: Store) => string
  /** 完整狀態：寫入 localStorage、回覆 sync-request */
  snapshot: (store: Store) => unknown
  /** 驗證並合併 patch 或 snapshot，必須具冪等性；格式不符回傳 false */
  receive: (store: Store, payload: unknown) => boolean
  /** 同步紀錄中顯示的摘要 */
  describe?: (payload: unknown) => string
}

declare module 'pinia' {
  // 型別參數必須與 pinia 的宣告一致才能合併
  export interface DefineStoreOptionsBase<S extends StateTree, Store> {
    /** 啟用 localStorage 持久化與跨分頁同步，需先 installSyncPlugin */
    sync?: SyncConfig<Store>
  }
}

export type SyncTransport = 'broadcast' | 'storage' | 'none'

export type SyncMessage = { type: 'patch'; from: string; payload: unknown } | { type: 'sync-request'; from: string }

export interface SyncLogEntry {
  id: number
  time: number
  direction: 'in' | 'out'
  kind: SyncMessage['type'] | 'storage'
  /** 來源分頁 id；storage event 無法得知來源時為空字串 */
  from: string
  detail: string
}

export interface SyncHandle {
  readonly tabId: string
  readonly transport: Readonly<Ref<SyncTransport>>
  /** localStorage 是否可寫入 */
  readonly persistent: Readonly<Ref<boolean>>
  readonly online: Readonly<Ref<boolean>>
  readonly log: Readonly<Ref<readonly SyncLogEntry[]>>
  /** 模擬離線：不收不送；恢復時互送完整狀態 */
  setOnline(online: boolean): void
  /** 立即寫入尚未儲存的變更 */
  flush(): void
}

/** BroadcastChannel 的最小介面，方便測試注入 */
export interface SyncChannel {
  postMessage(message: unknown): void
  close(): void
  onmessage: ((event: MessageEvent) => void) | null
}

export interface SyncPluginOptions {
  createChannel?: (name: string) => SyncChannel | null
  getStorage?: () => Storage | null
  target?: Window
  saveDelay?: number
}

export const SAVE_DELAY = 100
export const LOG_LIMIT = 20

type AnyStore = PiniaPluginContext['store']

const handles = new WeakMap<object, SyncHandle>()
const installed = new WeakSet<Pinia>()

function defaultChannel(name: string): SyncChannel | null {
  return typeof BroadcastChannel === 'function' ? new BroadcastChannel(name) : null
}

function defaultStorage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    // 存取 localStorage 本身就可能拋錯（停用 cookie、沙箱 iframe）
    return null
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseMessage(raw: unknown): SyncMessage | null {
  if (!isRecord(raw) || typeof raw.from !== 'string' || !raw.from) return null
  if (raw.type === 'sync-request') return { type: 'sync-request', from: raw.from }
  if (raw.type === 'patch' && 'payload' in raw) return { type: 'patch', from: raw.from, payload: raw.payload }
  return null
}

export function getSyncHandle(store: object): SyncHandle {
  const handle = handles.get(store)
  if (!handle) throw new Error('This store was not defined with the `sync` option or the plugin is not installed')
  return handle
}

/**
 * 在已安裝的 pinia 上加掛 sync plugin，重複呼叫無作用。
 * plugin 只會套用到之後才建立的 store，因此要在第一次 useStore 之前呼叫。
 */
export function installSyncPlugin(pinia: Pinia, options?: SyncPluginOptions) {
  if (installed.has(pinia)) return
  installed.add(pinia)
  pinia.use(createSyncPlugin(options))
}

export function createSyncPlugin(options: SyncPluginOptions = {}): PiniaPlugin {
  return ({ store, options: storeOptions }) => {
    const config = storeOptions.sync
    if (!config) return
    handles.set(store, setupSync(store, config, options))
  }
}

/** 在 store 的 effect scope 中執行，store.$dispose() 時由 onScopeDispose 清理 */
function setupSync(store: AnyStore, config: SyncConfig<AnyStore>, options: SyncPluginOptions): SyncHandle {
  const target = options.target ?? window
  const createChannel = options.createChannel ?? defaultChannel
  const storage = (options.getStorage ?? defaultStorage)()
  const saveDelay = options.saveDelay ?? SAVE_DELAY
  const tabId = config.tabId(store)

  const transport = ref<SyncTransport>('none')
  const persistent = ref(storage !== null)
  const online = ref(true)
  const log = shallowRef<readonly SyncLogEntry[]>([])
  let channel: SyncChannel | null = null
  let saveTimer: ReturnType<typeof setTimeout> | undefined
  let nextLogId = 1

  function record(direction: SyncLogEntry['direction'], kind: SyncLogEntry['kind'], from: string, payload?: unknown) {
    const detail = payload === undefined ? '' : (config.describe?.(payload) ?? '')
    const entry: SyncLogEntry = { id: nextLogId++, time: Date.now(), direction, kind, from, detail }
    log.value = [entry, ...log.value].slice(0, LOG_LIMIT)
  }

  function readSaved(raw: string | null): { data: unknown } | null {
    if (!raw) return null
    try {
      const parsed: unknown = JSON.parse(raw)
      if (isRecord(parsed) && parsed.version === config.version && 'data' in parsed) return { data: parsed.data }
    } catch {
      // JSON 損毀：視同沒有資料
    }
    return null
  }

  function readStorage(): string | null {
    try {
      return storage?.getItem(config.key) ?? null
    } catch {
      return null
    }
  }

  function save() {
    clearTimeout(saveTimer)
    saveTimer = undefined
    if (!storage) return
    try {
      storage.setItem(config.key, JSON.stringify({ version: config.version, data: config.snapshot(store) }))
      persistent.value = true
    } catch {
      // 超出配額或無痕模式：功能照常，只是不保存
      persistent.value = false
    }
  }

  function scheduleSave() {
    if (!storage) return
    // storage 模式下寫入就等於廣播，離線模擬期間先不寫
    if (!online.value && transport.value === 'storage') return
    clearTimeout(saveTimer)
    saveTimer = setTimeout(save, saveDelay)
  }

  function flush() {
    if (saveTimer !== undefined) save()
  }

  function post(message: SyncMessage) {
    if (!online.value || !channel) return
    channel.postMessage(message)
    record('out', message.type, tabId, message.type === 'patch' ? message.payload : undefined)
  }

  function sendSnapshot() {
    post({ type: 'patch', from: tabId, payload: config.snapshot(store) })
  }

  function onChannelMessage(event: MessageEvent) {
    if (!online.value) return
    const message = parseMessage(event.data)
    if (!message || message.from === tabId) return
    if (message.type === 'sync-request') {
      record('in', message.type, message.from)
      sendSnapshot()
      return
    }
    record('in', message.type, message.from, message.payload)
    // 套用遠端資料不經過 outgoing action，因此不會再廣播出去
    config.receive(store, message.payload)
  }

  // storage event 只會在「其他」分頁觸發，newValue 是對方寫入的完整狀態
  function onStorage(event: StorageEvent) {
    if (transport.value !== 'storage' || !online.value || event.key !== config.key) return
    const saved = readSaved(event.newValue)
    if (!saved) return
    record('in', 'storage', '', saved.data)
    config.receive(store, saved.data)
  }

  function connect() {
    channel = createChannel(config.channel)
    if (channel) {
      channel.onmessage = onChannelMessage
      transport.value = 'broadcast'
      post({ type: 'sync-request', from: tabId })
    } else {
      transport.value = storage ? 'storage' : 'none'
    }
  }

  function disconnect() {
    if (!channel) return
    channel.onmessage = null
    channel.close()
    channel = null
  }

  function setOnline(value: boolean) {
    if (online.value === value) return
    online.value = value
    if (!value) return
    if (transport.value === 'broadcast') {
      sendSnapshot()
      post({ type: 'sync-request', from: tabId })
    } else if (transport.value === 'storage') {
      const saved = readSaved(readStorage())
      if (saved) config.receive(store, saved.data)
      save()
    }
  }

  // 進入 bfcache 前關閉 channel，返回時重新連線並補齊期間的變更
  function onPageHide(event: PageTransitionEvent) {
    flush()
    if (event.persisted) disconnect()
  }

  function onPageShow(event: PageTransitionEvent) {
    if (event.persisted && !channel) connect()
  }

  function onVisibilityChange() {
    if (target.document.visibilityState === 'hidden') flush()
  }

  // 還原在訂閱之前進行，不會觸發一次多餘的寫入
  const saved = readSaved(readStorage())
  if (saved) config.receive(store, saved.data)

  store.$subscribe(scheduleSave)
  store.$onAction(({ name, after }) => {
    if (!config.outgoing.includes(name)) return
    after((result: unknown) => {
      if (result !== null && result !== undefined) post({ type: 'patch', from: tabId, payload: result })
    })
  })

  connect()
  target.addEventListener('storage', onStorage)
  target.addEventListener('pagehide', onPageHide)
  target.addEventListener('pageshow', onPageShow)
  target.document.addEventListener('visibilitychange', onVisibilityChange)

  onScopeDispose(() => {
    flush()
    disconnect()
    target.removeEventListener('storage', onStorage)
    target.removeEventListener('pagehide', onPageHide)
    target.removeEventListener('pageshow', onPageShow)
    target.document.removeEventListener('visibilitychange', onVisibilityChange)
  })

  return { tabId, transport, persistent, online, log, setOnline, flush }
}
