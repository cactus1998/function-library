import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import KanbanBoard from '../components/KanbanBoard.vue'
import { useBoardStore } from '../stores/board'
import type { ColumnId } from '../types'
import { STORAGE_KEY } from '../utils/persist'
import { board, cardCenter, installFrames, installLayout, keydown, pointer } from './helpers'

let pinia: Pinia
let wrapper: VueWrapper | null = null
let frames: ReturnType<typeof installFrames>
let restoreLayout: () => void

beforeEach(() => {
  localStorage.clear()
  pinia = createPinia()
  setActivePinia(pinia)
  frames = installFrames()
  restoreLayout = installLayout()
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  restoreLayout()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

async function mountBoard(columns: Parameters<typeof board>[0] = { todo: ['A', 'B', 'C'], doing: ['M'], done: ['X', 'Y'] }) {
  const store = useBoardStore()
  // 已標記為還原過，避免 usePersistedBoard 讀 localStorage 覆蓋測試資料
  store.hydrated = true
  store.replace(board(columns))
  wrapper = mount(KanbanBoard, { global: { plugins: [pinia] }, attachTo: document.body })
  await flushPromises()
  return { store, wrapper }
}

const order = (column: ColumnId) =>
  [...document.querySelectorAll<HTMLElement>(`[data-column-id="${column}"] [data-card-id]`)]
    .filter((el) => el.dataset.dragHidden === undefined)
    .map((el) => el.dataset.cardId)

const cardButton = (id: string) =>
  document.querySelector<HTMLElement>(`[data-card-id="${id}"] [data-card-focus]`)!

const announcement = () => document.querySelector('[aria-live]')!.textContent

async function press(target: HTMLElement, key: string, init: KeyboardEventInit = {}) {
  target.dispatchEvent(keydown(key, init))
  await flushPromises()
}

// ---- 鍵盤拖放 -------------------------------------------------------------------

describe('keyboard drag', () => {
  it('lifts with Space, moves with arrows and drops with Space (AC-06)', async () => {
    const { store } = await mountBoard()
    cardButton('A').focus()
    await press(cardButton('A'), ' ')
    expect(announcement()).toContain('已拿起「A」，位於「待辦」第 1 張，共 3 張')
    expect(document.querySelector('[data-card-id="A"]')!.classList).toContain('lifted')

    await press(cardButton('A'), 'ArrowRight')
    await press(cardButton('A'), 'ArrowDown')
    // 預覽已移動，但 store 尚未改變
    expect(order('doing')).toEqual(['M', 'A'])
    expect(store.board.columns.todo).toContain('A')
    expect(document.activeElement).toBe(cardButton('A'))

    await press(cardButton('A'), ' ')
    expect(store.board.columns.doing).toEqual(['M', 'A'])
    expect(store.past).toHaveLength(1)
    expect(announcement()).toBe('已放下「A」，位於「進行中」第 2 張，共 2 張')
    expect(document.activeElement).toBe(cardButton('A'))
  })

  it('does not open the editor when Space is released after lifting', async () => {
    await mountBoard()
    cardButton('A').focus()
    await press(cardButton('A'), ' ')
    const keyup = new KeyboardEvent('keyup', { key: ' ', bubbles: true, cancelable: true })
    cardButton('A').dispatchEvent(keyup)
    expect(keyup.defaultPrevented).toBe(true)
    expect(document.querySelector('.card.editing')).toBeNull()
  })

  it('announces when the card is already at an edge (EC-10)', async () => {
    await mountBoard()
    cardButton('A').focus()
    await press(cardButton('A'), ' ')
    await press(cardButton('A'), 'ArrowUp')
    expect(announcement()).toBe('已在最上方')
    await press(cardButton('A'), 'ArrowLeft')
    expect(announcement()).toBe('已在最左欄')
  })

  it('restores the original position on Escape without creating a command', async () => {
    const { store } = await mountBoard()
    cardButton('A').focus()
    await press(cardButton('A'), ' ')
    await press(cardButton('A'), 'ArrowDown')
    await press(cardButton('A'), 'Escape')
    expect(order('todo')).toEqual(['A', 'B', 'C'])
    expect(store.past).toHaveLength(0)
    expect(announcement()).toContain('已取消移動，「A」回到「待辦」第 1 張')
    expect(document.activeElement).toBe(cardButton('A'))
  })

  it('cancels when focus leaves the lifted card (EC-11)', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout'] })
    const { store } = await mountBoard()
    cardButton('A').focus()
    await press(cardButton('A'), ' ')
    await press(cardButton('A'), 'ArrowDown')
    cardButton('C').focus()
    vi.runAllTimers()
    await flushPromises()
    expect(document.querySelector('.card.lifted')).toBeNull()
    expect(order('todo')).toEqual(['A', 'B', 'C'])
    expect(store.past).toHaveLength(0)
  })

  it('reports an unchanged position when dropped where it started', async () => {
    const { store } = await mountBoard()
    cardButton('B').focus()
    await press(cardButton('B'), ' ')
    await press(cardButton('B'), ' ')
    expect(store.past).toHaveLength(0)
    expect(announcement()).toBe('已放下「B」，位置未變更')
  })
})

// ---- 指標拖放 -------------------------------------------------------------------

describe('pointer drag', () => {
  /** 從卡片中心按下，移動到 to（ghost 中心 = 指標，因為從中心抓起） */
  async function drag(id: string, from: { x: number; y: number }, to: { x: number; y: number }) {
    cardButton(id).dispatchEvent(pointer('pointerdown', from))
    window.dispatchEvent(pointer('pointermove', { x: from.x + 10, y: from.y }))
    frames.flush()
    window.dispatchEvent(pointer('pointermove', to))
    frames.flush()
    await nextTick()
  }

  async function release(at: { x: number; y: number }) {
    window.dispatchEvent(pointer('pointerup', at))
    await flushPromises()
  }

  it('reorders within a column (AC-01, EC-09)', async () => {
    const { store } = await mountBoard()
    // 扣掉 A 佔的空間後，B、C 的中線在 client y=60 與 110；放在兩者之間
    const between = { x: cardCenter('todo', 0).x, y: 85 }
    await drag('A', cardCenter('todo', 0), between)
    expect(document.querySelector('[data-column-id="todo"] [data-placeholder]')).not.toBeNull()
    expect(store.past).toHaveLength(0)
    await release(between)
    expect(store.board.columns.todo).toEqual(['B', 'A', 'C'])
    expect(store.past).toHaveLength(1)
  })

  it('moves a card into another column between two cards (AC-02)', async () => {
    const { store } = await mountBoard()
    const target = { x: cardCenter('done', 0).x, y: 85 }
    await drag('A', cardCenter('todo', 0), target)
    const doneList = document.querySelector('[data-column-id="done"] [data-card-list]')!
    expect([...doneList.children].map((el) => (el as HTMLElement).dataset.cardId ?? 'placeholder')).toEqual([
      'X',
      'placeholder',
      'Y',
    ])
    await release(target)
    expect(store.board.columns.done).toEqual(['X', 'A', 'Y'])
    expect(store.board.columns.todo).toEqual(['B', 'C'])
    expect(announcement()).toBe('已將「A」移到「完成」第 2 張，共 3 張')
  })

  it('hides the source card and shows a ghost while dragging', async () => {
    await mountBoard()
    await drag('A', cardCenter('todo', 0), cardCenter('doing', 0))
    expect(document.querySelector<HTMLElement>('[data-card-id="A"]')!.dataset.dragHidden).toBe('')
    expect(document.querySelector('.drag-ghost')?.textContent).toBe('A')
    expect(document.body.style.userSelect).toBe('none')
  })

  it('drops into an empty column at index 0 (EC-04)', async () => {
    const { store } = await mountBoard({ todo: ['A', 'B'], doing: [], done: [] })
    const target = { x: cardCenter('doing', 0).x, y: 400 }
    await drag('A', cardCenter('todo', 0), target)
    expect(document.querySelector('[data-column-id="doing"] .empty')).toBeNull()
    await release(target)
    expect(store.board.columns.doing).toEqual(['A'])
  })

  it('returns the card to its origin on Escape (AC-03, EC-03)', async () => {
    const { store } = await mountBoard()
    await drag('A', cardCenter('todo', 0), cardCenter('done', 1))
    window.dispatchEvent(keydown('Escape'))
    await flushPromises()
    expect(document.querySelector('.drag-ghost')).toBeNull()
    expect(document.querySelector('[data-placeholder]')).toBeNull()
    expect(document.body.style.userSelect).toBe('')
    expect(store.board.columns.todo).toEqual(['A', 'B', 'C'])
    expect(store.past).toHaveLength(0)
  })

  it('cancels when released outside the board', async () => {
    const { store } = await mountBoard()
    const outside = { x: 2000, y: 100 }
    await drag('A', cardCenter('todo', 0), outside)
    // 在看板外時 placeholder 回到原位，提示放開會取消
    expect(document.querySelector('[data-column-id="todo"] [data-placeholder]')).not.toBeNull()
    await release(outside)
    expect(store.past).toHaveLength(0)
    expect(announcement()).toBe('已取消移動「A」')
  })

  it('recomputes the target from the last pointer position after the list scrolls (EC-07)', async () => {
    const { store } = await mountBoard()
    const point = { x: cardCenter('done', 0).x, y: 30 }
    await drag('A', cardCenter('todo', 0), point)
    const list = document.querySelector<HTMLElement>('[data-column-id="done"] [data-card-list]')!
    list.scrollTop = 50
    list.dispatchEvent(new Event('scroll'))
    frames.flush()
    await nextTick()
    // 內容座標 30 - 40 + 50 = 40，超過 X 的中線 20（未捲動時為 -10，會插在 X 之前）
    await release(point)
    expect(store.board.columns.done).toEqual(['X', 'A', 'Y'])
  })

  it('does not open the editor after a drag, but a plain click does (EC-01)', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout'] })
    await mountBoard()
    await drag('A', cardCenter('todo', 0), cardCenter('todo', 1))
    await release(cardCenter('todo', 1))
    cardButton('A').click()
    await nextTick()
    expect(document.querySelector('.card.editing')).toBeNull()
    vi.runAllTimers()
    cardButton('A').click()
    await nextTick()
    expect(document.querySelector('[data-card-id="A"].editing')).not.toBeNull()
  })

  it('does not start a drag from the delete button', async () => {
    await mountBoard()
    const remove = document.querySelector<HTMLElement>('[data-card-id="A"] .card-remove')!
    remove.dispatchEvent(pointer('pointerdown', { x: 10, y: 10 }))
    window.dispatchEvent(pointer('pointermove', { x: 100, y: 100 }))
    frames.flush()
    await nextTick()
    expect(document.querySelector('.drag-ghost')).toBeNull()
  })
})

