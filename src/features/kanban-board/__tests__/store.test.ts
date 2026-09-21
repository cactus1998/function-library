import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { HISTORY_LIMIT, useBoardStore } from '../stores/board'
import { board } from './helpers'

function setup(columns: Parameters<typeof board>[0] = { todo: ['A', 'B', 'C'], done: ['X', 'Y'] }) {
  const store = useBoardStore()
  store.replace(board(columns))
  return store
}

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('useBoardStore', () => {
  it('moves a card within a column and records one command (AC-01)', () => {
    const store = setup()
    expect(store.moveCard('A', { column: 'todo', index: 1 })).toBe(true)
    expect(store.board.columns.todo).toEqual(['B', 'A', 'C'])
    expect(store.past).toHaveLength(1)
  })

  it('moves a card across columns (AC-02)', () => {
    const store = setup()
    store.moveCard('A', { column: 'done', index: 1 })
    expect(store.board.columns.done).toEqual(['X', 'A', 'Y'])
    expect(store.board.columns.todo).not.toContain('A')
  })

  it('does not record a command when dropped back in place (EC-02)', () => {
    const store = setup()
    expect(store.moveCard('B', { column: 'todo', index: 1 })).toBe(false)
    expect(store.past).toHaveLength(0)
  })

  it('clamps an out-of-range target index', () => {
    const store = setup()
    store.moveCard('A', { column: 'done', index: 99 })
    expect(store.board.columns.done).toEqual(['X', 'Y', 'A'])
  })

  it('undoes and redoes a move (AC-07)', () => {
    const store = setup()
    store.moveCard('A', { column: 'done', index: 0 })
    expect(store.undo()?.label).toBe('移動「A」到「完成」第 1 張')
    expect(store.board.columns.todo).toEqual(['A', 'B', 'C'])
    expect(store.board.columns.done).toEqual(['X', 'Y'])
    store.redo()
    expect(store.board.columns.done).toEqual(['A', 'X', 'Y'])
  })

  it('does nothing when there is nothing to undo or redo (EC-12)', () => {
    const store = setup()
    expect(store.canUndo).toBe(false)
    expect(store.undo()).toBeNull()
    expect(store.redo()).toBeNull()
    expect(store.board.columns.todo).toEqual(['A', 'B', 'C'])
  })

  it(`keeps only the latest ${HISTORY_LIMIT} commands (EC-13)`, () => {
    const store = setup({ todo: ['A', 'B'] })
    for (let i = 0; i < HISTORY_LIMIT + 5; i++) store.moveCard('A', { column: 'todo', index: i % 2 === 0 ? 1 : 0 })
    expect(store.past).toHaveLength(HISTORY_LIMIT)
    let undone = 0
    while (store.undo()) undone++
    expect(undone).toBe(HISTORY_LIMIT)
  })

  it('clears the redo stack when a new command runs after undo (EC-14)', () => {
    const store = setup()
    store.moveCard('A', { column: 'done', index: 0 })
    store.undo()
    expect(store.canRedo).toBe(true)
    store.editCard('B', 'B2')
    expect(store.canRedo).toBe(false)
    expect(store.redo()).toBeNull()
  })

  it('adds a card to the end of the column and undoes it', () => {
    const store = setup()
    const card = store.addCard('done', '新卡片')
    expect(store.board.columns.done.at(-1)).toBe(card.id)
    expect(store.board.cards[card.id]?.title).toBe('新卡片')
    store.undo()
    expect(store.board.cards[card.id]).toBeUndefined()
    expect(store.board.columns.done).toEqual(['X', 'Y'])
    store.redo()
    expect(store.board.columns.done.at(-1)).toBe(card.id)
  })

  it('edits a title, skips an unchanged title and restores the old title on undo', () => {
    const store = setup()
    expect(store.editCard('A', 'A')).toBe(false)
    expect(store.editCard('A', 'Alpha')).toBe(true)
    expect(store.board.cards.A?.title).toBe('Alpha')
    store.undo()
    expect(store.board.cards.A?.title).toBe('A')
  })

  it('restores a removed card at its original position with the same id and content (EC-17)', () => {
    const store = setup()
    store.editCard('B', 'Beta')
    store.removeCard('B')
    expect(store.board.cards.B).toBeUndefined()
    expect(store.board.columns.todo).toEqual(['A', 'C'])
    store.undo()
    expect(store.board.columns.todo).toEqual(['A', 'B', 'C'])
    expect(store.board.cards.B).toEqual({ id: 'B', title: 'Beta', createdAt: 0 })
  })

  it('replays a mixed history in the correct order', () => {
    const store = setup()
    store.moveCard('A', { column: 'done', index: 2 })
    store.editCard('A', 'A2')
    store.removeCard('X')
    const card = store.addCard('todo', 'N')
    const after = JSON.stringify(store.board)
    while (store.undo());
    expect(store.board.columns).toEqual({ todo: ['A', 'B', 'C'], doing: [], done: ['X', 'Y'] })
    expect(store.board.cards[card.id]).toBeUndefined()
    while (store.redo());
    expect(JSON.stringify(store.board)).toBe(after)
  })

  it('clears the history when the board is replaced', () => {
    const store = setup()
    store.moveCard('A', { column: 'done', index: 0 })
    store.undo()
    store.replace(board({ todo: ['Z'] }))
    expect(store.canUndo).toBe(false)
    expect(store.canRedo).toBe(false)
  })

  it('ignores operations on unknown cards', () => {
    const store = setup()
    expect(store.moveCard('missing', { column: 'todo', index: 0 })).toBe(false)
    expect(store.removeCard('missing')).toBe(false)
    expect(store.editCard('missing', 'x')).toBe(false)
    expect(store.past).toHaveLength(0)
  })
})
