import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { h, nextTick } from 'vue'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import DemoBlock from '../components/DemoBlock.vue'
import FaqAccordion from '../components/FaqAccordion.vue'
import ProductTabs from '../components/ProductTabs.vue'
import SiteShell from '../components/SiteShell.vue'
import { installDomMocks, MockIntersectionObserver, restoreDomMocks, type MediaQueryMock } from './domMocks'

let media: MediaQueryMock
let scrollTo: Mock
let wrapper: VueWrapper | null = null

beforeEach(() => {
  ;({ media, scrollTo } = installDomMocks())
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  restoreDomMocks()
})

describe('ProductTabs', () => {
  function tabs(w: VueWrapper) {
    return w.findAll('[role="tab"]')
  }

  function selectedLabel(w: VueWrapper) {
    return w.get('[role="tab"][aria-selected="true"]').text()
  }

  it('makes only the selected tab reachable with Tab and links tabs to panels', () => {
    wrapper = mount(ProductTabs)
    expect(tabs(wrapper).map((t) => t.attributes('tabindex'))).toEqual(['0', '-1', '-1', '-1'])
    for (const tab of tabs(wrapper)) {
      const panel = wrapper.get(`[id="${tab.attributes('aria-controls')}"]`)
      expect(panel.attributes('role')).toBe('tabpanel')
      expect(panel.attributes('aria-labelledby')).toBe(tab.attributes('id'))
    }
  })

  it('moves selection and focus with the arrow keys, wrapping at both ends', async () => {
    wrapper = mount(ProductTabs, { attachTo: document.body })
    const list = wrapper.get('[role="tablist"]')

    await list.trigger('keydown', { key: 'ArrowRight' })
    await flushPromises()
    expect(selectedLabel(wrapper)).toBe('產地')
    expect(document.activeElement).toBe(tabs(wrapper)[1]!.element)

    await list.trigger('keydown', { key: 'ArrowLeft' })
    await list.trigger('keydown', { key: 'ArrowLeft' })
    await flushPromises()
    expect(selectedLabel(wrapper)).toBe('運送')
    expect(document.activeElement).toBe(tabs(wrapper)[3]!.element)
  })

  it('jumps to the first and last tab with Home and End', async () => {
    wrapper = mount(ProductTabs, { attachTo: document.body })
    const list = wrapper.get('[role="tablist"]')
    await list.trigger('keydown', { key: 'End' })
    expect(selectedLabel(wrapper)).toBe('運送')
    await list.trigger('keydown', { key: 'Home' })
    expect(selectedLabel(wrapper)).toBe('風味')
  })

  it('shows only the selected panel', async () => {
    wrapper = mount(ProductTabs)
    await tabs(wrapper)[2]!.trigger('click')
    const visible = wrapper.findAll('[role="tabpanel"]').filter((p) => p.isVisible())
    expect(visible).toHaveLength(1)
    expect(visible[0]!.text()).toContain('粉水比')
  })

  it('ignores keys that are not part of the tabs pattern', async () => {
    wrapper = mount(ProductTabs)
    await wrapper.get('[role="tablist"]').trigger('keydown', { key: 'ArrowDown' })
    expect(selectedLabel(wrapper)).toBe('風味')
  })
})

describe('FaqAccordion', () => {
  it('groups every question into one exclusive accordion with the first one open', () => {
    wrapper = mount(FaqAccordion)
    const items = wrapper.findAll('details')
    expect(items.length).toBeGreaterThan(1)
    expect(new Set(items.map((d) => d.attributes('name')))).toEqual(new Set(['ui-kit-faq']))
    expect(items.map((d) => (d.element as HTMLDetailsElement).open)).toEqual([true, ...Array(items.length - 1).fill(false)])
  })
})

describe('DemoBlock', () => {
  it('copies its snippet and announces the result', async () => {
    const writeText = vi.fn(async () => {})
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    wrapper = mount(DemoBlock, {
      props: { title: '輪播', snippet: '<section></section>' },
      slots: { default: () => h('div', 'demo') },
    })

    await wrapper.get('.copy').trigger('click')
    await flushPromises()
    expect(writeText).toHaveBeenCalledWith('<section></section>')
    expect(wrapper.get('.copy').text()).toBe('已複製')
    expect(wrapper.get('[aria-live="polite"]').text()).toContain('輪播')
  })
})

describe('SiteShell', () => {
  /** observer 在 flush: 'post' 的 watch 中建立，等下一個 tick 才存在 */
  async function mountShell() {
    wrapper = mount(SiteShell, { attachTo: document.body })
    await nextTick()
    return wrapper
  }

  it('observes the sentinel and hero inside the scroll container, not the window', async () => {
    const w = await mountShell()
    const observer = MockIntersectionObserver.instances[0]!
    expect(observer.options.root).toBe(w.get('.scroller').element)
    expect(observer.observed.has(w.get('.sentinel').element)).toBe(true)
    expect(observer.observed.has(w.get('.hero').element)).toBe(true)
  })

  it('marks the header as scrolled once the sentinel leaves the viewport', async () => {
    const w = await mountShell()
    MockIntersectionObserver.report(w.get('.sentinel').element, false)
    await w.vm.$nextTick()
    expect(w.get('.header').classes()).toContain('scrolled')

    MockIntersectionObserver.report(w.get('.sentinel').element, true)
    await w.vm.$nextTick()
    expect(w.get('.header').classes()).not.toContain('scrolled')
  })

  it('shows back-to-top after the hero is gone, then scrolls up and moves focus to the top', async () => {
    const w = await mountShell()
    expect(w.get('.back-to-top').isVisible()).toBe(false)

    MockIntersectionObserver.report(w.get('.hero').element, false)
    await w.vm.$nextTick()
    expect(w.get('.back-to-top').isVisible()).toBe(true)

    await w.get('.back-to-top').trigger('click')
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
    expect(document.activeElement).toBe(w.get('.hero h4').element)
  })

  it('closes the menu on Escape and returns focus to the toggle', async () => {
    const w = await mountShell()
    const toggle = w.get('.menu-toggle')
    await toggle.trigger('click')
    expect(toggle.attributes('aria-expanded')).toBe('true')

    await w.get('.nav a').trigger('keydown', { key: 'Escape' })
    await flushPromises()
    expect(toggle.attributes('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(toggle.element)
  })

  it('closes the menu on a pointer press outside the header but not inside it', async () => {
    const w = await mountShell()
    const toggle = w.get('.menu-toggle')
    await toggle.trigger('click')

    w.get('.nav').element.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    await w.vm.$nextTick()
    expect(toggle.attributes('aria-expanded')).toBe('true')

    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    await w.vm.$nextTick()
    expect(toggle.attributes('aria-expanded')).toBe('false')
  })

  it('resets the mobile menu when the layout switches to desktop', async () => {
    const w = await mountShell()
    await w.get('.menu-toggle').trigger('click')
    media.set('(min-width: 720px)', true)
    await w.vm.$nextTick()
    expect(w.get('.menu-toggle').attributes('aria-expanded')).toBe('false')
  })

  it('removes the document listener and observer on unmount', async () => {
    const removeSpy = vi.spyOn(document, 'removeEventListener')
    const w = await mountShell()
    w.unmount()
    wrapper = null
    expect(removeSpy).toHaveBeenCalledWith('pointerdown', expect.any(Function))
    expect(MockIntersectionObserver.instances.every((o) => o.disconnected)).toBe(true)
  })
})
