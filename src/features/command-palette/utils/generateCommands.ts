import type { Command } from '../types'

const VERBS = ['開啟', '匯出', '封存', '分享', '複製', '重新命名', '釘選', '同步']
const NOUNS = ['報表', '專案', '看板', '筆記', '草稿', '儀表板', '工作區', '範本', '清單', '檔案']
const TAGS = ['report', 'project', 'board', 'note', 'draft', 'dashboard', 'workspace', 'template']

/** 壓力測試用：以索引決定內容，每次產生的結果相同 */
export function generateCommands(count: number, perform: Command['perform']): Command[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `generated-${i}`,
    title: `${VERBS[i % VERBS.length]}${NOUNS[(i * 7) % NOUNS.length]} #${String(i + 1).padStart(4, '0')}`,
    group: 'action',
    keywords: [TAGS[(i * 3) % TAGS.length]!, `item${i + 1}`],
    perform,
  }))
}
