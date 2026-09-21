import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import { useCropper } from '../composables/useCropper'
import { useImageSource } from '../composables/useImageSource'
import { useUpload } from '../composables/useUpload'
import type { ImageSize, UploadOptions } from '../types'
import { deferred, fakeSource, imageFile, stubObjectUrls, withScope } from './helpers'

let urls: ReturnType<typeof stubObjectUrls>
beforeEach(() => {
  urls = stubObjectUrls()
})

describe('useImageSource', () => {
  const decoded = (width: number, height: number) => ({ width, height, source: fakeSource })

  it('loads a valid image and exposes its object URL', async () => {
    const { result, stop } = withScope(() => useImageSource(async () => decoded(1000, 2000)))
    const loading = result.load(imageFile())
    expect(result.status.value).toBe('loading')
    expect(await loading).toBe(true)
    expect(result.status.value).toBe('ready')
    expect(result.image.value).toMatchObject({ url: 'blob:test/1', width: 1000, height: 2000 })
    stop()
  })

  it('rejects unsupported files before creating a URL (EC-01)', async () => {
    const { result, stop } = withScope(() => useImageSource(async () => decoded(1000, 1000)))
    expect(await result.load(imageFile('a.gif', 'image/gif'))).toBe(false)
    expect(result.error.value).toBe('只支援 JPEG、PNG、WebP')
    expect(URL.createObjectURL).not.toHaveBeenCalled()
    expect(await result.load(null)).toBe(false)
    expect(result.error.value).toBe('請選擇圖片檔')
    stop()
  })

  it('reports images that are too small and releases their URL (EC-03)', async () => {
    const { result, stop } = withScope(() => useImageSource(async () => decoded(150, 800)))
    expect(await result.load(imageFile())).toBe(false)
    expect(result.error.value).toContain('至少要 200×200')
    expect(result.status.value).toBe('empty')
    expect(urls.alive()).toEqual([])
    stop()
  })

  it('reports decode failures and releases the URL (EC-04)', async () => {
    const { result, stop } = withScope(() =>
      useImageSource(async () => {
        throw new Error('EncodingError')
      }),
    )
    expect(await result.load(imageFile('fake.png'))).toBe(false)
    expect(result.error.value).toBe('無法讀取這張圖片')
    expect(urls.alive()).toEqual([])
    stop()
  })

  it('discards a slower earlier load when a newer file is chosen (EC-05)', async () => {
    const pending = [deferred<ReturnType<typeof decoded>>(), deferred<ReturnType<typeof decoded>>()]
    let call = 0
    const { result, stop } = withScope(() => useImageSource(() => pending[call++]!.promise))
    const first = result.load(imageFile('first.png'))
    const second = result.load(imageFile('second.png'))
    pending[1]!.resolve(decoded(400, 400))
    expect(await second).toBe(true)
    pending[0]!.resolve(decoded(1000, 1000))
    expect(await first).toBe(false)
    expect(result.image.value?.file.name).toBe('second.png')
    expect(urls.revoked.has('blob:test/1')).toBe(true)
    expect(urls.alive()).toEqual(['blob:test/2'])
    stop()
  })

  it('keeps the current image when a replacement is invalid, and revokes the old URL on replace', async () => {
    const { result, stop } = withScope(() => useImageSource(async () => decoded(500, 500)))
    await result.load(imageFile('a.png'))
    await result.load(imageFile('b.gif', 'image/gif'))
    expect(result.image.value?.file.name).toBe('a.png')
    await result.load(imageFile('c.png'))
    expect(urls.alive()).toEqual(['blob:test/2'])
    stop()
  })

  it('releases every URL on clear and dispose (AC-08, EC-18)', async () => {
    const { result, stop } = withScope(() => useImageSource(async () => decoded(500, 500)))
    await result.load(imageFile())
    result.clear()
    expect(result.image.value).toBeNull()
    expect(urls.alive()).toEqual([])
    const pending = result.load(imageFile())
    stop()
    await pending
    expect(urls.alive()).toEqual([])
  })
})

