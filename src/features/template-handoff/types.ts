/** 後端 API 回傳的一則最新消息（交接文件中的資料格式） */
export interface NewsItem {
  id: string
  title: string
  category: string
  /** YYYY-MM-DD */
  publishedAt: string
  url: string
  summary?: string
  imageUrl?: string
}

export type ScenarioId = 'normal' | 'empty' | 'long' | 'broken-image' | 'optional' | 'unsafe'

export interface Scenario {
  id: ScenarioId
  label: string
  description: string
  items: NewsItem[]
}

export type IssueLevel = 'error' | 'warning'

export interface DataIssue {
  itemId: string
  field: keyof NewsItem
  level: IssueLevel
  message: string
}

export interface FieldSpec {
  field: keyof NewsItem
  type: string
  required: boolean
  rule: string
  whenMissing: string
}
