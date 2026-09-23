import type { FeatureMeta } from '../types'

const meta: FeatureMeta = {
  slug: 'interview-quiz',
  title: '前端面試題庫',
  summary:
    '選擇 JavaScript、TypeScript、Vue 3 主題、難度（基礎／進階／深入）與題數，從 95 題中隨機出選擇題；交卷後對答案、看解析，答錯的題目自動收進錯題本，可以只重做錯題。作答進度存在 localStorage，重新整理不會遺失。',
  tags: ['state', 'composable', 'a11y', 'persistence'],
  highlights: [
    '出題、洗牌、計分、錯題本更新都是純函式；洗牌用 Fisher–Yates，亂數來源可注入（mulberry32 固定 seed），測試結果可重現',
    '選項打亂只記錄排列 order，答案仍存原始索引：計分不受畫面順序影響，對答案時再換回作答當下看到的 A–D 字母',
    '狀態機只有 setup / answering / result 三種，由 session 是否存在與 submitted 推導，不另外存 phase，避免狀態不一致',
    '作答進度與錯題本存進 localStorage 並帶版本號；讀回時逐題驗證，題庫更新後已刪除的題目或選項數改變的排列會被略過',
    '選項使用原生 radio + role="radiogroup"，方向鍵即可切換；換題時焦點移到題目，交卷與重做以 live region 宣告',
  ],
  difficulty: 'basic',
  createdAt: '2026-09-21',
}

export default meta
