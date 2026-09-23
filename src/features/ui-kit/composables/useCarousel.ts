import { computed, onScopeDispose, shallowRef, watch, type Ref } from 'vue'
import { usePrefersReducedMotion } from './useMediaQuery'

export interface CarouselOptions {
  count: number
  interval?: number
}

/**
 * 以 CSS scroll-snap 負責滑動（觸控、觸控板、捲軸都原生支援），JS 只處理：
 * 1. IntersectionObserver 追蹤目前是哪一張，不監聽 scroll 事件
 * 2. 自動播放：滑鼠移入、鍵盤焦點進入、分頁隱藏、使用者按暫停、偏好減少動態時停止
 */
export function useCarousel(track: Readonly<Ref<HTMLElement | null>>, options: CarouselOptions) {
  const { count, interval = 5000 } = options
  const current = shallowRef(0)
  const reducedMotion = usePrefersReducedMotion()

  /** 使用者明確按了暫停；偏好減少動態時預設暫停 */
  const userPaused = shallowRef(reducedMotion.value)
  const hovering = shallowRef(false)
  const focusWithin = shallowRef(false)
  const pageHidden = shallowRef(document.hidden)

  watch(reducedMotion, (reduce) => {
    if (reduce) userPaused.value = true
  })

  const playing = computed(() => !userPaused.value && !hovering.value && !focusWithin.value && !pageHidden.value)

  function slides(): HTMLElement[] {
    return track.value ? Array.from(track.value.children).filter((el): el is HTMLElement => el instanceof HTMLElement) : []
  }

  function goTo(index: number) {
    const el = track.value
    const target = slides()[(index + count) % count]
    if (!el || !target) return
    el.scrollTo({ left: target.offsetLeft, behavior: reducedMotion.value ? 'auto' : 'smooth' })
  }

  const next = () => goTo(current.value + 1)
  const prev = () => goTo(current.value - 1)

  watch(
    track,
    (el, _prev, onCleanup) => {
      if (!el) return
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue
            const index = slides().indexOf(entry.target as HTMLElement)
            if (index !== -1) current.value = index
          }
        },
        { root: el, threshold: 0.6 },
      )
      for (const slide of slides()) observer.observe(slide)
      onCleanup(() => observer.disconnect())
    },
    { immediate: true, flush: 'post' },
  )

  let timer = 0
  watch(
    playing,
    (isPlaying) => {
      window.clearInterval(timer)
      if (isPlaying) timer = window.setInterval(next, interval)
    },
    { immediate: true },
  )

  const onVisibility = () => {
    pageHidden.value = document.hidden
  }
  document.addEventListener('visibilitychange', onVisibility)

  onScopeDispose(() => {
    window.clearInterval(timer)
    document.removeEventListener('visibilitychange', onVisibility)
  })

  function togglePlay() {
    userPaused.value = !userPaused.value
  }

  /** 焦點移到輪播外才恢復，焦點在內部元素之間移動不算離開 */
  function onFocusOut(event: FocusEvent) {
    const root = event.currentTarget
    if (root instanceof HTMLElement && !root.contains(event.relatedTarget as Node | null)) focusWithin.value = false
  }

  return {
    current,
    playing,
    userPaused,
    goTo,
    next,
    prev,
    togglePlay,
    onPointerEnter: () => (hovering.value = true),
    onPointerLeave: () => (hovering.value = false),
    onFocusIn: () => (focusWithin.value = true),
    onFocusOut,
  }
}
