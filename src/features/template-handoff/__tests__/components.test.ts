import { afterEach, describe, expect, it } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import HandoffApp from '../components/HandoffApp.vue'
import NewsPreview from '../components/NewsPreview.vue'
import type { NewsItem } from '../types'
import { renderNewsList } from '../utils/renderNewsList'

const item: NewsItem = {
  id: 'a',
  title: '標題',
  category: '公告',
  publishedAt: '2026-09-18',
  url: '/news/a',
  imageUrl: '/img/missing.jpg',
}

let wrapper: VueWrapper | null = null

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
})

describe('NewsPreview', () => {
  it('replaces a failed image with the placeholder and reports its src', async () => {
    wrapper = mount(NewsPreview, { props: { html: renderNewsList([item]) } })
    const img = wrapper.get('img')

    // error 事件不冒泡；容器在捕獲階段接住
    img.element.dispatchEvent(new Event('error'))

    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.get('.news-card__media').classes()).toContain('news-card__media--empty')
    expect(wrapper.emitted('imageError')).toEqual([['/img/missing.jpg']])
  })

  it('ignores error events that do not come from images', async () => {
    wrapper = mount(NewsPreview, { props: { html: renderNewsList([item]) } })
    wrapper.get('.news-card__title').element.dispatchEvent(new Event('error'))
    expect(wrapper.emitted('imageError')).toBeUndefined()
    expect(wrapper.find('img').exists()).toBe(true)
  })

  it('shows skeleton cards while loading and marks the region busy', () => {
    wrapper = mount(NewsPreview, { props: { html: renderNewsList([item]), loading: true, skeletonCount: 4 } })
    expect(wrapper.findAll('.skeleton')).toHaveLength(4)
    expect(wrapper.find('.news-card__title').exists()).toBe(false)
    expect(wrapper.get('.news-preview').attributes('aria-busy')).toBe('true')
  })
})

describe('HandoffApp', () => {
  async function pick(w: VueWrapper, scenario: string) {
    await w.get(`input[value="${scenario}"]`).setValue(true)
  }

  it('starts with the normal scenario and no issues', () => {
    wrapper = mount(HandoffApp)
    expect(wrapper.findAll('.news-preview .news-card')).toHaveLength(6)
    expect(wrapper.get('.report').text()).toContain('資料符合交接規格')
  })

  it('shows the empty state for an empty list', async () => {
    wrapper = mount(HandoffApp)
    await pick(wrapper, 'empty')
    expect(wrapper.find('.news-preview .news-card').exists()).toBe(false)
    expect(wrapper.get('.news-preview').text()).toContain('目前沒有最新消息')
  })

  it('lists validation issues for unsafe content', async () => {
    wrapper = mount(HandoffApp)
    await pick(wrapper, 'unsafe')
    const report = wrapper.get('.report').text()
    expect(report).toContain('u1.url')
    expect(report).toContain('javascript:alert(1)')
  })

  it('adds runtime image failures to the report and clears them when the scenario changes', async () => {
    wrapper = mount(HandoffApp)
    await pick(wrapper, 'broken-image')
    wrapper.get('.news-preview img').element.dispatchEvent(new Event('error'))
    await wrapper.vm.$nextTick()
    expect(wrapper.get('.report').text()).toContain('執行期')

    await pick(wrapper, 'normal')
    expect(wrapper.get('.report').text()).not.toContain('執行期')
  })

  it('shows the same HTML in the code panel that the preview renders', async () => {
    wrapper = mount(HandoffApp)
    await pick(wrapper, 'optional')
    const code = wrapper.get('.code-panels details[open] pre').text()
    const preview = wrapper.get('.news-preview > div').element.innerHTML
    const normalise = (html: string) => {
      const div = document.createElement('div')
      div.innerHTML = html
      return div.innerHTML
    }
    expect(normalise(code)).toBe(normalise(preview))
  })
})
