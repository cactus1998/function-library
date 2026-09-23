import { onScopeDispose, shallowRef } from 'vue'

/** 追蹤 media query 的結果，例如 prefers-reduced-motion 或斷點 */
export function useMediaQuery(query: string) {
  const mql = window.matchMedia(query)
  const matches = shallowRef(mql.matches)
  const onChange = (event: MediaQueryListEvent) => {
    matches.value = event.matches
  }
  mql.addEventListener('change', onChange)
  onScopeDispose(() => mql.removeEventListener('change', onChange))
  return matches
}

export function usePrefersReducedMotion() {
  return useMediaQuery('(prefers-reduced-motion: reduce)')
}
