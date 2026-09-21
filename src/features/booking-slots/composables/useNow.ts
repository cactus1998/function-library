import { computed, onScopeDispose, ref, type ComputedRef, type Ref } from 'vue'

const MINUTE_MS = 60_000

/**
 * 目前時間（epoch ms），在每分鐘整點更新，讓已過去的時段即時消失。
 * override 有值時固定為該時間（Demo 用來模擬「現在」）。
 */
export function useNow(override: Ref<number | null>, clock: () => number = Date.now): ComputedRef<number> {
  const real = ref(clock())
  let timer: ReturnType<typeof setTimeout> | undefined

  function schedule() {
    // 對齊到下一個整分，而不是固定每 60 秒，避免與時鐘漂移
    timer = setTimeout(() => {
      real.value = clock()
      schedule()
    }, MINUTE_MS - (clock() % MINUTE_MS))
  }

  schedule()
  onScopeDispose(() => clearTimeout(timer))

  return computed(() => override.value ?? real.value)
}
