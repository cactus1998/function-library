import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMockUploader } from '../services/mockUpload'
import {
  clampCrop,
  coverScale,
  initialCrop,
  panCrop,
  rescaleCrop,
  scaleRange,
  sourceRect,
  zoomCropAt,
} from '../utils/crop'
import { encodeWithinBudget, exportCrop, QUALITIES } from '../utils/encode'
import { firstImageFile, formatBytes, formatName, validateDimensions, validateFile } from '../utils/file'

const V = 280
const PORTRAIT = { width: 1000, height: 2000 }
const LANDSCAPE = { width: 2000, height: 1000 }

/** 裁切框中某點對應的原圖座標 */
const imagePoint = (state: { scale: number; x: number; y: number }, fx: number, fy: number) => ({
  x: (fx - state.x) / state.scale,
  y: (fy - state.y) / state.scale,
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('crop geometry', () => {
  it('covers and centers a portrait image on load (AC-01, EC-06)', () => {
    expect(coverScale(PORTRAIT, V)).toBe(0.28)
    expect(initialCrop(PORTRAIT, V)).toEqual({ scale: 0.28, x: 0, y: -140 })
    expect(scaleRange(PORTRAIT, V)).toEqual({ min: 0.28, max: 1.12 })
  })

  it('keeps the image edge flush with the frame when dragged too far (AC-02, EC-07)', () => {
    const start = initialCrop(LANDSCAPE, V)
    expect(start.x).toBe(-140)
    expect(panCrop(start, 1000, 0, LANDSCAPE, V)).toEqual({ scale: 0.28, x: 0, y: 0 })
    expect(panCrop(start, -1000, 0, LANDSCAPE, V)).toEqual({ scale: 0.28, x: -280, y: 0 })
    expect(panCrop(start, 0, 50, LANDSCAPE, V).y).toBe(0)
  })

  it('zooms around a focus point without moving the pixel under it (AC-03, EC-08)', () => {
    const start = initialCrop(PORTRAIT, V)
    const before = imagePoint(start, 140, 140)
    const zoomed = zoomCropAt(start, start.scale * 2, 140, 140, PORTRAIT, V)
    expect(imagePoint(zoomed, 140, 140)).toEqual(before)
    expect(sourceRect(zoomed, V).size).toBeCloseTo(sourceRect(start, V).size / 2)

    // 以游標位置縮放
    const cursorBefore = imagePoint(zoomed, 200, 60)
    const again = zoomCropAt(zoomed, zoomed.scale * 1.5, 200, 60, PORTRAIT, V)
    const cursorAfter = imagePoint(again, 200, 60)
    expect(cursorAfter.x).toBeCloseTo(cursorBefore.x)
    expect(cursorAfter.y).toBeCloseTo(cursorBefore.y)
  })

  it('clamps zoom between cover and 4× (EC-09)', () => {
    const start = initialCrop(PORTRAIT, V)
    expect(zoomCropAt(start, 0.01, 140, 140, PORTRAIT, V).scale).toBe(0.28)
    expect(zoomCropAt(start, 100, 140, 140, PORTRAIT, V).scale).toBe(1.12)
    // 縮回最小時仍然蓋滿
    const out = zoomCropAt(zoomCropAt(start, 1, 0, 0, PORTRAIT, V), 0.28, 280, 280, PORTRAIT, V)
    expect(out.x).toBeLessThanOrEqual(0)
    expect(out.x).toBeGreaterThanOrEqual(V - PORTRAIT.width * out.scale)
  })

  it('maps the frame to a square in image pixels', () => {
    const rect = sourceRect({ scale: 0.28, x: 0, y: -140 }, V)
    expect(rect.sx).toBe(0)
    expect(rect.sy).toBeCloseTo(500)
    expect(rect.size).toBeCloseTo(1000)
  })

  it('keeps the same image region when the frame is resized', () => {
    const state = zoomCropAt(initialCrop(PORTRAIT, V), 0.5, 100, 100, PORTRAIT, V)
    const rescaled = rescaleCrop(state, V, 200, PORTRAIT)
    const a = sourceRect(state, V)
    const b = sourceRect(rescaled, 200)
    expect(b.sx).toBeCloseTo(a.sx)
    expect(b.sy).toBeCloseTo(a.sy)
    expect(b.size).toBeCloseTo(a.size)
    expect(clampCrop(rescaled, PORTRAIT, 200)).toEqual(rescaled)
  })
})

describe('file validation', () => {
  it('only accepts JPEG, PNG and WebP (EC-01)', () => {
    expect(validateFile({ type: 'image/png', size: 1000 })).toBeNull()
    expect(validateFile({ type: 'image/webp', size: 1000 })).toBeNull()
    for (const type of ['image/gif', 'application/pdf', 'image/heic', '']) {
      expect(validateFile({ type, size: 1000 })).toBe('只支援 JPEG、PNG、WebP')
    }
  })

  it('rejects files over 10 MB with the actual size (EC-02)', () => {
    expect(validateFile({ type: 'image/jpeg', size: 10 * 1024 * 1024 })).toBeNull()
    expect(validateFile({ type: 'image/jpeg', size: 12.3 * 1024 * 1024 })).toBe('檔案超過 10 MB（目前 12.3 MB）')
    expect(validateFile({ type: 'image/jpeg', size: 0 })).toBe('無法讀取這張圖片')
  })

  it('requires at least 200×200 pixels (EC-03)', () => {
    expect(validateDimensions({ width: 200, height: 200 })).toBeNull()
    expect(validateDimensions({ width: 150, height: 800 })).toBe('圖片至少要 200×200 px（目前 150×800）')
  })

  it('picks the first image from mixed files (EC-10)', () => {
    const text = new File(['a'], 'a.txt', { type: 'text/plain' })
    const gif = new File(['b'], 'b.gif', { type: 'image/gif' })
    const png = new File(['c'], 'c.png', { type: 'image/png' })
    expect(firstImageFile([text, gif, png])).toBe(gif)
    expect(firstImageFile([text])).toBeNull()
    expect(firstImageFile(null)).toBeNull()
  })

  it('formats sizes and type names', () => {
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(86 * 1024)).toBe('86 KB')
    expect(formatBytes(3.2 * 1024 * 1024)).toBe('3.2 MB')
    expect(formatName('image/webp')).toBe('WebP')
    expect(formatName('image/jpeg')).toBe('JPEG')
  })
})

describe('encodeWithinBudget', () => {
  const blobOf = (bytes: number) => new Blob([new Uint8Array(bytes)], { type: 'image/webp' })

  it('stops at the first quality within budget (AC-05)', async () => {
    const encode = vi.fn(async (quality: number) => blobOf(quality > 0.8 ? 300_000 : 150_000))
    const result = await encodeWithinBudget(encode, { maxBytes: 200 * 1024 })
    expect(result.quality).toBe(0.75)
    expect(result.withinBudget).toBe(true)
    expect(encode.mock.calls.map(([q]) => q)).toEqual([0.92, 0.85, 0.75])
  })

  it('returns the lowest quality flagged as over budget when nothing fits (EC-12)', async () => {
    const encode = vi.fn(async () => blobOf(500_000))
    const result = await encodeWithinBudget(encode)
    expect(result.quality).toBe(QUALITIES.at(-1))
    expect(result.withinBudget).toBe(false)
    expect(encode).toHaveBeenCalledTimes(QUALITIES.length)
  })

  it('throws when the encoder produces nothing', async () => {
    await expect(encodeWithinBudget(async () => null)).rejects.toThrow('無法輸出圖片')
  })
})

describe('exportCrop', () => {
  function stubCanvas(webpSupported: boolean) {
    const drawImage = vi.fn()
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage,
      imageSmoothingQuality: 'low',
    } as unknown as CanvasRenderingContext2D)
    const toBlob = vi
      .spyOn(HTMLCanvasElement.prototype, 'toBlob')
      .mockImplementation(function (callback, type) {
        const actual = type === 'image/webp' && !webpSupported ? 'image/png' : (type ?? 'image/png')
        callback(new Blob(['x'], { type: actual }))
      })
    return { drawImage, toBlob }
  }

  it('draws the source rect into a square canvas as WebP', async () => {
    const { drawImage, toBlob } = stubCanvas(true)
    const source = document.createElement('img')
    const blob = await exportCrop(source, { sx: 10, sy: 20, size: 300 }, 512, 0.9)
    expect(blob?.type).toBe('image/webp')
    expect(drawImage).toHaveBeenCalledWith(source, 10, 20, 300, 300, 0, 0, 512, 512)
    expect(toBlob).toHaveBeenCalledTimes(1)
  })

  it('falls back to JPEG when WebP encoding is unsupported (EC-13)', async () => {
    const { toBlob } = stubCanvas(false)
    const blob = await exportCrop(document.createElement('img'), { sx: 0, sy: 0, size: 100 }, 512, 0.8)
    expect(blob?.type).toBe('image/jpeg')
    expect(toBlob.mock.calls.map((call) => [call[1], call[2]])).toEqual([
      ['image/webp', 0.8],
      ['image/jpeg', 0.8],
    ])
  })
})

