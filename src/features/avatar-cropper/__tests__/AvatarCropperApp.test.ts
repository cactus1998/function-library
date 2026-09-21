import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AvatarCropperApp from '../components/AvatarCropperApp.vue'
import type { ExportCrop, UploadOptions } from '../types'
import { deferred, fakeSource, imageFile, stubObjectUrls } from './helpers'

let urls: ReturnType<typeof stubObjectUrls>
const wrappers: VueWrapper[] = []

beforeEach(() => {
  urls = stubObjectUrls()
})
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount()
})

function setup(options: { width?: number; height?: number; exportBytes?: number } = {}) {
  const uploads: { options: UploadOptions; request: ReturnType<typeof deferred<{ url: string }>> }[] = []
  const uploader = vi.fn((_: Blob, uploadOptions: UploadOptions) => {
    const request = deferred<{ url: string }>()
    uploads.push({ options: uploadOptions, request })
    return request.promise
  })
  const exportCrop = vi.fn<ExportCrop>(
    async () => new Blob([new Uint8Array(options.exportBytes ?? 80 * 1024)], { type: 'image/webp' }),
  )
  const loadImage = vi.fn(async () => ({
    width: options.width ?? 1000,
    height: options.height ?? 2000,
    source: fakeSource,
  }))
  const wrapper = mount(AvatarCropperApp, { attachTo: document.body, props: { loadImage, exportCrop, uploader } })
  wrappers.push(wrapper)
  return { wrapper, uploader, uploads, exportCrop, loadImage }
}

async function chooseFiles(wrapper: VueWrapper, files: File[]) {
  const input = wrapper.get('input[type="file"]')
  Object.defineProperty(input.element, 'files', { value: files, configurable: true })
  await input.trigger('change')
  await flushPromises()
}

async function finish(wrapper: VueWrapper) {
  await wrapper.get('button.primary').trigger('click')
  await flushPromises()
}

