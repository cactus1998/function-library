import { shallowRef, watch, type Ref } from 'vue'

/**
 * 以 ResizeObserver 追蹤元素的 layout 尺寸（不受 transform 影響）。
 * 元素換掉或卸載時自動斷開 observer。
 */
export function useElementSize(target: Readonly<Ref<HTMLElement | null>>) {
  const width = shallowRef(0)
  const height = shallowRef(0)

  watch(
    target,
    (el, _prev, onCleanup) => {
      if (!el) return
      const observer = new ResizeObserver(([entry]) => {
        if (!entry) return
        width.value = entry.contentRect.width
        height.value = entry.contentRect.height
      })
      observer.observe(el)
      onCleanup(() => observer.disconnect())
    },
    { immediate: true, flush: 'post' },
  )

  return { width, height }
}
