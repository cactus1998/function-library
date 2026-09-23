import { afterEach, describe, expect, it, vi } from 'vitest'
import { h, nextTick } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import CompatCase from '../components/CompatCase.vue'
import SupportTable from '../components/SupportTable.vue'
import { DETECTIONS } from '../data/detections'

let wrapper: VueWrapper | null = null

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function mountCase(nativeSupported: boolean | null, canForceFallback = true) {
  wrapper = mount(CompatCase, {
    props: { title: '案例', code: '.x {}', nativeSupported, canForceFallback },
    slots: {
      problem: () => h('p', '問題'),
      broken: () => h('p', '壞掉'),
      fixed: ({ fallback }: { fallback: boolean }) => h('p', { class: 'path-probe' }, fallback ? 'fallback' : 'native'),
    },
  })
  return wrapper
}

describe('CompatCase', () => {
  it('renders the native path when supported', () => {
    const w = mountCase(true)
    expect(w.get('.path-probe').text()).toBe('native')
    expect(w.get('.path .badge').text()).toBe('使用原生寫法')
  })

  it('lets a supported browser force the fallback path', async () => {
    const w = mountCase(true)
    await w.get('.path input[type="checkbox"]').setValue(true)
    expect(w.get('.path-probe').text()).toBe('fallback')
    expect(w.get('.path .badge').text()).toBe('強制使用 fallback')
  })

  it('always uses the fallback without a toggle when unsupported', () => {
    const w = mountCase(false)
    expect(w.get('.path-probe').text()).toBe('fallback')
    expect(w.get('.path .badge').text()).toContain('不支援')
    expect(w.find('.path input').exists()).toBe(false)
  })

  it('hides the path indicator for illustration-only cases', () => {
    const w = mountCase(null, false)
    expect(w.find('.path').exists()).toBe(false)
    expect(w.get('.path-probe').text()).toBe('native')
  })

  it('shows the code snippet', () => {
    expect(mountCase(true).get('pre').text()).toBe('.x {}')
  })
})

describe('SupportTable', () => {
  it('runs every detection once and counts supported features', async () => {
    const results = new Map(DETECTIONS.map((d, i) => [d.id, i % 2 === 0]))
    for (const d of DETECTIONS) vi.spyOn(d, 'test').mockReturnValue(results.get(d.id)!)

    wrapper = mount(SupportTable)
    // 偵測在 onMounted 執行，下一個 tick 才會渲染結果
    await nextTick()
    const rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(DETECTIONS.length)
    const expected = [...results.values()].filter(Boolean).length
    expect(wrapper.text()).toContain(`支援 ${expected} / ${DETECTIONS.length} 項`)
    for (const d of DETECTIONS) expect(d.test).toHaveBeenCalledTimes(1)
  })

  it('marks a detection that throws as unsupported instead of breaking the table', async () => {
    for (const d of DETECTIONS) vi.spyOn(d, 'test').mockReturnValue(true)
    vi.spyOn(DETECTIONS[0]!, 'test').mockImplementation(() => {
      throw new Error('boom')
    })

    wrapper = mount(SupportTable)
    // 偵測在 onMounted 執行，下一個 tick 才會渲染結果
    await nextTick()
    const first = wrapper.findAll('tbody tr')[0]!
    expect(first.text()).toContain('不支援')
    expect(wrapper.text()).toContain(`支援 ${DETECTIONS.length - 1} / ${DETECTIONS.length} 項`)
  })

  it('filters rows by type', async () => {
    for (const d of DETECTIONS) vi.spyOn(d, 'test').mockReturnValue(true)
    wrapper = mount(SupportTable)
    // 偵測在 onMounted 執行，下一個 tick 才會渲染結果
    await nextTick()
    await wrapper.get('select').setValue('JS')
    const jsCount = DETECTIONS.filter((d) => d.kind === 'JS').length
    expect(wrapper.findAll('tbody tr')).toHaveLength(jsCount)
  })

  it('links each feature to Can I Use in a new tab without leaking the opener', async () => {
    for (const d of DETECTIONS) vi.spyOn(d, 'test').mockReturnValue(true)
    wrapper = mount(SupportTable)
    // 偵測在 onMounted 執行，下一個 tick 才會渲染結果
    await nextTick()
    const link = wrapper.get('tbody a')
    expect(link.attributes('href')).toBe(`https://caniuse.com/${DETECTIONS[0]!.caniuse}`)
    expect(link.attributes('rel')).toContain('noopener')
  })
})
