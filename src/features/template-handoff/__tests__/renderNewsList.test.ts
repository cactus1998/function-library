import { describe, expect, it } from 'vitest'
import { SCENARIOS, TEMPLATE_SNIPPET } from '../data/scenarios'
import type { NewsItem } from '../types'
import { renderNewsList } from '../utils/renderNewsList'

const base: NewsItem = {
  id: 'a',
  title: '標題',
  category: '公告',
  publishedAt: '2026-09-18',
  url: '/news/a',
  summary: '摘要',
  imageUrl: '/img/a.jpg',
}

/** 解析成 DOM 再斷言，比對字串容易因排版變動而誤判 */
function render(items: NewsItem[]): HTMLElement {
  const root = document.createElement('div')
  root.innerHTML = renderNewsList(items)
  return root
}

describe('renderNewsList', () => {
  it('renders one card per item with every field in place', () => {
    const root = render([base, { ...base, id: 'b', url: '/news/b' }])
    const cards = root.querySelectorAll('.news-card')
    expect(cards).toHaveLength(2)

    const card = cards[0]!
    expect(card.querySelector('a')!.getAttribute('href')).toBe('/news/a')
    expect(card.querySelector('.news-card__title')!.textContent).toBe('標題')
    expect(card.querySelector('.news-card__category')!.textContent).toBe('公告')
    expect(card.querySelector('.news-card__summary')!.textContent).toBe('摘要')
    expect(card.querySelector('time')!.getAttribute('datetime')).toBe('2026-09-18')
    expect(card.querySelector('time')!.textContent).toBe('2026/09/18')
  })

  it('gives images intrinsic size and lazy loading to prevent layout shift', () => {
    const img = render([base]).querySelector('img')!
    expect(img.getAttribute('width')).toBe('640')
    expect(img.getAttribute('height')).toBe('360')
    expect(img.getAttribute('loading')).toBe('lazy')
    expect(img.getAttribute('alt')).toBe('')
  })

  it('shows an empty-state message instead of an empty list', () => {
    const root = render([])
    expect(root.querySelector('ul')).toBeNull()
    expect(root.querySelector('.news-empty')!.textContent).toContain('目前沒有最新消息')
  })

  it('omits optional blocks entirely when their value is missing', () => {
    const { summary: _summary, imageUrl: _imageUrl, ...required } = base
    const card = render([{ ...required, category: '  ' }]).querySelector('.news-card')!
    expect(card.querySelector('.news-card__summary')).toBeNull()
    expect(card.querySelector('.news-card__category')).toBeNull()
    expect(card.querySelector('img')).toBeNull()
    expect(card.querySelector('.news-card__media--empty')).not.toBeNull()
  })

  it('falls back to a placeholder title and hides invalid dates', () => {
    const card = render([{ ...base, title: '   ', publishedAt: '2026/9/1' }]).querySelector('.news-card')!
    expect(card.querySelector('.news-card__title')!.textContent).toBe('（未命名）')
    expect(card.querySelector('time')).toBeNull()
  })

  it('renders injected markup as plain text', () => {
    const title = '<img src=x onerror="alert(1)">新品'
    const root = render([{ ...base, title, category: '<b>新品</b>', summary: '<script>alert(1)</script>' }])
    expect(root.querySelector('script')).toBeNull()
    expect(root.querySelector('b')).toBeNull()
    expect(root.querySelectorAll('img')).toHaveLength(1)
    expect(root.querySelector('.news-card__title')!.textContent).toBe(title)
  })

  it('cannot be broken out of an attribute by quotes in a URL', () => {
    const root = render([{ ...base, url: '/news/a" onclick="alert(1)' }])
    const link = root.querySelector('a')!
    expect(link.hasAttribute('onclick')).toBe(false)
    expect(link.getAttribute('href')).toBe('/news/a" onclick="alert(1)')
  })

  it('replaces unsafe links with # and unsafe images with the placeholder', () => {
    const root = render([{ ...base, url: 'javascript:alert(1)', imageUrl: '" onerror="alert(1)' }])
    expect(root.querySelector('a')!.getAttribute('href')).toBe('#')
    expect(root.querySelector('img')).toBeNull()
    expect(root.querySelector('.news-card__media--empty')).not.toBeNull()
  })

  it('never emits script tags, event handlers or javascript: URLs for any demo scenario', () => {
    for (const scenario of SCENARIOS) {
      const root = render(scenario.items)
      expect(root.querySelector('script')).toBeNull()
      for (const el of root.querySelectorAll('*')) {
        for (const attr of el.attributes) {
          expect(attr.name.startsWith('on')).toBe(false)
          expect(attr.value.trim().toLowerCase().startsWith('javascript:')).toBe(false)
        }
      }
    }
  })
})

describe('TEMPLATE_SNIPPET', () => {
  it('uses every class that renderNewsList outputs, so the hand-off template does not drift', () => {
    const rendered = [...SCENARIOS.flatMap((s) => [...render(s.items).querySelectorAll('[class]')])]
    const classes = new Set(rendered.flatMap((el) => [...el.classList]))
    expect(classes.size).toBeGreaterThan(0)
    for (const name of classes) expect(TEMPLATE_SNIPPET).toContain(name)
  })

  it('marks every field of the data contract', () => {
    for (const field of ['url', 'imageUrl', 'category', 'publishedAt', 'title', 'summary']) {
      expect(TEMPLATE_SNIPPET).toContain(`{{ ${field}`)
    }
  })
})
