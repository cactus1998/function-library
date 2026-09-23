/**
 * 設計規格（design tokens）。CSS 的 @container 條件無法讀取 JS 常數，
 * LandingPage.vue 內的斷點數值必須與這裡保持一致。
 */

export interface Breakpoint {
  id: 'sm' | 'md' | 'lg'
  label: string
  /** 此斷點的最小寬度（px），含 */
  min: number
  columns: number
  gutter: number
  margin: number
}

export const BREAKPOINTS: readonly Breakpoint[] = [
  { id: 'sm', label: '手機', min: 0, columns: 4, gutter: 16, margin: 20 },
  { id: 'md', label: '平板', min: 640, columns: 8, gutter: 24, margin: 32 },
  { id: 'lg', label: '桌機', min: 1024, columns: 12, gutter: 24, margin: 48 },
]

export function breakpointFor(width: number): Breakpoint {
  let match = BREAKPOINTS[0]!
  for (const bp of BREAKPOINTS) {
    if (width >= bp.min) match = bp
  }
  return match
}

export interface ViewportPreset {
  width: number
  label: string
}

export const VIEWPORT_PRESETS: readonly ViewportPreset[] = [
  { width: 375, label: '手機' },
  { width: 768, label: '平板' },
  { width: 1024, label: '筆電' },
  { width: 1440, label: '桌機' },
]

export const VIEWPORT_MIN = 320
export const VIEWPORT_MAX = 1600

export interface ColorToken {
  name: string
  value: string
  usage: string
}

export const COLORS: readonly ColorToken[] = [
  { name: '--l-cream', value: '#f7f1e8', usage: '頁面底色' },
  { name: '--l-paper', value: '#fffdf9', usage: '卡片底色' },
  { name: '--l-ink', value: '#2b1d14', usage: '標題、主要文字' },
  { name: '--l-muted', value: '#6b5a4e', usage: '次要文字' },
  { name: '--l-brand', value: '#a5541f', usage: '按鈕、強調（白字 5.4:1，底色上 4.8:1）' },
  { name: '--l-line', value: '#e6dacb', usage: '分隔線、邊框' },
]

export interface TypeToken {
  role: string
  css: string
  range: string
}

export const TYPE_SCALE: readonly TypeToken[] = [
  { role: 'Hero 標題', css: 'clamp(2rem, 1.2rem + 4cqi, 3.75rem)', range: '32–60px' },
  { role: '區塊標題 H2', css: 'clamp(1.5rem, 1.1rem + 2cqi, 2.25rem)', range: '24–36px' },
  { role: '卡片標題 H3', css: '1.125rem', range: '18px' },
  { role: '內文', css: '1rem / 1.75', range: '16px' },
  { role: '輔助文字', css: '0.875rem', range: '14px' },
]

/** 間距以 8px 為基準 */
export const SPACING: readonly number[] = [4, 8, 16, 24, 32, 48, 64, 96]