describe('AvatarCropperApp', () => {
  it('loads a chosen photo centered at the minimum zoom (AC-01)', async () => {
    const { wrapper } = setup()
    await chooseFiles(wrapper, [imageFile()])
    const img = wrapper.get('.frame img')
    expect(img.attributes('src')).toBe('blob:test/1')
    expect(img.attributes('style')).toContain('translate3d(0px, -140px, 0) scale(0.28)')
    expect((wrapper.get('.zoom input').element as HTMLInputElement).value).toBe('100')
    expect(wrapper.findAll('.previews .avatar')).toHaveLength(3)
  })

  it('shows an error for unsupported files and keeps the drop zone (EC-01)', async () => {
    const { wrapper, loadImage } = setup()
    await chooseFiles(wrapper, [imageFile('a.gif', 'image/gif')])
    expect(wrapper.get('[role="alert"]').text()).toBe('只支援 JPEG、PNG、WebP')
    expect(wrapper.find('.frame').exists()).toBe(false)
    expect(loadImage).not.toHaveBeenCalled()
  })

  it('shows an error when no dropped file is an image (EC-10)', async () => {
    const { wrapper } = setup()
    const zone = wrapper.get('.drop-zone')
    await zone.trigger('drop', { dataTransfer: { files: [new File(['a'], 'a.txt', { type: 'text/plain' })] } })
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toBe('請選擇圖片檔')

    await zone.trigger('drop', { dataTransfer: { files: [new File(['a'], 'a.txt', { type: 'text/plain' }), imageFile()] } })
    await flushPromises()
    expect(wrapper.find('.frame').exists()).toBe(true)
  })

  it('loads pasted images and ignores pasted text (EC-11)', async () => {
    const { wrapper } = setup()
    const text = new Event('paste', { cancelable: true })
    Object.defineProperty(text, 'clipboardData', { value: { files: [] } })
    window.dispatchEvent(text)
    await flushPromises()
    expect(text.defaultPrevented).toBe(false)
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)

    const image = new Event('paste', { cancelable: true })
    Object.defineProperty(image, 'clipboardData', { value: { files: [imageFile()] } })
    window.dispatchEvent(image)
    await flushPromises()
    expect(image.defaultPrevented).toBe(true)
    expect(wrapper.find('.frame').exists()).toBe(true)
  })

  it('moves the image with the keyboard and updates the previews (AC-04)', async () => {
    const { wrapper } = setup()
    await chooseFiles(wrapper, [imageFile()])
    const frame = wrapper.get('.frame')
    expect(frame.attributes('tabindex')).toBe('0')
    expect(frame.attributes('aria-describedby')).toBe('crop-help')
    await frame.trigger('keydown', { key: 'ArrowDown', shiftKey: true })
    expect(wrapper.get('.frame img').attributes('style')).toContain('translate3d(0px, -90px, 0)')
    // 128px 預覽 = 裁切框 transform × 128 / 280
    const preview = wrapper.findAll('.previews img')[0]!.attributes('style')
    expect(preview).toContain(`translate3d(0px, ${-90 * (128 / 280)}px, 0)`)
  })

  it('zooms from the slider with an accessible value text', async () => {
    const { wrapper } = setup()
    await chooseFiles(wrapper, [imageFile()])
    const slider = wrapper.get('.zoom input')
    await slider.setValue('200')
    expect(wrapper.get('.frame img').attributes('style')).toContain('scale(0.56)')
    expect(slider.attributes('aria-valuetext')).toBe('200%')
  })

  it('exports the current crop and shows format, size and quality (AC-05)', async () => {
    const { wrapper, exportCrop } = setup()
    await chooseFiles(wrapper, [imageFile('photo.png', 'image/png', 3 * 1024 * 1024)])
    await finish(wrapper)
    const [source, rect, size, quality] = exportCrop.mock.calls[0]!
    expect(source).toBe(fakeSource)
    expect(rect.sx).toBe(0)
    expect(rect.sy).toBeCloseTo(500)
    expect(size).toBe(512)
    expect(quality).toBe(0.92)
    const text = wrapper.get('.upload').text()
    expect(text).toContain('WebP 512×512')
    expect(text).toContain('80 KB（原始 3.0 MB）')
    expect(text).not.toContain('超過建議大小')
  })

  it('flags results that stay over budget (EC-12)', async () => {
    const { wrapper, exportCrop } = setup({ exportBytes: 400 * 1024 })
    await chooseFiles(wrapper, [imageFile()])
    await finish(wrapper)
    expect(exportCrop).toHaveBeenCalledTimes(5)
    expect(wrapper.get('.upload').text()).toContain('超過建議大小')
  })

  it('uploads with progress and can cancel (AC-06, EC-14)', async () => {
    const { wrapper, uploads } = setup()
    await chooseFiles(wrapper, [imageFile()])
    await finish(wrapper)
    await wrapper.get('.upload button.primary').trigger('click')
    uploads[0]!.options.onProgress(30, 100)
    await flushPromises()
    expect(wrapper.get('progress').attributes('value')).toBe('30')
    expect(wrapper.get('.upload [aria-live]').text()).toBe('上傳中 25%')

    await wrapper.get('.upload button').trigger('click')
    expect(uploads[0]!.options.signal.aborted).toBe(true)
    expect(wrapper.find('progress').exists()).toBe(false)
    expect(wrapper.get('.upload button.primary').text()).toBe('上傳')
  })

  it('shows the error and retries after a failed upload (AC-07, EC-15)', async () => {
    const { wrapper, uploads, uploader } = setup()
    await chooseFiles(wrapper, [imageFile()])
    await finish(wrapper)
    await wrapper.get('.upload button.primary').trigger('click')
    uploads[0]!.request.reject(new Error('網路連線中斷'))
    await flushPromises()
    expect(wrapper.get('.upload [role="alert"]').text()).toBe('上傳失敗：網路連線中斷')

    await wrapper.get('.upload button.primary').trigger('click')
    expect(uploader).toHaveBeenCalledTimes(2)
    uploads[1]!.request.resolve({ url: 'https://example.com/a.webp' })
    await flushPromises()
    expect(wrapper.get('.upload [role="status"]').text()).toBe('已更新大頭貼')
  })

  it('cancels the upload and returns to cropping when re-cropping (EC-16)', async () => {
    const { wrapper, uploads } = setup()
    await chooseFiles(wrapper, [imageFile()])
    await finish(wrapper)
    const resultUrl = wrapper.get('.upload img').attributes('src')!
    await wrapper.get('.upload button.primary').trigger('click')
    const recrop = wrapper.findAll('.upload button').find((b) => b.text() === '重新裁切')!
    await recrop.trigger('click')
    expect(uploads[0]!.options.signal.aborted).toBe(true)
    expect(wrapper.find('.frame').exists()).toBe(true)
    expect(urls.revoked.has(resultUrl)).toBe(true)
  })

  it('removes listeners and releases every object URL on unmount (AC-08, EC-18)', async () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    const { wrapper, uploads } = setup()
    await chooseFiles(wrapper, [imageFile('a.png')])
    await chooseFiles(wrapper, [imageFile('b.png')])
    await finish(wrapper)
    await wrapper.get('.upload button.primary').trigger('click')
    expect(urls.alive()).toHaveLength(2)

    wrapper.unmount()
    wrappers.splice(wrappers.indexOf(wrapper), 1)
    expect(urls.alive()).toEqual([])
    expect(uploads[0]!.options.signal.aborted).toBe(true)
    expect(removeSpy).toHaveBeenCalledWith('paste', expect.any(Function))
    removeSpy.mockRestore()
  })
})
