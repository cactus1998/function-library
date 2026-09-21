import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import CommandPalette from '../components/CommandPalette.vue'
import { RECENT_STORAGE_KEY, resetRecentCommandsCache } from '../composables/useRecentCommands'
import type { Command, RemoteFetcher } from '../types'
import { installDialogMocks, keydown, restoreDialogMocks } from './helpers'

let performHome: Mock<NonNullable<Command['perform']>>
let performDark: Mock<NonNullable<Command['perform']>>
let resolveSlow: (() => void) | null

function createCommands(): Command[] {
  return [
    { id: 'home', title: '前往首頁', initials: 'qwsy', group: 'navigation', shortcut: 'g h', perform: performHome },
    { id: 'docs', title: '前往文件', initials: 'qwwj', group: 'navigation', perform: () => {} },
    {
      id: 'theme',
      title: '切換主題',
      initials: 'qhzt',
      keywords: ['theme'],
      group: 'appearance',
      children: () => [
        { id: 'theme-light', title: '淺色', group: 'appearance', perform: () => {} },
        { id: 'theme-dark', title: '深色', group: 'appearance', perform: performDark },
      ],
    },
    { id: 'delete', title: '刪除工作區', group: 'action', disabled: true, perform: () => {} },
    {
      id: 'slow',
      title: '模擬長時間工作',
      group: 'action',
      perform: () => new Promise<void>((resolve) => (resolveSlow = resolve)),
    },
    {
      id: 'fail',
      title: '模擬失敗的指令',
      group: 'action',
      perform: () => Promise.reject(new Error('伺服器拒絕')),
    },
  ]
}

let wrapper: VueWrapper | null = null
let trigger: HTMLButtonElement

function mountPalette(options: { remoteFetcher?: RemoteFetcher; fallbackFocus?: HTMLElement | null } = {}) {
  const mounted = mount(CommandPalette, {
    props: {
      open: false,
      commands: createCommands(),
      remoteFetcher: options.remoteFetcher,
      fallbackFocus: options.fallbackFocus ?? null,
      'onUpdate:open': (value: boolean) => mounted.setProps({ open: value }),
    },
    attachTo: document.body,
  })
  wrapper = mounted
  return mounted
}

async function openPalette(w: VueWrapper) {
  await w.setProps({ open: true })
  await nextTick()
}

const input = () => wrapper!.get<HTMLInputElement>('input[role="combobox"]')
const dialog = () => wrapper!.get<HTMLDialogElement>('dialog').element
const options = () => wrapper!.findAll('[role="option"]')
const optionTitles = () => options().map((o) => o.text())
const activeOption = () => {
  const id = input().attributes('aria-activedescendant')
  return id ? document.getElementById(id) : null
}

async function press(key: string, init: KeyboardEventInit & { keyCode?: number } = {}) {
  const event = keydown(key, init)
  input().element.dispatchEvent(event)
  await nextTick()
  return event
}

async function search(value: string) {
  await input().setValue(value)
  await nextTick()
}

beforeEach(() => {
  installDialogMocks()
  localStorage.clear()
  resetRecentCommandsCache()
  performHome = vi.fn()
  performDark = vi.fn()
  resolveSlow = null
  trigger = document.createElement('button')
  trigger.textContent = '開啟'
  document.body.append(trigger)
  trigger.focus()
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  trigger.remove()
  restoreDialogMocks()
  vi.useRealTimers()
  document.documentElement.style.overflow = ''
})

