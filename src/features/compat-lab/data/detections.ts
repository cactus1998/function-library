export type DetectionKind = 'CSS' | 'JS' | 'HTML'

export interface Detection {
  id: string
  name: string
  kind: DetectionKind
  /** caniuse.com 的功能代稱 */
  caniuse: string
  fallback: string
  test: () => boolean
}

function cssSupports(condition: string): boolean {
  return typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports(condition)
}

/**
 * flex gap 無法用 CSS.supports 判斷：Safari 13 只支援 grid 的 gap，
 * 但 CSS.supports('gap: 1px') 會回傳 true。只能實際排版量測。
 */
export function detectFlexGap(): boolean {
  const flex = document.createElement('div')
  flex.style.cssText = 'display:flex;flex-direction:column;row-gap:1px;position:absolute;visibility:hidden'
  flex.append(document.createElement('div'), document.createElement('div'))
  document.body.append(flex)
  const supported = flex.scrollHeight === 1
  flex.remove()
  return supported
}

export const DETECTIONS: readonly Detection[] = [
  { id: 'aspect-ratio', name: 'aspect-ratio', kind: 'CSS', caniuse: 'mdn-css_properties_aspect-ratio', fallback: 'padding-top 百分比撐高', test: () => cssSupports('aspect-ratio: 1 / 1') },
  { id: 'flex-gap', name: 'flex 的 gap（量測）', kind: 'CSS', caniuse: 'flexbox-gap', fallback: '子元素 margin，最後一個歸零', test: detectFlexGap },
  { id: 'has', name: ':has() 選擇器', kind: 'CSS', caniuse: 'css-has', fallback: '由 JS 加上狀態 class', test: () => cssSupports('selector(:has(*))') },
  { id: 'dvh', name: 'dvh／svh 視窗單位', kind: 'CSS', caniuse: 'viewport-unit-variants', fallback: '先寫 100vh 再寫 100dvh', test: () => cssSupports('height: 100dvh') },
  { id: 'container', name: 'Container Queries', kind: 'CSS', caniuse: 'css-container-queries', fallback: '改用 @media 斷點', test: () => cssSupports('container-type: inline-size') },
  { id: 'line-clamp', name: 'line-clamp（無前綴）', kind: 'CSS', caniuse: 'css-line-clamp', fallback: '-webkit-line-clamp 或 max-height', test: () => cssSupports('line-clamp: 2') },
  { id: 'webkit-line-clamp', name: '-webkit-line-clamp', kind: 'CSS', caniuse: 'css-line-clamp', fallback: 'max-height + overflow: hidden', test: () => cssSupports('-webkit-line-clamp: 2') },
  { id: 'backdrop', name: 'backdrop-filter（無前綴）', kind: 'CSS', caniuse: 'css-backdrop-filter', fallback: '加 -webkit- 前綴，或改半透明底色', test: () => cssSupports('backdrop-filter: blur(1px)') },
  { id: 'subgrid', name: 'subgrid', kind: 'CSS', caniuse: 'css-subgrid', fallback: '固定列高或 JS 對齊', test: () => cssSupports('grid-template-columns: subgrid') },
  { id: 'focus-visible', name: ':focus-visible', kind: 'CSS', caniuse: 'css-focus-visible', fallback: '改用 :focus', test: () => cssSupports('selector(:focus-visible)') },
  { id: 'color-mix', name: 'color-mix()', kind: 'CSS', caniuse: 'mdn-css_types_color_color-mix', fallback: '預先算好的色碼', test: () => cssSupports('color: color-mix(in srgb, red, blue)') },
  { id: 'text-wrap', name: 'text-wrap: balance', kind: 'CSS', caniuse: 'css-text-wrap-balance', fallback: '不處理（漸進增強）', test: () => cssSupports('text-wrap: balance') },
  { id: 'date-input', name: '<input type="date">', kind: 'HTML', caniuse: 'input-datetime', fallback: '文字欄位 + pattern', test: detectDateInput },
  { id: 'lazy-img', name: '<img loading="lazy">', kind: 'HTML', caniuse: 'loading-lazy-attr', fallback: 'IntersectionObserver', test: () => 'loading' in HTMLImageElement.prototype },
  { id: 'dialog', name: '<dialog> showModal()', kind: 'HTML', caniuse: 'dialog', fallback: '自製 modal + focus trap', test: () => typeof HTMLDialogElement === 'function' && 'showModal' in HTMLDialogElement.prototype },
  { id: 'popover', name: 'Popover API', kind: 'HTML', caniuse: 'mdn-api_htmlelement_popover', fallback: '自製下拉選單', test: () => 'popover' in HTMLElement.prototype },
  { id: 'io', name: 'IntersectionObserver', kind: 'JS', caniuse: 'intersectionobserver', fallback: 'scroll 事件 + throttle', test: () => 'IntersectionObserver' in window },
  { id: 'ro', name: 'ResizeObserver', kind: 'JS', caniuse: 'resizeobserver', fallback: 'window resize 事件', test: () => 'ResizeObserver' in window },
  { id: 'abort', name: 'AbortController', kind: 'JS', caniuse: 'abortcontroller', fallback: '忽略過期回應的序號', test: () => 'AbortController' in window },
  { id: 'structured-clone', name: 'structuredClone()', kind: 'JS', caniuse: 'mdn-api_structuredclone', fallback: 'JSON 序列化（會遺失 Date、Map）', test: () => typeof structuredClone === 'function' },
  { id: 'clipboard', name: 'navigator.clipboard', kind: 'JS', caniuse: 'async-clipboard', fallback: '選取文字請使用者手動複製', test: () => !!navigator.clipboard },
  { id: 'view-transition', name: 'View Transitions', kind: 'JS', caniuse: 'view-transitions', fallback: '直接更新畫面（漸進增強）', test: () => 'startViewTransition' in document },
]

export function detectDateInput(): boolean {
  const input = document.createElement('input')
  input.setAttribute('type', 'date')
  // 不支援的瀏覽器會退回 text
  return input.type === 'date'
}
