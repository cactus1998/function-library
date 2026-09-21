import { ref, watch, type Ref } from 'vue'

export interface PaletteNavigationOptions {
  /** 停用的項目不會成為 active */
  isDisabled?: (index: number) => boolean
}

export function usePaletteNavigation(itemCount: Ref<number>, options: PaletteNavigationOptions = {}) {
  const { isDisabled = () => false } = options
  const activeIndex = ref(-1)

  /** 從 start 往 step 方向找第一個可用項目，頭尾循環；沒有則回傳 -1 */
  function findEnabled(start: number, step: 1 | -1): number {
    const count = itemCount.value
    for (let i = 0; i < count; i++) {
      const index = (((start + step * i) % count) + count) % count
      if (!isDisabled(index)) return index
    }
    return -1
  }

  function setActive(index: number) {
    activeIndex.value = index >= 0 && index < itemCount.value && !isDisabled(index) ? index : -1
  }

  function resetToFirst() {
    activeIndex.value = findEnabled(0, 1)
  }

  function move(step: 1 | -1) {
    if (itemCount.value === 0) return
    const from = activeIndex.value
    activeIndex.value = from === -1 ? findEnabled(step === 1 ? 0 : itemCount.value - 1, step) : findEnabled(from + step, step)
  }

  /** 處理方向鍵；有處理時回傳 true */
  function onKeydown(event: KeyboardEvent): boolean {
    if (event.isComposing || event.keyCode === 229) return false
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      move(event.key === 'ArrowDown' ? 1 : -1)
      return true
    }
    return false
  }

  // 項目數變少時 active 可能超出範圍
  watch(itemCount, (count) => {
    if (activeIndex.value >= count) resetToFirst()
  })

  return { activeIndex, onKeydown, setActive, resetToFirst }
}
