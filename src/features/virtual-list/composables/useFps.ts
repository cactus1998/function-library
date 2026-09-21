import { onScopeDispose, shallowRef } from 'vue'

/** 以 requestAnimationFrame 計算每秒幀數，每 sampleMs 更新一次 */
export function useFps(sampleMs = 500) {
  const fps = shallowRef(0)
  let frames = 0
  let last = performance.now()
  let frameId = 0

  const loop = (now: number) => {
    frames++
    const elapsed = now - last
    if (elapsed >= sampleMs) {
      fps.value = Math.round((frames * 1000) / elapsed)
      frames = 0
      last = now
    }
    frameId = requestAnimationFrame(loop)
  }
  frameId = requestAnimationFrame(loop)

  onScopeDispose(() => cancelAnimationFrame(frameId))

  return { fps }
}
