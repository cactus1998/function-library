import type { FetchLike, FieldErrors, FieldName, Message, MessageInput, MessagePage } from '../types'

export type ApiErrorKind = 'timeout' | 'network' | 'http' | 'validation' | 'aborted' | 'parse'

export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly status: number | null
  readonly fieldErrors: FieldErrors

  constructor(kind: ApiErrorKind, message: string, status: number | null = null, fieldErrors: FieldErrors = {}) {
    super(message)
    this.name = 'ApiError'
    this.kind = kind
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

export const REQUEST_TIMEOUT_MS = 5000

interface RequestOptions {
  method?: 'GET' | 'POST'
  body?: unknown
  headers?: Record<string, string>
  signal?: AbortSignal
  timeoutMs?: number
}

const FIELD_NAMES: readonly FieldName[] = ['name', 'email', 'topic', 'message']

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function toFieldErrors(body: unknown): FieldErrors {
  const errors: FieldErrors = {}
  if (!isRecord(body) || !isRecord(body.errors)) return errors
  for (const field of FIELD_NAMES) {
    const message = body.errors[field]
    if (typeof message === 'string') errors[field] = message
  }
  return errors
}

function statusMessage(status: number): string {
  if (status >= 500) return `伺服器暫時無法處理（${status}），請稍後再試`
  if (status === 404) return '找不到資源（404）'
  if (status === 429) return '請求太頻繁，請稍後再試（429）'
  return `請求失敗（${status}）`
}

/**
 * fetch 的薄封裝：逾時、取消、HTTP 錯誤、JSON 解析錯誤都轉成 ApiError。
 * fetch 只有在網路層失敗才 reject，4xx／5xx 仍然 resolve，要自己檢查 res.ok。
 */
export async function requestJson(fetcher: FetchLike, url: string, options: RequestOptions = {}): Promise<unknown> {
  const { method = 'GET', body, headers = {}, signal, timeoutMs = REQUEST_TIMEOUT_MS } = options
  const controller = new AbortController()
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeoutMs)
  const forwardAbort = () => controller.abort()
  if (signal?.aborted) controller.abort()
  signal?.addEventListener('abort', forwardAbort, { once: true })

  let response: Response
  try {
    response = await fetcher(url, {
      method,
      headers: body === undefined ? headers : { 'Content-Type': 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    })
  } catch (error) {
    if (timedOut) throw new ApiError('timeout', `超過 ${timeoutMs / 1000} 秒沒有回應，請檢查網路後重試`)
    if (signal?.aborted) throw new ApiError('aborted', '請求已取消')
    if (error instanceof TypeError) throw new ApiError('network', '無法連線到伺服器，請確認網路連線')
    throw error
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', forwardAbort)
  }

  let data: unknown = null
  const text = await response.text()
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      if (response.ok) throw new ApiError('parse', '伺服器回應格式錯誤', response.status)
    }
  }

  if (response.status === 422) {
    throw new ApiError('validation', '有欄位未通過伺服器驗證', 422, toFieldErrors(data))
  }
  if (!response.ok) throw new ApiError('http', statusMessage(response.status), response.status)
  return data
}

export function isRetryable(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false
  if (error.kind === 'network' || error.kind === 'timeout') return true
  return error.kind === 'http' && error.status !== null && error.status >= 500
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new ApiError('aborted', '請求已取消'))
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    function onAbort() {
      clearTimeout(timer)
      reject(new ApiError('aborted', '請求已取消'))
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

export interface RetryOptions {
  retries: number
  baseDelay: number
  signal?: AbortSignal
  onRetry?: (attempt: number, waitMs: number, error: unknown) => void
  random?: () => number
}

/** 指數退避：等待 base × 2^n，再加上最多 30% 的隨機抖動，避免大量客戶端同時重試 */
export function backoffDelay(attempt: number, baseDelay: number, random: () => number = Math.random): number {
  const exp = baseDelay * 2 ** attempt
  return Math.round(exp + exp * 0.3 * random())
}

export async function withRetry<T>(task: () => Promise<T>, options: RetryOptions): Promise<T> {
  const { retries, baseDelay, signal, onRetry, random } = options
  for (let attempt = 0; ; attempt++) {
    try {
      return await task()
    } catch (error) {
      if (attempt >= retries || !isRetryable(error) || signal?.aborted) throw error
      const wait = backoffDelay(attempt, baseDelay, random)
      onRetry?.(attempt + 1, wait, error)
      await sleep(wait, signal)
    }
  }
}

function isMessage(value: unknown): value is Message {
  return (
    isRecord(value) &&
    typeof value.id === 'number' &&
    typeof value.name === 'string' &&
    typeof value.email === 'string' &&
    typeof value.topic === 'string' &&
    typeof value.message === 'string' &&
    typeof value.createdAt === 'string'
  )
}

function isMessagePage(value: unknown): value is MessagePage {
  return (
    isRecord(value) &&
    Array.isArray(value.items) &&
    value.items.every(isMessage) &&
    typeof value.page === 'number' &&
    typeof value.pageSize === 'number' &&
    typeof value.total === 'number'
  )
}

export interface ListOptions {
  signal?: AbortSignal
  onRetry?: RetryOptions['onRetry']
}

export function createMessagesApi(fetcher: FetchLike) {
  return {
    /** GET 是冪等的，失敗時自動重試兩次 */
    async list(page: number, pageSize: number, options: ListOptions = {}): Promise<MessagePage> {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
      const data = await withRetry(() => requestJson(fetcher, `/api/messages?${params}`, { signal: options.signal }), {
        retries: 2,
        baseDelay: 500,
        signal: options.signal,
        onRetry: options.onRetry,
      })
      if (!isMessagePage(data)) throw new ApiError('parse', '伺服器回應格式錯誤')
      return data
    },

    /** POST 不自動重試；使用者手動重試時沿用同一個 Idempotency-Key，伺服器不會重複建立 */
    async create(input: MessageInput, idempotencyKey: string, signal?: AbortSignal): Promise<Message> {
      const data = await requestJson(fetcher, '/api/messages', {
        method: 'POST',
        body: input,
        headers: { 'Idempotency-Key': idempotencyKey },
        signal,
      })
      if (!isMessage(data)) throw new ApiError('parse', '伺服器回應格式錯誤')
      return data
    },
  }
}

export type MessagesApi = ReturnType<typeof createMessagesApi>
