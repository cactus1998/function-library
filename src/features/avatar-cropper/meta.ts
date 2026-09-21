import type { FeatureMeta } from '../types'

const meta: FeatureMeta = {
  slug: 'avatar-cropper',
  title: '大頭貼上傳裁切',
  summary:
    '選照片、拖曳與雙指縮放對好位置、裁成圓形、壓縮後上傳。不用裁切套件：以純函式處理縮放與邊界，Canvas 輸出時在 200 KB 預算內調整品質，上傳有進度、可取消與重試。',
  tags: ['browser-api', 'pointer', 'canvas', 'async'],
  highlights: [
    '裁切狀態只有 { scale, x, y }，平移與縮放都是純函式並經過 clamp，圖片永遠蓋滿裁切框；以焦點為中心縮放：x′ = fx − (fx − x) × s′ / s',
    'Pointer Events + setPointerCapture 同時支援滑鼠與觸控，雙指以中點為焦點縮放；滾輪以非 passive listener 註冊才能阻止頁面捲動',
    '拖曳時只更新 CSS transform，三種尺寸的預覽也是同一個 transform 等比縮小，不重繪 canvas；按「完成」才用 canvas 輸出 512×512',
    '壓縮品質從 0.92 往下試，第一個 ≤ 200 KB 就停；瀏覽器不支援 WebP 編碼時（toBlob 回傳 PNG）退回 JPEG',
    '選檔、拖放、Ctrl+V 貼上三種來源；以 token 丟棄較舊的解碼結果，所有 object URL 在替換與 unmount 時釋放',
    '上傳進度介面與 XHR upload.onprogress 相同，AbortController 取消，失敗可重試；live region 每 25% 宣告一次',
  ],
  difficulty: 'intermediate',
  createdAt: '2026-09-21',
}

export default meta
