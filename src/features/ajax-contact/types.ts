export type Topic = 'order' | 'wholesale' | 'feedback' | 'other'

export interface MessageInput {
  name: string
  email: string
  topic: Topic
  message: string
}

export interface Message extends MessageInput {
  id: number
  createdAt: string
}

export interface MessagePage {
  items: Message[]
  page: number
  pageSize: number
  total: number
}

export type FieldName = keyof MessageInput
export type FieldErrors = Partial<Record<FieldName, string>>

/** 伺服器模式：Demo 控制面板切換，用來重現各種失敗情況 */
export type ServerMode = 'normal' | 'slow-flaky' | 'error500' | 'timeout' | 'offline' | 'validation'

export interface ServerSettings {
  mode: ServerMode
  latency: number
}

export interface RequestLogEntry {
  id: number
  method: string
  url: string
  /** HTTP 狀態碼；網路錯誤或取消時為 null */
  status: number | null
  outcome: string
  duration: number
  startedAt: number
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>
