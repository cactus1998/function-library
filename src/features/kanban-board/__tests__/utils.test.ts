import { describe, expect, it } from 'vitest'
import { edgeSpeed } from '../composables/useAutoScroll'
import { attach, findPosition, moveInColumns, samePosition, stepPosition } from '../utils/board'
import { validateTitle } from '../utils/card'
import { resolveDrop, type BoardGeometry } from '../utils/geometry'
import { describePosition } from '../utils/messages'
import { parseBoard, serializeBoard } from '../utils/persist'
import { createSeedBoard, createStressBoard } from '../utils/seed'
import { board } from './helpers'

describe('board utils', () => {
  it('finds a card position and reports null for unknown ids', () => {
    const { columns } = board({ todo: ['A'], done: ['X', 'Y'] })
    expect(findPosition(columns, 'Y')).toEqual({ column: 'done', index: 1 })
    expect(findPosition(columns, 'missing')).toBeNull()
  })

  it('compares positions including null', () => {
    expect(samePosition(null, null)).toBe(true)
    expect(samePosition({ column: 'todo', index: 0 }, null)).toBe(false)
    expect(samePosition({ column: 'todo', index: 1 }, { column: 'todo', index: 1 })).toBe(true)
  })

  it('clamps an out-of-range insert index to the end of the column', () => {
    const { columns } = board({ todo: ['A', 'B'] })
    attach(columns, 'Z', { column: 'todo', index: 99 })
    attach(columns, 'W', { column: 'todo', index: -5 })
    expect(columns.todo).toEqual(['W', 'A', 'B', 'Z'])
  })

  it('moves a card without mutating the original columns (keyboard preview)', () => {
    const { columns } = board({ todo: ['A', 'B', 'C'] })
    const next = moveInColumns(columns, 'A', { column: 'todo', index: 1 })
    expect(next.todo).toEqual(['B', 'A', 'C'])
    expect(columns.todo).toEqual(['A', 'B', 'C'])
  })

  it('uses the index after removal, so moving down in the same column does not overshoot (EC-09)', () => {
    const { columns } = board({ todo: ['A', 'B', 'C'] })
    expect(moveInColumns(columns, 'A', { column: 'todo', index: 2 }).todo).toEqual(['B', 'C', 'A'])
  })

  it('describes a position counting the card itself once', () => {
    const { columns } = board({ todo: ['A', 'B'], doing: ['X'] })
    expect(describePosition(columns, 'A', { column: 'doing', index: 1 })).toBe('「進行中」第 2 張，共 2 張')
    expect(describePosition(columns, 'A', { column: 'todo', index: 0 })).toBe('「待辦」第 1 張，共 2 張')
  })
})

describe('stepPosition (keyboard drag)', () => {
  const { columns } = board({ todo: ['A', 'B', 'C'], doing: ['X'], done: [] })

  it('moves up and down within the column', () => {
    expect(stepPosition(columns, 'B', { column: 'todo', index: 1 }, 'up')).toEqual({
      position: { column: 'todo', index: 0 },
      blocked: false,
    })
    expect(stepPosition(columns, 'B', { column: 'todo', index: 1 }, 'down').position).toEqual({
      column: 'todo',
      index: 2,
    })
  })

  it('is blocked at the top, bottom, leftmost and rightmost edges (EC-10)', () => {
    expect(stepPosition(columns, 'A', { column: 'todo', index: 0 }, 'up').blocked).toBe(true)
    expect(stepPosition(columns, 'C', { column: 'todo', index: 2 }, 'down').blocked).toBe(true)
    expect(stepPosition(columns, 'A', { column: 'todo', index: 0 }, 'left').blocked).toBe(true)
    expect(stepPosition(columns, 'A', { column: 'done', index: 0 }, 'right').blocked).toBe(true)
  })

  it('keeps the same index when changing columns, clamped to the end of the target', () => {
    expect(stepPosition(columns, 'C', { column: 'todo', index: 2 }, 'right').position).toEqual({
      column: 'doing',
      index: 1,
    })
    expect(stepPosition(columns, 'A', { column: 'todo', index: 0 }, 'right').position).toEqual({
      column: 'doing',
      index: 0,
    })
  })

  it('can move a card into an empty column', () => {
    expect(stepPosition(columns, 'X', { column: 'doing', index: 0 }, 'right').position).toEqual({
      column: 'done',
      index: 0,
    })
  })
})

describe('validateTitle', () => {
  it('trims the title', () => {
    expect(validateTitle('  修 bug  ')).toEqual({ ok: true, title: '修 bug' })
  })

  it('rejects empty and whitespace-only titles (EC-16)', () => {
    expect(validateTitle('')).toEqual({ ok: false, error: '標題不能空白' })
    expect(validateTitle('   \n ')).toEqual({ ok: false, error: '標題不能空白' })
  })

  it('accepts 100 characters and rejects 101', () => {
    expect(validateTitle('a'.repeat(100)).ok).toBe(true)
    expect(validateTitle('a'.repeat(101))).toEqual({ ok: false, error: '標題最多 100 字' })
  })
})