describe('useCropper', () => {
  function setup(size: ImageSize | null = { width: 1000, height: 2000 }) {
    const image = ref<ImageSize | null>(size)
    const viewport = ref(280)
    const { result, stop } = withScope(() => useCropper(image, viewport))
    return { image, viewport, cropper: result, stop }
  }

  const key = (name: string, shiftKey = false) =>
    new KeyboardEvent('keydown', { key: name, shiftKey, cancelable: true })

  function pointer(type: string, pointerId: number, clientX: number, clientY: number) {
    return { type, pointerId, clientX, clientY, pointerType: 'touch', button: 0, currentTarget: null } as unknown as PointerEvent
  }

  it('starts centered at the minimum zoom (AC-01)', () => {
    const { cropper, stop } = setup()
    expect(cropper.crop.value).toEqual({ scale: 0.28, x: 0, y: -140 })
    expect(cropper.zoom.value).toBe(1)
    stop()
  })

  it('pans, zooms and resets with the keyboard (AC-04)', () => {
    const { cropper, stop } = setup()
    cropper.onKeydown(key('ArrowDown'))
    expect(cropper.crop.value.y).toBe(-130)
    const shifted = key('ArrowUp', true)
    cropper.onKeydown(shifted)
    expect(cropper.crop.value.y).toBe(-180)
    expect(shifted.defaultPrevented).toBe(true)
    cropper.onKeydown(key('+'))
    expect(cropper.zoom.value).toBeCloseTo(1.1)
    // 以中心放大 1.1 倍後 x = 140 − 140 × 1.1 = −14，再右移 10
    cropper.onKeydown(key('ArrowRight'))
    expect(cropper.crop.value.x).toBeCloseTo(-4)
    cropper.onKeydown(key('0'))
    expect(cropper.crop.value).toEqual({ scale: 0.28, x: 0, y: -140 })
    const other = key('a')
    cropper.onKeydown(other)
    expect(other.defaultPrevented).toBe(false)
    stop()
  })

  it('drags with one pointer and stops after pointerup', () => {
    const { cropper, stop } = setup()
    cropper.onPointerDown(pointer('pointerdown', 1, 100, 100))
    expect(cropper.dragging.value).toBe(true)
    cropper.onPointerMove(pointer('pointermove', 1, 100, 160))
    expect(cropper.crop.value.y).toBe(-80)
    cropper.onPointerMove(pointer('pointermove', 1, 100, 1000))
    expect(cropper.crop.value.y).toBe(0)
    cropper.onPointerUp(pointer('pointerup', 1, 100, 1000))
    expect(cropper.dragging.value).toBe(false)
    cropper.onPointerMove(pointer('pointermove', 1, 100, 0))
    expect(cropper.crop.value.y).toBe(0)
    stop()
  })

  it('zooms around the midpoint when pinching with two fingers (EC-08)', () => {
    const { cropper, stop } = setup()
    cropper.onPointerDown(pointer('pointerdown', 1, 100, 140))
    cropper.onPointerDown(pointer('pointerdown', 2, 180, 140))
    const before = cropper.crop.value
    const focusBefore = (140 - before.x) / before.scale
    // 兩指距離 80 → 160，中點維持在 (140, 140)
    cropper.onPointerMove(pointer('pointermove', 1, 60, 140))
    cropper.onPointerMove(pointer('pointermove', 2, 220, 140))
    const after = cropper.crop.value
    expect(after.scale).toBeCloseTo(0.56)
    expect((140 - after.x) / after.scale).toBeCloseTo(focusBefore)
    stop()
  })

  it('zooms with the wheel and prevents page scrolling (EC-17)', () => {
    const { cropper, stop } = setup()
    const event = new WheelEvent('wheel', { deltaY: -200, clientX: 140, clientY: 140, cancelable: true })
    cropper.onWheel(event)
    expect(event.defaultPrevented).toBe(true)
    expect(cropper.zoom.value).toBeCloseTo(Math.exp(0.3))
    stop()
  })

  it('sets zoom from the slider around the center (AC-03)', () => {
    const { cropper, stop } = setup()
    cropper.setZoom(2)
    expect(cropper.crop.value.scale).toBeCloseTo(0.56)
    cropper.setZoom(10)
    expect(cropper.zoom.value).toBe(4)
    stop()
  })

  it('resets when the image changes and ignores input without an image', async () => {
    const { image, cropper, stop } = setup(null)
    cropper.onKeydown(key('ArrowLeft'))
    cropper.onPointerDown(pointer('pointerdown', 1, 0, 0))
    expect(cropper.dragging.value).toBe(false)
    image.value = { width: 2000, height: 1000 }
    await nextTick()
    expect(cropper.crop.value).toEqual({ scale: 0.28, x: -140, y: 0 })
    stop()
  })

  it('keeps the same region when the viewport shrinks', async () => {
    const { viewport, cropper, stop } = setup()
    cropper.setZoom(2)
    const before = { ...cropper.crop.value }
    viewport.value = 140
    await nextTick()
    expect(cropper.crop.value.scale).toBeCloseTo(before.scale / 2)
    expect(cropper.crop.value.y).toBeCloseTo(before.y / 2)
    stop()
  })
})

