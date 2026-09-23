import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import LandingPage from '../components/LandingPage.vue'
import ViewportSimulator from '../components/ViewportSimulator.vue'

/** 可手動回報尺寸的 ResizeObserver（jsdom 沒有版面計算） */
class MockResizeObserver {
  static instances: MockResizeObserver[] = []
  readonly callback: ResizeObserverCallback
  readonly observed = new Set<Element>()
  disconnected = false

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
    MockResizeObserver.instances.push(this)
  }

  observe(el: Element) {
    this.observed.add(el)
  }

  unobserve(el: Element) {
    this.observed.delete(el)
  }

  disconnect() {
    this.observed.clear()
    this.disconnected = true
  }

  static report(el: Element, width: number, height: number) {
    for (const observer of MockResizeObserver.instances) {
      if (!observer.observed.has(el)) continue
      const entry = { target: el, contentRect: { width, height } } as unknown as ResizeObserverEntry
      observer.callback([entry], observer as unknown as ResizeObserver)
    }
  }
}

let wrapper: VueWrapper | null = null

beforeEach(() => {
  MockResizeObserver.instances = []
  vi.stubGlobal('ResizeObserver', MockResizeObserver)
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  vi.unstubAllGlobals()
})

describe('ViewportSimulator', () => {
  async function mountSimulator(stageWidth: number, frameHeight = 3000) {
    wrapper = mount(ViewportSimulator, { attachTo: document.body })
    await nextTick()
    MockResizeObserver.report(wrapper.get('.stage').element, stageWidth, 0)
    MockResizeObserver.report(wrapper.get('.frame').element, 0, frameHeight)
    await nextTick()
    return wrapper
  }

  it('starts at 375px on the mobile breakpoint without scaling', async () => {
    const w = await mountSimulator(1000)
    expect(w.get('.frame').attributes('style')).toContain('width: 375px')
    expect(w.get('.status').text()).toContain('斷點 sm')
    expect(w.get('.status').text()).not.toContain('縮放')
  })

  it('switches breakpoint and scales the frame down when a wide preset does not fit', async () => {
    const w = await mountSimulator(720)
    const desktop = w.findAll('.presets button').find((b) => b.text().includes('1440'))!
    await desktop.trigger('click')

    expect(desktop.attributes('aria-pressed')).toBe('true')
    expect(w.get('.status').text()).toContain('斷點 lg')
    expect(w.get('.status').text()).toContain('縮放 50%')
    expect(w.get('.frame').attributes('style')).toContain('scale(0.5)')
  })

  it('sizes the stage to the scaled frame height so no empty space is left below', async () => {
    const w = await mountSimulator(720, 4000)
    await w.findAll('.presets button').find((b) => b.text().includes('1440'))!.trigger('click')
    expect(w.get('.stage').attributes('style')).toContain('height: 2000px')
  })

  it('centres a narrow frame inside the stage', async () => {
    const w = await mountSimulator(1000)
    // (1000 - 375) / 2
    expect(w.get('.frame').attributes('style')).toContain('left: 312.5px')
  })

  it('updates the breakpoint from the width slider', async () => {
    const w = await mountSimulator(2000)
    await w.get('input[type="range"]').setValue('800')
    expect(w.get('.status').text()).toContain('斷點 md')
    expect(w.get('.status').text()).toContain('8 欄')
  })

  it('disconnects its observers on unmount', async () => {
    const w = await mountSimulator(1000)
    w.unmount()
    wrapper = null
    expect(MockResizeObserver.instances.every((o) => o.disconnected)).toBe(true)
  })
})

describe('LandingPage menu', () => {
  it('toggles the menu and reflects the state in aria-expanded', async () => {
    wrapper = mount(LandingPage, { attachTo: document.body })
    const toggle = wrapper.get('.nav-toggle')
    const nav = wrapper.get('nav.nav')

    expect(toggle.attributes('aria-controls')).toBe(nav.attributes('id'))
    expect(toggle.attributes('aria-expanded')).toBe('false')

    await toggle.trigger('click')
    expect(toggle.attributes('aria-expanded')).toBe('true')
    expect(nav.classes()).toContain('open')
  })

  it('closes on Escape and returns focus to the menu button', async () => {
    wrapper = mount(LandingPage, { attachTo: document.body })
    await wrapper.get('.nav-toggle').trigger('click')
    const link = wrapper.get('nav.nav a')
    ;(link.element as HTMLElement).focus()

    await link.trigger('keydown', { key: 'Escape' })
    await nextTick()

    expect(wrapper.get('.nav-toggle').attributes('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(wrapper.get('.nav-toggle').element)
  })

  it('closes the menu after a link is chosen', async () => {
    wrapper = mount(LandingPage, { attachTo: document.body })
    await wrapper.get('.nav-toggle').trigger('click')
    await wrapper.get('nav.nav a').trigger('click')
    expect(wrapper.get('.nav-toggle').attributes('aria-expanded')).toBe('false')
  })

  it('renders the grid overlay only when requested', async () => {
    wrapper = mount(LandingPage, { props: { showGrid: false } })
    expect(wrapper.find('.grid-overlay').exists()).toBe(false)
    await wrapper.setProps({ showGrid: true })
    expect(wrapper.findAll('.grid-col')).toHaveLength(12)
  })

  it('shows a confirmation after subscribing', async () => {
    wrapper = mount(LandingPage)
    await wrapper.get('#landing-email').setValue('me@example.com')
    await wrapper.get('.newsletter-form').trigger('submit')
    expect(wrapper.get('.newsletter-done').text()).toContain('me@example.com')
  })
})