describe('CommandPalette', () => {
  describe('open / close and focus', () => {
    it('focuses the input on open and returns focus to the previous element on Esc (AC-01)', async () => {
      const w = mountPalette()
      await openPalette(w)
      expect(dialog().open).toBe(true)
      expect(document.activeElement).toBe(input().element)
      expect(document.documentElement.style.overflow).toBe('hidden')

      // Esc 在原生 dialog 上觸發 cancel 事件
      dialog().dispatchEvent(new Event('cancel', { cancelable: true }))
      await flushPromises()

      expect(w.props('open')).toBe(false)
      expect(dialog().open).toBe(false)
      expect(document.activeElement).toBe(trigger)
      expect(document.documentElement.style.overflow).toBe('')
    })

    it('falls back to the given element when the previously focused element is gone (EC-17)', async () => {
      const fallback = document.createElement('button')
      document.body.append(fallback)
      const w = mountPalette({ fallbackFocus: fallback })
      await openPalette(w)
      trigger.remove()

      await w.setProps({ open: false })
      await nextTick()
      expect(document.activeElement).toBe(fallback)
      fallback.remove()
    })

    it('closes when the backdrop is clicked but not when the panel is clicked', async () => {
      const w = mountPalette()
      await openPalette(w)
      await w.get('.panel').trigger('click')
      expect(w.props('open')).toBe(true)
      await w.get('dialog').trigger('click')
      expect(w.props('open')).toBe(false)
    })

    it('ignores a late close event from the previous session after reopening', async () => {
      vi.useFakeTimers()
      const w = mountPalette()
      await openPalette(w)
      await w.setProps({ open: false })
      await nextTick()
      // close 事件尚未派送前就重新開啟
      await openPalette(w)
      await vi.runAllTimersAsync()
      expect(w.props('open')).toBe(true)
      expect(dialog().open).toBe(true)
    })

    it('keeps focus inside the panel on Tab', async () => {
      const w = mountPalette()
      await openPalette(w)
      expect((await press('Tab')).defaultPrevented).toBe(true)
    })

    it('resets the query and page when reopened', async () => {
      const w = mountPalette()
      await openPalette(w)
      await search('qhzt')
      await press('Enter')
      await w.setProps({ open: false })
      await openPalette(w)
      expect(input().element.value).toBe('')
      expect(w.find('.breadcrumb').exists()).toBe(false)
    })
  })

  describe('search and keyboard navigation', () => {
    it('highlights matched title characters with <mark> (AC-02)', async () => {
      const w = mountPalette()
      await openPalette(w)
      await search('qhzt')
      const first = options()[0]!
      expect(first.text()).toContain('切換主題')
      expect(first.find('mark').text()).toBe('切換主題')
    })

    it('wraps ArrowDown from the last option to the first and updates aria-activedescendant (AC-03)', async () => {
      const w = mountPalette()
      await openPalette(w)
      const all = options()
      // 6 個選項中「刪除工作區」為停用
      expect(activeOption()?.textContent).toContain('前往首頁')
      for (let i = 0; i < 4; i++) await press('ArrowDown')
      expect(activeOption()?.textContent).toContain('模擬失敗的指令')

      await press('ArrowDown')
      expect(input().attributes('aria-activedescendant')).toBe(all[0]!.attributes('id'))
    })

    it('shows options grouped in the fixed group order and hides empty groups', async () => {
      const w = mountPalette()
      await openPalette(w)
      expect(w.findAll('.group-label').map((g) => g.text())).toEqual(['導覽', '外觀', '動作'])
      await search('主題')
      expect(w.findAll('.group-label').map((g) => g.text())).toEqual(['外觀'])
    })

    it('resets the active option to the first one when the query changes (EC-06)', async () => {
      const w = mountPalette()
      await openPalette(w)
      await press('ArrowDown')
      await press('ArrowDown')
      await search('前往')
      expect(activeOption()?.textContent).toContain('前往首頁')
    })

    it('updates the active option on pointermove (EC-12)', async () => {
      const w = mountPalette()
      await openPalette(w)
      await options()[2]!.trigger('pointermove')
      expect(activeOption()?.textContent).toContain('切換主題')
    })

    it('shows an empty state, drops aria-activedescendant and ignores Enter when nothing matches (EC-03)', async () => {
      const w = mountPalette()
      await openPalette(w)
      await search('xyzxyz')
      expect(w.get('.empty').text()).toBe('找不到符合「xyzxyz」的指令')
      expect(input().attributes('aria-activedescendant')).toBeUndefined()
      expect(input().attributes('aria-expanded')).toBe('false')
      await press('Enter')
      expect(w.emitted('execute')).toBeUndefined()
    })

    it('limits the input to 100 characters (EC-05)', async () => {
      const w = mountPalette()
      await openPalette(w)
      expect(input().attributes('maxlength')).toBe('100')
    })

    it('exposes combobox / listbox semantics', async () => {
      const w = mountPalette()
      await openPalette(w)
      const listboxId = input().attributes('aria-controls')!
      expect(document.getElementById(listboxId)?.getAttribute('role')).toBe('listbox')
      expect(input().attributes('aria-autocomplete')).toBe('list')
      expect(w.get('[role="group"]').attributes('aria-labelledby')).toBeTruthy()
      expect(w.get('dialog').attributes('aria-label')).toBe('指令面板')
    })
  })

  describe('executing commands', () => {
    it('runs perform, emits execute, closes, and records it as recent (AC-05)', async () => {
      const w = mountPalette()
      await openPalette(w)
      await press('Enter')
      await flushPromises()

      expect(performHome).toHaveBeenCalledWith({ source: 'palette' })
      expect(w.emitted('execute')?.[0]?.[0]).toMatchObject({ id: 'home' })
      expect(w.emitted('execute')?.[0]?.[1]).toBe('palette')
      expect(w.props('open')).toBe(false)

      await search('')
      await openPalette(w)
      expect(w.findAll('.group-label')[0]!.text()).toBe('最近使用')
      expect(optionTitles()[0]).toContain('前往首頁')
      // 最近使用的指令不會在原群組重複出現
      expect(optionTitles().filter((t) => t.includes('前往首頁'))).toHaveLength(1)
    })

    it('skips recent ids that no longer exist (EC-10)', async () => {
      localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify({ version: 1, data: ['removed', 'docs'] }))
      resetRecentCommandsCache()
      const w = mountPalette()
      await openPalette(w)
      const recentGroup = w.findAll('[role="group"]')[0]!
      expect(recentGroup.findAll('[role="option"]').map((o) => o.text())).toEqual(['前往文件'])
    })

    it('does not execute on Enter during IME composition (EC-02)', async () => {
      const w = mountPalette()
      await openPalette(w)
      await press('Enter', { isComposing: true })
      await press('Enter', { keyCode: 229 })
      await press('ArrowDown', { keyCode: 229 })
      await flushPromises()
      expect(performHome).not.toHaveBeenCalled()
      expect(activeOption()?.textContent).toContain('前往首頁')
    })

    it('ignores clicks on disabled commands (EC-07)', async () => {
      const w = mountPalette()
      await openPalette(w)
      const disabled = options().find((o) => o.text().includes('刪除工作區'))!
      expect(disabled.attributes('aria-disabled')).toBe('true')
      await disabled.trigger('click')
      expect(w.emitted('execute')).toBeUndefined()
      expect(w.props('open')).toBe(true)
    })

    it('runs an async command only once and shows loading while it runs (EC-08)', async () => {
      const w = mountPalette()
      await openPalette(w)
      await search('模擬長時間')
      await press('Enter')
      await press('Enter')

      const item = activeOption()!
      expect(item.getAttribute('aria-busy')).toBe('true')
      expect(input().attributes('readonly')).toBeDefined()
      expect(resolveSlow).not.toBeNull()

      resolveSlow!()
      await flushPromises()
      expect(w.emitted('execute')).toHaveLength(1)
      expect(w.props('open')).toBe(false)
    })

    it('stays open with an alert and does not record recent when perform throws (EC-09)', async () => {
      const w = mountPalette()
      await openPalette(w)
      await search('失敗')
      await press('Enter')
      await flushPromises()

      expect(w.get('[role="alert"]').text()).toBe('「模擬失敗的指令」執行失敗：伺服器拒絕')
      expect(w.props('open')).toBe(true)
      expect(w.emitted('execute')).toBeUndefined()
      expect(localStorage.getItem(RECENT_STORAGE_KEY)).toBeNull()

      await search('前往')
      expect(w.find('[role="alert"]').exists()).toBe(false)
    })
  })

  describe('nested pages', () => {
    it('enters a sub page with a breadcrumb and goes back with Backspace on an empty query (AC-04)', async () => {
      const w = mountPalette()
      await openPalette(w)
      await search('qhzt')
      await press('Enter')

      expect(w.findAll('.breadcrumb li').map((li) => li.text())).toEqual(['外觀', '切換主題'])
      expect(input().element.value).toBe('')
      expect(optionTitles()).toEqual(['淺色', '深色'])

      await press('Backspace')
      await nextTick()
      expect(w.find('.breadcrumb').exists()).toBe(false)
      expect(activeOption()?.textContent).toContain('切換主題')
    })

    it('does not go back while the query is not empty', async () => {
      const w = mountPalette()
      await openPalette(w)
      await search('qhzt')
      await press('Enter')
      await search('深')
      const event = await press('Backspace')
      expect(event.defaultPrevented).toBe(false)
      expect(w.find('.breadcrumb').exists()).toBe(true)
    })

    it('records the top-level entry as recent when a sub page command runs', async () => {
      const w = mountPalette()
      await openPalette(w)
      await search('qhzt')
      await press('Enter')
      await press('ArrowDown')
      await press('Enter')
      await flushPromises()

      expect(performDark).toHaveBeenCalledTimes(1)
      expect(JSON.parse(localStorage.getItem(RECENT_STORAGE_KEY)!).data).toEqual(['theme'])
    })
  })

  describe('remote results', () => {
    it('shows an error with a retry option that re-sends the request (AC-08)', async () => {
      vi.useFakeTimers()
      const fetcher = vi.fn<RemoteFetcher>().mockRejectedValueOnce(new Error('HTTP 503')).mockResolvedValueOnce([
        { id: 'doc', title: 'Vue 文件', group: 'remote', perform: () => {} },
      ])
      const w = mountPalette({ remoteFetcher: fetcher })
      await openPalette(w)
      await search('vue')
      await vi.advanceTimersByTimeAsync(200)

      expect(w.findAll('.group-label').at(-1)!.text()).toContain('載入失敗')
      const retry = options().find((o) => o.text() === '重新搜尋文件')!
      await retry.trigger('click')
      await flushPromises()

      expect(fetcher).toHaveBeenCalledTimes(2)
      expect(w.props('open')).toBe(true)
      expect(optionTitles()).toContain('Vue 文件')
    })

    it('aborts the in-flight request when the palette closes (EC-18)', async () => {
      vi.useFakeTimers()
      let signal: AbortSignal | undefined
      const fetcher: RemoteFetcher = (_, s) => {
        signal = s
        return new Promise(() => {})
      }
      const w = mountPalette({ remoteFetcher: fetcher })
      await openPalette(w)
      await search('vue')
      await vi.advanceTimersByTimeAsync(200)
      expect(signal?.aborted).toBe(false)

      await w.setProps({ open: false })
      await nextTick()
      expect(signal?.aborted).toBe(true)

      await openPalette(w)
      expect(w.findAll('.group-label').map((g) => g.text())).not.toContain('遠端結果')
    })

    it('only queries remote on the root page', async () => {
      vi.useFakeTimers()
      const fetcher = vi.fn<RemoteFetcher>().mockResolvedValue([])
      const w = mountPalette({ remoteFetcher: fetcher })
      await openPalette(w)
      await search('qhzt')
      await press('Enter')
      await search('深')
      await vi.advanceTimersByTimeAsync(1000)
      // 只有進入子頁前的「qhzt」可能送出；子頁內的查詢不送
      expect(fetcher.mock.calls.map(([q]) => q)).not.toContain('深')
    })
  })

  it('announces the result count in the live region once results settle (AC-10)', async () => {
    vi.useFakeTimers()
    const w = mountPalette()
    await openPalette(w)
    await search('前往')
    const live = w.get('[aria-live="polite"]')
    expect(live.text()).toBe('')
    await vi.advanceTimersByTimeAsync(400)
    expect(live.text()).toBe('2 個結果')
  })
})
