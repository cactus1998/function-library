import type { FeatureMeta } from '../types'

const meta: FeatureMeta = {
  slug: 'split-bill',
  title: '聚餐分帳',
  summary:
    '記下每筆是誰先墊的，支援平分、按份數、指定金額與 10% 服務費，最後算出誰該轉給誰。金額全程以整數計算，除不盡時以最大餘數法分配，金額欄位可以直接輸入算式。',
  tags: ['algorithm', 'form', 'composable', 'persistence'],
  highlights: [
    '金額全程為整數元；除不盡時以最大餘數法（Hamilton）分配，1000 元三人平分為 334 / 333 / 333，加總永遠等於總額，結果可重現',
    '結算用貪婪法讓最大債權人與最大債務人配對，每步至少一人歸零，轉帳數 ≤ 人數 − 1；可說明最少轉帳數為 NP-hard 的取捨',
    '金額欄位支援算式：自寫 tokenizer 與遞迴下降解析器（運算子優先序、括號、一元負號），處理全形數字與千分位，不使用 eval',
    '刪除帳目後 5 秒內可復原，連續刪除時前一筆直接確定；有相關帳目的成員不可刪除',
    'localStorage 以版本號保存，debounce 300ms 寫入、pagehide 補存；讀取時逐筆驗證，引用不存在成員的帳目只丟棄該筆',
    '複製結算文字：Clipboard API 失敗時退回 execCommand，並把焦點還給原按鈕',
  ],
  difficulty: 'intermediate',
  createdAt: '2026-09-21',
}

export default meta