describe('parseBoard', () => {
  const stored = (data: unknown, version = 1) => JSON.stringify({ version, data })

  it('round-trips a serialized board', () => {
    const seed = createSeedBoard()
    expect(parseBoard(serializeBoard(seed))).toEqual(seed)
  })

  it('returns null for missing, corrupted, wrong-version or wrongly shaped data (EC-18)', () => {
    expect(parseBoard(null)).toBeNull()
    expect(parseBoard('{not json')).toBeNull()
    expect(parseBoard(stored(board({ todo: ['A'] }), 2))).toBeNull()
    expect(parseBoard(JSON.stringify([1, 2]))).toBeNull()
    expect(parseBoard(stored({ cards: {}, columns: { todo: 'A', doing: [], done: [] } }))).toBeNull()
    expect(parseBoard(stored({ cards: [], columns: { todo: [], doing: [], done: [] } }))).toBeNull()
  })

  it('drops ids that reference missing cards and keeps only the first of duplicate ids (EC-19)', () => {
    const data = {
      cards: board({ todo: ['A', 'B'] }).cards,
      columns: { todo: ['A', 'ghost', 'B', 'A'], doing: ['B'], done: [42] },
    }
    expect(parseBoard(stored(data))?.columns).toEqual({ todo: ['A', 'B'], doing: [], done: [] })
  })

  it('discards invalid cards and cards that no column references', () => {
    const data = {
      cards: {
        A: { id: 'A', title: 'A', createdAt: 0 },
        B: { id: 'B', title: '   ', createdAt: 0 },
        C: { id: 'C', title: 'C', createdAt: 'yesterday' },
        D: { id: 'D', title: 'D', createdAt: 0 },
      },
      columns: { todo: ['A', 'B', 'C'], doing: [], done: [] },
    }
    const parsed = parseBoard(stored(data))
    expect(parsed?.columns.todo).toEqual(['A'])
    expect(Object.keys(parsed?.cards ?? {})).toEqual(['A'])
  })

  it('does not let a "__proto__" id pollute the cards object', () => {
    const raw = `{"version":1,"data":{"cards":{"x":{"id":"__proto__","title":"evil","createdAt":0}},"columns":{"todo":["__proto__"],"doing":[],"done":[]}}}`
    const parsed = parseBoard(raw)
    expect(Object.getPrototypeOf(parsed?.cards)).toBe(Object.prototype)
    expect(Object.hasOwn(parsed?.cards ?? {}, '__proto__')).toBe(true)
  })
})

describe('seed data', () => {
  it('creates 12 unique cards in three columns', () => {
    const seed = createSeedBoard()
    const ids = [...seed.columns.todo, ...seed.columns.doing, ...seed.columns.done]
    expect(ids).toHaveLength(12)
    expect(new Set(ids).size).toBe(12)
  })

  it('creates the stress board with the requested number of cards per column', () => {
    const stress = createStressBoard(100)
    expect(Object.keys(stress.cards)).toHaveLength(300)
    expect(stress.columns.doing).toHaveLength(100)
  })
})

describe('resolveDrop', () => {
  // 兩欄：待辦 x 0–100，進行中 x 150–250；列表從 y=0 開始
  const geometry: BoardGeometry = {
    rect: { left: 0, right: 250, top: 0, bottom: 500 },
    columns: [
      { column: 'todo', rect: { left: 0, right: 100, top: 0, bottom: 500 }, listTop: 0, scrollTop: 0, mids: [20, 70, 120] },
      { column: 'doing', rect: { left: 150, right: 250, top: 0, bottom: 500 }, listTop: 0, scrollTop: 0, mids: [] },
    ],
  }

  it('counts how many card midlines are above the point', () => {
    expect(resolveDrop(geometry, { x: 50, y: 5 })).toEqual({ column: 'todo', index: 0 })
    expect(resolveDrop(geometry, { x: 50, y: 90 })).toEqual({ column: 'todo', index: 2 })
    expect(resolveDrop(geometry, { x: 50, y: 400 })).toEqual({ column: 'todo', index: 3 })
  })

  it('drops at index 0 of an empty column (EC-04)', () => {
    expect(resolveDrop(geometry, { x: 200, y: 300 })).toEqual({ column: 'doing', index: 0 })
  })

  it('picks the horizontally nearest column when the point falls in the gap', () => {
    expect(resolveDrop(geometry, { x: 110, y: 5 })?.column).toBe('todo')
    expect(resolveDrop(geometry, { x: 140, y: 5 })?.column).toBe('doing')
  })

  it('returns null outside the board so dropping there cancels', () => {
    expect(resolveDrop(geometry, { x: 300, y: 10 })).toBeNull()
    expect(resolveDrop(geometry, { x: 50, y: -1 })).toBeNull()
  })

  it('accounts for the list scroll offset (EC-07)', () => {
    const scrolled: BoardGeometry = {
      ...geometry,
      columns: [{ ...geometry.columns[0]!, scrollTop: 100 }],
    }
    // 內容座標 = 5 - 0 + 100 = 105，在 70 與 120 之間
    expect(resolveDrop(scrolled, { x: 50, y: 5 })).toEqual({ column: 'todo', index: 2 })
  })
})

describe('edgeSpeed (AC-04)', () => {
  it('is zero away from the edges', () => {
    expect(edgeSpeed(250, 0, 500, 48, 16)).toBe(0)
  })

  it('grows toward the edge and never exceeds the max speed', () => {
    expect(edgeSpeed(490, 0, 500, 48, 16)).toBeGreaterThan(edgeSpeed(470, 0, 500, 48, 16))
    expect(edgeSpeed(499, 0, 500, 48, 16)).toBeLessThanOrEqual(16)
    expect(edgeSpeed(510, 0, 500, 48, 16)).toBe(16)
  })

  it('scrolls backward near the start edge', () => {
    expect(edgeSpeed(5, 0, 500, 48, 16)).toBeLessThan(0)
    expect(edgeSpeed(-20, 0, 500, 48, 16)).toBe(-16)
  })

  it('ignores points farther than one edge width outside the container', () => {
    expect(edgeSpeed(600, 0, 500, 48, 16)).toBe(0)
    expect(edgeSpeed(-60, 0, 500, 48, 16)).toBe(0)
  })
})
