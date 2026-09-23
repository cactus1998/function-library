import type { FieldSpec, NewsItem, Scenario } from '../types'

/** 以 SVG data URI 產生示意圖，demo 不依賴外部圖片 */
function thumb(hue: number, label: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue} 70% 72%)"/><stop offset="1" stop-color="hsl(${hue + 40} 60% 42%)"/></linearGradient></defs><rect width="640" height="360" fill="url(#g)"/><text x="40" y="320" font-family="sans-serif" font-size="36" font-weight="700" fill="rgba(255,255,255,.85)">${label}</text></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

const normal: NewsItem[] = [
  { id: 'n1', title: '秋季限定：桂花烏龍拿鐵上市', category: '新品', publishedAt: '2026-09-18', url: '/news/n1', summary: '以台灣凍頂烏龍為基底，加入手工桂花糖漿，九月底前全門市供應。', imageUrl: thumb(30, 'NEW') },
  { id: 'n2', title: '中秋連假營業時間調整公告', category: '公告', publishedAt: '2026-09-15', url: '/news/n2', summary: '9/25–9/27 門市營業時間改為 10:00–17:00，線上訂單照常出貨。', imageUrl: thumb(200, 'NOTICE') },
  { id: 'n3', title: '咖啡職人講座：手沖的水溫與研磨', category: '活動', publishedAt: '2026-09-10', url: '/news/n3', summary: '名額 20 位，報名即贈當季單品豆一包。', imageUrl: thumb(140, 'EVENT') },
  { id: 'n4', title: '會員點數 10 月起可折抵運費', category: '公告', publishedAt: '2026-09-05', url: '/news/n4', summary: '每 100 點折抵 10 元，單筆最高折抵 60 元。', imageUrl: thumb(260, 'MEMBER') },
  { id: 'n5', title: '台中勤美門市開幕', category: '門市', publishedAt: '2026-08-28', url: '/news/n5', summary: '開幕首週全品項九折，前 100 名贈限定帆布袋。', imageUrl: thumb(330, 'OPEN') },
  { id: 'n6', title: '衣索比亞新產季生豆到港', category: '新品', publishedAt: '2026-08-20', url: '/news/n6', summary: '水洗耶加雪菲與日曬古吉兩支批次，預計九月中上架。', imageUrl: thumb(60, 'BEANS') },
]

export const SCENARIOS: readonly Scenario[] = [
  {
    id: 'normal',
    label: '正常資料',
    description: '6 筆完整資料，每個欄位都有值。',
    items: normal,
  },
  {
    id: 'empty',
    label: '空列表',
    description: 'API 回傳空陣列：顯示提示文字，而不是一片空白。',
    items: [],
  },
  {
    id: 'long',
    label: '超長文字',
    description: '標題與摘要遠超設計稿長度，含無空白的英文與網址。',
    items: [
      {
        ...normal[0]!,
        id: 'l1',
        title: '【重要】2026 年度會員權益全面升級說明：點數回饋、生日禮、免運門檻、專屬客服與線上課程折扣一次看',
        summary: '即日起會員權益調整如下：一般會員消費每 30 元累積 1 點，金卡會員每 20 元累積 1 點，黑卡會員每 10 元累積 1 點；生日當月可領取指定飲品一杯；全站滿 799 元免運；專屬客服時間延長至晚間十點。詳細條款請參考會員中心公告，本公司保留修改權利。',
      },
      {
        ...normal[1]!,
        id: 'l2',
        category: 'Announcement-and-Very-Long-Category',
        title: 'Supercalifragilisticexpialidocious-limited-edition-cold-brew-concentrate-2026',
        summary: '詳見 https://example.com/campaigns/2026/autumn/limited-edition/cold-brew-concentrate?utm_source=newsletter&utm_medium=email&utm_campaign=autumn',
      },
      { ...normal[2]!, id: 'l3', title: '短標', summary: '短摘要。' },
    ],
  },
  {
    id: 'broken-image',
    label: '圖片載入失敗',
    description: '圖片網址格式正確但檔案不存在（404），以及網址格式錯誤兩種情況。',
    items: [
      { ...normal[0]!, id: 'b1', imageUrl: '/images/news/2026-0918-latte.jpg' },
      { ...normal[1]!, id: 'b2', imageUrl: 'not a url' },
      { ...normal[2]!, id: 'b3' },
    ],
  },
  {
    id: 'optional',
    label: '選填欄位缺漏',
    description: '沒有圖片、沒有摘要、分類為空字串：缺的區塊整段不輸出。',
    items: [
      { id: 'o1', title: '只有標題與日期的消息', category: '公告', publishedAt: '2026-09-12', url: '/news/o1' },
      { id: 'o2', title: '沒有分類的消息', category: '', publishedAt: '2026-09-11', url: '/news/o2', summary: '分類為空字串時，不輸出空的 span。', imageUrl: thumb(180, 'NO CAT') },
      { id: 'o3', title: '日期格式錯誤的消息', category: '活動', publishedAt: '2026/9/1', url: '/news/o3', summary: '後端給了 2026/9/1，不符合 YYYY-MM-DD，前端不猜測，直接不顯示日期並回報。' },
    ],
  },
  {
    id: 'unsafe',
    label: '不安全內容',
    description: '後台編輯貼上 HTML、網址帶 javascript: 協定、圖片網址夾帶屬性。',
    items: [
      { id: 'u1', title: '<img src=x onerror="alert(\'XSS\')">新品上市', category: '<b>新品</b>', publishedAt: '2026-09-18', url: 'javascript:alert(1)', summary: '<script>alert("XSS")</script> 標籤會以純文字顯示。', imageUrl: thumb(0, 'SAFE') },
      { id: 'u2', title: '"引號" & \'單引號\' 與 <尖括號>', category: '公告', publishedAt: '2026-09-17', url: '/news/u2?a=1&b=2', summary: '& 與引號都會被跳脫，網址中的 & 也一樣。', imageUrl: '" onerror="alert(1)' },
    ],
  },
]

export const FIELD_SPECS: readonly FieldSpec[] = [
  { field: 'id', type: 'string', required: true, rule: '唯一值', whenMissing: '—' },
  { field: 'title', type: 'string', required: true, rule: '建議 60 字內，純文字', whenMissing: '顯示「（未命名）」，超過兩行截斷' },
  { field: 'category', type: 'string', required: true, rule: '可為空字串', whenMissing: '不輸出分類標籤' },
  { field: 'publishedAt', type: 'string', required: true, rule: 'YYYY-MM-DD', whenMissing: '格式錯誤時不顯示日期' },
  { field: 'url', type: 'string', required: true, rule: '站內路徑或 http(s)', whenMissing: '其他協定改為 #' },
  { field: 'summary', type: 'string', required: false, rule: '建議 120 字內，純文字', whenMissing: '整段不輸出，超過三行截斷' },
  { field: 'imageUrl', type: 'string', required: false, rule: '16:9，建議 640×360 以上', whenMissing: '顯示品牌底圖；載入失敗同樣處理' },
]

/** 交給後端的模板：以 {{ }} 標示欄位，[if] 區塊代表選填欄位有值才輸出 */
export const TEMPLATE_SNIPPET = `<ul class="news-list">
  <!-- [each item] -->
  <li class="news-card">
    <a class="news-card__link" href="{{ url }}">
      <!-- [if imageUrl] -->
      <div class="news-card__media">
        <img src="{{ imageUrl }}" alt="" width="640" height="360"
             loading="lazy" decoding="async">
      </div>
      <!-- [else] -->
      <div class="news-card__media news-card__media--empty" aria-hidden="true"></div>
      <!-- [end] -->
      <div class="news-card__body">
        <p class="news-card__meta">
          <!-- [if category] --><span class="news-card__category">{{ category }}</span><!-- [end] -->
          <time datetime="{{ publishedAt }}">{{ publishedAt | YYYY/MM/DD }}</time>
        </p>
        <h3 class="news-card__title">{{ title }}</h3>
        <!-- [if summary] -->
        <p class="news-card__summary">{{ summary }}</p>
        <!-- [end] -->
      </div>
    </a>
  </li>
  <!-- [end each] -->
</ul>
<!-- 列表為空時改輸出 -->
<p class="news-empty">目前沒有最新消息，請稍後再來看看。</p>`
