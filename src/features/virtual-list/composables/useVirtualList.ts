import {
  computed,
  onScopeDispose,
  shallowRef,
  toValue,
  watch,
  type MaybeRefOrGetter,
  type ShallowRef,
} from 'vue'
import {
  clamp,
  computeRange,
  createDynamicLayout,
  createFixedLayout,
  isSameRange,
  scrollOffsetFor,
  type Layout,
  type ScrollAlign,
  type VirtualRange,
} from '../utils/layout'

export interface UseVirtualListOptions {
  count: MaybeRefOrGetter<number>
  /** 有值為固定高度模式，undefined 為動態高度模式 */
  itemHeight: MaybeRefOrGetter<number | undefined>
  estimatedHeight: MaybeRefOrGetter<number>
  overscan: MaybeRefOrGetter<number>
}

/** 列元素上用來對應索引的屬性，量測時靠它找回是第幾列 */
export const INDEX_ATTR = 'data-virtual-index'

const MAX_SCROLL_ATTEMPTS = 10

interface PendingScroll {
  index: number
  align: ScrollAlign
  attempts: number
}

export function useVirtualList(
  viewport: Readonly<ShallowRef<HTMLElement | null>>,
  options: UseVirtualListOptions,
) {
  const scrollTop = shallowRef(0)
  const viewportHeight = shallowRef(0)
  // 動態版面在內部修改高度，Vue 追蹤不到，用版本號通知依賴更新
  const version = shallowRef(0)

  const isDynamic = computed(() => toValue(options.itemHeight) === undefined)

  const layout = computed<Layout>(() => {
    const count = Math.max(0, Math.floor(toValue(options.count)))
    const itemHeight = toValue(options.itemHeight)
    return itemHeight === undefined
      ? createDynamicLayout(count, toValue(options.estimatedHeight))
      : createFixedLayout(count, itemHeight)
  })

  function currentLayout(): Layout {
    void version.value
    return layout.value
  }

  // 範圍沒變時回傳同一個物件，捲動在同一段範圍內時不會重新渲染列
  const range = computed<VirtualRange>((previous) => {
    const next = computeRange(
      currentLayout(),
      scrollTop.value,
      viewportHeight.value,
      toValue(options.overscan),
    )
    return previous && isSameRange(previous, next) ? previous : next
  })

  const totalHeight = computed(() => currentLayout().totalHeight)

  const windowOffset = computed(() => {
    const { renderStart, renderEnd } = range.value
    return renderEnd < renderStart ? 0 : currentLayout().offsetOf(renderStart)
  })

  // ---- 捲動到指定索引 ----------------------------------------------------

  let pending: PendingScroll | null = null
  let pendingFrame = 0

  function syncScrollTop(el: HTMLElement) {
    scrollTop.value = el.scrollTop
  }

  /**
   * 動態高度下，目標附近的列還沒量測過，第一次跳轉只能用預估值。
   * 渲染並量測後位置會改變，所以之後每一幀重新計算並修正，直到穩定為止。
   */
  function applyPendingScroll() {
    const el = viewport.value
    if (!pending || !el) return

    const target = scrollOffsetFor(
      currentLayout(),
      pending.index,
      pending.align,
      el.clientHeight,
      el.scrollTop,
    )
    if (Math.abs(el.scrollTop - target) >= 1) {
      el.scrollTop = target
      syncScrollTop(el)
    }
    pending.attempts++

    cancelAnimationFrame(pendingFrame)
    pendingFrame = requestAnimationFrame(() => {
      if (!pending) return
      const next = scrollOffsetFor(
        currentLayout(),
        pending.index,
        pending.align,
        el.clientHeight,
        el.scrollTop,
      )
      if (Math.abs(el.scrollTop - next) < 1 || pending.attempts >= MAX_SCROLL_ATTEMPTS) {
        pending = null
        return
      }
      applyPendingScroll()
    })
  }

  function scrollToIndex(index: number, align: ScrollAlign = 'start') {
    const { count } = layout.value
    if (count === 0 || !Number.isFinite(index)) return
    pending = { index: clamp(Math.trunc(index), 0, count - 1), align, attempts: 0 }
    applyPendingScroll()
  }

  function cancelPendingScroll() {
    pending = null
    cancelAnimationFrame(pendingFrame)
  }

  // ---- 量測列高度 --------------------------------------------------------

  function onItemsResize(entries: ResizeObserverEntry[]) {
    const el = viewport.value
    if (!el || !isDynamic.value) return

    const target = layout.value
    const currentTop = el.scrollTop
    let changed = false
    let anchorDelta = 0

    for (const entry of entries) {
      const index = Number(entry.target.getAttribute(INDEX_ATTR))
      if (!Number.isInteger(index)) continue
      const size =
        entry.borderBoxSize?.[0]?.blockSize ?? (entry.target as HTMLElement).offsetHeight
      const itemTop = target.offsetOf(index)
      const delta = target.measure(index, size)
      if (delta === 0) continue
      changed = true
      // 可視區上方的列變高或變矮時，補償 scrollTop，畫面內容才不會跳動
      if (itemTop < currentTop) anchorDelta += delta
    }

    if (!changed) return
    version.value++

    if (pending) {
      applyPendingScroll()
    } else if (anchorDelta !== 0) {
      el.scrollTop = currentTop + anchorDelta
      syncScrollTop(el)
    }
  }

  const itemObserver =
    typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(onItemsResize)
  const observed = new Set<Element>()

  function resetObserved() {
    itemObserver?.disconnect()
    observed.clear()
  }

  function syncObservedItems() {
    const el = viewport.value
    if (!itemObserver) return
    if (!el || !isDynamic.value) {
      resetObserved()
      return
    }
    const current = new Set(el.querySelectorAll(`[${INDEX_ATTR}]`))
    for (const node of observed) {
      if (!current.has(node)) {
        itemObserver.unobserve(node)
        observed.delete(node)
      }
    }
    for (const node of current) {
      if (!observed.has(node)) {
        itemObserver.observe(node)
        observed.add(node)
      }
    }
  }

  // 版面重建（筆數或模式改變）時，舊的量測結果已不適用，重新觀察讓每一列再量一次
  watch(layout, resetObserved)
  watch([range, layout, viewport], syncObservedItems, { flush: 'post', immediate: true })

  // ---- 容器事件 ----------------------------------------------------------

  watch(
    viewport,
    (el, _previous, onCleanup) => {
      if (!el) return

      const onScroll = () => syncScrollTop(el)
      // 使用者自己捲動時，放棄尚未完成的 scrollToIndex 修正
      const onUserScroll = () => cancelPendingScroll()

      el.addEventListener('scroll', onScroll, { passive: true })
      el.addEventListener('wheel', onUserScroll, { passive: true })
      el.addEventListener('touchstart', onUserScroll, { passive: true })

      viewportHeight.value = el.clientHeight
      syncScrollTop(el)

      const viewportObserver =
        typeof ResizeObserver === 'undefined'
          ? null
          : new ResizeObserver(() => {
              viewportHeight.value = el.clientHeight
            })
      viewportObserver?.observe(el)

      onCleanup(() => {
        el.removeEventListener('scroll', onScroll)
        el.removeEventListener('wheel', onUserScroll)
        el.removeEventListener('touchstart', onUserScroll)
        viewportObserver?.disconnect()
      })
    },
    { immediate: true },
  )

  onScopeDispose(() => {
    cancelPendingScroll()
    resetObserved()
  })

  return {
    range,
    totalHeight,
    windowOffset,
    isDynamic,
    scrollToIndex,
  }
}
