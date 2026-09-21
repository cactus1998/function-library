export type CommandGroup = 'navigation' | 'appearance' | 'action' | 'remote'

export type CommandSource = 'palette' | 'shortcut'

export interface CommandContext {
  source: CommandSource
}

export interface Command {
  id: string
  title: string
  group: CommandGroup
  /** 額外的搜尋字詞，例如英文或同義詞 */
  keywords?: string[]
  /**
   * 拼音首字母，必須與 title 逐字對齊（「切換主題」對應 'qhzt'），
   * 讓「qhzt」這類查詢能命中並把高亮位置映射回 title。
   */
  initials?: string
  /** 'mod+shift+l'（組合鍵）或 'g h'（序列鍵） */
  shortcut?: string
  disabled?: boolean
  perform?: (ctx: CommandContext) => void | Promise<void>
  /** 有則為子頁入口，與 perform 互斥 */
  children?: () => Command[]
}

/** 閉區間 [start, end]，與 Fuse.js 的 indices 格式一致 */
export type MatchRange = readonly [start: number, end: number]

export interface SearchResult {
  command: Command
  /** Fuse 分數：0 為完全符合，越大越不相關；空查詢時為 0 */
  score: number
  /** title 中命中的字元範圍 */
  matches: MatchRange[]
}

export type RemoteStatus = 'idle' | 'debouncing' | 'loading' | 'success' | 'error'

export type RemoteFetcher = (query: string, signal: AbortSignal) => Promise<Command[]>

export interface ShortcutBinding {
  shortcut: string
  handler: (event: KeyboardEvent) => void
}
