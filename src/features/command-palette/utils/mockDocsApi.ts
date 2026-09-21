import type { Command, RemoteFetcher } from '../types'

export const DOC_TITLES = [
  'Vue 3 Composition API 入門',
  'Vue Router 導覽守衛',
  'Vue 響應式原理：ref 與 reactive',
  'Pinia setup store 寫法',
  'TypeScript 泛型與型別收窄',
  'TypeScript satisfies 運算子',
  'Vite 環境變數與模式',
  'Vitest 假計時器',
  'WAI-ARIA combobox 模式',
  'WAI-ARIA listbox 與 aria-activedescendant',
  'AbortController 取消請求',
  'Debounce 與 Throttle 的差別',
  'Fuse.js 模糊搜尋設定',
  'IME 組字事件與 isComposing',
  '原生 dialog 與 showModal',
  'inert 屬性與焦點管理',
  'prefers-reduced-motion 無障礙動畫',
  'localStorage 版本遷移策略',
  'Web Vitals：INP 指標',
  'CSS @starting-style 進場動畫',
]

export interface MockDocsStats {
  sent: number
  aborted: number
  failed: number
}

export interface MockDocsOptions {
  /** 每次請求時讀取，0–1 */
  failureRate: () => number
  onOpen: (title: string) => void
  stats?: MockDocsStats
  minDelay?: number
  maxDelay?: number
  random?: () => number
}

function abortError(): DOMException {
  return new DOMException('The request was aborted.', 'AbortError')
}

/** 模擬文件搜尋 API：延遲 300–800ms、可設定失敗率，並正確回應 AbortSignal */
export function createMockDocsFetcher(options: MockDocsOptions): RemoteFetcher {
  const { failureRate, onOpen, stats, minDelay = 300, maxDelay = 800, random = Math.random } = options

  return (query, signal) =>
    new Promise<Command[]>((resolve, reject) => {
      if (signal.aborted) {
        reject(abortError())
        return
      }
      if (stats) stats.sent++

      const onAbort = () => {
        clearTimeout(timer)
        if (stats) stats.aborted++
        reject(abortError())
      }

      const timer = setTimeout(
        () => {
          signal.removeEventListener('abort', onAbort)
          if (random() < failureRate()) {
            if (stats) stats.failed++
            reject(new Error('模擬的網路錯誤（HTTP 503）'))
            return
          }
          const needle = query.toLowerCase()
          resolve(
            DOC_TITLES.filter((title) => title.toLowerCase().includes(needle))
              .slice(0, 8)
              .map((title, i) => ({
                id: `doc-${i}-${title}`,
                title,
                group: 'remote',
                perform: () => onOpen(title),
              })),
          )
        },
        minDelay + random() * (maxDelay - minDelay),
      )

      signal.addEventListener('abort', onAbort, { once: true })
    })
}
