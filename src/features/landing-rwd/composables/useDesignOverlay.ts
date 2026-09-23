import { computed, onScopeDispose, shallowRef } from 'vue'

export type OverlayBlend = 'normal' | 'difference'
export type OverlayDensity = 1 | 2

export interface DesignImage {
  url: string
  name: string
  naturalWidth: number
  naturalHeight: number
}

const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp']

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('無法讀取圖片'))
    img.src = url
  })
}

/** 設計稿疊圖：讀取本機圖片、換算 CSS 尺寸，並負責釋放 object URL */
export function useDesignOverlay() {
  const image = shallowRef<DesignImage | null>(null)
  const error = shallowRef('')
  const opacity = shallowRef(0.5)
  const blend = shallowRef<OverlayBlend>('normal')
  const density = shallowRef<OverlayDensity>(1)
  const visible = shallowRef(true)

  /** 設計稿在 CSS px 下的寬度：@2x 切圖要除以 2 才會和頁面等寬 */
  const cssWidth = computed(() => (image.value ? image.value.naturalWidth / density.value : 0))

  function release() {
    if (image.value) URL.revokeObjectURL(image.value.url)
    image.value = null
  }

  async function load(file: File) {
    error.value = ''
    if (!ACCEPTED.includes(file.type)) {
      error.value = '只支援 PNG、JPG、WebP'
      return
    }
    const url = URL.createObjectURL(file)
    try {
      const img = await loadImage(url)
      release()
      image.value = { url, name: file.name, naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight }
      visible.value = true
      // 寬度超過 2000px 的切圖多半是 @2x
      density.value = img.naturalWidth > 2000 ? 2 : 1
    } catch {
      URL.revokeObjectURL(url)
      error.value = '圖片損毀或格式不正確'
    }
  }

  onScopeDispose(release)

  return { image, error, opacity, blend, density, visible, cssWidth, load, clear: release }
}