describe('mock uploader', () => {
  const blob = new Blob([new Uint8Array(100)])

  it('reports progress until complete', async () => {
    vi.useFakeTimers()
    const upload = createMockUploader({ failureRate: () => 0, chunk: 40, interval: 100 })
    const progress: number[] = []
    const done = upload(blob, { signal: new AbortController().signal, onProgress: (loaded) => progress.push(loaded) })
    await vi.advanceTimersByTimeAsync(300)
    await expect(done).resolves.toMatchObject({ url: expect.stringContaining('https://') })
    expect(progress).toEqual([0, 40, 80, 100])
    expect(vi.getTimerCount()).toBe(0)
  })

  it('fails halfway when the failure roll hits', async () => {
    vi.useFakeTimers()
    const upload = createMockUploader({ failureRate: () => 1, random: () => 0, chunk: 40 })
    const progress: number[] = []
    const done = upload(blob, { signal: new AbortController().signal, onProgress: (loaded) => progress.push(loaded) })
    const assertion = expect(done).rejects.toThrow('網路連線中斷')
    await vi.advanceTimersByTimeAsync(200)
    await assertion
    expect(progress).toEqual([0, 40])
  })

  it('rejects with AbortError and stops the timer when aborted', async () => {
    vi.useFakeTimers()
    const controller = new AbortController()
    const done = createMockUploader({ failureRate: () => 0 })(blob, { signal: controller.signal, onProgress: () => {} })
    controller.abort()
    await expect(done).rejects.toMatchObject({ name: 'AbortError' })
    expect(vi.getTimerCount()).toBe(0)
  })
})
