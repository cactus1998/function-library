import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { nextTick } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import ImageCarousel from '../components/ImageCarousel.vue'
import { installDomMocks, MockIntersectionObserver, REDUCED_MOTION, restoreDomMocks, type MediaQueryMock } from './domMocks'

const SLIDE_WIDTH = 600
const INTERVAL = 5000

let media: MediaQueryMock
let scrollTo: Mock
let wrapper: VueWrapper | null = null

beforeEach(() => {
  vi.useFakeTimers()
  ;({ media, scrollTo } = installDomMocks())
  // 每張 slide 的 offsetLeft = 索引 × 寬度
  vi.spyOn(HTMLElement.prototype, 'offsetLeft', 'get').mockImplementation(function (this: HTMLElement) {
    const parent = this.parentElement
    return parent ? Array.from(parent.children).indexOf(this) * SLIDE_WIDTH : 0
  })
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  restoreDomMocks()
})

/** observer 在 flush: 'post' 的 watch 中建立，等下一個 tick 才存在 */
async function mountCarousel() {
  wrapper = mount(ImageCarousel, { attachTo: document.body })
  await nextTick()
  return wrapper
}

function slides(w: VueWrapper) {
  return w.findAll('.slide').map((s) => s.element)
}

/** 模擬捲動停在第 index 張：IntersectionObserver 回報該張進入畫面 */
async function showSlide(w: VueWrapper, index: number) {
  MockIntersectionObserver.report(slides(w)[index]!, true)
  await w.vm.$nextTick()
}

function currentDot(w: VueWrapper) {
  return w.findAll('.dot').findIndex((d) => d.attributes('aria-current') === 'true')
}

function lastScrollLeft() {
  return (scrollTo.mock.lastCall?.[0] as ScrollToOptions | undefined)?.left
}

describe('ImageCarousel', () => {
  it('labels each slide with its position', async () => {
    const w = await mountCarousel()
    expect(w.get('.carousel').attributes('aria-roledescription')).toBe('carousel')
    expect(w.findAll('.slide').map((s) => s.attributes('aria-label'))).toEqual([
      '第 1 張，共 4 張',
      '第 2 張，共 4 張',
      '第 3 張，共 4 張',
      '第 4 張，共 4 張',
    ])
  })

  it('tracks the visible slide with IntersectionObserver rooted on the track', async () => {
    const w = await mountCarousel()
    const observer = MockIntersectionObserver.instances[0]!
    expect(observer.options.root).toBe(w.get('.track').element)

    await showSlide(w, 2)
    expect(currentDot(w)).toBe(2)
    // 只有目前這張的連結可以被 Tab 到
    expect(w.findAll('.slide-link').map((a) => a.attributes('tabindex'))).toEqual(['-1', '-1', '0', '-1'])
  })

  it('auto-advances every interval and wraps from the last slide to the first', async () => {
    const w = await mountCarousel()
    vi.advanceTimersByTime(INTERVAL)
    expect(lastScrollLeft()).toBe(SLIDE_WIDTH)

    await showSlide(w, 3)
    vi.advanceTimersByTime(INTERVAL)
    expect(lastScrollLeft()).toBe(0)
  })

  it('moves with the previous / next buttons and wraps backwards', async () => {
    const w = await mountCarousel()
    await w.get('[aria-label="上一張"]').trigger('click')
    expect(lastScrollLeft()).toBe(3 * SLIDE_WIDTH)
    await w.get('[aria-label="下一張"]').trigger('click')
    expect(lastScrollLeft()).toBe(SLIDE_WIDTH)
  })

  it('jumps to a slide from its dot', async () => {
    const w = await mountCarousel()
    await w.findAll('.dot')[2]!.trigger('click')
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 2 * SLIDE_WIDTH, behavior: 'smooth' })
  })

  it('pauses while hovered and resumes when the pointer leaves', async () => {
    const w = await mountCarousel()
    await w.get('.carousel').trigger('pointerenter')
    vi.advanceTimersByTime(INTERVAL * 3)
    expect(scrollTo).not.toHaveBeenCalled()

    await w.get('.carousel').trigger('pointerleave')
    vi.advanceTimersByTime(INTERVAL)
    expect(scrollTo).toHaveBeenCalledTimes(1)
  })

  it('pauses while keyboard focus is inside, even when focus moves between its controls', async () => {
    const w = await mountCarousel()
    const next = w.get('[aria-label="下一張"]')
    const prev = w.get('[aria-label="上一張"]')

    await next.trigger('focusin')
    await next.trigger('focusout', { relatedTarget: prev.element })
    vi.advanceTimersByTime(INTERVAL * 2)
    expect(scrollTo).not.toHaveBeenCalled()

    await prev.trigger('focusout', { relatedTarget: document.body })
    vi.advanceTimersByTime(INTERVAL)
    expect(scrollTo).toHaveBeenCalledTimes(1)
  })

  it('pauses while the page is hidden', async () => {
    await mountCarousel()
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
    document.dispatchEvent(new Event('visibilitychange'))
    await wrapper!.vm.$nextTick()
    vi.advanceTimersByTime(INTERVAL * 2)
    expect(scrollTo).not.toHaveBeenCalled()

    hidden.mockReturnValue(false)
    document.dispatchEvent(new Event('visibilitychange'))
    await wrapper!.vm.$nextTick()
    vi.advanceTimersByTime(INTERVAL)
    expect(scrollTo).toHaveBeenCalledTimes(1)
  })

  it('has a pause button and announces slides politely only while stopped', async () => {
    const w = await mountCarousel()
    expect(w.get('.track').attributes('aria-live')).toBe('off')

    await w.get('[aria-label="暫停自動播放"]').trigger('click')
    expect(w.find('[aria-label="開始自動播放"]').exists()).toBe(true)
    expect(w.get('.track').attributes('aria-live')).toBe('polite')
    vi.advanceTimersByTime(INTERVAL * 2)
    expect(scrollTo).not.toHaveBeenCalled()
  })

  it('does not autoplay or animate for users who prefer reduced motion', async () => {
    media.set(REDUCED_MOTION, true)
    const w = await mountCarousel()
    expect(w.find('[aria-label="開始自動播放"]').exists()).toBe(true)
    vi.advanceTimersByTime(INTERVAL * 2)
    expect(scrollTo).not.toHaveBeenCalled()

    await w.get('[aria-label="下一張"]').trigger('click')
    expect(scrollTo).toHaveBeenLastCalledWith({ left: SLIDE_WIDTH, behavior: 'auto' })
  })

  it('stops autoplay if reduced motion is turned on later', async () => {
    const w = await mountCarousel()
    media.set(REDUCED_MOTION, true)
    await w.vm.$nextTick()
    vi.advanceTimersByTime(INTERVAL * 2)
    expect(scrollTo).not.toHaveBeenCalled()
  })

  it('cleans up the timer, observer and visibility listener on unmount', async () => {
    const removeSpy = vi.spyOn(document, 'removeEventListener')
    const w = await mountCarousel()
    w.unmount()
    wrapper = null

    expect(vi.getTimerCount()).toBe(0)
    expect(MockIntersectionObserver.instances.every((o) => o.disconnected)).toBe(true)
    expect(removeSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function))
  })
})
