export interface ListItem {
  id: number
  title: string
  body: string
}

const ADJECTIVES = ['Swift', 'Quiet', 'Amber', 'Lunar', 'Brave', 'Crimson', 'Silent', 'Golden']
const NOUNS = ['Falcon', 'River', 'Harbor', 'Summit', 'Meadow', 'Comet', 'Forest', 'Signal']
const WORDS =
  'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum'.split(
    ' ',
  )

export const MAX_BODY_LENGTH = 300

/** mulberry32：固定 seed 的偽亂數，讓每次產生的資料與高度都相同 */
export function createRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * 產生展示資料。內文從同一段長字串切出（V8 的 sliced string 共用記憶體），
 * 10 萬筆資料不會各自配置一份字串。
 */
export function generateItems(count: number, seed = 42): ListItem[] {
  const random = createRandom(seed)
  const pick = <T>(list: readonly T[]): T => list[Math.floor(random() * list.length)]

  let pool = ''
  while (pool.length < MAX_BODY_LENGTH * 4) pool += `${pick(WORDS)} `

  const items: ListItem[] = new Array(count)
  for (let i = 0; i < count; i++) {
    const length = Math.floor(random() * (MAX_BODY_LENGTH + 1))
    const start = Math.floor(random() * (pool.length - MAX_BODY_LENGTH))
    items[i] = {
      id: i,
      title: `${pick(ADJECTIVES)} ${pick(NOUNS)}`,
      body: pool.slice(start, start + length).trim(),
    }
  }
  return items
}
