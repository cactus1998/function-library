import { describe, expect, it } from 'vitest'
import { SCENARIOS } from '../data/scenarios'
import type { NewsItem } from '../types'
import { SUMMARY_MAX, TITLE_MAX, validateNews } from '../utils/validateNews'

const valid: NewsItem = {
  id: 'a',
  title: '標題',
  category: '公告',
  publishedAt: '2026-09-18',
  url: '/news/a',
  summary: '摘要',
  imageUrl: '/img/a.jpg',
}

function fieldsOf(item: NewsItem) {
  return validateNews([item]).map((issue) => `${issue.level}:${issue.field}`)
}

describe('validateNews', () => {
  it('reports nothing for data that follows the contract', () => {
    expect(validateNews([valid])).toEqual([])
    expect(validateNews([])).toEqual([])
  })

  it('reports nothing for the normal demo scenario', () => {
    expect(validateNews(SCENARIOS.find((s) => s.id === 'normal')!.items)).toEqual([])
  })

  it('treats an empty title as an error', () => {
    expect(fieldsOf({ ...valid, title: '  ' })).toEqual(['error:title'])
  })

  it('warns when title or summary exceed the lengths the layout can show', () => {
    expect(fieldsOf({ ...valid, title: '字'.repeat(TITLE_MAX) })).toEqual([])
    expect(fieldsOf({ ...valid, title: '字'.repeat(TITLE_MAX + 1) })).toEqual(['warning:title'])
    expect(fieldsOf({ ...valid, summary: '字'.repeat(SUMMARY_MAX + 1) })).toEqual(['warning:summary'])
  })

  it('warns when the title contains HTML so editors know it will show as text', () => {
    expect(fieldsOf({ ...valid, title: '<b>新品</b>' })).toEqual(['warning:title'])
  })

  it('reports unsafe links, invalid dates and bad image URLs as errors', () => {
    expect(fieldsOf({ ...valid, url: 'javascript:alert(1)' })).toEqual(['error:url'])
    expect(fieldsOf({ ...valid, publishedAt: '2026/9/1' })).toEqual(['error:publishedAt'])
    expect(fieldsOf({ ...valid, imageUrl: 'not a url' })).toEqual(['error:imageUrl'])
  })

  it('does not complain about optional fields that are simply missing', () => {
    const { summary: _summary, imageUrl: _imageUrl, ...required } = valid
    expect(validateNews([required])).toEqual([])
  })

  it('tags every issue with the item id', () => {
    const issues = validateNews([valid, { ...valid, id: 'bad', url: 'ftp://x' }])
    expect(issues).toEqual([expect.objectContaining({ itemId: 'bad', field: 'url' })])
  })
})
