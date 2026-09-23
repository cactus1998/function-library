import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'
import { useDesignOverlay } from '../composables/useDesignOverlay'

/** jsdom 不會真的解碼圖片：依網址決定成功（及尺寸）或失敗 */
const imageSizes = new Map<string, number>()

class FakeImage {
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  naturalWidth = 0
  naturalHeight = 0

  set src(url: string) {
    queueMicrotask(() => {
      const width = imageSizes.get(url)
      if (width === undefined) {
        this.onerror?.()
        return
      }
      this.naturalWidth = width
      this.naturalHeight = Math.round(width * 0.6)
      this.onload?.()
    })
  }
}

let urlCount = 0
const createObjectURL = vi.fn(() => `blob:design-${++urlCount}`)
const revokeObjectURL = vi.fn()

function pngFile(name = 'design.png', type = 'image/png') {
  return new File(['x'], name, { type })
}

function setup() {
  const scope = effectScope()
  const overlay = scope.run(() => useDesignOverlay())!
  return { scope, overlay }
}

beforeEach(() => {
  urlCount = 0
  imageSizes.clear()
  createObjectURL.mockClear()
  revokeObjectURL.mockClear()
  vi.stubGlobal('Image', FakeImage)
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL }))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useDesignOverlay', () => {
  it('rejects non-image files without creating an object URL', async () => {
    const { overlay } = setup()
    await overlay.load(pngFile('spec.pdf', 'application/pdf'))
    expect(overlay.error.value).toBe('只支援 PNG、JPG、WebP')
    expect(overlay.image.value).toBeNull()
    expect(createObjectURL).not.toHaveBeenCalled()
  })

  it('loads a @1x design and keeps its natural width as CSS width', async () => {
    imageSizes.set('blob:design-1', 1440)
    const { overlay } = setup()
    await overlay.load(pngFile())
    expect(overlay.image.value).toMatchObject({ name: 'design.png', naturalWidth: 1440 })
    expect(overlay.density.value).toBe(1)
    expect(overlay.cssWidth.value).toBe(1440)
  })

  it('assumes @2x for images wider than 2000px and halves the CSS width', async () => {
    imageSizes.set('blob:design-1', 2880)
    const { overlay } = setup()
    await overlay.load(pngFile())
    expect(overlay.density.value).toBe(2)
    expect(overlay.cssWidth.value).toBe(1440)
  })

  it('reports a broken image and revokes its URL', async () => {
    const { overlay } = setup()
    await overlay.load(pngFile())
    expect(overlay.error.value).toBe('圖片損毀或格式不正確')
    expect(overlay.image.value).toBeNull()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:design-1')
  })

  it('revokes the previous URL when a new design replaces it', async () => {
    imageSizes.set('blob:design-1', 1440)
    imageSizes.set('blob:design-2', 1440)
    const { overlay } = setup()
    await overlay.load(pngFile('a.png'))
    await overlay.load(pngFile('b.png'))
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:design-1')
    expect(revokeObjectURL).not.toHaveBeenCalledWith('blob:design-2')
    expect(overlay.image.value?.name).toBe('b.png')
  })

  it('keeps the current design when a replacement fails to load', async () => {
    imageSizes.set('blob:design-1', 1440)
    const { overlay } = setup()
    await overlay.load(pngFile('good.png'))
    await overlay.load(pngFile('broken.png'))
    expect(overlay.image.value?.name).toBe('good.png')
    expect(overlay.error.value).not.toBe('')
  })

  it('revokes the URL when cleared and when the scope is disposed', async () => {
    imageSizes.set('blob:design-1', 1440)
    imageSizes.set('blob:design-2', 1440)
    const { scope, overlay } = setup()

    await overlay.load(pngFile())
    overlay.clear()
    expect(revokeObjectURL).toHaveBeenLastCalledWith('blob:design-1')
    expect(overlay.image.value).toBeNull()

    await overlay.load(pngFile())
    scope.stop()
    expect(revokeObjectURL).toHaveBeenLastCalledWith('blob:design-2')
  })
})