// ---- 歷史與焦點 -----------------------------------------------------------------

describe('history', () => {
  it('undoes and redoes with keyboard shortcuts and keeps focus on the card (AC-07)', async () => {
    const { store } = await mountBoard()
    store.moveCard('A', { column: 'done', index: 0 })
    await nextTick()
    cardButton('A').focus()
    await press(cardButton('A'), 'z', { ctrlKey: true })
    expect(order('todo')).toEqual(['A', 'B', 'C'])
    expect(announcement()).toBe('已復原：移動「A」到「完成」第 1 張')
    expect(document.activeElement).toBe(cardButton('A'))

    await press(cardButton('A'), 'z', { ctrlKey: true, shiftKey: true })
    expect(order('done')).toEqual(['A', 'X', 'Y'])
    expect(document.activeElement).toBe(cardButton('A'))
  })

  it('disables the undo button when there is no history (EC-12)', async () => {
    await mountBoard()
    const [undo] = document.querySelectorAll<HTMLButtonElement>('.history button')
    expect(undo!.disabled).toBe(true)
  })
})

// ---- 新增、編輯、刪除 -----------------------------------------------------------

describe('editing cards', () => {
  it('adds a card and keeps the input open for the next one', async () => {
    const { store } = await mountBoard()
    const addButton = document.querySelector<HTMLButtonElement>('[data-column-id="doing"] .add-button')!
    addButton.click()
    await flushPromises()
    const input = document.querySelector<HTMLInputElement>('[data-column-id="doing"] .add input')!
    expect(document.activeElement).toBe(input)
    input.value = '  新任務  '
    input.dispatchEvent(new Event('input'))
    await press(input, 'Enter')
    expect(store.board.columns.doing).toHaveLength(2)
    expect(order('doing').map((id) => store.board.cards[id!]?.title)).toEqual(['M', '新任務'])
    expect(input.value).toBe('')
    expect(document.activeElement).toBe(input)
  })

  it('rejects an empty title with an error message (EC-16)', async () => {
    const { store } = await mountBoard()
    document.querySelector<HTMLButtonElement>('[data-column-id="todo"] .add-button')!.click()
    await flushPromises()
    const input = document.querySelector<HTMLInputElement>('[data-column-id="todo"] .add input')!
    input.value = '   '
    input.dispatchEvent(new Event('input'))
    await press(input, 'Enter')
    expect(store.board.columns.todo).toHaveLength(3)
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(document.getElementById(input.getAttribute('aria-describedby')!)?.textContent).toBe('標題不能空白')
  })

  it('ignores Enter while an IME is composing', async () => {
    const { store } = await mountBoard()
    document.querySelector<HTMLButtonElement>('[data-column-id="todo"] .add-button')!.click()
    await flushPromises()
    const input = document.querySelector<HTMLInputElement>('[data-column-id="todo"] .add input')!
    input.value = 'ㄓㄨ'
    input.dispatchEvent(new Event('input'))
    await press(input, 'Enter', { isComposing: true })
    expect(store.board.columns.todo).toHaveLength(3)
  })

  it('edits a title on Enter and restores focus to the card', async () => {
    const { store } = await mountBoard()
    cardButton('B').click()
    await flushPromises()
    const input = document.querySelector<HTMLInputElement>('[data-card-id="B"] input')!
    expect(input.value).toBe('B')
    input.value = 'Beta'
    input.dispatchEvent(new Event('input'))
    await press(input, 'Enter')
    expect(store.board.cards.B?.title).toBe('Beta')
    expect(document.activeElement).toBe(cardButton('B'))
  })

  it('discards an invalid edit on blur instead of trapping focus', async () => {
    const { store } = await mountBoard()
    cardButton('B').click()
    await flushPromises()
    const input = document.querySelector<HTMLInputElement>('[data-card-id="B"] input')!
    input.value = ''
    input.dispatchEvent(new Event('input'))
    input.dispatchEvent(new FocusEvent('blur'))
    await flushPromises()
    expect(document.querySelector('.card.editing')).toBeNull()
    expect(store.board.cards.B?.title).toBe('B')
    expect(store.past).toHaveLength(0)
  })

  it('moves focus to the next card after deleting, then restores the card on undo (EC-17)', async () => {
    const { store } = await mountBoard()
    const remove = document.querySelector<HTMLButtonElement>('[data-card-id="B"] .card-remove')!
    remove.focus()
    remove.click()
    await flushPromises()
    expect(order('todo')).toEqual(['A', 'C'])
    expect(document.activeElement).toBe(cardButton('C'))
    expect(announcement()).toBe('已刪除「B」，按 Ctrl+Z 可復原')

    await press(cardButton('C'), 'z', { ctrlKey: true })
    expect(order('todo')).toEqual(['A', 'B', 'C'])
    expect(store.board.cards.B).toEqual({ id: 'B', title: 'B', createdAt: 0 })
  })

  it('moves focus to the add button after deleting the last card of a column', async () => {
    await mountBoard()
    document.querySelector<HTMLButtonElement>('[data-card-id="M"] .card-remove')!.click()
    await flushPromises()
    expect(document.activeElement).toBe(document.querySelector('[data-column-id="doing"] .add-button'))
    expect(document.querySelector('[data-column-id="doing"] .empty')).not.toBeNull()
  })
})

describe('toolbar', () => {
  it('resets the board and clears the history', async () => {
    const { store } = await mountBoard()
    store.moveCard('A', { column: 'done', index: 0 })
    const [, reset] = document.querySelectorAll<HTMLButtonElement>('.actions button')
    reset!.click()
    await flushPromises()
    expect(store.canUndo).toBe(false)
    expect(document.querySelectorAll('[data-card-id]')).toHaveLength(12)
  })

  it('loads 300 cards for the stress test', async () => {
    await mountBoard()
    const [stress] = document.querySelectorAll<HTMLButtonElement>('.actions button')
    stress!.click()
    await flushPromises()
    expect(document.querySelectorAll('[data-card-id]')).toHaveLength(300)
  })

  it('saves to localStorage after changes', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const { store } = await mountBoard()
    store.moveCard('A', { column: 'done', index: 0 })
    await nextTick()
    vi.advanceTimersByTime(300)
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).data.columns.done).toEqual(['A', 'X', 'Y'])
  })
})
