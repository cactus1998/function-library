import type { FetchLike, Message, MessageInput, ServerSettings, Topic } from '../types'

const TOPICS: readonly Topic[] = ['order', 'wholesale', 'feedback', 'other']
const DISPOSABLE_DOMAINS = ['mailinator.com', 'tempmail.com', '10minutemail.com']
const SEED_NAMES = ['王小明', '陳怡君', '林志豪', '張雅婷', '李建宏', '黃淑芬', '吳承翰']
const SEED_MESSAGES = [
  '請問耶加雪菲還有貨嗎？',
  '想詢問公司行號大量採購的報價。',
  '上週收到的豆子香氣很棒，謝謝！',
  '訂單還沒出貨，可以幫我查一下嗎？',
  '門市有提供手沖課程嗎？',
]

function abortError(): DOMException {
  return new DOMException('The operation was aborted.', 'AbortError')
}

function delay(ms: number, signal?: AbortSignal | null): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(abortError())
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    function onAbort() {
      clearTimeout(timer)
      reject(abortError())
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

const STATUS_TEXT: Record<number, string> = {
  200: 'OK',
  201: 'Created',
  400: 'Bad Request',
  404: 'Not Found',
  422: 'Unprocessable Entity',
  500: 'Internal Server Error',
  503: 'Service Unavailable',
  504: 'Gateway Timeout',
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    statusText: STATUS_TEXT[status] ?? '',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function seedMessages(count: number): Message[] {
  const start = Date.UTC(2026, 8, 1, 2, 0)
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: SEED_NAMES[i % SEED_NAMES.length]!,
    email: `user${i + 1}@example.com`,
    topic: TOPICS[i % TOPICS.length]!,
    message: SEED_MESSAGES[i % SEED_MESSAGES.length]!,
    createdAt: new Date(start + i * 7 * 3600_000).toISOString(),
  }))
}

/** 伺服器端驗證：前端驗證可被繞過，伺服器一定要再檢查一次 */
function validate(body: unknown): { value: MessageInput } | { errors: Record<string, string> } {
  if (!isRecord(body)) return { errors: { message: '請求格式錯誤' } }
  const errors: Record<string, string> = {}
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const message = typeof body.message === 'string' ? body.message.trim() : ''
  const topic = TOPICS.find((t) => t === body.topic)

  if (name.length < 2) errors.name = '姓名至少 2 個字'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Email 格式不正確'
  else if (DISPOSABLE_DOMAINS.includes(email.split('@')[1]!.toLowerCase())) errors.email = '不接受拋棄式信箱，請改用常用 Email'
  if (!topic) errors.topic = '請選擇詢問類別'
  if (message.length < 10) errors.message = '內容至少 10 個字'
  if (message.length > 500) errors.message = '內容最多 500 字'

  if (Object.keys(errors).length > 0 || !topic) return { errors }
  return { value: { name, email, topic, message } }
}

/**
 * 模擬後端 API，介面與 window.fetch 相同，回傳真正的 Response 物件。
 * 前端程式碼因此與串接真實後端時完全一樣（res.ok、res.status、res.json()）。
 */
export function createMockServer(settings: ServerSettings): FetchLike {
  const messages = seedMessages(23)
  /** Idempotency-Key 對應已建立的留言：同一次送出重試時不會重複新增 */
  const idempotency = new Map<string, Message>()
  let nextId = messages.length + 1

  return async function mockFetch(input, init = {}) {
    const method = (init.method ?? 'GET').toUpperCase()
    const url = new URL(input, 'https://api.example.com')
    const signal = init.signal

    if (settings.mode === 'offline') {
      await delay(150, signal)
      throw new TypeError('Failed to fetch')
    }
    if (settings.mode === 'timeout') {
      // 永遠不回應，只能靠呼叫端的 AbortController 結束
      await new Promise<never>((_, reject) => {
        if (signal?.aborted) return reject(abortError())
        signal?.addEventListener('abort', () => reject(abortError()), { once: true })
      })
    }

    const jitter = settings.mode === 'slow-flaky' ? 800 + Math.random() * 1200 : Math.random() * 200
    await delay(settings.latency + jitter, signal)

    if (settings.mode === 'error500') return json(500, { error: 'Internal Server Error' })
    const flaky = settings.mode === 'slow-flaky' && Math.random() < 0.5

    if (url.pathname === '/api/messages' && method === 'GET') {
      const page = Math.max(1, Number.parseInt(url.searchParams.get('page') ?? '1', 10) || 1)
      const pageSize = Math.min(20, Math.max(1, Number.parseInt(url.searchParams.get('pageSize') ?? '5', 10) || 5))
      const sorted = [...messages].reverse()
      const items = sorted.slice((page - 1) * pageSize, page * pageSize)
      if (flaky) return json(503, { error: 'Service Unavailable' })
      return json(200, { items, page, pageSize, total: messages.length })
    }

    if (url.pathname === '/api/messages' && method === 'POST') {
      const key = new Headers(init.headers).get('Idempotency-Key')
      const existing = key ? idempotency.get(key) : undefined
      if (existing) return json(200, existing)

      let body: unknown
      try {
        body = JSON.parse(typeof init.body === 'string' ? init.body : '')
      } catch {
        return json(400, { error: 'Invalid JSON' })
      }
      if (settings.mode === 'validation') {
        return json(422, { errors: { email: '此 Email 今天已送出 3 次，請明天再試' } })
      }
      const result = validate(body)
      if ('errors' in result) return json(422, { errors: result.errors })

      const created: Message = { ...result.value, id: nextId++, createdAt: new Date().toISOString() }
      messages.push(created)
      if (key) idempotency.set(key, created)
      // 資料已寫入，但回應在閘道逾時：前端以為失敗，重試時靠 Idempotency-Key 避免重複新增
      if (flaky) return json(504, { error: 'Gateway Timeout' })
      return json(201, created)
    }

    return json(404, { error: 'Not Found' })
  }
}
