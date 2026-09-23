export const SNIPPETS = {
  aspectRatio: `/* 預設：舊瀏覽器也看得懂的 padding hack */
.ratio {
  position: relative;
  height: 0;
  padding-top: 56.25%; /* 9 / 16，百分比以「寬度」為基準 */
}
.ratio > * {
  position: absolute;
  inset: 0;
}

/* 支援時改用原生寫法（漸進增強） */
@supports (aspect-ratio: 16 / 9) {
  .ratio {
    height: auto;
    padding-top: 0;
    aspect-ratio: 16 / 9;
  }
}`,

  flexGap: `/* flex gap 無法用 @supports 偵測（Safari 13 只支援 grid gap，
   @supports (gap: 1px) 卻回傳 true），改用 JS 量測後加 class */
.tags > * + * {
  margin-left: 8px;          /* fallback */
}
.flex-gap .tags {
  gap: 8px;
}
.flex-gap .tags > * + * {
  margin-left: 0;
}`,

  has: `/* 支援 :has() 時純 CSS 完成 */
@supports selector(:has(*)) {
  .plan:has(input:checked) {
    border-color: var(--accent);
  }
}

/* 不支援時由 JS 在變更時加上 class */
.plan.is-checked {
  border-color: var(--accent);
}`,

  dvh: `.screen {
  /* 同一屬性寫兩次：不認得 dvh 的瀏覽器會忽略第二行，保留第一行 */
  height: 100vh;
  height: 100dvh;
}`,

  inputZoom: `/* iOS Safari：聚焦時字級小於 16px 會自動放大頁面 */
input,
select,
textarea {
  font-size: 16px; /* 或 1rem，且根字級不小於 16px */
}

/* 不要用 maximum-scale=1 關掉縮放，會傷害視障使用者 */`,

  lineClamp: `.title {
  /* fallback：固定兩行高度，沒有省略號 */
  max-height: calc(1.5em * 2);
  line-height: 1.5;
  overflow: hidden;
}

@supports (-webkit-line-clamp: 2) {
  .title {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    max-height: none;
  }
}`,

  dateInput: `function supportsDateInput() {
  const input = document.createElement('input')
  input.setAttribute('type', 'date')
  return input.type === 'date' // 不支援會退回 "text"
}

// 不支援時改成文字欄位，用 pattern 驗證格式
<input type="text" inputmode="numeric"
       pattern="\\d{4}-\\d{2}-\\d{2}" placeholder="YYYY-MM-DD">`,
} as const