describe('useUpload', () => {
  const blob = new Blob(['x'])

  function controllable() {
    const calls: { options: UploadOptions; request: ReturnType<typeof deferred<{ url: string }>> }[] = []
    const uploader = vi.fn((_: Blob, options: UploadOptions) => {
      const request = deferred<{ url: string }>()
      calls.push({ options, request })
      return request.promise
    })
    return { uploader, calls }
  }

  it('tracks progress and success (AC-06)', async () => {
    const { uploader, calls } = controllable()
    const { result, stop } = withScope(() => useUpload(uploader))
    const done = result.start(blob)
    expect(result.status.value).toBe('uploading')
    calls[0]!.options.onProgress(50, 200)
    expect(result.progress.value).toBe(0.25)
    calls[0]!.request.resolve({ url: 'https://x' })
    expect(await done).toBe(true)
    expect(result.status.value).toBe('success')
    expect(result.url.value).toBe('https://x')
    stop()
  })

  it('ignores a second start while uploading (EC-16)', () => {
    const { uploader } = controllable()
    const { result, stop } = withScope(() => useUpload(uploader))
    void result.start(blob)
    void result.start(blob)
    expect(uploader).toHaveBeenCalledTimes(1)
    stop()
  })

  it('aborts and returns to idle when canceled (AC-06, EC-14)', async () => {
    const { uploader, calls } = controllable()
    const { result, stop } = withScope(() => useUpload(uploader))
    const done = result.start(blob)
    calls[0]!.options.onProgress(100, 200)
    result.cancel()
    expect(calls[0]!.options.signal.aborted).toBe(true)
    expect(result.status.value).toBe('idle')
    expect(result.progress.value).toBe(0)
    calls[0]!.request.reject(new DOMException('aborted', 'AbortError'))
    expect(await done).toBe(false)
    expect(result.status.value).toBe('idle')
    expect(result.error.value).toBeNull()
    stop()
  })

  it('shows the error and retries from zero (AC-07, EC-15)', async () => {
    const { uploader, calls } = controllable()
    const { result, stop } = withScope(() => useUpload(uploader))
    const first = result.start(blob)
    calls[0]!.options.onProgress(100, 200)
    calls[0]!.request.reject(new Error('網路連線中斷'))
    await first
    expect(result.status.value).toBe('error')
    expect(result.error.value).toBe('網路連線中斷')

    const second = result.retry()
    expect(result.progress.value).toBe(0)
    expect(uploader.mock.calls[1]![0]).toBe(blob)
    calls[1]!.request.resolve({ url: 'https://y' })
    expect(await second).toBe(true)
    stop()
  })

  it('aborts an in-flight upload on dispose (EC-18)', async () => {
    const { uploader, calls } = controllable()
    const { result, stop } = withScope(() => useUpload(uploader))
    void result.start(blob)
    stop()
    expect(calls[0]!.options.signal.aborted).toBe(true)
    await flushPromises()
  })
})
