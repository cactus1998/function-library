import { describe, expect, it } from 'vitest'
import { escapeHtml, formatDate, isPlainDate, isSafeUrl } from '../utils/html'

describe('escapeHtml', () => {
  it('escapes all five HTML-significant characters', () => {
    expect(escapeHtml(`<a href="x" title='y'>&</a>`)).toBe('&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;')
  })

  it('escapes ampersands first so existing entities are shown literally', () => {
    expect(escapeHtml('&lt;')).toBe('&amp;lt;')
  })

  it('leaves plain text and non-ASCII characters untouched', () => {
    expect(escapeHtml('中秋連假 營業時間 ☕')).toBe('中秋連假 營業時間 ☕')
    expect(escapeHtml('')).toBe('')
  })
})

describe('isSafeUrl', () => {
  it.each([
    ['/news/1', 'link'],
    ['/news/1?a=1&b=2', 'link'],
    ['#top', 'link'],
    ['https://example.com/a', 'link'],
    ['http://example.com/a', 'image'],
    ['  /padded  ', 'link'],
    ['data:image/png;base64,AAAA', 'image'],
    ['data:image/svg+xml,%3Csvg%3E', 'image'],
  ] as const)('accepts %s as %s', (url, kind) => {
    expect(isSafeUrl(url, kind)).toBe(true)
  })

  it.each([
    ['javascript:alert(1)', 'link'],
    ['JaVaScRiPt:alert(1)', 'link'],
    ['  javascript:alert(1)', 'link'],
    ['vbscript:msgbox(1)', 'link'],
    ['data:text/html,<script>alert(1)</script>', 'link'],
    ['data:image/png;base64,AAAA', 'link'],
    ['data:text/html,<script>alert(1)</script>', 'image'],
    ['//evil.example.com/x.png', 'image'],
    ['#top', 'image'],
    ['not a url', 'link'],
    ['" onerror="alert(1)', 'image'],
    ['', 'link'],
    ['   ', 'image'],
  ] as const)('rejects %s as %s', (url, kind) => {
    expect(isSafeUrl(url, kind)).toBe(false)
  })
})

describe('isPlainDate', () => {
  it('accepts real calendar dates in YYYY-MM-DD', () => {
    expect(isPlainDate('2026-09-23')).toBe(true)
    expect(isPlainDate('2028-02-29')).toBe(true)
  })

  it('rejects other formats and impossible dates', () => {
    for (const value of ['2026/9/1', '2026-9-1', '20260901', '2026-02-30', '2027-02-29', '2026-13-01', '', '2026-09-23T00:00']) {
      expect(isPlainDate(value)).toBe(false)
    }
  })
})

describe('formatDate', () => {
  it('formats the same calendar day regardless of the local time zone', () => {
    expect(formatDate('2026-09-01')).toBe('2026/09/01')
    expect(formatDate('2026-12-31')).toBe('2026/12/31')
  })
})
