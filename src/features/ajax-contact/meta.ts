import type { FeatureMeta } from '../types'

const meta: FeatureMeta = {
  slug: 'ajax-contact',
  title: 'Ajax 表單與分頁列表',
  summary:
    '以原生 fetch 串接聯絡表單與留言分頁，不用 axios。模擬後端回傳真正的 Response 物件，可切換正常、不穩定、500、逾時、斷線、422 六種狀態；頁面下方的 Network 面板記錄每個請求的狀態碼與耗時，可以對照前端怎麼處理每一種失敗。',
  tags: ['ajax', 'async', 'form', 'a11y'],
  highlights: [
    'fetch 只在網路層失敗時 reject，4xx／5xx 仍會 resolve：封裝層檢查 res.ok，把逾時、斷線、HTTP 錯誤、422 欄位錯誤、JSON 格式錯誤轉成同一個 ApiError，畫面只需判斷 kind',
    '逾時以 AbortController + setTimeout 實作，並與呼叫端的 signal 串接；切換分頁時取消上一個請求，舊回應不會蓋掉新頁面',
    'GET 是冪等的，遇到 5xx／斷線自動以指數退避加隨機抖動重試兩次；POST 不自動重試，手動重試時帶同一個 Idempotency-Key，就算上一次其實已送達（504）也不會重複留言',
    '表單用 novalidate 保留 HTML5 驗證屬性（required、type="email"、minlength），再以 Constraint Validation API 的 ValidityState 產生統一的中文訊息；blur 才顯示錯誤，送出時聚焦第一個錯誤欄位',
    '伺服器 422 的欄位錯誤會對應回各欄位，並以 aria-invalid、aria-describedby 讓螢幕閱讀器讀出；送出中停用按鈕，防止重複送出',
  ],
  difficulty: 'intermediate',
  createdAt: '2026-09-23',
}

export default meta
