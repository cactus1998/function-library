import { describe, expect, it } from 'vitest'
import { nextTick, ref } from 'vue'
import { usePaletteNavigation } from '../composables/usePaletteNavigation'
import { keydown } from './helpers'

function setup(count: number, disabled: number[] = []) {
  const itemCount = ref(count)
  const nav = usePaletteNavigation(itemCount, { isDisabled: (i) => disabled.includes(i) })
  nav.resetToFirst()
  return { itemCount, ...nav }
}

describe('usePaletteNavigation', () => {
  it('wraps from the last item to the first and back (AC-03)', () => {
    const { activeIndex, onKeydown, setActive } = setup(5)
    setActive(4)
    expect(onKeydown(keydown('ArrowDown'))).toBe(true)
    expect(activeIndex.value).toBe(0)
    onKeydown(keydown('ArrowUp'))
    expect(activeIndex.value).toBe(4)
  })

  it('skips disabled items in both directions (EC-07)', () => {
    const { activeIndex, onKeydown } = setup(4, [0, 2])
    expect(activeIndex.value).toBe(1)
    onKeydown(keydown('ArrowDown'))
    expect(activeIndex.value).toBe(3)
    onKeydown(keydown('ArrowDown'))
    expect(activeIndex.value).toBe(1)
    onKeydown(keydown('ArrowUp'))
    expect(activeIndex.value).toBe(3)
  })

  it('refuses to activate a disabled or out-of-range item', () => {
    const { activeIndex, setActive } = setup(3, [1])
    setActive(1)
    expect(activeIndex.value).toBe(-1)
    setActive(9)
    expect(activeIndex.value).toBe(-1)
  })

  it('has no active item when the list is empty or fully disabled (EC-03)', () => {
    const empty = setup(0)
    expect(empty.activeIndex.value).toBe(-1)
    empty.onKeydown(keydown('ArrowDown'))
    expect(empty.activeIndex.value).toBe(-1)

    const allDisabled = setup(2, [0, 1])
    allDisabled.onKeydown(keydown('ArrowDown'))
    expect(allDisabled.activeIndex.value).toBe(-1)
  })

  it('ignores arrow keys during IME composition (EC-02)', () => {
    const { activeIndex, onKeydown } = setup(3)
    const event = keydown('ArrowDown', { isComposing: true })
    expect(onKeydown(event)).toBe(false)
    expect(onKeydown(keydown('ArrowDown', { keyCode: 229 }))).toBe(false)
    expect(event.defaultPrevented).toBe(false)
    expect(activeIndex.value).toBe(0)
  })

  it('leaves other keys to the caller', () => {
    const { onKeydown } = setup(3)
    expect(onKeydown(keydown('Enter'))).toBe(false)
  })

  it('resets to the first item when the list shrinks below the active index (EC-06)', async () => {
    const { activeIndex, itemCount, setActive } = setup(10)
    setActive(8)
    itemCount.value = 3
    await nextTick()
    expect(activeIndex.value).toBe(0)
  })
})
